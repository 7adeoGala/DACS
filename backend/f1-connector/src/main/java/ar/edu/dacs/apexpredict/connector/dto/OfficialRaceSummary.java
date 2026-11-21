package ar.edu.dacs.apexpredict.connector.dto;

import java.util.List;
import java.util.Map;

public record OfficialRaceSummary(
    int season,
    int round,
    String raceName,
    String circuit,
    String raceDate,
    List<String> podiumTop10,
    List<String> fullClassification,
    String polePositionDriverId,
    int safetyCarCount,
    int dnfCount,
    Map<String, Double> weekendPoints
) {
    public OfficialRaceSummary(
        int season,
        int round,
        String raceName,
        String circuit,
        String raceDate,
        List<String> podiumTop10,
        List<String> fullClassification,
        String polePositionDriverId,
        int safetyCarCount,
        int dnfCount
    ) {
        this(season, round, raceName, circuit, raceDate, podiumTop10, fullClassification, polePositionDriverId, safetyCarCount, dnfCount, Map.of());
    }
}
