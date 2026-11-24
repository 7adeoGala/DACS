package ar.edu.dacs.apexpredict.web.dto;

import java.util.UUID;

public record DuelCommunityStats(
    UUID sessionId,
    String driver1Id,
    String driver2Id,
    int driver1Votes,
    int driver2Votes,
    int totalVotes,
    int driver1Pct,
    int driver2Pct
) {}
