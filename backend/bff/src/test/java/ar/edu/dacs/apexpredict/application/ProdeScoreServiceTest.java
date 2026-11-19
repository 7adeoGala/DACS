package ar.edu.dacs.apexpredict.application;

import ar.edu.dacs.apexpredict.client.ConectorClient;
import ar.edu.dacs.apexpredict.client.DomainClient;
import ar.edu.dacs.apexpredict.web.dto.OfficialRaceSummary;
import ar.edu.dacs.apexpredict.web.dto.PredictionDetail;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class ProdeScoreServiceTest {

    @Test
    void crossesDomainPredictionWithConnectorOfficialResultsAccurately() {
        DomainClient domainClient = mock(DomainClient.class);
        ConectorClient conectorClient = mock(ConectorClient.class);
        var service = new ProdeScoreService(domainClient, conectorClient);

        UUID predId = UUID.randomUUID();
        UUID sessionId = UUID.randomUUID();
        when(domainClient.predictionForSession("2026-19")).thenReturn(new PredictionDetail(
            predId,
            sessionId,
            "Mexico City Grand Prix",
            "Autódromo Hermanos Rodríguez",
            Instant.parse("2026-11-01T20:00:00Z"),
            true,
            List.of("verstappen", "hamilton", "antonelli"),
            "leclerc",
            "leclerc",
            3,
            2,
            null,
            Instant.parse("2026-10-30T02:00:00Z"),
            "norris",
            "leclerc"
        ));

        when(conectorClient.officialSummary(2026, 19)).thenReturn(new OfficialRaceSummary(
            2026,
            19,
            "Mexico City Grand Prix",
            "Autódromo Hermanos Rodríguez",
            "2026-11-01",
            List.of("max_verstappen", "hamilton", "antonelli", "leclerc", "norris"),
            List.of("max_verstappen", "hamilton", "antonelli", "leclerc", "norris"),
            "hamilton",
            3,
            5
        ));

        var score = service.calculateUserScore(2026, 19);

        assertTrue(score.hasPrediction());
        assertTrue(score.hasOfficialResults());
        assertEquals(19, score.totalPoints());
        assertEquals(3, score.breakdown().podiumHits());
        assertEquals(10, score.breakdown().podiumPoints());
        assertFalse(score.breakdown().poleHit());
        assertTrue(score.breakdown().duelHit());
        assertTrue(score.breakdown().safetyCarHit());
        assertFalse(score.breakdown().dnfHit());
        assertEquals("leclerc", score.officialResults().duelWinnerId());
    }
}
