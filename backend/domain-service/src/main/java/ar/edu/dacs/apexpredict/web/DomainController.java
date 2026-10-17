package ar.edu.dacs.apexpredict.web;

import ar.edu.dacs.apexpredict.application.NotificationService;
import ar.edu.dacs.apexpredict.application.PlayerService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

@RestController
public class DomainController {
    private final PlayerService players;
    private final NotificationService notifications;

    public DomainController(PlayerService players, NotificationService notifications) {
        this.players = players;
        this.notifications = notifications;
    }

    @GetMapping("/ping")
    public Map<String, String> ping() {
        return Map.of("service", "apexpredict-domain-service", "status", "UP");
    }

    @PutMapping("/me")
    @PreAuthorize("hasAnyRole('player', 'admin')")
    public PlayerService.Profile me(@AuthenticationPrincipal Jwt jwt) {
        String name = jwt.getClaimAsString("preferred_username");
        return players.provision(
            jwt.getIssuer().toString(),
            jwt.getSubject(),
            name == null ? jwt.getSubject() : name,
            jwt.getClaimAsString("email")
        );
    }

    @GetMapping("/leagues")
    @PreAuthorize("hasAnyRole('player', 'admin')")
    public List<PlayerService.LeagueView> leagues(@AuthenticationPrincipal Jwt jwt) {
        return players.leagues(jwt.getIssuer().toString(), jwt.getSubject());
    }

    @GetMapping("/leagues/search")
    @PreAuthorize("hasAnyRole('player', 'admin')")
    public List<PlayerService.LeagueView> searchLeagues(
        @AuthenticationPrincipal Jwt jwt,
        @RequestParam(value = "query", required = false) String query
    ) {
        return players.searchLeagues(jwt.getIssuer().toString(), jwt.getSubject(), query);
    }

    @PostMapping("/leagues")
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize("hasAnyRole('player', 'admin')")
    public PlayerService.LeagueView createLeague(@AuthenticationPrincipal Jwt jwt, @Valid @RequestBody CreateLeague request) {
        return players.createLeague(jwt.getIssuer().toString(), jwt.getSubject(), request.name(), request.description(), request.password());
    }

    /**
     * Requerimiento 2.B: Las ligas privadas deben ser editables.
     */
    @PutMapping("/leagues/{id}")
    @PreAuthorize("hasAnyRole('player', 'admin')")
    public PlayerService.LeagueView editLeague(
        @AuthenticationPrincipal Jwt jwt,
        @PathVariable UUID id,
        @Valid @RequestBody EditLeague request
    ) {
        try {
            return players.editLeague(jwt.getIssuer().toString(), jwt.getSubject(), id, request.name(), request.description(), request.password());
        } catch (IllegalStateException ex) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, ex.getMessage(), ex);
        } catch (IllegalArgumentException ex) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, ex.getMessage(), ex);
        }
    }

    /**
     * Unirse a una liga privada mediante su ID y contraseña (si la tiene).
     */
    @PostMapping("/leagues/{id}/join")
    @PreAuthorize("hasAnyRole('player', 'admin')")
    public PlayerService.LeagueView joinLeagueById(
        @AuthenticationPrincipal Jwt jwt,
        @PathVariable UUID id,
        @RequestBody(required = false) JoinLeagueRequest request
    ) {
        try {
            String pwd = request != null ? request.password() : null;
            return players.joinLeague(jwt.getIssuer().toString(), jwt.getSubject(), id, pwd);
        } catch (IllegalArgumentException ex) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, ex.getMessage(), ex);
        }
    }

    /**
     * Requerimiento 2.B: Funcionalidad de unirse a ligas privadas mediante un link/código de invitación.
     */
    @PostMapping("/leagues/join/{inviteCode}")
    @PreAuthorize("hasAnyRole('player', 'admin')")
    public PlayerService.LeagueView joinLeague(
        @AuthenticationPrincipal Jwt jwt,
        @PathVariable UUID inviteCode,
        @RequestBody(required = false) JoinLeagueRequest request
    ) {
        try {
            String pwd = request != null ? request.password() : null;
            return players.joinLeagueByInviteCode(jwt.getIssuer().toString(), jwt.getSubject(), inviteCode, pwd);
        } catch (IllegalArgumentException ex) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, ex.getMessage(), ex);
        }
    }

    /**
     * Requerimiento 2.B: Tabla de posiciones global acumulada en tiempo real.
     */
    @GetMapping("/leaderboard/global")
    public List<PlayerService.LeaderboardEntry> globalLeaderboard() {
        return players.getGlobalLeaderboard();
    }

    /**
     * Requerimiento 2.B: Tabla de posiciones de una liga privada acumulada en tiempo real.
     */
    @GetMapping("/leagues/{id}/leaderboard")
    @PreAuthorize("hasAnyRole('player', 'admin')")
    public List<PlayerService.LeaderboardEntry> leagueLeaderboard(@PathVariable UUID id) {
        try {
            return players.getLeagueLeaderboard(id);
        } catch (IllegalArgumentException ex) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, ex.getMessage(), ex);
        }
    }

    /**
     * Requerimiento 2.D: Consultar notificaciones recibidas por el usuario.
     */
    @GetMapping("/notifications")
    @PreAuthorize("hasAnyRole('player', 'admin')")
    public List<NotificationService.NotificationDto> notifications(@AuthenticationPrincipal Jwt jwt) {
        return notifications.getUserNotifications(jwt.getIssuer().toString(), jwt.getSubject());
    }

    /**
     * Requerimiento 2.D: Disparar recordatorios para una sesión (Mock / Test).
     */
    @PostMapping("/admin/notifications/send-reminders/{sessionId}")
    @PreAuthorize("hasRole('admin')")
    public Map<String, Object> sendReminders(@PathVariable UUID sessionId) {
        int sent = notifications.dispatchRemindersForUpcomingSession(sessionId);
        return Map.of("sessionId", sessionId, "remindersSent", sent, "status", "SUCCESS");
    }

    @GetMapping("/admin/status")
    @PreAuthorize("hasRole('admin')")
    public Map<String, String> adminStatus() {
        return Map.of("status", "authorized");
    }

    public record CreateLeague(
        @NotBlank @Size(max = 100) String name,
        @Size(max = 255) String description,
        @Size(max = 100) String password
    ) {
        public CreateLeague(String name, String description) {
            this(name, description, null);
        }
    }

    public record EditLeague(
        @NotBlank @Size(max = 100) String name,
        @Size(max = 255) String description,
        @Size(max = 100) String password
    ) {
        public EditLeague(String name, String description) {
            this(name, description, null);
        }
    }

    public record JoinLeagueRequest(
        @Size(max = 100) String password
    ) {}
}
