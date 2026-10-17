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

    public ScoringService(
        PredictionRepository predictions,
        SessionResultRepository results,
        WeekendMatchupRepository matchups,
        SessionRepository sessions
    ) {
        this.predictions = predictions;
        this.results = results;
        this.matchups = matchups;
        this.sessions = sessions;
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
        if (prediction.getPolePositionDriverId() != null && result.getPolePositionDriverId() != null) {
            if (prediction.getPolePositionDriverId().equalsIgnoreCase(result.getPolePositionDriverId())) {
                poleHit = true;
                polePoints = 4;
            }
        }

        // 3. Duelo de pilotos (3 puntos)
        boolean duelHit = false;
        int duelPoints = 0;
        String duelWinner = resolveDuelWinner(result, matchup);
        if (prediction.getDuelDriverPick() != null && duelWinner != null) {
            if (prediction.getDuelDriverPick().equalsIgnoreCase(duelWinner)) {
                duelHit = true;
                duelPoints = 3;
            }
        }

        // 4. Cantidad de autos de seguridad (VSC - SC): 10 puntos
        boolean safetyCarHit = false;
        int safetyCarPoints = 0;
        if (prediction.getSafetyCarCount() != null && result.getSafetyCarCount() != null) {
            if (prediction.getSafetyCarCount().equals(result.getSafetyCarCount())) {
                safetyCarHit = true;
                safetyCarPoints = 10;
            }
        }

        // 5. Cantidad de abandonos (DNF - DNS): 15 puntos
        boolean dnfHit = false;
        int dnfPoints = 0;
        if (prediction.getDnfCount() != null && result.getDnfCount() != null) {
            if (prediction.getDnfCount().equals(result.getDnfCount())) {
                dnfHit = true;
                dnfPoints = 15;
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

    private int calculatePodiumHits(List<String> predictedPodium, List<String> actualClassification) {
        if (predictedPodium == null || actualClassification == null) return 0;
        int hits = 0;
        for (int i = 0; i < 3 && i < predictedPodium.size() && i < actualClassification.size(); i++) {
            if (predictedPodium.get(i).equalsIgnoreCase(actualClassification.get(i))) {
                hits++;
            }
        }
        return hits;
    }

    private String resolveDuelWinner(SessionResult result, WeekendMatchup matchup) {
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
