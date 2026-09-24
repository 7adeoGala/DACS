package ar.edu.dacs.apexpredict.domain;

import jakarta.persistence.*;
import java.time.Instant;
import java.util.*;

@Entity
@Table(name = "predictions", uniqueConstraints = @UniqueConstraint(columnNames = {"member_id", "session_id"}))
public class Prediction extends BaseEntity {
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "member_id", nullable = false) private LeagueMember member;
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "session_id", nullable = false) private Session session;
    @ElementCollection
    @CollectionTable(name = "prediction_picks", joinColumns = @JoinColumn(name = "prediction_id"),
        uniqueConstraints = @UniqueConstraint(columnNames = {"prediction_id", "driver_id"}))
    @OrderColumn(name = "position") @Column(name = "driver_id", nullable = false, length = 64)
    private List<String> podium = new ArrayList<>();
    @Column(nullable = false) private Instant submittedAt;
    @Version private long version;
    protected Prediction() {}
    public Prediction(LeagueMember member, Session session, List<String> podium, Instant now) {
        if (podium == null || podium.size() != 3 || new HashSet<>(podium).size() != 3 ||
            podium.stream().anyMatch(id -> id == null || id.isBlank() || id.length() > 64)) {
            throw new IllegalArgumentException("El podio requiere tres pilotos distintos.");
        }
        if (session.getStartsAt() == null || !now.isBefore(session.getStartsAt())) {
            throw new IllegalStateException("La sesion no admite predicciones.");
        }
        this.member = Objects.requireNonNull(member); this.session = session;
        this.podium = new ArrayList<>(podium); this.submittedAt = now;
    }
    public LeagueMember getMember() { return member; }
    public Session getSession() { return session; }
    public List<String> getPodium() { return List.copyOf(podium); }
    public Instant getSubmittedAt() { return submittedAt; }
}
