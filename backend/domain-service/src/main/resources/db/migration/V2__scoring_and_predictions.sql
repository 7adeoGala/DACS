-- V2__scoring_and_predictions.sql
-- Ampliación de esquema para soporte de predicciones completas, reglas de puntuación,
-- duelo de pilotos por fin de semana, ligas editables y notificaciones recordatorias.

-- 1. Ampliación de predicciones: asociar directamente al usuario (para tabla global y ligas),
-- pole position, duelo de pilotos, autos de seguridad (SC/VSC), abandonos (DNF/DNS) y puntuación.
ALTER TABLE predictions ALTER COLUMN member_id DROP NOT NULL;
ALTER TABLE predictions ADD COLUMN user_id UUID REFERENCES app_users(id);
ALTER TABLE predictions ADD COLUMN pole_position_driver_id VARCHAR(64);
ALTER TABLE predictions ADD COLUMN duel_driver_pick VARCHAR(64);
ALTER TABLE predictions ADD COLUMN safety_car_count INTEGER;
ALTER TABLE predictions ADD COLUMN dnf_count INTEGER;
ALTER TABLE predictions ADD COLUMN score INTEGER;
ALTER TABLE predictions ADD COLUMN scored_at TIMESTAMPTZ;

CREATE UNIQUE INDEX IF NOT EXISTS predictions_user_session_idx ON predictions(user_id, session_id) WHERE user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS predictions_user_idx ON predictions(user_id);

-- 2. Duelo de pilotos del fin de semana (mismos 2 pilotos para todos los usuarios)
CREATE TABLE IF NOT EXISTS weekend_matchups (
    id UUID PRIMARY KEY,
    session_id UUID NOT NULL UNIQUE REFERENCES racing_sessions(id),
    driver1_id VARCHAR(64) NOT NULL,
    driver2_id VARCHAR(64) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 3. Ampliación de resultados reales oficiales de sesión para cálculo exacto de puntuación
ALTER TABLE session_results ADD COLUMN pole_position_driver_id VARCHAR(64);
ALTER TABLE session_results ADD COLUMN safety_car_count INTEGER NOT NULL DEFAULT 0;
ALTER TABLE session_results ADD COLUMN dnf_count INTEGER NOT NULL DEFAULT 0;
ALTER TABLE session_results ADD COLUMN duel_winner_driver_id VARCHAR(64);

-- 4. Ampliación de ligas privadas para permitir edición
ALTER TABLE leagues ADD COLUMN description VARCHAR(255);
ALTER TABLE leagues ADD COLUMN updated_at TIMESTAMPTZ;

-- 5. Estructura base para notificaciones y recordatorios previos al Lock Time
CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES app_users(id),
    session_id UUID REFERENCES racing_sessions(id),
    type VARCHAR(32) NOT NULL,
    channel VARCHAR(16) NOT NULL,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    status VARCHAR(16) NOT NULL,
    sent_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS notifications_user_idx ON notifications(user_id);
