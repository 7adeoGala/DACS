package ar.edu.dacs.apexpredict.infrastructure.persistence;

import ar.edu.dacs.apexpredict.domain.Session;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface SessionRepository extends JpaRepository<Session, UUID> {
    Optional<Session> findBySeasonAndRoundAndType(int season, int round, Session.Type type);

    Optional<Session> findFirstByStartsAtAfterOrderByStartsAtAsc(Instant now);

    List<Session> findByStartsAtBetween(Instant from, Instant to);
}
