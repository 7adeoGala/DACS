package ar.edu.dacs.apexpredict.web.dto;

import java.util.UUID;

public record LeaderboardEntry(
    int rank,
    UUID userId,
    String displayName,
    long totalScore,
    long predictionsCount
) {}
