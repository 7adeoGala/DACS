-- V11__replace_reserve_drivers_with_active_grid.sql
-- Homologa duelos y pronósticos de fin de semana para garantizar que solo participen
-- pilotos titulares activos de la temporada 2026, reemplazando pilotos de reserva (como Yuki Tsunoda).

DO $$
BEGIN
    -- 1. Si driver1_id en algún duelo de fin de semana era un piloto inactivo/reserva, reasignarlo a un piloto titular
    UPDATE weekend_matchups
    SET driver1_id = 'hadjar'
    WHERE LOWER(driver1_id) IN ('tsunoda', 'doohan');

    -- 2. Si driver2_id era un piloto inactivo/reserva, reasignarlo a un piloto titular diferente
    UPDATE weekend_matchups
    SET driver2_id = CASE WHEN LOWER(driver1_id) = 'hadjar' THEN 'lawson' ELSE 'hadjar' END
    WHERE LOWER(driver2_id) IN ('tsunoda', 'doohan');

    -- 3. Prevenir duplicados en duelos
    UPDATE weekend_matchups
    SET driver2_id = 'norris'
    WHERE LOWER(driver1_id) = LOWER(driver2_id) AND LOWER(driver1_id) != 'norris';

    UPDATE weekend_matchups
    SET driver2_id = 'verstappen'
    WHERE LOWER(driver1_id) = LOWER(driver2_id) AND LOWER(driver1_id) = 'norris';

    -- 4. Actualizar cualquier predicción activa en sesiones abiertas que haya seleccionado al piloto inactivo
    UPDATE predictions p
    SET duel_driver_pick = wm.driver2_id
    FROM weekend_matchups wm
    JOIN racing_sessions s ON s.id = wm.session_id
    WHERE p.session_id = wm.session_id
      AND LOWER(p.duel_driver_pick) IN ('tsunoda', 'doohan')
      AND s.starts_at > CURRENT_TIMESTAMP;

END $$;

