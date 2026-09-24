package ar.edu.dacs.apexpredict.web;

import ar.edu.dacs.apexpredict.application.*;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import java.util.*;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;

@RestController
public class ApiController {
    private final F1DataProvider f1;
    private final PlayerService players;
    public ApiController(F1DataProvider f1, PlayerService players) { this.f1 = f1; this.players = players; }
    @GetMapping("/health")
    public Map<String, String> health() { return Map.of("service", "apexpredict-bff", "status", "UP"); }
    @GetMapping("/calendar/{season}")
    public List<F1DataProvider.Race> calendar(@PathVariable int season) { return f1.calendar(season); }
    @GetMapping("/results/{season}/{round}")
    public List<F1DataProvider.Finish> results(@PathVariable int season, @PathVariable int round) { return f1.results(season, round); }
    @PutMapping("/me")
    @PreAuthorize("hasAnyRole('player', 'admin')")
    public PlayerService.Profile me(@AuthenticationPrincipal Jwt jwt) {
        String name = jwt.getClaimAsString("preferred_username");
        return players.provision(jwt.getIssuer().toString(), jwt.getSubject(), name == null ? jwt.getSubject() : name, jwt.getClaimAsString("email"));
    }
    @GetMapping("/leagues")
    @PreAuthorize("hasAnyRole('player', 'admin')")
    public List<PlayerService.LeagueView> leagues(@AuthenticationPrincipal Jwt jwt) {
        return players.leagues(jwt.getIssuer().toString(), jwt.getSubject());
    }
    @PostMapping("/leagues")
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize("hasAnyRole('player', 'admin')")
    public PlayerService.LeagueView createLeague(@AuthenticationPrincipal Jwt jwt, @Valid @RequestBody CreateLeague request) {
        return players.createLeague(jwt.getIssuer().toString(), jwt.getSubject(), request.name());
    }
    @GetMapping("/admin/status")
    @PreAuthorize("hasRole('admin')")
    public Map<String, String> adminStatus() { return Map.of("status", "authorized"); }
    public record CreateLeague(@NotBlank @Size(max = 100) String name) {}
}
