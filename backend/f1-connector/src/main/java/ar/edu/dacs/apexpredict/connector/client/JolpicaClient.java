package ar.edu.dacs.apexpredict.connector.client;

import ar.edu.dacs.apexpredict.connector.dto.JolpicaDto;
import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestParam;

@FeignClient(name = "jolpicaClient", url = "${apexpredict.jolpica.base-url}")
public interface JolpicaClient {

    @GetMapping(value = "/{season}/", headers = "User-Agent=ApexPredict-DACS/0.1")
    JolpicaDto.Envelope getRaces(
        @PathVariable("season") int season,
        @RequestParam("limit") int limit,
        @RequestParam("offset") int offset
    );

    @GetMapping(value = "/{season}/{round}/results/", headers = "User-Agent=ApexPredict-DACS/0.1")
    JolpicaDto.Envelope getResults(
        @PathVariable("season") int season,
        @PathVariable("round") int round,
        @RequestParam("limit") int limit,
        @RequestParam("offset") int offset
    );
}
