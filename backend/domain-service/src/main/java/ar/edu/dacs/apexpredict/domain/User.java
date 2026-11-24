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

    @Column(name = "first_name", length = 80)
    private String firstName;

    @Column(name = "last_name", length = 80)
    private String lastName;

    @Column(name = "country", length = 80)
    private String country;

    @Column(name = "bio", length = 280)
    private String bio;

    @Column(name = "favorite_driver_id", length = 64)
    private String favoriteDriverId;

    @Column(name = "favorite_team_id", length = 64)
    private String favoriteTeamId;

    @Column(name = "notifications_enabled", nullable = false)
    private boolean notificationsEnabled = true;

    protected User() {}

    public User(String issuer, String subject, String displayName, String email) {
        this.issuer = issuer;
        this.subject = subject;
        this.displayName = displayName;
        this.email = email;
        this.notificationsEnabled = true;
    }

    public String getIssuer() { return issuer; }
    public String getSubject() { return subject; }
    public String getDisplayName() { return displayName; }
    public String getEmail() { return email; }
    public String getFirstName() { return firstName; }
    public String getLastName() { return lastName; }
    public String getCountry() { return country; }
    public String getBio() { return bio; }
    public String getFavoriteDriverId() { return favoriteDriverId; }
    public String getFavoriteTeamId() { return favoriteTeamId; }
    public boolean isNotificationsEnabled() { return notificationsEnabled; }

    public void updateProfile(String displayName, String favoriteDriverId, String favoriteTeamId, Boolean notificationsEnabled) {
        updateProfile(displayName, this.email, this.firstName, this.lastName, this.country, this.bio, favoriteDriverId, favoriteTeamId, notificationsEnabled);
    }

    public void updateProfile(
        String displayName,
        String email,
        String firstName,
        String lastName,
        String country,
        String bio,
        String favoriteDriverId,
        String favoriteTeamId,
        Boolean notificationsEnabled
    ) {
        if (displayName != null && !displayName.isBlank()) {
            this.displayName = displayName.trim();
        }
        if (email != null) {
            String trimmedEmail = email.trim();
            this.email = trimmedEmail.isEmpty() ? null : trimmedEmail.toLowerCase();
        }
        if (firstName != null) {
            this.firstName = firstName.isBlank() ? null : firstName.trim();
        }
        if (lastName != null) {
            this.lastName = lastName.isBlank() ? null : lastName.trim();
        }
        if (country != null) {
            this.country = country.isBlank() ? null : country.trim();
        }
        if (bio != null) {
            this.bio = bio.isBlank() ? null : bio.trim();
        }
        this.favoriteDriverId = favoriteDriverId != null && !favoriteDriverId.isBlank() ? favoriteDriverId.trim() : null;
        this.favoriteTeamId = favoriteTeamId != null && !favoriteTeamId.isBlank() ? favoriteTeamId.trim() : null;
        if (notificationsEnabled != null) {
            this.notificationsEnabled = notificationsEnabled;
        }
    }
}
