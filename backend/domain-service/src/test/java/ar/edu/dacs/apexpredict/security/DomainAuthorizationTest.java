package ar.edu.dacs.apexpredict.security;

import ar.edu.dacs.apexpredict.application.NotificationService;
import ar.edu.dacs.apexpredict.application.PlayerService;
import ar.edu.dacs.apexpredict.application.PredictionService;
import ar.edu.dacs.apexpredict.application.ScoringService;
import ar.edu.dacs.apexpredict.web.DomainController;
import ar.edu.dacs.apexpredict.web.DomainExceptionHandler;
import ar.edu.dacs.apexpredict.web.PredictionController;
import java.time.Instant;
import java.util.*;
import org.junit.jupiter.api.*;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.*;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.oauth2.jwt.*;
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

@SpringJUnitConfig(DomainAuthorizationTest.Config.class)
@WebAppConfiguration
class DomainAuthorizationTest {

    @Configuration
    @EnableWebMvc
    @EnableWebSecurity
    @Import({SecurityConfig.class, DomainController.class, PredictionController.class, DomainExceptionHandler.class})
    static class Config {
        @Bean
        PlayerService players() {
            return mock(PlayerService.class);
        }

        @Bean
        NotificationService notifications() {
            return mock(NotificationService.class);
        }

        @Bean
        PredictionService predictions() {
            return mock(PredictionService.class);
        }

        @Bean
        ScoringService scoring() {
            return mock(ScoringService.class);
        }

        @Bean
        JwtDecoder decoder() {
            return mock(JwtDecoder.class);
        }
    }

    @Autowired
    WebApplicationContext context;
    @Autowired
    JwtDecoder decoder;
    @Autowired
    PredictionService predictions;

    private MockMvc mvc;

    @BeforeEach
    void setup() {
        mvc = MockMvcBuilders.webAppContextSetup(context).apply(springSecurity()).build();
        when(predictions.getNextScheduledSession()).thenReturn(new PredictionService.NextSessionView(
            UUID.fromString("00000000-0000-0000-0000-000000000001"), 2026, 1,
            "Test Grand Prix", "Test Circuit", "RACE", "2026-10-18", null, false, null, null));
        for (String role : List.of("player", "admin", "observer")) {
            when(decoder.decode(role)).thenReturn(Jwt.withTokenValue(role).header("alg", "RS256")
                .subject(role).issuer("https://dacs2026.local/auth/realms/apexpredict")
                .audience(List.of("apexpredict-backend"))
                .issuedAt(Instant.now()).expiresAt(Instant.now().plusSeconds(300))
                .claim("preferred_username", role)
                .claim("email", role + "@example.com")
                .claim("realm_access", Map.of("roles", List.of(role))).build());
        }
    }

    @Test
    void pingIsPublic() throws Exception {
        mvc.perform(get("/ping"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.service").value("apexpredict-domain-service"))
            .andExpect(jsonPath("$.status").value("UP"));
    }

    @Test
    void duelStatsIsPublic() throws Exception {
        when(predictions.getNextSessionDuelStats()).thenReturn(new PredictionService.DuelCommunityStats(
            UUID.fromString("00000000-0000-0000-0000-000000000001"), "bearman", "ocon", 2, 1, 3, 67, 33));
        mvc.perform(get("/sessions/next/duel-stats"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.totalVotes").value(3));
    }

    @Test
    void unauthenticatedRouteReturns401WithDacsFormat() throws Exception {
        mvc.perform(get("/leagues"))
            .andExpect(status().isUnauthorized())
            .andExpect(jsonPath("$.status").value(401))
            .andExpect(jsonPath("$.code").value("backend_401"))
            .andExpect(jsonPath("$.description").exists())
            .andExpect(jsonPath("$.message").exists());
    }

    @Test
    void playerCanAccessLeagues() throws Exception {
        mvc.perform(get("/leagues").header("Authorization", "Bearer player"))
            .andExpect(status().isOk());
    }

    @Test
    void playerCannotAccessAdminRoute() throws Exception {
        mvc.perform(get("/admin/status").header("Authorization", "Bearer player"))
            .andExpect(status().isForbidden())
            .andExpect(jsonPath("$.status").value(403))
            .andExpect(jsonPath("$.code").value("backend_403"))
            .andExpect(jsonPath("$.description").exists())
            .andExpect(jsonPath("$.message").exists());
    }

    @Test
    void missingRoleReturns403() throws Exception {
        mvc.perform(get("/leagues").header("Authorization", "Bearer observer"))
            .andExpect(status().isForbidden())
            .andExpect(jsonPath("$.status").value(403))
            .andExpect(jsonPath("$.code").value("backend_403"));
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
    void adminCanAccessAdminRoute() throws Exception {
        mvc.perform(get("/admin/status").header("Authorization", "Bearer admin"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.status").value("authorized"));
    }

    @Test
    void adminSessionsAndSyncRequireAdminRole() throws Exception {
        String sessionId = "00000000-0000-0000-0000-000000000001";
        mvc.perform(get("/admin/sessions")).andExpect(status().isUnauthorized());
        mvc.perform(get("/admin/sessions").header("Authorization", "Bearer player")).andExpect(status().isForbidden());
        mvc.perform(get("/admin/sessions").header("Authorization", "Bearer admin")).andExpect(status().isOk());

        mvc.perform(post("/admin/sessions/sync").header("Authorization", "Bearer player")).andExpect(status().isForbidden());
        mvc.perform(post("/admin/sessions/sync").header("Authorization", "Bearer admin"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.status").value("SUCCESS"));

        mvc.perform(post("/admin/sessions/" + sessionId + "/score").header("Authorization", "Bearer player"))
            .andExpect(status().isForbidden());
        mvc.perform(post("/admin/sessions/" + sessionId + "/score").header("Authorization", "Bearer admin"))
            .andExpect(status().isOk());
    }
}
