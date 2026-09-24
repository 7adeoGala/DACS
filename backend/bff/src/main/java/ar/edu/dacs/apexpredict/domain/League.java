package ar.edu.dacs.apexpredict.domain;

import jakarta.persistence.*;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "leagues")
public class League extends BaseEntity {
    @Column(nullable = false, length = 100)
    private String name;
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "owner_id", nullable = false)
    private User owner;
    @Column(nullable = false, unique = true, updatable = false)
    private UUID inviteCode = UUID.randomUUID();
    @Column(nullable = false, updatable = false)
    private Instant createdAt = Instant.now();
    protected League() {}
    public League(String name, User owner) { this.name = name; this.owner = owner; }
    public String getName() { return name; }
    public User getOwner() { return owner; }
    public UUID getInviteCode() { return inviteCode; }
    public Instant getCreatedAt() { return createdAt; }
}
