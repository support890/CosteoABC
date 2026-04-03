-- ============================================
-- ABCCosting - Database Schema
-- Run this in Supabase SQL Editor
-- ============================================

-- 1. PROFILES (extends auth.users)
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  company text,
  role text default 'analyst' check (role in ('admin', 'analyst', 'kpi_owner', 'consultant')),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.profiles enable row level security;

create policy "Users can read own profile"
  on public.profiles for select using (auth.uid() = id);

create policy "Users can update own profile"
  on public.profiles for update using (auth.uid() = id);

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, full_name, company)
  values (
    new.id,
    new.raw_user_meta_data ->> 'full_name',
    new.raw_user_meta_data ->> 'company'
  );
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();


-- 2. TENANTS (empresas)
create table if not exists public.tenants (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  plan text default 'starter' check (plan in ('starter', 'pro', 'enterprise')),
  owner_id uuid references public.profiles(id) on delete set null,
  created_at timestamptz default now()
);

alter table public.tenants enable row level security;


-- 3. TENANT MEMBERS
create table if not exists public.tenant_members (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role text default 'analyst' check (role in ('admin', 'analyst', 'kpi_owner', 'consultant')),
  created_at timestamptz default now(),
  unique(tenant_id, user_id)
);

alter table public.tenant_members enable row level security;

create or replace function public.get_user_tenants()
returns setof uuid
language sql security definer set search_path = public
as $$
  select tenant_id from public.tenant_members where user_id = auth.uid();
$$;

create or replace function public.get_admin_tenants()
returns setof uuid
language sql security definer set search_path = public
as $$
  select tenant_id from public.tenant_members where user_id = auth.uid() and role = 'admin';
$$;

create or replace function public.is_tenant_owner(p_tenant_id uuid)
returns boolean
language sql security definer set search_path = public
as $$
  select exists (
    select 1 from public.tenants where id = p_tenant_id and owner_id = auth.uid()
  );
$$;

create policy "Users can see tenant members"
  on public.tenant_members for select using (
    tenant_id in (select public.get_user_tenants())
    or user_id = auth.uid()
  );

create policy "Admins or owners can insert tenant members"
  on public.tenant_members for insert with check (
    tenant_id in (select public.get_admin_tenants())
    or public.is_tenant_owner(tenant_id)
  );

create policy "Admins can update tenant members"
  on public.tenant_members for update using (
    tenant_id in (select public.get_admin_tenants())
  );

create policy "Admins can delete tenant members"
  on public.tenant_members for delete using (
    tenant_id in (select public.get_admin_tenants())
  );

-- Policies for TENANTS (defined after tenant_members exists)
create policy "Tenant members can read tenant"
  on public.tenants for select using (
    id in (select tenant_id from public.tenant_members where user_id = auth.uid())
    or owner_id = auth.uid()
  );

create policy "Owner can update tenant"
  on public.tenants for update using (owner_id = auth.uid());

create policy "Authenticated users can create tenants"
  on public.tenants for insert with check (auth.uid() = owner_id);


-- 4. MODELS (Modelos de Costeo ABC)
create table if not exists public.models (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  name text not null,
  description text,
  base_currency text default 'USD',
  type text default 'servicio' check (type in ('servicio', 'industria', 'comercio', 'gobierno')),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.models enable row level security;

create policy "Tenant members can read models"
  on public.models for select using (
    tenant_id in (select tenant_id from public.tenant_members where user_id = auth.uid())
  );

create policy "Tenant members can manage models"
  on public.models for all using (
    tenant_id in (select tenant_id from public.tenant_members where user_id = auth.uid())
  );

-- 4.1 PERIODS
create table if not exists public.periods (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  model_id uuid references public.models(id) on delete cascade,
  name text not null,
  start_date date not null,
  end_date date not null,
  status text default 'open' check (status in ('open', 'closed', 'processing')),
  created_at timestamptz default now()
);

alter table public.periods enable row level security;

create policy "Tenant members can read periods"
  on public.periods for select using (
    tenant_id in (select tenant_id from public.tenant_members where user_id = auth.uid())
  );

create policy "Tenant members can manage periods"
  on public.periods for all using (
    tenant_id in (select tenant_id from public.tenant_members where user_id = auth.uid())
  );


-- 5. RESOURCES (Diccionario de Recursos)
create table if not exists public.resources (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  code text not null,
  name text not null,
  amount numeric(15,2) default 0,
  category text,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(tenant_id, code)
);

alter table public.resources enable row level security;

create policy "Tenant members can read resources"
  on public.resources for select using (
    tenant_id in (select tenant_id from public.tenant_members where user_id = auth.uid())
  );

create policy "Tenant members can manage resources"
  on public.resources for all using (
    tenant_id in (select tenant_id from public.tenant_members where user_id = auth.uid())
  );


-- 6. ACTIVITIES (Diccionario de Actividades)
create table if not exists public.activities (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  code text not null,
  name text not null,
  type text default 'operative' check (type in ('operative', 'production', 'support')),
  amount numeric(15,2) default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(tenant_id, code)
);

alter table public.activities enable row level security;

create policy "Tenant members can read activities"
  on public.activities for select using (
    tenant_id in (select tenant_id from public.tenant_members where user_id = auth.uid())
  );

create policy "Tenant members can manage activities"
  on public.activities for all using (
    tenant_id in (select tenant_id from public.tenant_members where user_id = auth.uid())
  );


-- 7. COST OBJECTS (Objetos de Costo)
create table if not exists public.cost_objects (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  code text not null,
  name text not null,
  type text default 'product' check (type in ('product', 'service', 'client', 'channel', 'project')),
  amount numeric(15,2) default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(tenant_id, code)
);

alter table public.cost_objects enable row level security;

create policy "Tenant members can read cost_objects"
  on public.cost_objects for select using (
    tenant_id in (select tenant_id from public.tenant_members where user_id = auth.uid())
  );

create policy "Tenant members can manage cost_objects"
  on public.cost_objects for all using (
    tenant_id in (select tenant_id from public.tenant_members where user_id = auth.uid())
  );


-- 8. DRIVERS (Asignaciones)
create table if not exists public.drivers (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  name text not null,
  type text default 'uniform' check (type in ('uniform', 'extended')),
  source_type text not null check (source_type in ('resource', 'activity')),
  source_id uuid not null,
  destination_type text not null check (destination_type in ('activity', 'cost_object')),
  total_value numeric(15,2),
  created_at timestamptz default now()
);

alter table public.drivers enable row level security;

create policy "Tenant members can read drivers"
  on public.drivers for select using (
    tenant_id in (select tenant_id from public.tenant_members where user_id = auth.uid())
  );

create policy "Tenant members can manage drivers"
  on public.drivers for all using (
    tenant_id in (select tenant_id from public.tenant_members where user_id = auth.uid())
  );


-- 9. DRIVER LINES (Detalle de asignación por destino)
create table if not exists public.driver_lines (
  id uuid primary key default gen_random_uuid(),
  driver_id uuid not null references public.drivers(id) on delete cascade,
  destination_id uuid not null,
  value numeric(15,4) default 0,
  percentage numeric(7,4) default 0
);

alter table public.driver_lines enable row level security;

create policy "Tenant members can read driver_lines"
  on public.driver_lines for select using (
    driver_id in (select id from public.drivers where tenant_id in (
      select tenant_id from public.tenant_members where user_id = auth.uid()
    ))
  );

create policy "Tenant members can manage driver_lines"
  on public.driver_lines for all using (
    driver_id in (select id from public.drivers where tenant_id in (
      select tenant_id from public.tenant_members where user_id = auth.uid()
    ))
  );


-- 10. PERSPECTIVES (BSC)
create table if not exists public.perspectives (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  name text not null,
  weight numeric(5,2) default 25,
  sort_order int default 0,
  created_at timestamptz default now()
);

alter table public.perspectives enable row level security;

create policy "Tenant members can read perspectives"
  on public.perspectives for select using (
    tenant_id in (select tenant_id from public.tenant_members where user_id = auth.uid())
  );

create policy "Tenant members can manage perspectives"
  on public.perspectives for all using (
    tenant_id in (select tenant_id from public.tenant_members where user_id = auth.uid())
  );


-- 11. KPIS
create table if not exists public.kpis (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  perspective_id uuid not null references public.perspectives(id) on delete cascade,
  parent_id uuid references public.kpis(id) on delete set null,
  name text not null,
  weight numeric(5,2) default 0,
  target_value numeric(15,2),
  current_value numeric(15,2) default 0,
  unit text default '%',
  threshold_green numeric(15,2),
  threshold_yellow numeric(15,2),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.kpis enable row level security;

create policy "Tenant members can read kpis"
  on public.kpis for select using (
    tenant_id in (select tenant_id from public.tenant_members where user_id = auth.uid())
  );

create policy "Tenant members can manage kpis"
  on public.kpis for all using (
    tenant_id in (select tenant_id from public.tenant_members where user_id = auth.uid())
  );


-- 12. KPI VALUES (Histórico por período)
create table if not exists public.kpi_values (
  id uuid primary key default gen_random_uuid(),
  kpi_id uuid not null references public.kpis(id) on delete cascade,
  period_id uuid not null references public.periods(id) on delete cascade,
  value numeric(15,2) not null,
  created_at timestamptz default now(),
  unique(kpi_id, period_id)
);

alter table public.kpi_values enable row level security;

create policy "Tenant members can read kpi_values"
  on public.kpi_values for select using (
    kpi_id in (select id from public.kpis where tenant_id in (
      select tenant_id from public.tenant_members where user_id = auth.uid()
    ))
  );

create policy "Tenant members can manage kpi_values"
  on public.kpi_values for all using (
    kpi_id in (select id from public.kpis where tenant_id in (
      select tenant_id from public.tenant_members where user_id = auth.uid()
    ))
  );


-- ============================================
-- HELPER: updated_at trigger
-- ============================================
create or replace function public.update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger set_updated_at before update on public.profiles for each row execute function public.update_updated_at();
create trigger set_updated_at before update on public.models for each row execute function public.update_updated_at();
create trigger set_updated_at before update on public.resources for each row execute function public.update_updated_at();
create trigger set_updated_at before update on public.activities for each row execute function public.update_updated_at();
create trigger set_updated_at before update on public.cost_objects for each row execute function public.update_updated_at();
create trigger set_updated_at before update on public.kpis for each row execute function public.update_updated_at();
