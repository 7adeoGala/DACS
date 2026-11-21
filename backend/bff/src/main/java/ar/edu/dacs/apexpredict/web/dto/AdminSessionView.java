package ar.edu.dacs.apexpredict.web.dto;

import java.time.Instant;
import java.util.UUID;

public record AdminSessionView(
    UUID id,
    int season,
    int round,
    String name,
    String circuit,
    String raceDate,
    Instant startsAt,
    boolean isLocked,
    boolean hasOfficialResult,
    int predictionsCount,
    int scoredCount
) {}
