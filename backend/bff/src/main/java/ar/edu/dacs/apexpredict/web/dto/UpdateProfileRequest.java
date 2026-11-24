package ar.edu.dacs.apexpredict.web.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.Size;

public record UpdateProfileRequest(
    @Size(max = 40) String displayName,
    @Email @Size(max = 254) String email,
    @Size(max = 80) String firstName,
    @Size(max = 80) String lastName,
    @Size(max = 80) String country,
    @Size(max = 280) String bio,
    @Size(max = 64) String favoriteDriverId,
    @Size(max = 64) String favoriteTeamId,
    Boolean notificationsEnabled
) {}
