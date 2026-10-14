package ar.edu.dacs.apexpredict.connector;

import ar.edu.dacs.apexpredict.connector.client.JolpicaClient;
import ar.edu.dacs.apexpredict.connector.dto.JolpicaDto;
import ar.edu.dacs.apexpredict.connector.service.F1Service;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class F1ServiceTest {
    private JolpicaClient client;
    private F1Service service;

    @BeforeEach
    void setup() {
        client = mock(JolpicaClient.class);
        service = new F1Service(client);
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
}
