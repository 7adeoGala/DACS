package ar.edu.dacs.apexpredict.application;

import ar.edu.dacs.apexpredict.domain.*;
import ar.edu.dacs.apexpredict.infrastructure.persistence.*;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.time.Instant;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
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
    private static final Duration EXTERNAL_SYNC_COOLDOWN = Duration.ofMinutes(10);

    private final PredictionRepository predictions;
    private final SessionResultRepository results;
    private final WeekendMatchupRepository matchups;
    private final SessionRepository sessions;
    private final ObjectMapper objectMapper = new ObjectMapper();
    private final HttpClient httpClient = HttpClient.newBuilder()
        .connectTimeout(Duration.ofSeconds(4))
        .build();
    private final Map<UUID, Instant> externalSyncAttempts = new ConcurrentHashMap<>();

    @Autowired
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
     * Normaliza identificadores de pilotos entre la API externa (Jolpica/OpenF1) y el catálogo local.
     */
    public static String normalizeDriverId(String driverId) {
        if (driverId == null) return null;
        String clean = driverId.trim().toLowerCase(Locale.ROOT);
        if (clean.isEmpty()) return "";
        return switch (clean) {
            case "max_verstappen", "maxverstappen" -> "verstappen";
            case "arvid_lindblad", "arvidlindblad" -> "lindblad";
            case "sergio_perez", "sergioperez" -> "perez";
            case "carlos_sainz", "carlossainz" -> "sainz";
            case "nico_hulkenberg", "nicohulkenberg" -> "hulkenberg";
            case "kimi_antonelli", "andrea_kimi_antonelli" -> "antonelli";
            case "kevin_magnussen", "kevinmagnussen" -> "magnussen";
            default -> clean;
        };
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
        String predPole = normalizeDriverId(prediction.getPolePositionDriverId());
        String actualPole = normalizeDriverId(result.getPolePositionDriverId());
        if (predPole != null && !predPole.isBlank() && actualPole != null && !actualPole.isBlank()) {
            if (predPole.equals(actualPole)) {
                poleHit = true;
                polePoints = 4;
            }
        }

        // 3. Duelo de pilotos (3 puntos)
        boolean duelHit = false;
        int duelPoints = 0;
        String duelWinner = normalizeDriverId(resolveDuelWinner(result, matchup));
        String predDuel = normalizeDriverId(prediction.getDuelDriverPick());
        if (predDuel != null && !predDuel.isBlank() && duelWinner != null && !duelWinner.isBlank()) {
            if (predDuel.equals(duelWinner)) {
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
     * Garantiza que las sesiones finalizadas cuenten con resultados oficiales reales publicados
     * (sin crear ni modificar pronósticos de usuarios).
     */
    @Transactional
    public void ensureFinishedSessionsSeeded() {
        try {
            // 1. Respaldo oficial verificado para Round 18, 19 y 20 (solo inserta si aún no existe en BD)
            ensureOfficialResultIfMissing(
                2026, 18,
                List.of("antonelli", "leclerc", "verstappen", "hamilton", "norris", "hadjar", "piastri", "russell", "lawson", "gasly"),
                "antonelli", 2, 3, "verstappen"
            );
            ensureOfficialResultIfMissing(
                2026, 19,
                List.of("verstappen", "hamilton", "antonelli", "leclerc", "norris", "russell", "lawson", "bortoleto", "hadjar", "ryo_hirakawa"),
                "hamilton", 3, 5, "leclerc"
            );
            ensureOfficialResultIfMissing(
                2026, 20,
                List.of("norris", "verstappen", "hadjar", "russell", "antonelli", "piastri", "lawson", "leclerc", "hamilton", "hulkenberg"),
                "norris", 0, 2, "lawson"
            );

            // 2. Sincronización dinámica vía Jolpica/OpenF1 para cualquier carrera posterior ya finalizada (R21+)
            Instant cutoff = Instant.now().minus(Duration.ofHours(3));
            for (Session s : sessions.findAll()) {
                if (s.getType() != Session.Type.RACE || s.getStartsAt() == null) continue;
                if (s.getSeason() < 2026 || s.getRound() <= 20) continue;
                if (s.getStartsAt().isAfter(cutoff)) continue;
                if (results.findBySessionId(s.getId()).isPresent()) continue;
                syncCompletedSessionFromExternalApis(s);
            }
        } catch (Exception ex) {
            log.warn("Aviso al verificar consistencia de sesiones finalizadas: {}", ex.getMessage());
        }
    }

    private void ensureOfficialResultIfMissing(
        int season,
        int round,
        List<String> finishers,
        String pole,
        int safetyCars,
        int dnfs,
        String duelWinner
    ) {
        Session session = sessions.findBySeasonAndRoundAndType(season, round, Session.Type.RACE).orElse(null);
        if (session != null && results.findBySessionId(session.getId()).isEmpty()) {
            Instant publishedAt = session.getStartsAt() != null
                ? session.getStartsAt().plus(Duration.ofHours(3))
                : Instant.now();
            results.save(new SessionResult(session, finishers, pole, safetyCars, dnfs, duelWinner, publishedAt));
        }
    }

    private void syncCompletedSessionFromExternalApis(Session session) {
        Instant now = Instant.now();
        Instant lastAttempt = externalSyncAttempts.get(session.getId());
        if (lastAttempt != null && Duration.between(lastAttempt, now).compareTo(EXTERNAL_SYNC_COOLDOWN) < 0) {
            return;
        }
        externalSyncAttempts.put(session.getId(), now);

        try {
            String resultsUrl = String.format("https://api.jolpi.ca/ergast/f1/%d/%d/results.json?limit=100", session.getSeason(), session.getRound());
            JsonNode resultsRoot = fetchJson(resultsUrl);
            if (resultsRoot == null) return;

            JsonNode races = resultsRoot.path("MRData").path("RaceTable").path("Races");
            if (!races.isArray() || races.isEmpty()) return;

            JsonNode raceResults = races.get(0).path("Results");
            if (!raceResults.isArray() || raceResults.size() < 3) return;

            List<String> fullClassification = new ArrayList<>();
            int dnfCount = 0;
            String gridPole = null;
            for (JsonNode entry : raceResults) {
                String rawDriverId = entry.path("Driver").path("driverId").asText("");
                String normDriverId = normalizeDriverId(rawDriverId);
                if (normDriverId != null && !normDriverId.isBlank() && !fullClassification.contains(normDriverId)) {
                    fullClassification.add(normDriverId);
                }
                if ("1".equals(entry.path("grid").asText(""))) {
                    gridPole = normDriverId;
                }
                String status = entry.path("status").asText("").trim().toLowerCase(Locale.ROOT);
                if (!status.isEmpty() && !status.equals("finished") && !status.equals("lapped") && !status.startsWith("+")) {
                    dnfCount++;
                }
            }

            if (fullClassification.isEmpty()) return;

            List<String> top10 = fullClassification.stream().limit(10).toList();
            String pole = fetchJolpicaPole(session.getSeason(), session.getRound());
            if (pole == null || pole.isBlank()) {
                pole = gridPole;
            }

            String duelWinner = resolveDuelWinnerFromClassification(
                fullClassification,
                matchups.findBySessionId(session.getId()).orElse(null)
            );
            int safetyCars = fetchOpenF1SafetyCarCount(session);

            Instant publishedAt = session.getStartsAt() != null
                ? session.getStartsAt().plus(Duration.ofHours(3))
                : now;
            results.save(new SessionResult(session, top10, pole, safetyCars, dnfCount, duelWinner, publishedAt));
            log.info("Resultados oficiales sincronizados dinámicamente para {} (Pole: {}, SC: {}, DNF: {})",
                session.getName(), pole, safetyCars, dnfCount);
        } catch (Exception ex) {
            log.warn("No se pudo sincronizar automáticamente {}: {}", session.getName(), ex.getMessage());
        }
    }

    private String fetchJolpicaPole(int season, int round) {
        String qualUrl = String.format("https://api.jolpi.ca/ergast/f1/%d/%d/qualifying.json?limit=5", season, round);
        JsonNode root = fetchJson(qualUrl);
        if (root == null) return null;
        JsonNode races = root.path("MRData").path("RaceTable").path("Races");
        if (!races.isArray() || races.isEmpty()) return null;
        JsonNode qualResults = races.get(0).path("QualifyingResults");
        if (!qualResults.isArray() || qualResults.isEmpty()) return null;
        return normalizeDriverId(qualResults.get(0).path("Driver").path("driverId").asText(null));
    }

    private int fetchOpenF1SafetyCarCount(Session session) {
        if (session.getRaceDate() == null) return 0;
        String sessionsUrl = String.format("https://api.openf1.org/v1/sessions?year=%d&session_name=Race", session.getSeason());
        JsonNode openSessions = fetchJson(sessionsUrl);
        if (openSessions == null || !openSessions.isArray()) return 0;

        String targetDate = session.getRaceDate().toString();
        String sessionKey = null;
        for (JsonNode sNode : openSessions) {
            String dateStart = sNode.path("date_start").asText("");
            if (dateStart.startsWith(targetDate)) {
                sessionKey = sNode.path("session_key").asText("");
                break;
            }
        }
        if (sessionKey == null || sessionKey.isBlank()) return 0;

        JsonNode messages = fetchJson("https://api.openf1.org/v1/race_control?session_key=" + sessionKey);
        if (messages == null || !messages.isArray()) return 0;

        int deployments = 0;
        for (JsonNode msg : messages) {
            String category = msg.path("category").asText("");
            String text = msg.path("message").asText("").toUpperCase(Locale.ROOT);
            if ("SafetyCar".equalsIgnoreCase(category) && text.contains("DEPLOYED")) {
                deployments++;
            }
        }
        return deployments;
    }

    private JsonNode fetchJson(String url) {
        try {
            HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create(url))
                .timeout(Duration.ofSeconds(5))
                .GET()
                .build();
            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
            if (response.statusCode() >= 200 && response.statusCode() < 300 && response.body() != null) {
                return objectMapper.readTree(response.body());
            }
        } catch (Exception ignored) {}
        return null;
    }

    private String resolveDuelWinnerFromClassification(List<String> classification, WeekendMatchup matchup) {
        if (matchup == null || classification == null) return null;
        String d1 = normalizeDriverId(matchup.getDriver1Id());
        String d2 = normalizeDriverId(matchup.getDriver2Id());
        int pos1 = indexOfDriver(classification, d1);
        int pos2 = indexOfDriver(classification, d2);
        if (pos1 >= 0 && pos2 >= 0) return pos1 < pos2 ? d1 : d2;
        if (pos1 >= 0) return d1;
        if (pos2 >= 0) return d2;
        return null;
    }

    private int calculatePodiumHits(List<String> predictedPodium, List<String> actualClassification) {
        if (predictedPodium == null || actualClassification == null) return 0;
        int hits = 0;
        for (int i = 0; i < 3 && i < predictedPodium.size() && i < actualClassification.size(); i++) {
            String pick = normalizeDriverId(predictedPodium.get(i));
            String actual = normalizeDriverId(actualClassification.get(i));
            if (pick != null && !pick.isBlank() && pick.equals(actual)) {
                hits++;
            }
        }
        return hits;
    }

    public String resolveDuelWinner(SessionResult result, WeekendMatchup matchup) {
        if (result.getDuelWinnerDriverId() != null && !result.getDuelWinnerDriverId().isBlank()) {
            return normalizeDriverId(result.getDuelWinnerDriverId());
        }
        if (matchup == null) return null;
        return resolveDuelWinnerFromClassification(result.getClassification(), matchup);
    }

    private int indexOfDriver(List<String> list, String driverId) {
        String target = normalizeDriverId(driverId);
        if (target == null || target.isBlank()) return -1;
        for (int i = 0; i < list.size(); i++) {
            if (target.equals(normalizeDriverId(list.get(i)))) return i;
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
