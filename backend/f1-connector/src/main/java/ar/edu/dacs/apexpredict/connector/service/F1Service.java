package ar.edu.dacs.apexpredict.connector.service;

import ar.edu.dacs.apexpredict.connector.client.JolpicaClient;
import ar.edu.dacs.apexpredict.connector.dto.Finish;
import ar.edu.dacs.apexpredict.connector.dto.JolpicaDto;
import ar.edu.dacs.apexpredict.connector.dto.Race;
import java.time.Instant;
import java.time.LocalDate;
import java.util.*;
import org.springframework.stereotype.Service;

@Service
public class F1Service {
    private final JolpicaClient client;

    public F1Service(JolpicaClient client) {
        this.client = client;
    }

    public List<Race> calendar(int season) {
        validateSeason(season);
        try {
            var collected = new ArrayList<JolpicaDto.RaceDto>();
            for (int offset = 0; offset < 1000; offset += 100) {
                var envelope = client.getRaces(season, 100, offset);
                if (envelope == null || envelope.data() == null || envelope.data().table() == null || envelope.data().table().races() == null) {
                    throw new IllegalStateException("Respuesta F1 incompleta.");
                }
                collected.addAll(envelope.data().table().races());
                int total = Integer.parseInt(envelope.data().total());
                if (offset + 100 >= total) break;
            }
            return collected.stream().map(r -> new Race(
                Integer.parseInt(r.season()),
                Integer.parseInt(r.round()),
                Objects.requireNonNull(r.name()),
                r.circuit().name(),
                r.circuit().location().country(),
                LocalDate.parse(r.date()),
                r.time() == null ? null : Instant.parse(r.date() + "T" + r.time())
            )).toList();
        } catch (IllegalArgumentException ex) {
            throw ex;
        } catch (Exception ex) {
            throw new F1UnavailableException("No se pudo consultar el calendario de Formula 1.", ex);
        }
    }

    public List<Finish> results(int season, int round) {
        validateSeason(season);
        if (round < 1 || round > 40) {
            throw new IllegalArgumentException("Ronda fuera de rango.");
        }
        try {
            var envelope = client.getResults(season, round, 100, 0);
            if (envelope == null || envelope.data() == null || envelope.data().table() == null || envelope.data().table().races() == null) {
                throw new IllegalStateException("Respuesta F1 incompleta.");
            }
            var races = envelope.data().table().races();
            if (races.isEmpty()) {
                return List.of();
            }
            var firstRace = races.getFirst();
            var results = Objects.requireNonNullElse(firstRace.results(), List.<JolpicaDto.ResultDto>of());
            return results.stream()
                .map(r -> new Finish(
                    Integer.parseInt(r.position()),
                    r.driver().id(),
                    r.driver().givenName() + " " + r.driver().familyName(),
                    r.constructor().name(),
                    r.status()
                ))
                .sorted((f1, f2) -> Integer.compare(f1.position(), f2.position()))
                .toList();
        } catch (IllegalArgumentException ex) {
            throw ex;
        } catch (Exception ex) {
            throw new F1UnavailableException("No se pudo consultar los resultados de Formula 1.", ex);
        }
    }

    private static void validateSeason(int season) {
        if (season < 1950 || season > 2100) {
            throw new IllegalArgumentException("Temporada fuera de rango.");
        }
    }

    public static class F1UnavailableException extends RuntimeException {
        public F1UnavailableException(String message, Throwable cause) {
            super(message, cause);
        }
    }
}
