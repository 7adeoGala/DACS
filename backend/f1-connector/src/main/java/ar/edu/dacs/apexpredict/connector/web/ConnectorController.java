package ar.edu.dacs.apexpredict.connector.web;

import ar.edu.dacs.apexpredict.connector.dto.Finish;
import ar.edu.dacs.apexpredict.connector.dto.Race;
import ar.edu.dacs.apexpredict.connector.service.F1Service;
import java.util.List;
import java.util.Map;
import org.springframework.web.bind.annotation.*;

@RestController
public class ConnectorController {
    private final F1Service f1;

    public ConnectorController(F1Service f1) {
        this.f1 = f1;
    }

    @GetMapping("/ping")
    public Map<String, String> ping() {
        return Map.of("service", "apexpredict-f1-connector", "status", "UP");
    }

    @GetMapping("/calendar/{season}")
    public List<Race> calendar(@PathVariable int season) {
        return f1.calendar(season);
    }

    @GetMapping("/results/{season}/{round}")
    public List<Finish> results(@PathVariable int season, @PathVariable int round) {
        return f1.results(season, round);
    }
}
