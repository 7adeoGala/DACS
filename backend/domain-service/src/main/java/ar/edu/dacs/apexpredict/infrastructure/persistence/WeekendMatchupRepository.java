package ar.edu.dacs.apexpredict.infrastructure.persistence;

import ar.edu.dacs.apexpredict.domain.Session;
import ar.edu.dacs.apexpredict.domain.WeekendMatchup;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface WeekendMatchupRepository extends JpaRepository<WeekendMatchup, UUID> {
    Optional<WeekendMatchup> findBySession(Session session);
    Optional<WeekendMatchup> findBySessionId(UUID sessionId);
}
