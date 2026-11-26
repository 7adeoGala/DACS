package ar.edu.dacs.apexpredict.connector.service;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.concurrent.atomic.AtomicReference;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

@Component
public class ExternalApiCircuitBreaker {

    public enum State {
        CLOSED,
        OPEN,
        HALF_OPEN
    }

    private final int failureThreshold;
    private final Duration openDuration;
    private final Clock clock;

    private final AtomicInteger consecutiveFailures = new AtomicInteger(0);
    private final AtomicReference<State> state = new AtomicReference<>(State.CLOSED);
    private final AtomicReference<Instant> openedAt = new AtomicReference<>(null);

    @Autowired
    public ExternalApiCircuitBreaker(
        @Value("${apexpredict.circuit-breaker.failure-threshold:3}") int failureThreshold,
        @Value("${apexpredict.circuit-breaker.open-duration-seconds:30}") long openDurationSeconds
    ) {
        this(failureThreshold, Duration.ofSeconds(Math.max(1, openDurationSeconds)), Clock.systemUTC());
    }

    public ExternalApiCircuitBreaker(int failureThreshold, Duration openDuration, Clock clock) {
        this.failureThreshold = Math.max(1, failureThreshold);
        this.openDuration = openDuration != null ? openDuration : Duration.ofSeconds(30);
        this.clock = clock != null ? clock : Clock.systemUTC();
    }

    public synchronized boolean allowRequest() {
        State current = state.get();
        if (current == State.CLOSED) {
            return true;
        }
        if (current == State.OPEN) {
            Instant opened = openedAt.get();
            if (opened != null && !clock.instant().isBefore(opened.plus(openDuration))) {
                state.set(State.HALF_OPEN);
                return true;
            }
            return false;
        }
        return true;
    }

    public synchronized void recordSuccess() {
        consecutiveFailures.set(0);
        openedAt.set(null);
        state.set(State.CLOSED);
    }

    public synchronized void recordFailure() {
        int failures = consecutiveFailures.incrementAndGet();
        if (state.get() == State.HALF_OPEN || failures >= failureThreshold) {
            state.set(State.OPEN);
            openedAt.set(clock.instant());
        }
    }

    public synchronized State getState() {
        if (state.get() == State.OPEN) {
            Instant opened = openedAt.get();
            if (opened != null && !clock.instant().isBefore(opened.plus(openDuration))) {
                return State.HALF_OPEN;
            }
        }
        return state.get();
    }

    public synchronized int getConsecutiveFailures() {
        return consecutiveFailures.get();
    }

    public synchronized void reset() {
        consecutiveFailures.set(0);
        openedAt.set(null);
        state.set(State.CLOSED);
    }
}
