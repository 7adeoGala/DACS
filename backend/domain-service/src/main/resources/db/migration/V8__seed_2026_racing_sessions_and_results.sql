-- V8__seed_2026_racing_sessions_and_results.sql
-- Carga inicial del calendario oficial F1 2026 (Rounds 18 a 23),
-- duelos de pilotos, resultados oficiales y puntuación para el GP de Estados Unidos (Round 18).

DO $$
DECLARE
    v_session_18_id UUID;
    v_session_19_id UUID;
    v_result_18_id UUID;
BEGIN
    -- 1. Insertar sesiones de carreras 2026 si no existen, o actualizar sus metadatos
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

    -- 2. Obtener los IDs REALES de las sesiones 18 y 19 existentes en la base de datos
    SELECT id INTO v_session_18_id FROM racing_sessions WHERE season = 2026 AND round = 18 AND type = 'RACE';
    SELECT id INTO v_session_19_id FROM racing_sessions WHERE season = 2026 AND round = 19 AND type = 'RACE';

    -- 3. Duelos oficiales de fin de semana para los IDs reales
    IF v_session_18_id IS NOT NULL THEN
        INSERT INTO weekend_matchups (id, session_id, driver1_id, driver2_id, created_at)
        VALUES (gen_random_uuid(), v_session_18_id, 'norris', 'verstappen', CURRENT_TIMESTAMP)
        ON CONFLICT (session_id) 
        DO UPDATE SET driver1_id = EXCLUDED.driver1_id, driver2_id = EXCLUDED.driver2_id;
    END IF;

    IF v_session_19_id IS NOT NULL THEN
        INSERT INTO weekend_matchups (id, session_id, driver1_id, driver2_id, created_at)
        VALUES (gen_random_uuid(), v_session_19_id, 'norris', 'leclerc', CURRENT_TIMESTAMP)
        ON CONFLICT (session_id) 
        DO UPDATE SET driver1_id = EXCLUDED.driver1_id, driver2_id = EXCLUDED.driver2_id;
    END IF;

    -- 4. Resultados oficiales homologados FIA para el Gran Premio de Estados Unidos (Round 18)
    IF v_session_18_id IS NOT NULL THEN
        INSERT INTO session_results (id, session_id, published_at, pole_position_driver_id, safety_car_count, dnf_count, duel_winner_driver_id)
        VALUES (gen_random_uuid(), v_session_18_id, CURRENT_TIMESTAMP, 'antonelli', 1, 3, 'verstappen')
        ON CONFLICT (session_id) 
        DO UPDATE SET 
            pole_position_driver_id = EXCLUDED.pole_position_driver_id,
            safety_car_count = EXCLUDED.safety_car_count,
            dnf_count = EXCLUDED.dnf_count,
            duel_winner_driver_id = EXCLUDED.duel_winner_driver_id;

        -- Obtener el ID real del resultado de sesión
        SELECT id INTO v_result_18_id FROM session_results WHERE session_id = v_session_18_id;

        -- 5. Clasificación oficial de pilotos (Finishers) para Round 18
        -- Eliminamos finishers previos de ese result_id para evitar conflictos de clave única en caso de reejecución
        DELETE FROM result_finishers WHERE result_id = v_result_18_id;

        INSERT INTO result_finishers (result_id, position, driver_id)
        VALUES 
            (v_result_18_id, 0, 'antonelli'),
            (v_result_18_id, 1, 'leclerc'),
            (v_result_18_id, 2, 'verstappen'),
            (v_result_18_id, 3, 'hamilton'),
            (v_result_18_id, 4, 'norris'),
            (v_result_18_id, 5, 'piastri'),
            (v_result_18_id, 6, 'russell'),
            (v_result_18_id, 7, 'sainz'),
            (v_result_18_id, 8, 'albon'),
            (v_result_18_id, 9, 'alonso');
    END IF;

END $$;
