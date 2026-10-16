package ar.edu.dacs.apexpredict.client;

import ar.edu.dacs.apexpredict.web.dto.*;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.*;

@FeignClient(
    name = "domainClient",
    url = "${feign.client.config.domainClient.url}",
    configuration = DomainFeignConfig.class
)
public interface DomainClient {

    @GetMapping("/ping")
    Map<String, String> ping();

    @PutMapping("/me")
    Profile me();

    @GetMapping("/leagues")
    List<LeagueView> leagues();

    @PostMapping("/leagues")
    LeagueView createLeague(@RequestBody CreateLeague request);

    @PutMapping("/leagues/{id}")
    LeagueView editLeague(@PathVariable("id") UUID id, @RequestBody EditLeague request);

    @PostMapping("/leagues/join/{inviteCode}")
    LeagueView joinLeague(@PathVariable("inviteCode") UUID inviteCode);

    @GetMapping("/leaderboard/global")
    List<LeaderboardEntry> globalLeaderboard();

    @GetMapping("/leagues/{id}/leaderboard")
    List<LeaderboardEntry> leagueLeaderboard(@PathVariable("id") UUID id);

    @GetMapping("/sessions/next")
    NextSession nextSession();

    @GetMapping("/predictions/current")
    PredictionDetail currentPrediction();

    @GetMapping("/predictions/history")
    List<PredictionHistoryItem> predictionHistory();

    @GetMapping("/predictions/session/{sessionId}")
    PredictionDetail predictionForSession(@PathVariable("sessionId") UUID sessionId);

    @PostMapping("/predictions/session/{sessionId}")
    PredictionDetail submitPrediction(
        @PathVariable("sessionId") UUID sessionId,
        @RequestBody SubmitPrediction request
    );

    @GetMapping("/notifications")
    List<NotificationView> notifications();

    @PostMapping("/admin/notifications/send-reminders/{sessionId}")
    Map<String, Object> sendReminders(@PathVariable("sessionId") UUID sessionId);

    @GetMapping("/admin/status")
    Map<String, String> adminStatus();
}
