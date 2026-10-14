package ar.edu.dacs.apexpredict.web.dto;

public record Finish(
    int position,
    String driverId,
    String driverName,
    String constructorName,
    String status
) {}
