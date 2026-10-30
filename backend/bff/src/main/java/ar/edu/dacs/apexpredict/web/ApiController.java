package ar.edu.dacs.apexpredict.web;

import ar.edu.dacs.apexpredict.client.ConectorClient;
import ar.edu.dacs.apexpredict.client.DomainClient;
import ar.edu.dacs.apexpredict.web.dto.*;
import jakarta.validation.Valid;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
public class ApiController {
    private final DomainClient domainClient;
    private final ConectorClient conectorClient;

    public ApiController(DomainClient domainClient, ConectorClient conectorClient) {
        this.domainClient = domainClient;
        this.conectorClient = conectorClient;
    }

    @GetMapping("/ping")
    public Map<String, String> ping() {
        return Map.of("service", "apexpredict-bff", "status", "UP");
    }

    @GetMapping("/backendping")
    public Map<String, String> backendPing() {
        return domainClient.ping();
    }

    @GetMapping("/conectorping")
    public Map<String, String> conectorPing() {
        return conectorClient.ping();
    }

    @GetMapping("/health")
    public Map<String, String> health() {
        return Map.of("service", "apexpredict-bff", "status", "UP");
    }

    @GetMapping("/calendar/{season}")
    public List<Race> calendar(@PathVariable int season) {
        return conectorClient.calendar(season);
    }

    @GetMapping("/results/{season}/{round}")
    public List<Finish> results(@PathVariable int season, @PathVariable int round) {
        return conectorClient.results(season, round);
    }

    @PutMapping("/me")
    @PreAuthorize("hasAnyRole('player', 'admin')")
    public Profile me() {
        return domainClient.me();
    }

    @GetMapping("/me")
    @PreAuthorize("hasAnyRole('player', 'admin')")
    public Profile getProfile() {
        return domainClient.getProfile();
    }

    @RequestMapping(value = "/me/profile", method = {RequestMethod.PATCH, RequestMethod.PUT})
    @PreAuthorize("hasAnyRole('player', 'admin')")
    public Profile updateProfile(@RequestBody UpdateProfileRequest request) {
        return domainClient.updateProfile(request);
    }

    @GetMapping("/users/check-display-name")
    @PreAuthorize("hasAnyRole('player', 'admin')")
    public Map<String, Object> checkDisplayName(@RequestParam("name") String name) {
        return domainClient.checkDisplayName(name);
    }


    // --- Ligas y Leaderboards ---

    @GetMapping("/leagues")
    @PreAuthorize("hasAnyRole('player', 'admin')")
    public List<LeagueView> leagues() {
        return domainClient.leagues();
    }

    @GetMapping("/leagues/search")
    @PreAuthorize("hasAnyRole('player', 'admin')")
    public List<LeagueView> searchLeagues(@RequestParam(value = "query", required = false) String query) {
        return domainClient.searchLeagues(query);
    }

    @PostMapping("/leagues")
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize("hasAnyRole('player', 'admin')")
    public LeagueView createLeague(@Valid @RequestBody CreateLeague request) {
        return domainClient.createLeague(request);
    }

    @PutMapping("/leagues/{id}")
    @PreAuthorize("hasAnyRole('player', 'admin')")
    public LeagueView editLeague(@PathVariable UUID id, @Valid @RequestBody EditLeague request) {
        return domainClient.editLeague(id, request);
    }

    @PostMapping("/leagues/{id}/join")
    @PreAuthorize("hasAnyRole('player', 'admin')")
    public LeagueView joinLeagueById(@PathVariable UUID id, @RequestBody(required = false) JoinLeagueRequest request) {
        return domainClient.joinLeagueById(id, request);
    }

    @PostMapping("/leagues/join/{inviteCode}")
    @PreAuthorize("hasAnyRole('player', 'admin')")
    public LeagueView joinLeague(@PathVariable UUID inviteCode, @RequestBody(required = false) JoinLeagueRequest request) {
        return domainClient.joinLeague(inviteCode, request);
    }

    @GetMapping("/leaderboard/global")
    public List<LeaderboardEntry> globalLeaderboard() {
        return domainClient.globalLeaderboard();
    }

    @GetMapping("/leagues/{id}/leaderboard")
    @PreAuthorize("hasAnyRole('player', 'admin')")
    public List<LeaderboardEntry> leagueLeaderboard(@PathVariable UUID id) {
        return domainClient.leagueLeaderboard(id);
    }

    // --- Predicciones y Lock Time ---

    @GetMapping("/sessions/next")
    public NextSession nextSession() {
        return domainClient.nextSession();
    }

    @GetMapping("/predictions/current")
    @PreAuthorize("hasAnyRole('player', 'admin')")
    public PredictionDetail currentPrediction() {
        return domainClient.currentPrediction();
    }

    @GetMapping("/predictions/history")
    @PreAuthorize("hasAnyRole('player', 'admin')")
    public List<PredictionHistoryItem> predictionHistory() {
        return domainClient.predictionHistory();
    }

    @GetMapping("/predictions/session/{sessionId}")
    @PreAuthorize("hasAnyRole('player', 'admin')")
    public PredictionDetail predictionForSession(@PathVariable String sessionId) {
        return domainClient.predictionForSession(sessionId);
    }

    @PostMapping("/predictions/session/{sessionId}")
    @PreAuthorize("hasAnyRole('player', 'admin')")
    public PredictionDetail submitPrediction(
        @PathVariable String sessionId,
        @Valid @RequestBody SubmitPrediction request
    ) {
        return domainClient.submitPrediction(sessionId, request);
    }

    // --- Notificaciones ---

    @GetMapping("/notifications")
    @PreAuthorize("hasAnyRole('player', 'admin')")
    public List<NotificationView> notifications() {
        return domainClient.notifications();
    }

    @PostMapping("/admin/notifications/send-reminders/{sessionId}")
    @PreAuthorize("hasRole('admin')")
    public Map<String, Object> sendReminders(@PathVariable UUID sessionId) {
        return domainClient.sendReminders(sessionId);
    }

    @GetMapping("/admin/status")
    @PreAuthorize("hasRole('admin')")
    public Map<String, String> adminStatus() {
        return domainClient.adminStatus();
    }
}
