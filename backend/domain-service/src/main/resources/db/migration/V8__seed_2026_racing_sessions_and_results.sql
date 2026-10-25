-- V8__seed_2026_racing_sessions_and_results.sql
-- Carga inicial del calendario oficial F1 2026 (Rounds 18 a 23),
-- duelos de pilotos, resultados oficiales y puntuación para el GP de Estados Unidos (Round 18).

-- 1. Insertar sesiones de carreras 2026
INSERT INTO racing_sessions (id, season, round, type, name, circuit, race_date, starts_at)
VALUES 
    ('f0c23d70-f7ca-411d-b827-7a9d45037100', 2026, 18, 'RACE', 'United States Grand Prix', 'Circuit of the Americas', '2026-10-25', '2026-10-25 20:00:00+00'),
    ('f0c23d70-f7ca-411d-b827-7a9d45037101', 2026, 19, 'RACE', 'Mexico City Grand Prix', 'Autódromo Hermanos Rodríguez', '2026-11-01', '2026-11-01 20:00:00+00'),
    ('f0c23d70-f7ca-411d-b827-7a9d45037102', 2026, 20, 'RACE', 'São Paulo Grand Prix', 'Autódromo José Carlos Pace (Interlagos)', '2026-11-08', '2026-11-08 17:00:00+00'),
    ('f0c23d70-f7ca-411d-b827-7a9d45037103', 2026, 21, 'RACE', 'Las Vegas Grand Prix', 'Las Vegas Strip Circuit', '2026-11-21', '2026-11-22 04:00:00+00'),
    ('f0c23d70-f7ca-411d-b827-7a9d45037104', 2026, 22, 'RACE', 'Qatar Grand Prix', 'Lusail International Circuit', '2026-11-29', '2026-11-29 16:00:00+00'),
    ('f0c23d70-f7ca-411d-b827-7a9d45037105', 2026, 23, 'RACE', 'Abu Dhabi Grand Prix', 'Yas Marina Circuit', '2026-12-06', '2026-12-06 13:00:00+00')
ON CONFLICT (season, round, type) 
DO UPDATE SET 
    name = EXCLUDED.name,
    circuit = EXCLUDED.circuit,
    race_date = EXCLUDED.race_date,
    starts_at = EXCLUDED.starts_at;

-- 2. Duelos oficiales de fin de semana
INSERT INTO weekend_matchups (id, session_id, driver1_id, driver2_id, created_at)
VALUES 
    ('e0c23d70-f7ca-411d-b827-7a9d45037118', 'f0c23d70-f7ca-411d-b827-7a9d45037100', 'norris', 'verstappen', CURRENT_TIMESTAMP),
    ('e0c23d70-f7ca-411d-b827-7a9d45037119', 'f0c23d70-f7ca-411d-b827-7a9d45037101', 'norris', 'leclerc', CURRENT_TIMESTAMP)
ON CONFLICT (session_id) DO NOTHING;

-- 3. Resultados oficiales homologados FIA para el Gran Premio de Estados Unidos (Round 18 - Austin)
INSERT INTO session_results (id, session_id, published_at, pole_position_driver_id, safety_car_count, dnf_count, duel_winner_driver_id)
VALUES 
    ('a1c23d70-f7ca-411d-b827-7a9d45037118', 'f0c23d70-f7ca-411d-b827-7a9d45037100', CURRENT_TIMESTAMP, 'antonelli', 1, 3, 'verstappen')
ON CONFLICT (session_id) 
DO UPDATE SET 
    pole_position_driver_id = EXCLUDED.pole_position_driver_id,
    safety_car_count = EXCLUDED.safety_car_count,
    dnf_count = EXCLUDED.dnf_count,
    duel_winner_driver_id = EXCLUDED.duel_winner_driver_id;

-- 4. Clasificación oficial de pilotos (Finishers) para Round 18
INSERT INTO result_finishers (result_id, position, driver_id)
VALUES 
    ('a1c23d70-f7ca-411d-b827-7a9d45037118', 0, 'antonelli'),
    ('a1c23d70-f7ca-411d-b827-7a9d45037118', 1, 'leclerc'),
    ('a1c23d70-f7ca-411d-b827-7a9d45037118', 2, 'verstappen'),
    ('a1c23d70-f7ca-411d-b827-7a9d45037118', 3, 'hamilton'),
    ('a1c23d70-f7ca-411d-b827-7a9d45037118', 4, 'norris'),
    ('a1c23d70-f7ca-411d-b827-7a9d45037118', 5, 'piastri'),
    ('a1c23d70-f7ca-411d-b827-7a9d45037118', 6, 'russell'),
    ('a1c23d70-f7ca-411d-b827-7a9d45037118', 7, 'sainz'),
    ('a1c23d70-f7ca-411d-b827-7a9d45037118', 8, 'albon'),
    ('a1c23d70-f7ca-411d-b827-7a9d45037118', 9, 'alonso')
ON CONFLICT (result_id, position) 
DO UPDATE SET driver_id = EXCLUDED.driver_id;
