package ar.edu.dacs.apexpredict.web.dto;

import java.util.List;

public record LastRaceInfo(
    String raceName,
    int round,
    String circuit,
    String date,
    List<DetailedFinish> results
) {
    public record DetailedFinish(
        String position,
        String driverId,
        String driverName,
        String team,
        String status,
        String points,
        String grid,
        String laps
    ) {}
}
