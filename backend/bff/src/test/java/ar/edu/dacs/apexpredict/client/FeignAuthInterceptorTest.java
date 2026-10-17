package ar.edu.dacs.apexpredict.client;

import feign.RequestTemplate;
import java.time.Instant;
import java.util.List;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;

import static org.junit.jupiter.api.Assertions.*;

class FeignAuthInterceptorTest {
    @AfterEach
    void clearContext() {
        SecurityContextHolder.clearContext();
    }

    @Test
    void forwardsTheAuthenticatedBearerTokenToTheDomain() {
        var jwt = Jwt.withTokenValue("authenticated-access-token").header("alg", "RS256")
            .subject("player").issuedAt(Instant.now()).expiresAt(Instant.now().plusSeconds(300)).build();
        SecurityContextHolder.getContext().setAuthentication(new JwtAuthenticationToken(jwt));
        var template = new RequestTemplate();

        new FeignAuthInterceptor().apply(template);

        assertEquals(List.of("Bearer authenticated-access-token"), List.copyOf(template.headers().get("Authorization")));
    }

    @Test
    void publicCallsDoNotInventABearerToken() {
        var template = new RequestTemplate();
        new FeignAuthInterceptor().apply(template);
        assertFalse(template.headers().containsKey("Authorization"));
    }
}
