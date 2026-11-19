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
    @Column(name = "driver_id", length = 64)
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

    public Prediction(LeagueMember member, Session session, List<String> podium, Instant now) {
        validateLockTime(session, now);
        validatePodium(podium);
        this.member = Objects.requireNonNull(member);
        this.user = member.getUser();
        this.session = Objects.requireNonNull(session);
        this.podium = normalizePodium(podium);
        this.submittedAt = Objects.requireNonNull(now);
    }

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
        this.podium = normalizePodium(podium);
        this.polePositionDriverId = polePositionDriverId != null && !polePositionDriverId.isBlank() ? polePositionDriverId.trim() : null;
        this.duelDriverPick = duelDriverPick != null && !duelDriverPick.isBlank() ? duelDriverPick.trim() : null;
        this.safetyCarCount = safetyCarCount;
        this.dnfCount = dnfCount;
        this.submittedAt = Objects.requireNonNull(now);
    }

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
        this.podium.addAll(normalizePodium(podium));
        this.polePositionDriverId = polePositionDriverId != null && !polePositionDriverId.isBlank() ? polePositionDriverId.trim() : null;
        this.duelDriverPick = duelDriverPick != null && !duelDriverPick.isBlank() ? duelDriverPick.trim() : null;
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
        if (podium == null) return;
        if (podium.size() > 3) {
            throw new IllegalArgumentException("El podio no puede tener más de tres posiciones.");
        }
        List<String> nonBlankDrivers = podium.stream()
            .filter(id -> id != null && !id.isBlank())
            .toList();
        if (new HashSet<>(nonBlankDrivers).size() != nonBlankDrivers.size()) {
            throw new IllegalArgumentException("El podio requiere pilotos distintos.");
        }
        for (String id : nonBlankDrivers) {
            if (id.length() > 64) {
                throw new IllegalArgumentException("El identificador del piloto es demasiado largo.");
            }
        }
    }

    private static List<String> normalizePodium(List<String> podium) {
        if (podium == null || podium.stream().allMatch(s -> s == null || s.isBlank())) {
            return new ArrayList<>();
        }
        return new ArrayList<>(podium.stream().map(s -> s == null ? "" : s.trim()).toList());
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
