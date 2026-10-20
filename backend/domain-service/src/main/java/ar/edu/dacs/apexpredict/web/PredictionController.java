package ar.edu.dacs.apexpredict.web;

import ar.edu.dacs.apexpredict.application.PredictionService;
import ar.edu.dacs.apexpredict.application.ScoringService;
import com.fasterxml.jackson.annotation.JsonAlias;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.util.List;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

/**
 * Controlador REST encargado del Dashboard de Predicciones y validación estricta del "Lock Time".
 */
@RestController
@RequestMapping
public class PredictionController {

    private final PredictionService predictionService;
    private final ScoringService scoringService;

    public PredictionController(PredictionService predictionService, ScoringService scoringService) {
        this.predictionService = predictionService;
        this.scoringService = scoringService;
    }

    /**
     * Requerimiento 2.A: Al ingresar a la plataforma, el usuario debe visualizar la siguiente carrera programada.
     */
    @GetMapping("/sessions/next")
    public PredictionService.NextSessionView getNextSession() {
        var next = predictionService.getNextScheduledSession();
        if (next == null) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "No hay carreras futuras programadas.");
        }
        return next;
    }

    /**
     * Consulta el pronóstico del usuario actual para la siguiente carrera programada.
     */
    @GetMapping("/predictions/current")
    @PreAuthorize("hasAnyRole('player', 'admin')")
    public PredictionService.PredictionDetailView getCurrentPrediction(@AuthenticationPrincipal Jwt jwt) {
        var next = predictionService.getNextScheduledSession();
        if (next == null) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "No hay carreras futuras programadas.");
        }
        return predictionService.getUserPrediction(jwt.getIssuer().toString(), jwt.getSubject(), next.id());
    }

    /**
     * Consulta el historial completo de pronósticos y puntuaciones del usuario.
     */
    @GetMapping("/predictions/history")
    @PreAuthorize("hasAnyRole('player', 'admin')")
    public List<PredictionService.PredictionHistoryItem> getPredictionHistory(@AuthenticationPrincipal Jwt jwt) {
        return predictionService.getUserPredictionHistory(jwt.getIssuer().toString(), jwt.getSubject());
    }

    /**
     * Consulta el pronóstico del usuario para una sesión específica.
     */
    @GetMapping("/predictions/session/{sessionId}")
    @PreAuthorize("hasAnyRole('player', 'admin')")
    public PredictionService.PredictionDetailView getPredictionForSession(
        @AuthenticationPrincipal Jwt jwt,
        @PathVariable String sessionId
    ) {
        UUID uuid = null;
        try {
            uuid = UUID.fromString(sessionId);
        } catch (Exception ignored) {}
        if (uuid != null) {
            return predictionService.getUserPrediction(jwt.getIssuer().toString(), jwt.getSubject(), uuid);
        }
        return predictionService.getUserPrediction(jwt.getIssuer().toString(), jwt.getSubject(), sessionId);
    }

    public PredictionService.PredictionDetailView getPredictionForSession(
        Jwt jwt,
        UUID sessionId
    ) {
        return getPredictionForSession(jwt, sessionId.toString());
    }

    /**
     * Requerimiento 2.A y Regla de Negocio (Lock Time):
     * El usuario debe poder cargar y editar sus predicciones a través de un formulario.
     * El sistema debe bloquear cualquier edición o carga de pronósticos exactamente en el horario
     * oficial de inicio de la sesión; no se permiten cambios posteriores.
     */
    @PostMapping("/predictions/session/{sessionId}")
    @PreAuthorize("hasAnyRole('player', 'admin')")
    public PredictionService.PredictionDetailView submitPrediction(
        @AuthenticationPrincipal Jwt jwt,
        @PathVariable String sessionId,
        @Valid @RequestBody SubmitPredictionDto body
    ) {
        try {
            UUID uuid = null;
            try {
                uuid = UUID.fromString(sessionId);
            } catch (Exception ignored) {}

            var req = new PredictionService.SubmitPredictionRequest(
                body.podium(),
                body.polePositionDriverId(),
                body.duelDriverPick(),
                body.safetyCarCount(),
                body.dnfCount()
            );

            if (uuid != null) {
                return predictionService.saveOrUpdatePrediction(jwt.getIssuer().toString(), jwt.getSubject(), uuid, req);
            } else {
                return predictionService.saveOrUpdatePrediction(jwt.getIssuer().toString(), jwt.getSubject(), sessionId, req);
            }
        } catch (IllegalStateException ex) {
            // Error de negocio: Lock Time superado o perfil no creado
            throw new ResponseStatusException(HttpStatus.LOCKED, ex.getMessage(), ex);
        } catch (IllegalArgumentException ex) {
            // Error de validación de datos
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, ex.getMessage(), ex);
        }
    }

    public PredictionService.PredictionDetailView submitPrediction(
        Jwt jwt,
        UUID sessionId,
        SubmitPredictionDto body
    ) {
        return submitPrediction(jwt, sessionId.toString(), body);
    }

    /**
     * Ejecuta el cálculo y asignación de puntos para las predicciones de una sesión concluida.
     */
    @PostMapping("/admin/sessions/{sessionId}/score")
    @PreAuthorize("hasRole('admin')")
    public List<ScoringService.ScoredPredictionSummary> scoreSession(@PathVariable UUID sessionId) {
        return scoringService.scoreSession(sessionId);
    }

    public record SubmitPredictionDto(
        @Size(max = 3, message = "El podio no puede tener más de 3 pilotos")
        List<String> podium,

        String polePositionDriverId,
        String duelDriverPick,

        @JsonAlias({"safetyCars", "safety_cars", "safety_car_count"})
        Integer safetyCarCount,

        @JsonAlias({"dnfs", "dnf_count", "dnfsCount"})
        Integer dnfCount
    ) {}
}
