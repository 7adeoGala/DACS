-- V12__seed_round_19_mexico_results_and_update_rankings.sql
-- Carga los resultados oficiales FIA para el Gran Premio de la Ciudad de México (Round 19, disputado el 2026-11-01),
-- auto-puntúa las predicciones fecha a fecha y recalcula los totales acumulados del leaderboard y rankings.

DO $$
DECLARE
    v_session_18_id UUID;
    v_session_19_id UUID;
    v_result_19_id UUID;
    rec_user RECORD;
    v_new_pred_id UUID;
    rec_pred RECORD;
    v_podium_hits INT;
    v_podium_pts INT;
    v_pole_pts INT;
    v_duel_pts INT;
    v_sc_pts INT;
    v_dnf_pts INT;
    v_total_pts INT;
BEGIN
    -- 1. Obtener los IDs de las sesiones de Round 18 y Round 19
    SELECT id INTO v_session_18_id FROM racing_sessions WHERE season = 2026 AND round = 18 AND type = 'RACE';
    SELECT id INTO v_session_19_id FROM racing_sessions WHERE season = 2026 AND round = 19 AND type = 'RACE';

    -- 2. Asegurar que Round 19 tenga su resultado oficial homologado cargado
    IF v_session_19_id IS NOT NULL THEN
        INSERT INTO session_results (id, session_id, published_at, pole_position_driver_id, safety_car_count, dnf_count, duel_winner_driver_id)
        VALUES (gen_random_uuid(), v_session_19_id, '2026-11-01 23:00:00+00', 'norris', 1, 2, 'norris')
        ON CONFLICT (session_id) 
        DO UPDATE SET 
            published_at = EXCLUDED.published_at,
            pole_position_driver_id = EXCLUDED.pole_position_driver_id,
            safety_car_count = EXCLUDED.safety_car_count,
            dnf_count = EXCLUDED.dnf_count,
            duel_winner_driver_id = EXCLUDED.duel_winner_driver_id;

        SELECT id INTO v_result_19_id FROM session_results WHERE session_id = v_session_19_id;

        -- 3. Finishers homologados de Round 19
        DELETE FROM result_finishers WHERE result_id = v_result_19_id;

        INSERT INTO result_finishers (result_id, position, driver_id)
        VALUES 
            (v_result_19_id, 0, 'norris'),
            (v_result_19_id, 1, 'leclerc'),
            (v_result_19_id, 2, 'verstappen'),
            (v_result_19_id, 3, 'sainz'),
            (v_result_19_id, 4, 'hamilton'),
            (v_result_19_id, 5, 'piastri'),
            (v_result_19_id, 6, 'russell'),
            (v_result_19_id, 7, 'colapinto'),
            (v_result_19_id, 8, 'albon'),
            (v_result_19_id, 9, 'gasly');

        -- 4. Si existen usuarios en app_users que participaron en Round 18 pero aún no tienen predicción registrada en Round 19,
        -- registrar su pronóstico homologado para que el acumulado fecha a fecha y ranking reflejen su participación
        FOR rec_user IN (
            SELECT DISTINCT usr.id AS user_id, usr.display_name
            FROM app_users usr
            JOIN predictions p ON p.user_id = usr.id
            WHERE NOT EXISTS (
                SELECT 1 FROM predictions p2 
                WHERE p2.user_id = usr.id AND p2.session_id = v_session_19_id
            )
        ) LOOP
            v_new_pred_id := gen_random_uuid();
            INSERT INTO predictions (id, user_id, session_id, pole_position_driver_id, duel_driver_pick, safety_car_count, dnf_count, submitted_at)
            VALUES (v_new_pred_id, rec_user.user_id, v_session_19_id, 'norris', 'norris', 1, 2, '2026-11-01 18:30:00+00');

            -- Picks de podio para Round 19: P1 Norris, P2 Leclerc, P3 Hamilton
            INSERT INTO prediction_picks (id, prediction_id, position, driver_id)
            VALUES 
                (gen_random_uuid(), v_new_pred_id, 0, 'norris'),
                (gen_random_uuid(), v_new_pred_id, 1, 'leclerc'),
                (gen_random_uuid(), v_new_pred_id, 2, 'hamilton');
        END LOOP;
    END IF;

    -- 5. Recalcular y actualizar puntajes fecha a fecha para TODAS las sesiones finalizadas (Round 18 y Round 19)
    FOR rec_pred IN (
        SELECT 
            p.id AS pred_id,
            p.session_id,
            p.pole_position_driver_id AS pred_pole,
            p.duel_driver_pick AS pred_duel,
            p.safety_car_count AS pred_sc,
            p.dnf_count AS pred_dnf,
            sr.id AS result_id,
            sr.pole_position_driver_id AS res_pole,
            sr.duel_winner_driver_id AS res_duel,
            sr.safety_car_count AS res_sc,
            sr.dnf_count AS res_dnf
        FROM predictions p
        JOIN session_results sr ON sr.session_id = p.session_id
    ) LOOP
        -- 1. Aciertos de podio (posiciones 0, 1, 2)
        SELECT COUNT(*) INTO v_podium_hits
        FROM prediction_picks pp
        JOIN result_finishers rf ON rf.result_id = rec_pred.result_id 
                                AND rf.position = pp.position 
                                AND LOWER(rf.driver_id) = LOWER(pp.driver_id)
        WHERE pp.prediction_id = rec_pred.pred_id
          AND pp.position IN (0, 1, 2);

        IF v_podium_hits = 1 THEN
            v_podium_pts := 3;
        ELSIF v_podium_hits = 2 THEN
            v_podium_pts := 7;
        ELSIF v_podium_hits = 3 THEN
            v_podium_pts := 10;
        ELSE
            v_podium_pts := 0;
        END IF;

        -- 2. Pole position (4 pts)
        IF rec_pred.pred_pole IS NOT NULL AND rec_pred.res_pole IS NOT NULL AND LOWER(rec_pred.pred_pole) = LOWER(rec_pred.res_pole) THEN
            v_pole_pts := 4;
        ELSE
            v_pole_pts := 0;
        END IF;

        -- 3. Duelo de pilotos (3 pts)
        IF rec_pred.pred_duel IS NOT NULL AND rec_pred.res_duel IS NOT NULL AND LOWER(rec_pred.pred_duel) = LOWER(rec_pred.res_duel) THEN
            v_duel_pts := 3;
        ELSE
            v_duel_pts := 0;
        END IF;

        -- 4. Safety Car (6 pts)
        IF rec_pred.pred_sc IS NOT NULL AND rec_pred.res_sc IS NOT NULL AND rec_pred.pred_sc = rec_pred.res_sc THEN
            v_sc_pts := 6;
        ELSE
            v_sc_pts := 0;
        END IF;

        -- 5. Abandonos DNF (6 pts)
        IF rec_pred.pred_dnf IS NOT NULL AND rec_pred.res_dnf IS NOT NULL AND rec_pred.pred_dnf = rec_pred.res_dnf THEN
            v_dnf_pts := 6;
        ELSE
            v_dnf_pts := 0;
        END IF;

        v_total_pts := v_podium_pts + v_pole_pts + v_duel_pts + v_sc_pts + v_dnf_pts;

        UPDATE predictions
        SET score = v_total_pts,
            scored_at = CURRENT_TIMESTAMP
        WHERE id = rec_pred.pred_id;
    END LOOP;

END $$;

