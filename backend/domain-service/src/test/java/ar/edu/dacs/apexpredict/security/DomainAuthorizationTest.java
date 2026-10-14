package ar.edu.dacs.apexpredict.security;

import ar.edu.dacs.apexpredict.application.PlayerService;
import ar.edu.dacs.apexpredict.web.DomainController;
import ar.edu.dacs.apexpredict.web.DomainExceptionHandler;
import java.time.Instant;
import java.util.*;
import org.junit.jupiter.api.*;
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
    @Import({SecurityConfig.class, DomainController.class, DomainExceptionHandler.class})
    static class Config {
        @Bean
        PlayerService players() {
            return mock(PlayerService.class);
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

    private MockMvc mvc;

    @BeforeEach
    void setup() {
        mvc = MockMvcBuilders.webAppContextSetup(context).apply(springSecurity()).build();
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

    @Test
    void adminCanAccessAdminRoute() throws Exception {
        mvc.perform(get("/admin/status").header("Authorization", "Bearer admin"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.status").value("authorized"));
    }
}
