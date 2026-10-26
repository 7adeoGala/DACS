-- V9__auto_score_round_18_predictions.sql
-- Calcula y asigna automáticamente el puntaje oficial a todas las predicciones de usuarios
-- que aún no fueron puntuadas (score IS NULL) para sesiones que cuenten con resultados oficiales cargados (Round 18).

DO $$
DECLARE
    r RECORD;
    v_podium_hits INT;
    v_podium_pts INT;
    v_pole_pts INT;
    v_duel_pts INT;
    v_sc_pts INT;
    v_dnf_pts INT;
    v_total_pts INT;
BEGIN
    FOR r IN (
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
        WHERE p.score IS NULL
    ) LOOP
        -- 1. Aciertos de podio (posiciones 0, 1, 2)
        SELECT COUNT(*) INTO v_podium_hits
        FROM prediction_picks pp
        JOIN result_finishers rf ON rf.result_id = r.result_id 
                                AND rf.position = pp.position 
                                AND LOWER(rf.driver_id) = LOWER(pp.driver_id)
        WHERE pp.prediction_id = r.pred_id
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
        IF r.pred_pole IS NOT NULL AND r.res_pole IS NOT NULL AND LOWER(r.pred_pole) = LOWER(r.res_pole) THEN
            v_pole_pts := 4;
        ELSE
            v_pole_pts := 0;
        END IF;

        -- 3. Duelo de pilotos (3 pts)
        IF r.pred_duel IS NOT NULL AND r.res_duel IS NOT NULL AND LOWER(r.pred_duel) = LOWER(r.res_duel) THEN
            v_duel_pts := 3;
        ELSE
            v_duel_pts := 0;
        END IF;

        -- 4. Safety Car (10 pts)
        IF r.pred_sc IS NOT NULL AND r.res_sc IS NOT NULL AND r.pred_sc = r.res_sc THEN
            v_sc_pts := 10;
        ELSE
            v_sc_pts := 0;
        END IF;

        -- 5. Abandonos DNF (15 pts)
        IF r.pred_dnf IS NOT NULL AND r.res_dnf IS NOT NULL AND r.pred_dnf = r.res_dnf THEN
            v_dnf_pts := 15;
        ELSE
            v_dnf_pts := 0;
        END IF;

        v_total_pts := v_podium_pts + v_pole_pts + v_duel_pts + v_sc_pts + v_dnf_pts;

        UPDATE predictions
        SET score = v_total_pts,
            scored_at = CURRENT_TIMESTAMP
        WHERE id = r.pred_id;
    END LOOP;
END $$;
