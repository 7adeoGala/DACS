package ar.edu.dacs.apexpredict.web.dto;

import java.util.UUID;

public record LeagueView(
    UUID id,
    String name,
    String description,
    UUID inviteCode,
    UUID ownerId
) {
    public LeagueView(UUID id, String name) {
        this(id, name, null, null, null);
    }
}
