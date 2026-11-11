package ar.edu.dacs.apexpredict.web.dto;

public record DriverSeasonResult(
    int round,
    String raceName,
    int position,
    int grid,
    String status
) {}
