package ar.edu.dacs.apexpredict.web.dto;

import java.util.UUID;

public record Profile(
    UUID id,
    String displayName,
    String email,
    String favoriteDriverId,
    String favoriteTeamId,
    boolean notificationsEnabled,
    long totalScore,
    long predictionsCount
) {
    public Profile(UUID id, String displayName, String email) {
        this(id, displayName, email, null, null, true, 0L, 0L);
    }
}
