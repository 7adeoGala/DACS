package ar.edu.dacs.apexpredict.web;

import ar.edu.dacs.apexpredict.application.PredictionService;
import ar.edu.dacs.apexpredict.application.ScoringService;
import com.fasterxml.jackson.annotation.JsonAlias;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Size;
import java.time.Year;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

@RestController
@SuppressWarnings("null")
public class PredictionController {

    private static final Logger log = LoggerFactory.getLogger(PredictionController.class);

    private final PredictionService predictionService;
    private final ScoringService scoringService;

    public PredictionController(PredictionService predictionService, ScoringService scoringService) {
        this.predictionService = predictionService;
        this.scoringService = scoringService;
    }

    @GetMapping("/sessions/next")
    public PredictionService.NextSessionView getNextSession() {
        var next = predictionService.getNextScheduledSession();
        if (next == null) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "No hay carreras futuras programadas.");
        }
        return next;
    }

    @GetMapping("/sessions/next/duel-stats")
    public PredictionService.DuelCommunityStats getNextSessionDuelStats() {
        return predictionService.getNextSessionDuelStats();
    }

    @GetMapping("/predictions/current")
    @PreAuthorize("hasAnyRole('player', 'admin')")
    public PredictionService.PredictionDetailView getCurrentPrediction(@AuthenticationPrincipal Jwt jwt) {
        var next = predictionService.getNextScheduledSession();
        if (next == null) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "No hay carreras futuras programadas.");
        }
        return predictionService.getUserPrediction(jwt.getIssuer().toString(), jwt.getSubject(), next.id());
    }

    @GetMapping("/predictions/history")
    @PreAuthorize("hasAnyRole('player', 'admin')")
    public List<PredictionService.PredictionHistoryItem> getPredictionHistory(@AuthenticationPrincipal Jwt jwt) {
        return predictionService.getUserPredictionHistory(jwt.getIssuer().toString(), jwt.getSubject());
    }

    @GetMapping("/predictions/session/{sessionId}")
    @PreAuthorize("hasAnyRole('player', 'admin')")
    public PredictionService.PredictionDetailView getPredictionForSession(
            @AuthenticationPrincipal Jwt jwt,
            @PathVariable String sessionId) {
        return predictionService.getUserPrediction(jwt.getIssuer().toString(), jwt.getSubject(), sessionId);
    }

    public PredictionService.PredictionDetailView getPredictionForSession(
            Jwt jwt,
            UUID sessionId) {
        return getPredictionForSession(jwt, sessionId.toString());
    }

    @PostMapping("/predictions/session/{sessionId}")
    @PreAuthorize("hasAnyRole('player', 'admin')")
    public PredictionService.PredictionDetailView submitPrediction(
            @AuthenticationPrincipal Jwt jwt,
            @PathVariable String sessionId,
            @Valid @RequestBody SubmitPredictionDto body) {
        try {
            UUID uuid = null;
            try {
                uuid = UUID.fromString(sessionId);
            } catch (IllegalArgumentException ex) {
                log.debug("Identificador de sesión recibido como slug/ronda: {}", sessionId);
            }

            var req = new PredictionService.SubmitPredictionRequest(
                    body.podium(),
                    body.polePositionDriverId(),
                    body.duelDriverPick(),
                    body.safetyCarCount(),
                    body.dnfCount());

            if (uuid != null) {
                return predictionService.saveOrUpdatePrediction(jwt.getIssuer().toString(), jwt.getSubject(), uuid,
                        req);
            } else {
                return predictionService.saveOrUpdatePrediction(jwt.getIssuer().toString(), jwt.getSubject(), sessionId,
                        req);
            }
        } catch (IllegalStateException ex) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, ex.getMessage(), ex);
        } catch (IllegalArgumentException ex) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, ex.getMessage(), ex);
        }
    }

    public PredictionService.PredictionDetailView submitPrediction(
            Jwt jwt,
            UUID sessionId,
            SubmitPredictionDto body) {
        return submitPrediction(jwt, sessionId.toString(), body);
    }

    @GetMapping("/admin/sessions")
    @PreAuthorize("hasRole('admin')")
    public List<PredictionService.AdminSessionView> listAdminSessions() {
        return predictionService.listAdminSessions();
    }

    @PostMapping("/admin/sessions/sync")
    @PreAuthorize("hasRole('admin')")
    public Map<String, Object> syncSessions() {
        int season = Year.now(ZoneOffset.UTC).getValue();
        int sessionsAdded = scoringService.syncSeasonCalendarFromConnector(season);
        int resultsSynced = scoringService.syncAndScoreCompletedSessions();
        return Map.of(
                "season", season,
                "sessionsAdded", sessionsAdded,
                "resultsSynced", resultsSynced,
                "status", "SUCCESS");
    }

    @PostMapping("/admin/sessions/{sessionId}/score")
    @PreAuthorize("hasRole('admin')")
    public List<ScoringService.ScoredPredictionSummary> scoreSession(@PathVariable UUID sessionId) {
        try {
            return scoringService.scoreSession(sessionId);
        } catch (IllegalArgumentException ex) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, ex.getMessage(), ex);
        } catch (IllegalStateException ex) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, ex.getMessage(), ex);
        }
    }

    public record SubmitPredictionDto(
            @Size(max = 3, message = "El podio no puede tener más de 3 pilotos") List<String> podium,

            String polePositionDriverId,
            String duelDriverPick,

            @JsonAlias({ "safetyCars", "safety_cars", "safety_car_count" }) Integer safetyCarCount,

            @JsonAlias({ "dnfs", "dnf_count", "dnfsCount" }) Integer dnfCount) {
    }
}
