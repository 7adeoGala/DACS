package ar.edu.dacs.apexpredict.application;

import ar.edu.dacs.apexpredict.domain.Notification;
import ar.edu.dacs.apexpredict.domain.Session;
import ar.edu.dacs.apexpredict.domain.User;
import ar.edu.dacs.apexpredict.infrastructure.persistence.*;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;
import org.springframework.test.util.ReflectionTestUtils;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@SuppressWarnings("null")
class NotificationServiceTest {

    @Test
    @DisplayName("Omite usuarios con notificaciones desactivadas al despachar recordatorios")
    void skipsUsersWithNotificationsDisabled() {
        var notifications = Mockito.mock(NotificationRepository.class);
        var users = Mockito.mock(UserRepository.class);
        var sessions = Mockito.mock(SessionRepository.class);
        var predictions = Mockito.mock(PredictionRepository.class);

        var service = new NotificationService(notifications, users, sessions, predictions);

        UUID sessionId = UUID.randomUUID();
        Session session = new Session(2026, 21, Session.Type.RACE, "Las Vegas GP", "Las Vegas Strip",
            LocalDate.of(2026, 11, 21), Instant.now().plusSeconds(7200));
        ReflectionTestUtils.setField(session, "id", sessionId);

        User optedIn = new User("iss", "sub-1", "PilotoActivo", "activo@example.com");
        ReflectionTestUtils.setField(optedIn, "id", UUID.randomUUID());

        User optedOut = new User("iss", "sub-2", "PilotoSilenciado", "silenciado@example.com");
        ReflectionTestUtils.setField(optedOut, "id", UUID.randomUUID());
        optedOut.updateProfile(null, null, null, false);

        when(sessions.findById(sessionId)).thenReturn(Optional.of(session));
        when(users.findAll()).thenReturn(List.of(optedIn, optedOut));
        when(predictions.existsByUserIdAndSessionId(any(), eq(sessionId))).thenReturn(false);
        when(notifications.existsByUserAndSessionAndType(any(), eq(session), eq(Notification.Type.RACE_REMINDER))).thenReturn(false);

        int sent = service.dispatchRemindersForUpcomingSession(sessionId);

        assertEquals(1, sent);
        verify(notifications, times(2)).save(any(Notification.class));
    }

    @Test
    @DisplayName("Permite marcar como leida y ocultar notificaciones propias sin permitir acceso ajeno")
    void marksReadAndDismissesOwnNotificationsOnly() {
        var notifications = Mockito.mock(NotificationRepository.class);
        var users = Mockito.mock(UserRepository.class);
        var sessions = Mockito.mock(SessionRepository.class);
        var predictions = Mockito.mock(PredictionRepository.class);

        var service = new NotificationService(notifications, users, sessions, predictions);

        User owner = new User("iss", "sub-owner", "Owner", "owner@example.com");
        ReflectionTestUtils.setField(owner, "id", UUID.randomUUID());

        Notification notif = new Notification(
            owner, null, Notification.Type.RACE_REMINDER, Notification.Channel.PUSH, "Aviso", "Mensaje"
        );
        UUID notifId = UUID.randomUUID();
        ReflectionTestUtils.setField(notif, "id", notifId);
        notif.markAsSent();

        when(users.findByIssuerAndSubject("iss", "sub-owner")).thenReturn(Optional.of(owner));
        when(notifications.findByIdAndUser(notifId, owner)).thenReturn(Optional.of(notif));
        when(notifications.save(any(Notification.class))).thenAnswer(inv -> inv.getArgument(0));

        var dto = service.markAsRead("iss", "sub-owner", notifId);
        assertTrue(dto.read());
        assertNotNull(dto.readAt());

        service.dismissNotification("iss", "sub-owner", notifId);
        assertTrue(notif.isDismissed());

        UUID foreignId = UUID.randomUUID();
        when(notifications.findByIdAndUser(foreignId, owner)).thenReturn(Optional.empty());
        assertThrows(IllegalArgumentException.class, () -> service.markAsRead("iss", "sub-owner", foreignId));
        assertThrows(IllegalArgumentException.class, () -> service.dismissNotification("iss", "sub-owner", foreignId));
    }

    @Test
    @DisplayName("Permite marcar todas como leidas y limpiar la vista completa de notificaciones")
    void marksAllAsReadAndDismissesAll() {
        var notifications = Mockito.mock(NotificationRepository.class);
        var users = Mockito.mock(UserRepository.class);
        var sessions = Mockito.mock(SessionRepository.class);
        var predictions = Mockito.mock(PredictionRepository.class);

        var service = new NotificationService(notifications, users, sessions, predictions);

        User owner = new User("iss", "sub-owner", "Owner", "owner@example.com");
        ReflectionTestUtils.setField(owner, "id", UUID.randomUUID());

        Notification n1 = new Notification(owner, null, Notification.Type.RACE_REMINDER, Notification.Channel.PUSH, "A1", "M1");
        Notification n2 = new Notification(owner, null, Notification.Type.RACE_REMINDER, Notification.Channel.PUSH, "A2", "M2");
        n2.markAsRead();

        when(users.findByIssuerAndSubject("iss", "sub-owner")).thenReturn(Optional.of(owner));
        when(notifications.findByUserAndChannelAndDismissedAtIsNullOrderByCreatedAtDesc(owner, Notification.Channel.PUSH))
            .thenReturn(List.of(n1, n2));
        when(notifications.save(any(Notification.class))).thenAnswer(inv -> inv.getArgument(0));

        int updated = service.markAllAsRead("iss", "sub-owner");
        assertEquals(1, updated);
        assertTrue(n1.isRead());

        int dismissed = service.dismissAllNotifications("iss", "sub-owner");
        assertEquals(2, dismissed);
        assertTrue(n1.isDismissed());
        assertTrue(n2.isDismissed());
    }
}
