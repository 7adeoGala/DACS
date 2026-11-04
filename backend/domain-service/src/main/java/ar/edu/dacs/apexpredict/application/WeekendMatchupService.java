package ar.edu.dacs.apexpredict.application;

import ar.edu.dacs.apexpredict.domain.Session;
import ar.edu.dacs.apexpredict.domain.WeekendMatchup;
import ar.edu.dacs.apexpredict.infrastructure.persistence.WeekendMatchupRepository;
import java.util.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Gestiona el Duelo de Pilotos por fin de semana.
 * Regla de negocio:
 * "El sistema debe seleccionar aleatoriamente 2 pilotos por fin de semana
 * (los mismos 2 para todos los usuarios) y el usuario debe elegir cuál
 * de los dos sumará más puntos en ese fin de semana."
 */
@Service
public class WeekendMatchupService {

    public record TeamDuo(String teamName, String driver1, String driver2) {}

    // Catálogo oficial de las 11 escuderías F1 2026 y sus duplas de pilotos titulares activos.
    // Todos son pilotos confirmados que van a correr, garantizando duelos directos intra-equipo.
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

    // Parrilla de los 22 pilotos titulares
    public static final List<String> DEFAULT_DRIVER_POOL = OFFICIAL_2026_TEAM_DUOS.stream()
        .flatMap(d -> java.util.stream.Stream.of(d.driver1(), d.driver2()))
        .toList();

    private final WeekendMatchupRepository matchups;

    public WeekendMatchupService(WeekendMatchupRepository matchups) {
        this.matchups = matchups;
    }

    /**
     * Selecciona determinística y dinámicamente la dupla de compañeros de equipo para la fecha/round.
     */
    public static TeamDuo selectDuoForSession(int season, int round) {
        int index = Math.abs((season * 1000) + round) % OFFICIAL_2026_TEAM_DUOS.size();
        return OFFICIAL_2026_TEAM_DUOS.get(index);
    }

    /**
     * Valida si dos pilotos son compañeros titulares activos de la misma escudería en 2026.
     */
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

    /**
     * Obtiene el duelo existente para la sesión o genera uno nuevo dinámico de compañeros de equipo.
     * Si el duelo previamente persistido no pertenecía al mismo equipo activo, se auto-corrige.
     */
    @Transactional
    public WeekendMatchup getOrGenerateMatchup(Session session) {
        return matchups.findBySession(session)
            .map(existing -> {
                if (!areTeammates(existing.getDriver1Id(), existing.getDriver2Id())) {
                    TeamDuo duo = selectDuoForSession(session.getSeason(), session.getRound());
                    existing.updateDrivers(duo.driver1(), duo.driver2());
                    return matchups.save(existing);
                }
                return existing;
            })
            .orElseGet(() -> {
                TeamDuo duo = selectDuoForSession(session.getSeason(), session.getRound());
                WeekendMatchup newMatchup = new WeekendMatchup(session, duo.driver1(), duo.driver2());
                return matchups.save(newMatchup);
            });
    }

    @Transactional(readOnly = true)
    public Optional<WeekendMatchup> findForSession(UUID sessionId) {
        return matchups.findBySessionId(sessionId);
    }
}
