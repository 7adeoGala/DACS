package ar.edu.dacs.apexpredict.connector;

import ar.edu.dacs.apexpredict.connector.client.JolpicaClient;
import ar.edu.dacs.apexpredict.connector.client.OpenF1Client;
import ar.edu.dacs.apexpredict.connector.dto.JolpicaDto;
import ar.edu.dacs.apexpredict.connector.dto.OpenF1Dto;
import ar.edu.dacs.apexpredict.connector.service.F1Service;
import feign.FeignException;
import feign.Request;
import feign.RequestTemplate;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import tools.jackson.databind.DeserializationFeature;
import tools.jackson.databind.json.JsonMapper;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@SuppressWarnings("null")
class F1ServiceTest {
    private JolpicaClient client;
    private OpenF1Client openF1Client;
    private F1Service service;

    @BeforeEach
    void setup() {
        client = mock(JolpicaClient.class);
        openF1Client = mock(OpenF1Client.class);
        service = new F1Service(client, openF1Client);
    }

    @Test
    void parsesScheduleAndUtcStart() {
        var raceDto = new JolpicaDto.RaceDto(
            "2026", "1", "Australian Grand Prix", "2026-03-08", "04:00:00Z",
            new JolpicaDto.Circuit("Albert Park", new JolpicaDto.Location("Australia")),
            null
        );
        var envelope = new JolpicaDto.Envelope(
            new JolpicaDto.Metadata("1", new JolpicaDto.RaceTable(List.of(raceDto)))
        );
        when(client.getRaces(2026, 100, 0)).thenReturn(envelope);

        var races = service.calendar(2026);
        assertEquals(1, races.size());
        assertEquals("Albert Park", races.getFirst().circuit());
        assertEquals(LocalDate.of(2026, 3, 8), races.getFirst().date());
        assertEquals(Instant.parse("2026-03-08T04:00:00Z"), races.getFirst().startsAt());
    }

    @Test
    void parsesResults() {
        var resultDto = new JolpicaDto.ResultDto(
            "1",
            new JolpicaDto.Driver("norris", "Lando", "Norris"),
            new JolpicaDto.Constructor("McLaren"),
            "Finished"
        );
        var raceDto = new JolpicaDto.RaceDto(
            "2025", "1", "Australian Grand Prix", "2025-03-16", null,
            null, List.of(resultDto)
        );
        var envelope = new JolpicaDto.Envelope(
            new JolpicaDto.Metadata("1", new JolpicaDto.RaceTable(List.of(raceDto)))
        );
        when(client.getResults(2025, 1, 100, 0)).thenReturn(envelope);

        var results = service.results(2025, 1);
        assertEquals(1, results.size());
        assertEquals("norris", results.getFirst().driverId());
        assertEquals("Lando Norris", results.getFirst().driverName());
        assertEquals(1, results.getFirst().position());
    }

    @Test
    void unavailableProviderThrowsException() {
        when(client.getRaces(2026, 100, 0)).thenThrow(new RuntimeException("Connection refused"));
        assertThrows(F1Service.F1UnavailableException.class, () -> service.calendar(2026));
    }

    @Test
    void missingTimeRemainsNull() {
        var raceDto = new JolpicaDto.RaceDto(
            "2026", "1", "Race", "2026-03-08", null,
            new JolpicaDto.Circuit("Circuit", new JolpicaDto.Location("Country")),
            null
        );
        var envelope = new JolpicaDto.Envelope(
            new JolpicaDto.Metadata("1", new JolpicaDto.RaceTable(List.of(raceDto)))
        );
        when(client.getRaces(2026, 100, 0)).thenReturn(envelope);

        var races = service.calendar(2026);
        assertNull(races.getFirst().startsAt());
    }

    @Test
    void invalidSeasonThrowsBadRequest() {
        assertThrows(IllegalArgumentException.class, () -> service.calendar(1900));
        assertThrows(IllegalArgumentException.class, () -> service.calendar(2200));
    }

    @Test
    void invalidRoundThrowsBadRequest() {
        assertThrows(IllegalArgumentException.class, () -> service.results(2026, 0));
        assertThrows(IllegalArgumentException.class, () -> service.results(2026, 50));
    }

    @Test
    void strictJolpicaDtoIgnoresUnknownFieldsLikeTimeAndFastestLapDetails() throws Exception {
        String rawJolpicaJson = """
            {
              "MRData": {
                "xmlns": "http://ergast.com/mrd/1.5",
                "series": "f1",
                "limit": "30",
                "total": "1",
                "RaceTable": {
                  "season": "2026",
                  "round": "19",
                  "Races": [{
                    "season": "2026",
                    "round": "19",
                    "url": "https://en.wikipedia.org/wiki/2026_Mexico_City_Grand_Prix",
                    "raceName": "Mexico City Grand Prix",
                    "date": "2026-11-01",
                    "Results": [{
                      "number": "3",
                      "position": "1",
                      "points": "25",
                      "laps": "71",
                      "status": "Finished",
                      "Time": { "millis": "5400000", "time": "1:30:00.000" },
                      "FastestLap": { "rank": "1", "lap": "60", "Time": { "time": "1:18.000" } },
                      "Driver": { "driverId": "max_verstappen", "permanentNumber": "3", "givenName": "Max", "familyName": "Verstappen" },
                      "Constructor": { "constructorId": "red_bull", "name": "Red Bull", "nationality": "Austrian" }
                    }]
                  }]
                }
              }
            }
            """;

        var mapper = JsonMapper.builder()
            .enable(DeserializationFeature.FAIL_ON_UNKNOWN_PROPERTIES)
            .build();
        var env = mapper.readValue(rawJolpicaJson, JolpicaDto.Envelope.class);
        assertEquals(1, env.data().table().races().size());
        var res = env.data().table().races().getFirst().results().getFirst();
        assertEquals("1", res.position());
        assertEquals("max_verstappen", res.driver().id());
    }

    @Test
    void officialSummaryCombinesJolpicaAndOpenF1SafetyCarCount() {
        var race = new JolpicaDto.DetailedRaceDto(
            "2026", "19", "Mexico City Grand Prix", "2026-11-01",
            new JolpicaDto.Circuit("rodriguez", "Autódromo Hermanos Rodríguez", new JolpicaDto.Location("19.4", "-99.1", "Mexico City", "Mexico")),
            List.of(
                new JolpicaDto.DetailedResultDto("1", "4", "25", "71", "Finished", new JolpicaDto.Driver("max_verstappen", "VER", "Max", "Verstappen", "Dutch"), new JolpicaDto.Constructor("Red Bull"), null),
                new JolpicaDto.DetailedResultDto("2", "1", "18", "71", "Finished", new JolpicaDto.Driver("hamilton", "HAM", "Lewis", "Hamilton", "British"), new JolpicaDto.Constructor("Ferrari"), null),
                new JolpicaDto.DetailedResultDto("3", "20", "0", "12", "Retired", new JolpicaDto.Driver("bottas", "BOT", "Valtteri", "Bottas", "Finnish"), new JolpicaDto.Constructor("Cadillac"), null)
            )
        );
        when(client.getDetailedResults(2026, 19, 100, 0)).thenReturn(
            new JolpicaDto.DetailedEnvelope(new JolpicaDto.DetailedMetadata("3", new JolpicaDto.DetailedRaceTable(List.of(race))))
        );
        when(client.getQualifying(2026, 19, 5)).thenReturn(
            new JolpicaDto.QualifyingEnvelope(new JolpicaDto.QualifyingMetadata(new JolpicaDto.QualifyingRaceTable(List.of(
                new JolpicaDto.QualifyingRaceDto("2026", "19", List.of(
                    new JolpicaDto.QualifyingResultDto("1", new JolpicaDto.Driver("hamilton", "Lewis", "Hamilton"))
                ))
            ))))
        );
        when(openF1Client.getSessions(2026, "Race")).thenReturn(List.of(new OpenF1Dto.SessionDto(11404L, "2026-11-01T20:00:00+00:00")));
        when(openF1Client.getRaceControl(11404L)).thenReturn(List.of(
            new OpenF1Dto.RaceControlDto("SafetyCar", "VSC DEPLOYED"),
            new OpenF1Dto.RaceControlDto("SafetyCar", "SAFETY CAR DEPLOYED"),
            new OpenF1Dto.RaceControlDto("Flag", "CHEQUERED FLAG")
        ));

        var summary = service.officialSummary(2026, 19);
        assertEquals(List.of("verstappen", "hamilton", "bottas"), summary.podiumTop10());
        assertEquals("hamilton", summary.polePositionDriverId());
        assertEquals(2, summary.safetyCarCount());
        assertEquals(1, summary.dnfCount());
        assertEquals(25.0, summary.weekendPoints().get("verstappen"));
        assertEquals(18.0, summary.weekendPoints().get("hamilton"));
    }

    @Test
    void officialSummaryMergesSprintPointsIntoWeekendPoints() {
        var race = new JolpicaDto.DetailedRaceDto(
            "2026", "20", "São Paulo Grand Prix", "2026-11-08",
            new JolpicaDto.Circuit("interlagos", "Interlagos", new JolpicaDto.Location("-23.7", "-46.6", "São Paulo", "Brazil")),
            List.of(
                new JolpicaDto.DetailedResultDto("1", "1", "25", "71", "Finished", new JolpicaDto.Driver("norris", "NOR", "Lando", "Norris", "British"), new JolpicaDto.Constructor("McLaren"), null),
                new JolpicaDto.DetailedResultDto("2", "2", "18", "71", "Finished", new JolpicaDto.Driver("piastri", "PIA", "Oscar", "Piastri", "Australian"), new JolpicaDto.Constructor("McLaren"), null)
            )
        );
        when(client.getDetailedResults(2026, 20, 100, 0)).thenReturn(
            new JolpicaDto.DetailedEnvelope(new JolpicaDto.DetailedMetadata("2", new JolpicaDto.DetailedRaceTable(List.of(race))))
        );
        when(client.getSprintResults(2026, 20, 30)).thenReturn(
            new JolpicaDto.SprintEnvelope(new JolpicaDto.SprintMetadata("2", new JolpicaDto.SprintRaceTable(List.of(
                new JolpicaDto.SprintRaceDto("2026", "20", List.of(
                    new JolpicaDto.DetailedResultDto("1", "1", "8", "24", "Finished", new JolpicaDto.Driver("piastri", "PIA", "Oscar", "Piastri", "Australian"), new JolpicaDto.Constructor("McLaren"), null),
                    new JolpicaDto.DetailedResultDto("2", "2", "7", "24", "Finished", new JolpicaDto.Driver("norris", "NOR", "Lando", "Norris", "British"), new JolpicaDto.Constructor("McLaren"), null)
                ))
            ))))
        );

        var summary = service.officialSummary(2026, 20);
        assertEquals(32.0, summary.weekendPoints().get("norris"));
        assertEquals(26.0, summary.weekendPoints().get("piastri"));
    }

    @Test
    void circuitBreakerOpensAfterRepeatedFailures() {
        when(client.getNextRace()).thenThrow(new RuntimeException("Jolpica timeout"));
        for (int i = 0; i < 3; i++) {
            assertThrows(F1Service.F1UnavailableException.class, () -> service.nextRace());
        }
        assertEquals("OPEN", service.circuitBreakerState());
        assertThrows(F1Service.F1UnavailableException.class, () -> service.nextRace());
        verify(client, times(3)).getNextRace();
    }

    @Test
    void driverStatsFallsBackToStandingsWhenRateLimitedWithoutOpeningCircuitBreaker() {
        var standing = new JolpicaDto.DriverStandingItemDto(
            "9", "89", "0",
            new JolpicaDto.Driver("lawson", "LAW", "Liam", "Lawson", "New Zealander"),
            List.of(new JolpicaDto.Constructor("RB F1 Team"))
        );
        when(client.getDriverStandings()).thenReturn(
            new JolpicaDto.StandingsEnvelope(new JolpicaDto.StandingsMetadata(
                new JolpicaDto.StandingsTable(List.of(new JolpicaDto.StandingsListDto(List.of(standing), null)))
            ))
        );
        when(client.getDriverSeasonResults("lawson", 50)).thenThrow(rateLimitException());

        var stats = service.driverStats("lawson");
        assertEquals("lawson", stats.driverId());
        assertEquals(89, stats.points());
        assertEquals("P9", stats.standingPosition());
        assertEquals("New Zealander", stats.nationality());
        assertEquals("CLOSED", service.circuitBreakerState());
    }

    @Test
    void driverStatsRetriesOnceOn429AndCachesResult() {
        var race = new JolpicaDto.DetailedRaceDto(
            "2026", "6", "Monaco Grand Prix", "2026-06-07",
            null,
            List.of(new JolpicaDto.DetailedResultDto(
                "6", "15", "8", "78", "Finished",
                new JolpicaDto.Driver("arvid_lindblad", "LIN", "Arvid", "Lindblad", "British"),
                new JolpicaDto.Constructor("RB F1 Team"),
                null
            ))
        );
        var seasonEnv = new JolpicaDto.DetailedEnvelope(
            new JolpicaDto.DetailedMetadata("1", new JolpicaDto.DetailedRaceTable(List.of(race)))
        );
        when(client.getDriverStandings()).thenReturn(null);
        when(client.getDriverSeasonResults("arvid_lindblad", 50))
            .thenThrow(rateLimitException())
            .thenReturn(seasonEnv);
        when(client.getDriverCareerWins("arvid_lindblad", 1))
            .thenReturn(new JolpicaDto.DetailedEnvelope(new JolpicaDto.DetailedMetadata("0", null)));
        when(client.getDriverCareerPoles("arvid_lindblad", 1))
            .thenReturn(new JolpicaDto.DetailedEnvelope(new JolpicaDto.DetailedMetadata("0", null)));
        when(client.getDriverCareerStarts("arvid_lindblad", 1))
            .thenReturn(new JolpicaDto.DetailedEnvelope(new JolpicaDto.DetailedMetadata("21", null)));

        var first = service.driverStats("lindblad");
        var second = service.driverStats("lindblad");

        assertEquals("lindblad", first.driverId());
        assertEquals("P6", first.bestFinish());
        assertEquals(21, first.careerStarts());
        assertEquals(first, second);
        assertEquals("CLOSED", service.circuitBreakerState());
        verify(client, times(2)).getDriverSeasonResults("arvid_lindblad", 50);
        verify(client, times(1)).getDriverCareerStarts("arvid_lindblad", 1);
    }

    @Test
    void driverStatsThrowsUnavailableWhenNoStandingsAndProviderDown() {
        when(client.getDriverStandings()).thenThrow(new RuntimeException("Connection refused"));
        when(client.getDriverSeasonResults("perez", 50)).thenThrow(new RuntimeException("Connection refused"));

        assertThrows(F1Service.F1UnavailableException.class, () -> service.driverStats("perez"));
    }

    private static FeignException.TooManyRequests rateLimitException() {
        Request req = Request.create(
            Request.HttpMethod.GET,
            "https://api.jolpi.ca/ergast/f1/current/drivers/lawson/results.json",
            Map.of(),
            null,
            StandardCharsets.UTF_8,
            new RequestTemplate()
        );
        return new FeignException.TooManyRequests("Too Many Requests", req, null, Map.of());
    }
}
