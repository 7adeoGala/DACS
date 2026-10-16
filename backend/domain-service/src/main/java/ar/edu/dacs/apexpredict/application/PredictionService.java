package ar.edu.dacs.apexpredict.application;

import ar.edu.dacs.apexpredict.domain.*;
import ar.edu.dacs.apexpredict.infrastructure.persistence.*;
import java.time.Instant;
import java.util.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Servicio encargado del ciclo de vida de pronósticos y validación estricta de Lock Time.
 */
@Service
public class PredictionService {

    private final PredictionRepository predictions;
    private final SessionRepository sessions;
    private final UserRepository users;
    private final WeekendMatchupService matchupService;
    private final SessionResultRepository results;
    private final ScoringService scoringService;

    public PredictionService(
        PredictionRepository predictions,
        SessionRepository sessions,
        UserRepository users,
        WeekendMatchupService matchupService,
        SessionResultRepository results,
        ScoringService scoringService
    ) {
        this.predictions = predictions;
        this.sessions = sessions;
        this.users = users;
        this.matchupService = matchupService;
        this.results = results;
        this.scoringService = scoringService;
    }

    /**
     * Obtiene la siguiente carrera/sesión programada en el calendario con su respectivo duelo de pilotos.
     */
    @Transactional
    public NextSessionView getNextScheduledSession() {
        Instant now = Instant.now();
        Session nextSession = sessions.findFirstByStartsAtAfterOrderByStartsAtAsc(now)
            .orElse(null);

        if (nextSession == null) {
            return null;
        }

        WeekendMatchup matchup = matchupService.getOrGenerateMatchup(nextSession);
        boolean isLocked = nextSession.getStartsAt() == null || !now.isBefore(nextSession.getStartsAt());

        return new NextSessionView(
            nextSession.getId(),
            nextSession.getSeason(),
            nextSession.getRound(),
            nextSession.getName(),
            nextSession.getCircuit(),
            nextSession.getType().name(),
            nextSession.getRaceDate().toString(),
            nextSession.getStartsAt(),
            isLocked,
            matchup.getDriver1Id(),
            matchup.getDriver2Id()
        );
    }

    /**
     * Consulta el pronóstico del usuario para una sesión, indicando el estado del Lock Time.
     */
    @Transactional(readOnly = true)
    public PredictionDetailView getUserPrediction(String issuer, String subject, UUID sessionId) {
        User user = users.findByIssuerAndSubject(issuer, subject)
            .orElseThrow(() -> new IllegalStateException("Perfil no inicializado."));
        Session session = sessions.findById(sessionId)
            .orElseThrow(() -> new IllegalArgumentException("Sesión no encontrada: " + sessionId));

        Instant now = Instant.now();
        boolean isLocked = session.getStartsAt() == null || !now.isBefore(session.getStartsAt());

        WeekendMatchup matchup = matchupService.findForSession(sessionId).orElse(null);
        String d1 = matchup != null ? matchup.getDriver1Id() : null;
        String d2 = matchup != null ? matchup.getDriver2Id() : null;

        return predictions.findByUserAndSession(user, session)
            .map(p -> new PredictionDetailView(
                p.getId(),
                session.getId(),
                session.getName(),
                session.getCircuit(),
                session.getStartsAt(),
                isLocked,
                p.getPodium(),
                p.getPolePositionDriverId(),
                p.getDuelDriverPick(),
                p.getSafetyCarCount(),
                p.getDnfCount(),
                p.getScore(),
                p.getSubmittedAt(),
                d1,
                d2
            ))
            .orElseGet(() -> new PredictionDetailView(
                null,
                session.getId(),
                session.getName(),
                session.getCircuit(),
                session.getStartsAt(),
                isLocked,
                List.of(),
                null,
                null,
                null,
                null,
                null,
                null,
                d1,
                d2
            ));
    }

    /**
     * Carga o edita la predicción del usuario, validando estrictamente el "Lock Time".
     */
    @Transactional
    public PredictionDetailView saveOrUpdatePrediction(
        String issuer,
        String subject,
        UUID sessionId,
        SubmitPredictionRequest request
    ) {
        User user = users.findByIssuerAndSubject(issuer, subject)
            .orElseThrow(() -> new IllegalStateException("Primero inicializa tu perfil con PUT /me."));
        Session session = sessions.findById(sessionId)
            .orElseThrow(() -> new IllegalArgumentException("Sesión no encontrada: " + sessionId));

        Instant now = Instant.now();

        // REGLA DE NEGOCIO ESTRICTA (Lock Time):
        // "El sistema debe bloquear cualquier edición o carga de pronósticos exactamente en el horario
        // oficial de inicio de la sesión; no se permiten cambios posteriores."
        if (session.getStartsAt() == null || !now.isBefore(session.getStartsAt())) {
            throw new IllegalStateException("Lock Time superado: No se permiten cambios ni cargas de pronósticos una vez iniciada la sesión.");
        }

        WeekendMatchup matchup = matchupService.getOrGenerateMatchup(session);

        // Validación de pick de duelo
        if (request.duelDriverPick() != null && !matchup.involvesDriver(request.duelDriverPick())) {
            throw new IllegalArgumentException(String.format(
                "El piloto de duelo '%s' no coincide con los asignados (%s vs %s).",
                request.duelDriverPick(), matchup.getDriver1Id(), matchup.getDriver2Id()
            ));
        }

        // Validación numérica
        if (request.safetyCarCount() != null && request.safetyCarCount() < 0) {
            throw new IllegalArgumentException("La cantidad de autos de seguridad no puede ser negativa.");
        }
        if (request.dnfCount() != null && request.dnfCount() < 0) {
            throw new IllegalArgumentException("La cantidad de abandonos no puede ser negativa.");
        }

        Prediction prediction = predictions.findByUserAndSession(user, session).orElse(null);

        if (prediction == null) {
            prediction = new Prediction(
                user,
                session,
                request.podium(),
                request.polePositionDriverId(),
                request.duelDriverPick(),
                request.safetyCarCount(),
                request.dnfCount(),
                now
            );
        } else {
            prediction.updatePicks(
                request.podium(),
                request.polePositionDriverId(),
                request.duelDriverPick(),
                request.safetyCarCount(),
                request.dnfCount(),
                now
            );
        }

        Prediction saved = predictions.save(prediction);

        return new PredictionDetailView(
            saved.getId(),
            session.getId(),
            session.getName(),
            session.getCircuit(),
            session.getStartsAt(),
            false,
            saved.getPodium(),
            saved.getPolePositionDriverId(),
            saved.getDuelDriverPick(),
            saved.getSafetyCarCount(),
            saved.getDnfCount(),
            saved.getScore(),
            saved.getSubmittedAt(),
            matchup.getDriver1Id(),
            matchup.getDriver2Id()
        );
    }

    /**
     * Consulta el historial completo de predicciones y puntuaciones del usuario.
     */
    @Transactional(readOnly = true)
    public List<PredictionHistoryItem> getUserPredictionHistory(String issuer, String subject) {
        User user = users.findByIssuerAndSubject(issuer, subject)
            .orElseThrow(() -> new IllegalStateException("Perfil no inicializado."));

        return predictions.findByUserOrderBySubmittedAtDesc(user).stream()
            .map(p -> {
                Session s = p.getSession();
                WeekendMatchup matchup = matchupService.findForSession(s.getId()).orElse(null);
                SessionResult result = results.findBySessionId(s.getId()).orElse(null);
                ScoringService.ScoreBreakdown breakdown = null;
                if (result != null) {
                    try {
                        breakdown = scoringService.calculateScore(p, result, matchup);
                    } catch (Exception ignored) {}
                }
                String d1 = matchup != null ? matchup.getDriver1Id() : null;
                String d2 = matchup != null ? matchup.getDriver2Id() : null;

                return new PredictionHistoryItem(
                    p.getId(),
                    s.getId(),
                    s.getName(),
                    s.getCircuit(),
                    s.getRaceDate() != null ? s.getRaceDate().toString() : null,
                    s.getStartsAt(),
                    p.getPodium(),
                    p.getPolePositionDriverId(),
                    p.getDuelDriverPick(),
                    p.getSafetyCarCount(),
                    p.getDnfCount(),
                    p.getScore(),
                    p.getSubmittedAt(),
                    d1,
                    d2,
                    breakdown != null ? new ScoreBreakdownDto(
                        breakdown.podiumHits(),
                        breakdown.podiumPoints(),
                        breakdown.poleHit(),
                        breakdown.polePoints(),
                        breakdown.duelHit(),
                        breakdown.duelPoints(),
                        breakdown.safetyCarHit(),
                        breakdown.safetyCarPoints(),
                        breakdown.dnfHit(),
                        breakdown.dnfPoints(),
                        breakdown.totalPoints()
                    ) : null
                );
            })
            .toList();
    }

    public record ScoreBreakdownDto(
        int podiumHits,
        int podiumPoints,
        boolean poleHit,
        int polePoints,
        boolean duelHit,
        int duelPoints,
        boolean safetyCarHit,
        int safetyCarPoints,
        boolean dnfHit,
        int dnfPoints,
        int totalPoints
    ) {}

    public record PredictionHistoryItem(
        UUID predictionId,
        UUID sessionId,
        String sessionName,
        String circuit,
        String raceDate,
        Instant startsAt,
        List<String> podium,
        String polePositionDriverId,
        String duelDriverPick,
        Integer safetyCarCount,
        Integer dnfCount,
        Integer score,
        Instant submittedAt,
        String matchupDriver1,
        String matchupDriver2,
        ScoreBreakdownDto scoreBreakdown
    ) {}

    public record NextSessionView(
        UUID id,
        int season,
        int round,
        String name,
        String circuit,
        String type,
        String raceDate,
        Instant startsAt,
        boolean isLocked,
        String matchupDriver1,
        String matchupDriver2
    ) {}

    public record PredictionDetailView(
        UUID predictionId,
        UUID sessionId,
        String sessionName,
        String circuit,
        Instant startsAt,
        boolean isLocked,
        List<String> podium,
        String polePositionDriverId,
        String duelDriverPick,
        Integer safetyCarCount,
        Integer dnfCount,
        Integer score,
        Instant submittedAt,
        String matchupDriver1,
        String matchupDriver2
    ) {}

    public record SubmitPredictionRequest(
        List<String> podium,
        String polePositionDriverId,
        String duelDriverPick,
        Integer safetyCarCount,
        Integer dnfCount
    ) {}
}
