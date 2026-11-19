package ar.edu.dacs.apexpredict.application;

import ar.edu.dacs.apexpredict.domain.*;
import ar.edu.dacs.apexpredict.infrastructure.persistence.*;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;
import org.springframework.test.util.ReflectionTestUtils;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.when;

class PredictionServiceTest {

    private PredictionRepository predictions;
    private SessionRepository sessions;
    private UserRepository users;
    private WeekendMatchupService matchupService;
    private SessionResultRepository results;
    private ScoringService scoringService;
    private PredictionService predictionService;

    private static final String ISSUER = "https://dacs2026.local/auth/realms/apexpredict";
    private static final String SUBJECT = "user-123";

    @BeforeEach
    void setUp() {
        predictions = Mockito.mock(PredictionRepository.class);
        sessions = Mockito.mock(SessionRepository.class);
        users = Mockito.mock(UserRepository.class);
        matchupService = Mockito.mock(WeekendMatchupService.class);
        results = Mockito.mock(SessionResultRepository.class);
        var matchupRepo = Mockito.mock(WeekendMatchupRepository.class);
        scoringService = new ScoringService(predictions, results, matchupRepo, sessions);
        predictionService = new PredictionService(
            predictions,
            sessions,
            users,
            matchupService,
            results,
            scoringService
        );
    }

    private Session buildSession(UUID id, int round, String name, String circuit, LocalDate date, Instant startsAt) {
        Session s = new Session(2026, round, Session.Type.RACE, name, circuit, date, startsAt);
        ReflectionTestUtils.setField(s, "id", id);
        return s;
    }

    @Test
    @DisplayName("Historial incluye carreras finalizadas desde el inicio de la app aunque el usuario no haya enviado pronóstico (ej. Brasil R20)")
    void historyIncludesFinishedRacesEvenWithoutUserPredictions() {
        UUID r18Id = UUID.randomUUID();
        UUID r19Id = UUID.randomUUID();
        UUID r20Id = UUID.randomUUID();
        UUID r21Id = UUID.randomUUID();

        Session r18 = buildSession(r18Id, 18, "United States Grand Prix", "Circuit of the Americas",
            LocalDate.of(2026, 10, 25), Instant.now().minusSeconds(86400 * 17));
        Session r19 = buildSession(r19Id, 19, "Mexico City Grand Prix", "Autódromo Hermanos Rodríguez",
            LocalDate.of(2026, 11, 1), Instant.now().minusSeconds(86400 * 10));
        Session r20Brazil = buildSession(r20Id, 20, "São Paulo Grand Prix", "Autódromo José Carlos Pace (Interlagos)",
            LocalDate.of(2026, 11, 8), Instant.now().minusSeconds(86400 * 3));
        Session r21Future = buildSession(r21Id, 21, "Las Vegas Grand Prix", "Las Vegas Strip Circuit",
            LocalDate.of(2026, 11, 22), Instant.now().plusSeconds(86400 * 11));

        when(sessions.findAll()).thenReturn(List.of(r18, r19, r20Brazil, r21Future));
        when(users.findByIssuerAndSubject(ISSUER, SUBJECT)).thenReturn(Optional.empty());

        SessionResult r20Result = new SessionResult(
            r20Brazil,
            List.of("norris", "verstappen", "hadjar"),
            "norris",
            0,
            2,
            "lawson",
            Instant.now().minusSeconds(86400 * 2)
        );
        WeekendMatchup r20Matchup = new WeekendMatchup(r20Brazil, "lawson", "lindblad");

        when(results.findBySessionId(r20Id)).thenReturn(Optional.of(r20Result));
        when(matchupService.findForSession(r20Id)).thenReturn(Optional.of(r20Matchup));
        when(results.findBySessionId(r18Id)).thenReturn(Optional.empty());
        when(results.findBySessionId(r19Id)).thenReturn(Optional.empty());
        when(results.findBySessionId(r21Id)).thenReturn(Optional.empty());

        List<PredictionService.PredictionHistoryItem> history = predictionService.getUserPredictionHistory(ISSUER, SUBJECT);

        assertEquals(3, history.size(), "Debe incluir R20 Brasil, R19 México y R18 USA, omitiendo R21 futura sin predicción");
        assertEquals(r20Id, history.get(0).sessionId());
        assertEquals("São Paulo Grand Prix", history.get(0).sessionName());
        assertNull(history.get(0).predictionId());
        assertNull(history.get(0).score());
        assertNotNull(history.get(0).officialResults());
        assertEquals(List.of("norris", "verstappen", "hadjar"), history.get(0).officialResults().podium());
        assertEquals("lawson", history.get(0).matchupDriver1());
        assertEquals("lindblad", history.get(0).matchupDriver2());
    }

    @Test
    @DisplayName("Historial combina carreras con pronóstico puntuado y carreras sin pronóstico ordenadas de más reciente a más antigua")
    void historyCombinesPredictedAndUnpredictedRacesOrderedByMostRecent() {
        UUID r19Id = UUID.randomUUID();
        UUID r20Id = UUID.randomUUID();
        UUID pred19Id = UUID.randomUUID();

        User user = new User(ISSUER, SUBJECT, "Tadeo", "tadeo@example.com");
        ReflectionTestUtils.setField(user, "id", UUID.randomUUID());

        Session r19Mexico = buildSession(r19Id, 19, "Mexico City Grand Prix", "Autódromo Hermanos Rodríguez",
            LocalDate.of(2026, 11, 1), Instant.now().minusSeconds(86400 * 10));
        Session r20Brazil = buildSession(r20Id, 20, "São Paulo Grand Prix", "Autódromo José Carlos Pace (Interlagos)",
            LocalDate.of(2026, 11, 8), Instant.now().minusSeconds(86400 * 3));

        Prediction p19 = new Prediction(
            user,
            r19Mexico,
            List.of("verstappen", "hamilton", "leclerc"),
            "hamilton",
            "leclerc",
            3,
            1,
            Instant.now().minusSeconds(86400 * 11)
        );
        ReflectionTestUtils.setField(p19, "id", pred19Id);

        SessionResult r19Result = new SessionResult(
            r19Mexico,
            List.of("verstappen", "hamilton", "antonelli"),
            "hamilton",
            3,
            5,
            "leclerc",
            Instant.now().minusSeconds(86400 * 9)
        );
        SessionResult r20Result = new SessionResult(
            r20Brazil,
            List.of("norris", "verstappen", "hadjar"),
            "norris",
            0,
            2,
            "lawson",
            Instant.now().minusSeconds(86400 * 2)
        );

        when(users.findByIssuerAndSubject(ISSUER, SUBJECT)).thenReturn(Optional.of(user));
        when(predictions.findByUserOrderBySubmittedAtDesc(user)).thenReturn(List.of(p19));
        when(sessions.findAll()).thenReturn(List.of(r19Mexico, r20Brazil));
        when(results.findBySessionId(r19Id)).thenReturn(Optional.of(r19Result));
        when(results.findBySessionId(r20Id)).thenReturn(Optional.of(r20Result));
        when(matchupService.findForSession(r19Id)).thenReturn(Optional.of(new WeekendMatchup(r19Mexico, "norris", "leclerc")));
        when(matchupService.findForSession(r20Id)).thenReturn(Optional.of(new WeekendMatchup(r20Brazil, "lawson", "lindblad")));

        List<PredictionService.PredictionHistoryItem> history = predictionService.getUserPredictionHistory(ISSUER, SUBJECT);

        assertEquals(2, history.size());
        assertEquals(r20Id, history.get(0).sessionId());
        assertNull(history.get(0).predictionId());
        assertTrue(history.get(0).podium().isEmpty());
        assertNotNull(history.get(0).officialResults());

        assertEquals(r19Id, history.get(1).sessionId());
        assertEquals(pred19Id, history.get(1).predictionId());
        assertEquals(20, history.get(1).score());
        assertNotNull(history.get(1).scoreBreakdown());
    }
}

