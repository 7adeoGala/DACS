package ar.edu.dacs.apexpredict.connector.client;

import ar.edu.dacs.apexpredict.connector.dto.OpenF1Dto;
import java.util.List;
import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestParam;

@FeignClient(name = "openf1-client", url = "${openf1.api.url}")
public interface OpenF1Client {

    @GetMapping("/sessions")
    List<OpenF1Dto.SessionDto> getSessions(
        @RequestParam("year") int year,
        @RequestParam("session_name") String sessionName
    );

    @GetMapping("/race_control")
    List<OpenF1Dto.RaceControlDto> getRaceControl(@RequestParam("session_key") long sessionKey);
}
