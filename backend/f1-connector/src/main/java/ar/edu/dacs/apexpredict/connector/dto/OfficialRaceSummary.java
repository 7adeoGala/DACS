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
    public OfficialRaceSummary {
        podiumTop10 = podiumTop10 != null ? List.copyOf(podiumTop10) : List.of();
        fullClassification = fullClassification != null ? List.copyOf(fullClassification) : List.of();
        weekendPoints = weekendPoints != null ? Map.copyOf(weekendPoints) : Map.of();
    }

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
