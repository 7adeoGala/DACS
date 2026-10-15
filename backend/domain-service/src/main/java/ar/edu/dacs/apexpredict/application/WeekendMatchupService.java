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

    private static final List<String> DEFAULT_DRIVER_POOL = List.of(
        "verstappen", "norris", "leclerc", "piastri", "hamilton",
        "russell", "sainz", "alonso", "gasly", "albon", "hulkenberg", "tsunoda"
    );

    private final WeekendMatchupRepository matchups;

    public WeekendMatchupService(WeekendMatchupRepository matchups) {
        this.matchups = matchups;
    }

    /**
     * Obtiene el duelo existente para la sesión o genera uno nuevo aleatorio y consistente.
     */
    @Transactional
    public WeekendMatchup getOrGenerateMatchup(Session session) {
        return matchups.findBySession(session).orElseGet(() -> {
            // Generación determinista con semilla basada en temporada y ronda para reproducibilidad,
            // o aleatoria persistida inmediatamente en BD para que todos los usuarios tengan los mismos 2.
            long seed = ((long) session.getSeason() * 1000L) + session.getRound();
            Random rng = new Random(seed);

            List<String> pool = new ArrayList<>(DEFAULT_DRIVER_POOL);
            Collections.shuffle(pool, rng);

            String driver1 = pool.get(0);
            String driver2 = pool.get(1);

            WeekendMatchup newMatchup = new WeekendMatchup(session, driver1, driver2);
            return matchups.save(newMatchup);
        });
    }

    @Transactional(readOnly = true)
    public Optional<WeekendMatchup> findForSession(UUID sessionId) {
        return matchups.findBySessionId(sessionId);
    }
}
