package ar.edu.dacs.apexpredict.web;

import ar.edu.dacs.apexpredict.application.PlayerService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import java.util.List;
import java.util.Map;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;

@RestController
public class DomainController {
    private final PlayerService players;

    public DomainController(PlayerService players) {
        this.players = players;
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

    @PostMapping("/leagues")
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize("hasAnyRole('player', 'admin')")
    public PlayerService.LeagueView createLeague(@AuthenticationPrincipal Jwt jwt, @Valid @RequestBody CreateLeague request) {
        return players.createLeague(jwt.getIssuer().toString(), jwt.getSubject(), request.name());
    }

    @GetMapping("/admin/status")
    @PreAuthorize("hasRole('admin')")
    public Map<String, String> adminStatus() {
        return Map.of("status", "authorized");
    }

    public record CreateLeague(@NotBlank @Size(max = 100) String name) {}
}
