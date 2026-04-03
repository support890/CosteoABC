-- ============================================================
-- Migración: Agregar campo precio/venta a dimension_items
-- Fecha: 2026-04-02
-- Descripción: Agrega la columna `price` (monto de venta)
--              a la tabla dimension_items para análisis de
--              rentabilidad por dimensión.
-- ============================================================

ALTER TABLE public.dimension_items
  ADD COLUMN IF NOT EXISTS price numeric(18, 2) DEFAULT NULL;
