package ar.edu.dacs.apexpredict.domain;

import jakarta.persistence.*;
import java.time.Instant;
import java.util.*;

@Entity
@Table(name = "session_results")
public class SessionResult extends BaseEntity {

    @OneToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "session_id", nullable = false, unique = true)
    private Session session;

    @ElementCollection
    @CollectionTable(
        name = "result_finishers",
        joinColumns = @JoinColumn(name = "result_id"),
        uniqueConstraints = @UniqueConstraint(columnNames = {"result_id", "driver_id"})
    )
    @OrderColumn(name = "position")
    @Column(name = "driver_id", nullable = false, length = 64)
    private List<String> classification = new ArrayList<>();

    @Column(name = "pole_position_driver_id", length = 64)
    private String polePositionDriverId;

    @Column(name = "safety_car_count", nullable = false)
    private Integer safetyCarCount = 0;

    @Column(name = "dnf_count", nullable = false)
    private Integer dnfCount = 0;

    @Column(name = "duel_winner_driver_id", length = 64)
    private String duelWinnerDriverId;

    @Column(nullable = false)
    private Instant publishedAt;

    protected SessionResult() {}

    /**
     * Constructor compatible con versiones anteriores.
     */
    public SessionResult(Session session, List<String> classification, Instant publishedAt) {
        this(session, classification, null, 0, 0, null, publishedAt);
    }

    /**
     * Constructor ampliado con datos oficiales completos para scoring.
     */
    public SessionResult(
        Session session,
        List<String> classification,
        String polePositionDriverId,
        Integer safetyCarCount,
        Integer dnfCount,
        String duelWinnerDriverId,
        Instant publishedAt
    ) {
        if (classification == null || classification.isEmpty() ||
            classification.stream().anyMatch(id -> id == null || id.isBlank() || id.length() > 64) ||
            new HashSet<>(classification).size() != classification.size()) {
            throw new IllegalArgumentException("La clasificacion requiere pilotos distintos.");
        }
        this.session = Objects.requireNonNull(session);
        this.classification = new ArrayList<>(classification);
        this.polePositionDriverId = polePositionDriverId;
        this.safetyCarCount = safetyCarCount != null ? safetyCarCount : 0;
        this.dnfCount = dnfCount != null ? dnfCount : 0;
        this.duelWinnerDriverId = duelWinnerDriverId;
        this.publishedAt = Objects.requireNonNull(publishedAt);
    }

    public Session getSession() { return session; }
    public List<String> getClassification() { return List.copyOf(classification); }
    public String getPolePositionDriverId() { return polePositionDriverId; }
    public Integer getSafetyCarCount() { return safetyCarCount; }
    public Integer getDnfCount() { return dnfCount; }
    public String getDuelWinnerDriverId() { return duelWinnerDriverId; }
    public Instant getPublishedAt() { return publishedAt; }

    public void updateOfficialResults(
        String polePositionDriverId,
        Integer safetyCarCount,
        Integer dnfCount,
        String duelWinnerDriverId
    ) {
        this.polePositionDriverId = polePositionDriverId;
        this.safetyCarCount = safetyCarCount != null ? safetyCarCount : 0;
        this.dnfCount = dnfCount != null ? dnfCount : 0;
        this.duelWinnerDriverId = duelWinnerDriverId;
    }
}
