package ar.edu.dacs.apexpredict.domain;

import jakarta.persistence.*;
import java.time.Instant;

@Entity
@Table(name = "league_members", uniqueConstraints = @UniqueConstraint(columnNames = {"league_id", "user_id"}))
public class LeagueMember extends BaseEntity {
    public enum Role { OWNER, MEMBER }
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "league_id", nullable = false)
    private League league;
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;
    @Enumerated(EnumType.STRING) @Column(nullable = false, length = 16)
    private Role role;
    @Column(nullable = false, updatable = false)
    private Instant joinedAt = Instant.now();
    protected LeagueMember() {}
    public LeagueMember(League league, User user, Role role) { this.league = league; this.user = user; this.role = role; }
    public League getLeague() { return league; }
    public User getUser() { return user; }
    public Role getRole() { return role; }
    public Instant getJoinedAt() { return joinedAt; }
}
