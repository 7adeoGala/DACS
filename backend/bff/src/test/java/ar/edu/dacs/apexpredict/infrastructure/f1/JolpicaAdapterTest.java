package ar.edu.dacs.apexpredict.infrastructure.f1;

import java.time.Instant;
import org.junit.jupiter.api.*;
import org.springframework.http.MediaType;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.web.client.RestClient;
import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.requestTo;
import static org.springframework.test.web.client.response.MockRestResponseCreators.*;

class JolpicaAdapterTest {
    private MockRestServiceServer server;
    private JolpicaAdapter adapter;
    @BeforeEach void setup() {
        var builder = RestClient.builder().baseUrl("https://api.jolpi.ca/ergast/f1");
        server = MockRestServiceServer.bindTo(builder).build();
        adapter = new JolpicaAdapter(builder.build());
    }
    @Test void parsesScheduleAndUtcStart() {
        server.expect(requestTo("https://api.jolpi.ca/ergast/f1/2026/?limit=100&offset=0")).andRespond(withSuccess("""
            {"MRData":{"total":"1","RaceTable":{"Races":[{"season":"2026","round":"1","raceName":"Australian Grand Prix","date":"2026-03-08","time":"04:00:00Z","Circuit":{"circuitName":"Albert Park","Location":{"country":"Australia"}}}]}}}
            """, MediaType.APPLICATION_JSON));
        var races = adapter.calendar(2026);
        assertEquals("Albert Park", races.getFirst().circuit());
        assertEquals(Instant.parse("2026-03-08T04:00:00Z"), races.getFirst().startsAt());
        server.verify();
    }
    @Test void parsesResults() {
        server.expect(requestTo("https://api.jolpi.ca/ergast/f1/2025/1/results/?limit=100&offset=0")).andRespond(withSuccess("""
            {"MRData":{"total":"1","RaceTable":{"Races":[{"Results":[{"position":"1","Driver":{"driverId":"norris","givenName":"Lando","familyName":"Norris"},"Constructor":{"name":"McLaren"},"status":"Finished"}]}]}}}
            """, MediaType.APPLICATION_JSON));
        assertEquals("norris", adapter.results(2025, 1).getFirst().driverId());
        server.verify();
    }
    @Test void unavailableProviderIsNotAnEmptyCalendar() {
        server.expect(requestTo("https://api.jolpi.ca/ergast/f1/2026/?limit=100&offset=0")).andRespond(withServerError());
        assertThrows(JolpicaAdapter.F1UnavailableException.class, () -> adapter.calendar(2026));
    }
    @Test void missingTimeRemainsUnknown() {
        server.expect(requestTo("https://api.jolpi.ca/ergast/f1/2026/?limit=100&offset=0")).andRespond(withSuccess("""
            {"MRData":{"total":"1","RaceTable":{"Races":[{"season":"2026","round":"1","raceName":"Race","date":"2026-03-08","Circuit":{"circuitName":"Circuit","Location":{"country":"Country"}}}]}}}
            """, MediaType.APPLICATION_JSON));
        assertNull(adapter.calendar(2026).getFirst().startsAt());
    }
}
