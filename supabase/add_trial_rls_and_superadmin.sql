-- ============================================================
-- MIGRATION: Trial RLS + Superadmin
-- Run this in Supabase SQL Editor
-- ============================================================

-- 1. Add columns to profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS is_superadmin boolean NOT NULL DEFAULT false;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS email text;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS trial_ends_at timestamptz;

-- Sync email and trial_ends_at from auth.users into profiles on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, company, email, trial_ends_at)
  VALUES (
    new.id,
    new.raw_user_meta_data ->> 'full_name',
    new.raw_user_meta_data ->> 'company',
    new.email,
    (new.raw_user_meta_data ->> 'trial_ends_at')::timestamptz
  )
  ON CONFLICT (id) DO UPDATE SET
    full_name    = EXCLUDED.full_name,
    company      = EXCLUDED.company,
    email        = EXCLUDED.email,
    trial_ends_at = EXCLUDED.trial_ends_at;
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Helper: check if current user is superadmin
CREATE OR REPLACE FUNCTION public.is_superadmin()
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT is_superadmin FROM public.profiles WHERE id = auth.uid()),
    false
  );
$$;

-- 3. Helper: check if trial is still active
--    - Users without trial_ends_at (old accounts, manual activations) pass through
--    - Superadmins always pass through
CREATE OR REPLACE FUNCTION public.is_trial_active()
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT
    public.is_superadmin()
    OR COALESCE(
      (auth.jwt() -> 'user_metadata' ->> 'trial_ends_at')::timestamptz > now(),
      true
    );
$$;

-- ============================================================
-- 4. Update SELECT policies to enforce trial check
-- ============================================================

-- MODELS
DROP POLICY IF EXISTS "Tenant members can read models" ON public.models;
CREATE POLICY "Tenant members can read models"
  ON public.models FOR SELECT USING (
    tenant_id IN (SELECT tenant_id FROM public.tenant_members WHERE user_id = auth.uid())
    AND public.is_trial_active()
  );

DROP POLICY IF EXISTS "Tenant members can manage models" ON public.models;
CREATE POLICY "Tenant members can manage models"
  ON public.models FOR ALL USING (
    tenant_id IN (SELECT tenant_id FROM public.tenant_members WHERE user_id = auth.uid())
    AND public.is_trial_active()
  );

-- PERIODS
DROP POLICY IF EXISTS "Tenant members can read periods" ON public.periods;
CREATE POLICY "Tenant members can read periods"
  ON public.periods FOR SELECT USING (
    tenant_id IN (SELECT tenant_id FROM public.tenant_members WHERE user_id = auth.uid())
    AND public.is_trial_active()
  );

DROP POLICY IF EXISTS "Tenant members can manage periods" ON public.periods;
CREATE POLICY "Tenant members can manage periods"
  ON public.periods FOR ALL USING (
    tenant_id IN (SELECT tenant_id FROM public.tenant_members WHERE user_id = auth.uid())
    AND public.is_trial_active()
  );

-- RESOURCES
DROP POLICY IF EXISTS "Tenant members can read resources" ON public.resources;
CREATE POLICY "Tenant members can read resources"
  ON public.resources FOR SELECT USING (
    tenant_id IN (SELECT tenant_id FROM public.tenant_members WHERE user_id = auth.uid())
    AND public.is_trial_active()
  );

DROP POLICY IF EXISTS "Tenant members can manage resources" ON public.resources;
CREATE POLICY "Tenant members can manage resources"
  ON public.resources FOR ALL USING (
    tenant_id IN (SELECT tenant_id FROM public.tenant_members WHERE user_id = auth.uid())
    AND public.is_trial_active()
  );

-- ACTIVITIES
DROP POLICY IF EXISTS "Tenant members can read activities" ON public.activities;
CREATE POLICY "Tenant members can read activities"
  ON public.activities FOR SELECT USING (
    tenant_id IN (SELECT tenant_id FROM public.tenant_members WHERE user_id = auth.uid())
    AND public.is_trial_active()
  );

DROP POLICY IF EXISTS "Tenant members can manage activities" ON public.activities;
CREATE POLICY "Tenant members can manage activities"
  ON public.activities FOR ALL USING (
    tenant_id IN (SELECT tenant_id FROM public.tenant_members WHERE user_id = auth.uid())
    AND public.is_trial_active()
  );

-- COST OBJECTS
DROP POLICY IF EXISTS "Tenant members can read cost_objects" ON public.cost_objects;
CREATE POLICY "Tenant members can read cost_objects"
  ON public.cost_objects FOR SELECT USING (
    tenant_id IN (SELECT tenant_id FROM public.tenant_members WHERE user_id = auth.uid())
    AND public.is_trial_active()
  );

DROP POLICY IF EXISTS "Tenant members can manage cost_objects" ON public.cost_objects;
CREATE POLICY "Tenant members can manage cost_objects"
  ON public.cost_objects FOR ALL USING (
    tenant_id IN (SELECT tenant_id FROM public.tenant_members WHERE user_id = auth.uid())
    AND public.is_trial_active()
  );

-- DRIVERS
DROP POLICY IF EXISTS "Tenant members can read drivers" ON public.drivers;
CREATE POLICY "Tenant members can read drivers"
  ON public.drivers FOR SELECT USING (
    tenant_id IN (SELECT tenant_id FROM public.tenant_members WHERE user_id = auth.uid())
    AND public.is_trial_active()
  );

DROP POLICY IF EXISTS "Tenant members can manage drivers" ON public.drivers;
CREATE POLICY "Tenant members can manage drivers"
  ON public.drivers FOR ALL USING (
    tenant_id IN (SELECT tenant_id FROM public.tenant_members WHERE user_id = auth.uid())
    AND public.is_trial_active()
  );

-- DRIVER LINES
DROP POLICY IF EXISTS "Tenant members can read driver_lines" ON public.driver_lines;
CREATE POLICY "Tenant members can read driver_lines"
  ON public.driver_lines FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.drivers d
      WHERE d.id = driver_lines.driver_id
        AND d.tenant_id IN (SELECT tenant_id FROM public.tenant_members WHERE user_id = auth.uid())
    )
    AND public.is_trial_active()
  );

DROP POLICY IF EXISTS "Tenant members can manage driver_lines" ON public.driver_lines;
CREATE POLICY "Tenant members can manage driver_lines"
  ON public.driver_lines FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.drivers d
      WHERE d.id = driver_lines.driver_id
        AND d.tenant_id IN (SELECT tenant_id FROM public.tenant_members WHERE user_id = auth.uid())
    )
    AND public.is_trial_active()
  );

-- PERSPECTIVES
DROP POLICY IF EXISTS "Tenant members can read perspectives" ON public.perspectives;
CREATE POLICY "Tenant members can read perspectives"
  ON public.perspectives FOR SELECT USING (
    tenant_id IN (SELECT tenant_id FROM public.tenant_members WHERE user_id = auth.uid())
    AND public.is_trial_active()
  );

DROP POLICY IF EXISTS "Tenant members can manage perspectives" ON public.perspectives;
CREATE POLICY "Tenant members can manage perspectives"
  ON public.perspectives FOR ALL USING (
    tenant_id IN (SELECT tenant_id FROM public.tenant_members WHERE user_id = auth.uid())
    AND public.is_trial_active()
  );

-- KPIS
DROP POLICY IF EXISTS "Tenant members can read kpis" ON public.kpis;
CREATE POLICY "Tenant members can read kpis"
  ON public.kpis FOR SELECT USING (
    tenant_id IN (SELECT tenant_id FROM public.tenant_members WHERE user_id = auth.uid())
    AND public.is_trial_active()
  );

DROP POLICY IF EXISTS "Tenant members can manage kpis" ON public.kpis;
CREATE POLICY "Tenant members can manage kpis"
  ON public.kpis FOR ALL USING (
    tenant_id IN (SELECT tenant_id FROM public.tenant_members WHERE user_id = auth.uid())
    AND public.is_trial_active()
  );

-- DIMENSIONS
DROP POLICY IF EXISTS "Tenant members can read dimensions" ON public.dimensions;
CREATE POLICY "Tenant members can read dimensions"
  ON public.dimensions FOR SELECT USING (
    tenant_id IN (SELECT tenant_id FROM public.tenant_members WHERE user_id = auth.uid())
    AND public.is_trial_active()
  );

DROP POLICY IF EXISTS "Tenant members can manage dimensions" ON public.dimensions;
CREATE POLICY "Tenant members can manage dimensions"
  ON public.dimensions FOR ALL USING (
    tenant_id IN (SELECT tenant_id FROM public.tenant_members WHERE user_id = auth.uid())
    AND public.is_trial_active()
  );

-- DIMENSION ITEMS
DROP POLICY IF EXISTS "Tenant members can read dimension_items" ON public.dimension_items;
CREATE POLICY "Tenant members can read dimension_items"
  ON public.dimension_items FOR SELECT USING (
    tenant_id IN (SELECT tenant_id FROM public.tenant_members WHERE user_id = auth.uid())
    AND public.is_trial_active()
  );

DROP POLICY IF EXISTS "Tenant members can manage dimension_items" ON public.dimension_items;
CREATE POLICY "Tenant members can manage dimension_items"
  ON public.dimension_items FOR ALL USING (
    tenant_id IN (SELECT tenant_id FROM public.tenant_members WHERE user_id = auth.uid())
    AND public.is_trial_active()
  );

-- COST OBJECT DIMENSIONS
DROP POLICY IF EXISTS "Tenant members can read cost_object_dimensions" ON public.cost_object_dimensions;
CREATE POLICY "Tenant members can read cost_object_dimensions"
  ON public.cost_object_dimensions FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.cost_objects co
      WHERE co.id = cost_object_dimensions.cost_object_id
        AND co.tenant_id IN (SELECT tenant_id FROM public.tenant_members WHERE user_id = auth.uid())
    )
    AND public.is_trial_active()
  );

DROP POLICY IF EXISTS "Tenant members can manage cost_object_dimensions" ON public.cost_object_dimensions;
CREATE POLICY "Tenant members can manage cost_object_dimensions"
  ON public.cost_object_dimensions FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.cost_objects co
      WHERE co.id = cost_object_dimensions.cost_object_id
        AND co.tenant_id IN (SELECT tenant_id FROM public.tenant_members WHERE user_id = auth.uid())
    )
    AND public.is_trial_active()
  );

-- ============================================================
-- 5. Superadmin: read all tenants and members
-- ============================================================

DROP POLICY IF EXISTS "Superadmin can read all tenants" ON public.tenants;
CREATE POLICY "Superadmin can read all tenants"
  ON public.tenants FOR SELECT USING (public.is_superadmin());

DROP POLICY IF EXISTS "Superadmin can update all tenants" ON public.tenants;
CREATE POLICY "Superadmin can update all tenants"
  ON public.tenants FOR UPDATE USING (public.is_superadmin());

DROP POLICY IF EXISTS "Superadmin can read all tenant members" ON public.tenant_members;
CREATE POLICY "Superadmin can read all tenant members"
  ON public.tenant_members FOR SELECT USING (public.is_superadmin());

DROP POLICY IF EXISTS "Superadmin can read all profiles" ON public.profiles;
CREATE POLICY "Superadmin can read all profiles"
  ON public.profiles FOR SELECT USING (public.is_superadmin() OR auth.uid() = id);

-- ============================================================
-- 6. RPC: extend trial for a user (called by superadmin)
-- ============================================================
CREATE OR REPLACE FUNCTION public.extend_trial(p_user_id uuid, p_days int DEFAULT 14)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NOT public.is_superadmin() THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  UPDATE auth.users
  SET raw_user_meta_data = raw_user_meta_data ||
    jsonb_build_object(
      'trial_ends_at',
      (now() + (p_days || ' days')::interval)::text
    )
  WHERE id = p_user_id;

  UPDATE public.profiles
  SET trial_ends_at = now() + (p_days || ' days')::interval
  WHERE id = p_user_id;
END;
$$;

-- ============================================================
-- HOW TO MAKE YOURSELF SUPERADMIN:
-- Run this with your user UUID from auth.users:
--
-- UPDATE public.profiles SET is_superadmin = true WHERE id = 'YOUR-USER-UUID';
-- ============================================================
