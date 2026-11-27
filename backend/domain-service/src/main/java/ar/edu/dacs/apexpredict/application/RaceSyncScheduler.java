package ar.edu.dacs.apexpredict.application;

import java.time.Duration;
import java.time.Year;
import java.time.ZoneOffset;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Component
@SuppressWarnings("null")
public class RaceSyncScheduler {

    private static final Logger log = LoggerFactory.getLogger(RaceSyncScheduler.class);
    private static final Duration REMINDER_WINDOW = Duration.ofHours(24);

    private final ScoringService scoringService;
    private final NotificationService notificationService;

    public RaceSyncScheduler(ScoringService scoringService, NotificationService notificationService) {
        this.scoringService = scoringService;
        this.notificationService = notificationService;
    }

    @Scheduled(
        fixedDelayString = "${apexpredict.scheduling.sync-interval-ms:900000}",
        initialDelayString = "${apexpredict.scheduling.initial-delay-ms:60000}"
    )
    public void runScheduledSync() {
        try {
            int season = Year.now(ZoneOffset.UTC).getValue();
            int added = scoringService.syncSeasonCalendarFromConnector(season);
            int syncedResults = scoringService.syncAndScoreCompletedSessions();
            int reminders = notificationService.dispatchRemindersForSessionsStartingWithin(REMINDER_WINDOW);
            if (added > 0 || syncedResults > 0 || reminders > 0) {
                log.info(
                    "Ciclo programado completado (temporada {}): {} sesiones agregadas, {} resultados sincronizados, {} recordatorios enviados.",
                    season, added, syncedResults, reminders
                );
            }
        } catch (Exception ex) {
            log.warn("Error en ciclo programado de sincronización y recordatorios: {}", ex.getMessage());
        }
    }
}
