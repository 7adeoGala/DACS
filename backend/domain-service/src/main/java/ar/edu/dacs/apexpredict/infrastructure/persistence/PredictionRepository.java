package ar.edu.dacs.apexpredict.infrastructure.persistence;

import ar.edu.dacs.apexpredict.domain.Prediction;
import ar.edu.dacs.apexpredict.domain.Session;
import ar.edu.dacs.apexpredict.domain.User;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface PredictionRepository extends JpaRepository<Prediction, UUID> {
    Optional<Prediction> findByUserAndSession(User user, Session session);
    Optional<Prediction> findByUserIdAndSessionId(UUID userId, UUID sessionId);
    List<Prediction> findByUserOrderBySubmittedAtDesc(User user);
    List<Prediction> findBySession(Session session);
    List<Prediction> findBySessionId(UUID sessionId);
    boolean existsByUserIdAndSessionId(UUID userId, UUID sessionId);

    // Leaderboard global acumulado en tiempo real
    @Query("""
        SELECT p.user.id as userId, p.user.displayName as displayName, COALESCE(SUM(p.score), 0) as totalScore, COUNT(p.id) as predictionsCount
        FROM Prediction p
        WHERE p.score IS NOT NULL AND p.user IS NOT NULL
        GROUP BY p.user.id, p.user.displayName
        ORDER BY totalScore DESC, p.user.displayName ASC
    """)
    List<GlobalLeaderboardRow> getGlobalLeaderboard();

    // Leaderboard de liga privada
    @Query("""
        SELECT m.user.id as userId, m.user.displayName as displayName, COALESCE(SUM(p.score), 0) as totalScore, COUNT(p.id) as predictionsCount
        FROM LeagueMember m
        LEFT JOIN Prediction p ON p.user = m.user AND p.score IS NOT NULL
        WHERE m.league.id = :leagueId
        GROUP BY m.user.id, m.user.displayName
        ORDER BY totalScore DESC, m.user.displayName ASC
    """)
    List<GlobalLeaderboardRow> getLeagueLeaderboard(@Param("leagueId") UUID leagueId);

    interface GlobalLeaderboardRow {
        UUID getUserId();
        String getDisplayName();
        Long getTotalScore();
        Long getPredictionsCount();
    }
}
