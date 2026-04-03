-- ============================================
-- Add `module` column to models table
-- Run this in Supabase SQL Editor
-- ============================================

-- Add the column (safe, idempotent)
ALTER TABLE public.models
  ADD COLUMN IF NOT EXISTS module text DEFAULT NULL;

-- Tag existing ABC Costing models (those without a module) as NULL — no action needed,
-- they already have NULL which is the ABC Costing identifier.

-- Verify
SELECT id, name, module FROM public.models ORDER BY created_at;
