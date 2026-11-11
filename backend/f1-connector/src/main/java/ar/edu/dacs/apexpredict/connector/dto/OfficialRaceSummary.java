package ar.edu.dacs.apexpredict.connector.dto;

import java.util.List;

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
    int dnfCount
) {}
