package ar.edu.dacs.apexpredict.web.dto;

import java.time.Instant;
import java.util.UUID;

public record NextSession(
    UUID id,
    int season,
    int round,
    String name,
    String circuit,
    String type,
    String raceDate,
    Instant startsAt,
    boolean isLocked,
    String matchupDriver1,
    String matchupDriver2
) {}
