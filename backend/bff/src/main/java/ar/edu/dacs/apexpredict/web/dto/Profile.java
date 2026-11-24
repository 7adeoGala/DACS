package ar.edu.dacs.apexpredict.web.dto;

import java.util.UUID;

public record Profile(
    UUID id,
    String displayName,
    String email,
    String firstName,
    String lastName,
    String country,
    String bio,
    String favoriteDriverId,
    String favoriteTeamId,
    boolean notificationsEnabled,
    long totalScore,
    long predictionsCount
) {
    public Profile(UUID id, String displayName, String email) {
        this(id, displayName, email, null, null, null, null, null, null, true, 0L, 0L);
    }
}
