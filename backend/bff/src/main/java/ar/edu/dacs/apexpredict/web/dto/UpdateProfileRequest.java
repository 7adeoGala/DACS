package ar.edu.dacs.apexpredict.web.dto;

public record UpdateProfileRequest(
    String displayName,
    String favoriteDriverId,
    String favoriteTeamId,
    Boolean notificationsEnabled
) {}
