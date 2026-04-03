-- ============================================================
-- Migración: Porcentaje de asignación dimensional
-- Fecha: 2026-04-01
-- Descripción: Agrega columna `percentage` a cost_object_dimensions
--              para registrar el % de asignación de cada objeto de
--              costo dentro de un ítem de dimensión.
--              El 100% se distribuye entre los ítems de la misma
--              dimensión (validación en la capa de negocio).
-- ============================================================

ALTER TABLE public.cost_object_dimensions
  ADD COLUMN IF NOT EXISTS percentage numeric NOT NULL DEFAULT 100;
