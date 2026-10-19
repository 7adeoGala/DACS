-- Migración V5: Personalización de Perfil de Usuario (Escudería favorita, Piloto favorito y Notificaciones)
ALTER TABLE app_users
ADD COLUMN IF NOT EXISTS favorite_driver_id VARCHAR(64),
ADD COLUMN IF NOT EXISTS favorite_team_id VARCHAR(64),
ADD COLUMN IF NOT EXISTS notifications_enabled BOOLEAN NOT NULL DEFAULT TRUE;
