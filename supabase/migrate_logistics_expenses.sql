-- ============================================
-- Logistics Expenses & Centers - Migration
-- Run this in Supabase SQL Editor
-- ============================================

-- 1. LOGISTICS EXPENSE CENTERS (Centros de Gasto Logístico)
CREATE TABLE IF NOT EXISTS public.logistics_expense_centers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  period_id uuid NOT NULL REFERENCES public.periods(id) ON DELETE CASCADE,
  code text NOT NULL,
  name text NOT NULL,
  category text NOT NULL DEFAULT 'vehiculo',
  note text,
  parent_id uuid REFERENCES public.logistics_expense_centers(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE public.logistics_expense_centers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant members can read logistics_expense_centers"
  ON public.logistics_expense_centers FOR SELECT USING (
    tenant_id IN (SELECT tenant_id FROM public.tenant_members WHERE user_id = auth.uid())
  );
CREATE POLICY "Tenant members can manage logistics_expense_centers"
  ON public.logistics_expense_centers FOR ALL USING (
    tenant_id IN (SELECT tenant_id FROM public.tenant_members WHERE user_id = auth.uid())
  );

CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.logistics_expense_centers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- 2. LOGISTICS EXPENSES (Gastos Logísticos)
CREATE TABLE IF NOT EXISTS public.logistics_expenses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  period_id uuid NOT NULL REFERENCES public.periods(id) ON DELETE CASCADE,
  code text NOT NULL,
  name text NOT NULL,
  amount numeric(15,2) DEFAULT 0,
  category text NOT NULL DEFAULT 'vehiculo',
  center_id uuid REFERENCES public.logistics_expense_centers(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE public.logistics_expenses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant members can read logistics_expenses"
  ON public.logistics_expenses FOR SELECT USING (
    tenant_id IN (SELECT tenant_id FROM public.tenant_members WHERE user_id = auth.uid())
  );
CREATE POLICY "Tenant members can manage logistics_expenses"
  ON public.logistics_expenses FOR ALL USING (
    tenant_id IN (SELECT tenant_id FROM public.tenant_members WHERE user_id = auth.uid())
  );

CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.logistics_expenses
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- 3. LOGISTICS OPERATION DRIVERS (Variables de Operación)
CREATE TABLE IF NOT EXISTS public.logistics_operation_drivers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  period_id uuid NOT NULL REFERENCES public.periods(id) ON DELETE CASCADE,
  dias_laborales integer DEFAULT 22,
  margen_contribucion_pct numeric(7,4) DEFAULT 25,
  efectividad_reparto_pct numeric(7,4) DEFAULT 90,
  pedidos_programados_diarios integer DEFAULT 30,
  tasa_iva_pct numeric(7,4) DEFAULT 13,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(tenant_id, period_id)
);
ALTER TABLE public.logistics_operation_drivers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant members can read logistics_operation_drivers"
  ON public.logistics_operation_drivers FOR SELECT USING (
    tenant_id IN (SELECT tenant_id FROM public.tenant_members WHERE user_id = auth.uid())
  );
CREATE POLICY "Tenant members can manage logistics_operation_drivers"
  ON public.logistics_operation_drivers FOR ALL USING (
    tenant_id IN (SELECT tenant_id FROM public.tenant_members WHERE user_id = auth.uid())
  );

CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.logistics_operation_drivers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
