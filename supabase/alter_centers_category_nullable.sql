-- ============================================
-- Make category nullable for logistics_expense_centers
-- Centers do not require a category assignment
-- Run this in Supabase SQL Editor
-- ============================================

-- Drop the check constraint
ALTER TABLE public.logistics_expense_centers
  DROP CONSTRAINT IF EXISTS logistics_expense_centers_category_check;

-- Remove the NOT NULL constraint and default
ALTER TABLE public.logistics_expense_centers
  ALTER COLUMN category DROP NOT NULL,
  ALTER COLUMN category DROP DEFAULT;

-- Set existing rows to NULL
UPDATE public.logistics_expense_centers SET category = NULL;
