package ar.edu.dacs.apexpredict.infrastructure.persistence;

import ar.edu.dacs.apexpredict.domain.Notification;
import ar.edu.dacs.apexpredict.domain.Session;
import ar.edu.dacs.apexpredict.domain.User;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface NotificationRepository extends JpaRepository<Notification, UUID> {
    List<Notification> findByUserOrderByCreatedAtDesc(User user);
    List<Notification> findByUserAndChannelAndDismissedAtIsNullOrderByCreatedAtDesc(User user, Notification.Channel channel);
    Optional<Notification> findByIdAndUser(UUID id, User user);
    List<Notification> findByStatus(Notification.Status status);
    boolean existsByUserAndSessionAndType(User user, Session session, Notification.Type type);
}
