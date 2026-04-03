// ── Types ──────────────────────────────────────────────────────────────────────

export interface VehicleExpenses {
  combustible: number;
  mantenimiento: number;
  depreciacion: number;
  seguros: number;
  impuestos_tasas: number;
}

export interface CrewExpenses {
  salario_chofer: number;
  salario_auxiliar: number;
  beneficios: number;
}

export interface SalesExpenses {
  salario_fijo: number;
  comisiones: number;
  movilidad: number;
}

export interface OperationDrivers {
  dias_laborales: number;
  margen_contribucion_pct: number;
  efectividad_reparto_pct: number;
  pedidos_programados_diarios: number;
  pedidos_programados_baja: number;
  tasa_iva_pct: number;
  zonas_visitadas: number;
}

export interface LogisticsInputs {
  vehiculo: VehicleExpenses;
  tripulacion: CrewExpenses;
  ventas: SalesExpenses;
  operacion: OperationDrivers;
}

export interface LogisticsResults {
  gasto_total_vehiculo: number;
  gasto_total_tripulacion: number;
  gasto_total_ventas: number;
  gasto_total_otro: number;
  gasto_total_mensual: number;
  gasto_diario: number;
  punto_equilibrio_mensual: number;
  pedidos_efectivos_diarios: number;
  gasto_por_pdv: number;
  drop_size_minimo: number;
  drop_size_sin_iva: number;
}

export interface WhatIfScenario {
  label: string;
  results: LogisticsResults;
  delta_drop_size_pct: number;
  delta_pe_pct: number;
}

export interface SensitivityPoint {
  variable: string;
  variacion_pct: number;
  drop_size: number;
  punto_equilibrio: number;
}

// ── Dynamic Expense Types ───────────────────────────────────────────────────

export type ExpenseCategory = string;

export interface ExpenseItem {
  id: string;
  name: string;
  amount: number;
  category: ExpenseCategory;
}

export interface DynamicLogisticsInputs {
  expenses: ExpenseItem[];
  operacion: OperationDrivers;
}

// ── Default Inputs ────────────────────────────────────────────────────────────

export const DEFAULT_INPUTS: LogisticsInputs = {
  vehiculo: {
    combustible: 3000,
    mantenimiento: 800,
    depreciacion: 1500,
    seguros: 500,
    impuestos_tasas: 200,
  },
  tripulacion: {
    salario_chofer: 3500,
    salario_auxiliar: 2500,
    beneficios: 1800,
  },
  ventas: {
    salario_fijo: 3000,
    comisiones: 1500,
    movilidad: 800,
  },
  operacion: {
    dias_laborales: 22,
    margen_contribucion_pct: 25,
    efectividad_reparto_pct: 90,
    pedidos_programados_diarios: 30,
    tasa_iva_pct: 13,
  },
};

export const DEFAULT_OPERATION_DRIVERS: OperationDrivers = {
  dias_laborales: 22,
  margen_contribucion_pct: 25,
  efectividad_reparto_pct: 90,
  pedidos_programados_diarios: 30,
  pedidos_programados_baja: 22,
  tasa_iva_pct: 13,
  zonas_visitadas: 1,
};

// ── Calculation Engine ────────────────────────────────────────────────────────

function sumByCategory(expenses: ExpenseItem[], category: ExpenseCategory): number {
  return expenses
    .filter((e) => e.category === category)
    .reduce((s, e) => s + e.amount, 0);
}

/** Calculate logistics results from dynamic expense list */
export function calculateFromExpenses(inputs: DynamicLogisticsInputs): LogisticsResults {
  const { expenses, operacion } = inputs;

  const gasto_total_vehiculo = sumByCategory(expenses, "vehiculo");
  const gasto_total_tripulacion = sumByCategory(expenses, "tripulacion");
  const gasto_total_ventas = sumByCategory(expenses, "ventas");
  const gasto_total_otro = sumByCategory(expenses, "otro");

  // Total real sin doble conteo
  const gasto_total_mensual = expenses.reduce((s, e) => s + e.amount, 0);

  const zonas = operacion.zonas_visitadas > 0 ? operacion.zonas_visitadas : 1;

  // Paso 1: Gasto total diario = suma de todos los gastos / días laborales / zonas visitadas
  const gasto_diario =
    operacion.dias_laborales > 0
      ? gasto_total_mensual / operacion.dias_laborales / zonas
      : 0;

  // Paso 2: Punto de Equilibrio mensual = (Gasto / Zonas) / Margen / (1 - IVA)
  const margen_decimal = operacion.margen_contribucion_pct / 100;
  const iva_decimal = operacion.tasa_iva_pct / 100;
  const factor_iva = 1 - iva_decimal;
  const punto_equilibrio_mensual =
    margen_decimal > 0 && factor_iva > 0
      ? (gasto_total_mensual / zonas) / margen_decimal / factor_iva
      : 0;

  // Paso 3: Pedidos efectivos y gasto por PDV
  const pedidos_efectivos_diarios =
    operacion.pedidos_programados_diarios * (operacion.efectividad_reparto_pct / 100) * zonas;

  const gasto_por_pdv =
    pedidos_efectivos_diarios > 0 ? gasto_diario / pedidos_efectivos_diarios : 0;

  // Paso 4: Drop Size Mínimo (con IVA)
  const drop_size_sin_iva =
    margen_decimal > 0 ? gasto_por_pdv / margen_decimal : 0;

  const drop_size_minimo =
    factor_iva > 0 ? drop_size_sin_iva / factor_iva : 0;

  return {
    gasto_total_vehiculo,
    gasto_total_tripulacion,
    gasto_total_ventas,
    gasto_total_otro,
    gasto_total_mensual,
    gasto_diario,
    punto_equilibrio_mensual,
    pedidos_efectivos_diarios,
    gasto_por_pdv,
    drop_size_minimo,
    drop_size_sin_iva,
  };
}

/** Legacy: Calculate from static LogisticsInputs */
export function calculateLogistics(inputs: LogisticsInputs): LogisticsResults {
  const { vehiculo, tripulacion, ventas, operacion } = inputs;

  // Convert static inputs to expense list
  const expenses: ExpenseItem[] = [
    { id: "v1", name: "Combustible", amount: vehiculo.combustible, category: "vehiculo" },
    { id: "v2", name: "Mantenimiento", amount: vehiculo.mantenimiento, category: "vehiculo" },
    { id: "v3", name: "Depreciación", amount: vehiculo.depreciacion, category: "vehiculo" },
    { id: "v4", name: "Seguros", amount: vehiculo.seguros, category: "vehiculo" },
    { id: "v5", name: "Impuestos/Tasas", amount: vehiculo.impuestos_tasas, category: "vehiculo" },
    { id: "t1", name: "Salario Chofer", amount: tripulacion.salario_chofer, category: "tripulacion" },
    { id: "t2", name: "Salario Auxiliar", amount: tripulacion.salario_auxiliar, category: "tripulacion" },
    { id: "t3", name: "Beneficios", amount: tripulacion.beneficios, category: "tripulacion" },
    { id: "s1", name: "Salario Fijo", amount: ventas.salario_fijo, category: "ventas" },
    { id: "s2", name: "Comisiones", amount: ventas.comisiones, category: "ventas" },
    { id: "s3", name: "Movilidad", amount: ventas.movilidad, category: "ventas" },
  ];

  return calculateFromExpenses({ expenses, operacion });
}

// ── What-If Scenarios ─────────────────────────────────────────────────────────

export function calculateWhatIfFromExpenses(
  baseInputs: DynamicLogisticsInputs,
  overrides: Partial<{
    gasto_vehiculo_delta_pct: number;
    efectividad_override: number;
    margen_override: number;
    pedidos_override: number;
    dias_override: number;
  }>
): WhatIfScenario {
  const baseResults = calculateFromExpenses(baseInputs);

  const modified: DynamicLogisticsInputs = JSON.parse(JSON.stringify(baseInputs));
  const parts: string[] = [];

  if (overrides.gasto_vehiculo_delta_pct !== undefined) {
    modified.expenses = modified.expenses.map((e) =>
      e.category === "vehiculo"
        ? { ...e, amount: e.amount * (1 + overrides.gasto_vehiculo_delta_pct! / 100) }
        : e
    );
    parts.push(`Vehículo ${overrides.gasto_vehiculo_delta_pct > 0 ? "+" : ""}${overrides.gasto_vehiculo_delta_pct}%`);
  }

  if (overrides.efectividad_override !== undefined) {
    modified.operacion.efectividad_reparto_pct = overrides.efectividad_override;
    parts.push(`Efectividad ${overrides.efectividad_override}%`);
  }

  if (overrides.margen_override !== undefined) {
    modified.operacion.margen_contribucion_pct = overrides.margen_override;
    parts.push(`Margen ${overrides.margen_override}%`);
  }

  if (overrides.pedidos_override !== undefined) {
    modified.operacion.pedidos_programados_diarios = overrides.pedidos_override;
    parts.push(`${overrides.pedidos_override} pedidos/día`);
  }

  if (overrides.dias_override !== undefined) {
    modified.operacion.dias_laborales = overrides.dias_override;
    parts.push(`${overrides.dias_override} días`);
  }

  const results = calculateFromExpenses(modified);

  const delta_drop_size_pct =
    baseResults.drop_size_minimo > 0
      ? ((results.drop_size_minimo - baseResults.drop_size_minimo) / baseResults.drop_size_minimo) * 100
      : 0;

  const delta_pe_pct =
    baseResults.punto_equilibrio_mensual > 0
      ? ((results.punto_equilibrio_mensual - baseResults.punto_equilibrio_mensual) / baseResults.punto_equilibrio_mensual) * 100
      : 0;

  return {
    label: parts.join(" | ") || "Sin cambios",
    results,
    delta_drop_size_pct,
    delta_pe_pct,
  };
}

/** Legacy what-if for static inputs */
export function calculateWhatIf(
  baseInputs: LogisticsInputs,
  overrides: Partial<{
    combustible_delta_pct: number;
    efectividad_override: number;
    margen_override: number;
    pedidos_override: number;
    dias_override: number;
  }>
): WhatIfScenario {
  const baseResults = calculateLogistics(baseInputs);

  const modified: LogisticsInputs = JSON.parse(JSON.stringify(baseInputs));

  const parts: string[] = [];

  if (overrides.combustible_delta_pct !== undefined) {
    modified.vehiculo.combustible =
      baseInputs.vehiculo.combustible * (1 + overrides.combustible_delta_pct / 100);
    parts.push(`Combustible ${overrides.combustible_delta_pct > 0 ? "+" : ""}${overrides.combustible_delta_pct}%`);
  }

  if (overrides.efectividad_override !== undefined) {
    modified.operacion.efectividad_reparto_pct = overrides.efectividad_override;
    parts.push(`Efectividad ${overrides.efectividad_override}%`);
  }

  if (overrides.margen_override !== undefined) {
    modified.operacion.margen_contribucion_pct = overrides.margen_override;
    parts.push(`Margen ${overrides.margen_override}%`);
  }

  if (overrides.pedidos_override !== undefined) {
    modified.operacion.pedidos_programados_diarios = overrides.pedidos_override;
    parts.push(`${overrides.pedidos_override} pedidos/día`);
  }

  if (overrides.dias_override !== undefined) {
    modified.operacion.dias_laborales = overrides.dias_override;
    parts.push(`${overrides.dias_override} días`);
  }

  const results = calculateLogistics(modified);

  const delta_drop_size_pct =
    baseResults.drop_size_minimo > 0
      ? ((results.drop_size_minimo - baseResults.drop_size_minimo) / baseResults.drop_size_minimo) * 100
      : 0;

  const delta_pe_pct =
    baseResults.punto_equilibrio_mensual > 0
      ? ((results.punto_equilibrio_mensual - baseResults.punto_equilibrio_mensual) / baseResults.punto_equilibrio_mensual) * 100
      : 0;

  return {
    label: parts.join(" | ") || "Sin cambios",
    results,
    delta_drop_size_pct,
    delta_pe_pct,
  };
}

// ── Sensitivity Analysis ──────────────────────────────────────────────────────

export function calculateSensitivityFromExpenses(
  baseInputs: DynamicLogisticsInputs,
  variable: "vehiculo" | "efectividad" | "margen" | "pedidos" | "iva" | "zonas" | "dias",
  range: number[]
): SensitivityPoint[] {
  return range.map((pct) => {
    const modified: DynamicLogisticsInputs = JSON.parse(JSON.stringify(baseInputs));

    switch (variable) {
      case "vehiculo":
        modified.expenses = modified.expenses.map((e) => ({
          ...e, amount: e.amount * (1 + pct / 100),
        }));
        break;
      case "efectividad":
        modified.operacion.efectividad_reparto_pct =
          baseInputs.operacion.efectividad_reparto_pct * (1 + pct / 100);
        break;
      case "margen":
        modified.operacion.margen_contribucion_pct =
          baseInputs.operacion.margen_contribucion_pct * (1 + pct / 100);
        break;
      case "pedidos":
        modified.operacion.pedidos_programados_diarios =
          Math.round(baseInputs.operacion.pedidos_programados_diarios * (1 + pct / 100));
        break;
      case "iva":
        modified.operacion.tasa_iva_pct =
          baseInputs.operacion.tasa_iva_pct * (1 + pct / 100);
        break;
      case "zonas":
        modified.operacion.zonas_visitadas =
          Math.max(1, Math.round(baseInputs.operacion.zonas_visitadas * (1 + pct / 100)));
        break;
      case "dias":
        modified.operacion.dias_laborales =
          Math.max(1, Math.round(baseInputs.operacion.dias_laborales * (1 + pct / 100)));
        break;
    }

    const results = calculateFromExpenses(modified);
    return {
      variable,
      variacion_pct: pct,
      drop_size: results.drop_size_minimo,
      punto_equilibrio: results.punto_equilibrio_mensual,
    };
  });
}

export function calculateSensitivity(
  baseInputs: LogisticsInputs,
  variable: "combustible" | "efectividad" | "margen" | "pedidos",
  range: number[] // e.g. [-20, -10, 0, 10, 20]
): SensitivityPoint[] {
  return range.map((pct) => {
    const modified: LogisticsInputs = JSON.parse(JSON.stringify(baseInputs));

    switch (variable) {
      case "combustible":
        modified.vehiculo.combustible = baseInputs.vehiculo.combustible * (1 + pct / 100);
        break;
      case "efectividad":
        modified.operacion.efectividad_reparto_pct =
          baseInputs.operacion.efectividad_reparto_pct * (1 + pct / 100);
        break;
      case "margen":
        modified.operacion.margen_contribucion_pct =
          baseInputs.operacion.margen_contribucion_pct * (1 + pct / 100);
        break;
      case "pedidos":
        modified.operacion.pedidos_programados_diarios =
          Math.round(baseInputs.operacion.pedidos_programados_diarios * (1 + pct / 100));
        break;
    }

    const results = calculateLogistics(modified);
    return {
      variable,
      variacion_pct: pct,
      drop_size: results.drop_size_minimo,
      punto_equilibrio: results.punto_equilibrio_mensual,
    };
  });
}

// ── Break-Even Chart Data ─────────────────────────────────────────────────────

export interface BreakEvenPoint {
  ventas: number;
  ingresos: number;
  costos_totales: number;
  costos_fijos: number;
}

export function generateBreakEvenData(results: LogisticsResults, operacion: OperationDrivers): BreakEvenPoint[] {
  const costos_fijos = results.gasto_total_mensual;
  const margen = operacion.margen_contribucion_pct / 100;
  const pe = results.punto_equilibrio_mensual;

  // Generate points from 0 to 2x PE
  const maxVentas = pe * 2 || 100000;
  const step = maxVentas / 20;
  const points: BreakEvenPoint[] = [];

  if (step <= 0) return points;

  for (let ventas = 0; ventas <= maxVentas; ventas += step) {
    points.push({
      ventas: Math.round(ventas),
      ingresos: Math.round(ventas),
      costos_totales: Math.round(costos_fijos + ventas * (1 - margen)),
      costos_fijos: Math.round(costos_fijos),
    });
  }

  return points;
}

// ── Cost Distribution ─────────────────────────────────────────────────────────

export interface CostSlice {
  name: string;
  value: number;
  color: string;
}

const KNOWN_CATEGORY_COLORS: Record<string, string[]> = {
  vehiculo: ["#ef4444", "#f97316", "#f59e0b", "#84cc16", "#22c55e", "#10b981", "#059669"],
  tripulacion: ["#06b6d4", "#3b82f6", "#8b5cf6", "#6366f1", "#4f46e5"],
  ventas: ["#d946ef", "#ec4899", "#f43f5e", "#e11d48", "#be123c"],
  otro: ["#78716c", "#a8a29e", "#d6d3d1", "#57534e", "#44403c"],
};
const FALLBACK_COLORS = ["#f59e0b", "#10b981", "#6366f1", "#ec4899", "#14b8a6", "#f97316", "#8b5cf6"];

export function getCostDistributionFromExpenses(expenses: ExpenseItem[]): CostSlice[] {
  const categoryCounters: Record<string, number> = {};

  return expenses
    .filter((e) => e.amount > 0)
    .map((e) => {
      const cat = e.category || "otro";
      const idx = categoryCounters[cat] || 0;
      categoryCounters[cat] = idx + 1;
      const colors = KNOWN_CATEGORY_COLORS[cat] || FALLBACK_COLORS;
      return {
        name: e.name,
        value: e.amount,
        color: colors[idx % colors.length],
      };
    });
}

export function getCostDistribution(inputs: LogisticsInputs): CostSlice[] {
  return [
    { name: "Combustible", value: inputs.vehiculo.combustible, color: "#ef4444" },
    { name: "Mantenimiento", value: inputs.vehiculo.mantenimiento, color: "#f97316" },
    { name: "Depreciación", value: inputs.vehiculo.depreciacion, color: "#f59e0b" },
    { name: "Seguros", value: inputs.vehiculo.seguros, color: "#84cc16" },
    { name: "Impuestos/Tasas", value: inputs.vehiculo.impuestos_tasas, color: "#22c55e" },
    { name: "Chofer", value: inputs.tripulacion.salario_chofer, color: "#06b6d4" },
    { name: "Auxiliar", value: inputs.tripulacion.salario_auxiliar, color: "#3b82f6" },
    { name: "Beneficios Trip.", value: inputs.tripulacion.beneficios, color: "#8b5cf6" },
    { name: "Salario Ventas", value: inputs.ventas.salario_fijo, color: "#d946ef" },
    { name: "Comisiones", value: inputs.ventas.comisiones, color: "#ec4899" },
    { name: "Movilidad", value: inputs.ventas.movilidad, color: "#f43f5e" },
  ].filter((s) => s.value > 0);
}

// ── Formatting Helpers ────────────────────────────────────────────────────────

export function fmtCurrency(n: number, symbol = "$"): string {
  return `${symbol} ${n.toLocaleString("es-BO", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function fmtNumber(n: number, decimals = 1): string {
  return n.toLocaleString("es-BO", { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}
