package ar.edu.dacs.apexpredict.connector.client;

import ar.edu.dacs.apexpredict.connector.dto.JolpicaDto;
import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestParam;

@FeignClient(name = "jolpica-client", url = "${jolpica.api.url}")
public interface JolpicaClient {

    @GetMapping(value = "/{season}.json", headers = "User-Agent=ApexPredict-DACS/0.1")
    JolpicaDto.Envelope getRaces(
        @PathVariable("season") int season,
        @RequestParam("limit") int limit,
        @RequestParam("offset") int offset
    );

    @GetMapping(value = "/{season}/{round}/results.json", headers = "User-Agent=ApexPredict-DACS/0.1")
    JolpicaDto.Envelope getResults(
        @PathVariable("season") int season,
        @PathVariable("round") int round,
        @RequestParam("limit") int limit,
        @RequestParam("offset") int offset
    );

    @GetMapping(value = "/{season}/{round}/results.json", headers = "User-Agent=ApexPredict-DACS/0.1")
    JolpicaDto.DetailedEnvelope getDetailedResults(
        @PathVariable("season") int season,
        @PathVariable("round") int round,
        @RequestParam("limit") int limit,
        @RequestParam("offset") int offset
    );

    @GetMapping(value = "/{season}/{round}/qualifying.json", headers = "User-Agent=ApexPredict-DACS/0.1")
    JolpicaDto.QualifyingEnvelope getQualifying(
        @PathVariable("season") int season,
        @PathVariable("round") int round,
        @RequestParam("limit") int limit
    );

    @GetMapping(value = "/current/next.json", headers = "User-Agent=ApexPredict-DACS/0.1")
    JolpicaDto.NextRaceEnvelope getNextRace();

    @GetMapping(value = "/current/last/results.json", headers = "User-Agent=ApexPredict-DACS/0.1")
    JolpicaDto.DetailedEnvelope getLastResults(@RequestParam("limit") int limit);

    @GetMapping(value = "/current/driverStandings.json", headers = "User-Agent=ApexPredict-DACS/0.1")
    JolpicaDto.StandingsEnvelope getDriverStandings();

    @GetMapping(value = "/current/constructorStandings.json", headers = "User-Agent=ApexPredict-DACS/0.1")
    JolpicaDto.StandingsEnvelope getConstructorStandings();

    @GetMapping(value = "/current/drivers/{driverId}/results.json", headers = "User-Agent=ApexPredict-DACS/0.1")
    JolpicaDto.DetailedEnvelope getDriverSeasonResults(
        @PathVariable("driverId") String driverId,
        @RequestParam("limit") int limit
    );

    @GetMapping(value = "/drivers/{driverId}/results/1.json", headers = "User-Agent=ApexPredict-DACS/0.1")
    JolpicaDto.DetailedEnvelope getDriverCareerWins(
        @PathVariable("driverId") String driverId,
        @RequestParam("limit") int limit
    );

    @GetMapping(value = "/drivers/{driverId}/qualifying/1.json", headers = "User-Agent=ApexPredict-DACS/0.1")
    JolpicaDto.DetailedEnvelope getDriverCareerPoles(
        @PathVariable("driverId") String driverId,
        @RequestParam("limit") int limit
    );

    @GetMapping(value = "/drivers/{driverId}/results.json", headers = "User-Agent=ApexPredict-DACS/0.1")
    JolpicaDto.DetailedEnvelope getDriverCareerStarts(
        @PathVariable("driverId") String driverId,
        @RequestParam("limit") int limit
    );
}
