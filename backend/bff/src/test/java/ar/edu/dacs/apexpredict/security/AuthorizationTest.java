package ar.edu.dacs.apexpredict.security;

import ar.edu.dacs.apexpredict.application.ProdeScoreService;
import ar.edu.dacs.apexpredict.client.ConectorClient;
import ar.edu.dacs.apexpredict.client.DomainClient;
import ar.edu.dacs.apexpredict.web.ApiController;
import ar.edu.dacs.apexpredict.web.ApiExceptionHandler;
import ar.edu.dacs.apexpredict.web.dto.*;
import feign.FeignException;
import feign.Request;
import feign.RequestTemplate;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.*;
import org.junit.jupiter.api.*;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.*;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.oauth2.jwt.*;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.context.junit.jupiter.SpringJUnitConfig;
import org.springframework.test.context.web.WebAppConfiguration;
import org.springframework.test.web.servlet.*;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.context.WebApplicationContext;
import org.springframework.web.servlet.config.annotation.EnableWebMvc;

import static org.mockito.Mockito.*;
import static org.springframework.security.test.web.servlet.setup.SecurityMockMvcConfigurers.springSecurity;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringJUnitConfig(AuthorizationTest.Config.class)
@WebAppConfiguration
@TestPropertySource(properties = "apexpredict.security.cors-origins=http://localhost:4200,https://dacs2026.local,https://dacs-nine.vercel.app")
class AuthorizationTest {

    @Configuration
    @EnableWebMvc
    @EnableWebSecurity
    @Import({SecurityConfig.class, ApiController.class, ApiExceptionHandler.class, ProdeScoreService.class})
    static class Config {
        @Bean
        DomainClient domainClient() {
            return mock(DomainClient.class);
        }

        @Bean
        ConectorClient conectorClient() {
            return mock(ConectorClient.class);
        }

        @Bean
        JwtDecoder decoder() {
            return mock(JwtDecoder.class);
        }
    }

    @Autowired
    WebApplicationContext context;
    @Autowired
    DomainClient domainClient;
    @Autowired
    ConectorClient conectorClient;
    @Autowired
    JwtDecoder decoder;

    private MockMvc mvc;

    @BeforeEach
    void setup() {
        mvc = MockMvcBuilders.webAppContextSetup(context).apply(springSecurity()).build();
        for (String role : List.of("player", "admin", "observer")) {
            when(decoder.decode(role)).thenReturn(Jwt.withTokenValue(role).header("alg", "RS256")
                .subject(role).issuer("https://dacs2026.local/auth/realms/apexpredict")
                .audience(List.of("apexpredict-bff"))
                .issuedAt(Instant.now()).expiresAt(Instant.now().plusSeconds(300))
                .claim("preferred_username", role)
                .claim("email", role + "@example.com")
                .claim("realm_access", Map.of("roles", List.of(role))).build());
        }
    }

    @Test
    void publicHealthWorksWithoutToken() throws Exception {
        mvc.perform(get("/health"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.service").value("apexpredict-bff"))
            .andExpect(jsonPath("$.status").value("UP"));
    }

    @Test
    void publicPingWorksWithoutToken() throws Exception {
        mvc.perform(get("/ping"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.service").value("apexpredict-bff"))
            .andExpect(jsonPath("$.status").value("UP"));
    }

    @Test
    void backendPingDelegatesToDomainService() throws Exception {
        when(domainClient.ping()).thenReturn(Map.of("service", "apexpredict-domain-service", "status", "UP"));
        mvc.perform(get("/backendping"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.service").value("apexpredict-domain-service"))
            .andExpect(jsonPath("$.status").value("UP"));
    }

    @Test
    void conectorPingDelegatesToConnector() throws Exception {
        when(conectorClient.ping()).thenReturn(Map.of("service", "apexpredict-f1-connector", "status", "UP"));
        mvc.perform(get("/conectorping"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.service").value("apexpredict-f1-connector"))
            .andExpect(jsonPath("$.status").value("UP"));
    }

    @Test
    void unauthenticatedPlayerRouteIs401WithDacsFormat() throws Exception {
        mvc.perform(get("/leagues"))
            .andExpect(status().isUnauthorized())
            .andExpect(jsonPath("$.status").value(401))
            .andExpect(jsonPath("$.code").value("bff_401"))
            .andExpect(jsonPath("$.description").exists())
            .andExpect(jsonPath("$.message").exists());
    }

    @Test
    void playerCanReadOwnLeagues() throws Exception {
        when(domainClient.leagues()).thenReturn(List.of(new LeagueView(UUID.randomUUID(), "Test League")));
        mvc.perform(get("/leagues").header("Authorization", "Bearer player"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$[0].name").value("Test League"));
    }

    @Test
    void playerCannotUseAdminRouteReturns403WithDacsFormat() throws Exception {
        mvc.perform(get("/admin/status").header("Authorization", "Bearer player"))
            .andExpect(status().isForbidden())
            .andExpect(jsonPath("$.status").value(403))
            .andExpect(jsonPath("$.code").value("bff_403"))
            .andExpect(jsonPath("$.description").exists())
            .andExpect(jsonPath("$.message").exists());
    }

    @Test
    void missingRoleIs403WithDacsFormat() throws Exception {
        mvc.perform(get("/leagues").header("Authorization", "Bearer observer"))
            .andExpect(status().isForbidden())
            .andExpect(jsonPath("$.status").value(403))
            .andExpect(jsonPath("$.code").value("bff_403"));
    }

    @ParameterizedTest
    @ValueSource(strings = {"/sessions/next", "/leaderboard/global", "/predictions/current",
        "/predictions/history", "/predictions/session/00000000-0000-0000-0000-000000000001", "/notifications"})
    void dashboardReadsRequirePlayerOrAdmin(String path) throws Exception {
        mvc.perform(get(path)).andExpect(status().isUnauthorized());
        mvc.perform(get(path).header("Authorization", "Bearer observer"))
            .andExpect(status().isForbidden());
        for (String role : List.of("player", "admin")) {
            mvc.perform(get(path).header("Authorization", "Bearer " + role))
                .andExpect(status().isOk());
        }
    }

    @Test
    void submittingPredictionsRequiresPlayerOrAdmin() throws Exception {
        String path = "/predictions/session/00000000-0000-0000-0000-000000000001";
        String body = "{\"podium\":[\"norris\",\"piastri\",\"leclerc\"]}";
        mvc.perform(post(path).contentType("application/json").content(body))
            .andExpect(status().isUnauthorized());
        mvc.perform(post(path).header("Authorization", "Bearer observer")
            .contentType("application/json").content(body)).andExpect(status().isForbidden());
        for (String role : List.of("player", "admin")) {
            mvc.perform(post(path).header("Authorization", "Bearer " + role)
                .contentType("application/json").content(body)).andExpect(status().isOk());
        }
    }

    @Test
    void unlistedRoutesAndMethodsRemainDenied() throws Exception {
        for (String role : List.of("player", "admin")) {
            mvc.perform(get("/predictions/unlisted").header("Authorization", "Bearer " + role))
                .andExpect(status().isForbidden());
            mvc.perform(post("/sessions/next").header("Authorization", "Bearer " + role))
                .andExpect(status().isForbidden());
        }
    }

    @Test
    void adminRouteRequiresAdminRole() throws Exception {
        when(domainClient.adminStatus()).thenReturn(Map.of("status", "authorized"));
        mvc.perform(get("/admin/status").header("Authorization", "Bearer admin"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.status").value("authorized"));
    }

    @Test
    void downstreamFailureReturns502DacsFormat() throws Exception {
        Request request = Request.create(Request.HttpMethod.GET, "/conector/calendar/2026", Map.of(), null, StandardCharsets.UTF_8, new RequestTemplate());
        when(conectorClient.calendar(2026)).thenThrow(new FeignException.BadGateway("Downstream 502", request, null, Map.of()));

        mvc.perform(get("/calendar/2026"))
            .andExpect(status().isBadGateway())
            .andExpect(jsonPath("$.status").value(502))
            .andExpect(jsonPath("$.code").value("bff_502"))
            .andExpect(jsonPath("$.description").exists())
            .andExpect(jsonPath("$.message").value("Bad Gateway"));
    }

    @Test
    void corsAcceptsOnlyConfiguredOrigins() throws Exception {
        mvc.perform(options("/me")
            .header("Origin", "http://localhost:4200")
            .header("Access-Control-Request-Method", "PUT")
            .header("Access-Control-Request-Headers", "authorization"))
            .andExpect(status().isOk())
            .andExpect(header().string("Access-Control-Allow-Origin", "http://localhost:4200"));

        mvc.perform(options("/me")
            .header("Origin", "https://dacs-nine.vercel.app")
            .header("Access-Control-Request-Method", "PUT")
            .header("Access-Control-Request-Headers", "authorization,content-type"))
            .andExpect(status().isOk())
            .andExpect(header().string("Access-Control-Allow-Origin", "https://dacs-nine.vercel.app"));

        mvc.perform(options("/me")
            .header("Origin", "https://attacker.invalid")
            .header("Access-Control-Request-Method", "PUT"))
            .andExpect(status().isForbidden());
    }

    @Test
    void publicF1RoutesWorkWithoutToken() throws Exception {
        when(conectorClient.nextRace()).thenReturn(new NextRaceInfo(
            2026, 21, "Las Vegas Grand Prix", "Las Vegas Strip Circuit", "vegas",
            "USA", "Las Vegas", "2026-11-21", "2026-11-22T04:00:00Z",
            null, null, null, null, null, null, "36.11", "-115.17"
        ));
        mvc.perform(get("/f1/next"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.name").value("Las Vegas Grand Prix"));
    }

    @Test
    void scoresRouteOrchestratesDomainAndConnectorForAuthenticatedPlayer() throws Exception {
        when(domainClient.predictionForSession("2026-20")).thenReturn(new PredictionDetail(
            UUID.randomUUID(), UUID.randomUUID(), "São Paulo Grand Prix", "Interlagos",
            Instant.parse("2026-11-08T17:00:00Z"), true,
            List.of("norris", "verstappen", "hadjar"), "norris", "lawson", 0, 2,
            null, Instant.now(), "lawson", "lindblad"
        ));
        when(conectorClient.officialSummary(2026, 20)).thenReturn(new OfficialRaceSummary(
            2026, 20, "Brazilian Grand Prix", "Autódromo José Carlos Pace", "2026-11-08",
            List.of("norris", "max_verstappen", "hadjar", "russell", "antonelli", "piastri", "lawson"),
            List.of("norris", "max_verstappen", "hadjar", "russell", "antonelli", "piastri", "lawson"),
            "norris", 0, 2
        ));

        mvc.perform(get("/scores/me/2026/20"))
            .andExpect(status().isUnauthorized());

        mvc.perform(get("/scores/me/2026/20").header("Authorization", "Bearer player"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.totalPoints").value(29));
    }
}
