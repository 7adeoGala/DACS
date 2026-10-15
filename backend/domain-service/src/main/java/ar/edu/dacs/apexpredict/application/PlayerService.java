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

    @Transactional
    public Profile provision(String issuer, String subject, String name, String email) {
        users.upsert(UUID.randomUUID(), issuer, subject, name, email);
        var user = users.findByIssuerAndSubject(issuer, subject).orElseThrow();
        return new Profile(user.getId(), user.getDisplayName(), user.getEmail());
    }

    @Transactional(readOnly = true)
    public List<LeagueView> leagues(String issuer, String subject) {
        return leagues.findForUser(issuer, subject).stream()
            .map(l -> new LeagueView(l.getId(), l.getName(), l.getDescription(), l.getInviteCode(), l.getOwner().getId()))
            .toList();
    }

    @Transactional
    public LeagueView createLeague(String issuer, String subject, String name, String description) {
        var user = users.findByIssuerAndSubject(issuer, subject)
            .orElseThrow(() -> new IllegalStateException("Primero inicializa tu perfil."));
        var league = leagues.save(new League(name.strip(), description, user));
        members.save(new LeagueMember(league, user, LeagueMember.Role.OWNER));
        return new LeagueView(league.getId(), league.getName(), league.getDescription(), league.getInviteCode(), user.getId());
    }

    @Transactional
    public LeagueView createLeague(String issuer, String subject, String name) {
        return createLeague(issuer, subject, name, null);
    }

    /**
     * Permite editar una liga privada existente (nombre y descripción).
     * Solo el propietario tiene autorización para modificarla.
     */
    @Transactional
    public LeagueView editLeague(String issuer, String subject, UUID leagueId, String newName, String newDescription) {
        var user = users.findByIssuerAndSubject(issuer, subject)
            .orElseThrow(() -> new IllegalStateException("Perfil no inicializado."));
        var league = leagues.findById(leagueId)
            .orElseThrow(() -> new IllegalArgumentException("Liga no encontrada: " + leagueId));

        league.update(newName, newDescription, user);
        return new LeagueView(league.getId(), league.getName(), league.getDescription(), league.getInviteCode(), league.getOwner().getId());
    }

    /**
     * Permite a un usuario unirse a una liga privada mediante un código/link de invitación.
     */
    @Transactional
    public LeagueView joinLeagueByInviteCode(String issuer, String subject, UUID inviteCode) {
        var user = users.findByIssuerAndSubject(issuer, subject)
            .orElseThrow(() -> new IllegalStateException("Primero inicializa tu perfil."));
        var league = leagues.findByInviteCode(inviteCode)
            .orElseThrow(() -> new IllegalArgumentException("Código de invitación inválido: " + inviteCode));

        boolean alreadyMember = members.existsByLeagueAndUser(league, user);
        if (!alreadyMember) {
            members.save(new LeagueMember(league, user, LeagueMember.Role.MEMBER));
        }

        return new LeagueView(league.getId(), league.getName(), league.getDescription(), league.getInviteCode(), league.getOwner().getId());
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
    public record LeagueView(UUID id, String name, String description, UUID inviteCode, UUID ownerId) {}
    public record LeaderboardEntry(int rank, UUID userId, String displayName, long totalScore, long predictionsCount) {}
}
