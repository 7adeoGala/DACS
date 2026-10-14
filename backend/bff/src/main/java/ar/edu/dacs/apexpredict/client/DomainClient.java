package ar.edu.dacs.apexpredict.client;

import ar.edu.dacs.apexpredict.web.dto.CreateLeague;
import ar.edu.dacs.apexpredict.web.dto.LeagueView;
import ar.edu.dacs.apexpredict.web.dto.Profile;
import java.util.List;
import java.util.Map;
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

    @GetMapping("/admin/status")
    Map<String, String> adminStatus();
}
