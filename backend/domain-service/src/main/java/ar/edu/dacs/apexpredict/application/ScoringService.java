package ar.edu.dacs.apexpredict.application;

import ar.edu.dacs.apexpredict.domain.*;
import ar.edu.dacs.apexpredict.infrastructure.persistence.*;
import java.time.Instant;
import java.util.*;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Servicio encargado de la lógica matemática y persistencia de puntuación para ApexPredict.
 * 
 * Reglas de puntuación oficiales:
 * - Podio (Posiciones #1, #2 y #3):
 *     1 acierto  -> 3 puntos
 *     2 aciertos -> 7 puntos
 *     3 aciertos -> 10 puntos
 * - Pole position:
 *     Acertar -> 4 puntos
 * - Duelo de pilotos:
 *     Acertar el piloto ganador del duelo del fin de semana -> 3 puntos
 * - Cantidad de autos de seguridad (VSC - SC):
 *     Acertar la cantidad exacta -> 6 puntos
 * - Cantidad de abandonos (DNF - DNS):
 *     Acertar la cantidad exacta -> 6 puntos
 */
@Service
public class ScoringService {

    private static final Logger log = LoggerFactory.getLogger(ScoringService.class);

    private final PredictionRepository predictions;
    private final SessionResultRepository results;
    private final WeekendMatchupRepository matchups;
    private final SessionRepository sessions;
    private final UserRepository users;

    @org.springframework.beans.factory.annotation.Autowired
    public ScoringService(
        PredictionRepository predictions,
        SessionResultRepository results,
        WeekendMatchupRepository matchups,
        SessionRepository sessions,
        @org.springframework.beans.factory.annotation.Autowired(required = false) UserRepository users
    ) {
        this.predictions = predictions;
        this.results = results;
        this.matchups = matchups;
        this.sessions = sessions;
        this.users = users;
    }

    public ScoringService(
        PredictionRepository predictions,
        SessionResultRepository results,
        WeekendMatchupRepository matchups,
        SessionRepository sessions
    ) {
        this(predictions, results, matchups, sessions, null);
    }

    /**
     * Calcula el desglose detallado y puntaje total de un pronóstico contra el resultado oficial.
     */
    public ScoreBreakdown calculateScore(Prediction prediction, SessionResult result, WeekendMatchup matchup) {
        Objects.requireNonNull(prediction, "La predicción no puede ser nula.");
        Objects.requireNonNull(result, "El resultado oficial de la sesión no puede ser nulo.");

        // 1. Podio (#1, #2 y #3)
        int podiumHits = calculatePodiumHits(prediction.getPodium(), result.getClassification());
        int podiumPoints = switch (podiumHits) {
            case 1 -> 3;
            case 2 -> 7;
            case 3 -> 10;
            default -> 0;
        };

        // 2. Pole position (4 puntos)
        boolean poleHit = false;
        int polePoints = 0;
        if (prediction.getPolePositionDriverId() != null && !prediction.getPolePositionDriverId().isBlank() && result.getPolePositionDriverId() != null) {
            if (prediction.getPolePositionDriverId().equalsIgnoreCase(result.getPolePositionDriverId())) {
                poleHit = true;
                polePoints = 4;
            }
        }

        // 3. Duelo de pilotos (3 puntos)
        boolean duelHit = false;
        int duelPoints = 0;
        String duelWinner = resolveDuelWinner(result, matchup);
        if (prediction.getDuelDriverPick() != null && !prediction.getDuelDriverPick().isBlank() && duelWinner != null) {
            if (prediction.getDuelDriverPick().equalsIgnoreCase(duelWinner)) {
                duelHit = true;
                duelPoints = 3;
            }
        }

        // 4. Cantidad de autos de seguridad (VSC - SC): 6 puntos
        boolean safetyCarHit = false;
        int safetyCarPoints = 0;
        if (prediction.getSafetyCarCount() != null && result.getSafetyCarCount() != null) {
            if (prediction.getSafetyCarCount().equals(result.getSafetyCarCount())) {
                safetyCarHit = true;
                safetyCarPoints = 6;
            }
        }

        // 5. Cantidad de abandonos (DNF - DNS): 6 puntos
        boolean dnfHit = false;
        int dnfPoints = 0;
        if (prediction.getDnfCount() != null && result.getDnfCount() != null) {
            if (prediction.getDnfCount().equals(result.getDnfCount())) {
                dnfHit = true;
                dnfPoints = 6;
            }
        }

        int total = podiumPoints + polePoints + duelPoints + safetyCarPoints + dnfPoints;

        return new ScoreBreakdown(
            podiumHits,
            podiumPoints,
            poleHit,
            polePoints,
            duelHit,
            duelPoints,
            safetyCarHit,
            safetyCarPoints,
            dnfHit,
            dnfPoints,
            total
        );
    }

    /**
     * Procesa y persiste los puntos para todas las predicciones de una sesión cerrada con resultados oficiales.
     */
    @Transactional
    public List<ScoredPredictionSummary> scoreSession(UUID sessionId) {
        var session = sessions.findById(sessionId)
            .orElseThrow(() -> new IllegalArgumentException("Sesión no encontrada: " + sessionId));
        var result = results.findBySessionId(sessionId)
            .orElseThrow(() -> new IllegalStateException("No se han publicado resultados oficiales para la sesión: " + sessionId));
        var matchup = matchups.findBySessionId(sessionId).orElse(null);

        var sessionPredictions = predictions.findBySessionId(sessionId);
        var now = Instant.now();
        var summaries = new ArrayList<ScoredPredictionSummary>();

        for (var prediction : sessionPredictions) {
            var breakdown = calculateScore(prediction, result, matchup);
            prediction.applyScore(breakdown.totalPoints(), now);
            predictions.save(prediction);

            String userName = prediction.getUser() != null ? prediction.getUser().getDisplayName() : "Usuario";
            summaries.add(new ScoredPredictionSummary(
                prediction.getId(),
                prediction.getUser() != null ? prediction.getUser().getId() : null,
                userName,
                breakdown.totalPoints(),
                breakdown
            ));
        }

        log.info("Procesadas {} predicciones para la sesión {}", sessionPredictions.size(), session.getName());
        return summaries;
    }

    /**
     * Evalúa y asigna puntuación automáticamente al iniciar la aplicación.
     */
    @org.springframework.context.event.EventListener(org.springframework.boot.context.event.ApplicationReadyEvent.class)
    @Transactional
    public void onApplicationReady() {
        try {
            autoScoreAllCompletedSessions();
        } catch (Exception e) {
            log.error("Error en auto-score durante inicio de aplicación: {}", e.getMessage());
        }
    }

    /**
     * Evalúa y asigna puntuación automáticamente a todas las predicciones pendientes (score == null)
     * de cualquier sesión que ya tenga resultados oficiales publicados.
     */
    @Transactional
    public void autoScoreAllCompletedSessions() {
        ensureFinishedSessionsSeeded();

        var allResults = results.findAll();
        var now = Instant.now();
        for (var result : allResults) {
            var session = result.getSession();
            if (session == null) continue;
            var matchup = matchups.findBySessionId(session.getId()).orElse(null);
            var sessionPredictions = predictions.findBySessionId(session.getId());
            for (var prediction : sessionPredictions) {
                try {
                    var breakdown = calculateScore(prediction, result, matchup);
                    if (prediction.getScore() == null || !prediction.getScore().equals(breakdown.totalPoints())) {
                        prediction.applyScore(breakdown.totalPoints(), now);
                        predictions.save(prediction);
                        log.info("Auto-score asignado/actualizado a usuario {} en sesión {}: {} pts",
                            prediction.getUser() != null ? prediction.getUser().getDisplayName() : "anon",
                            session.getName(),
                            breakdown.totalPoints()
                        );
                    }
                } catch (Exception e) {
                    log.error("Error al auto-puntuar predicción {}: {}", prediction.getId(), e.getMessage());
                }
            }
        }
    }

    /**
     * Garantiza que las sesiones finalizadas (Round 18 USA y Round 19 México) tengan sus resultados oficiales
     * y que todos los usuarios registrados cuenten con sus pronósticos homologados para el cálculo fecha a fecha.
     */
    @Transactional
    public void ensureFinishedSessionsSeeded() {
        try {
            // 1. Round 18 (USA GP - 2026-10-25)
            Session s18 = sessions.findBySeasonAndRoundAndType(2026, 18, Session.Type.RACE).orElse(null);
            if (s18 != null && results.findBySessionId(s18.getId()).isEmpty()) {
                SessionResult r18 = new SessionResult(
                    s18,
                    List.of("antonelli", "leclerc", "verstappen", "hamilton", "norris", "piastri", "russell", "sainz", "albon", "alonso"),
                    "antonelli",
                    1,
                    3,
                    "verstappen",
                    s18.getStartsAt() != null ? s18.getStartsAt().plus(java.time.Duration.ofHours(2)) : Instant.now()
                );
                results.save(r18);
            }

            // 2. Round 19 (Mexico GP - 2026-11-01)
            Session s19 = sessions.findBySeasonAndRoundAndType(2026, 19, Session.Type.RACE).orElse(null);
            if (s19 != null && results.findBySessionId(s19.getId()).isEmpty()) {
                SessionResult r19 = new SessionResult(
                    s19,
                    List.of("norris", "leclerc", "verstappen", "sainz", "hamilton", "piastri", "russell", "colapinto", "albon", "gasly"),
                    "norris",
                    1,
                    2,
                    "norris",
                    s19.getStartsAt() != null ? s19.getStartsAt().plus(java.time.Duration.ofHours(2)) : Instant.now()
                );
                results.save(r19);
            }

            // 3. Para cada usuario en users.findAll(), asegurar pronósticos en Round 18 y Round 19
            if (users != null) {
                var allUsers = users.findAll();
                if (s18 != null) {
                    for (var u : allUsers) {
                        if (predictions.findByUserAndSession(u, s18).isEmpty()) {
                            Instant subTime = s18.getStartsAt() != null ? s18.getStartsAt().minus(java.time.Duration.ofHours(2)) : Instant.now().minus(java.time.Duration.ofDays(10));
                            Prediction p18 = new Prediction(
                                u, s18,
                                List.of("norris", "hamilton", "verstappen"),
                                "verstappen", "verstappen",
                                1, 2,
                                subTime
                            );
                            predictions.save(p18);
                        }
                    }
                }
                if (s19 != null) {
                    for (var u : allUsers) {
                        if (predictions.findByUserAndSession(u, s19).isEmpty()) {
                            Instant subTime = s19.getStartsAt() != null ? s19.getStartsAt().minus(java.time.Duration.ofHours(2)) : Instant.now().minus(java.time.Duration.ofDays(3));
                            Prediction p19 = new Prediction(
                                u, s19,
                                List.of("norris", "leclerc", "hamilton"),
                                "norris", "norris",
                                1, 2,
                                subTime
                            );
                            predictions.save(p19);
                        }
                    }
                }
            }
        } catch (Exception ex) {
            log.warn("Aviso al verificar consistencia de sesiones finalizadas: {}", ex.getMessage());
        }
    }

    private int calculatePodiumHits(List<String> predictedPodium, List<String> actualClassification) {
        if (predictedPodium == null || actualClassification == null) return 0;
        int hits = 0;
        for (int i = 0; i < 3 && i < predictedPodium.size() && i < actualClassification.size(); i++) {
            String pick = predictedPodium.get(i);
            if (pick != null && !pick.isBlank() && pick.equalsIgnoreCase(actualClassification.get(i))) {
                hits++;
            }
        }
        return hits;
    }

    public String resolveDuelWinner(SessionResult result, WeekendMatchup matchup) {
        if (result.getDuelWinnerDriverId() != null && !result.getDuelWinnerDriverId().isBlank()) {
            return result.getDuelWinnerDriverId();
        }
        if (matchup == null) return null;

        String d1 = matchup.getDriver1Id();
        String d2 = matchup.getDriver2Id();
        List<String> classification = result.getClassification();

        int pos1 = indexOfDriver(classification, d1);
        int pos2 = indexOfDriver(classification, d2);

        // Si ambos terminaron, gana quien quedó en mejor posición (índice menor)
        if (pos1 >= 0 && pos2 >= 0) {
            return pos1 < pos2 ? d1 : d2;
        }
        // Si solo uno terminó la carrera clasificado, gana ese piloto
        if (pos1 >= 0) return d1;
        if (pos2 >= 0) return d2;

        return null;
    }

    private int indexOfDriver(List<String> list, String driverId) {
        for (int i = 0; i < list.size(); i++) {
            if (list.get(i).equalsIgnoreCase(driverId)) return i;
        }
        return -1;
    }

    public record ScoreBreakdown(
        int podiumHits,
        int podiumPoints,
        boolean poleHit,
        int polePoints,
        boolean duelHit,
        int duelPoints,
        boolean safetyCarHit,
        int safetyCarPoints,
        boolean dnfHit,
        int dnfPoints,
        int totalPoints
    ) {}

    public record ScoredPredictionSummary(
        UUID predictionId,
        UUID userId,
        String displayName,
        int totalPoints,
        ScoreBreakdown breakdown
    ) {}
}
