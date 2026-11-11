-- V15__cleanup_fake_predictions_and_sync_real_results.sql
-- 1. Elimina los pronosticos sinteticos/falsos inyectados por migraciones previas (V12/V14) o seed automatico
--    para usuarios que NO enviaron pronosticos reales en Round 18 y Round 19.
-- 2. Actualiza y homologa los resultados oficiales REALES (Jolpica F1 API + FIA OpenF1 Race Control)
--    para Round 18 (Austin), Round 19 (Ciudad de Mexico) y Round 20 (Sao Paulo).
-- 3. Recalcula el puntaje oficial exacto de todos los pronosticos reales existentes en la base de datos.

DO $$
DECLARE
    v_session_18_id UUID;
    v_session_19_id UUID;
    v_session_20_id UUID;
    v_result_18_id UUID;
    v_result_19_id UUID;
    v_result_20_id UUID;
    rec_pred RECORD;
    v_podium_hits INT;
    v_podium_pts INT;
    v_pole_pts INT;
    v_duel_pts INT;
    v_sc_pts INT;
    v_dnf_pts INT;
    v_total_pts INT;
BEGIN
    -- Resolver IDs reales de las sesiones 18, 19 y 20 (temporada 2026)
    SELECT id INTO v_session_18_id FROM racing_sessions WHERE season = 2026 AND round = 18 AND type = 'RACE';
    SELECT id INTO v_session_19_id FROM racing_sessions WHERE season = 2026 AND round = 19 AND type = 'RACE';
    SELECT id INTO v_session_20_id FROM racing_sessions WHERE season = 2026 AND round = 20 AND type = 'RACE';

    -- 1. Eliminar exclusivamente los pronosticos sinteticos inyectados automaticamente
    --    (preserva integramente los pronosticos enviados por usuarios reales)
    IF v_session_18_id IS NOT NULL THEN
        DELETE FROM predictions
        WHERE session_id = v_session_18_id
          AND submitted_at = '2026-10-25 18:30:00+00'
          AND LOWER(COALESCE(pole_position_driver_id, '')) = 'verstappen'
          AND LOWER(COALESCE(duel_driver_pick, '')) = 'verstappen'
          AND safety_car_count = 1
          AND dnf_count = 2;
    END IF;

    IF v_session_19_id IS NOT NULL THEN
        DELETE FROM predictions
        WHERE session_id = v_session_19_id
          AND submitted_at = '2026-11-01 18:30:00+00'
          AND LOWER(COALESCE(pole_position_driver_id, '')) = 'norris'
          AND LOWER(COALESCE(duel_driver_pick, '')) = 'norris'
          AND safety_car_count = 1
          AND dnf_count = 2;
    END IF;

    -- 2. Resultados oficiales REALES Round 18 (United States GP - 2026-10-25)
    --    Pole: antonelli | P1 antonelli, P2 leclerc, P3 verstappen
    --    Duelo (norris vs verstappen): verstappen (P3 vs P5)
    --    SC/VSC: 2 (VSC vuelta 2 + VSC vuelta 51 segun FIA OpenF1 Race Control)
    --    DNF/DNS: 3 (bottas, colapinto, bearman)
    IF v_session_18_id IS NOT NULL THEN
        INSERT INTO weekend_matchups (id, session_id, driver1_id, driver2_id, created_at)
        VALUES (gen_random_uuid(), v_session_18_id, 'norris', 'verstappen', CURRENT_TIMESTAMP)
        ON CONFLICT (session_id)
        DO UPDATE SET driver1_id = EXCLUDED.driver1_id, driver2_id = EXCLUDED.driver2_id;

        INSERT INTO session_results (id, session_id, published_at, pole_position_driver_id, safety_car_count, dnf_count, duel_winner_driver_id)
        VALUES (gen_random_uuid(), v_session_18_id, '2026-10-25 23:00:00+00', 'antonelli', 2, 3, 'verstappen')
        ON CONFLICT (session_id)
        DO UPDATE SET
            published_at = EXCLUDED.published_at,
            pole_position_driver_id = EXCLUDED.pole_position_driver_id,
            safety_car_count = EXCLUDED.safety_car_count,
            dnf_count = EXCLUDED.dnf_count,
            duel_winner_driver_id = EXCLUDED.duel_winner_driver_id;

        SELECT id INTO v_result_18_id FROM session_results WHERE session_id = v_session_18_id;
        DELETE FROM result_finishers WHERE result_id = v_result_18_id;
        INSERT INTO result_finishers (result_id, position, driver_id)
        VALUES
            (v_result_18_id, 0, 'antonelli'),
            (v_result_18_id, 1, 'leclerc'),
            (v_result_18_id, 2, 'verstappen'),
            (v_result_18_id, 3, 'hamilton'),
            (v_result_18_id, 4, 'norris'),
            (v_result_18_id, 5, 'hadjar'),
            (v_result_18_id, 6, 'piastri'),
            (v_result_18_id, 7, 'russell'),
            (v_result_18_id, 8, 'lawson'),
            (v_result_18_id, 9, 'gasly');
    END IF;

    -- 3. Resultados oficiales REALES Round 19 (Mexico City GP - 2026-11-01)
    --    Pole: hamilton | P1 verstappen, P2 hamilton, P3 antonelli
    --    Duelo (norris vs leclerc): leclerc (P4 vs P5)
    --    SC/VSC: 3 (VSC vuelta 7 + SC vuelta 44 [Bandera Roja] + SC vuelta 59 segun FIA OpenF1)
    --    DNF/DNS: 5 (lindblad, bearman, bottas, stroll, alonso)
    IF v_session_19_id IS NOT NULL THEN
        INSERT INTO weekend_matchups (id, session_id, driver1_id, driver2_id, created_at)
        VALUES (gen_random_uuid(), v_session_19_id, 'norris', 'leclerc', CURRENT_TIMESTAMP)
        ON CONFLICT (session_id)
        DO UPDATE SET driver1_id = EXCLUDED.driver1_id, driver2_id = EXCLUDED.driver2_id;

        INSERT INTO session_results (id, session_id, published_at, pole_position_driver_id, safety_car_count, dnf_count, duel_winner_driver_id)
        VALUES (gen_random_uuid(), v_session_19_id, '2026-11-01 23:00:00+00', 'hamilton', 3, 5, 'leclerc')
        ON CONFLICT (session_id)
        DO UPDATE SET
            published_at = EXCLUDED.published_at,
            pole_position_driver_id = EXCLUDED.pole_position_driver_id,
            safety_car_count = EXCLUDED.safety_car_count,
            dnf_count = EXCLUDED.dnf_count,
            duel_winner_driver_id = EXCLUDED.duel_winner_driver_id;

        SELECT id INTO v_result_19_id FROM session_results WHERE session_id = v_session_19_id;
        DELETE FROM result_finishers WHERE result_id = v_result_19_id;
        INSERT INTO result_finishers (result_id, position, driver_id)
        VALUES
            (v_result_19_id, 0, 'verstappen'),
            (v_result_19_id, 1, 'hamilton'),
            (v_result_19_id, 2, 'antonelli'),
            (v_result_19_id, 3, 'leclerc'),
            (v_result_19_id, 4, 'norris'),
            (v_result_19_id, 5, 'russell'),
            (v_result_19_id, 6, 'lawson'),
            (v_result_19_id, 7, 'bortoleto'),
            (v_result_19_id, 8, 'hadjar'),
            (v_result_19_id, 9, 'ryo_hirakawa');
    END IF;

    -- 4. Resultados oficiales REALES Round 20 (Sao Paulo GP - 2026-11-08)
    --    Pole: norris | P1 norris, P2 verstappen, P3 hadjar
    --    Duelo (lawson vs lindblad): lawson (P7 vs P11)
    --    SC/VSC: 0 (carrera sin SC ni VSC segun FIA OpenF1 Race Control)
    --    DNF/DNS: 2 (stroll Retired, bottas Did not start)
    IF v_session_20_id IS NOT NULL THEN
        INSERT INTO weekend_matchups (id, session_id, driver1_id, driver2_id, created_at)
        VALUES (gen_random_uuid(), v_session_20_id, 'lawson', 'lindblad', CURRENT_TIMESTAMP)
        ON CONFLICT (session_id)
        DO UPDATE SET driver1_id = EXCLUDED.driver1_id, driver2_id = EXCLUDED.driver2_id;

        INSERT INTO session_results (id, session_id, published_at, pole_position_driver_id, safety_car_count, dnf_count, duel_winner_driver_id)
        VALUES (gen_random_uuid(), v_session_20_id, '2026-11-08 20:00:00+00', 'norris', 0, 2, 'lawson')
        ON CONFLICT (session_id)
        DO UPDATE SET
            published_at = EXCLUDED.published_at,
            pole_position_driver_id = EXCLUDED.pole_position_driver_id,
            safety_car_count = EXCLUDED.safety_car_count,
            dnf_count = EXCLUDED.dnf_count,
            duel_winner_driver_id = EXCLUDED.duel_winner_driver_id;

        SELECT id INTO v_result_20_id FROM session_results WHERE session_id = v_session_20_id;
        DELETE FROM result_finishers WHERE result_id = v_result_20_id;
        INSERT INTO result_finishers (result_id, position, driver_id)
        VALUES
            (v_result_20_id, 0, 'norris'),
            (v_result_20_id, 1, 'verstappen'),
            (v_result_20_id, 2, 'hadjar'),
            (v_result_20_id, 3, 'russell'),
            (v_result_20_id, 4, 'antonelli'),
            (v_result_20_id, 5, 'piastri'),
            (v_result_20_id, 6, 'lawson'),
            (v_result_20_id, 7, 'leclerc'),
            (v_result_20_id, 8, 'hamilton'),
            (v_result_20_id, 9, 'hulkenberg');
    END IF;

    -- 5. Recalcular puntajes exactos para TODOS los pronosticos reales en sesiones finalizadas
    FOR rec_pred IN (
        SELECT
            p_sel.id AS pred_id,
            p_sel.pole_position_driver_id AS pred_pole,
            p_sel.duel_driver_pick AS pred_duel,
            p_sel.safety_car_count AS pred_sc,
            p_sel.dnf_count AS pred_dnf,
            sr_sel.id AS result_id,
            sr_sel.pole_position_driver_id AS res_pole,
            sr_sel.duel_winner_driver_id AS res_duel,
            sr_sel.safety_car_count AS res_sc,
            sr_sel.dnf_count AS res_dnf
        FROM predictions p_sel
        JOIN session_results sr_sel ON sr_sel.session_id = p_sel.session_id
    ) LOOP
        SELECT COUNT(*) INTO v_podium_hits
        FROM prediction_picks pp
        JOIN result_finishers rf ON rf.result_id = rec_pred.result_id
                                AND rf.position = pp.position
                                AND REPLACE(REPLACE(LOWER(rf.driver_id), 'max_verstappen', 'verstappen'), 'arvid_lindblad', 'lindblad')
                                  = REPLACE(REPLACE(LOWER(pp.driver_id), 'max_verstappen', 'verstappen'), 'arvid_lindblad', 'lindblad')
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

        IF rec_pred.pred_pole IS NOT NULL AND rec_pred.res_pole IS NOT NULL
           AND REPLACE(REPLACE(LOWER(rec_pred.pred_pole), 'max_verstappen', 'verstappen'), 'arvid_lindblad', 'lindblad')
             = REPLACE(REPLACE(LOWER(rec_pred.res_pole), 'max_verstappen', 'verstappen'), 'arvid_lindblad', 'lindblad') THEN
            v_pole_pts := 4;
        ELSE
            v_pole_pts := 0;
        END IF;

        IF rec_pred.pred_duel IS NOT NULL AND rec_pred.res_duel IS NOT NULL
           AND REPLACE(REPLACE(LOWER(rec_pred.pred_duel), 'max_verstappen', 'verstappen'), 'arvid_lindblad', 'lindblad')
             = REPLACE(REPLACE(LOWER(rec_pred.res_duel), 'max_verstappen', 'verstappen'), 'arvid_lindblad', 'lindblad') THEN
            v_duel_pts := 3;
        ELSE
            v_duel_pts := 0;
        END IF;

        IF rec_pred.pred_sc IS NOT NULL AND rec_pred.res_sc IS NOT NULL AND rec_pred.pred_sc = rec_pred.res_sc THEN
            v_sc_pts := 6;
        ELSE
            v_sc_pts := 0;
        END IF;

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
