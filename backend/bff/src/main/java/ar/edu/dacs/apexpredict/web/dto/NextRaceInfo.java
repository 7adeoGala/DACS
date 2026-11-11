package ar.edu.dacs.apexpredict.web.dto;

public record NextRaceInfo(
    int season,
    int round,
    String name,
    String circuit,
    String circuitId,
    String country,
    String locality,
    String raceDate,
    String startsAt,
    String fp1,
    String fp2,
    String fp3,
    String qualifying,
    String sprint,
    String sprintQualifying,
    String lat,
    String lon
) {}
