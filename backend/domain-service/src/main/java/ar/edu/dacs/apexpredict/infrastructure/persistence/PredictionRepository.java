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

    // Leaderboard global acumulado en tiempo real de todos los usuarios registrados
    @Query("""
        SELECT u.id as userId, u.displayName as displayName, COALESCE(SUM(p.score), 0) as totalScore, COUNT(p.id) as predictionsCount
        FROM User u
        LEFT JOIN Prediction p ON p.user = u
        GROUP BY u.id, u.displayName
        ORDER BY totalScore DESC, COUNT(p.id) DESC, u.displayName ASC
    """)
    List<GlobalLeaderboardRow> getGlobalLeaderboard();

    // Leaderboard de liga privada
    @Query("""
        SELECT m.user.id as userId, m.user.displayName as displayName, COALESCE(SUM(p.score), 0) as totalScore, COUNT(p.id) as predictionsCount
        FROM LeagueMember m
        LEFT JOIN Prediction p ON p.user = m.user
        WHERE m.league.id = :leagueId
        GROUP BY m.user.id, m.user.displayName
        ORDER BY totalScore DESC, COUNT(p.id) DESC, m.user.displayName ASC
    """)
    List<GlobalLeaderboardRow> getLeagueLeaderboard(@Param("leagueId") UUID leagueId);

    interface GlobalLeaderboardRow {
        UUID getUserId();
        String getDisplayName();
        Long getTotalScore();
        Long getPredictionsCount();
    }
}
