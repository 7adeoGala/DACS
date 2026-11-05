package ar.edu.dacs.apexpredict.application;

import ar.edu.dacs.apexpredict.domain.*;
import ar.edu.dacs.apexpredict.infrastructure.persistence.*;
import java.util.*;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
public class PlayerService {
    private final UserRepository users;
    private final LeagueRepository leagues;
    private final LeagueMemberRepository members;
    private final PredictionRepository predictions;
    private final ScoringService scoringService;

    public PlayerService(
        UserRepository users,
        LeagueRepository leagues,
        LeagueMemberRepository members,
        PredictionRepository predictions,
        ScoringService scoringService
    ) {
        this.users = users;
        this.leagues = leagues;
        this.members = members;
        this.predictions = predictions;
        this.scoringService = scoringService;
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
        } catch (Exception ignored) {}
        long totalScore = predictions.sumScoreByUserId(user.getId());
        long count = predictions.countByUserId(user.getId());
        return new Profile(
            user.getId(),
            user.getDisplayName(),
            user.getEmail(),
            user.getFavoriteDriverId(),
            user.getFavoriteTeamId(),
            user.isNotificationsEnabled(),
            totalScore,
            count
        );
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
        user.updateProfile(
            requestedName,
            request.favoriteDriverId(),
            request.favoriteTeamId(),
            request.notificationsEnabled()
        );
        users.save(user);
        long totalScore = predictions.sumScoreByUserId(user.getId());
        long count = predictions.countByUserId(user.getId());
        return new Profile(
            user.getId(),
            user.getDisplayName(),
            user.getEmail(),
            user.getFavoriteDriverId(),
            user.getFavoriteTeamId(),
            user.isNotificationsEnabled(),
            totalScore,
            count
        );
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
        // Las ligas privadas son estrictamente confidenciales: no son buscables ni visibles públicamente.
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

    /**
     * Permite editar una liga privada existente (nombre, descripción y contraseña).
     * Solo el propietario tiene autorización para modificarla.
     */
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

    /**
     * Permite a un usuario unirse a una liga privada mediante su ID y contraseña (si la tiene).
     */
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

    /**
     * Permite a un usuario unirse a una liga privada mediante un código/link de invitación.
     */
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

    /**
     * Tabla de posiciones global acumulada en tiempo real.
     */
    @Transactional
    public List<LeaderboardEntry> getGlobalLeaderboard() {
        try {
            scoringService.autoScoreAllCompletedSessions();
        } catch (Exception ignored) {}
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

    /**
     * Tabla de posiciones de una liga privada acumulada en tiempo real.
     */
    @Transactional
    public List<LeaderboardEntry> getLeagueLeaderboard(UUID leagueId) {
        if (!leagues.existsById(leagueId)) {
            throw new IllegalArgumentException("Liga no encontrada: " + leagueId);
        }
        try {
            scoringService.autoScoreAllCompletedSessions();
        } catch (Exception ignored) {}
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
        String favoriteDriverId,
        String favoriteTeamId,
        boolean notificationsEnabled,
        long totalScore,
        long predictionsCount
    ) {
        public Profile(UUID id, String displayName, String email) {
            this(id, displayName, email, null, null, true, 0L, 0L);
        }
    }

    public record UpdateProfileRequest(
        String displayName,
        String favoriteDriverId,
        String favoriteTeamId,
        Boolean notificationsEnabled
    ) {}


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
