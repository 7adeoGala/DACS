package ar.edu.dacs.apexpredict.application;

import ar.edu.dacs.apexpredict.domain.Notification;
import ar.edu.dacs.apexpredict.domain.Session;
import ar.edu.dacs.apexpredict.domain.User;
import ar.edu.dacs.apexpredict.infrastructure.persistence.*;
import java.time.Duration;
import java.time.Instant;
import java.util.*;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Servicio base (mockeado para ejecución 100% local) de notificaciones push y por correo electrónico.
 * Actúa como recordatorio antes del Lock Time de cada carrera para que los usuarios no olviden
 * cargar o editar sus pronósticos.
 */
@Service
public class NotificationService {

    private static final Logger log = LoggerFactory.getLogger(NotificationService.class);

    private final NotificationRepository notifications;
    private final UserRepository users;
    private final SessionRepository sessions;
    private final PredictionRepository predictions;

    public NotificationService(
        NotificationRepository notifications,
        UserRepository users,
        SessionRepository sessions,
        PredictionRepository predictions
    ) {
        this.notifications = notifications;
        this.users = users;
        this.sessions = sessions;
        this.predictions = predictions;
    }

    /**
     * Envía notificación mockeada (Push y Email) de recordatorio de carrera a un usuario específico.
     */
    @Transactional
    public List<Notification> sendRaceReminder(User user, Session session, Duration timeRemaining) {
        long hours = timeRemaining.toHours();
        String timeLeftStr = hours > 0 ? hours + " horas" : timeRemaining.toMinutes() + " minutos";

        String title = "🏁 ¡No olvides tu pronóstico para el " + session.getName() + "!";
        String message = String.format(
            "Hola %s: La sesión oficial inicia en aprox. %s (Lock Time: %s UTC). ¡Ingresa a ApexPredict antes de que se bloqueen las predicciones!",
            user.getDisplayName(),
            timeLeftStr,
            session.getStartsAt()
        );

        // Notificación Push Mockeada
        Notification pushNotification = new Notification(
            user, session,
            Notification.Type.RACE_REMINDER,
            Notification.Channel.PUSH,
            title, message
        );
        pushNotification.markAsSent();
        notifications.save(pushNotification);
        log.info("[MOCK PUSH NOTIFICATION] Enviado a {}: '{}' - {}", user.getDisplayName(), title, message);

        // Notificación Email Mockeada (si tiene correo registrado)
        if (user.getEmail() != null && !user.getEmail().isBlank()) {
            Notification emailNotification = new Notification(
                user, session,
                Notification.Type.RACE_REMINDER,
                Notification.Channel.EMAIL,
                title, message
            );
            emailNotification.markAsSent();
            notifications.save(emailNotification);
            log.info("[MOCK EMAIL NOTIFICATION] Enviado a {}: '{}' - {}", user.getEmail(), title, message);
            return List.of(pushNotification, emailNotification);
        }

        return List.of(pushNotification);
    }

    /**
     * Dispara recordatorios para todos los usuarios que aún no cargaron pronóstico para la sesión dada.
     */
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
        var user = users.findByIssuerAndSubject(issuer, subject).orElseThrow();
        return notifications.findByUserOrderByCreatedAtDesc(user).stream()
            .map(n -> new NotificationDto(
                n.getId(),
                n.getType().name(),
                n.getChannel().name(),
                n.getTitle(),
                n.getMessage(),
                n.getStatus().name(),
                n.getSentAt()
            ))
            .toList();
    }

    public record NotificationDto(
        UUID id,
        String type,
        String channel,
        String title,
        String message,
        String status,
        Instant sentAt
    ) {}
}
