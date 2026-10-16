package ar.edu.dacs.apexpredict.web.dto;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

public record PredictionHistoryItem(
    UUID predictionId,
    UUID sessionId,
    String sessionName,
    String circuit,
    String raceDate,
    Instant startsAt,
    List<String> podium,
    String polePositionDriverId,
    String duelDriverPick,
    Integer safetyCarCount,
    Integer dnfCount,
    Integer score,
    Instant submittedAt,
    String matchupDriver1,
    String matchupDriver2,
    ScoreBreakdown scoreBreakdown
) {
    public record ScoreBreakdown(
        int podiumHits,
        int podiumPoints,
        boolean poleHit,
        int polePoints,
        boolean duelHit,
        int duelPoints,
        boolean safetyCarHit,
        int safetyCarPoints,
        boolean dnfHit,
        int dnfPoints,
        int totalPoints
    ) {}
}
