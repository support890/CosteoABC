import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useTenant } from "./use-tenant";
import type { Model, Period } from "./use-supabase-data";

const BI_MODULE = "bi_express";

/**
 * Hook for BI Express models.
 * Filters models by module = 'bi_express' to keep them separate from ABC models.
 * Requires a `module` text column on the `models` table in Supabase
 * (default value: null for backward compat with existing ABC models).
 */
export function useBIModels() {
  const { tenant } = useTenant();
  const qc = useQueryClient();
  const tenantId = tenant?.id;

  const query = useQuery<Model[]>({
    queryKey: ["models", tenantId, BI_MODULE],
    queryFn: async () => {
      if (!tenantId) return [];
      const { data, error } = await supabase
        .from("models")
        .select("*")
        .eq("tenant_id", tenantId)
        .eq("module", BI_MODULE)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as Model[];
    },
    enabled: !!tenantId,
  });

  const create = useMutation({
    mutationFn: async (item: Partial<Model> & { module?: string }) => {
      const { data, error } = await supabase
        .from("models")
        .insert({ ...item, tenant_id: tenantId, module: BI_MODULE })
        .select()
        .single();
      if (error) throw error;
      return data as Model;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["models", tenantId, BI_MODULE] }),
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
    onSuccess: () => qc.invalidateQueries({ queryKey: ["models", tenantId, BI_MODULE] }),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("models").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["models", tenantId, BI_MODULE] }),
  });

  return { ...query, items: query.data ?? [], create, update, remove };
}

/**
 * Hook for periods - reuses the same periods table, no module filter needed
 * since periods are already linked to a model_id.
 */
export function useBIPeriods() {
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
