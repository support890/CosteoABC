import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useTenant } from "./use-tenant";
import { useLogisticsContext } from "@/contexts/LogisticsContext";

/* ───── Types ───── */

export interface LogisticsExpenseCenter {
  id: string;
  tenant_id: string;
  period_id: string;
  code: string;
  name: string;
  category: string | null;
  note: string | null;
  parent_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface LogisticsExpense {
  id: string;
  tenant_id: string;
  period_id: string;
  code: string;
  name: string;
  amount: number;
  category: string;
  center_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface LogisticsOperationDrivers {
  id: string;
  tenant_id: string;
  period_id: string;
  dias_laborales: number;
  margen_contribucion_pct: number;
  efectividad_reparto_pct: number;
  pedidos_programados_diarios: number;
  pedidos_programados_baja: number;
  tasa_iva_pct: number;
  zonas_visitadas: number;
  created_at: string;
  updated_at: string;
}

/* ───── Default seed data ───── */

const DEFAULT_CENTERS = [
  { code: "GC-0001", name: "Transporte" },
  { code: "GC-0002", name: "Tripulacion" },
  { code: "GC-0003", name: "Vendedor" },
];

const DEFAULT_EXPENSES: { code: string; name: string; category: string; centerIndex: number }[] = [
  { code: "G-0001", name: "Combustible",     category: "reparto",  centerIndex: 0 },
  { code: "G-0002", name: "Mantenimiento",   category: "reparto",  centerIndex: 0 },
  { code: "G-0003", name: "Depreciacion",    category: "reparto",  centerIndex: 0 },
  { code: "G-0004", name: "Seguros",         category: "reparto",  centerIndex: 0 },
  { code: "G-0005", name: "Peajes",          category: "reparto",  centerIndex: 0 },
  { code: "G-0006", name: "Llantas",         category: "reparto",  centerIndex: 0 },
  { code: "G-0007", name: "GPS",             category: "reparto",  centerIndex: 0 },
  { code: "G-0008", name: "Tasa municipal",  category: "reparto",  centerIndex: 0 },
  { code: "G-0009", name: "Chofer",          category: "reparto",  centerIndex: 1 },
  { code: "G-0010", name: "Auxiliar",        category: "reparto",  centerIndex: 1 },
  { code: "G-0011", name: "Salario",         category: "preventa", centerIndex: 2 },
  { code: "G-0012", name: "Variable",        category: "preventa", centerIndex: 2 },
  { code: "G-0013", name: "Transporte",      category: "preventa", centerIndex: 2 },
  { code: "G-0014", name: "Otros",           category: "preventa", centerIndex: 2 },
];

export async function seedDefaultLogisticsData(tenantId: string, periodId: string) {
  // Insert centers
  const { data: createdCenters, error: centersError } = await supabase
    .from("logistics_expense_centers")
    .insert(DEFAULT_CENTERS.map((c) => ({ ...c, tenant_id: tenantId, period_id: periodId, category: null })))
    .select("id, code");
  if (centersError) throw centersError;

  // Map code -> id
  const centerIdByCode: Record<string, string> = {};
  (createdCenters ?? []).forEach((c: { id: string; code: string }) => { centerIdByCode[c.code] = c.id; });
  const centerIds = DEFAULT_CENTERS.map((c) => centerIdByCode[c.code]);

  // Insert expenses
  const { error: expensesError } = await supabase
    .from("logistics_expenses")
    .insert(
      DEFAULT_EXPENSES.map((e) => ({
        code: e.code,
        name: e.name,
        category: e.category,
        amount: 0,
        center_id: centerIds[e.centerIndex],
        tenant_id: tenantId,
        period_id: periodId,
      }))
    );
  if (expensesError) throw expensesError;
}

/* ───── Generic logistics period CRUD ───── */

function useLogisticsPeriodCrud<T extends { id: string }>(table: string) {
  const { tenant } = useTenant();
  const { selectedLogisticsPeriod } = useLogisticsContext();
  const qc = useQueryClient();
  const tenantId = tenant?.id;
  const periodId = selectedLogisticsPeriod?.id;

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

export function useLogisticsExpenses() {
  return useLogisticsPeriodCrud<LogisticsExpense>("logistics_expenses");
}

export function useLogisticsExpenseCenters() {
  return useLogisticsPeriodCrud<LogisticsExpenseCenter>("logistics_expense_centers");
}

export function useLogisticsOperationDrivers() {
  const { tenant } = useTenant();
  const { selectedLogisticsPeriod } = useLogisticsContext();
  const qc = useQueryClient();
  const tenantId = tenant?.id;
  const periodId = selectedLogisticsPeriod?.id;
  const table = "logistics_operation_drivers";

  const query = useQuery<LogisticsOperationDrivers | null>({
    queryKey: [table, tenantId, periodId],
    queryFn: async () => {
      if (!tenantId || !periodId) return null;
      const { data, error } = await supabase
        .from(table)
        .select("*")
        .eq("tenant_id", tenantId)
        .eq("period_id", periodId)
        .maybeSingle();
      if (error) throw error;
      return data as LogisticsOperationDrivers | null;
    },
    enabled: !!tenantId && !!periodId,
  });

  const upsert = useMutation({
    mutationFn: async (values: Partial<LogisticsOperationDrivers>) => {
      if (!periodId || !tenantId) throw new Error("No period/tenant");
      const { data, error } = await supabase
        .from(table)
        .upsert(
          { ...values, tenant_id: tenantId, period_id: periodId },
          { onConflict: "tenant_id,period_id" }
        )
        .select()
        .single();
      if (error) throw error;
      return data as LogisticsOperationDrivers;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: [table, tenantId, periodId] }),
  });

  return { ...query, drivers: query.data, upsert };
}
