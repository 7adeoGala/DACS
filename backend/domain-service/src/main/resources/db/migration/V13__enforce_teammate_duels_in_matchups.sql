-- V13__enforce_teammate_duels_in_matchups.sql
-- Garantiza que el duelo directo oficial de fin de semana sea dinámico y esté conformado
-- estrictamente por pilotos titulares activos que pertenezcan a la MISMA escudería (duelo intra-equipo).

DO $$
DECLARE
    v_session_20_id UUID;
    v_session_21_id UUID;
    v_session_22_id UUID;
    v_session_23_id UUID;
BEGIN
    SELECT id INTO v_session_20_id FROM racing_sessions WHERE season = 2026 AND round = 20 AND type = 'RACE';
    SELECT id INTO v_session_21_id FROM racing_sessions WHERE season = 2026 AND round = 21 AND type = 'RACE';
    SELECT id INTO v_session_22_id FROM racing_sessions WHERE season = 2026 AND round = 22 AND type = 'RACE';
    SELECT id INTO v_session_23_id FROM racing_sessions WHERE season = 2026 AND round = 23 AND type = 'RACE';

    -- 1. Round 20 (São Paulo GP / Interlagos): Duelo de compañeros Racing Bulls (Lawson vs Lindblad)
    IF v_session_20_id IS NOT NULL THEN
        INSERT INTO weekend_matchups (id, session_id, driver1_id, driver2_id, created_at)
        VALUES (gen_random_uuid(), v_session_20_id, 'lawson', 'lindblad', CURRENT_TIMESTAMP)
        ON CONFLICT (session_id) 
        DO UPDATE SET driver1_id = 'lawson', driver2_id = 'lindblad';

        -- Actualizar cualquier pick de usuario para Round 20 que tuviese pilotos viejos/distintos
        UPDATE predictions
        SET duel_driver_pick = 'lawson'
        WHERE session_id = v_session_20_id
          AND LOWER(duel_driver_pick) NOT IN ('lawson', 'lindblad');
    END IF;

    -- 2. Round 21 (Las Vegas GP): Duelo de compañeros Audi (Hülkenberg vs Bortoleto)
    IF v_session_21_id IS NOT NULL THEN
        INSERT INTO weekend_matchups (id, session_id, driver1_id, driver2_id, created_at)
        VALUES (gen_random_uuid(), v_session_21_id, 'hulkenberg', 'bortoleto', CURRENT_TIMESTAMP)
        ON CONFLICT (session_id) 
        DO UPDATE SET driver1_id = 'hulkenberg', driver2_id = 'bortoleto';
    END IF;

    -- 3. Round 22 (Qatar GP / Lusail): Duelo de compañeros Haas GR (Bearman vs Ocon)
    IF v_session_22_id IS NOT NULL THEN
        INSERT INTO weekend_matchups (id, session_id, driver1_id, driver2_id, created_at)
        VALUES (gen_random_uuid(), v_session_22_id, 'bearman', 'ocon', CURRENT_TIMESTAMP)
        ON CONFLICT (session_id) 
        DO UPDATE SET driver1_id = 'bearman', driver2_id = 'ocon';
    END IF;

    -- 4. Round 23 (Abu Dhabi GP / Yas Marina): Duelo de compañeros Cadillac (Pérez vs Bottas)
    IF v_session_23_id IS NOT NULL THEN
        INSERT INTO weekend_matchups (id, session_id, driver1_id, driver2_id, created_at)
        VALUES (gen_random_uuid(), v_session_23_id, 'perez', 'bottas', CURRENT_TIMESTAMP)
        ON CONFLICT (session_id) 
        DO UPDATE SET driver1_id = 'perez', driver2_id = 'bottas';
    END IF;

END $$;
