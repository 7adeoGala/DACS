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
    public PlayerService(UserRepository users, LeagueRepository leagues, LeagueMemberRepository members) {
        this.users = users; this.leagues = leagues; this.members = members;
    }
    @Transactional
    public Profile provision(String issuer, String subject, String name, String email) {
        users.upsert(UUID.randomUUID(), issuer, subject, name, email);
        var user = users.findByIssuerAndSubject(issuer, subject).orElseThrow();
        return new Profile(user.getId(), user.getDisplayName(), user.getEmail());
    }
    @Transactional(readOnly = true)
    public List<LeagueView> leagues(String issuer, String subject) {
        return leagues.findForUser(issuer, subject).stream().map(l -> new LeagueView(l.getId(), l.getName())).toList();
    }
    @Transactional
    public LeagueView createLeague(String issuer, String subject, String name) {
        var user = users.findByIssuerAndSubject(issuer, subject)
            .orElseThrow(() -> new IllegalStateException("Primero inicializa tu perfil."));
        var league = leagues.save(new League(name.strip(), user));
        members.save(new LeagueMember(league, user, LeagueMember.Role.OWNER));
        return new LeagueView(league.getId(), league.getName());
    }
    public record Profile(UUID id, String displayName, String email) {}
    public record LeagueView(UUID id, String name) {}
}
