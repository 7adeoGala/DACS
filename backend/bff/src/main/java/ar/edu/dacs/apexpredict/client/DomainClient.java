package ar.edu.dacs.apexpredict.client;

import ar.edu.dacs.apexpredict.web.dto.*;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.*;

@FeignClient(
    name = "domainClient",
    url = "${DOMAIN_SERVICE_URL:https://dacs-f0st.onrender.com/backend}",
    configuration = DomainFeignConfig.class
)
public interface DomainClient {

    @GetMapping("/ping")
    Map<String, String> ping();

    @PutMapping("/me")
    Profile me();

    @GetMapping("/me")
    Profile getProfile();

    @PutMapping("/me/profile")
    Profile updateProfile(@RequestBody UpdateProfileRequest request);

    @GetMapping("/users/check-display-name")
    Map<String, Object> checkDisplayName(@RequestParam("name") String name);


    @GetMapping("/leagues")
    List<LeagueView> leagues();

    @GetMapping("/leagues/search")
    List<LeagueView> searchLeagues(@RequestParam(value = "query", required = false) String query);

    @PostMapping("/leagues")
    LeagueView createLeague(@RequestBody CreateLeague request);

    @PutMapping("/leagues/{id}")
    LeagueView editLeague(@PathVariable("id") UUID id, @RequestBody EditLeague request);

    @PostMapping("/leagues/{id}/join")
    LeagueView joinLeagueById(@PathVariable("id") UUID id, @RequestBody(required = false) JoinLeagueRequest request);

    @PostMapping("/leagues/join/{inviteCode}")
    LeagueView joinLeague(@PathVariable("inviteCode") UUID inviteCode, @RequestBody(required = false) JoinLeagueRequest request);

    @GetMapping("/leaderboard/global")
    List<LeaderboardEntry> globalLeaderboard();

    @GetMapping("/leagues/{id}/leaderboard")
    List<LeaderboardEntry> leagueLeaderboard(@PathVariable("id") UUID id);

    @GetMapping("/sessions/next")
    NextSession nextSession();

    @GetMapping("/sessions/next/duel-stats")
    DuelCommunityStats nextSessionDuelStats();

    @GetMapping("/predictions/current")
    PredictionDetail currentPrediction();

    @GetMapping("/predictions/history")
    List<PredictionHistoryItem> predictionHistory();

    @GetMapping("/predictions/session/{sessionId}")
    PredictionDetail predictionForSession(@PathVariable("sessionId") String sessionId);

    @PostMapping("/predictions/session/{sessionId}")
    PredictionDetail submitPrediction(
        @PathVariable("sessionId") String sessionId,
        @RequestBody SubmitPrediction request
    );

    @GetMapping("/notifications")
    List<NotificationView> notifications();

    @PostMapping("/admin/notifications/send-reminders/{sessionId}")
    Map<String, Object> sendReminders(@PathVariable("sessionId") UUID sessionId);

    @GetMapping("/admin/sessions")
    List<AdminSessionView> adminSessions();

    @PostMapping("/admin/sessions/sync")
    Map<String, Object> syncSessions();

    @PostMapping("/admin/sessions/{sessionId}/score")
    List<ScoredPredictionSummary> scoreSession(@PathVariable("sessionId") UUID sessionId);

    @GetMapping("/admin/status")
    Map<String, String> adminStatus();
}
