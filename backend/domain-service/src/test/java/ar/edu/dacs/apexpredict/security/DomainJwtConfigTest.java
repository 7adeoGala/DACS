package ar.edu.dacs.apexpredict.security;

import com.nimbusds.jose.*;
import com.nimbusds.jose.crypto.RSASSASigner;
import com.nimbusds.jose.jwk.*;
import com.nimbusds.jose.jwk.gen.RSAKeyGenerator;
import com.nimbusds.jwt.*;
import java.time.Instant;
import java.util.Date;
import org.junit.jupiter.api.*;
import org.springframework.security.oauth2.jwt.*;
import static org.junit.jupiter.api.Assertions.*;

class DomainJwtConfigTest {
    private static final String ISSUER = "https://dacs2026.local/auth/realms/apexpredict";
    private RSAKey key;
    private NimbusJwtDecoder decoder;

    @BeforeEach
    void setup() throws Exception {
        key = new RSAKeyGenerator(2048).generate();
        decoder = NimbusJwtDecoder.withPublicKey(key.toRSAPublicKey()).build();
        decoder.setJwtValidator(JwtConfig.validators(ISSUER, "apexpredict-backend"));
    }

    private String token(RSAKey signingKey, String issuer, String audience, Instant expiration) throws Exception {
        var claims = new JWTClaimsSet.Builder().issuer(issuer).subject("player-id").audience(audience)
            .issueTime(Date.from(Instant.now().minusSeconds(300))).expirationTime(Date.from(expiration)).build();
        var jwt = new SignedJWT(new JWSHeader(JWSAlgorithm.RS256), claims);
        jwt.sign(new RSASSASigner(signingKey));
        return jwt.serialize();
    }

    @Test
    void acceptsSignedTokenForBackend() throws Exception {
        assertEquals("player-id", decoder.decode(token(key, ISSUER, "apexpredict-backend", Instant.now().plusSeconds(300))).getSubject());
    }

    @Test
    void rejectsForeignAudience() throws Exception {
        var token = token(key, ISSUER, "apexpredict-bff", Instant.now().plusSeconds(300));
        assertThrows(JwtException.class, () -> decoder.decode(token));
    }

    @Test
    void rejectsForeignIssuer() throws Exception {
        var token = token(key, "https://attacker.invalid", "apexpredict-backend", Instant.now().plusSeconds(300));
        assertThrows(JwtException.class, () -> decoder.decode(token));
    }

    @Test
    void rejectsExpiredToken() throws Exception {
        var token = token(key, ISSUER, "apexpredict-backend", Instant.now().minusSeconds(120));
        assertThrows(JwtException.class, () -> decoder.decode(token));
    }

    @Test
    void rejectsForgedSignature() throws Exception {
        var token = token(new RSAKeyGenerator(2048).generate(), ISSUER, "apexpredict-backend", Instant.now().plusSeconds(300));
        assertThrows(JwtException.class, () -> decoder.decode(token));
    }
}
