package ar.edu.dacs.apexpredict.application;

import ar.edu.dacs.apexpredict.domain.*;
import ar.edu.dacs.apexpredict.infrastructure.persistence.*;
import java.time.Instant;
import java.util.*;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@SuppressWarnings("null")
public class PredictionService {

    private static final Logger log = LoggerFactory.getLogger(PredictionService.class);

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
            ScoringService scoringService) {
        this.predictions = predictions;
        this.sessions = sessions;
        this.users = users;
        this.matchupService = matchupService;
        this.results = results;
        this.scoringService = scoringService;
    }

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
                matchup.getDriver2Id());
    }

    @Transactional(readOnly = true)
    public Session resolveSession(String sessionIdentifier) {
        if (sessionIdentifier == null || sessionIdentifier.isBlank()) {
            return null;
        }
        String cleanId = sessionIdentifier.trim();
        try {
            UUID uuid = UUID.fromString(cleanId);
            Session found = sessions.findById(uuid).orElse(null);
            if (found != null) {
                return found;
            }
        } catch (IllegalArgumentException ex) {
            log.debug("Identificador de sesión no es UUID: {}", cleanId);
        }

        if ("next".equalsIgnoreCase(cleanId) || "current".equalsIgnoreCase(cleanId)) {
            return sessions.findFirstByStartsAtAfterOrderByStartsAtAsc(Instant.now()).orElse(null);
        }

        if ("f0c23d70-f7ca-411d-b827-7a9d45037101".equalsIgnoreCase(cleanId)) {
            Session s19 = sessions.findBySeasonAndRoundAndType(2026, 19, Session.Type.RACE).orElse(null);
            if (s19 != null)
                return s19;
        }

        if ("f0c23d70-f7ca-411d-b827-7a9d45037100".equalsIgnoreCase(cleanId)) {
            Session s18 = sessions.findBySeasonAndRoundAndType(2026, 18, Session.Type.RACE).orElse(null);
            if (s18 != null)
                return s18;
        }

        String clean = cleanId.toLowerCase().replace("jolpica-", "");
        if (clean.contains("-")) {
            String[] parts = clean.split("-");
            if (parts.length >= 2) {
                try {
                    int season = Integer.parseInt(parts[0]);
                    int round = Integer.parseInt(parts[1]);
                    return sessions.findBySeasonAndRoundAndType(season, round, Session.Type.RACE).orElse(null);
                } catch (NumberFormatException ex) {
                    log.debug("Formato season-round inválido en identificador de sesión: {}", cleanId);
                }
            }
        }
        return null;
    }

    private User getOrCreateUser(String issuer, String subject) {
        return users.findByIssuerAndSubject(issuer, subject)
                .orElseGet(() -> {
                    UUID newId = UUID.randomUUID();
                    users.upsert(newId, issuer, subject, subject, null);
                    return users.findByIssuerAndSubject(issuer, subject).orElseThrow();
                });
    }

    @Transactional(readOnly = true)
    public PredictionDetailView getUserPrediction(String issuer, String subject, String sessionIdentifier) {
        Session session = resolveSession(sessionIdentifier);
        if (session == null) {
            UUID parsedUuid = null;
            try {
                parsedUuid = UUID.fromString(sessionIdentifier.trim());
            } catch (IllegalArgumentException ex) {
                log.debug("Identificador de sesión sin formato UUID: {}", sessionIdentifier);
            }
            return new PredictionDetailView(
                    null,
                    parsedUuid,
                    "Gran Premio",
                    "Circuito Oficial",
                    null,
                    false,
                    List.of(),
                    null,
                    null,
                    null,
                    null,
                    null,
                    null,
                    "norris",
                    "leclerc");
        }
        return getUserPrediction(issuer, subject, session.getId());
    }

    @Transactional(readOnly = true)
    public PredictionDetailView getUserPrediction(String issuer, String subject, UUID sessionId) {
        User user = getOrCreateUser(issuer, subject);
        Session resolved = sessions.findById(sessionId).orElse(null);
        if (resolved == null) {
            resolved = resolveSession(sessionId.toString());
        }
        if (resolved == null) {
            return new PredictionDetailView(
                    null,
                    sessionId,
                    "Gran Premio",
                    "Circuito Oficial",
                    null,
                    false,
                    List.of(),
                    null,
                    null,
                    null,
                    null,
                    null,
                    null,
                    "norris",
                    "leclerc");
        }

        final Session session = resolved;
        Instant now = Instant.now();
        boolean isLocked = session.getStartsAt() == null || !now.isBefore(session.getStartsAt());

        WeekendMatchup matchup = matchupService.findForSession(session.getId()).orElse(null);
        String d1 = matchup != null ? matchup.getDriver1Id() : "norris";
        String d2 = matchup != null ? matchup.getDriver2Id() : "leclerc";

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
                        d2))
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
                        d2));
    }

    @Transactional
    public PredictionDetailView saveOrUpdatePrediction(
            String issuer,
            String subject,
            String sessionIdentifier,
            SubmitPredictionRequest request) {
        Session session = resolveSession(sessionIdentifier);
        if (session == null) {
            throw new IllegalArgumentException("Sesión no encontrada: " + sessionIdentifier);
        }
        return saveOrUpdatePrediction(issuer, subject, session.getId(), request);
    }

    @Transactional
    public PredictionDetailView saveOrUpdatePrediction(
            String issuer,
            String subject,
            UUID sessionId,
            SubmitPredictionRequest request) {
        User user = getOrCreateUser(issuer, subject);
        Session resolved = sessions.findById(sessionId).orElse(null);
        if (resolved == null) {
            resolved = resolveSession(sessionId.toString());
        }
        if (resolved == null) {
            throw new IllegalArgumentException("Sesión no encontrada: " + sessionId);
        }
        final Session session = resolved;

        Instant now = Instant.now();

        if (session.getStartsAt() == null || !now.isBefore(session.getStartsAt())) {
            throw new IllegalStateException("Las predicciones para esta sesión se encuentran cerradas.");
        }

        WeekendMatchup matchup = matchupService.getOrGenerateMatchup(session);

        if (request.duelDriverPick() != null && !request.duelDriverPick().isBlank()
                && !matchup.involvesDriver(request.duelDriverPick().trim())) {
            throw new IllegalArgumentException(String.format(
                    "El piloto de duelo '%s' no coincide con los asignados (%s vs %s).",
                    request.duelDriverPick(), matchup.getDriver1Id(), matchup.getDriver2Id()));
        }

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
                    now);
        } else {
            prediction.updatePicks(
                    request.podium(),
                    request.polePositionDriverId(),
                    request.duelDriverPick(),
                    request.safetyCarCount(),
                    request.dnfCount(),
                    now);
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
                matchup.getDriver2Id());
    }

    @Transactional
    public List<PredictionHistoryItem> getUserPredictionHistory(String issuer, String subject) {
        try {
            scoringService.autoScoreAllCompletedSessions();
        } catch (Exception ex) {
            log.debug("Auto-score omitido al consultar historial: {}", ex.getMessage());
        }

        User user = users.findByIssuerAndSubject(issuer, subject).orElse(null);
        Map<UUID, Prediction> predictionsBySessionId = new HashMap<>();
        if (user != null) {
            for (Prediction p : predictions.findByUserOrderBySubmittedAtDesc(user)) {
                UUID sid = p.getSession() != null ? p.getSession().getId() : null;
                if (sid != null) {
                    predictionsBySessionId.putIfAbsent(sid, p);
                }
            }
        }

        Instant now = Instant.now();
        List<Session> raceSessions = sessions.findAll().stream()
                .filter(s -> s != null && s.getType() == Session.Type.RACE)
                .sorted(Comparator
                        .comparing((Session s) -> s.getStartsAt(), Comparator.nullsLast(Comparator.reverseOrder()))
                        .thenComparing(Comparator.comparingInt((Session s) -> s.getSeason()).reversed())
                        .thenComparing(Comparator.comparingInt((Session s) -> s.getRound()).reversed()))
                .toList();

        List<PredictionHistoryItem> history = new ArrayList<>();
        for (Session s : raceSessions) {
            UUID sid = s.getId();
            Prediction p = sid != null ? predictionsBySessionId.get(sid) : null;
            SessionResult result = sid != null ? results.findBySessionId(sid).orElse(null) : null;
            boolean hasStarted = s.getStartsAt() != null && !s.getStartsAt().isAfter(now);

            if (p == null && result == null && !hasStarted) {
                continue;
            }
            history.add(toHistoryItem(s, p, result));
        }

        if (user != null) {
            Set<UUID> includedIds = new HashSet<>();
            for (PredictionHistoryItem item : history) {
                if (item.sessionId() != null)
                    includedIds.add(item.sessionId());
            }
            for (Prediction p : predictions.findByUserOrderBySubmittedAtDesc(user)) {
                Session s = p.getSession();
                if (s != null && s.getId() != null && !includedIds.contains(s.getId())) {
                    SessionResult result = results.findBySessionId(s.getId()).orElse(null);
                    history.add(toHistoryItem(s, p, result));
                }
            }
        }

        return history;
    }

    private PredictionHistoryItem toHistoryItem(Session s, Prediction p, SessionResult result) {
        UUID sid = s.getId();
        WeekendMatchup matchup = sid != null ? matchupService.findForSession(sid).orElse(null) : null;
        String d1 = matchup != null ? matchup.getDriver1Id() : null;
        String d2 = matchup != null ? matchup.getDriver2Id() : null;

        ScoringService.ScoreBreakdown breakdown = null;
        if (p != null && result != null) {
            try {
                breakdown = scoringService.calculateScore(p, result, matchup);
                if (p.getScore() == null || !p.getScore().equals(breakdown.totalPoints())) {
                    p.applyScore(breakdown.totalPoints(), Instant.now());
                    predictions.save(p);
                }
            } catch (Exception ex) {
                log.debug("Error calculando puntaje en historial para sesión {}: {}", sid, ex.getMessage());
            }
        }

        OfficialResultSummary officialSummary = null;
        if (result != null) {
            List<String> officialPodium = result.getClassification() != null
                    ? result.getClassification().stream().limit(3).toList()
                    : List.of();
            String duelWinner = scoringService.resolveDuelWinner(result, matchup);
            officialSummary = new OfficialResultSummary(
                    officialPodium,
                    result.getPolePositionDriverId(),
                    duelWinner,
                    result.getSafetyCarCount(),
                    result.getDnfCount());
        }

        Integer finalScore = p != null
                ? (p.getScore() != null ? p.getScore() : (breakdown != null ? breakdown.totalPoints() : null))
                : null;

        ScoreBreakdownDto breakdownDto = breakdown != null ? new ScoreBreakdownDto(
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
                breakdown.totalPoints()) : null;

        return new PredictionHistoryItem(
                p != null ? p.getId() : null,
                sid,
                s.getName(),
                s.getCircuit(),
                s.getRaceDate() != null ? s.getRaceDate().toString() : null,
                s.getStartsAt(),
                p != null && p.getPodium() != null ? p.getPodium() : List.of(),
                p != null ? p.getPolePositionDriverId() : null,
                p != null ? p.getDuelDriverPick() : null,
                p != null ? p.getSafetyCarCount() : null,
                p != null ? p.getDnfCount() : null,
                finalScore,
                p != null ? p.getSubmittedAt() : null,
                d1,
                d2,
                breakdownDto,
                officialSummary);
    }

    public record OfficialResultSummary(
            List<String> podium,
            String polePositionDriverId,
            String duelWinnerId,
            Integer safetyCarCount,
            Integer dnfCount) {
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
            int totalPoints) {
    }

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
            ScoreBreakdownDto scoreBreakdown,
            OfficialResultSummary officialResults) {
    }

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
            String matchupDriver2) {
    }

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
            String matchupDriver2) {
    }

    @Transactional(readOnly = true)
    public List<AdminSessionView> listAdminSessions() {
        Instant now = Instant.now();
        return sessions.findAll().stream()
                .filter(s -> s != null && s.getType() == Session.Type.RACE)
                .sorted(Comparator
                        .comparingInt(Session::getSeason).reversed()
                        .thenComparing(Comparator.comparingInt(Session::getRound).reversed()))
                .map(s -> {
                    UUID sid = s.getId();
                    boolean isLocked = s.getStartsAt() == null || !now.isBefore(s.getStartsAt());
                    boolean hasResult = sid != null && results.findBySessionId(sid).isPresent();
                    List<Prediction> sessionPreds = sid != null ? predictions.findBySessionId(sid) : List.of();
                    long scored = sessionPreds.stream().filter(p -> p.getScore() != null).count();
                    return new AdminSessionView(
                            sid,
                            s.getSeason(),
                            s.getRound(),
                            s.getName(),
                            s.getCircuit(),
                            s.getRaceDate() != null ? s.getRaceDate().toString() : null,
                            s.getStartsAt(),
                            isLocked,
                            hasResult,
                            sessionPreds.size(),
                            (int) scored);
                })
                .toList();
    }

    public record AdminSessionView(
            UUID id,
            int season,
            int round,
            String name,
            String circuit,
            String raceDate,
            Instant startsAt,
            boolean isLocked,
            boolean hasOfficialResult,
            int predictionsCount,
            int scoredCount) {
    }

    public record SubmitPredictionRequest(
            List<String> podium,
            String polePositionDriverId,
            String duelDriverPick,
            Integer safetyCarCount,
            Integer dnfCount) {
    }
}
