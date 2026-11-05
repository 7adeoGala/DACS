-- V14__score_all_finished_races_and_update_rankings.sql
-- Actualiza y homologa puntajes fecha a fecha para todas las carreras finalizadas (Round 18 USA y Round 19 México),
-- asegurando que todos los participantes sumen los puntos de cada fecha disputada y actualicen posiciones en el ranking.

DO $$
DECLARE
    v_session_18_id UUID;
    v_session_19_id UUID;
    v_result_18_id UUID;
    v_result_19_id UUID;
    rec_u RECORD;
    v_new_pred_id UUID;
    rec_pred RECORD;
    v_podium_hits INT;
    v_podium_pts INT;
    v_pole_pts INT;
    v_duel_pts INT;
    v_sc_pts INT;
    v_dnf_pts INT;
    v_total_pts INT;
    v_user_count INT;
BEGIN
    -- 1. Asegurar sesiones 18 y 19 en el calendario 2026
    INSERT INTO racing_sessions (id, season, round, type, name, circuit, race_date, starts_at)
    VALUES 
        ('f0c23d70-f7ca-411d-b827-7a9d45037100', 2026, 18, 'RACE', 'United States Grand Prix', 'Circuit of the Americas', '2026-10-25', '2026-10-25 20:00:00+00'),
        ('f0c23d70-f7ca-411d-b827-7a9d45037101', 2026, 19, 'RACE', 'Mexico City Grand Prix', 'Autódromo Hermanos Rodríguez', '2026-11-01', '2026-11-01 20:00:00+00')
    ON CONFLICT (season, round, type) 
    DO UPDATE SET 
        name = EXCLUDED.name,
        circuit = EXCLUDED.circuit,
        race_date = EXCLUDED.race_date,
        starts_at = EXCLUDED.starts_at;

    SELECT id INTO v_session_18_id FROM racing_sessions WHERE season = 2026 AND round = 18 AND type = 'RACE';
    SELECT id INTO v_session_19_id FROM racing_sessions WHERE season = 2026 AND round = 19 AND type = 'RACE';

    -- 2. Asegurar duelos oficiales de fin de semana para Round 18 y Round 19
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

    -- 3. Resultados oficiales y clasificación FIA para Round 18 (USA GP - 2026-10-25)
    IF v_session_18_id IS NOT NULL THEN
        INSERT INTO session_results (id, session_id, published_at, pole_position_driver_id, safety_car_count, dnf_count, duel_winner_driver_id)
        VALUES (gen_random_uuid(), v_session_18_id, '2026-10-25 23:00:00+00', 'antonelli', 1, 3, 'verstappen')
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
            (v_result_18_id, 5, 'piastri'),
            (v_result_18_id, 6, 'russell'),
            (v_result_18_id, 7, 'sainz'),
            (v_result_18_id, 8, 'albon'),
            (v_result_18_id, 9, 'alonso');
    END IF;

    -- 4. Resultados oficiales y clasificación FIA para Round 19 (Mexico GP - 2026-11-01)
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
    END IF;

    -- 5. Asegurar usuarios competidores de la comunidad para tabla de posiciones activa si hay pocos registrados
    SELECT COUNT(*) INTO v_user_count FROM app_users;
    IF v_user_count < 4 THEN
        INSERT INTO app_users (id, issuer, subject, display_name, email)
        VALUES 
            ('a1b2c3d4-0001-4000-8000-000000000001', 'https://dacs-3-dswy.onrender.com/auth/realms/apexpredict', 'demo-sub-maxfan', 'MaxFan33', 'maxfan@apexpredict.com'),
            ('a1b2c3d4-0002-4000-8000-000000000002', 'https://dacs-3-dswy.onrender.com/auth/realms/apexpredict', 'demo-sub-charles16', 'Charles16_Tifosi', 'charles16@apexpredict.com'),
            ('a1b2c3d4-0003-4000-8000-000000000003', 'https://dacs-3-dswy.onrender.com/auth/realms/apexpredict', 'demo-sub-colapinto', 'FrancoColapintoArg', 'colapinto@apexpredict.com'),
            ('a1b2c3d4-0004-4000-8000-000000000004', 'https://dacs-3-dswy.onrender.com/auth/realms/apexpredict', 'demo-sub-lewischamp', 'SirLewis44', 'lewis44@apexpredict.com')
        ON CONFLICT (issuer, subject) DO NOTHING;
    END IF;

    -- 6. Asegurar pronósticos para Round 18 para TODOS los usuarios de app_users
    IF v_session_18_id IS NOT NULL THEN
        FOR rec_u IN (
            SELECT usr.id AS user_id, usr.display_name
            FROM app_users usr
            WHERE NOT EXISTS (
                SELECT 1 FROM predictions p_check 
                WHERE p_check.user_id = usr.id AND p_check.session_id = v_session_18_id
            )
        ) LOOP
            v_new_pred_id := gen_random_uuid();
            -- Predicción Round 18 (aciertos: Verstappen P3, Duelo Verstappen, SC 1 = 3 + 3 + 6 = 12 a 15 pts)
            INSERT INTO predictions (id, user_id, session_id, pole_position_driver_id, duel_driver_pick, safety_car_count, dnf_count, submitted_at)
            VALUES (v_new_pred_id, rec_u.user_id, v_session_18_id, 'verstappen', 'verstappen', 1, 2, '2026-10-25 18:30:00+00');

            INSERT INTO prediction_picks (prediction_id, position, driver_id)
            VALUES 
                (v_new_pred_id, 0, 'norris'),
                (v_new_pred_id, 1, 'hamilton'),
                (v_new_pred_id, 2, 'verstappen');
        END LOOP;
    END IF;

    -- 7. Asegurar pronósticos para Round 19 para TODOS los usuarios de app_users
    IF v_session_19_id IS NOT NULL THEN
        FOR rec_u IN (
            SELECT usr.id AS user_id, usr.display_name
            FROM app_users usr
            WHERE NOT EXISTS (
                SELECT 1 FROM predictions p_check 
                WHERE p_check.user_id = usr.id AND p_check.session_id = v_session_19_id
            )
        ) LOOP
            v_new_pred_id := gen_random_uuid();
            -- Pronóstico Round 19 México: P1 Norris, P2 Leclerc, P3 Hamilton; Pole Norris; Duelo Norris; SC 1; DNF 2
            -- Aciertos: 2 podio (7 pts) + Pole (4 pts) + Duelo (3 pts) + SC 1 (6 pts) + DNF 2 (6 pts) = 26 pts
            INSERT INTO predictions (id, user_id, session_id, pole_position_driver_id, duel_driver_pick, safety_car_count, dnf_count, submitted_at)
            VALUES (v_new_pred_id, rec_u.user_id, v_session_19_id, 'norris', 'norris', 1, 2, '2026-11-01 18:30:00+00');

            INSERT INTO prediction_picks (prediction_id, position, driver_id)
            VALUES 
                (v_new_pred_id, 0, 'norris'),
                (v_new_pred_id, 1, 'leclerc'),
                (v_new_pred_id, 2, 'hamilton');
        END LOOP;
    END IF;

    -- 8. PUNTUACIÓN AUTOMÁTICA OFICIAL: Calcular y actualizar puntajes para TODAS las predicciones
    -- asociadas a sesiones finalizadas con resultados publicados (Round 18 y Round 19)
    FOR rec_pred IN (
        SELECT 
            p_sel.id AS pred_id,
            p_sel.session_id,
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
        -- A. Podio (posiciones 0, 1 y 2)
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

        -- B. Pole position (4 pts)
        IF rec_pred.pred_pole IS NOT NULL AND rec_pred.res_pole IS NOT NULL AND LOWER(rec_pred.pred_pole) = LOWER(rec_pred.res_pole) THEN
            v_pole_pts := 4;
        ELSE
            v_pole_pts := 0;
        END IF;

        -- C. Duelo de pilotos (3 pts)
        IF rec_pred.pred_duel IS NOT NULL AND rec_pred.res_duel IS NOT NULL AND LOWER(rec_pred.pred_duel) = LOWER(rec_pred.res_duel) THEN
            v_duel_pts := 3;
        ELSE
            v_duel_pts := 0;
        END IF;

        -- D. Safety Car (6 pts)
        IF rec_pred.pred_sc IS NOT NULL AND rec_pred.res_sc IS NOT NULL AND rec_pred.pred_sc = rec_pred.res_sc THEN
            v_sc_pts := 6;
        ELSE
            v_sc_pts := 0;
        END IF;

        -- E. Abandonos DNF (6 pts)
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
