package ar.edu.dacs.apexpredict.domain;

import jakarta.persistence.*;
import java.time.Instant;
import java.util.Objects;
import java.util.UUID;

@Entity
@Table(name = "leagues")
public class League extends BaseEntity {

    @Column(nullable = false, length = 100)
    private String name;

    @Column(length = 255)
    private String description;

    @Column(length = 100)
    private String password;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "owner_id", nullable = false)
    private User owner;

    @Column(nullable = false, unique = true, updatable = false)
    private UUID inviteCode = UUID.randomUUID();

    @Column(nullable = false, updatable = false)
    private Instant createdAt = Instant.now();

    @Column(name = "updated_at")
    private Instant updatedAt;

    protected League() {}

    public League(String name, User owner) {
        this(name, null, null, owner);
    }

    public League(String name, String description, User owner) {
        this(name, description, null, owner);
    }

    public League(String name, String description, String password, User owner) {
        this.name = validateName(name);
        this.description = description != null ? description.strip() : null;
        this.password = password != null && !password.isBlank() ? password.strip() : null;
        this.owner = Objects.requireNonNull(owner, "El propietario de la liga es obligatorio.");
        this.inviteCode = UUID.randomUUID();
        this.createdAt = Instant.now();
    }

    public void update(String newName, String newDescription, User requester) {
        update(newName, newDescription, this.password, requester);
    }

    public void update(String newName, String newDescription, String newPassword, User requester) {
        if (!isOwner(requester)) {
            throw new IllegalStateException("Solo el propietario puede editar la liga.");
        }
        this.name = validateName(newName);
        this.description = newDescription != null ? newDescription.strip() : null;
        if (newPassword != null) {
            this.password = newPassword.isBlank() ? null : newPassword.strip();
        }
        this.updatedAt = Instant.now();
    }

    public boolean hasPassword() {
        return password != null && !password.isBlank();
    }

    public boolean verifyPassword(String candidate) {
        if (!hasPassword()) {
            return true;
        }
        return candidate != null && password.equals(candidate.strip());
    }

    public boolean isOwner(User user) {
        return user != null && this.owner != null && Objects.equals(this.owner.getId(), user.getId());
    }

    private static String validateName(String name) {
        if (name == null || name.isBlank() || name.strip().length() > 100) {
            throw new IllegalArgumentException("El nombre de la liga es inválido (1-100 caracteres).");
        }
        return name.strip();
    }

    public String getName() { return name; }
    public String getDescription() { return description; }
    public User getOwner() { return owner; }
    public UUID getInviteCode() { return inviteCode; }
    public Instant getCreatedAt() { return createdAt; }
    public Instant getUpdatedAt() { return updatedAt; }
    public String getPassword() { return password; }
}
