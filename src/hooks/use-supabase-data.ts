import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useTenant } from "./use-tenant";
import { useModelContext } from "@/contexts/ModelContext";

/* ───── Generic types ───── */
interface BaseRecord {
  id: string;
  tenant_id: string;
  code: string;
  name: string;
  amount: number;
  created_at: string;
  updated_at: string;
}

interface Resource extends BaseRecord {
  period_id: string;
  type: "directo" | "indirecto";
  category: string | null;
  center_id: string | null;
}

interface CostCenter {
  id: string;
  tenant_id: string;
  period_id: string;
  code: string;
  name: string;
  type: "agrupador" | "totalizador";
  note: string | null;
  parent_id: string | null;
  created_at: string;
  updated_at: string;
}

interface Activity extends BaseRecord {
  period_id: string;
  type: string;
  category: string | null;
  center_id: string | null;
}

interface ActivityCenter {
  id: string;
  tenant_id: string;
  period_id: string;
  code: string;
  name: string;
  type: "agrupador" | "totalizador";
  note: string | null;
  parent_id: string | null;
  created_at: string;
  updated_at: string;
}

interface CostObject extends BaseRecord {
  period_id: string;
  type: string;
  category: string | null;
  center_id: string | null;
  price: number | null;
}

interface CostObjectCenter {
  id: string;
  tenant_id: string;
  period_id: string;
  code: string;
  name: string;
  type: "agrupador" | "totalizador";
  note: string | null;
  parent_id: string | null;
  created_at: string;
  updated_at: string;
}

interface Model {
  id: string;
  tenant_id: string;
  name: string;
  description: string | null;
  base_currency: string;
  type: "servicio" | "industria" | "comercio" | "gobierno";
  created_at: string;
  updated_at?: string;
}

interface Period {
  id: string;
  tenant_id: string;
  model_id: string | null;
  name: string;
  start_date: string;
  end_date: string;
  status: "open" | "closed" | "processing";
  created_at: string;
}

interface Driver {
  id: string;
  tenant_id: string;
  period_id: string;
  name: string;
  type: "uniform" | "extended";
  source_type: "resource" | "activity" | "resource_center" | "activity_center";
  source_id: string;
  destination_type: "activity" | "cost_object" | "resource" | "activity_center" | "cost_object_center";
  total_value: number | null;
  created_at: string;
}

interface DriverLine {
  id: string;
  driver_id: string;
  destination_id: string;
  value: number;
  percentage: number;
}

interface Dimension {
  id: string;
  tenant_id: string;
  model_id: string;
  name: string;
  code: string | null;
  sort_order: number;
  created_at: string;
}

interface DimensionItem {
  id: string;
  tenant_id: string;
  dimension_id: string;
  parent_id: string | null;
  code: string;
  name: string;
  level: number;
  price?: number | null;
  created_at: string;
}

interface CostObjectDimension {
  cost_object_id: string;
  dimension_item_id: string;
  percentage: number;
}

interface Perspective {
  id: string;
  tenant_id: string;
  name: string;
  weight: number;
  sort_order: number;
}

interface KPI {
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

/* ───── Helper: CRUD factory ───── */
function useCrud<T extends { id: string }>(table: string) {
  const { tenant } = useTenant();
  const qc = useQueryClient();
  const tenantId = tenant?.id;

  const query = useQuery<T[]>({
    queryKey: [table, tenantId],
    queryFn: async () => {
      if (!tenantId) return [];
      const { data, error } = await supabase
        .from(table)
        .select("*")
        .eq("tenant_id", tenantId)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as T[];
    },
    enabled: !!tenantId,
  });

  const create = useMutation({
    mutationFn: async (item: Partial<T>) => {
      const { data, error } = await supabase
        .from(table)
        .insert({ ...item, tenant_id: tenantId })
        .select()
        .single();
      if (error) throw error;
      return data as T;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: [table, tenantId] }),
  });

  const update = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<T> & { id: string }) => {
      const { data, error } = await supabase
        .from(table)
        .update(updates)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data as T;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: [table, tenantId] }),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from(table).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: [table, tenantId] }),
  });

  return { ...query, items: query.data ?? [], create, update, remove };
}

/* ───── Helper: Period CRUD factory ───── */
function usePeriodCrud<T extends { id: string }>(table: string) {
  const { tenant } = useTenant();
  const { selectedPeriod } = useModelContext();
  const qc = useQueryClient();
  const tenantId = tenant?.id;
  const periodId = selectedPeriod?.id;

  const query = useQuery<T[]>({
    queryKey: [table, tenantId, periodId],
    queryFn: async () => {
      if (!tenantId || !periodId) return [];
      const { data, error } = await supabase
        .from(table)
        .select("*")
        .eq("tenant_id", tenantId)
        .eq("period_id", periodId)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as T[];
    },
    enabled: !!tenantId && !!periodId,
  });

  const create = useMutation({
    mutationFn: async (item: Partial<T>) => {
      if (!periodId) throw new Error("No period selected");
      const { data, error } = await supabase
        .from(table)
        .insert({ ...item, tenant_id: tenantId, period_id: periodId })
        .select()
        .single();
      if (error) throw error;
      return data as T;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: [table, tenantId, periodId] }),
  });

  const update = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<T> & { id: string }) => {
      const { data, error } = await supabase
        .from(table)
        .update(updates)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data as T;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: [table, tenantId, periodId] }),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from(table).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: [table, tenantId, periodId] }),
  });

  return { ...query, items: query.data ?? [], create, update, remove };
}

/* ───── Exported hooks ───── */
export function useModels() {
  const { tenant } = useTenant();
  const qc = useQueryClient();
  const tenantId = tenant?.id;

  // ABC Costing models are identified by module IS NULL.
  // Other modules (BI Express, Forecast, Logistics) set their own module value.
  const query = useQuery<Model[]>({
    queryKey: ["models", tenantId, "abc"],
    queryFn: async () => {
      if (!tenantId) return [];
      const { data, error } = await supabase
        .from("models")
        .select("*")
        .eq("tenant_id", tenantId)
        .is("module", null)
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
        .insert({ ...item, tenant_id: tenantId, module: null })
        .select()
        .single();
      if (error) throw error;
      return data as Model;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["models", tenantId, "abc"] }),
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
    onSuccess: () => qc.invalidateQueries({ queryKey: ["models", tenantId, "abc"] }),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("models").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["models", tenantId, "abc"] }),
  });

  return { ...query, items: query.data ?? [], create, update, remove };
}

export function usePeriods() {
  return useCrud<Period>("periods");
}

export function useResources() {
  return usePeriodCrud<Resource>("resources");
}

export function useCostCenters() {
  return usePeriodCrud<CostCenter>("cost_centers");
}

export function useActivities() {
  return usePeriodCrud<Activity>("activities");
}

export function useActivityCenters() {
  return usePeriodCrud<ActivityCenter>("activity_centers");
}

export function useCostObjects() {
  return usePeriodCrud<CostObject>("cost_objects");
}

export function useCostObjectCenters() {
  return usePeriodCrud<CostObjectCenter>("cost_object_centers");
}

export function useDrivers() {
  return usePeriodCrud<Driver>("drivers");
}

export function useDriverLines(driverId?: string) {
  const qc = useQueryClient();

  const query = useQuery<DriverLine[]>({
    queryKey: ["driver_lines", driverId],
    queryFn: async () => {
      if (!driverId) return [];
      const { data, error } = await supabase
        .from("driver_lines")
        .select("*")
        .eq("driver_id", driverId);
      if (error) throw error;
      return (data ?? []) as DriverLine[];
    },
    enabled: !!driverId,
  });

  const createLine = useMutation({
    mutationFn: async (line: Omit<DriverLine, "id">) => {
      const { data, error } = await supabase
        .from("driver_lines")
        .insert(line)
        .select()
        .single();
      if (error) throw error;
      return data as DriverLine;
    },
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: ["driver_lines", driverId] }),
  });

  const createLines = useMutation({
    mutationFn: async (lines: Omit<DriverLine, "id">[]) => {
      const { data, error } = await supabase
        .from("driver_lines")
        .insert(lines)
        .select();
      if (error) throw error;
      return (data ?? []) as DriverLine[];
    },
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: ["driver_lines", driverId] }),
  });

  const updateLine = useMutation({
    mutationFn: async ({
      id,
      ...updates
    }: Partial<DriverLine> & { id: string }) => {
      const { data, error } = await supabase
        .from("driver_lines")
        .update(updates)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data as DriverLine;
    },
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: ["driver_lines", driverId] }),
  });

  const removeLine = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("driver_lines")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: ["driver_lines", driverId] }),
  });

  const removeAllLines = useMutation({
    mutationFn: async (forDriverId: string) => {
      const { error } = await supabase
        .from("driver_lines")
        .delete()
        .eq("driver_id", forDriverId);
      if (error) throw error;
    },
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: ["driver_lines", driverId] }),
  });

  return {
    ...query,
    lines: query.data ?? [],
    createLine,
    createLines,
    updateLine,
    removeLine,
    removeAllLines,
  };
}

export function usePerspectives() {
  return useCrud<Perspective>("perspectives");
}

export function useKPIs() {
  return useCrud<KPI>("kpis");
}

/* ───── Dimensions hooks ───── */

export function useDimensions() {
  const { tenant } = useTenant();
  const { selectedModel } = useModelContext();
  const qc = useQueryClient();
  const tenantId = tenant?.id;
  const modelId = selectedModel?.id;

  const query = useQuery<Dimension[]>({
    queryKey: ["dimensions", tenantId, modelId],
    queryFn: async () => {
      if (!tenantId || !modelId) return [];
      const { data, error } = await supabase
        .from("dimensions")
        .select("*")
        .eq("tenant_id", tenantId)
        .eq("model_id", modelId)
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return (data ?? []) as Dimension[];
    },
    enabled: !!tenantId && !!modelId,
  });

  const create = useMutation({
    mutationFn: async (item: Partial<Dimension>) => {
      const { data, error } = await supabase
        .from("dimensions")
        .insert({ ...item, tenant_id: tenantId, model_id: modelId })
        .select()
        .single();
      if (error) throw error;
      return data as Dimension;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["dimensions", tenantId, modelId] }),
  });

  const update = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Dimension> & { id: string }) => {
      const { data, error } = await supabase
        .from("dimensions")
        .update(updates)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data as Dimension;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["dimensions", tenantId, modelId] }),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("dimensions").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["dimensions", tenantId, modelId] }),
  });

  return { ...query, items: query.data ?? [], create, update, remove };
}

export function useDimensionItems() {
  const { tenant } = useTenant();
  const { selectedModel } = useModelContext();
  const qc = useQueryClient();
  const tenantId = tenant?.id;
  const modelId = selectedModel?.id;

  const query = useQuery<DimensionItem[]>({
    queryKey: ["dimension_items", tenantId, modelId],
    queryFn: async () => {
      if (!tenantId || !modelId) return [];
      // Fetch dimension IDs for this model first, then items in one query
      const { data: dims, error: dimsErr } = await supabase
        .from("dimensions")
        .select("id")
        .eq("tenant_id", tenantId)
        .eq("model_id", modelId);
      if (dimsErr) throw dimsErr;
      if (!dims || dims.length === 0) return [];
      const dimIds = dims.map((d) => d.id);
      const { data, error } = await supabase
        .from("dimension_items")
        .select("*")
        .eq("tenant_id", tenantId)
        .in("dimension_id", dimIds)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as DimensionItem[];
    },
    enabled: !!tenantId && !!modelId,
  });

  const create = useMutation({
    mutationFn: async (item: Omit<DimensionItem, "id" | "created_at">) => {
      const { data, error } = await supabase
        .from("dimension_items")
        .insert({ ...item, tenant_id: tenantId })
        .select()
        .single();
      if (error) throw error;
      return data as DimensionItem;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["dimension_items", tenantId, modelId] }),
  });

  const update = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<DimensionItem> & { id: string }) => {
      const { data, error } = await supabase
        .from("dimension_items")
        .update(updates)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data as DimensionItem;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["dimension_items", tenantId, modelId] }),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("dimension_items").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["dimension_items", tenantId, modelId] }),
  });

  return { ...query, items: query.data ?? [], create, update, remove };
}

export function useCostObjectDimensions() {
  const { tenant } = useTenant();
  const { selectedPeriod } = useModelContext();
  const qc = useQueryClient();
  const tenantId = tenant?.id;
  const periodId = selectedPeriod?.id;

  const query = useQuery<CostObjectDimension[]>({
    queryKey: ["cost_object_dimensions", tenantId, periodId],
    queryFn: async () => {
      if (!tenantId || !periodId) return [];
      const { data: cos, error: cosErr } = await supabase
        .from("cost_objects")
        .select("id")
        .eq("tenant_id", tenantId)
        .eq("period_id", periodId);
      if (cosErr) throw cosErr;
      if (!cos || cos.length === 0) return [];
      const coIds = cos.map((c) => c.id);
      const { data, error } = await supabase
        .from("cost_object_dimensions")
        .select("*")
        .in("cost_object_id", coIds);
      if (error) throw error;
      return (data ?? []) as CostObjectDimension[];
    },
    enabled: !!tenantId && !!periodId,
  });

  const assign = useMutation({
    mutationFn: async (row: CostObjectDimension) => {
      const { error } = await supabase
        .from("cost_object_dimensions")
        .upsert(row, { onConflict: "cost_object_id,dimension_item_id" });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["cost_object_dimensions", tenantId, periodId] }),
  });

  const unassign = useMutation({
    mutationFn: async ({ cost_object_id, dimension_item_id }: CostObjectDimension) => {
      const { error } = await supabase
        .from("cost_object_dimensions")
        .delete()
        .eq("cost_object_id", cost_object_id)
        .eq("dimension_item_id", dimension_item_id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["cost_object_dimensions", tenantId, periodId] }),
  });

  const replaceAssignments = useMutation({
    mutationFn: async ({
      cost_object_id,
      dimension_item_ids,
    }: {
      cost_object_id: string;
      dimension_item_ids: string[];
    }) => {
      // Remove existing assignments for this cost object within the given dimension
      // Then insert new ones
      const toInsert = dimension_item_ids.map((dim_item_id) => ({
        cost_object_id,
        dimension_item_id: dim_item_id,
      }));
      // Delete all assignments for this cost object first
      const { error: delErr } = await supabase
        .from("cost_object_dimensions")
        .delete()
        .eq("cost_object_id", cost_object_id);
      if (delErr) throw delErr;
      if (toInsert.length > 0) {
        const { error: insErr } = await supabase
          .from("cost_object_dimensions")
          .insert(toInsert);
        if (insErr) throw insErr;
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["cost_object_dimensions", tenantId, periodId] }),
  });

  return { ...query, items: query.data ?? [], assign, unassign, replaceAssignments };
}

export type {
  Model,
  Period,
  Resource,
  Activity,
  CostObject,
  CostCenter,
  ActivityCenter,
  CostObjectCenter,
  Driver,
  DriverLine,
  Perspective,
  KPI,
  Dimension,
  DimensionItem,
  CostObjectDimension,
};
