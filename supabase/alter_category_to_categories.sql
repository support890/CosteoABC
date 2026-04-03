-- ============================================
-- Update category constraints to new values: reparto, preventa, otros
-- Run this in Supabase SQL Editor if tables already exist
-- ============================================

-- Drop old constraints
ALTER TABLE public.logistics_expense_centers
  DROP CONSTRAINT IF EXISTS logistics_expense_centers_category_check;

ALTER TABLE public.logistics_expenses
  DROP CONSTRAINT IF EXISTS logistics_expenses_category_check;

-- Add new constraints with updated category values
ALTER TABLE public.logistics_expense_centers
  ADD CONSTRAINT logistics_expense_centers_category_check
  CHECK (category IN ('reparto', 'preventa', 'otros'));

ALTER TABLE public.logistics_expenses
  ADD CONSTRAINT logistics_expenses_category_check
  CHECK (category IN ('reparto', 'preventa', 'otros'));

-- Update default values
ALTER TABLE public.logistics_expense_centers
  ALTER COLUMN category SET DEFAULT 'reparto';

ALTER TABLE public.logistics_expenses
  ALTER COLUMN category SET DEFAULT 'reparto';
