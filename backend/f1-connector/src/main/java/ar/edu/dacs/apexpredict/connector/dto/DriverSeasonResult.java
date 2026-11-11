package ar.edu.dacs.apexpredict.connector.dto;

public record DriverSeasonResult(
    int round,
    String raceName,
    int position,
    int grid,
    String status
) {}
