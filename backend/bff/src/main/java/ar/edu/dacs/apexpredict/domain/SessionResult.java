package ar.edu.dacs.apexpredict.domain;

import jakarta.persistence.*;
import java.time.Instant;
import java.util.*;

@Entity
@Table(name = "session_results")
public class SessionResult extends BaseEntity {
    @OneToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "session_id", nullable = false, unique = true) private Session session;
    @ElementCollection
    @CollectionTable(name = "result_finishers", joinColumns = @JoinColumn(name = "result_id"),
        uniqueConstraints = @UniqueConstraint(columnNames = {"result_id", "driver_id"}))
    @OrderColumn(name = "position") @Column(name = "driver_id", nullable = false, length = 64)
    private List<String> classification = new ArrayList<>();
    @Column(nullable = false) private Instant publishedAt;
    protected SessionResult() {}
    public SessionResult(Session session, List<String> classification, Instant publishedAt) {
        if (classification == null || classification.isEmpty() ||
            classification.stream().anyMatch(id -> id == null || id.isBlank() || id.length() > 64) ||
            new HashSet<>(classification).size() != classification.size()) {
            throw new IllegalArgumentException("La clasificacion requiere pilotos distintos.");
        }
        this.session = Objects.requireNonNull(session); this.classification = new ArrayList<>(classification);
        this.publishedAt = Objects.requireNonNull(publishedAt);
    }
    public Session getSession() { return session; }
    public List<String> getClassification() { return List.copyOf(classification); }
    public Instant getPublishedAt() { return publishedAt; }
}
