-- V6__allow_null_prediction_driver.sql
-- Permite cargar posiciones incompletas o vacias en el podio de predicciones
ALTER TABLE prediction_picks ALTER COLUMN driver_id DROP NOT NULL;
