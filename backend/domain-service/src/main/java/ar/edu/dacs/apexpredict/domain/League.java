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
        this(name, null, owner);
    }

    public League(String name, String description, User owner) {
        this.name = validateName(name);
        this.description = description != null ? description.strip() : null;
        this.owner = Objects.requireNonNull(owner, "El propietario de la liga es obligatorio.");
        this.inviteCode = UUID.randomUUID();
        this.createdAt = Instant.now();
    }

    /**
     * Permite editar la liga privada, validando que quien realiza el cambio sea el propietario.
     */
    public void update(String newName, String newDescription, User requester) {
        if (!isOwner(requester)) {
            throw new IllegalStateException("Solo el propietario puede editar la liga.");
        }
        this.name = validateName(newName);
        this.description = newDescription != null ? newDescription.strip() : null;
        this.updatedAt = Instant.now();
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
}
