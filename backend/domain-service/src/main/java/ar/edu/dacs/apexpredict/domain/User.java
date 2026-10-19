package ar.edu.dacs.apexpredict.domain;

import jakarta.persistence.*;

@Entity
@Table(name = "app_users", uniqueConstraints = @UniqueConstraint(columnNames = {"issuer", "subject"}))
public class User extends BaseEntity {
    @Column(nullable = false, updatable = false, length = 255)
    private String issuer;
    @Column(nullable = false, updatable = false, length = 100)
    private String subject;
    @Column(nullable = false, length = 160)
    private String displayName;
    @Column(length = 254)
    private String email;

    @Column(name = "favorite_driver_id", length = 64)
    private String favoriteDriverId;

    @Column(name = "favorite_team_id", length = 64)
    private String favoriteTeamId;

    @Column(name = "notifications_enabled", nullable = false)
    private boolean notificationsEnabled = true;

    protected User() {}
    public User(String issuer, String subject, String displayName, String email) {
        this.issuer = issuer; this.subject = subject; this.displayName = displayName; this.email = email;
        this.notificationsEnabled = true;
    }
    public String getIssuer() { return issuer; }
    public String getSubject() { return subject; }
    public String getDisplayName() { return displayName; }
    public String getEmail() { return email; }
    public String getFavoriteDriverId() { return favoriteDriverId; }
    public String getFavoriteTeamId() { return favoriteTeamId; }
    public boolean isNotificationsEnabled() { return notificationsEnabled; }

    public void updateProfile(String displayName, String favoriteDriverId, String favoriteTeamId, Boolean notificationsEnabled) {
        if (displayName != null && !displayName.isBlank()) {
            this.displayName = displayName.trim();
        }
        this.favoriteDriverId = favoriteDriverId != null && !favoriteDriverId.isBlank() ? favoriteDriverId.trim() : null;
        this.favoriteTeamId = favoriteTeamId != null && !favoriteTeamId.isBlank() ? favoriteTeamId.trim() : null;
        if (notificationsEnabled != null) {
            this.notificationsEnabled = notificationsEnabled;
        }
    }
}

