package ar.edu.dacs.apexpredict.application;

import java.time.Duration;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class RaceSyncSchedulerTest {

    @Test
    void scheduledSyncTriggersCalendarResultsAndReminders() {
        ScoringService scoringService = Mockito.mock(ScoringService.class);
        NotificationService notificationService = Mockito.mock(NotificationService.class);

        when(scoringService.syncSeasonCalendarFromConnector(anyInt())).thenReturn(2);
        when(scoringService.syncAndScoreCompletedSessions()).thenReturn(1);
        when(notificationService.dispatchRemindersForSessionsStartingWithin(any(Duration.class))).thenReturn(3);

        var scheduler = new RaceSyncScheduler(scoringService, notificationService);
        scheduler.runScheduledSync();

        verify(scoringService).syncSeasonCalendarFromConnector(anyInt());
        verify(scoringService).syncAndScoreCompletedSessions();
        verify(notificationService).dispatchRemindersForSessionsStartingWithin(Duration.ofHours(24));
    }
}
