package ar.edu.dacs.apexpredict.connector.dto;

import java.util.List;

public record DriverDynamicStats(
    String driverId,
    String nationality,
    int points,
    String standingPosition,
    int wins,
    int podiums,
    int poles,
    int fastestLaps,
    int dnfs,
    int racesCount,
    String bestFinish,
    int careerWins,
    int careerPoles,
    int careerStarts,
    List<DriverSeasonResult> seasonResults
) {}
