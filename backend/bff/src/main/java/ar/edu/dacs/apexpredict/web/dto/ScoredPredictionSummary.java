package ar.edu.dacs.apexpredict.web.dto;

import java.util.UUID;

public record ScoredPredictionSummary(
    UUID predictionId,
    UUID userId,
    String displayName,
    int totalPoints,
    PredictionHistoryItem.ScoreBreakdown breakdown
) {}
