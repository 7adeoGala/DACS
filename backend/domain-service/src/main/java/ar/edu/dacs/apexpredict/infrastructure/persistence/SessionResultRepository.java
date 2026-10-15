package ar.edu.dacs.apexpredict.infrastructure.persistence;

import ar.edu.dacs.apexpredict.domain.Session;
import ar.edu.dacs.apexpredict.domain.SessionResult;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface SessionResultRepository extends JpaRepository<SessionResult, UUID> {
    Optional<SessionResult> findBySession(Session session);
    Optional<SessionResult> findBySessionId(UUID sessionId);
}
