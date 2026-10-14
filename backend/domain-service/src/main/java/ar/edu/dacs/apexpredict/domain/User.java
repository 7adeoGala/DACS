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
    protected User() {}
    public User(String issuer, String subject, String displayName, String email) {
        this.issuer = issuer; this.subject = subject; this.displayName = displayName; this.email = email;
    }
    public String getIssuer() { return issuer; }
    public String getSubject() { return subject; }
    public String getDisplayName() { return displayName; }
    public String getEmail() { return email; }
}
