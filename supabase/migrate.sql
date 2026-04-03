-- ============================================
-- ABCCosting - SAFE MIGRATION (idempotent)
-- Run this in Supabase SQL Editor
-- ============================================

-- ==========================================
-- STEP 1: DROP ALL POLICIES
-- ==========================================
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN (
    SELECT schemaname, tablename, policyname
    FROM pg_policies
    WHERE schemaname = 'public'
  ) LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', r.policyname, r.schemaname, r.tablename);
  END LOOP;
END $$;

-- ==========================================
-- STEP 2: DROP ALL TRIGGERS on public tables
-- ==========================================
DROP TRIGGER IF EXISTS set_updated_at ON public.profiles;
DROP TRIGGER IF EXISTS set_updated_at ON public.models;
DROP TRIGGER IF EXISTS set_updated_at ON public.resources;
DROP TRIGGER IF EXISTS set_updated_at ON public.activities;
DROP TRIGGER IF EXISTS set_updated_at ON public.cost_objects;
DROP TRIGGER IF EXISTS set_updated_at ON public.kpis;
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- ==========================================
-- STEP 3: CREATE TABLES
-- ==========================================

-- 1. PROFILES
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text,
  company text,
  role text DEFAULT 'analyst' CHECK (role IN ('admin', 'analyst', 'kpi_owner', 'consultant')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 2. TENANTS
CREATE TABLE IF NOT EXISTS public.tenants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  plan text DEFAULT 'starter' CHECK (plan IN ('starter', 'pro', 'enterprise')),
  owner_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;

-- 3. TENANT MEMBERS
CREATE TABLE IF NOT EXISTS public.tenant_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role text DEFAULT 'analyst' CHECK (role IN ('admin', 'analyst', 'kpi_owner', 'consultant')),
  created_at timestamptz DEFAULT now(),
  UNIQUE(tenant_id, user_id)
);
ALTER TABLE public.tenant_members ENABLE ROW LEVEL SECURITY;

-- 4. MODELS
CREATE TABLE IF NOT EXISTS public.models (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  base_currency text DEFAULT 'USD',
  type text DEFAULT 'servicio' CHECK (type IN ('servicio', 'industria', 'comercio', 'gobierno')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE public.models ENABLE ROW LEVEL SECURITY;

-- 4.1 PERIODS
CREATE TABLE IF NOT EXISTS public.periods (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  model_id uuid REFERENCES public.models(id) ON DELETE CASCADE,
  name text NOT NULL,
  start_date date NOT NULL,
  end_date date NOT NULL,
  status text DEFAULT 'open' CHECK (status IN ('open', 'closed', 'processing')),
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.periods ENABLE ROW LEVEL SECURITY;

-- 5. RESOURCES
CREATE TABLE IF NOT EXISTS public.resources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  code text NOT NULL,
  name text NOT NULL,
  amount numeric(15,2) DEFAULT 0,
  category text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(tenant_id, code)
);
ALTER TABLE public.resources ENABLE ROW LEVEL SECURITY;

-- 6. ACTIVITIES
CREATE TABLE IF NOT EXISTS public.activities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  code text NOT NULL,
  name text NOT NULL,
  type text DEFAULT 'operative' CHECK (type IN ('operative', 'production', 'support')),
  amount numeric(15,2) DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(tenant_id, code)
);
ALTER TABLE public.activities ENABLE ROW LEVEL SECURITY;

-- 7. COST OBJECTS
CREATE TABLE IF NOT EXISTS public.cost_objects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  code text NOT NULL,
  name text NOT NULL,
  type text DEFAULT 'product' CHECK (type IN ('product', 'service', 'client', 'channel', 'project')),
  amount numeric(15,2) DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(tenant_id, code)
);
ALTER TABLE public.cost_objects ENABLE ROW LEVEL SECURITY;

-- 8. DRIVERS
CREATE TABLE IF NOT EXISTS public.drivers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  name text NOT NULL,
  type text DEFAULT 'uniform' CHECK (type IN ('uniform', 'extended')),
  source_type text NOT NULL CHECK (source_type IN ('resource', 'activity')),
  source_id uuid NOT NULL,
  destination_type text NOT NULL CHECK (destination_type IN ('activity', 'cost_object')),
  total_value numeric(15,2),
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.drivers ENABLE ROW LEVEL SECURITY;

-- 9. DRIVER LINES
CREATE TABLE IF NOT EXISTS public.driver_lines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  driver_id uuid NOT NULL REFERENCES public.drivers(id) ON DELETE CASCADE,
  destination_id uuid NOT NULL,
  value numeric(15,4) DEFAULT 0,
  percentage numeric(7,4) DEFAULT 0
);
ALTER TABLE public.driver_lines ENABLE ROW LEVEL SECURITY;

-- 10. PERSPECTIVES
CREATE TABLE IF NOT EXISTS public.perspectives (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  name text NOT NULL,
  weight numeric(5,2) DEFAULT 25,
  sort_order int DEFAULT 0,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.perspectives ENABLE ROW LEVEL SECURITY;

-- 11. KPIS
CREATE TABLE IF NOT EXISTS public.kpis (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  perspective_id uuid NOT NULL REFERENCES public.perspectives(id) ON DELETE CASCADE,
  parent_id uuid REFERENCES public.kpis(id) ON DELETE SET NULL,
  name text NOT NULL,
  weight numeric(5,2) DEFAULT 0,
  target_value numeric(15,2),
  current_value numeric(15,2) DEFAULT 0,
  unit text DEFAULT '%',
  threshold_green numeric(15,2),
  threshold_yellow numeric(15,2),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE public.kpis ENABLE ROW LEVEL SECURITY;

-- 12. KPI VALUES
CREATE TABLE IF NOT EXISTS public.kpi_values (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kpi_id uuid NOT NULL REFERENCES public.kpis(id) ON DELETE CASCADE,
  period_id uuid NOT NULL REFERENCES public.periods(id) ON DELETE CASCADE,
  value numeric(15,2) NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(kpi_id, period_id)
);
ALTER TABLE public.kpi_values ENABLE ROW LEVEL SECURITY;

-- ==========================================
-- STEP 4: CREATE/REPLACE FUNCTIONS
-- ==========================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, company)
  VALUES (
    new.id,
    new.raw_user_meta_data ->> 'full_name',
    new.raw_user_meta_data ->> 'company'
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.get_user_tenants()
RETURNS setof uuid
LANGUAGE sql SECURITY DEFINER SET search_path = public
AS $$
  SELECT tenant_id FROM public.tenant_members WHERE user_id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION public.get_admin_tenants()
RETURNS setof uuid
LANGUAGE sql SECURITY DEFINER SET search_path = public
AS $$
  SELECT tenant_id FROM public.tenant_members WHERE user_id = auth.uid() AND role = 'admin';
$$;

CREATE OR REPLACE FUNCTION public.is_tenant_owner(p_tenant_id uuid)
RETURNS boolean
LANGUAGE sql SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.tenants WHERE id = p_tenant_id AND owner_id = auth.uid()
  );
$$;

CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS trigger AS $$
BEGIN
  new.updated_at = now();
  RETURN new;
END;
$$ LANGUAGE plpgsql;

-- ==========================================
-- STEP 5: CREATE TRIGGERS
-- ==========================================

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.models FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.resources FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.activities FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.cost_objects FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.kpis FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- ==========================================
-- STEP 6: CREATE ALL POLICIES
-- ==========================================

-- PROFILES
CREATE POLICY "Users can read own profile"
  ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- TENANTS
CREATE POLICY "Tenant members can read tenant"
  ON public.tenants FOR SELECT USING (
    id IN (SELECT tenant_id FROM public.tenant_members WHERE user_id = auth.uid())
    OR owner_id = auth.uid()
  );
CREATE POLICY "Owner can update tenant"
  ON public.tenants FOR UPDATE USING (owner_id = auth.uid());
CREATE POLICY "Authenticated users can create tenants"
  ON public.tenants FOR INSERT WITH CHECK (auth.uid() = owner_id);

-- TENANT MEMBERS
CREATE POLICY "Users can see tenant members"
  ON public.tenant_members FOR SELECT USING (
    tenant_id IN (SELECT public.get_user_tenants())
    OR user_id = auth.uid()
  );
CREATE POLICY "Admins or owners can insert tenant members"
  ON public.tenant_members FOR INSERT WITH CHECK (
    tenant_id IN (SELECT public.get_admin_tenants())
    OR public.is_tenant_owner(tenant_id)
  );
CREATE POLICY "Admins can update tenant members"
  ON public.tenant_members FOR UPDATE USING (
    tenant_id IN (SELECT public.get_admin_tenants())
  );
CREATE POLICY "Admins can delete tenant members"
  ON public.tenant_members FOR DELETE USING (
    tenant_id IN (SELECT public.get_admin_tenants())
  );

-- MODELS
CREATE POLICY "Tenant members can read models"
  ON public.models FOR SELECT USING (
    tenant_id IN (SELECT tenant_id FROM public.tenant_members WHERE user_id = auth.uid())
  );
CREATE POLICY "Tenant members can manage models"
  ON public.models FOR ALL USING (
    tenant_id IN (SELECT tenant_id FROM public.tenant_members WHERE user_id = auth.uid())
  );

-- PERIODS
CREATE POLICY "Tenant members can read periods"
  ON public.periods FOR SELECT USING (
    tenant_id IN (SELECT tenant_id FROM public.tenant_members WHERE user_id = auth.uid())
  );
CREATE POLICY "Tenant members can manage periods"
  ON public.periods FOR ALL USING (
    tenant_id IN (SELECT tenant_id FROM public.tenant_members WHERE user_id = auth.uid())
  );

-- RESOURCES
CREATE POLICY "Tenant members can read resources"
  ON public.resources FOR SELECT USING (
    tenant_id IN (SELECT tenant_id FROM public.tenant_members WHERE user_id = auth.uid())
  );
CREATE POLICY "Tenant members can manage resources"
  ON public.resources FOR ALL USING (
    tenant_id IN (SELECT tenant_id FROM public.tenant_members WHERE user_id = auth.uid())
  );

-- ACTIVITIES
CREATE POLICY "Tenant members can read activities"
  ON public.activities FOR SELECT USING (
    tenant_id IN (SELECT tenant_id FROM public.tenant_members WHERE user_id = auth.uid())
  );
CREATE POLICY "Tenant members can manage activities"
  ON public.activities FOR ALL USING (
    tenant_id IN (SELECT tenant_id FROM public.tenant_members WHERE user_id = auth.uid())
  );

-- COST OBJECTS
CREATE POLICY "Tenant members can read cost_objects"
  ON public.cost_objects FOR SELECT USING (
    tenant_id IN (SELECT tenant_id FROM public.tenant_members WHERE user_id = auth.uid())
  );
CREATE POLICY "Tenant members can manage cost_objects"
  ON public.cost_objects FOR ALL USING (
    tenant_id IN (SELECT tenant_id FROM public.tenant_members WHERE user_id = auth.uid())
  );

-- DRIVERS
CREATE POLICY "Tenant members can read drivers"
  ON public.drivers FOR SELECT USING (
    tenant_id IN (SELECT tenant_id FROM public.tenant_members WHERE user_id = auth.uid())
  );
CREATE POLICY "Tenant members can manage drivers"
  ON public.drivers FOR ALL USING (
    tenant_id IN (SELECT tenant_id FROM public.tenant_members WHERE user_id = auth.uid())
  );

-- DRIVER LINES
CREATE POLICY "Tenant members can read driver_lines"
  ON public.driver_lines FOR SELECT USING (
    driver_id IN (SELECT id FROM public.drivers WHERE tenant_id IN (
      SELECT tenant_id FROM public.tenant_members WHERE user_id = auth.uid()
    ))
  );
CREATE POLICY "Tenant members can manage driver_lines"
  ON public.driver_lines FOR ALL USING (
    driver_id IN (SELECT id FROM public.drivers WHERE tenant_id IN (
      SELECT tenant_id FROM public.tenant_members WHERE user_id = auth.uid()
    ))
  );

-- PERSPECTIVES
CREATE POLICY "Tenant members can read perspectives"
  ON public.perspectives FOR SELECT USING (
    tenant_id IN (SELECT tenant_id FROM public.tenant_members WHERE user_id = auth.uid())
  );
CREATE POLICY "Tenant members can manage perspectives"
  ON public.perspectives FOR ALL USING (
    tenant_id IN (SELECT tenant_id FROM public.tenant_members WHERE user_id = auth.uid())
  );

-- KPIS
CREATE POLICY "Tenant members can read kpis"
  ON public.kpis FOR SELECT USING (
    tenant_id IN (SELECT tenant_id FROM public.tenant_members WHERE user_id = auth.uid())
  );
CREATE POLICY "Tenant members can manage kpis"
  ON public.kpis FOR ALL USING (
    tenant_id IN (SELECT tenant_id FROM public.tenant_members WHERE user_id = auth.uid())
  );

-- KPI VALUES
CREATE POLICY "Tenant members can read kpi_values"
  ON public.kpi_values FOR SELECT USING (
    kpi_id IN (SELECT id FROM public.kpis WHERE tenant_id IN (
      SELECT tenant_id FROM public.tenant_members WHERE user_id = auth.uid()
    ))
  );
CREATE POLICY "Tenant members can manage kpi_values"
  ON public.kpi_values FOR ALL USING (
    kpi_id IN (SELECT id FROM public.kpis WHERE tenant_id IN (
      SELECT tenant_id FROM public.tenant_members WHERE user_id = auth.uid()
    ))
  );
