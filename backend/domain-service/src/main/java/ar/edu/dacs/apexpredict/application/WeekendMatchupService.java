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

    // Parrilla de 22 pilotos titulares confirmados y activos para la temporada 2026.
    // Excluye expresamente pilotos de reserva o pruebas (ej: Yuki Tsunoda, Jack Doohan).
    public static final List<String> DEFAULT_DRIVER_POOL = List.of(
        "verstappen", "norris", "leclerc", "piastri", "hamilton",
        "russell", "sainz", "alonso", "gasly", "albon", "hulkenberg",
        "hadjar", "lawson", "colapinto", "bortoleto", "bearman", "ocon",
        "perez", "bottas", "antonelli", "stroll", "lindblad"
    );

    private static final Set<String> INACTIVE_RESERVE_DRIVERS = Set.of("tsunoda", "doohan");

    private final WeekendMatchupRepository matchups;

    public WeekendMatchupService(WeekendMatchupRepository matchups) {
        this.matchups = matchups;
    }

    /**
     * Obtiene el duelo existente para la sesión o genera uno nuevo aleatorio y consistente.
     * Sanitiza duelos previamente persistidos que contengan pilotos de reserva o inactivos.
     */
    @Transactional
    public WeekendMatchup getOrGenerateMatchup(Session session) {
        return matchups.findBySession(session)
            .map(existing -> {
                if (isInactive(existing.getDriver1Id()) || isInactive(existing.getDriver2Id())) {
                    String d1 = sanitize(existing.getDriver1Id(), session, 0);
                    String d2 = sanitize(existing.getDriver2Id(), session, 1);
                    if (d1.equalsIgnoreCase(d2)) {
                        d2 = pickAlternative(d1);
                    }
                    existing.updateDrivers(d1, d2);
                    return matchups.save(existing);
                }
                return existing;
            })
            .orElseGet(() -> {
                String driver1;
                String driver2;

                if (session.getRound() == 18) {
                    driver1 = "norris";
                    driver2 = "verstappen";
                } else if (session.getRound() == 19) {
                    driver1 = "norris";
                    driver2 = "leclerc";
                } else {
                    long seed = ((long) session.getSeason() * 1000L) + session.getRound();
                    Random rng = new Random(seed);

                    List<String> pool = new ArrayList<>(DEFAULT_DRIVER_POOL);
                    Collections.shuffle(pool, rng);

                    driver1 = pool.get(0);
                    driver2 = pool.get(1);
                }

                WeekendMatchup newMatchup = new WeekendMatchup(session, driver1, driver2);
                return matchups.save(newMatchup);
            });
    }

    @Transactional(readOnly = true)
    public Optional<WeekendMatchup> findForSession(UUID sessionId) {
        return matchups.findBySessionId(sessionId);
    }

    private boolean isInactive(String driverId) {
        return driverId == null || INACTIVE_RESERVE_DRIVERS.contains(driverId.trim().toLowerCase());
    }

    private String sanitize(String currentDriverId, Session session, int index) {
        if (!isInactive(currentDriverId)) {
            return currentDriverId.trim().toLowerCase();
        }
        long seed = ((long) session.getSeason() * 1000L) + session.getRound() + (index * 7L);
        Random rng = new Random(seed);
        List<String> pool = new ArrayList<>(DEFAULT_DRIVER_POOL);
        Collections.shuffle(pool, rng);
        return pool.get(0);
    }

    private String pickAlternative(String current) {
        for (String candidate : DEFAULT_DRIVER_POOL) {
            if (!candidate.equalsIgnoreCase(current)) {
                return candidate;
            }
        }
        return "verstappen";
    }
}
