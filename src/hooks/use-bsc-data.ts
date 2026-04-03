import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useTenant } from "./use-tenant";
import type { Model, Period } from "./use-supabase-data";

const BSC_MODULE = "bsc";

/* ────────────────────────────────────────────────────────
   BSC Models  (module = "bsc")
──────────────────────────────────────────────────────── */
export function useBSCModels() {
  const { tenant } = useTenant();
  const qc = useQueryClient();
  const tenantId = tenant?.id;

  const query = useQuery<Model[]>({
    queryKey: ["models", tenantId, BSC_MODULE],
    queryFn: async () => {
      if (!tenantId) return [];
      const { data, error } = await supabase
        .from("models")
        .select("*")
        .eq("tenant_id", tenantId)
        .eq("module", BSC_MODULE)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as Model[];
    },
    enabled: !!tenantId,
  });

  const create = useMutation({
    mutationFn: async (item: Partial<Model>) => {
      const { data, error } = await supabase
        .from("models")
        .insert({ ...item, tenant_id: tenantId, module: BSC_MODULE })
        .select()
        .single();
      if (error) throw error;
      return data as Model;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["models", tenantId, BSC_MODULE] }),
  });

  const update = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Model> & { id: string }) => {
      const { data, error } = await supabase
        .from("models")
        .update(updates)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data as Model;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["models", tenantId, BSC_MODULE] }),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("models").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["models", tenantId, BSC_MODULE] }),
  });

  return { ...query, items: query.data ?? [], create, update, remove };
}

/* ────────────────────────────────────────────────────────
   BSC Periods  (shared periods table, linked via model_id)
──────────────────────────────────────────────────────── */
export function useBSCPeriods() {
  const { tenant } = useTenant();
  const qc = useQueryClient();
  const tenantId = tenant?.id;

  const query = useQuery<Period[]>({
    queryKey: ["periods", tenantId],
    queryFn: async () => {
      if (!tenantId) return [];
      const { data, error } = await supabase
        .from("periods")
        .select("*")
        .eq("tenant_id", tenantId)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as Period[];
    },
    enabled: !!tenantId,
  });

  const create = useMutation({
    mutationFn: async (item: Partial<Period>) => {
      const { data, error } = await supabase
        .from("periods")
        .insert({ ...item, tenant_id: tenantId })
        .select()
        .single();
      if (error) throw error;
      return data as Period;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["periods", tenantId] }),
  });

  return { ...query, items: query.data ?? [], create };
}

/* ────────────────────────────────────────────────────────
   BSC Perspectives  (scoped to a period via period_id)
   Requires: ALTER TABLE perspectives ADD COLUMN IF NOT EXISTS
             period_id uuid REFERENCES periods(id) ON DELETE CASCADE;
──────────────────────────────────────────────────────── */
export interface BSCPerspective {
  id: string;
  tenant_id: string;
  period_id: string | null;
  name: string;
  weight: number;
  sort_order: number;
}

export function useBSCPerspectives(periodId: string | null) {
  const { tenant } = useTenant();
  const qc = useQueryClient();
  const tenantId = tenant?.id;

  const query = useQuery<BSCPerspective[]>({
    queryKey: ["perspectives", tenantId, periodId],
    queryFn: async () => {
      if (!tenantId || !periodId) return [];
      const { data, error } = await supabase
        .from("perspectives")
        .select("*")
        .eq("tenant_id", tenantId)
        .eq("period_id", periodId)
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return (data ?? []) as BSCPerspective[];
    },
    enabled: !!tenantId && !!periodId,
  });

  const create = useMutation({
    mutationFn: async (item: { name: string; weight: number }) => {
      const { data, error } = await supabase
        .from("perspectives")
        .insert({
          ...item,
          tenant_id: tenantId,
          period_id: periodId,
          sort_order: 0,
        })
        .select()
        .single();
      if (error) throw error;
      return data as BSCPerspective;
    },
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: ["perspectives", tenantId, periodId] }),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("perspectives")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: ["perspectives", tenantId, periodId] }),
  });

  return { ...query, items: query.data ?? [], create, remove };
}

/* ────────────────────────────────────────────────────────
   BSC KPIs  (filtered client-side by perspective_ids)
   Uses the same `kpis` table as the general KPI hooks.
──────────────────────────────────────────────────────── */
export interface BSCKPI {
  id: string;
  tenant_id: string;
  perspective_id: string;
  parent_id: string | null;
  name: string;
  weight: number;
  target_value: number | null;
  current_value: number;
  unit: string;
  threshold_green: number | null;
  threshold_yellow: number | null;
}

export function useBSCKPIs(perspectiveIds: string[]) {
  const { tenant } = useTenant();
  const qc = useQueryClient();
  const tenantId = tenant?.id;
  // Stable key using sorted ids
  const keyIds = [...perspectiveIds].sort().join(",");

  const query = useQuery<BSCKPI[]>({
    queryKey: ["kpis", tenantId, "bsc", keyIds],
    queryFn: async () => {
      if (!tenantId || perspectiveIds.length === 0) return [];
      const { data, error } = await supabase
        .from("kpis")
        .select("*")
        .eq("tenant_id", tenantId)
        .in("perspective_id", perspectiveIds)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as BSCKPI[];
    },
    enabled: !!tenantId && perspectiveIds.length > 0,
  });

  const create = useMutation({
    mutationFn: async (item: Partial<BSCKPI>) => {
      const { data, error } = await supabase
        .from("kpis")
        .insert({ ...item, tenant_id: tenantId })
        .select()
        .single();
      if (error) throw error;
      return data as BSCKPI;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["kpis", tenantId, "bsc", keyIds] });
      qc.invalidateQueries({ queryKey: ["kpis", tenantId] });
    },
  });

  const update = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<BSCKPI> & { id: string }) => {
      const { data, error } = await supabase
        .from("kpis")
        .update(updates)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data as BSCKPI;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["kpis", tenantId, "bsc", keyIds] });
      qc.invalidateQueries({ queryKey: ["kpis", tenantId] });
    },
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("kpis").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["kpis", tenantId, "bsc", keyIds] });
      qc.invalidateQueries({ queryKey: ["kpis", tenantId] });
    },
  });

  return { ...query, items: query.data ?? [], create, update, remove };
}
