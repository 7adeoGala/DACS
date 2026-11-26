package ar.edu.dacs.apexpredict.connector;

import ar.edu.dacs.apexpredict.connector.service.ExternalApiCircuitBreaker;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneId;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

class ExternalApiCircuitBreakerTest {

    private static final class MutableClock extends Clock {
        private Instant current;

        MutableClock(Instant start) {
            this.current = start;
        }

        void advance(Duration delta) {
            this.current = this.current.plus(delta);
        }

        @Override
        public ZoneId getZone() {
            return ZoneId.of("UTC");
        }

        @Override
        public Clock withZone(ZoneId zone) {
            return this;
        }

        @Override
        public Instant instant() {
            return current;
        }
    }

    @Test
    void opensAfterThresholdAndClosesAfterCooldownRecovery() {
        var clock = new MutableClock(Instant.parse("2026-11-21T12:00:00Z"));
        var cb = new ExternalApiCircuitBreaker(3, Duration.ofSeconds(30), clock);

        assertEquals(ExternalApiCircuitBreaker.State.CLOSED, cb.getState());
        assertTrue(cb.allowRequest());

        cb.recordFailure();
        cb.recordFailure();
        assertEquals(ExternalApiCircuitBreaker.State.CLOSED, cb.getState());

        cb.recordFailure();
        assertEquals(ExternalApiCircuitBreaker.State.OPEN, cb.getState());
        assertFalse(cb.allowRequest());

        clock.advance(Duration.ofSeconds(31));
        assertEquals(ExternalApiCircuitBreaker.State.HALF_OPEN, cb.getState());
        assertTrue(cb.allowRequest());

        cb.recordSuccess();
        assertEquals(ExternalApiCircuitBreaker.State.CLOSED, cb.getState());
        assertEquals(0, cb.getConsecutiveFailures());
    }

    @Test
    void reopensImmediatelyWhenHalfOpenProbeFails() {
        var clock = new MutableClock(Instant.parse("2026-11-21T12:00:00Z"));
        var cb = new ExternalApiCircuitBreaker(2, Duration.ofSeconds(20), clock);

        cb.recordFailure();
        cb.recordFailure();
        assertEquals(ExternalApiCircuitBreaker.State.OPEN, cb.getState());

        clock.advance(Duration.ofSeconds(25));
        assertTrue(cb.allowRequest());
        assertEquals(ExternalApiCircuitBreaker.State.HALF_OPEN, cb.getState());

        cb.recordFailure();
        assertEquals(ExternalApiCircuitBreaker.State.OPEN, cb.getState());
        assertFalse(cb.allowRequest());
    }
}
