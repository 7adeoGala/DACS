package ar.edu.dacs.apexpredict.application;

import ar.edu.dacs.apexpredict.domain.Notification;
import ar.edu.dacs.apexpredict.domain.Session;
import ar.edu.dacs.apexpredict.domain.User;
import ar.edu.dacs.apexpredict.infrastructure.persistence.NotificationRepository;
import ar.edu.dacs.apexpredict.infrastructure.persistence.PredictionRepository;
import ar.edu.dacs.apexpredict.infrastructure.persistence.SessionRepository;
import ar.edu.dacs.apexpredict.infrastructure.persistence.UserRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class NotificationService {

    private static final Logger log = LoggerFactory.getLogger(NotificationService.class);

    private final NotificationRepository notifications;
    private final UserRepository users;
    private final SessionRepository sessions;
    private final PredictionRepository predictions;
    private final String emailWebhookUrl;
    private final String emailApiSecret;
    private final ObjectMapper objectMapper = new ObjectMapper();
    private final HttpClient httpClient = HttpClient.newBuilder()
        .connectTimeout(Duration.ofSeconds(4))
        .build();

    @Autowired
    public NotificationService(
        NotificationRepository notifications,
        UserRepository users,
        SessionRepository sessions,
        PredictionRepository predictions,
        @Value("${apexpredict.notifications.email-webhook-url:}") String emailWebhookUrl,
        @Value("${apexpredict.notifications.email-api-secret:}") String emailApiSecret
    ) {
        this.notifications = notifications;
        this.users = users;
        this.sessions = sessions;
        this.predictions = predictions;
        this.emailWebhookUrl = emailWebhookUrl != null ? emailWebhookUrl.trim() : "";
        this.emailApiSecret = emailApiSecret != null ? emailApiSecret.trim() : "";
    }

    public NotificationService(
        NotificationRepository notifications,
        UserRepository users,
        SessionRepository sessions,
        PredictionRepository predictions
    ) {
        this(notifications, users, sessions, predictions, "", "");
    }

    @Transactional
    public List<Notification> sendRaceReminder(User user, Session session, Duration timeRemaining) {
        long hours = timeRemaining.toHours();
        String timeLeftStr = hours > 0 ? hours + " horas" : timeRemaining.toMinutes() + " minutos";

        String title = "¡No olvides tu pronóstico para el " + session.getName() + "!";
        String message = String.format(
            "Hola %s: La sesión oficial inicia en aprox. %s (Lock Time: %s UTC). ¡Ingresa a ApexPredict antes de que se bloqueen las predicciones!",
            user.getDisplayName(),
            timeLeftStr,
            session.getStartsAt()
        );

        Notification pushNotification = new Notification(
            user, session,
            Notification.Type.RACE_REMINDER,
            Notification.Channel.PUSH,
            title, message
        );
        pushNotification.markAsSent();
        notifications.save(pushNotification);
        log.info("[IN-APP NOTIFICATION] Registrada para {}: '{}'", user.getDisplayName(), title);

        if (user.getEmail() != null && !user.getEmail().isBlank()) {
            Notification emailNotification = new Notification(
                user, session,
                Notification.Type.RACE_REMINDER,
                Notification.Channel.EMAIL,
                title, message
            );
            boolean delivered = deliverEmail(user.getEmail(), title, message);
            if (delivered) {
                emailNotification.markAsSent();
            } else {
                emailNotification.markAsFailed();
            }
            notifications.save(emailNotification);
            return List.of(pushNotification, emailNotification);
        }

        return List.of(pushNotification);
    }

    private boolean deliverEmail(String to, String subject, String text) {
        if (emailWebhookUrl.isBlank()) {
            log.info("[EMAIL NOTIFICATION] Registrada para {} (sin webhook externo configurado): '{}'", to, subject);
            return true;
        }
        try {
            String body = objectMapper.writeValueAsString(Map.of(
                "to", to,
                "subject", subject,
                "text", text
            ));
            HttpRequest.Builder reqBuilder = HttpRequest.newBuilder()
                .uri(URI.create(emailWebhookUrl))
                .timeout(Duration.ofSeconds(5))
                .header("Content-Type", "application/json")
                .POST(HttpRequest.BodyPublishers.ofString(body));
            if (!emailApiSecret.isBlank()) {
                reqBuilder.header("X-Api-Key", emailApiSecret);
            }
            HttpResponse<String> response = httpClient.send(reqBuilder.build(), HttpResponse.BodyHandlers.ofString());
            if (response.statusCode() >= 200 && response.statusCode() < 300) {
                log.info("[EMAIL NOTIFICATION] Enviado via webhook a {}", to);
                return true;
            }
            log.warn("[EMAIL NOTIFICATION] Webhook devolvió HTTP {} para {}", response.statusCode(), to);
            return false;
        } catch (Exception ex) {
            log.warn("[EMAIL NOTIFICATION] Fallo al enviar email a {}: {}", to, ex.getMessage());
            return false;
        }
    }

    @Transactional
    public int dispatchRemindersForSessionsStartingWithin(Duration window) {
        Instant now = Instant.now();
        Instant limit = now.plus(window != null ? window : Duration.ofHours(24));
        List<Session> upcoming = sessions.findByStartsAtBetween(now, limit);
        int totalSent = 0;
        for (Session session : upcoming) {
            if (session.getType() == Session.Type.RACE && session.getId() != null) {
                totalSent += dispatchRemindersForUpcomingSession(session.getId());
            }
        }
        return totalSent;
    }

    @Transactional
    public int dispatchRemindersForUpcomingSession(UUID sessionId) {
        Session session = sessions.findById(sessionId)
            .orElseThrow(() -> new IllegalArgumentException("Sesión no encontrada: " + sessionId));

        if (session.getStartsAt() == null) {
            log.warn("La sesión {} no tiene horario de inicio definido.", session.getName());
            return 0;
        }

        Instant now = Instant.now();
        if (!now.isBefore(session.getStartsAt())) {
            log.info("La sesión {} ya inició (Lock Time superado); no se envían recordatorios.", session.getName());
            return 0;
        }

        Duration timeRemaining = Duration.between(now, session.getStartsAt());
        List<User> allUsers = users.findAll();
        int sentCount = 0;

        for (User user : allUsers) {
            if (!user.isNotificationsEnabled()) {
                continue;
            }
            boolean alreadyPredicted = predictions.existsByUserIdAndSessionId(user.getId(), session.getId());
            boolean alreadyNotified = notifications.existsByUserAndSessionAndType(user, session, Notification.Type.RACE_REMINDER);

            if (!alreadyPredicted && !alreadyNotified) {
                sendRaceReminder(user, session, timeRemaining);
                sentCount++;
            }
        }

        log.info("Despachados recordatorios a {} usuarios para la sesión {}", sentCount, session.getName());
        return sentCount;
    }

    @Transactional(readOnly = true)
    public List<NotificationDto> getUserNotifications(String issuer, String subject) {
        var user = users.findByIssuerAndSubject(issuer, subject).orElse(null);
        if (user == null) {
            return List.of();
        }
        return notifications
            .findByUserAndChannelAndDismissedAtIsNullOrderByCreatedAtDesc(user, Notification.Channel.PUSH)
            .stream()
            .map(NotificationService::toDto)
            .toList();
    }

    @Transactional
    public NotificationDto markAsRead(String issuer, String subject, UUID notificationId) {
        User user = users.findByIssuerAndSubject(issuer, subject)
            .orElseThrow(() -> new IllegalArgumentException("Usuario no encontrado."));
        Notification notification = notifications.findByIdAndUser(notificationId, user)
            .filter(n -> !n.isDismissed())
            .orElseThrow(() -> new IllegalArgumentException("Notificación no encontrada."));
        notification.markAsRead();
        return toDto(notifications.save(notification));
    }

    @Transactional
    public int markAllAsRead(String issuer, String subject) {
        User user = users.findByIssuerAndSubject(issuer, subject).orElse(null);
        if (user == null) {
            return 0;
        }
        List<Notification> visible = notifications
            .findByUserAndChannelAndDismissedAtIsNullOrderByCreatedAtDesc(user, Notification.Channel.PUSH);
        int updated = 0;
        for (Notification n : visible) {
            if (!n.isRead()) {
                n.markAsRead();
                notifications.save(n);
                updated++;
            }
        }
        return updated;
    }

    @Transactional
    public void dismissNotification(String issuer, String subject, UUID notificationId) {
        User user = users.findByIssuerAndSubject(issuer, subject)
            .orElseThrow(() -> new IllegalArgumentException("Usuario no encontrado."));
        Notification notification = notifications.findByIdAndUser(notificationId, user)
            .orElseThrow(() -> new IllegalArgumentException("Notificación no encontrada."));
        notification.dismiss();
        notifications.save(notification);
    }

    @Transactional
    public int dismissAllNotifications(String issuer, String subject) {
        User user = users.findByIssuerAndSubject(issuer, subject).orElse(null);
        if (user == null) {
            return 0;
        }
        List<Notification> visible = notifications
            .findByUserAndChannelAndDismissedAtIsNullOrderByCreatedAtDesc(user, Notification.Channel.PUSH);
        for (Notification n : visible) {
            n.dismiss();
            notifications.save(n);
        }
        return visible.size();
    }

    private static NotificationDto toDto(Notification n) {
        return new NotificationDto(
            n.getId(),
            n.getType().name(),
            n.getChannel().name(),
            n.getTitle(),
            n.getMessage(),
            n.getStatus().name(),
            n.getSentAt(),
            n.isRead(),
            n.getReadAt()
        );
    }

    public record NotificationDto(
        UUID id,
        String type,
        String channel,
        String title,
        String message,
        String status,
        Instant sentAt,
        boolean read,
        Instant readAt
    ) {}
}
