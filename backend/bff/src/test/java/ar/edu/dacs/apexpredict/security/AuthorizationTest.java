package ar.edu.dacs.apexpredict.security;

import ar.edu.dacs.apexpredict.application.*;
import ar.edu.dacs.apexpredict.web.ApiController;
import java.time.Instant;
import java.util.*;
import org.junit.jupiter.api.*;
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
@TestPropertySource(properties = "apexpredict.security.cors-origins=http://localhost:4200,https://dacs2026.local")
class AuthorizationTest {
    @Configuration @EnableWebMvc @EnableWebSecurity
    @Import({SecurityConfig.class, ApiController.class})
    static class Config {
        @Bean F1DataProvider f1() { return mock(F1DataProvider.class); }
        @Bean PlayerService players() { return mock(PlayerService.class); }
        @Bean JwtDecoder decoder() { return mock(JwtDecoder.class); }
    }
    @Autowired WebApplicationContext context;
    @Autowired JwtDecoder decoder;
    private MockMvc mvc;
    @BeforeEach void setup() {
        mvc = MockMvcBuilders.webAppContextSetup(context).apply(springSecurity()).build();
        for (String role : List.of("player", "admin", "observer")) {
            when(decoder.decode(role)).thenReturn(Jwt.withTokenValue(role).header("alg", "RS256")
                .subject(role).issuer("https://dacs2026.local/auth/realms/apexpredict")
                .issuedAt(Instant.now()).expiresAt(Instant.now().plusSeconds(300))
                .claim("realm_access", Map.of("roles", List.of(role))).build());
        }
    }
    @Test void publicHealthWorksWithoutToken() throws Exception { mvc.perform(get("/health")).andExpect(status().isOk()); }
    @Test void unauthenticatedPlayerRouteIs401() throws Exception { mvc.perform(get("/leagues")).andExpect(status().isUnauthorized()); }
    @Test void playerCanReadOwnLeagues() throws Exception { mvc.perform(get("/leagues").header("Authorization", "Bearer player")).andExpect(status().isOk()); }
    @Test void playerCannotUseAdminRoute() throws Exception { mvc.perform(get("/admin/status").header("Authorization", "Bearer player")).andExpect(status().isForbidden()); }
    @Test void missingRoleIs403() throws Exception { mvc.perform(get("/leagues").header("Authorization", "Bearer observer")).andExpect(status().isForbidden()); }
    @Test void adminRouteRequiresAdminRole() throws Exception { mvc.perform(get("/admin/status").header("Authorization", "Bearer admin")).andExpect(status().isOk()); }
    @Test void corsAcceptsOnlyConfiguredOrigins() throws Exception {
        mvc.perform(options("/me").header("Origin", "http://localhost:4200").header("Access-Control-Request-Method", "PUT")
            .header("Access-Control-Request-Headers", "authorization")).andExpect(status().isOk())
            .andExpect(header().string("Access-Control-Allow-Origin", "http://localhost:4200"));
        mvc.perform(options("/me").header("Origin", "https://attacker.invalid")
            .header("Access-Control-Request-Method", "PUT")).andExpect(status().isForbidden());
    }
}
