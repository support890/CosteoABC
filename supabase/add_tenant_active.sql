-- ============================================================
-- MIGRATION: Add is_active to tenants
-- Run this in Supabase SQL Editor
-- ============================================================

ALTER TABLE public.tenants
  ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true;

-- Superadmin can toggle is_active (policy already allows superadmin to update tenants)
-- No extra policy needed — covered by "Superadmin can update all tenants"
