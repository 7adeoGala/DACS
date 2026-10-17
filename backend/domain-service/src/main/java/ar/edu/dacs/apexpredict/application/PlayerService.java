package ar.edu.dacs.apexpredict.application;

import ar.edu.dacs.apexpredict.domain.*;
import ar.edu.dacs.apexpredict.infrastructure.persistence.*;
import java.util.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class PlayerService {
    private final UserRepository users;
    private final LeagueRepository leagues;
    private final LeagueMemberRepository members;
    private final PredictionRepository predictions;

    public PlayerService(
        UserRepository users,
        LeagueRepository leagues,
        LeagueMemberRepository members,
        PredictionRepository predictions
    ) {
        this.users = users;
        this.leagues = leagues;
        this.members = members;
        this.predictions = predictions;
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
        return new LeagueView(
            l.getId(),
            l.getName(),
            l.getDescription(),
            l.getInviteCode(),
            l.getOwner().getId(),
            ownerName,
            count,
            l.hasPassword(),
            isMember
        );
    }

    @Transactional
    public Profile provision(String issuer, String subject, String name, String email) {
        users.upsert(UUID.randomUUID(), issuer, subject, name, email);
        var user = users.findByIssuerAndSubject(issuer, subject).orElseThrow();
        return new Profile(user.getId(), user.getDisplayName(), user.getEmail());
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
    @Transactional(readOnly = true)
    public List<LeaderboardEntry> getGlobalLeaderboard() {
        var rows = predictions.getGlobalLeaderboard();
        List<LeaderboardEntry> leaderboard = new ArrayList<>();
        int rank = 1;
        for (var row : rows) {
            leaderboard.add(new LeaderboardEntry(
                rank++,
                row.getUserId(),
                row.getDisplayName(),
                row.getTotalScore(),
                row.getPredictionsCount()
            ));
        }
        return leaderboard;
    }

    /**
     * Tabla de posiciones de una liga privada acumulada en tiempo real.
     */
    @Transactional(readOnly = true)
    public List<LeaderboardEntry> getLeagueLeaderboard(UUID leagueId) {
        if (!leagues.existsById(leagueId)) {
            throw new IllegalArgumentException("Liga no encontrada: " + leagueId);
        }
        var rows = predictions.getLeagueLeaderboard(leagueId);
        List<LeaderboardEntry> leaderboard = new ArrayList<>();
        int rank = 1;
        for (var row : rows) {
            leaderboard.add(new LeaderboardEntry(
                rank++,
                row.getUserId(),
                row.getDisplayName(),
                row.getTotalScore(),
                row.getPredictionsCount()
            ));
        }
        return leaderboard;
    }

    public record Profile(UUID id, String displayName, String email) {}

    public record LeagueView(
        UUID id,
        String name,
        String description,
        UUID inviteCode,
        UUID ownerId,
        String ownerName,
        long memberCount,
        boolean hasPassword,
        boolean isMember
    ) {
        public LeagueView(UUID id, String name, String description, UUID inviteCode, UUID ownerId) {
            this(id, name, description, inviteCode, ownerId, null, 1, false, true);
        }
    }

    public record LeaderboardEntry(int rank, UUID userId, String displayName, long totalScore, long predictionsCount) {}
}
