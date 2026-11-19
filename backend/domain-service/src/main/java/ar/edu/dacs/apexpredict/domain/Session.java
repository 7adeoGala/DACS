package ar.edu.dacs.apexpredict.domain;

import jakarta.persistence.*;
import java.time.Instant;
import java.time.LocalDate;

@Entity
@Table(name = "racing_sessions", uniqueConstraints = @UniqueConstraint(columnNames = {"season", "round", "type"}))
public class Session extends BaseEntity {
    public enum Type { RACE, SPRINT, QUALIFYING }
    @Column(nullable = false) private int season;
    @Column(nullable = false) private int round;
    @Enumerated(EnumType.STRING) @Column(nullable = false, length = 16) private Type type;
    @Column(nullable = false, length = 160) private String name;
    @Column(nullable = false, length = 160) private String circuit;
    @Column(nullable = false) private LocalDate raceDate;
    private Instant startsAt;
    protected Session() {}
    public Session(int season, int round, Type type, String name, String circuit, LocalDate raceDate, Instant startsAt) {
        this.season = season; this.round = round; this.type = type; this.name = name;
        this.circuit = circuit; this.raceDate = raceDate; this.startsAt = startsAt;
    }
    public int getSeason() { return season; }
    public int getRound() { return round; }
    public Type getType() { return type; }
    public String getName() { return name; }
    public String getCircuit() { return circuit; }
    public LocalDate getRaceDate() { return raceDate; }
    public Instant getStartsAt() { return startsAt; }
}
