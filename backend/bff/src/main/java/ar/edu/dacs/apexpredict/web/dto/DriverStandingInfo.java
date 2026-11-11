package ar.edu.dacs.apexpredict.web.dto;

public record DriverStandingInfo(
    String position,
    String points,
    String wins,
    String driverId,
    String code,
    String name,
    String nationality,
    String team
) {}
