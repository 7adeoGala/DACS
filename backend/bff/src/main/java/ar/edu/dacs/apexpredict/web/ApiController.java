package ar.edu.dacs.apexpredict.web;

import ar.edu.dacs.apexpredict.client.ConectorClient;
import ar.edu.dacs.apexpredict.client.DomainClient;
import ar.edu.dacs.apexpredict.web.dto.CreateLeague;
import ar.edu.dacs.apexpredict.web.dto.Finish;
import ar.edu.dacs.apexpredict.web.dto.LeagueView;
import ar.edu.dacs.apexpredict.web.dto.Profile;
import ar.edu.dacs.apexpredict.web.dto.Race;
import jakarta.validation.Valid;
import java.util.List;
import java.util.Map;
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

    @GetMapping("/leagues")
    @PreAuthorize("hasAnyRole('player', 'admin')")
    public List<LeagueView> leagues() {
        return domainClient.leagues();
    }

    @PostMapping("/leagues")
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize("hasAnyRole('player', 'admin')")
    public LeagueView createLeague(@Valid @RequestBody CreateLeague request) {
        return domainClient.createLeague(request);
    }

    @GetMapping("/admin/status")
    @PreAuthorize("hasRole('admin')")
    public Map<String, String> adminStatus() {
        return domainClient.adminStatus();
    }
}
