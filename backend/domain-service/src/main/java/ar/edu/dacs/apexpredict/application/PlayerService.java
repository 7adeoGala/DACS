package ar.edu.dacs.apexpredict.application;

import ar.edu.dacs.apexpredict.domain.*;
import ar.edu.dacs.apexpredict.infrastructure.persistence.*;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.Size;
import java.util.*;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
public class PlayerService {
    private static final Logger log = LoggerFactory.getLogger(PlayerService.class);
    private final UserRepository users;
    private final LeagueRepository leagues;
    private final LeagueMemberRepository members;
    private final PredictionRepository predictions;
    private final ScoringService scoringService;
    private final KeycloakUserSyncService keycloakUserSyncService;

    @Autowired
    public PlayerService(
        UserRepository users,
        LeagueRepository leagues,
        LeagueMemberRepository members,
        PredictionRepository predictions,
        ScoringService scoringService,
        @Autowired(required = false) KeycloakUserSyncService keycloakUserSyncService
    ) {
        this.users = users;
        this.leagues = leagues;
        this.members = members;
        this.predictions = predictions;
        this.scoringService = scoringService;
        this.keycloakUserSyncService = keycloakUserSyncService;
    }

    public PlayerService(
        UserRepository users,
        LeagueRepository leagues,
        LeagueMemberRepository members,
        PredictionRepository predictions,
        ScoringService scoringService
    ) {
        this(users, leagues, members, predictions, scoringService, null);
    }

    private User getOrCreateUser(String issuer, String subject) {
        return users.findByIssuerAndSubject(issuer, subject)
            .orElseGet(() -> {
                UUID newId = UUID.randomUUID();
                users.upsert(newId, issuer, subject, subject, null);
                return users.findByIssuerAndSubject(issuer, subject).orElseThrow();
            });
    }

    private LeagueView toLeagueView(League l, User currentUser, Boolean explicitIsMember) {
        boolean isMember = explicitIsMember != null ? explicitIsMember : (currentUser != null && members.existsByLeagueAndUser(l, currentUser));
        long count = members.countByLeague(l);
        String ownerName = l.getOwner() != null ? l.getOwner().getDisplayName() : "Desconocido";
        String visiblePassword = isMember ? l.getPassword() : null;
        return new LeagueView(
            l.getId(),
            l.getName(),
            l.getDescription(),
            l.getInviteCode(),
            l.getOwner().getId(),
            ownerName,
            count,
            l.hasPassword(),
            isMember,
            visiblePassword
        );
    }

    @Transactional
    public Profile provision(String issuer, String subject, String name, String email) {
        users.upsert(UUID.randomUUID(), issuer, subject, name, email);
        return getProfile(issuer, subject);
    }

    @Transactional
    public Profile getOrProvisionProfile(String issuer, String subject, String name, String email) {
        Optional<User> existing = users.findByIssuerAndSubject(issuer, subject);
        if (existing.isEmpty() || (name != null && existing.get().getDisplayName().equals(subject))) {
            users.upsert(UUID.randomUUID(), issuer, subject, name, email);
        }
        return getProfile(issuer, subject);
    }

    @Transactional
    public Profile getProfile(String issuer, String subject) {
        User user = getOrCreateUser(issuer, subject);
        try {
            scoringService.autoScoreAllCompletedSessions();
        } catch (Exception ex) {
            log.debug("Auto-score omitido en consulta: {}", ex.getMessage());
        }
        long totalScore = predictions.sumScoreByUserId(user.getId());
        long count = predictions.countByUserId(user.getId());
        return toProfile(user, totalScore, count);
    }

    @Transactional
    public Profile updateProfile(String issuer, String subject, UpdateProfileRequest request) {
        User user = getOrCreateUser(issuer, subject);
        String requestedName = request.displayName() != null ? request.displayName().trim() : null;
        if (requestedName != null && !requestedName.isBlank()) {
            boolean isTaken = users.existsByDisplayNameIgnoreCaseAndIdNot(requestedName, user.getId());
            if (isTaken) {
                throw new ResponseStatusException(HttpStatus.CONFLICT, "El nombre de usuario '" + requestedName + "' ya está en uso por otro piloto.");
            }
        }
        String requestedEmail = request.email() != null ? request.email().trim().toLowerCase() : null;
        if (requestedEmail != null && !requestedEmail.isBlank()) {
            if (!requestedEmail.contains("@") || !requestedEmail.contains(".")) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "El correo electrónico no tiene un formato válido.");
            }
            if (users.existsByEmailIgnoreCaseAndIdNot(requestedEmail, user.getId())) {
                throw new ResponseStatusException(HttpStatus.CONFLICT, "El correo electrónico ya está registrado por otra cuenta.");
            }
        }
        user.updateProfile(
            requestedName,
            request.email(),
            request.firstName(),
            request.lastName(),
            request.country(),
            request.bio(),
            request.favoriteDriverId(),
            request.favoriteTeamId(),
            request.notificationsEnabled()
        );
        users.save(user);
        if (keycloakUserSyncService != null) {
            keycloakUserSyncService.syncUserProfile(
                subject,
                user.getEmail(),
                user.getFirstName(),
                user.getLastName()
            );
        }
        long totalScore = predictions.sumScoreByUserId(user.getId());
        long count = predictions.countByUserId(user.getId());
        return toProfile(user, totalScore, count);
    }

    public void changePassword(String issuer, String subject, String jwtUsername, String currentPassword, String newPassword) {
        User user = getOrCreateUser(issuer, subject);
        if (keycloakUserSyncService == null) {
            throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE, "El servicio de cambio de contraseña no está disponible.");
        }
        String loginId = (jwtUsername != null && !jwtUsername.isBlank())
            ? jwtUsername
            : (user.getEmail() != null && !user.getEmail().isBlank() ? user.getEmail() : user.getDisplayName());
        try {
            keycloakUserSyncService.changePassword(subject, loginId, currentPassword, newPassword);
        } catch (IllegalArgumentException ex) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, ex.getMessage(), ex);
        } catch (IllegalStateException ex) {
            throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE, ex.getMessage(), ex);
        }
    }

    private Profile toProfile(User user, long totalScore, long count) {
        return new Profile(
            user.getId(),
            user.getDisplayName(),
            user.getEmail(),
            user.getFirstName(),
            user.getLastName(),
            user.getCountry(),
            user.getBio(),
            user.getFavoriteDriverId(),
            user.getFavoriteTeamId(),
            user.isNotificationsEnabled(),
            totalScore,
            count
        );
    }

    @Transactional(readOnly = true)
    public List<Profile> listAllUsersForAdmin() {
        return users.findAll().stream()
            .sorted(Comparator.comparing(
                u -> u.getDisplayName() != null ? u.getDisplayName().toLowerCase() : "",
                Comparator.naturalOrder()
            ))
            .map(u -> toProfile(
                u,
                predictions.sumScoreByUserId(u.getId()),
                predictions.countByUserId(u.getId())
            ))
            .toList();
    }

    @Transactional(readOnly = true)
    public boolean isDisplayNameAvailable(String issuer, String subject, String name) {
        if (name == null || name.isBlank()) {
            return false;
        }
        String trimmed = name.trim();
        Optional<User> currentUserOpt = users.findByIssuerAndSubject(issuer, subject);
        if (currentUserOpt.isPresent()) {
            User currentUser = currentUserOpt.get();
            if (currentUser.getDisplayName() != null && currentUser.getDisplayName().trim().equalsIgnoreCase(trimmed)) {
                return true;
            }
            return !users.existsByDisplayNameIgnoreCaseAndIdNot(trimmed, currentUser.getId());
        }
        return !users.existsByDisplayNameIgnoreCase(trimmed);
    }

    @Transactional(readOnly = true)
    public List<LeagueView> leagues(String issuer, String subject) {
        User user = users.findByIssuerAndSubject(issuer, subject).orElse(null);
        return leagues.findForUser(issuer, subject).stream()
            .map(l -> toLeagueView(l, user, true))
            .toList();
    }

    @Transactional(readOnly = true)
    public List<LeagueView> searchLeagues(String issuer, String subject, String query) {
        return List.of();
    }

    @Transactional
    public LeagueView createLeague(String issuer, String subject, String name, String description, String password) {
        var user = getOrCreateUser(issuer, subject);
        var league = leagues.save(new League(name.strip(), description, password, user));
        members.save(new LeagueMember(league, user, LeagueMember.Role.OWNER));
        return toLeagueView(league, user, true);
    }

    @Transactional
    public LeagueView createLeague(String issuer, String subject, String name, String description) {
        return createLeague(issuer, subject, name, description, null);
    }

    @Transactional
    public LeagueView createLeague(String issuer, String subject, String name) {
        return createLeague(issuer, subject, name, null, null);
    }

    @Transactional
    public LeagueView editLeague(String issuer, String subject, UUID leagueId, String newName, String newDescription, String newPassword) {
        var user = getOrCreateUser(issuer, subject);
        var league = leagues.findById(leagueId)
            .orElseThrow(() -> new IllegalArgumentException("Liga no encontrada: " + leagueId));

        league.update(newName, newDescription, newPassword, user);
        return toLeagueView(league, user, true);
    }

    @Transactional
    public LeagueView editLeague(String issuer, String subject, UUID leagueId, String newName, String newDescription) {
        return editLeague(issuer, subject, leagueId, newName, newDescription, null);
    }

    @Transactional
    public LeagueView joinLeague(String issuer, String subject, UUID leagueId, String password) {
        var user = getOrCreateUser(issuer, subject);
        var league = leagues.findById(leagueId)
            .orElseThrow(() -> new IllegalArgumentException("Liga no encontrada: " + leagueId));

        if (!league.verifyPassword(password)) {
            throw new IllegalArgumentException("Contraseña de la liga incorrecta.");
        }

        boolean alreadyMember = members.existsByLeagueAndUser(league, user);
        if (!alreadyMember) {
            members.save(new LeagueMember(league, user, LeagueMember.Role.MEMBER));
        }

        return toLeagueView(league, user, true);
    }

    @Transactional
    public LeagueView joinLeagueByInviteCode(String issuer, String subject, UUID inviteCode, String password) {
        var user = getOrCreateUser(issuer, subject);
        var league = leagues.findByInviteCode(inviteCode)
            .orElseThrow(() -> new IllegalArgumentException("Código de invitación inválido: " + inviteCode));

        if (league.hasPassword() && !league.verifyPassword(password)) {
            throw new IllegalArgumentException("Contraseña de la liga incorrecta.");
        }

        boolean alreadyMember = members.existsByLeagueAndUser(league, user);
        if (!alreadyMember) {
            members.save(new LeagueMember(league, user, LeagueMember.Role.MEMBER));
        }

        return toLeagueView(league, user, true);
    }

    @Transactional
    public LeagueView joinLeagueByInviteCode(String issuer, String subject, UUID inviteCode) {
        return joinLeagueByInviteCode(issuer, subject, inviteCode, null);
    }

    @Transactional
    public List<LeaderboardEntry> getGlobalLeaderboard() {
        try {
            scoringService.autoScoreAllCompletedSessions();
        } catch (Exception ex) {
            log.debug("Auto-score omitido en consulta: {}", ex.getMessage());
        }
        var rows = predictions.getGlobalLeaderboard();
        List<LeaderboardEntry> leaderboard = new ArrayList<>();
        int currentRank = 1;
        long lastScore = -1L;
        long lastCount = -1L;
        for (int i = 0; i < rows.size(); i++) {
            var row = rows.get(i);
            long score = row.getTotalScore() != null ? row.getTotalScore() : 0L;
            long count = row.getPredictionsCount() != null ? row.getPredictionsCount() : 0L;
            if (i == 0 || score != lastScore || count != lastCount) {
                currentRank = i + 1;
                lastScore = score;
                lastCount = count;
            }
            leaderboard.add(new LeaderboardEntry(
                currentRank,
                row.getUserId(),
                row.getDisplayName(),
                score,
                count
            ));
        }
        return leaderboard;
    }

    @Transactional
    public List<LeaderboardEntry> getLeagueLeaderboard(UUID leagueId) {
        if (!leagues.existsById(leagueId)) {
            throw new IllegalArgumentException("Liga no encontrada: " + leagueId);
        }
        try {
            scoringService.autoScoreAllCompletedSessions();
        } catch (Exception ex) {
            log.debug("Auto-score omitido en consulta: {}", ex.getMessage());
        }
        var rows = predictions.getLeagueLeaderboard(leagueId);
        List<LeaderboardEntry> leaderboard = new ArrayList<>();
        int currentRank = 1;
        long lastScore = -1L;
        long lastCount = -1L;
        for (int i = 0; i < rows.size(); i++) {
            var row = rows.get(i);
            long score = row.getTotalScore() != null ? row.getTotalScore() : 0L;
            long count = row.getPredictionsCount() != null ? row.getPredictionsCount() : 0L;
            if (i == 0 || score != lastScore || count != lastCount) {
                currentRank = i + 1;
                lastScore = score;
                lastCount = count;
            }
            leaderboard.add(new LeaderboardEntry(
                currentRank,
                row.getUserId(),
                row.getDisplayName(),
                score,
                count
            ));
        }
        return leaderboard;
    }

    public record Profile(
        UUID id,
        String displayName,
        String email,
        String firstName,
        String lastName,
        String country,
        String bio,
        String favoriteDriverId,
        String favoriteTeamId,
        boolean notificationsEnabled,
        long totalScore,
        long predictionsCount
    ) {
        public Profile(UUID id, String displayName, String email) {
            this(id, displayName, email, null, null, null, null, null, null, true, 0L, 0L);
        }
    }

    public record UpdateProfileRequest(
        @Size(max = 40) String displayName,
        @Email @Size(max = 254) String email,
        @Size(max = 80) String firstName,
        @Size(max = 80) String lastName,
        @Size(max = 80) String country,
        @Size(max = 280) String bio,
        @Size(max = 64) String favoriteDriverId,
        @Size(max = 64) String favoriteTeamId,
        Boolean notificationsEnabled
    ) {
        public UpdateProfileRequest(String displayName, String favoriteDriverId, String favoriteTeamId, Boolean notificationsEnabled) {
            this(displayName, null, null, null, null, null, favoriteDriverId, favoriteTeamId, notificationsEnabled);
        }
    }

    public record LeagueView(
        UUID id,
        String name,
        String description,
        UUID inviteCode,
        UUID ownerId,
        String ownerName,
        long memberCount,
        boolean hasPassword,
        boolean isMember,
        String password
    ) {
        public LeagueView(UUID id, String name, String description, UUID inviteCode, UUID ownerId) {
            this(id, name, description, inviteCode, ownerId, null, 1, false, true, null);
        }
    }

    public record LeaderboardEntry(int rank, UUID userId, String displayName, long totalScore, long predictionsCount) {}
}
