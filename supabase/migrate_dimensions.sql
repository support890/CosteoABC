-- ============================================================
-- Migración: Análisis Multidimensional — Fase 1
-- Fecha: 2026-03-31
-- Descripción: Crea las tablas para dimensiones dinámicas,
--              ítems de dimensión con jerarquía, y la tabla
--              de intersección con objetos de costo.
-- ============================================================

-- ── 1. Tabla: dimensions ──────────────────────────────────────
-- Dimensiones configuradas por el usuario (ej: Productos, Canales, Regiones)
-- Están vinculadas al modelo ABC, no al período.
CREATE TABLE IF NOT EXISTS public.dimensions (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   uuid        NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  model_id    uuid        NOT NULL REFERENCES public.models(id)  ON DELETE CASCADE,
  name        text        NOT NULL,
  code        text,
  sort_order  int         NOT NULL DEFAULT 0,
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- RLS
ALTER TABLE public.dimensions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "dimensions_tenant_isolation"
  ON public.dimensions
  USING (
    tenant_id IN (
      SELECT tenant_id FROM public.tenant_members WHERE user_id = auth.uid()
    )
  );

-- ── 2. Tabla: dimension_items ─────────────────────────────────
-- Ítems de cada dimensión con jerarquía opcional (lista de adyacencia).
-- Ejemplo: Familia de Producto > Producto, Región > Sub-Región
CREATE TABLE IF NOT EXISTS public.dimension_items (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     uuid        NOT NULL REFERENCES public.tenants(id)     ON DELETE CASCADE,
  dimension_id  uuid        NOT NULL REFERENCES public.dimensions(id)  ON DELETE CASCADE,
  parent_id     uuid        REFERENCES public.dimension_items(id)      ON DELETE SET NULL,
  code          text        NOT NULL,
  name          text        NOT NULL,
  level         int         NOT NULL DEFAULT 0,  -- 0 = raíz de la jerarquía
  created_at    timestamptz NOT NULL DEFAULT now()
);

-- RLS
ALTER TABLE public.dimension_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "dimension_items_tenant_isolation"
  ON public.dimension_items
  USING (
    tenant_id IN (
      SELECT tenant_id FROM public.tenant_members WHERE user_id = auth.uid()
    )
  );

-- ── 3. Tabla: cost_object_dimensions ─────────────────────────
-- Tabla de intersección: cada cost_object puede pertenecer a
-- uno o más ítems de dimensión (relación M:N).
CREATE TABLE IF NOT EXISTS public.cost_object_dimensions (
  cost_object_id    uuid NOT NULL REFERENCES public.cost_objects(id)    ON DELETE CASCADE,
  dimension_item_id uuid NOT NULL REFERENCES public.dimension_items(id) ON DELETE CASCADE,
  PRIMARY KEY (cost_object_id, dimension_item_id)
);

-- RLS: se accede a través de la RLS de cost_objects
ALTER TABLE public.cost_object_dimensions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "cost_object_dimensions_tenant_isolation"
  ON public.cost_object_dimensions
  USING (
    cost_object_id IN (
      SELECT id FROM public.cost_objects
      WHERE tenant_id IN (
        SELECT tenant_id FROM public.tenant_members WHERE user_id = auth.uid()
      )
    )
  );

-- ── 4. Índices ────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_dimensions_tenant_model   ON public.dimensions(tenant_id, model_id);
CREATE INDEX IF NOT EXISTS idx_dimension_items_dimension ON public.dimension_items(dimension_id);
CREATE INDEX IF NOT EXISTS idx_dimension_items_tenant    ON public.dimension_items(tenant_id);
CREATE INDEX IF NOT EXISTS idx_cod_cost_object           ON public.cost_object_dimensions(cost_object_id);
CREATE INDEX IF NOT EXISTS idx_cod_dimension_item        ON public.cost_object_dimensions(dimension_item_id);
