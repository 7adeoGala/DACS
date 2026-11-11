package ar.edu.dacs.apexpredict.application;

import ar.edu.dacs.apexpredict.client.ConectorClient;
import ar.edu.dacs.apexpredict.client.DomainClient;
import ar.edu.dacs.apexpredict.web.dto.*;
import java.util.List;
import java.util.Locale;
import org.springframework.stereotype.Service;

/**
 * Orquestador en el BFF que cruza las predicciones almacenadas en el servicio de dominio
 * contra los resultados oficiales reales provistos por el f1-connector.
 */
@Service
public class ProdeScoreService {

    private final DomainClient domainClient;
    private final ConectorClient conectorClient;

    public ProdeScoreService(DomainClient domainClient, ConectorClient conectorClient) {
        this.domainClient = domainClient;
        this.conectorClient = conectorClient;
    }

    public ProdeScoreDto calculateUserScore(int year, int round) {
        if (year < 1950 || year > 2100) {
            throw new IllegalArgumentException("Temporada fuera de rango.");
        }
        if (round < 1 || round > 40) {
            throw new IllegalArgumentException("Ronda fuera de rango.");
        }

        // 1. Obtener pronóstico del usuario desde el servicio de dominio (base de datos)
        PredictionDetail prediction = domainClient.predictionForSession(year + "-" + round);

        // 2. Pedir resultados oficiales al Conector F1 (que aísla Jolpica y OpenF1)
        OfficialRaceSummary official = conectorClient.officialSummary(year, round);

        boolean hasPrediction = prediction != null
            && (prediction.predictionId() != null || (prediction.podium() != null && !prediction.podium().isEmpty()));
        boolean hasOfficialResults = official != null
            && official.podiumTop10() != null
            && !official.podiumTop10().isEmpty();

        String sessionName = (official != null && official.raceName() != null)
            ? official.raceName()
            : (prediction != null && prediction.sessionName() != null ? prediction.sessionName() : "Gran Premio");

        if (!hasPrediction || !hasOfficialResults) {
            return new ProdeScoreDto(year, round, sessionName, hasPrediction, hasOfficialResults, 0, null, null);
        }

        // 3. Comparar y calcular puntaje según las reglas oficiales del Prode
        return compareAndCalculate(year, round, sessionName, prediction, official);
    }

    ProdeScoreDto compareAndCalculate(
        int year,
        int round,
        String sessionName,
        PredictionDetail prediction,
        OfficialRaceSummary official
    ) {
        List<String> actualClassification = official.fullClassification() != null && !official.fullClassification().isEmpty()
            ? official.fullClassification()
            : official.podiumTop10();

        int podiumHits = 0;
        List<String> predPodium = prediction.podium() != null ? prediction.podium() : List.of();
        for (int i = 0; i < 3 && i < predPodium.size() && i < actualClassification.size(); i++) {
            String pick = normalizeDriverId(predPodium.get(i));
            String actual = normalizeDriverId(actualClassification.get(i));
            if (pick != null && !pick.isBlank() && pick.equals(actual)) {
                podiumHits++;
            }
        }
        int podiumPoints = switch (podiumHits) {
            case 1 -> 3;
            case 2 -> 7;
            case 3 -> 10;
            default -> 0;
        };

        String predPole = normalizeDriverId(prediction.polePositionDriverId());
        String actualPole = normalizeDriverId(official.polePositionDriverId());
        boolean poleHit = predPole != null && !predPole.isBlank() && predPole.equals(actualPole);
        int polePoints = poleHit ? 4 : 0;

        String duelWinner = resolveDuelWinner(
            actualClassification,
            prediction.matchupDriver1(),
            prediction.matchupDriver2()
        );
        String predDuel = normalizeDriverId(prediction.duelDriverPick());
        boolean duelHit = predDuel != null && !predDuel.isBlank() && predDuel.equals(duelWinner);
        int duelPoints = duelHit ? 3 : 0;

        boolean safetyCarHit = prediction.safetyCarCount() != null
            && prediction.safetyCarCount().equals(official.safetyCarCount());
        int safetyCarPoints = safetyCarHit ? 6 : 0;

        boolean dnfHit = prediction.dnfCount() != null
            && prediction.dnfCount().equals(official.dnfCount());
        int dnfPoints = dnfHit ? 6 : 0;

        int total = podiumPoints + polePoints + duelPoints + safetyCarPoints + dnfPoints;

        var breakdown = new PredictionHistoryItem.ScoreBreakdown(
            podiumHits, podiumPoints,
            poleHit, polePoints,
            duelHit, duelPoints,
            safetyCarHit, safetyCarPoints,
            dnfHit, dnfPoints,
            total
        );
        var officialSummary = new ProdeScoreDto.OfficialSummary(
            actualClassification.stream().limit(3).map(ProdeScoreService::normalizeDriverId).toList(),
            actualPole,
            duelWinner,
            official.safetyCarCount(),
            official.dnfCount()
        );

        return new ProdeScoreDto(year, round, sessionName, true, true, total, breakdown, officialSummary);
    }

    private String resolveDuelWinner(List<String> classification, String d1, String d2) {
        if (classification == null || classification.isEmpty() || d1 == null || d2 == null) {
            return null;
        }
        String norm1 = normalizeDriverId(d1);
        String norm2 = normalizeDriverId(d2);
        int pos1 = indexOfDriver(classification, norm1);
        int pos2 = indexOfDriver(classification, norm2);
        if (pos1 >= 0 && pos2 >= 0) return pos1 < pos2 ? norm1 : norm2;
        if (pos1 >= 0) return norm1;
        if (pos2 >= 0) return norm2;
        return null;
    }

    private int indexOfDriver(List<String> list, String target) {
        if (target == null || target.isBlank()) return -1;
        for (int i = 0; i < list.size(); i++) {
            if (target.equals(normalizeDriverId(list.get(i)))) return i;
        }
        return -1;
    }

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
            default -> clean;
        };
    }
}
