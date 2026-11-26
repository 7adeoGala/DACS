package ar.edu.dacs.apexpredict.application;

import ar.edu.dacs.apexpredict.domain.Session;
import ar.edu.dacs.apexpredict.domain.WeekendMatchup;
import ar.edu.dacs.apexpredict.infrastructure.persistence.WeekendMatchupRepository;
import java.util.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class WeekendMatchupService {

    public record TeamDuo(String teamName, String driver1, String driver2) {}

    public static final List<TeamDuo> OFFICIAL_2026_TEAM_DUOS = List.of(
        new TeamDuo("McLaren", "norris", "piastri"),
        new TeamDuo("Ferrari", "leclerc", "hamilton"),
        new TeamDuo("Red Bull Racing", "verstappen", "hadjar"),
        new TeamDuo("Mercedes", "russell", "antonelli"),
        new TeamDuo("Aston Martin", "alonso", "stroll"),
        new TeamDuo("Alpine", "gasly", "colapinto"),
        new TeamDuo("Williams", "sainz", "albon"),
        new TeamDuo("Racing Bulls", "lawson", "lindblad"),
        new TeamDuo("Audi", "hulkenberg", "bortoleto"),
        new TeamDuo("Haas GR", "bearman", "ocon"),
        new TeamDuo("Cadillac", "perez", "bottas")
    );

    public static final List<String> DEFAULT_DRIVER_POOL = OFFICIAL_2026_TEAM_DUOS.stream()
        .flatMap(d -> java.util.stream.Stream.of(d.driver1(), d.driver2()))
        .toList();

    private final WeekendMatchupRepository matchups;

    public WeekendMatchupService(WeekendMatchupRepository matchups) {
        this.matchups = matchups;
    }

    public static TeamDuo selectDuoForSession(int season, int round) {
        int index = Math.abs((season * 1000) + round) % OFFICIAL_2026_TEAM_DUOS.size();
        return OFFICIAL_2026_TEAM_DUOS.get(index);
    }

    public static boolean areTeammates(String d1, String d2) {
        if (d1 == null || d2 == null || d1.equalsIgnoreCase(d2)) return false;
        for (TeamDuo duo : OFFICIAL_2026_TEAM_DUOS) {
            if ((duo.driver1().equalsIgnoreCase(d1) && duo.driver2().equalsIgnoreCase(d2)) ||
                (duo.driver1().equalsIgnoreCase(d2) && duo.driver2().equalsIgnoreCase(d1))) {
                return true;
            }
        }
        return false;
    }

    @Transactional
    public WeekendMatchup getOrGenerateMatchup(Session session) {
        Optional<WeekendMatchup> existingOpt = matchups.findBySession(session);
        if (existingOpt.isPresent()) {
            WeekendMatchup existing = existingOpt.get();
            if (!areTeammates(existing.getDriver1Id(), existing.getDriver2Id())) {
                TeamDuo duo = selectDuoForSession(session.getSeason(), session.getRound());
                existing.updateDrivers(duo.driver1(), duo.driver2());
                return matchups.save(existing);
            }
            return existing;
        }
        TeamDuo duo = selectDuoForSession(session.getSeason(), session.getRound());
        WeekendMatchup newMatchup = new WeekendMatchup(session, duo.driver1(), duo.driver2());
        return matchups.save(newMatchup);
    }

    @Transactional(readOnly = true)
    public Optional<WeekendMatchup> findForSession(UUID sessionId) {
        return matchups.findBySessionId(sessionId);
    }
}
