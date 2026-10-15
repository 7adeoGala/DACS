package ar.edu.dacs.apexpredict.web.dto;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

public record PredictionDetail(
    UUID predictionId,
    UUID sessionId,
    String sessionName,
    String circuit,
    Instant startsAt,
    boolean isLocked,
    List<String> podium,
    String polePositionDriverId,
    String duelDriverPick,
    Integer safetyCarCount,
    Integer dnfCount,
    Integer score,
    Instant submittedAt,
    String matchupDriver1,
    String matchupDriver2
) {}
