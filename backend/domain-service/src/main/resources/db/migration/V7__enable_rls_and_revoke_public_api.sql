-- V7__enable_rls_and_revoke_public_api.sql
-- Protección crítica de la base de datos:
-- 1. Habilitar Row Level Security (RLS) en todas las tablas de la aplicación para bloquear acceso no autorizado desde PostgREST / Supabase API
-- 2. Revocar privilegios a roles públicos (anon, authenticated) en Supabase para evitar exposición de datos y columnas sensibles

-- 1. Habilitar Row Level Security en todas las tablas de dominio de ApexPredict
ALTER TABLE IF EXISTS app_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS leagues ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS league_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS racing_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS predictions ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS prediction_picks ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS session_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS result_finishers ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS weekend_matchups ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS notifications ENABLE ROW LEVEL SECURITY;

-- 2. Revocar accesos a roles públicos de Supabase (anon y authenticated) de forma segura si existen
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
        EXECUTE 'REVOKE ALL ON app_users, leagues, league_members, racing_sessions, predictions, prediction_picks, session_results, result_finishers, weekend_matchups, notifications FROM anon';
        EXECUTE 'REVOKE USAGE ON SCHEMA public FROM anon';
        EXECUTE 'ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON TABLES FROM anon';
        EXECUTE 'ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON SEQUENCES FROM anon';
        EXECUTE 'ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON ROUTINES FROM anon';
    END IF;

    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
        EXECUTE 'REVOKE ALL ON app_users, leagues, league_members, racing_sessions, predictions, prediction_picks, session_results, result_finishers, weekend_matchups, notifications FROM authenticated';
        EXECUTE 'REVOKE USAGE ON SCHEMA public FROM authenticated';
        EXECUTE 'ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON TABLES FROM authenticated';
        EXECUTE 'ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON SEQUENCES FROM authenticated';
        EXECUTE 'ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON ROUTINES FROM authenticated';
    END IF;
END
$$;
