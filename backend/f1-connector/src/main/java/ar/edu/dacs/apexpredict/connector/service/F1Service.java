package ar.edu.dacs.apexpredict.connector.service;

import ar.edu.dacs.apexpredict.connector.client.JolpicaClient;
import ar.edu.dacs.apexpredict.connector.client.OpenF1Client;
import ar.edu.dacs.apexpredict.connector.dto.*;
import feign.FeignException;
import java.time.Duration;
import java.time.Instant;
import java.time.LocalDate;
import java.util.*;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.CompletionException;
import java.util.concurrent.ConcurrentHashMap;
import java.util.function.Supplier;
import org.jspecify.annotations.Nullable;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

@Service
@SuppressWarnings("null")
public class F1Service {
    // ==================================================
    // CONFIGURACION Y ESTADO EN MEMORIA
    // ==================================================
    private static final Logger log = LoggerFactory.getLogger(F1Service.class);
    private static final Duration CACHE_TTL = Duration.ofMinutes(30);
    private static final Duration CAREER_CACHE_TTL = Duration.ofHours(6);

    private final JolpicaClient client;
    private final OpenF1Client openF1Client;
    private final ExternalApiCircuitBreaker circuitBreaker;
    private final long jolpicaMinIntervalMs;
    private final long rateLimitBackoffMs;
    private final Object jolpicaRateLock = new Object();
    private long nextJolpicaRequestAtMs = 0L;

    private final Map<String, CacheEntry<DriverDynamicStats>> driverStatsCache = new ConcurrentHashMap<>();
    private final Map<String, CacheEntry<CareerTotals>> careerTotalsCache = new ConcurrentHashMap<>();
    private final Map<String, CacheEntry<OfficialRaceSummary>> officialSummaryCache = new ConcurrentHashMap<>();
    private final Map<Integer, CacheEntry<List<Race>>> calendarCache = new ConcurrentHashMap<>();
    private final Map<String, CacheEntry<List<Finish>>> resultsCache = new ConcurrentHashMap<>();
    private final ConcurrentHashMap<String, CompletableFuture<?>> inFlightRequests = new ConcurrentHashMap<>();
    private volatile CacheEntry<NextRaceInfo> nextRaceCache;
    private volatile CacheEntry<LastRaceInfo> lastRaceCache;
    private volatile CacheEntry<List<DriverStandingInfo>> driverStandingsCache;
    private volatile CacheEntry<List<ConstructorStandingInfo>> constructorStandingsCache;

    @Autowired
    public F1Service(
        JolpicaClient client,
        @Nullable OpenF1Client openF1Client,
        @Nullable ExternalApiCircuitBreaker circuitBreaker,
        @Value("${jolpica.api.min-interval-ms:320}") long jolpicaMinIntervalMs,
        @Value("${jolpica.api.rate-limit-backoff-ms:1200}") long rateLimitBackoffMs
    ) {
        this.client = client;
        this.openF1Client = openF1Client;
        this.circuitBreaker = circuitBreaker != null
            ? circuitBreaker
            : new ExternalApiCircuitBreaker(3, 30);
        this.jolpicaMinIntervalMs = Math.max(0L, jolpicaMinIntervalMs);
        this.rateLimitBackoffMs = Math.max(0L, rateLimitBackoffMs);
    }

    public F1Service(
        JolpicaClient client,
        @Nullable OpenF1Client openF1Client,
        @Nullable ExternalApiCircuitBreaker circuitBreaker
    ) {
        this(client, openF1Client, circuitBreaker, 0L, 0L);
    }

    public F1Service(JolpicaClient client, @Nullable OpenF1Client openF1Client) {
        this(client, openF1Client, new ExternalApiCircuitBreaker(3, 30), 0L, 0L);
    }

    public F1Service(JolpicaClient client) {
        this(client, null, new ExternalApiCircuitBreaker(3, 30), 0L, 0L);
    }

    public String circuitBreakerState() {
        return circuitBreaker.getState().name();
    }

    // ==================================================
    // RESILIENCIA, RATE LIMITING Y COALESCING
    // ==================================================
    private void paceJolpicaRequest() {
        if (jolpicaMinIntervalMs <= 0L) {
            return;
        }
        long waitMs;
        synchronized (jolpicaRateLock) {
            long now = System.currentTimeMillis();
            if (now < nextJolpicaRequestAtMs) {
                waitMs = nextJolpicaRequestAtMs - now;
                nextJolpicaRequestAtMs += jolpicaMinIntervalMs;
            } else {
                waitMs = 0L;
                nextJolpicaRequestAtMs = now + jolpicaMinIntervalMs;
            }
        }
        if (waitMs > 0L) {
            sleepQuietly(waitMs);
        }
    }

    private <T> T callJolpica(Supplier<T> call) {
        paceJolpicaRequest();
        try {
            return call.get();
        } catch (Exception ex) {
            if (isRateLimited(ex)) {
                log.warn("Jolpica devolvio HTTP 429; aplicando pausa de respaldo antes de reintentar.");
                if (rateLimitBackoffMs > 0L) {
                    synchronized (jolpicaRateLock) {
                        nextJolpicaRequestAtMs = Math.max(
                            nextJolpicaRequestAtMs,
                            System.currentTimeMillis() + rateLimitBackoffMs
                        );
                    }
                    sleepQuietly(rateLimitBackoffMs);
                }
                paceJolpicaRequest();
                return call.get();
            }
            throw ex;
        }
    }

    @SuppressWarnings("unchecked")
    private <T> T coalesce(String key, Supplier<T> loader) {
        CompletableFuture<T> created = new CompletableFuture<>();
        CompletableFuture<T> existing = (CompletableFuture<T>) inFlightRequests.putIfAbsent(key, created);
        if (existing != null) {
            return joinUnwrapped(existing);
        }
        try {
            T result = loader.get();
            created.complete(result);
            return result;
        } catch (Throwable ex) {
            created.completeExceptionally(ex);
            if (ex instanceof RuntimeException runtimeEx) {
                throw runtimeEx;
            }
            throw new IllegalStateException("Error ejecutando solicitud F1.", ex);
        } finally {
            inFlightRequests.remove(key, created);
        }
    }

    private static <T> T joinUnwrapped(CompletableFuture<T> future) {
        try {
            return future.join();
        } catch (CompletionException ex) {
            Throwable cause = ex.getCause();
            if (cause instanceof RuntimeException runtimeEx) {
                throw runtimeEx;
            }
            throw ex;
        }
    }

    private static boolean isRateLimited(Throwable ex) {
        Throwable current = ex;
        while (current != null) {
            if (current instanceof FeignException feignEx && feignEx.status() == 429) {
                return true;
            }
            current = current.getCause();
        }
        return false;
    }

    private static void sleepQuietly(long millis) {
        try {
            Thread.sleep(millis);
        } catch (InterruptedException ignored) {
            Thread.currentThread().interrupt();
        }
    }

    private <T> T executeProtected(
        CacheEntry<T> cached,
        Supplier<T> upstreamCall,
        java.util.function.Consumer<CacheEntry<T>> cacheWriter,
        String unavailableMessage
    ) {
        if (cached != null && !cached.isExpired()) {
            return cached.value();
        }
        if (!circuitBreaker.allowRequest()) {
            if (cached != null) {
                log.warn("Circuit breaker OPEN: sirviendo respuesta en cache stale para proteger el conector F1.");
                return cached.value();
            }
            throw new F1UnavailableException(unavailableMessage + " (Circuit Breaker activo).", null);
        }
        try {
            T result = upstreamCall.get();
            circuitBreaker.recordSuccess();
            if (result != null) {
                cacheWriter.accept(CacheEntry.of(result, CACHE_TTL));
            }
            return result;
        } catch (IllegalArgumentException ex) {
            throw ex;
        } catch (Exception ex) {
            if (!isRateLimited(ex)) {
                circuitBreaker.recordFailure();
            }
            if (cached != null) {
                log.warn("Falla en proveedor externo F1 ({}); devolviendo datos en cache stale.", ex.getMessage());
                return cached.value();
            }
            throw new F1UnavailableException(unavailableMessage, ex);
        }
    }

    // ==================================================
    // CONSULTAS DE CALENDARIO Y RESULTADOS
    // ==================================================
    public List<Race> calendar(int season) {
        validateSeason(season);
        var cached = calendarCache.get(season);
        if (cached != null && !cached.isExpired()) {
            return cached.value();
        }
        return coalesce("calendar:" + season, () -> executeProtected(
            calendarCache.get(season),
            () -> {
                var collected = new ArrayList<JolpicaDto.RaceDto>();
                for (int offset = 0; offset < 1000; offset += 100) {
                    int pageOffset = offset;
                    var envelope = callJolpica(() -> client.getRaces(season, 100, pageOffset));
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
            },
            entry -> calendarCache.put(season, entry),
            "No se pudo consultar el calendario de Formula 1."
        ));
    }

    public List<Finish> results(int season, int round) {
        validateSeason(season);
        validateRound(round);
        String key = season + "-" + round;
        var cached = resultsCache.get(key);
        if (cached != null && !cached.isExpired()) {
            return cached.value();
        }
        return coalesce("results:" + key, () -> executeProtected(
            resultsCache.get(key),
            () -> {
                var envelope = callJolpica(() -> client.getResults(season, round, 100, 0));
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
            },
            entry -> {
                if (!entry.value().isEmpty()) {
                    resultsCache.put(key, entry);
                }
            },
            "No se pudo consultar los resultados de Formula 1."
        ));
    }

    public OfficialRaceSummary officialSummary(int season, int round) {
        validateSeason(season);
        validateRound(round);
        String key = season + "-" + round;
        var cached = officialSummaryCache.get(key);
        if (cached != null && !cached.isExpired()) {
            return cached.value();
        }
        return coalesce("official-summary:" + key, () -> executeProtected(
            officialSummaryCache.get(key),
            () -> {
                var envelope = callJolpica(() -> client.getDetailedResults(season, round, 100, 0));
                if (envelope == null || envelope.data() == null || envelope.data().table() == null || envelope.data().table().races() == null) {
                    throw new IllegalStateException("Respuesta F1 incompleta.");
                }
                var races = envelope.data().table().races();
                if (races.isEmpty()) {
                    return new OfficialRaceSummary(season, round, null, null, null, List.of(), List.of(), null, 0, 0, Map.of());
                }

                var race = races.getFirst();
                var rawResults = Objects.requireNonNullElse(race.results(), List.<JolpicaDto.DetailedResultDto>of());

                List<String> fullClassification = new ArrayList<>();
                Map<String, Double> weekendPoints = new LinkedHashMap<>();
                int dnfCount = 0;
                String gridPole = null;
                for (var r : rawResults.stream().sorted(Comparator.comparingInt(x -> safeParseInt(x.position(), 99))).toList()) {
                    String normDriver = normalizeDriverId(r.driver() != null ? r.driver().id() : null);
                    if (normDriver != null && !normDriver.isBlank()) {
                        if (!fullClassification.contains(normDriver)) {
                            fullClassification.add(normDriver);
                        }
                        double pts = safeParseDouble(r.points(), 0.0);
                        weekendPoints.merge(normDriver, pts, Double::sum);
                    }
                    if ("1".equals(r.grid())) {
                        gridPole = normDriver;
                    }
                    String status = r.status() != null ? r.status().trim().toLowerCase(Locale.ROOT) : "";
                    if (!status.isEmpty() && !status.equals("finished") && !status.equals("lapped") && !status.startsWith("+")) {
                        dnfCount++;
                    }
                }

                mergeSprintPoints(season, round, weekendPoints);

                List<String> podiumTop10 = fullClassification.stream().limit(10).toList();
                String pole = fetchPoleDriver(season, round);
                if (pole == null || pole.isBlank()) {
                    pole = gridPole;
                }
                int safetyCarCount = fetchOpenF1SafetyCarCount(season, race.date());

                return new OfficialRaceSummary(
                    season,
                    round,
                    race.raceName(),
                    race.circuit() != null ? race.circuit().name() : null,
                    race.date(),
                    podiumTop10,
                    List.copyOf(fullClassification),
                    pole,
                    safetyCarCount,
                    dnfCount,
                    Map.copyOf(weekendPoints)
                );
            },
            entry -> {
                if (!entry.value().fullClassification().isEmpty()) {
                    officialSummaryCache.put(key, entry);
                }
            },
            "No se pudo obtener el resumen oficial del Gran Premio."
        ));
    }

    public NextRaceInfo nextRace() {
        var cached = nextRaceCache;
        if (cached != null && !cached.isExpired()) {
            return cached.value();
        }
        return coalesce("next-race", () -> executeProtected(
            nextRaceCache,
            () -> {
                var envelope = callJolpica(client::getNextRace);
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
            },
            entry -> nextRaceCache = entry,
            "No se pudo consultar la próxima carrera de Formula 1."
        ));
    }

    public LastRaceInfo lastRaceResults() {
        var cached = lastRaceCache;
        if (cached != null && !cached.isExpired()) {
            return cached.value();
        }
        return coalesce("last-race", () -> executeProtected(
            lastRaceCache,
            () -> {
                var envelope = callJolpica(() -> client.getLastResults(30));
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
            },
            entry -> lastRaceCache = entry,
            "No se pudo consultar la última carrera de Formula 1."
        ));
    }

    // ==================================================
    // CAMPEONATOS Y ESTADISTICAS DE PILOTOS
    // ==================================================
    public List<DriverStandingInfo> driverStandings() {
        var cached = driverStandingsCache;
        if (cached != null && !cached.isExpired()) {
            return cached.value();
        }
        return coalesce("driver-standings", () -> executeProtected(
            driverStandingsCache,
            () -> {
                var envelope = callJolpica(client::getDriverStandings);
                var lists = envelope != null && envelope.data() != null && envelope.data().table() != null
                        ? envelope.data().table().lists()
                        : null;
                if (lists == null || lists.isEmpty() || lists.getFirst().driverStandings() == null) {
                    return List.of();
                }
                return lists.getFirst().driverStandings().stream()
                        .map(s -> new DriverStandingInfo(
                                s.position(),
                                s.points(),
                                s.wins(),
                                s.driver() != null ? s.driver().id() : "",
                                s.driver() != null ? Objects.requireNonNullElse(s.driver().code(), "") : "",
                                s.driver() != null
                                        ? (Objects.requireNonNullElse(s.driver().givenName(), "") + " "
                                                + Objects.requireNonNullElse(s.driver().familyName(), "")).trim()
                                        : "",
                                s.driver() != null ? Objects.requireNonNullElse(s.driver().nationality(), "") : "",
                                s.constructors() != null && !s.constructors().isEmpty() ? s.constructors().getFirst().name()
                                        : "F1 Team"))
                        .toList();
            },
            entry -> {
                if (!entry.value().isEmpty()) {
                    driverStandingsCache = entry;
                }
            },
            "No se pudo consultar la tabla de pilotos."
        ));
    }

    public List<ConstructorStandingInfo> constructorStandings() {
        var cached = constructorStandingsCache;
        if (cached != null && !cached.isExpired()) {
            return cached.value();
        }
        return coalesce("constructor-standings", () -> executeProtected(
            constructorStandingsCache,
            () -> {
                var envelope = callJolpica(client::getConstructorStandings);
                var lists = envelope != null && envelope.data() != null && envelope.data().table() != null
                        ? envelope.data().table().lists()
                        : null;
                if (lists == null || lists.isEmpty() || lists.getFirst().constructorStandings() == null) {
                    return List.of();
                }
                return lists.getFirst().constructorStandings().stream()
                        .map(s -> new ConstructorStandingInfo(
                                s.position(),
                                s.points(),
                                s.wins(),
                                s.constructor() != null ? Objects.requireNonNullElse(s.constructor().id(), "") : "",
                                s.constructor() != null ? Objects.requireNonNullElse(s.constructor().name(), "") : "",
                                s.constructor() != null ? Objects.requireNonNullElse(s.constructor().nationality(), "")
                                        : ""))
                        .toList();
            },
            entry -> {
                if (!entry.value().isEmpty()) {
                    constructorStandingsCache = entry;
                }
            },
            "No se pudo consultar la tabla de constructores."
        ));
    }

    public DriverDynamicStats driverStats(String rawDriverId) {
        if (rawDriverId == null || rawDriverId.isBlank()) {
            throw new IllegalArgumentException("Identificador de piloto requerido.");
        }
        String cleanId = normalizeDriverId(rawDriverId);
        var fresh = driverStatsCache.get(cleanId);
        if (fresh != null && !fresh.isExpired()) {
            return fresh.value();
        }
        String jolpicaId = toJolpicaDriverId(cleanId);
        return coalesce("driver-stats:" + cleanId, () -> loadDriverStats(cleanId, jolpicaId));
    }

    private DriverDynamicStats loadDriverStats(String cleanId, String jolpicaId) {
        var cached = driverStatsCache.get(cleanId);
        if (cached != null && !cached.isExpired()) {
            return cached.value();
        }

        DriverStandingInfo standing = findDriverStandingQuietly(cleanId);

        if (!circuitBreaker.allowRequest()) {
            if (cached != null) {
                log.warn("Circuit breaker OPEN: sirviendo estadisticas en cache stale para {}.", cleanId);
                return cached.value();
            }
            if (standing != null) {
                log.warn("Circuit breaker OPEN: devolviendo estadisticas parciales desde standings para {}.", cleanId);
                return buildStandingFallbackStats(cleanId, standing);
            }
            throw new F1UnavailableException("No se pudieron consultar estadísticas del piloto. (Circuit Breaker activo).", null);
        }

        JolpicaDto.DetailedEnvelope seasonEnvelope;
        try {
            seasonEnvelope = callJolpica(() -> client.getDriverSeasonResults(jolpicaId, 50));
            circuitBreaker.recordSuccess();
        } catch (Exception ex) {
            if (!isRateLimited(ex)) {
                circuitBreaker.recordFailure();
            }
            if (cached != null) {
                log.warn("Falla consultando resultados de temporada para {} ({}); usando cache stale.", cleanId, ex.getMessage());
                return cached.value();
            }
            if (standing != null) {
                log.warn("Falla consultando resultados de temporada para {} ({}); usando fallback de standings.", cleanId, ex.getMessage());
                return buildStandingFallbackStats(cleanId, standing);
            }
            throw new F1UnavailableException("No se pudieron consultar estadísticas del piloto.", ex);
        }

        int points = standing != null ? safeParseInt(standing.points(), 0) : 0;
        String standingPos = standing != null && standing.position() != null && !standing.position().isBlank()
                ? "P" + standing.position()
                : "-";
        int standingWins = standing != null ? safeParseInt(standing.wins(), 0) : 0;

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
            if (race.results() == null || race.results().isEmpty()) {
                continue;
            }
            var res = race.results().getFirst();
            int pos = safeParseInt(res.position(), 0);
            int grid = safeParseInt(res.grid(), 0);
            String status = Objects.requireNonNullElse(res.status(), "");

            if (pos > 0 && pos < bestPos) {
                bestPos = pos;
            }
            if (pos == 1) {
                seasonWins++;
            }
            if (pos >= 1 && pos <= 3) {
                podiums++;
            }
            if (grid == 1) {
                poles++;
            }
            if (res.fastestLap() != null && "1".equals(res.fastestLap().rank())) {
                fastestLaps++;
            }

            String stLower = status.toLowerCase(Locale.ROOT);
            if (!stLower.isEmpty() && !stLower.equals("finished") && !stLower.equals("lapped")
                    && !stLower.startsWith("+")) {
                dnfs++;
            }

            seasonResults.add(new DriverSeasonResult(
                    safeParseInt(race.round(), 0),
                    race.raceName(),
                    pos,
                    grid,
                    status));
        }

        int wins = seasonWins > 0 ? seasonWins : standingWins;
        CareerTotals career = fetchCareerTotals(cleanId, jolpicaId, wins, poles, races.size());

        DriverDynamicStats computed = new DriverDynamicStats(
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
                career.wins(),
                career.poles(),
                career.starts(),
                List.copyOf(seasonResults));

        driverStatsCache.put(cleanId, CacheEntry.of(computed, CACHE_TTL));
        return computed;
    }

    private DriverStandingInfo findDriverStandingQuietly(String cleanId) {
        List<DriverStandingInfo> standings = List.of();
        try {
            standings = driverStandings();
        } catch (Exception ex) {
            var stale = driverStandingsCache;
            if (stale != null) {
                standings = stale.value();
            }
            log.debug("Standings no disponibles para estadísticas de piloto {}: {}", cleanId, ex.getMessage());
        }
        return standings.stream()
                .filter(s -> normalizeDriverId(s.driverId()).equals(cleanId))
                .findFirst()
                .orElse(null);
    }

    private DriverDynamicStats buildStandingFallbackStats(String cleanId, DriverStandingInfo standing) {
        int points = safeParseInt(standing.points(), 0);
        String standingPos = standing.position() != null && !standing.position().isBlank()
                ? "P" + standing.position()
                : "-";
        int wins = safeParseInt(standing.wins(), 0);
        var cachedCareer = careerTotalsCache.get(cleanId);
        int careerWins = cachedCareer != null ? cachedCareer.value().wins() : wins;
        int careerPoles = cachedCareer != null ? cachedCareer.value().poles() : 0;
        int careerStarts = cachedCareer != null ? cachedCareer.value().starts() : 0;
        return new DriverDynamicStats(
                cleanId,
                standing.nationality() != null ? standing.nationality() : "",
                points,
                standingPos,
                wins,
                0,
                0,
                0,
                0,
                0,
                "-",
                careerWins,
                careerPoles,
                careerStarts,
                List.of());
    }

    private CareerTotals fetchCareerTotals(
        String cleanId,
        String jolpicaId,
        int fallbackWins,
        int fallbackPoles,
        int fallbackStarts
    ) {
        var cached = careerTotalsCache.get(cleanId);
        if (cached != null && !cached.isExpired()) {
            return cached.value();
        }

        int baseWins = cached != null ? cached.value().wins() : fallbackWins;
        int basePoles = cached != null ? cached.value().poles() : fallbackPoles;
        int baseStarts = cached != null ? cached.value().starts() : fallbackStarts;

        Integer careerWins = tryFetchCareerTotal(() -> client.getDriverCareerWins(jolpicaId, 1));
        if (careerWins == null) {
            return new CareerTotals(baseWins, basePoles, baseStarts);
        }
        Integer careerPoles = tryFetchCareerTotal(() -> client.getDriverCareerPoles(jolpicaId, 1));
        if (careerPoles == null) {
            return new CareerTotals(careerWins, basePoles, baseStarts);
        }
        Integer careerStarts = tryFetchCareerTotal(() -> client.getDriverCareerStarts(jolpicaId, 1));
        if (careerStarts == null) {
            return new CareerTotals(careerWins, careerPoles, baseStarts);
        }

        CareerTotals totals = new CareerTotals(careerWins, careerPoles, careerStarts);
        careerTotalsCache.put(cleanId, CacheEntry.of(totals, CAREER_CACHE_TTL));
        return totals;
    }

    private @Nullable Integer tryFetchCareerTotal(Supplier<JolpicaDto.DetailedEnvelope> call) {
        try {
            var env = callJolpica(call);
            if (env != null && env.data() != null && env.data().total() != null) {
                return Integer.parseInt(env.data().total());
            }
        } catch (Exception ex) {
            log.debug("Totales historicos omitidos temporalmente: {}", ex.getMessage());
        }
        return null;
    }

    // ==================================================
    // CONSULTAS COMPLEMENTARIAS (SPRINT, QUALY, OPENF1)
    // ==================================================
    private void mergeSprintPoints(int season, int round, Map<String, Double> weekendPoints) {
        try {
            var s = callJolpica(() -> client.getSprintResults(season, round, 30));
            var races = s != null && s.data() != null && s.data().table() != null ? s.data().table().races() : null;
            if (races == null || races.isEmpty()) {
                return;
            }
            var sprintResults = races.getFirst().sprintResults();
            if (sprintResults == null || sprintResults.isEmpty()) {
                return;
            }
            for (var sr : sprintResults) {
                String normDriver = normalizeDriverId(sr.driver() != null ? sr.driver().id() : null);
                if (normDriver != null && !normDriver.isBlank()) {
                    double pts = safeParseDouble(sr.points(), 0.0);
                    weekendPoints.merge(normDriver, pts, Double::sum);
                }
            }
        } catch (Exception ex) {
            log.debug("Sin resultados Sprint para {}-{}: {}", season, round, ex.getMessage());
        }
    }

    private String fetchPoleDriver(int season, int round) {
        try {
            var q = callJolpica(() -> client.getQualifying(season, round, 5));
            var races = q != null && q.data() != null && q.data().table() != null ? q.data().table().races() : null;
            if (races == null || races.isEmpty()) {
                return null;
            }
            var qualResults = races.getFirst().qualifyingResults();
            if (qualResults == null || qualResults.isEmpty()) {
                return null;
            }
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
            if (sessions == null || sessions.isEmpty()) {
                return 0;
            }

            var matched = sessions.stream()
                    .filter(s -> s.date_start() != null && s.date_start().startsWith(raceDate))
                    .findFirst()
                    .orElse(null);
            if (matched == null) {
                return 0;
            }

            var messages = openF1Client.getRaceControl(matched.session_key());
            if (messages == null) {
                return 0;
            }
            return (int) messages.stream()
                    .filter(m -> "SafetyCar".equalsIgnoreCase(m.category())
                            && m.message() != null
                            && m.message().toUpperCase(Locale.ROOT).contains("DEPLOYED"))
                    .count();
        } catch (Exception ignored) {
            return 0;
        }
    }

    // ==================================================
    // UTILIDADES Y NORMALIZACION
    // ==================================================
    public static String normalizeDriverId(String driverId) {
        if (driverId == null) {
            return null;
        }
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
        if (driverId == null) {
            return "";
        }
        String clean = driverId.trim().toLowerCase(Locale.ROOT);
        return switch (clean) {
            case "verstappen" -> "max_verstappen";
            case "lindblad" -> "arvid_lindblad";
            default -> clean;
        };
    }

    private static String combineDateTime(String date, String time, String defaultTime) {
        if (date == null || date.isBlank()) {
            return null;
        }
        String t = (time != null && !time.isBlank()) ? time : defaultTime;
        return date + "T" + t;
    }

    private static String formatSessionTime(JolpicaDto.SessionTimeDto s) {
        if (s == null || s.date() == null || s.date().isBlank()) {
            return null;
        }
        return combineDateTime(s.date(), s.time(), "15:00:00Z");
    }

    private static int safeParseInt(String val, int fallback) {
        try {
            return val != null ? Integer.parseInt(val.trim()) : fallback;
        } catch (NumberFormatException ex) {
            return fallback;
        }
    }

    private static double safeParseDouble(String val, double fallback) {
        try {
            return val != null ? Double.parseDouble(val.trim()) : fallback;
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

    private record CareerTotals(int wins, int poles, int starts) {}

    private record CacheEntry<T>(T value, Instant expiresAt) {
        static <T> CacheEntry<T> of(T value, Duration ttl) {
            return new CacheEntry<>(value, Instant.now().plus(ttl));
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
