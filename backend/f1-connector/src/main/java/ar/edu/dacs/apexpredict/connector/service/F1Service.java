package ar.edu.dacs.apexpredict.connector.service;

import ar.edu.dacs.apexpredict.connector.client.JolpicaClient;
import ar.edu.dacs.apexpredict.connector.client.OpenF1Client;
import ar.edu.dacs.apexpredict.connector.dto.*;
import java.time.Duration;
import java.time.Instant;
import java.time.LocalDate;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.lang.Nullable;
import org.springframework.stereotype.Service;

@Service
@SuppressWarnings("null")
public class F1Service {
    private static final Duration CACHE_TTL = Duration.ofMinutes(5);

    private final JolpicaClient client;
    private final OpenF1Client openF1Client;

    private final Map<String, CacheEntry<DriverDynamicStats>> driverStatsCache = new ConcurrentHashMap<>();
    private final Map<String, CacheEntry<OfficialRaceSummary>> officialSummaryCache = new ConcurrentHashMap<>();
    private volatile CacheEntry<List<DriverStandingInfo>> driverStandingsCache;
    private volatile CacheEntry<List<ConstructorStandingInfo>> constructorStandingsCache;

    @Autowired
    public F1Service(JolpicaClient client, @Nullable OpenF1Client openF1Client) {
        this.client = client;
        this.openF1Client = openF1Client;
    }

    public F1Service(JolpicaClient client) {
        this(client, null);
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
                r.circuit() != null ? r.circuit().name() : "",
                r.circuit() != null && r.circuit().location() != null ? r.circuit().location().country() : "",
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
        validateRound(round);
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

    public OfficialRaceSummary officialSummary(int season, int round) {
        validateSeason(season);
        validateRound(round);
        String key = season + "-" + round;
        var cached = officialSummaryCache.get(key);
        if (cached != null && !cached.isExpired()) {
            return cached.value();
        }
        try {
            var envelope = client.getDetailedResults(season, round, 100, 0);
            if (envelope == null || envelope.data() == null || envelope.data().table() == null || envelope.data().table().races() == null) {
                throw new IllegalStateException("Respuesta F1 incompleta.");
            }
            var races = envelope.data().table().races();
            if (races.isEmpty()) {
                return new OfficialRaceSummary(season, round, null, null, null, List.of(), List.of(), null, 0, 0);
            }

            var race = races.getFirst();
            var rawResults = Objects.requireNonNullElse(race.results(), List.<JolpicaDto.DetailedResultDto>of());

            List<String> fullClassification = new ArrayList<>();
            int dnfCount = 0;
            String gridPole = null;
            for (var r : rawResults.stream().sorted(Comparator.comparingInt(x -> safeParseInt(x.position(), 99))).toList()) {
                String normDriver = normalizeDriverId(r.driver() != null ? r.driver().id() : null);
                if (normDriver != null && !normDriver.isBlank() && !fullClassification.contains(normDriver)) {
                    fullClassification.add(normDriver);
                }
                if ("1".equals(r.grid())) {
                    gridPole = normDriver;
                }
                String status = r.status() != null ? r.status().trim().toLowerCase(Locale.ROOT) : "";
                if (!status.isEmpty() && !status.equals("finished") && !status.equals("lapped") && !status.startsWith("+")) {
                    dnfCount++;
                }
            }

            List<String> podiumTop10 = fullClassification.stream().limit(10).toList();
            String pole = fetchPoleDriver(season, round);
            if (pole == null || pole.isBlank()) {
                pole = gridPole;
            }
            int safetyCarCount = fetchOpenF1SafetyCarCount(season, race.date());

            var summary = new OfficialRaceSummary(
                season,
                round,
                race.raceName(),
                race.circuit() != null ? race.circuit().name() : null,
                race.date(),
                podiumTop10,
                List.copyOf(fullClassification),
                pole,
                safetyCarCount,
                dnfCount
            );
            officialSummaryCache.put(key, CacheEntry.of(summary));
            return summary;
        } catch (IllegalArgumentException ex) {
            throw ex;
        } catch (Exception ex) {
            throw new F1UnavailableException("No se pudo obtener el resumen oficial del Gran Premio.", ex);
        }
    }

    public NextRaceInfo nextRace() {
        try {
            var envelope = client.getNextRace();
            var races = envelope != null && envelope.data() != null && envelope.data().table() != null
                ? envelope.data().table().races()
                : null;
            if (races == null || races.isEmpty()) {
                throw new IllegalStateException("No hay carreras próximas disponibles.");
            }
            var r = races.getFirst();
            var circuit = r.circuit();
            var loc = circuit != null ? circuit.location() : null;
            String startsAt = combineDateTime(r.date(), r.time(), "20:00:00Z");

            return new NextRaceInfo(
                safeParseInt(r.season(), 2026),
                safeParseInt(r.round(), 21),
                r.raceName(),
                circuit != null ? circuit.name() : "",
                circuit != null ? circuit.id() : "",
                loc != null ? loc.country() : "",
                loc != null ? loc.locality() : "",
                r.date(),
                startsAt,
                formatSessionTime(r.firstPractice()),
                formatSessionTime(r.secondPractice()),
                formatSessionTime(r.thirdPractice()),
                formatSessionTime(r.qualifying()),
                formatSessionTime(r.sprint()),
                formatSessionTime(r.sprintQualifying()),
                loc != null ? loc.lat() : null,
                loc != null ? loc.lon() : null
            );
        } catch (IllegalArgumentException ex) {
            throw ex;
        } catch (Exception ex) {
            throw new F1UnavailableException("No se pudo consultar la próxima carrera de Formula 1.", ex);
        }
    }

    public LastRaceInfo lastRaceResults() {
        try {
            var envelope = client.getLastResults(30);
            var races = envelope != null && envelope.data() != null && envelope.data().table() != null
                ? envelope.data().table().races()
                : null;
            if (races == null || races.isEmpty()) {
                throw new IllegalStateException("Sin resultados recientes.");
            }
            var race = races.getFirst();
            var list = Objects.requireNonNullElse(race.results(), List.<JolpicaDto.DetailedResultDto>of()).stream()
                .map(r -> new LastRaceInfo.DetailedFinish(
                    r.position(),
                    r.driver() != null ? r.driver().id() : "",
                    r.driver() != null ? (r.driver().givenName() + " " + r.driver().familyName()).trim() : "",
                    r.constructor() != null ? r.constructor().name() : "",
                    r.status(),
                    r.points(),
                    r.grid(),
                    r.laps()
                ))
                .toList();
            return new LastRaceInfo(
                race.raceName(),
                safeParseInt(race.round(), 0),
                race.circuit() != null ? race.circuit().name() : "",
                race.date(),
                list
            );
        } catch (Exception ex) {
            throw new F1UnavailableException("No se pudo consultar la última carrera de Formula 1.", ex);
        }
    }

    public List<DriverStandingInfo> driverStandings() {
        var cached = driverStandingsCache;
        if (cached != null && !cached.isExpired()) {
            return cached.value();
        }
        try {
            var envelope = client.getDriverStandings();
            var lists = envelope != null && envelope.data() != null && envelope.data().table() != null
                ? envelope.data().table().lists()
                : null;
            if (lists == null || lists.isEmpty() || lists.getFirst().driverStandings() == null) {
                return List.of();
            }
            var result = lists.getFirst().driverStandings().stream()
                .map(s -> new DriverStandingInfo(
                    s.position(),
                    s.points(),
                    s.wins(),
                    s.driver() != null ? s.driver().id() : "",
                    s.driver() != null ? Objects.requireNonNullElse(s.driver().code(), "") : "",
                    s.driver() != null ? (Objects.requireNonNullElse(s.driver().givenName(), "") + " " + Objects.requireNonNullElse(s.driver().familyName(), "")).trim() : "",
                    s.driver() != null ? Objects.requireNonNullElse(s.driver().nationality(), "") : "",
                    s.constructors() != null && !s.constructors().isEmpty() ? s.constructors().getFirst().name() : "F1 Team"
                ))
                .toList();
            driverStandingsCache = CacheEntry.of(result);
            return result;
        } catch (Exception ex) {
            throw new F1UnavailableException("No se pudo consultar la tabla de pilotos.", ex);
        }
    }

    public List<ConstructorStandingInfo> constructorStandings() {
        var cached = constructorStandingsCache;
        if (cached != null && !cached.isExpired()) {
            return cached.value();
        }
        try {
            var envelope = client.getConstructorStandings();
            var lists = envelope != null && envelope.data() != null && envelope.data().table() != null
                ? envelope.data().table().lists()
                : null;
            if (lists == null || lists.isEmpty() || lists.getFirst().constructorStandings() == null) {
                return List.of();
            }
            var result = lists.getFirst().constructorStandings().stream()
                .map(s -> new ConstructorStandingInfo(
                    s.position(),
                    s.points(),
                    s.wins(),
                    s.constructor() != null ? Objects.requireNonNullElse(s.constructor().id(), "") : "",
                    s.constructor() != null ? Objects.requireNonNullElse(s.constructor().name(), "") : "",
                    s.constructor() != null ? Objects.requireNonNullElse(s.constructor().nationality(), "") : ""
                ))
                .toList();
            constructorStandingsCache = CacheEntry.of(result);
            return result;
        } catch (Exception ex) {
            throw new F1UnavailableException("No se pudo consultar la tabla de constructores.", ex);
        }
    }

    public DriverDynamicStats driverStats(String rawDriverId) {
        if (rawDriverId == null || rawDriverId.isBlank()) {
            throw new IllegalArgumentException("Identificador de piloto requerido.");
        }
        String cleanId = normalizeDriverId(rawDriverId);
        var cached = driverStatsCache.get(cleanId);
        if (cached != null && !cached.isExpired()) {
            return cached.value();
        }

        String jolpicaId = toJolpicaDriverId(cleanId);
        try {
            List<DriverStandingInfo> standings = List.of();
            try {
                standings = driverStandings();
            } catch (Exception ignored) {
                // standings fallback to empty
            }

            DriverStandingInfo standing = standings.stream()
                .filter(s -> normalizeDriverId(s.driverId()).equals(cleanId))
                .findFirst()
                .orElse(null);

            int points = standing != null ? safeParseInt(standing.points(), 0) : 0;
            String standingPos = standing != null && standing.position() != null && !standing.position().isBlank()
                ? "P" + standing.position()
                : "-";
            int standingWins = standing != null ? safeParseInt(standing.wins(), 0) : 0;

            var seasonEnvelope = client.getDriverSeasonResults(jolpicaId, 50);
            var races = seasonEnvelope != null && seasonEnvelope.data() != null && seasonEnvelope.data().table() != null
                && seasonEnvelope.data().table().races() != null
                ? seasonEnvelope.data().table().races()
                : List.<JolpicaDto.DetailedRaceDto>of();

            int seasonWins = 0;
            int podiums = 0;
            int poles = 0;
            int fastestLaps = 0;
            int dnfs = 0;
            int bestPos = 999;
            List<DriverSeasonResult> seasonResults = new ArrayList<>();

            for (var race : races) {
                if (race.results() == null || race.results().isEmpty()) continue;
                var res = race.results().getFirst();
                int pos = safeParseInt(res.position(), 0);
                int grid = safeParseInt(res.grid(), 0);
                String status = Objects.requireNonNullElse(res.status(), "");

                if (pos > 0 && pos < bestPos) bestPos = pos;
                if (pos == 1) seasonWins++;
                if (pos >= 1 && pos <= 3) podiums++;
                if (grid == 1) poles++;
                if (res.fastestLap() != null && "1".equals(res.fastestLap().rank())) fastestLaps++;

                String stLower = status.toLowerCase(Locale.ROOT);
                if (!stLower.isEmpty() && !stLower.equals("finished") && !stLower.equals("lapped") && !stLower.startsWith("+")) {
                    dnfs++;
                }

                seasonResults.add(new DriverSeasonResult(
                    safeParseInt(race.round(), 0),
                    race.raceName(),
                    pos,
                    grid,
                    status
                ));
            }

            int wins = seasonWins > 0 ? seasonWins : standingWins;
            int careerWins = safeFetchTotal(() -> client.getDriverCareerWins(jolpicaId, 1), wins);
            int careerPoles = safeFetchTotal(() -> client.getDriverCareerPoles(jolpicaId, 1), poles);
            int careerStarts = safeFetchTotal(() -> client.getDriverCareerStarts(jolpicaId, 1), races.size());

            var stats = new DriverDynamicStats(
                cleanId,
                standing != null ? standing.nationality() : "",
                points,
                standingPos,
                wins,
                podiums,
                poles,
                fastestLaps,
                dnfs,
                races.size(),
                bestPos < 999 ? "P" + bestPos : "-",
                careerWins,
                careerPoles,
                careerStarts,
                List.copyOf(seasonResults)
            );
            driverStatsCache.put(cleanId, CacheEntry.of(stats));
            return stats;
        } catch (IllegalArgumentException ex) {
            throw ex;
        } catch (Exception ex) {
            throw new F1UnavailableException("No se pudieron consultar estadísticas del piloto.", ex);
        }
    }

    private String fetchPoleDriver(int season, int round) {
        try {
            var q = client.getQualifying(season, round, 5);
            var races = q != null && q.data() != null && q.data().table() != null ? q.data().table().races() : null;
            if (races == null || races.isEmpty()) return null;
            var qualResults = races.getFirst().qualifyingResults();
            if (qualResults == null || qualResults.isEmpty()) return null;
            var p1 = qualResults.getFirst();
            return p1.driver() != null ? normalizeDriverId(p1.driver().id()) : null;
        } catch (Exception ignored) {
            return null;
        }
    }

    private int fetchOpenF1SafetyCarCount(int season, String raceDate) {
        if (openF1Client == null || raceDate == null || raceDate.isBlank()) {
            return 0;
        }
        try {
            var sessions = openF1Client.getSessions(season, "Race");
            if (sessions == null || sessions.isEmpty()) return 0;

            var matched = sessions.stream()
                .filter(s -> s.date_start() != null && s.date_start().startsWith(raceDate))
                .findFirst()
                .orElse(null);
            if (matched == null) return 0;

            var messages = openF1Client.getRaceControl(matched.session_key());
            if (messages == null) return 0;
            return (int) messages.stream()
                .filter(m -> "SafetyCar".equalsIgnoreCase(m.category())
                    && m.message() != null
                    && m.message().toUpperCase(Locale.ROOT).contains("DEPLOYED"))
                .count();
        } catch (Exception ignored) {
            return 0;
        }
    }

    private int safeFetchTotal(java.util.function.Supplier<JolpicaDto.DetailedEnvelope> call, int fallback) {
        try {
            var env = call.get();
            if (env != null && env.data() != null && env.data().total() != null) {
                return Integer.parseInt(env.data().total());
            }
        } catch (Exception ignored) {
            // fallback value when endpoint fails
        }
        return fallback;
    }

    public static String normalizeDriverId(String driverId) {
        if (driverId == null) return null;
        String clean = driverId.trim().toLowerCase(Locale.ROOT);
        return switch (clean) {
            case "max_verstappen", "maxverstappen" -> "verstappen";
            case "arvid_lindblad", "arvidlindblad" -> "lindblad";
            case "sergio_perez", "sergioperez" -> "perez";
            case "carlos_sainz", "carlossainz" -> "sainz";
            case "nico_hulkenberg", "nicohulkenberg" -> "hulkenberg";
            case "kimi_antonelli", "andrea_kimi_antonelli" -> "antonelli";
            default -> clean;
        };
    }

    public static String toJolpicaDriverId(String driverId) {
        if (driverId == null) return "";
        String clean = driverId.trim().toLowerCase(Locale.ROOT);
        return switch (clean) {
            case "verstappen" -> "max_verstappen";
            case "lindblad" -> "arvid_lindblad";
            default -> clean;
        };
    }

    private static String combineDateTime(String date, String time, String defaultTime) {
        if (date == null || date.isBlank()) return null;
        String t = (time != null && !time.isBlank()) ? time : defaultTime;
        return date + "T" + t;
    }

    private static String formatSessionTime(JolpicaDto.SessionTimeDto s) {
        if (s == null || s.date() == null || s.date().isBlank()) return null;
        return combineDateTime(s.date(), s.time(), "15:00:00Z");
    }

    private static int safeParseInt(String val, int fallback) {
        try {
            return val != null ? Integer.parseInt(val.trim()) : fallback;
        } catch (NumberFormatException ex) {
            return fallback;
        }
    }

    private static void validateSeason(int season) {
        if (season < 1950 || season > 2100) {
            throw new IllegalArgumentException("Temporada fuera de rango.");
        }
    }

    private static void validateRound(int round) {
        if (round < 1 || round > 40) {
            throw new IllegalArgumentException("Ronda fuera de rango.");
        }
    }

    private record CacheEntry<T>(T value, Instant expiresAt) {
        static <T> CacheEntry<T> of(T value) {
            return new CacheEntry<>(value, Instant.now().plus(CACHE_TTL));
        }
        boolean isExpired() {
            return Instant.now().isAfter(expiresAt);
        }
    }

    public static class F1UnavailableException extends RuntimeException {
        public F1UnavailableException(String message, Throwable cause) {
            super(message, cause);
        }
    }
}
