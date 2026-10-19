package ar.edu.dacs.apexpredict.web.dto;

import java.util.UUID;

public record LeagueView(
    UUID id,
    String name,
    String description,
    UUID inviteCode,
    UUID ownerId,
    String ownerName,
    long memberCount,
    boolean hasPassword,
    boolean isMember,
    String password
) {
    public LeagueView(UUID id, String name) {
        this(id, name, null, null, null, null, 1, false, true, null);
    }

    public LeagueView(UUID id, String name, String description, UUID inviteCode, UUID ownerId) {
        this(id, name, description, inviteCode, ownerId, null, 1, false, true, null);
    }
}
