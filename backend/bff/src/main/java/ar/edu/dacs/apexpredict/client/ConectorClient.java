package ar.edu.dacs.apexpredict.client;

import ar.edu.dacs.apexpredict.web.dto.Finish;
import ar.edu.dacs.apexpredict.web.dto.Race;
import java.util.List;
import java.util.Map;
import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;

@FeignClient(
    name = "conectorClient",
    url = "${F1_CONNECTOR_URL:https://dacs-1-v4ik.onrender.com/conector}"
)
public interface ConectorClient {

    @GetMapping("/ping")
    Map<String, String> ping();

    @GetMapping("/calendar/{season}")
    List<Race> calendar(@PathVariable("season") int season);

    @GetMapping("/results/{season}/{round}")
    List<Finish> results(@PathVariable("season") int season, @PathVariable("round") int round);
}
