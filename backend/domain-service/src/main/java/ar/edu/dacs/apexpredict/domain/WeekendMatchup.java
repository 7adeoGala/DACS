package ar.edu.dacs.apexpredict.domain;

import jakarta.persistence.*;
import java.time.Instant;
import java.util.Objects;

/**
 * Representa el duelo de pilotos seleccionado por fin de semana de carrera.
 * El sistema selecciona aleatoriamente 2 pilotos por fin de semana (los mismos 2 para todos los usuarios).
 */
@Entity
@Table(name = "weekend_matchups")
public class WeekendMatchup extends BaseEntity {

    @OneToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "session_id", nullable = false, unique = true)
    private Session session;

    @Column(name = "driver1_id", nullable = false, length = 64)
    private String driver1Id;

    @Column(name = "driver2_id", nullable = false, length = 64)
    private String driver2Id;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt = Instant.now();

    protected WeekendMatchup() {}

    public WeekendMatchup(Session session, String driver1Id, String driver2Id) {
        if (Objects.equals(driver1Id, driver2Id)) {
            throw new IllegalArgumentException("El duelo de pilotos debe componerse de dos pilotos distintos.");
        }
        this.session = Objects.requireNonNull(session, "La sesión es obligatoria.");
        this.driver1Id = Objects.requireNonNull(driver1Id, "El piloto 1 es obligatorio.");
        this.driver2Id = Objects.requireNonNull(driver2Id, "El piloto 2 es obligatorio.");
        this.createdAt = Instant.now();
    }

    public Session getSession() { return session; }
    public String getDriver1Id() { return driver1Id; }
    public String getDriver2Id() { return driver2Id; }
    public Instant getCreatedAt() { return createdAt; }

    public void updateDrivers(String driver1Id, String driver2Id) {
        if (Objects.equals(driver1Id, driver2Id)) {
            throw new IllegalArgumentException("El duelo de pilotos debe componerse de dos pilotos distintos.");
        }
        this.driver1Id = Objects.requireNonNull(driver1Id, "El piloto 1 es obligatorio.");
        this.driver2Id = Objects.requireNonNull(driver2Id, "El piloto 2 es obligatorio.");
    }

    public boolean involvesDriver(String driverId) {
        return driver1Id.equalsIgnoreCase(driverId) || driver2Id.equalsIgnoreCase(driverId);
    }
}
