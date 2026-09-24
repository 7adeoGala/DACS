package ar.edu.dacs.apexpredict.infrastructure.f1;

import ar.edu.dacs.apexpredict.application.F1DataProvider;
import com.fasterxml.jackson.annotation.JsonProperty;
import java.net.http.HttpClient;
import java.time.*;
import java.util.*;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.client.JdkClientHttpRequestFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

@Component
public class JolpicaAdapter implements F1DataProvider {
    private final RestClient client;

    @Autowired
    public JolpicaAdapter(@Value("${apexpredict.jolpica.base-url}") String baseUrl) {
        if (!baseUrl.startsWith("https://")) throw new IllegalArgumentException("Jolpica requiere HTTPS.");
        var factory = new JdkClientHttpRequestFactory(HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(5)).build());
        factory.setReadTimeout(Duration.ofSeconds(10));
        this.client = RestClient.builder().baseUrl(baseUrl).requestFactory(factory)
            .defaultHeader("User-Agent", "ApexPredict-DACS/0.1").build();
    }

    // Punto de inyeccion para pruebas del contrato HTTP sin acceso a Internet.
    JolpicaAdapter(RestClient client) { this.client = client; }

    @Override public List<Race> calendar(int season) {
        validateSeason(season);
        try {
            return races("/" + season + "/").stream().map(r -> new Race(
                Integer.parseInt(r.season()), Integer.parseInt(r.round()), Objects.requireNonNull(r.name()),
                r.circuit().name(), r.circuit().location().country(), LocalDate.parse(r.date()),
                r.time() == null ? null : Instant.parse(r.date() + "T" + r.time())
            )).toList();
        } catch (RuntimeException ex) { throw unavailable(ex); }
    }

    @Override public List<Finish> results(int season, int round) {
        validateSeason(season);
        if (round < 1 || round > 40) throw new IllegalArgumentException("Ronda fuera de rango.");
        try {
            return races("/" + season + "/" + round + "/results/").stream()
                .flatMap(r -> Objects.requireNonNullElse(r.results(), List.<ResultDto>of()).stream())
                .map(r -> new Finish(Integer.parseInt(r.position()), r.driver().id(),
                    r.driver().givenName() + " " + r.driver().familyName(), r.constructor().name(), r.status()))
                .sorted(Comparator.comparingInt(Finish::position)).toList();
        } catch (RuntimeException ex) { throw unavailable(ex); }
    }

    private List<RaceDto> races(String path) {
        var collected = new ArrayList<RaceDto>();
        for (int offset = 0; offset < 1000; offset += 100) {
            var response = client.get().uri(path + "?limit=100&offset=" + offset).retrieve().body(Envelope.class);
            if (response == null || response.data() == null || response.data().table() == null || response.data().table().races() == null)
                throw new IllegalStateException("Respuesta F1 incompleta.");
            collected.addAll(response.data().table().races());
            if (offset + 100 >= Integer.parseInt(response.data().total())) return List.copyOf(collected);
        }
        throw new IllegalStateException("Respuesta F1 excede el limite de paginacion.");
    }

    private static void validateSeason(int season) {
        if (season < 1950 || season > 2100) throw new IllegalArgumentException("Temporada fuera de rango.");
    }
    private static F1UnavailableException unavailable(RuntimeException cause) { return new F1UnavailableException(cause); }
    public static class F1UnavailableException extends RuntimeException {
        public F1UnavailableException(Throwable cause) { super("No se pudo consultar el proveedor de Formula 1.", cause); }
    }
    record Envelope(@JsonProperty("MRData") Metadata data) {}
    record Metadata(String total, @JsonProperty("RaceTable") RaceTable table) {}
    record RaceTable(@JsonProperty("Races") List<RaceDto> races) {}
    record RaceDto(String season, String round, @JsonProperty("raceName") String name, String date, String time,
        @JsonProperty("Circuit") Circuit circuit, @JsonProperty("Results") List<ResultDto> results) {}
    record Circuit(@JsonProperty("circuitName") String name, @JsonProperty("Location") Location location) {}
    record Location(String country) {}
    record ResultDto(String position, @JsonProperty("Driver") Driver driver,
        @JsonProperty("Constructor") Constructor constructor, String status) {}
    record Driver(@JsonProperty("driverId") String id, String givenName, String familyName) {}
    record Constructor(String name) {}
}
