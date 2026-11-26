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

    @GetMapping("/me")
    @PreAuthorize("hasAnyRole('player', 'admin')")
    public PlayerService.Profile getProfile(@AuthenticationPrincipal Jwt jwt) {
        String name = jwt.getClaimAsString("preferred_username");
        String email = jwt.getClaimAsString("email");
        return players.getOrProvisionProfile(
            jwt.getIssuer().toString(),
            jwt.getSubject(),
            name != null ? name : jwt.getSubject(),
            email
        );
    }

    @RequestMapping(value = "/me/profile", method = {RequestMethod.PATCH, RequestMethod.PUT})
    @PreAuthorize("hasAnyRole('player', 'admin')")
    public PlayerService.Profile updateProfile(
        @AuthenticationPrincipal Jwt jwt,
        @Valid @RequestBody PlayerService.UpdateProfileRequest request
    ) {
        return players.updateProfile(jwt.getIssuer().toString(), jwt.getSubject(), request);
    }

    @PutMapping("/me/password")
    @PreAuthorize("hasAnyRole('player', 'admin')")
    public Map<String, String> changePassword(
        @AuthenticationPrincipal Jwt jwt,
        @Valid @RequestBody ChangePasswordRequest request
    ) {
        String username = jwt.getClaimAsString("preferred_username");
        players.changePassword(
            jwt.getIssuer().toString(),
            jwt.getSubject(),
            username,
            request.currentPassword(),
            request.newPassword()
        );
        return Map.of("status", "SUCCESS", "message", "Contraseña actualizada correctamente.");
    }

    @GetMapping("/users/check-display-name")
    @PreAuthorize("hasAnyRole('player', 'admin')")
    public Map<String, Object> checkDisplayName(
        @AuthenticationPrincipal Jwt jwt,
        @RequestParam("name") String name
    ) {
        boolean available = players.isDisplayNameAvailable(jwt.getIssuer().toString(), jwt.getSubject(), name);
        return Map.of("available", available, "name", name != null ? name : "");
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

    @GetMapping("/leaderboard/global")
    public List<PlayerService.LeaderboardEntry> globalLeaderboard() {
        return players.getGlobalLeaderboard();
    }

    @GetMapping("/leagues/{id}/leaderboard")
    @PreAuthorize("hasAnyRole('player', 'admin')")
    public List<PlayerService.LeaderboardEntry> leagueLeaderboard(@PathVariable UUID id) {
        try {
            return players.getLeagueLeaderboard(id);
        } catch (IllegalArgumentException ex) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, ex.getMessage(), ex);
        }
    }

    @GetMapping("/notifications")
    @PreAuthorize("hasAnyRole('player', 'admin')")
    public List<NotificationService.NotificationDto> notifications(@AuthenticationPrincipal Jwt jwt) {
        return notifications.getUserNotifications(jwt.getIssuer().toString(), jwt.getSubject());
    }

    @PutMapping("/notifications/{id}/read")
    @PreAuthorize("hasAnyRole('player', 'admin')")
    public NotificationService.NotificationDto markNotificationAsRead(
        @AuthenticationPrincipal Jwt jwt,
        @PathVariable UUID id
    ) {
        try {
            return notifications.markAsRead(jwt.getIssuer().toString(), jwt.getSubject(), id);
        } catch (IllegalArgumentException ex) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, ex.getMessage(), ex);
        }
    }

    @PutMapping("/notifications/read-all")
    @PreAuthorize("hasAnyRole('player', 'admin')")
    public Map<String, Object> markAllNotificationsAsRead(@AuthenticationPrincipal Jwt jwt) {
        int updated = notifications.markAllAsRead(jwt.getIssuer().toString(), jwt.getSubject());
        return Map.of("updated", updated, "status", "SUCCESS");
    }

    @DeleteMapping("/notifications/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @PreAuthorize("hasAnyRole('player', 'admin')")
    public void dismissNotification(
        @AuthenticationPrincipal Jwt jwt,
        @PathVariable UUID id
    ) {
        try {
            notifications.dismissNotification(jwt.getIssuer().toString(), jwt.getSubject(), id);
        } catch (IllegalArgumentException ex) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, ex.getMessage(), ex);
        }
    }

    @DeleteMapping("/notifications")
    @PreAuthorize("hasAnyRole('player', 'admin')")
    public Map<String, Object> dismissAllNotifications(@AuthenticationPrincipal Jwt jwt) {
        int dismissed = notifications.dismissAllNotifications(jwt.getIssuer().toString(), jwt.getSubject());
        return Map.of("dismissed", dismissed, "status", "SUCCESS");
    }

    @PostMapping("/admin/notifications/send-reminders/{sessionId}")
    @PreAuthorize("hasRole('admin')")
    public Map<String, Object> sendReminders(@PathVariable UUID sessionId) {
        int sent = notifications.dispatchRemindersForUpcomingSession(sessionId);
        return Map.of("sessionId", sessionId, "remindersSent", sent, "status", "SUCCESS");
    }

    @GetMapping("/admin/users")
    @PreAuthorize("hasRole('admin')")
    public List<PlayerService.Profile> adminUsers() {
        return players.listAllUsersForAdmin();
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

    public record ChangePasswordRequest(
        @NotBlank @Size(max = 128) String currentPassword,
        @NotBlank @Size(min = 6, max = 128) String newPassword
    ) {}
}
