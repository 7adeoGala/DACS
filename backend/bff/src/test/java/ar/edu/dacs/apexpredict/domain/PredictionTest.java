package ar.edu.dacs.apexpredict.domain;

import java.time.*;
import java.util.List;
import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;

class PredictionTest {
    private final Instant start = Instant.parse("2026-11-01T15:00:00Z");
    private Session session(Instant time) { return new Session(2026, 1, Session.Type.RACE, "Race", "Circuit", LocalDate.of(2026, 11, 1), time); }
    private LeagueMember member() {
        var user = new User("issuer", "subject", "Player", null);
        return new LeagueMember(new League("Friends", user), user, LeagueMember.Role.OWNER);
    }
    @Test void preservesPodiumOrder() {
        var prediction = new Prediction(member(), session(start), List.of("norris", "piastri", "leclerc"), start.minusSeconds(1));
        assertEquals(List.of("norris", "piastri", "leclerc"), prediction.getPodium());
    }
    @Test void rejectsDuplicateDrivers() {
        assertThrows(IllegalArgumentException.class, () -> new Prediction(member(), session(start), List.of("norris", "norris", "leclerc"), start.minusSeconds(1)));
    }
    @Test void rejectsAtStartAndWithUnknownStart() {
        assertThrows(IllegalStateException.class, () -> new Prediction(member(), session(start), List.of("a", "b", "c"), start));
        assertThrows(IllegalStateException.class, () -> new Prediction(member(), session(null), List.of("a", "b", "c"), start.minusSeconds(1)));
    }
}
