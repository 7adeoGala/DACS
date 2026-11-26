package ar.edu.dacs.apexpredict.application;

import ar.edu.dacs.apexpredict.domain.User;
import ar.edu.dacs.apexpredict.infrastructure.persistence.LeagueMemberRepository;
import ar.edu.dacs.apexpredict.infrastructure.persistence.LeagueRepository;
import ar.edu.dacs.apexpredict.infrastructure.persistence.PredictionRepository;
import ar.edu.dacs.apexpredict.infrastructure.persistence.UserRepository;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;
import org.springframework.http.HttpStatus;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.web.server.ResponseStatusException;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class PlayerServiceTest {

    private static final String ISSUER = "https://dacs-3-u0q1.onrender.com/auth/realms/apexpredict";
    private static final String SUBJECT = "sub-user-1";

    private UserRepository users;
    private PredictionRepository predictions;
    private KeycloakUserSyncService keycloakSync;
    private PlayerService playerService;
    private User user;

    @BeforeEach
    void setUp() {
        users = Mockito.mock(UserRepository.class);
        var leagues = Mockito.mock(LeagueRepository.class);
        var members = Mockito.mock(LeagueMemberRepository.class);
        predictions = Mockito.mock(PredictionRepository.class);
        var scoring = Mockito.mock(ScoringService.class);
        keycloakSync = Mockito.mock(KeycloakUserSyncService.class);

        playerService = new PlayerService(users, leagues, members, predictions, scoring, keycloakSync);

        user = new User(ISSUER, SUBJECT, "piloto1", "piloto1@example.com");
        ReflectionTestUtils.setField(user, "id", UUID.randomUUID());
        when(users.findByIssuerAndSubject(ISSUER, SUBJECT)).thenReturn(Optional.of(user));
        when(predictions.sumScoreByUserId(user.getId())).thenReturn(42L);
        when(predictions.countByUserId(user.getId())).thenReturn(3L);
    }

    @Test
    void updatesAllUserProfileFieldsAndSyncsWithKeycloak() {
        var req = new PlayerService.UpdateProfileRequest(
            "LauuF1",
            "nuevo@example.com",
            "Lautaro",
            "Grego",
            "Argentina",
            "Fan de F1 desde 2010",
            "colapinto",
            "alpine",
            false
        );

        var updated = playerService.updateProfile(ISSUER, SUBJECT, req);

        assertEquals("LauuF1", updated.displayName());
        assertEquals("nuevo@example.com", updated.email());
        assertEquals("Lautaro", updated.firstName());
        assertEquals("Grego", updated.lastName());
        assertEquals("Argentina", updated.country());
        assertEquals("Fan de F1 desde 2010", updated.bio());
        assertEquals("colapinto", updated.favoriteDriverId());
        assertEquals("alpine", updated.favoriteTeamId());
        assertFalse(updated.notificationsEnabled());

        verify(users).save(user);
        verify(keycloakSync).syncUserProfile(SUBJECT, "nuevo@example.com", "Lautaro", "Grego");
    }

    @Test
    void rejectsDuplicateEmailWith409() {
        when(users.existsByEmailIgnoreCaseAndIdNot("ocupado@example.com", user.getId())).thenReturn(true);

        var req = new PlayerService.UpdateProfileRequest(
            "piloto1",
            "ocupado@example.com",
            null, null, null, null,
            "norris", "mclaren", true
        );

        var ex = assertThrows(ResponseStatusException.class, () -> playerService.updateProfile(ISSUER, SUBJECT, req));
        assertEquals(HttpStatus.CONFLICT, ex.getStatusCode());
    }

    @Test
    void delegatesPasswordChangeAndMapsInvalidCurrentPasswordTo400() {
        Mockito.doThrow(new IllegalArgumentException("La contraseña actual es incorrecta."))
            .when(keycloakSync).changePassword(SUBJECT, "piloto1", "badpass", "newpass123");

        var ex = assertThrows(
            ResponseStatusException.class,
            () -> playerService.changePassword(ISSUER, SUBJECT, "piloto1", "badpass", "newpass123")
        );
        assertEquals(HttpStatus.BAD_REQUEST, ex.getStatusCode());
    }
}
