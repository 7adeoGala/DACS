-- V3__league_passwords.sql
-- Contraseña para ligas privadas y soporte para búsqueda de ligas
ALTER TABLE leagues ADD COLUMN IF NOT EXISTS password VARCHAR(100);
