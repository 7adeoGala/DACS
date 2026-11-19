package ar.edu.dacs.apexpredict.application;

import ar.edu.dacs.apexpredict.domain.*;
import ar.edu.dacs.apexpredict.infrastructure.persistence.*;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;

import static org.junit.jupiter.api.Assertions.*;

class ScoringServiceTest {

    private ScoringService scoringService;
    private Session session;
    private User user;
    private Instant now;
    private Instant futureStart;

    @BeforeEach
    void setUp() {
        var predictions = Mockito.mock(PredictionRepository.class);
        var results = Mockito.mock(SessionResultRepository.class);
        var matchups = Mockito.mock(WeekendMatchupRepository.class);
        var sessions = Mockito.mock(SessionRepository.class);

        scoringService = new ScoringService(predictions, results, matchups, sessions);

        now = Instant.parse("2026-10-14T12:00:00Z");
        futureStart = Instant.parse("2026-10-18T14:00:00Z");

        session = new Session(2026, 19, Session.Type.RACE, "United States Grand Prix", "Circuit of the Americas", LocalDate.of(2026, 10, 18), futureStart);
        user = new User("https://dacs2026.local/auth/realms/apexpredict", "sub-123", "MaxFan", "max@example.com");
    }

    @Test
    @DisplayName("Puntuación perfecta: 10 (podio) + 4 (pole) + 3 (duelo) + 6 (SC) + 6 (DNF) = 29 puntos")
    void perfectPredictionScores29Points() {
        var prediction = new Prediction(
            user, session,
            List.of("norris", "verstappen", "leclerc"),
            "norris",
            "norris",
            2,
            3,
            now
        );

        var result = new SessionResult(
            session,
            List.of("norris", "verstappen", "leclerc", "piastri", "hamilton"),
            "norris",
            2,
            3,
            "norris",
            futureStart.plusSeconds(7200)
        );

        var matchup = new WeekendMatchup(session, "norris", "russell");

        var breakdown = scoringService.calculateScore(prediction, result, matchup);

        assertEquals(3, breakdown.podiumHits());
        assertEquals(10, breakdown.podiumPoints());
        assertTrue(breakdown.poleHit());
        assertEquals(4, breakdown.polePoints());
        assertTrue(breakdown.duelHit());
        assertEquals(3, breakdown.duelPoints());
        assertTrue(breakdown.safetyCarHit());
        assertEquals(6, breakdown.safetyCarPoints());
        assertTrue(breakdown.dnfHit());
        assertEquals(6, breakdown.dnfPoints());
        assertEquals(29, breakdown.totalPoints());
    }

    @Test
    @DisplayName("Reglas de Podio: 1 acierto -> 3 pts, 2 aciertos -> 7 pts, 3 aciertos -> 10 pts, 0 -> 0")
    void podiumScoringThresholds() {
        var result = new SessionResult(
            session,
            List.of("norris", "verstappen", "leclerc"),
            "russell",
            0,
            0,
            "russell",
            futureStart.plusSeconds(7200)
        );
        var matchup = new WeekendMatchup(session, "alonso", "russell");

        var pred1 = new Prediction(user, session, List.of("norris", "hamilton", "sainz"), null, null, null, null, now);
        var b1 = scoringService.calculateScore(pred1, result, matchup);
        assertEquals(1, b1.podiumHits());
        assertEquals(3, b1.podiumPoints());

        var pred2 = new Prediction(user, session, List.of("norris", "verstappen", "sainz"), null, null, null, null, now);
        var b2 = scoringService.calculateScore(pred2, result, matchup);
        assertEquals(2, b2.podiumHits());
        assertEquals(7, b2.podiumPoints());

        var pred3 = new Prediction(user, session, List.of("norris", "verstappen", "leclerc"), null, null, null, null, now);
        var b3 = scoringService.calculateScore(pred3, result, matchup);
        assertEquals(3, b3.podiumHits());
        assertEquals(10, b3.podiumPoints());

        var pred0 = new Prediction(user, session, List.of("piastri", "russell", "hamilton"), null, null, null, null, now);
        var b0 = scoringService.calculateScore(pred0, result, matchup);
        assertEquals(0, b0.podiumHits());
        assertEquals(0, b0.podiumPoints());
    }

    @Test
    @DisplayName("Pole Position: 4 puntos si acierta")
    void polePositionScoring() {
        var result = new SessionResult(session, List.of("a", "b", "c"), "leclerc", 0, 0, null, futureStart.plusSeconds(7200));

        var predHit = new Prediction(user, session, List.of("x", "y", "z"), "leclerc", null, null, null, now);
        assertEquals(4, scoringService.calculateScore(predHit, result, null).polePoints());

        var predMiss = new Prediction(user, session, List.of("x", "y", "z"), "verstappen", null, null, null, now);
        assertEquals(0, scoringService.calculateScore(predMiss, result, null).polePoints());
    }

    @Test
    @DisplayName("Duelo de pilotos: 3 puntos si acierta el ganador")
    void driverDuelScoring() {
        var matchup = new WeekendMatchup(session, "piastri", "sainz");
        var result = new SessionResult(
            session,
            List.of("norris", "piastri", "verstappen", "leclerc", "hamilton", "sainz"),
            "norris", 0, 0, null, futureStart.plusSeconds(7200)
        );

        var predPiastri = new Prediction(user, session, List.of("x", "y", "z"), null, "piastri", null, null, now);
        assertEquals(3, scoringService.calculateScore(predPiastri, result, matchup).duelPoints());

        var predSainz = new Prediction(user, session, List.of("x", "y", "z"), null, "sainz", null, null, now);
        assertEquals(0, scoringService.calculateScore(predSainz, result, matchup).duelPoints());
    }

    @Test
    @DisplayName("Autos de seguridad (6 pts) y abandonos (6 pts) si la cantidad es exacta")
    void safetyCarsAndDnfsScoring() {
        var result = new SessionResult(session, List.of("a", "b", "c"), null, 1, 4, null, futureStart.plusSeconds(7200));

        var pred = new Prediction(user, session, List.of("x", "y", "z"), null, null, 1, 2, now);
        var b = scoringService.calculateScore(pred, result, null);

        assertTrue(b.safetyCarHit());
        assertEquals(6, b.safetyCarPoints());
        assertFalse(b.dnfHit());
        assertEquals(0, b.dnfPoints());
    }

    @Test
    @DisplayName("Normaliza identificadores de pilotos Jolpica (max_verstappen, arvid_lindblad) y puntúa Round 19/20")
    void normalizesExternalDriverIdsWhenScoring() {
        var pred = new Prediction(
            user, session,
            List.of("verstappen", "hamilton", "antonelli"),
            "hamilton",
            "lindblad",
            3,
            5,
            now
        );

        var result = new SessionResult(
            session,
            List.of("max_verstappen", "hamilton", "antonelli", "leclerc", "norris"),
            "hamilton",
            3,
            5,
            "arvid_lindblad",
            futureStart.plusSeconds(7200)
        );

        var matchup = new WeekendMatchup(session, "lawson", "lindblad");
        var b = scoringService.calculateScore(pred, result, matchup);

        assertEquals(3, b.podiumHits());
        assertEquals(10, b.podiumPoints());
        assertTrue(b.poleHit());
        assertEquals(4, b.polePoints());
        assertTrue(b.duelHit());
        assertEquals(3, b.duelPoints());
        assertTrue(b.safetyCarHit());
        assertTrue(b.dnfHit());
        assertEquals(29, b.totalPoints());
    }
}
