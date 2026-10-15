package ar.edu.dacs.apexpredict.web;

import ar.edu.dacs.apexpredict.application.PredictionService;
import ar.edu.dacs.apexpredict.application.ScoringService;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.server.ResponseStatusException;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.when;

class PredictionControllerTest {

    private PredictionService predictionService;
    private ScoringService scoringService;
    private PredictionController controller;
    private Jwt jwt;

    @BeforeEach
    void setUp() {
        predictionService = Mockito.mock(PredictionService.class);
        scoringService = Mockito.mock(ScoringService.class);
        controller = new PredictionController(predictionService, scoringService);

        jwt = Mockito.mock(Jwt.class);
        when(jwt.getIssuer()).thenReturn(java.net.URI.create("https://dacs2026.local/auth/realms/apexpredict").toURL());
        when(jwt.getSubject()).thenReturn("player-123");
    }

    @Test
    @DisplayName("Lock Time: Permite guardar predicción cuando la sesión no ha comenzado")
    void allowsPredictionBeforeLockTime() {
        UUID sessionId = UUID.randomUUID();
        var request = new PredictionController.SubmitPredictionDto(
            List.of("norris", "piastri", "leclerc"),
            "norris",
            "norris",
            1,
            2
        );

        when(predictionService.saveOrUpdatePrediction(anyString(), anyString(), eq(sessionId), any()))
            .thenReturn(new PredictionService.PredictionDetailView(
                UUID.randomUUID(), sessionId, "US GP", "COTA",
                Instant.now().plusSeconds(3600), false,
                request.podium(), request.polePositionDriverId(), request.duelDriverPick(),
                request.safetyCarCount(), request.dnfCount(), null, Instant.now(),
                "norris", "russell"
            ));

        var response = controller.submitPrediction(jwt, sessionId, request);
        assertNotNull(response);
        assertEquals(sessionId, response.sessionId());
        assertEquals("norris", response.polePositionDriverId());
    }

    @Test
    @DisplayName("Lock Time: Bloquea estrictamente cualquier edición o carga una vez superado el horario de inicio")
    void rejectsPredictionAfterLockTime() {
        UUID sessionId = UUID.randomUUID();
        var request = new PredictionController.SubmitPredictionDto(
            List.of("norris", "piastri", "leclerc"),
            "norris",
            "norris",
            1,
            2
        );

        when(predictionService.saveOrUpdatePrediction(anyString(), anyString(), eq(sessionId), any()))
            .thenThrow(new IllegalStateException("Lock Time superado: No se permiten cambios ni cargas de pronósticos una vez iniciada la sesión."));

        ResponseStatusException ex = assertThrows(
            ResponseStatusException.class,
            () -> controller.submitPrediction(jwt, sessionId, request)
        );

        assertEquals(423, ex.getStatusCode().value());
        assertTrue(ex.getReason().contains("Lock Time"));
    }
}
