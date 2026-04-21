import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useTenant } from "./use-tenant";
import type { Model, Period } from "./use-supabase-data";

const FORECAST_MODULE = "forecast";

/**
 * Hook for Forecast models.
 * Filters models by module = 'forecast' to keep them separate from other modules.
 */
export function useForecastModels() {
  const { tenant } = useTenant();
  const qc = useQueryClient();
  const tenantId = tenant?.id;

  const query = useQuery<Model[]>({
    queryKey: ["models", tenantId, FORECAST_MODULE],
    queryFn: async () => {
      if (!tenantId) return [];
      const { data, error } = await supabase
        .from("models")
        .select("*")
        .eq("tenant_id", tenantId)
        .eq("module", FORECAST_MODULE)
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
        .insert({ ...item, tenant_id: tenantId, module: FORECAST_MODULE })
        .select()
        .single();
      if (error) throw error;
      return data as Model;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["models", tenantId, FORECAST_MODULE] });
      qc.invalidateQueries({ queryKey: ["plan-limits-models", tenantId] });
    },
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
    onSuccess: () => qc.invalidateQueries({ queryKey: ["models", tenantId, FORECAST_MODULE] }),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("models").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["models", tenantId, FORECAST_MODULE] }),
  });

  return { ...query, items: query.data ?? [], create, update, remove };
}

/**
 * Hook for periods - reuses the same periods table.
 * Periods are linked to a model_id so no module filter needed.
 */
export function useForecastPeriods() {
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
