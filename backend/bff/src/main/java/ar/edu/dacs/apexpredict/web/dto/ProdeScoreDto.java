package ar.edu.dacs.apexpredict.web.dto;

import java.util.List;

public record ProdeScoreDto(
    int season,
    int round,
    String sessionName,
    boolean hasPrediction,
    boolean hasOfficialResults,
    int totalPoints,
    PredictionHistoryItem.ScoreBreakdown breakdown,
    OfficialSummary officialResults
) {
    public record OfficialSummary(
        List<String> podium,
        String polePositionDriverId,
        String duelWinnerId,
        int safetyCarCount,
        int dnfCount
    ) {}
}
