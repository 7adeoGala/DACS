package ar.edu.dacs.apexpredict.domain;

import jakarta.persistence.*;
import java.time.Instant;
import java.util.*;

@Entity
@Table(name = "predictions")
public class Prediction extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id")
    private User user;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "member_id")
    private LeagueMember member;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "session_id", nullable = false)
    private Session session;

    @ElementCollection
    @CollectionTable(
        name = "prediction_picks",
        joinColumns = @JoinColumn(name = "prediction_id")
    )
    @OrderColumn(name = "position")
    @Column(name = "driver_id", nullable = false, length = 64)
    private List<String> podium = new ArrayList<>();

    @Column(name = "pole_position_driver_id", length = 64)
    private String polePositionDriverId;

    @Column(name = "duel_driver_pick", length = 64)
    private String duelDriverPick;

    @Column(name = "safety_car_count")
    private Integer safetyCarCount;

    @Column(name = "dnf_count")
    private Integer dnfCount;

    @Column(name = "score")
    private Integer score;

    @Column(name = "scored_at")
    private Instant scoredAt;

    @Column(nullable = false)
    private Instant submittedAt;

    @Version
    private long version;

    protected Prediction() {}

    /**
     * Constructor compatible con versión inicial (Fases anteriores / tests unitarios).
     */
    public Prediction(LeagueMember member, Session session, List<String> podium, Instant now) {
        validateLockTime(session, now);
        validatePodium(podium);
        this.member = Objects.requireNonNull(member);
        this.user = member.getUser();
        this.session = Objects.requireNonNull(session);
        this.podium = new ArrayList<>(podium);
        this.submittedAt = Objects.requireNonNull(now);
    }

    /**
     * Constructor completo para predicción ampliada con todas las reglas de puntuación.
     */
    public Prediction(
        User user,
        Session session,
        List<String> podium,
        String polePositionDriverId,
        String duelDriverPick,
        Integer safetyCarCount,
        Integer dnfCount,
        Instant now
    ) {
        validateLockTime(session, now);
        validatePodium(podium);
        this.user = Objects.requireNonNull(user, "El usuario es obligatorio.");
        this.session = Objects.requireNonNull(session, "La sesión es obligatoria.");
        this.podium = new ArrayList<>(podium);
        this.polePositionDriverId = polePositionDriverId;
        this.duelDriverPick = duelDriverPick;
        this.safetyCarCount = safetyCarCount;
        this.dnfCount = dnfCount;
        this.submittedAt = Objects.requireNonNull(now);
    }

    /**
     * Actualiza el pronóstico existente verificando estrictamente la regla de negocio de Lock Time.
     */
    public void updatePicks(
        List<String> podium,
        String polePositionDriverId,
        String duelDriverPick,
        Integer safetyCarCount,
        Integer dnfCount,
        Instant now
    ) {
        validateLockTime(this.session, now);
        validatePodium(podium);
        this.podium.clear();
        this.podium.addAll(podium);
        this.polePositionDriverId = polePositionDriverId;
        this.duelDriverPick = duelDriverPick;
        this.safetyCarCount = safetyCarCount;
        this.dnfCount = dnfCount;
        this.submittedAt = now;
    }

    public void applyScore(int totalPoints, Instant now) {
        this.score = totalPoints;
        this.scoredAt = now;
    }

    private static void validateLockTime(Session session, Instant now) {
        if (session == null || session.getStartsAt() == null || !now.isBefore(session.getStartsAt())) {
            throw new IllegalStateException("La sesion no admite predicciones.");
        }
    }

    private static void validatePodium(List<String> podium) {
        if (podium == null || podium.size() != 3 || new HashSet<>(podium).size() != 3 ||
            podium.stream().anyMatch(id -> id == null || id.isBlank() || id.length() > 64)) {
            throw new IllegalArgumentException("El podio requiere tres pilotos distintos.");
        }
    }

    public User getUser() { return user; }
    public LeagueMember getMember() { return member; }
    public Session getSession() { return session; }
    public List<String> getPodium() { return List.copyOf(podium); }
    public String getPolePositionDriverId() { return polePositionDriverId; }
    public String getDuelDriverPick() { return duelDriverPick; }
    public Integer getSafetyCarCount() { return safetyCarCount; }
    public Integer getDnfCount() { return dnfCount; }
    public Integer getScore() { return score; }
    public Instant getScoredAt() { return scoredAt; }
    public Instant getSubmittedAt() { return submittedAt; }
    public long getVersion() { return version; }
}
