import * as XLSX from "xlsx";

// ── Template Catalog ────────────────────────────────────────────────────────────

export type TemplateId =
  | "T1" | "T2" | "T3" | "T4" | "T5" | "T6" | "T7" | "T8";

export interface TemplateColumn {
  key: string;
  label: string;
  type: "string" | "number" | "date";
  required: boolean;
  example: string;
  comment: string;
}

export interface TemplateDef {
  id: TemplateId;
  name: string;
  description: string;
  required: boolean;
  enablesGamas: ("A" | "B" | "C")[];
  kpiLabels: string[];
  columns: TemplateColumn[];
}

export const TEMPLATE_CATALOG: Record<TemplateId, TemplateDef> = {
  T1: {
    id: "T1", name: "Core Transaccional", required: true,
    description: "Base obligatoria con columnas opcionales de clientes, hora, región y precios. Habilita todos los indicadores.",
    enablesGamas: ["A", "B", "C"],
    kpiLabels: ["AOV", "UPT", "Pareto", "MoM", "Margen Bruto", "Clasificación ABC", "CRR", "LTV", "Índice de Descuento", "Venta por Región", "Stockout"],
    columns: [
      { key: "id_transaccion", label: "ID Transacción", type: "string", required: true, example: "FAC-001", comment: "Identificador único de la transacción" },
      { key: "fecha", label: "Fecha", type: "date", required: true, example: "2024-01-15", comment: "Fecha de la transacción en formato YYYY-MM-DD" },
      { key: "sku_id", label: "SKU ID", type: "string", required: true, example: "SKU-001", comment: "Código único del producto" },
      { key: "nombre_producto", label: "Nombre del Producto", type: "string", required: true, example: "Producto A", comment: "Nombre descriptivo del producto" },
      { key: "categoria", label: "Categoría", type: "string", required: true, example: "Electrónica", comment: "Categoría o línea de producto" },
      { key: "cantidad", label: "Cantidad", type: "number", required: true, example: "5", comment: "Unidades vendidas (entero positivo)" },
      { key: "precio_unitario", label: "Precio Unitario", type: "number", required: true, example: "150.00", comment: "Precio de venta por unidad" },
      { key: "costo_unitario", label: "Costo Unitario", type: "number", required: false, example: "80.00", comment: "OPCIONAL — Costo del producto por unidad. Habilita Gama B (financieros)" },
      { key: "id_cliente", label: "ID Cliente", type: "string", required: false, example: "CLI-001", comment: "OPCIONAL — Identificador único del cliente. Habilita CRR, LTV, Market Basket" },
      { key: "hora", label: "Hora", type: "string", required: false, example: "14:30", comment: "OPCIONAL — Hora de la transacción (HH:MM). Habilita Heatmap por Hora/Día" },
      { key: "zona", label: "Zona", type: "string", required: false, example: "Norte", comment: "OPCIONAL — Zona o región. Habilita análisis de Ventas por Ubicación" },
      { key: "region", label: "Región", type: "string", required: false, example: "Cochabamba", comment: "OPCIONAL — Región geográfica (alternativa a zona)" },
      { key: "precio_lista", label: "Precio de Lista", type: "number", required: false, example: "180.00", comment: "OPCIONAL — Precio de catálogo sin descuento. Habilita Índice de Descuento y Waterfall" },
      { key: "descuento_aplicado", label: "Descuento Aplicado", type: "number", required: false, example: "30.00", comment: "OPCIONAL — Monto total de descuento en esta línea" },
    ],
  },
  T2: {
    id: "T2", name: "Devoluciones", required: false,
    description: "Registra unidades devueltas por línea de transacción. Habilita análisis de devoluciones y Margen Neto.",
    enablesGamas: ["A", "B"],
    kpiLabels: ["Ratio de Devoluciones", "Margen de Contribución Neto"],
    columns: [
      { key: "id_transaccion", label: "ID Transacción", type: "string", required: true, example: "FAC-001", comment: "Debe coincidir con el ID de T1" },
      { key: "sku_id", label: "SKU ID", type: "string", required: true, example: "SKU-001", comment: "Código del producto devuelto" },
      { key: "unidades_devueltas", label: "Unidades Devueltas", type: "number", required: true, example: "2", comment: "Cantidad de unidades devueltas en esta línea" },
    ],
  },
  T3: {
    id: "T3", name: "Inventario", required: false,
    description: "Stock actual y métricas por SKU. Habilita Rotación, DOH, Sell-Through, GMROI y Salud del Inventario.",
    enablesGamas: ["B", "C"],
    kpiLabels: ["Rotación de Inventario", "DOH", "Sell-Through Rate", "Tasa de Quiebre", "Días de Cobertura", "GMROI", "Antigüedad de Inventario"],
    columns: [
      { key: "sku_id", label: "SKU ID", type: "string", required: true, example: "SKU-001", comment: "Código del producto (clave de unión con T1)" },
      { key: "stock_actual", label: "Stock Actual", type: "number", required: true, example: "150", comment: "Unidades en inventario al cierre del período" },
      { key: "stock_seguridad", label: "Stock de Seguridad", type: "number", required: false, example: "30", comment: "Stock mínimo de seguridad definido" },
      { key: "stock_promedio", label: "Stock Promedio", type: "number", required: false, example: "100", comment: "Stock promedio durante el período" },
      { key: "unidades_recibidas", label: "Unidades Recibidas", type: "number", required: false, example: "500", comment: "Unidades recibidas al inicio del período (para Sell-Through)" },
      { key: "dias_sin_stock", label: "Días Sin Stock", type: "number", required: false, example: "5", comment: "Días en que el SKU tuvo stock = 0" },
      { key: "valor_stock_muerto", label: "Valor Stock Muerto", type: "number", required: false, example: "1200.00", comment: "Valor a costo de stock sin movimiento > 180 días" },
    ],
  },
  T4: {
    id: "T4", name: "Logística y Fulfillment", required: false,
    description: "Pedidos y fechas de recepción por SKU. Habilita Fill Rate y Lead Time de Venta.",
    enablesGamas: ["C"],
    kpiLabels: ["Fill Rate", "Lead Time de Venta"],
    columns: [
      { key: "sku_id", label: "SKU ID", type: "string", required: true, example: "SKU-001", comment: "Código del producto" },
      { key: "pedidos_solicitados", label: "Pedidos Solicitados", type: "number", required: false, example: "100", comment: "Total de pedidos recibidos en el período" },
      { key: "pedidos_surtidos", label: "Pedidos Surtidos", type: "number", required: false, example: "95", comment: "Pedidos entregados completos" },
      { key: "fecha_recepcion", label: "Fecha Recepción", type: "date", required: false, example: "2024-01-01", comment: "Fecha en que el SKU llegó al almacén" },
      { key: "fecha_primera_venta", label: "Fecha Primera Venta", type: "date", required: false, example: "2024-01-05", comment: "Fecha de la primera venta del SKU en el período" },
    ],
  },
  T5: {
    id: "T5", name: "Marketing", required: false,
    description: "Ventas y gasto por campaña. Habilita el ROAS Estimado por campaña.",
    enablesGamas: ["B"],
    kpiLabels: ["ROAS Estimado"],
    columns: [
      { key: "campaña", label: "Campaña", type: "string", required: true, example: "Campaña_Verano_2024", comment: "Nombre o código de la campaña" },
      { key: "ventas_campana", label: "Ventas de Campaña", type: "number", required: true, example: "50000.00", comment: "Ingresos atribuibles a esta campaña" },
      { key: "gasto_marketing", label: "Gasto Marketing", type: "number", required: true, example: "12000.00", comment: "Inversión total en esta campaña" },
    ],
  },
  T6: {
    id: "T6", name: "Costos Históricos", required: false,
    description: "Costo unitario del período anterior por SKU. Habilita la Variación de Costo Unitario.",
    enablesGamas: ["B"],
    kpiLabels: ["Variación de Costo Unitario (%)"],
    columns: [
      { key: "sku_id", label: "SKU ID", type: "string", required: true, example: "SKU-001", comment: "Código del producto (clave de unión)" },
      { key: "costo_unitario_periodo_ant", label: "Costo Unit. Período Anterior", type: "number", required: true, example: "75.00", comment: "Costo por unidad del período anterior" },
    ],
  },
  T7: {
    id: "T7", name: "Pronóstico", required: false,
    description: "Venta proyectada por SKU. Habilita la Exactitud de Pronóstico (MAPE).",
    enablesGamas: ["C"],
    kpiLabels: ["Exactitud de Pronóstico (MAPE)"],
    columns: [
      { key: "sku_id", label: "SKU ID", type: "string", required: true, example: "SKU-001", comment: "Código del producto" },
      { key: "venta_proyectada", label: "Venta Proyectada", type: "number", required: true, example: "1000.00", comment: "Monto proyectado para el período" },
    ],
  },
  T8: {
    id: "T8", name: "Ubicación Física", required: false,
    description: "Metros cuadrados por SKU o ubicación. Habilita Velocidad de Salida normalizada por m².",
    enablesGamas: ["C"],
    kpiLabels: ["Velocidad de Salida (u/día/m²)"],
    columns: [
      { key: "sku_id", label: "SKU ID", type: "string", required: false, example: "SKU-001", comment: "Código del producto (usar si asignación es por SKU)" },
      { key: "id_ubicacion", label: "ID Ubicación", type: "string", required: false, example: "PASILLO-A1", comment: "Identificador de la ubicación física" },
      { key: "metros_cuadrados", label: "Metros Cuadrados", type: "number", required: true, example: "4.5", comment: "Superficie asignada al SKU o ubicación en m²" },
    ],
  },
};

// ── Row Interfaces ──────────────────────────────────────────────────────────────

export interface TransactionRow {
  id_transaccion: string;
  fecha: Date;
  sku_id: string;
  nombre_producto: string;
  categoria: string;
  cantidad: number;
  precio_unitario: number;
  costo_unitario?: number;
  // Optional columns (previously T2, T3, T5, T6)
  id_cliente?: string;
  hora?: number; // 0-23
  zona?: string;
  region?: string;
  precio_lista?: number;
  descuento_aplicado?: number;
}

export interface ReturnRow {
  id_transaccion: string;
  sku_id: string;
  unidades_devueltas: number;
}

export interface InventoryRow {
  sku_id: string;
  stock_actual: number;
  stock_seguridad?: number;
  stock_promedio?: number;
  unidades_recibidas?: number;
  dias_sin_stock?: number;
  valor_stock_muerto?: number;
}

export interface LogisticsRow {
  sku_id: string;
  pedidos_solicitados?: number;
  pedidos_surtidos?: number;
  fecha_recepcion?: Date;
  fecha_primera_venta?: Date;
}

export interface MarketingRow {
  campaña: string;
  ventas_campana: number;
  gasto_marketing: number;
}

export interface HistoricalCostRow {
  sku_id: string;
  costo_unitario_periodo_ant: number;
}

export interface ForecastRow {
  sku_id: string;
  venta_proyectada: number;
}

export interface LocationRow {
  sku_id?: string;
  id_ubicacion?: string;
  metros_cuadrados: number;
}

export interface ManualInputs {
  costos_fijos?: number;
  objetivo_ventas?: number;
  gasto_marketing_total?: number;
}

// ── Session Data ────────────────────────────────────────────────────────────────

export interface SessionData {
  t1: TransactionRow[];
  t2?: ReturnRow[];
  t3?: InventoryRow[];
  t4?: LogisticsRow[];
  t5?: MarketingRow[];
  t6?: HistoricalCostRow[];
  t7?: ForecastRow[];
  t8?: LocationRow[];
  manualInputs: ManualInputs;
  loadedTemplates: Set<TemplateId>;
}

// ── KPI Types ───────────────────────────────────────────────────────────────────

export type AlertLevel = "green" | "yellow" | "red";

export interface KPIResult {
  id: string;
  name: string;
  value: number;
  formatted: string;
  unit: string;
  alert: AlertLevel;
  gama: "A" | "B" | "C";
  description: string;
  requiredTemplates: TemplateId[];
  available: boolean;
  detail?: Record<string, unknown>[];
}

// ── Chart data types ────────────────────────────────────────────────────────────

export interface ABCItem {
  sku_id: string;
  name: string;
  revenue: number;
  class: "A" | "B" | "C";
  pct_rev: number;
  pct_accumulated: number;
}

export interface BubbleItem {
  category: string;
  revenue: number;
  marginPct: number;
  contribution: number;
}

export interface WaterfallItem {
  label: string;
  value: number;
  type: "positive" | "negative" | "total";
}

export interface AgingBucket {
  bucket: string;
  value: number;
  pct: number;
}

export interface RegionItem {
  region: string;
  revenue: number;
  pct: number;
}

export interface MarketingRoasItem {
  campaña: string;
  ventas: number;
  gasto: number;
  roas: number;
}

export interface BIExpressResult {
  kpis: KPIResult[];
  loadedTemplates: Set<TemplateId>;
  hasCostData: boolean;
  totalRows: number;
  cleanRows: number;
  // Chart data — core (T1)
  monthlyData: { month: string; ventas: number; tickets: number }[];
  topProducts: { name: string; revenue: number }[];
  categoryBreakdown: { category: string; revenue: number; pct: number }[];
  abcDetail: ABCItem[];
  marginBubbleData: BubbleItem[];
  contributionDetail: { sku: string; nombre: string; contribucion: number }[];
  stockoutDetail: { sku: string; nombre: string }[];
  // Chart data — extended (require additional templates)
  customerSegmentation: { label: string; value: number }[] | null;  // T2
  regionData: RegionItem[] | null;                                   // T5
  waterfallData: WaterfallItem[] | null;                             // T6+T2
  inventoryAgingData: AgingBucket[] | null;                          // T3
  marketingData: MarketingRoasItem[] | null;                         // T5
}

// ── Thresholds ──────────────────────────────────────────────────────────────────

interface Threshold {
  green: [number, number];
  yellow: [number, number];
}

const THRESHOLDS: Record<string, Threshold> = {
  margin: { green: [40, Infinity], yellow: [25, 40] },
  margin_net: { green: [30, Infinity], yellow: [15, 30] },
  pareto: { green: [0, 70], yellow: [70, 85] },
  growth: { green: [5, Infinity], yellow: [0, 5] },
  rotation: { green: [6, Infinity], yellow: [3, 6] },
  doh: { green: [0, 60], yellow: [60, 90] },
  gmroi: { green: [1.5, Infinity], yellow: [1, 1.5] },
  discount_index: { green: [0, 5], yellow: [5, 15] },
  crr: { green: [60, Infinity], yellow: [40, 60] },
  sell_through: { green: [80, Infinity], yellow: [50, 80] },
  stock_break: { green: [0, 5], yellow: [5, 15] },
  return_rate: { green: [0, 2], yellow: [2, 5] },
  ltv_ratio: { green: [3, Infinity], yellow: [1.5, 3] },
  acquisition: { green: [20, Infinity], yellow: [10, 20] },
  days_coverage: { green: [15, 45], yellow: [7, 60] },
  churn_sku: { green: [0, 10], yellow: [10, 25] },
};

function evaluateAlert(value: number, threshold: Threshold, lowerIsBetter = false): AlertLevel {
  if (lowerIsBetter) {
    if (value <= threshold.green[1]) return "green";
    if (value <= threshold.yellow[1]) return "yellow";
    return "red";
  }
  if (value >= threshold.green[0] && value <= threshold.green[1]) return "green";
  if (value >= threshold.yellow[0] && value <= threshold.yellow[1]) return "yellow";
  return "red";
}

// ── Parse Result ────────────────────────────────────────────────────────────────

export interface ParseTemplateResult<T> {
  rows: T[];
  errors: string[];
}

// ── Helpers ─────────────────────────────────────────────────────────────────────

function fmt(n: number, decimals = 2): string {
  return n.toLocaleString("es-BO", { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}

function pct(n: number): string {
  return fmt(n, 1) + "%";
}

function toNum(v: unknown): number {
  return isNaN(Number(v)) ? 0 : Number(v);
}

function readSheet(buffer: ArrayBuffer): Record<string, unknown>[] {
  const wb = XLSX.read(buffer, { type: "array", cellDates: true });
  const sheet = wb.Sheets[wb.SheetNames[0]];
  return XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet);
}

// ── Parse Functions ─────────────────────────────────────────────────────────────

export function parseT1(buffer: ArrayBuffer): ParseTemplateResult<TransactionRow> & { hasCostData: boolean } {
  const raw = readSheet(buffer);
  const errors: string[] = [];
  const rows: TransactionRow[] = [];
  let hasCostData = false;

  if (raw.length > 0) {
    hasCostData = "costo_unitario" in raw[0] && raw[0].costo_unitario != null;
  }

  const seenIds = new Set<string>();

  for (let i = 0; i < raw.length; i++) {
    const r = raw[i];
    const ln = i + 2;

    const id = String(r.id_transaccion ?? "").trim();
    if (!id) { errors.push(`Fila ${ln}: id_transaccion vacío, omitida.`); continue; }
    if (seenIds.has(id)) { errors.push(`Fila ${ln}: id_transaccion duplicado (${id}), omitida.`); continue; }
    seenIds.add(id);

    const fecha = r.fecha instanceof Date ? r.fecha : new Date(String(r.fecha));
    if (isNaN(fecha.getTime())) { errors.push(`Fila ${ln}: fecha inválida, omitida.`); continue; }

    const cantidad = Number(r.cantidad);
    const precio_unitario = Number(r.precio_unitario);

    if (!r.sku_id || !r.nombre_producto || !r.categoria || isNaN(cantidad) || cantidad <= 0 || isNaN(precio_unitario) || precio_unitario < 0) {
      errors.push(`Fila ${ln}: datos incompletos o inválidos, omitida.`);
      continue;
    }

    const row: TransactionRow = {
      id_transaccion: id,
      fecha,
      sku_id: String(r.sku_id).trim(),
      nombre_producto: String(r.nombre_producto).trim(),
      categoria: String(r.categoria).trim(),
      cantidad,
      precio_unitario,
    };

    if (hasCostData && r.costo_unitario != null && !isNaN(Number(r.costo_unitario))) {
      row.costo_unitario = Number(r.costo_unitario);
    }

    // Optional columns
    if (r.id_cliente != null && String(r.id_cliente).trim()) {
      row.id_cliente = String(r.id_cliente).trim();
    }
    if (r.hora != null) {
      const horaStr = String(r.hora).trim();
      const horaNum = parseInt(horaStr.split(":")[0], 10);
      if (!isNaN(horaNum) && horaNum >= 0 && horaNum <= 23) row.hora = horaNum;
    }
    if (r.zona != null && String(r.zona).trim()) row.zona = String(r.zona).trim();
    if (r.region != null && String(r.region).trim()) row.region = String(r.region).trim();
    if (r.precio_lista != null && !isNaN(Number(r.precio_lista))) row.precio_lista = Number(r.precio_lista);
    if (r.descuento_aplicado != null && !isNaN(Number(r.descuento_aplicado))) row.descuento_aplicado = Number(r.descuento_aplicado);

    rows.push(row);
  }

  if (!hasCostData) errors.push("⚠ Sin columna 'costo_unitario': indicadores financieros (Gama B) desactivados.");

  return { rows, hasCostData, errors };
}

export function parseT2(buffer: ArrayBuffer): ParseTemplateResult<ReturnRow> {
  const raw = readSheet(buffer);
  const errors: string[] = [];
  const rows: ReturnRow[] = [];

  for (let i = 0; i < raw.length; i++) {
    const r = raw[i];
    const ln = i + 2;
    const id = String(r.id_transaccion ?? "").trim();
    const sku = String(r.sku_id ?? "").trim();
    const devueltas = Number(r.unidades_devueltas);
    if (!id || !sku || isNaN(devueltas) || devueltas < 0) { errors.push(`Fila ${ln}: datos inválidos, omitida.`); continue; }
    rows.push({ id_transaccion: id, sku_id: sku, unidades_devueltas: devueltas });
  }

  return { rows, errors };
}

export function parseT3(buffer: ArrayBuffer): ParseTemplateResult<InventoryRow> {
  const raw = readSheet(buffer);
  const errors: string[] = [];
  const rows: InventoryRow[] = [];
  const seenSkus = new Set<string>();

  for (let i = 0; i < raw.length; i++) {
    const r = raw[i];
    const ln = i + 2;
    const sku = String(r.sku_id ?? "").trim();
    const stock_actual = Number(r.stock_actual);
    if (!sku || isNaN(stock_actual) || stock_actual < 0) { errors.push(`Fila ${ln}: sku_id o stock_actual inválido, omitida.`); continue; }
    if (seenSkus.has(sku)) { errors.push(`Fila ${ln}: sku_id duplicado (${sku}), omitida.`); continue; }
    seenSkus.add(sku);

    rows.push({
      sku_id: sku,
      stock_actual,
      stock_seguridad: r.stock_seguridad != null ? toNum(r.stock_seguridad) : undefined,
      stock_promedio: r.stock_promedio != null ? toNum(r.stock_promedio) : undefined,
      unidades_recibidas: r.unidades_recibidas != null ? toNum(r.unidades_recibidas) : undefined,
      dias_sin_stock: r.dias_sin_stock != null ? toNum(r.dias_sin_stock) : undefined,
      valor_stock_muerto: r.valor_stock_muerto != null ? toNum(r.valor_stock_muerto) : undefined,
    });
  }

  return { rows, errors };
}

export function parseT4(buffer: ArrayBuffer): ParseTemplateResult<LogisticsRow> {
  const raw = readSheet(buffer);
  const errors: string[] = [];
  const rows: LogisticsRow[] = [];

  for (let i = 0; i < raw.length; i++) {
    const r = raw[i];
    const ln = i + 2;
    const sku = String(r.sku_id ?? "").trim();
    if (!sku) { errors.push(`Fila ${ln}: sku_id vacío, omitida.`); continue; }
    const fr = r.fecha_recepcion instanceof Date ? r.fecha_recepcion : r.fecha_recepcion ? new Date(String(r.fecha_recepcion)) : undefined;
    const fv = r.fecha_primera_venta instanceof Date ? r.fecha_primera_venta : r.fecha_primera_venta ? new Date(String(r.fecha_primera_venta)) : undefined;
    rows.push({
      sku_id: sku,
      pedidos_solicitados: r.pedidos_solicitados != null ? toNum(r.pedidos_solicitados) : undefined,
      pedidos_surtidos: r.pedidos_surtidos != null ? toNum(r.pedidos_surtidos) : undefined,
      fecha_recepcion: fr && !isNaN(fr.getTime()) ? fr : undefined,
      fecha_primera_venta: fv && !isNaN(fv.getTime()) ? fv : undefined,
    });
  }

  return { rows, errors };
}

export function parseT5(buffer: ArrayBuffer): ParseTemplateResult<MarketingRow> {
  const raw = readSheet(buffer);
  const errors: string[] = [];
  const rows: MarketingRow[] = [];

  for (let i = 0; i < raw.length; i++) {
    const r = raw[i];
    const ln = i + 2;
    const campaña = String(r.campaña ?? r["campaна"] ?? "").trim();
    const ventas = Number(r.ventas_campana);
    const gasto = Number(r.gasto_marketing);
    if (!campaña || isNaN(ventas) || isNaN(gasto)) { errors.push(`Fila ${ln}: datos inválidos, omitida.`); continue; }
    rows.push({ campaña, ventas_campana: ventas, gasto_marketing: gasto });
  }

  return { rows, errors };
}

export function parseT6(buffer: ArrayBuffer): ParseTemplateResult<HistoricalCostRow> {
  const raw = readSheet(buffer);
  const errors: string[] = [];
  const rows: HistoricalCostRow[] = [];

  for (let i = 0; i < raw.length; i++) {
    const r = raw[i];
    const ln = i + 2;
    const sku = String(r.sku_id ?? "").trim();
    const costo = Number(r.costo_unitario_periodo_ant);
    if (!sku || isNaN(costo)) { errors.push(`Fila ${ln}: datos inválidos, omitida.`); continue; }
    rows.push({ sku_id: sku, costo_unitario_periodo_ant: costo });
  }

  return { rows, errors };
}

export function parseT7(buffer: ArrayBuffer): ParseTemplateResult<ForecastRow> {
  const raw = readSheet(buffer);
  const errors: string[] = [];
  const rows: ForecastRow[] = [];

  for (let i = 0; i < raw.length; i++) {
    const r = raw[i];
    const ln = i + 2;
    const sku = String(r.sku_id ?? "").trim();
    const proyectada = Number(r.venta_proyectada);
    if (!sku || isNaN(proyectada)) { errors.push(`Fila ${ln}: datos inválidos, omitida.`); continue; }
    rows.push({ sku_id: sku, venta_proyectada: proyectada });
  }

  return { rows, errors };
}

export function parseT8(buffer: ArrayBuffer): ParseTemplateResult<LocationRow> {
  const raw = readSheet(buffer);
  const errors: string[] = [];
  const rows: LocationRow[] = [];

  for (let i = 0; i < raw.length; i++) {
    const r = raw[i];
    const ln = i + 2;
    const m2 = Number(r.metros_cuadrados);
    if (isNaN(m2) || m2 <= 0) { errors.push(`Fila ${ln}: metros_cuadrados inválido, omitida.`); continue; }
    rows.push({
      sku_id: r.sku_id ? String(r.sku_id).trim() : undefined,
      id_ubicacion: r.id_ubicacion ? String(r.id_ubicacion).trim() : undefined,
      metros_cuadrados: m2,
    });
  }

  return { rows, errors };
}

// ── KPI Calculation Engine ──────────────────────────────────────────────────────

export function calculateKPIs(session: SessionData): BIExpressResult {
  const { t1, t2, t3, t5, manualInputs, loadedTemplates } = session;
  const hasCostData = t1.length > 0 && t1[0].costo_unitario !== undefined;

  const has = (id: TemplateId) => loadedTemplates.has(id);

  const hasCustomerData = t1.some(r => r.id_cliente !== undefined);
  const hasGeoData = t1.some(r => r.zona !== undefined || r.region !== undefined);
  const hasPricingData = t1.some(r => r.precio_lista !== undefined);

  function kpi(
    id: string,
    name: string,
    value: number,
    formatted: string,
    unit: string,
    alert: AlertLevel,
    gama: "A" | "B" | "C",
    description: string,
    requiredTemplates: TemplateId[],
    detail?: Record<string, unknown>[],
  ): KPIResult {
    return { id, name, value, formatted, unit, alert, gama, description, requiredTemplates, available: true, detail };
  }

  function unavailableKPI(
    id: string,
    name: string,
    gama: "A" | "B" | "C",
    description: string,
    requiredTemplates: TemplateId[],
  ): KPIResult {
    return { id, name, value: 0, formatted: "—", unit: "", alert: "red", gama, description, requiredTemplates, available: false };
  }

  const kpis: KPIResult[] = [];

  // ══════════════════════════════════════════════════════════════
  // AGGREGATES — T1
  // ══════════════════════════════════════════════════════════════
  const uniqueInvoices = new Set(t1.map((r) => r.id_transaccion));
  const numInvoices = uniqueInvoices.size;
  const totalUnits = t1.reduce((s, r) => s + r.cantidad, 0);
  const totalRevenue = t1.reduce((s, r) => s + r.cantidad * r.precio_unitario, 0);
  const totalCost = hasCostData ? t1.reduce((s, r) => s + r.cantidad * (r.costo_unitario ?? 0), 0) : 0;

  // SKU map
  const skuMap = new Map<string, { name: string; category: string; revenue: number; cost: number; units: number }>();
  for (const r of t1) {
    const e = skuMap.get(r.sku_id) ?? { name: r.nombre_producto, category: r.categoria, revenue: 0, cost: 0, units: 0 };
    e.revenue += r.cantidad * r.precio_unitario;
    e.cost += r.cantidad * (r.costo_unitario ?? 0);
    e.units += r.cantidad;
    skuMap.set(r.sku_id, e);
  }
  const skuList = Array.from(skuMap.entries()).map(([id, d]) => ({ id, ...d })).sort((a, b) => b.revenue - a.revenue);

  // Category map
  const catMap = new Map<string, { revenue: number; cost: number; units: number }>();
  for (const r of t1) {
    const e = catMap.get(r.categoria) ?? { revenue: 0, cost: 0, units: 0 };
    e.revenue += r.cantidad * r.precio_unitario;
    e.cost += r.cantidad * (r.costo_unitario ?? 0);
    e.units += r.cantidad;
    catMap.set(r.categoria, e);
  }
  const categoryBreakdown = Array.from(catMap.entries())
    .map(([category, d]) => ({ category, revenue: d.revenue, pct: (d.revenue / totalRevenue) * 100 }))
    .sort((a, b) => b.revenue - a.revenue);

  // Monthly map
  const monthMap = new Map<string, { ventas: number; tickets: Set<string> }>();
  for (const r of t1) {
    const key = `${r.fecha.getFullYear()}-${String(r.fecha.getMonth() + 1).padStart(2, "0")}`;
    const e = monthMap.get(key) ?? { ventas: 0, tickets: new Set<string>() };
    e.ventas += r.cantidad * r.precio_unitario;
    e.tickets.add(r.id_transaccion);
    monthMap.set(key, e);
  }
  const sortedMonths = Array.from(monthMap.keys()).sort();
  const monthlyData = sortedMonths.map((m) => ({ month: m, ventas: monthMap.get(m)!.ventas, tickets: monthMap.get(m)!.tickets.size }));

  // ══════════════════════════════════════════════════════════════
  // GAMA A — Comerciales
  // ══════════════════════════════════════════════════════════════

  // A1 — Ticket Promedio (AOV)
  const aov = numInvoices > 0 ? totalRevenue / numInvoices : 0;
  kpis.push(kpi("aov", "Ticket Promedio (AOV)", aov, fmt(aov), "currency", "green", "A", "Total Ventas / Nº Facturas únicas", ["T1"]));

  // A2 — Artículos por Ticket (UPT)
  const upt = numInvoices > 0 ? totalUnits / numInvoices : 0;
  kpis.push(kpi("upt", "Artículos por Ticket (UPT)", upt, fmt(upt, 1), "units", "green", "A", "Total Unidades / Nº Facturas únicas", ["T1"]));

  // A3 — Tasa de Concentración (Pareto)
  const top20Count = Math.max(1, Math.ceil(skuList.length * 0.2));
  const top20Revenue = skuList.slice(0, top20Count).reduce((s, p) => s + p.revenue, 0);
  const paretoRate = totalRevenue > 0 ? (top20Revenue / totalRevenue) * 100 : 0;
  kpis.push(kpi("pareto", "Tasa de Concentración (Pareto)", paretoRate, pct(paretoRate), "%",
    evaluateAlert(paretoRate, THRESHOLDS.pareto, true), "A",
    "% de ingresos generado por el top 20% de SKUs", ["T1"]));

  // A4 — Venta por Categoría (top)
  if (categoryBreakdown.length > 0) {
    const topCat = categoryBreakdown[0];
    kpis.push(kpi("category_share", `Venta por Categoría (${topCat.category})`, topCat.pct, pct(topCat.pct), "%", "green", "A",
      "Participación de la categoría líder sobre ventas totales", ["T1"],
      categoryBreakdown as unknown as Record<string, unknown>[]));
  }

  // A5 — Crecimiento MoM
  if (sortedMonths.length >= 2) {
    const last = monthMap.get(sortedMonths[sortedMonths.length - 1])!.ventas;
    const prev = monthMap.get(sortedMonths[sortedMonths.length - 2])!.ventas;
    const growth = prev > 0 ? ((last / prev) - 1) * 100 : 0;
    kpis.push(kpi("growth_mom", "Crecimiento de Ventas (MoM)", growth, pct(growth), "%",
      evaluateAlert(growth, THRESHOLDS.growth), "A",
      "Variación porcentual respecto al mes anterior", ["T1"]));
  }

  // A6 — Churn Rate de Productos
  const sortedDates = t1.map((r) => r.fecha.getTime()).sort((a, b) => a - b);
  const maxDate = new Date(sortedDates[sortedDates.length - 1]);
  const sevenDaysAgo = new Date(maxDate);
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const recentSkus = new Set(t1.filter((r) => r.fecha >= sevenDaysAgo).map((r) => r.sku_id));
  const allSkuSet = new Set(t1.map((r) => r.sku_id));
  const stockoutSkus = Array.from(allSkuSet).filter((s) => !recentSkus.has(s));

  // Stockout
  kpis.push(kpi("stockout", "Posibles Stockouts", stockoutSkus.length, `${stockoutSkus.length} SKUs`, "count",
    stockoutSkus.length === 0 ? "green" : stockoutSkus.length <= 3 ? "yellow" : "red", "A",
    "SKUs con historial pero sin ventas en últimos 7 días", ["T1"],
    stockoutSkus.slice(0, 15).map((s) => ({ sku: s, nombre: skuMap.get(s)?.name ?? s }))));

  // Churn SKU
  const churnRate = allSkuSet.size > 0 ? (stockoutSkus.length / allSkuSet.size) * 100 : 0;
  kpis.push(kpi("churn_sku", "Churn Rate de Productos", churnRate, pct(churnRate), "%",
    evaluateAlert(churnRate, THRESHOLDS.churn_sku, true), "A",
    "SKUs activos período anterior con 0 ventas en período actual", ["T1"]));

  // A7 — Velocidad de Salida
  const periodDays = sortedDates.length > 1
    ? Math.max(1, Math.round((sortedDates[sortedDates.length - 1] - sortedDates[0]) / 86400000))
    : 30;
  const exitVelocity = periodDays > 0 ? totalUnits / periodDays : 0;
  kpis.push(kpi("exit_velocity", "Velocidad de Salida", exitVelocity, fmt(exitVelocity, 1) + " u/día", "rate", "green", "A",
    "Total unidades vendidas / días del período", ["T1"]));

  // A8 — Customer Retention Rate (id_cliente column)
  if (hasCustomerData) {
    // Identify first/last half of months as "periods"
    const halfIdx = Math.floor(sortedMonths.length / 2);
    const prevMonths = new Set(sortedMonths.slice(0, halfIdx));
    const currMonths = new Set(sortedMonths.slice(halfIdx));

    const prevClients = new Set<string>();
    const currClients = new Set<string>();
    for (const r of t1) {
      const key = `${r.fecha.getFullYear()}-${String(r.fecha.getMonth() + 1).padStart(2, "0")}`;
      if (!r.id_cliente) continue;
      if (prevMonths.has(key)) prevClients.add(r.id_cliente);
      if (currMonths.has(key)) currClients.add(r.id_cliente);
    }

    const retained = Array.from(currClients).filter((c) => prevClients.has(c)).length;
    const crr = prevClients.size > 0 ? (retained / prevClients.size) * 100 : 0;
    kpis.push(kpi("crr", "Customer Retention Rate (CRR)", crr, pct(crr), "%",
      evaluateAlert(crr, THRESHOLDS.crr), "A",
      "Clientes del período anterior que repitieron en el período actual", ["T1"]));

    // Tasa de Captación
    const allKnownClients = new Set<string>();
    const newClients = new Set<string>();
    for (const r of t1) {
      if (!r.id_cliente) continue;
      if (!allKnownClients.has(r.id_cliente)) newClients.add(r.id_cliente);
      allKnownClients.add(r.id_cliente);
    }
    const acquisitionRate = allKnownClients.size > 0 ? (newClients.size / allKnownClients.size) * 100 : 0;
    kpis.push(kpi("acquisition_rate", "Tasa de Captación", acquisitionRate, pct(acquisitionRate), "%",
      evaluateAlert(acquisitionRate, THRESHOLDS.acquisition), "A",
      "Clientes nuevos en el período / Total clientes históricos acumulados", ["T1"]));

    // LTV Estimado
    const uniqueClients = new Set(t1.map(r => r.id_cliente).filter(Boolean)).size;
    const months = sortedMonths.length || 1;
    const purchaseFreq = uniqueClients > 0 ? (numInvoices / uniqueClients / months) * 6 : 0;
    const ltv = aov * purchaseFreq;
    const ltvRatio = aov > 0 ? ltv / aov : 0;
    kpis.push(kpi("ltv", "LTV Estimado (6 meses)", ltv, fmt(ltv), "currency",
      evaluateAlert(ltvRatio, THRESHOLDS.ltv_ratio), "A",
      "AOV × Frecuencia de Compra Esperada (6 meses)", ["T1"]));

    // Clientes Únicos
    kpis.push(kpi("penetration", "Clientes Únicos", uniqueClients, fmt(uniqueClients, 0), "count", "green", "A",
      "Total de clientes únicos en el período (columna id_cliente)", ["T1"]));
  } else {
    kpis.push(unavailableKPI("crr", "Customer Retention Rate (CRR)", "A", "Agrega columna 'id_cliente' en T1", []));
    kpis.push(unavailableKPI("acquisition_rate", "Tasa de Captación", "A", "Agrega columna 'id_cliente' en T1", []));
    kpis.push(unavailableKPI("ltv", "LTV Estimado (6 meses)", "A", "Agrega columna 'id_cliente' en T1", []));
  }

  // A9 — Ratio de Devoluciones (T2)
  if (has("T2") && t2 && t2.length > 0) {
    const totalDevueltas = t2.reduce((s, r) => s + r.unidades_devueltas, 0);
    const returnRate = totalUnits > 0 ? (totalDevueltas / totalUnits) * 100 : 0;
    kpis.push(kpi("return_rate", "Ratio de Devoluciones", returnRate, pct(returnRate), "%",
      evaluateAlert(returnRate, THRESHOLDS.return_rate, true), "A",
      "Total Unidades Devueltas / Total Unidades Vendidas × 100", ["T1", "T2"]));
  } else {
    kpis.push(unavailableKPI("return_rate", "Ratio de Devoluciones", "A", "Requiere unidades_devueltas por transacción", ["T2"]));
  }

  // A10 — Venta por Región (zona/region columns)
  if (hasGeoData) {
    const regionMap = new Map<string, number>();
    for (const r of t1) {
      const region = r.zona ?? r.region ?? "Sin región";
      regionMap.set(region, (regionMap.get(region) ?? 0) + r.cantidad * r.precio_unitario);
    }
    const regionList = Array.from(regionMap.entries())
      .map(([region, revenue]) => ({ region, revenue, pct: (revenue / totalRevenue) * 100 }))
      .sort((a, b) => b.revenue - a.revenue);
    const topRegion = regionList[0];
    const concentrated = topRegion?.pct > 60;
    kpis.push(kpi("region_sales", `Venta por Región (${topRegion?.region ?? "—"})`, topRegion?.pct ?? 0,
      pct(topRegion?.pct ?? 0), "%", concentrated ? "yellow" : "green", "A",
      "Distribución de ventas por zona/región", ["T1"],
      regionList as unknown as Record<string, unknown>[]));
  } else {
    kpis.push(unavailableKPI("region_sales", "Venta por Ubicación/Región", "A", "Agrega columnas 'zona' o 'region' en T1", []));
  }

  // ══════════════════════════════════════════════════════════════
  // GAMA B — Financieros
  // ══════════════════════════════════════════════════════════════

  if (hasCostData) {
    const grossProfit = totalRevenue - totalCost;

    // B1 — Margen Bruto Total
    const grossMargin = totalRevenue > 0 ? (grossProfit / totalRevenue) * 100 : 0;
    kpis.push(kpi("gross_margin", "Margen Bruto Total", grossMargin, pct(grossMargin), "%",
      evaluateAlert(grossMargin, THRESHOLDS.margin), "B", "((Ventas - Costos) / Ventas) × 100", ["T1"]));

    // B2 — Contribución Marginal por SKU
    const totalContribution = t1.reduce((s, r) => s + (r.precio_unitario - (r.costo_unitario ?? 0)) * r.cantidad, 0);
    const contributionDetail = skuList.slice(0, 10).map((s) => ({ sku: s.id, nombre: s.name, contribucion: s.revenue - s.cost }));
    kpis.push(kpi("contribution", "Contribución Marginal Total", totalContribution, fmt(totalContribution), "currency",
      totalContribution > 0 ? "green" : "red", "B",
      "Σ (Precio - Costo) × Cantidad — Top 10 en detalle", ["T1"],
      contributionDetail as unknown as Record<string, unknown>[]));

    // B3 — Punto de Equilibrio (manual: costos_fijos)
    const avgPrice = totalUnits > 0 ? totalRevenue / totalUnits : 0;
    const avgCost = totalUnits > 0 ? totalCost / totalUnits : 0;
    if (manualInputs.costos_fijos && manualInputs.costos_fijos > 0 && avgPrice > avgCost) {
      const breakEvenUnits = manualInputs.costos_fijos / (avgPrice - avgCost);
      kpis.push(kpi("break_even", "Punto de Equilibrio (Unidades)", breakEvenUnits,
        fmt(breakEvenUnits, 0) + " uds", "units",
        breakEvenUnits < totalUnits ? "green" : "red", "B",
        "Costos Fijos / (Precio Prom. - Costo Prom.)", ["T1"]));
    } else {
      kpis.push(unavailableKPI("break_even", "Punto de Equilibrio (Unidades)", "B",
        "Requiere 'Costos Fijos' en los parámetros adicionales", []));
    }

    // B4 — Concentración de Margen (80/20)
    let accMargin = 0;
    const totalMargin = skuList.reduce((s, sk) => s + (sk.revenue - sk.cost), 0);
    let skusFor80Pct = 0;
    for (const sk of skuList) {
      accMargin += sk.revenue - sk.cost;
      skusFor80Pct++;
      if (totalMargin > 0 && accMargin / totalMargin >= 0.8) break;
    }
    const marginConcentration = skuList.length > 0 ? (skusFor80Pct / skuList.length) * 100 : 0;
    kpis.push(kpi("margin_concentration", "Concentración de Margen (80/20)", marginConcentration, pct(marginConcentration), "%",
      marginConcentration <= 20 ? "green" : marginConcentration <= 40 ? "yellow" : "red", "B",
      "% del catálogo que genera el 80% de la utilidad bruta", ["T1"]));

    // B5 — GMROI (T3 or simplified)
    if (has("T3") && t3 && t3.length > 0) {
      const inventoryMap = new Map(t3.map((r) => [r.sku_id, r]));
      let totalInventoryValue = 0;
      for (const sk of skuList) {
        const inv = inventoryMap.get(sk.id);
        const stockProm = inv?.stock_promedio ?? inv?.stock_actual ?? 0;
        const costUnit = totalUnits > 0 ? sk.cost / sk.units : 0;
        totalInventoryValue += stockProm * costUnit;
      }
      const gmroi = totalInventoryValue > 0 ? grossProfit / totalInventoryValue : 0;
      kpis.push(kpi("gmroi", "GMROI", gmroi, fmt(gmroi, 2) + "x", "ratio",
        evaluateAlert(gmroi, THRESHOLDS.gmroi), "B",
        "Margen Bruto / Valor del Inventario Promedio (T3)", ["T1", "T3"]));
    } else {
      kpis.push(unavailableKPI("gmroi", "GMROI", "B", "Requiere datos de inventario (stock_promedio)", ["T3"]));
    }

    // B6 — Índice de Descuento (precio_lista/descuento_aplicado columns)
    if (hasPricingData) {
      const totalPrecioLista = t1.reduce((s, r) => s + (r.precio_lista ?? 0), 0);
      const totalDescuento = t1.reduce((s, r) => s + (r.descuento_aplicado ?? 0), 0);
      const discountIndex = totalPrecioLista > 0 ? (totalDescuento / totalPrecioLista) * 100 : 0;
      kpis.push(kpi("discount_index", "Índice de Descuento", discountIndex, pct(discountIndex), "%",
        evaluateAlert(discountIndex, THRESHOLDS.discount_index, true), "B",
        "((Venta Precio Lista - Venta Real) / Venta Precio Lista) × 100", ["T1"]));

      // Margen de Contribución Neto (T2 + pricing columns)
      if (has("T2") && t2 && t2.length > 0) {
        const totalDevueltas = t2.reduce((s, r) => s + r.unidades_devueltas, 0);
        const returnValue = totalUnits > 0 ? (totalDevueltas / totalUnits) * totalCost : 0;
        const netContribution = totalRevenue - totalDescuento - totalCost - returnValue;
        const netMarginPct = totalRevenue > 0 ? (netContribution / totalRevenue) * 100 : 0;
        kpis.push(kpi("net_contribution", "Margen de Contribución Neto", netMarginPct, pct(netMarginPct), "%",
          evaluateAlert(netMarginPct, THRESHOLDS.margin_net), "B",
          "Venta Real - Descuentos - Costo Variable - Devoluciones", ["T1", "T2"]));
      }
    } else {
      kpis.push(unavailableKPI("discount_index", "Índice de Descuento", "B", "Agrega columnas 'precio_lista' y 'descuento_aplicado' en T1", []));
    }

    // B7 — ROAS (T5 o manual)
    if (has("T5") && t9 && t9.length > 0) {
      const totalVentasCampana = t9.reduce((s, r) => s + r.ventas_campana, 0);
      const totalGasto = t9.reduce((s, r) => s + r.gasto_marketing, 0);
      const roas = totalGasto > 0 ? totalVentasCampana / totalGasto : 0;
      kpis.push(kpi("roas", "ROAS Estimado", roas, fmt(roas, 2) + "x", "ratio",
        roas >= 4 ? "green" : roas >= 2 ? "yellow" : "red", "B",
        "Ventas de Campaña / Gasto en Marketing", ["T5"]));
    } else if (manualInputs.gasto_marketing_total && manualInputs.gasto_marketing_total > 0) {
      const roas = totalRevenue / manualInputs.gasto_marketing_total;
      kpis.push(kpi("roas", "ROAS Estimado (Global)", roas, fmt(roas, 2) + "x", "ratio",
        roas >= 4 ? "green" : roas >= 2 ? "yellow" : "red", "B",
        "Ventas Totales / Gasto en Marketing (input manual)", []));
    } else {
      kpis.push(unavailableKPI("roas", "ROAS Estimado", "B", "Requiere datos de campaña (T5) o input manual de gasto", ["T5"]));
    }

    // B8 — Desviación de Cuota (manual)
    if (manualInputs.objetivo_ventas && manualInputs.objetivo_ventas > 0) {
      const deviation = ((totalRevenue - manualInputs.objetivo_ventas) / manualInputs.objetivo_ventas) * 100;
      kpis.push(kpi("quota_deviation", "Desviación de Cuota", deviation, pct(deviation), "%",
        deviation >= 0 ? "green" : deviation >= -10 ? "yellow" : "red", "B",
        "((Ventas Reales - Objetivo) / Objetivo) × 100", []));
    } else {
      kpis.push(unavailableKPI("quota_deviation", "Desviación de Cuota", "B",
        "Requiere 'Objetivo de Ventas' en los parámetros adicionales", []));
    }

  } else {
    // No cost data — all Gama B unavailable
    ["gross_margin", "contribution", "break_even", "margin_concentration", "gmroi", "discount_index", "roas", "quota_deviation"].forEach((id) => {
      const names: Record<string, string> = {
        gross_margin: "Margen Bruto Total",
        contribution: "Contribución Marginal Total",
        break_even: "Punto de Equilibrio",
        margin_concentration: "Concentración de Margen (80/20)",
        gmroi: "GMROI",
        discount_index: "Índice de Descuento",
        roas: "ROAS Estimado",
        quota_deviation: "Desviación de Cuota",
      };
      kpis.push(unavailableKPI(id, names[id], "B", "Requiere costo_unitario en T1", ["T1"]));
    });
  }

  // ══════════════════════════════════════════════════════════════
  // GAMA C — Operativos
  // ══════════════════════════════════════════════════════════════

  // C1 — Clasificación ABC
  let accumulated = 0;
  let classA = 0, classB = 0, classC = 0;
  const abcDetail: ABCItem[] = [];
  for (const sku of skuList) {
    accumulated += sku.revenue;
    const pctAcc = totalRevenue > 0 ? (accumulated / totalRevenue) * 100 : 0;
    const cls: "A" | "B" | "C" = pctAcc <= 80 ? "A" : pctAcc <= 95 ? "B" : "C";
    if (cls === "A") classA++;
    else if (cls === "B") classB++;
    else classC++;
    abcDetail.push({ sku_id: sku.id, name: sku.name, revenue: sku.revenue, class: cls, pct_rev: totalRevenue > 0 ? (sku.revenue / totalRevenue) * 100 : 0, pct_accumulated: pctAcc });
  }
  kpis.push(kpi("abc_class", "Clasificación ABC", classA, `A: ${classA} | B: ${classB} | C: ${classC}`, "count", "green", "C",
    "Ranking de SKUs por ingresos acumulados (A=80%, B=95%, C=100%)", ["T1"]));

  // C2 — Concentración de SKU por Categoría
  const skuPerCat = new Map<string, Set<string>>();
  for (const r of t1) {
    if (!skuPerCat.has(r.categoria)) skuPerCat.set(r.categoria, new Set());
    skuPerCat.get(r.categoria)!.add(r.sku_id);
  }
  const catConcentration = Array.from(skuPerCat.entries())
    .map(([cat, skus]) => ({ categoria: cat, skus: skus.size }))
    .sort((a, b) => b.skus - a.skus);
  kpis.push(kpi("sku_concentration", "Concentración de SKU", allSkuSet.size,
    `${allSkuSet.size} SKUs / ${catConcentration.length} categorías`, "count", "green", "C",
    "Cantidad de SKUs distintos por categoría", ["T1"],
    catConcentration as unknown as Record<string, unknown>[]));

  // C3 — Rotación, DOH, Sell-Through, Tasa Quiebre, Días Cobertura (T3)
  if (has("T3") && t3 && t3.length > 0) {
    const inventoryMap = new Map(t3.map((r) => [r.sku_id, r]));

    // Rotación
    const totalStockPromedio = t3.reduce((s, r) => {
      const costUnit = (skuMap.get(r.sku_id)?.cost ?? 0) / (skuMap.get(r.sku_id)?.units ?? 1);
      return s + (r.stock_promedio ?? r.stock_actual) * costUnit;
    }, 0);
    const rotation = totalStockPromedio > 0 ? totalCost / totalStockPromedio : 0;
    kpis.push(kpi("rotation", "Rotación de Inventario", rotation, fmt(rotation, 1) + "x/año", "ratio",
      evaluateAlert(rotation, THRESHOLDS.rotation), "C",
      "Costo de Ventas Total / Valor Stock Promedio", ["T1", "T3"]));

    // DOH
    const doh = rotation > 0 ? 365 / rotation : 0;
    kpis.push(kpi("doh", "Días de Inventario (DOH)", doh, fmt(doh, 0) + " días", "days",
      evaluateAlert(doh, THRESHOLDS.doh, true), "C",
      "(Stock Promedio / Costo de Ventas) × 365", ["T1", "T3"]));

    // Sell-Through Rate
    const totalRecibidas = t3.reduce((s, r) => s + (r.unidades_recibidas ?? 0), 0);
    if (totalRecibidas > 0) {
      const sellThrough = (totalUnits / totalRecibidas) * 100;
      kpis.push(kpi("sell_through", "Sell-Through Rate", sellThrough, pct(sellThrough), "%",
        evaluateAlert(sellThrough, THRESHOLDS.sell_through), "C",
        "Unidades Vendidas / Unidades Recibidas al Inicio del Período", ["T1", "T3"]));
    }

    // Tasa de Quiebre de Stock
    const activeSkusWithInventory = t3.filter((r) => allSkuSet.has(r.sku_id));
    const breachSkus = activeSkusWithInventory.filter((r) => r.stock_actual === 0).length;
    const breakRate = activeSkusWithInventory.length > 0 ? (breachSkus / activeSkusWithInventory.length) * 100 : 0;
    kpis.push(kpi("stock_break_rate", "Tasa de Quiebre de Stock", breakRate, pct(breakRate), "%",
      evaluateAlert(breakRate, THRESHOLDS.stock_break, true), "C",
      "SKUs activos con stock = 0 / Total SKUs activos × 100", ["T1", "T3"]));

    // Días de Cobertura (promedio ponderado)
    let covSum = 0, covCount = 0;
    for (const inv of t3) {
      const skuData = skuMap.get(inv.sku_id);
      if (!skuData || skuData.units === 0) continue;
      const dailyUnits = skuData.units / periodDays;
      if (dailyUnits > 0) {
        covSum += inv.stock_actual / dailyUnits;
        covCount++;
      }
    }
    const avgDaysCoverage = covCount > 0 ? covSum / covCount : 0;
    kpis.push(kpi("days_coverage", "Días de Cobertura (Prom.)", avgDaysCoverage, fmt(avgDaysCoverage, 0) + " días", "days",
      evaluateAlert(avgDaysCoverage, THRESHOLDS.days_coverage), "C",
      "Stock Actual / (Ventas Período / Días del Período) — promedio SKUs", ["T1", "T3"]));

  } else {
    ["rotation", "doh", "sell_through", "stock_break_rate", "days_coverage"].forEach((id) => {
      const names: Record<string, string> = {
        rotation: "Rotación de Inventario",
        doh: "Días de Inventario (DOH)",
        sell_through: "Sell-Through Rate",
        stock_break_rate: "Tasa de Quiebre de Stock",
        days_coverage: "Días de Cobertura (Prom.)",
      };
      kpis.push(unavailableKPI(id, names[id], "C", "Requiere datos de inventario por SKU", ["T3"]));
    });
  }

  // C4 — Fill Rate, Lead Time (T2)
  if (has("T2")) {
    kpis.push(unavailableKPI("fill_rate", "Fill Rate", "C", "T2 cargada — cálculo disponible en próxima versión", ["T2"]));
  } else {
    kpis.push(unavailableKPI("fill_rate", "Fill Rate", "C", "Requiere pedidos_solicitados y pedidos_surtidos", ["T2"]));
    kpis.push(unavailableKPI("lead_time", "Lead Time de Venta", "C", "Requiere fecha_recepcion y fecha_primera_venta", ["T2"]));
  }

  // C5 — Exactitud de Pronóstico (T3)
  kpis.push(unavailableKPI("forecast_accuracy", "Exactitud de Pronóstico (MAPE)", "C",
    "Requiere venta_proyectada por SKU", ["T3"]));

  // ══════════════════════════════════════════════════════════════
  // CHART DATA — Extended
  // ══════════════════════════════════════════════════════════════

  // Customer segmentation
  let customerSegmentation: { label: string; value: number }[] | null = null;
  if (hasCustomerData) {
    const allClientsList = new Set<string>();
    const newClientsList = new Set<string>();
    for (const r of [...t1].sort((a, b) => a.fecha.getTime() - b.fecha.getTime())) {
      if (!r.id_cliente) continue;
      if (!allClientsList.has(r.id_cliente)) newClientsList.add(r.id_cliente);
      allClientsList.add(r.id_cliente);
    }
    customerSegmentation = [
      { label: "Nuevos", value: newClientsList.size },
      { label: "Recurrentes", value: allClientsList.size - newClientsList.size },
    ];
  }

  // Region data
  let regionData: RegionItem[] | null = null;
  if (hasGeoData) {
    const regionMap2 = new Map<string, number>();
    for (const r of t1) {
      const region = r.zona ?? r.region ?? "Sin región";
      regionMap2.set(region, (regionMap2.get(region) ?? 0) + r.cantidad * r.precio_unitario);
    }
    regionData = Array.from(regionMap2.entries())
      .map(([region, revenue]) => ({ region, revenue, pct: (revenue / totalRevenue) * 100 }))
      .sort((a, b) => b.revenue - a.revenue);
  }

  // Waterfall data (pricing columns + T2)
  let waterfallData: WaterfallItem[] | null = null;
  if (hasPricingData) {
    const totalDescuento = t1.reduce((s, r) => s + (r.descuento_aplicado ?? 0), 0);
    const totalDevueltas2 = has("T2") && t4 ? t2.reduce((s, r) => s + r.unidades_devueltas, 0) : 0;
    const devValue = totalUnits > 0 ? (totalDevueltas2 / totalUnits) * totalRevenue : 0;
    const grossProfit2 = totalRevenue - totalCost;
    waterfallData = [
      { label: "Venta Bruta", value: totalRevenue, type: "total" },
      { label: "Descuentos", value: -totalDescuento, type: "negative" },
      ...(totalDevueltas2 > 0 ? [{ label: "Devoluciones", value: -devValue, type: "negative" as const }] : []),
      { label: "Costo de Ventas", value: -totalCost, type: "negative" },
      { label: "Utilidad Bruta", value: grossProfit2 - totalDescuento - devValue, type: "total" },
    ];
  }

  // Inventory aging (T3 — simplified bucketing using dias_sin_stock as proxy)
  let inventoryAgingData: AgingBucket[] | null = null;
  if (has("T3") && t3 && t3.length > 0) {
    const inventoryMap3 = new Map(t3.map((r) => [r.sku_id, r]));
    const buckets = { "0–30 días": 0, "31–60 días": 0, "61–90 días": 0, "+91 días": 0 };
    let totalValue = 0;
    for (const sk of skuList) {
      const inv = inventoryMap3.get(sk.id);
      if (!inv) continue;
      const costUnit = sk.units > 0 ? sk.cost / sk.units : 0;
      const stockValue = inv.stock_actual * costUnit;
      totalValue += stockValue;
      // Use dias_sin_stock if available; otherwise all goes to 0-30 bucket
      const dias = inv.dias_sin_stock ?? 0;
      if (dias <= 30) buckets["0–30 días"] += stockValue;
      else if (dias <= 60) buckets["31–60 días"] += stockValue;
      else if (dias <= 90) buckets["61–90 días"] += stockValue;
      else buckets["+91 días"] += stockValue;
    }
    // valor_stock_muerto override for +91
    const deadStockValue = t3.reduce((s, r) => s + (r.valor_stock_muerto ?? 0), 0);
    if (deadStockValue > 0) buckets["+91 días"] = deadStockValue;

    inventoryAgingData = Object.entries(buckets).map(([bucket, value]) => ({
      bucket, value, pct: totalValue > 0 ? (value / totalValue) * 100 : 0,
    }));
  }

  // Marketing data (T5)
  let marketingData: MarketingRoasItem[] | null = null;
  if (has("T5") && t9 && t9.length > 0) {
    marketingData = t9.map((r) => ({
      campaña: r.campaña,
      ventas: r.ventas_campana,
      gasto: r.gasto_marketing,
      roas: r.gasto_marketing > 0 ? r.ventas_campana / r.gasto_marketing : 0,
    })).sort((a, b) => b.roas - a.roas);
  }

  // Margin bubble data
  const marginBubbleData: BubbleItem[] = Array.from(catMap.entries()).map(([category, d]) => ({
    category,
    revenue: d.revenue,
    marginPct: d.revenue > 0 ? ((d.revenue - d.cost) / d.revenue) * 100 : 0,
    contribution: d.revenue - d.cost,
  }));

  // Contribution detail (top 10)
  const contributionDetail = skuList.slice(0, 10).map((s) => ({ sku: s.id, nombre: s.name, contribucion: s.revenue - s.cost }));

  // Stockout detail
  const stockoutDetail = stockoutSkus.slice(0, 10).map((s) => ({ sku: s, nombre: skuMap.get(s)?.name ?? s }));

  return {
    kpis,
    loadedTemplates,
    hasCostData,
    totalRows: t1.length,
    cleanRows: t1.length,
    monthlyData,
    topProducts: skuList.slice(0, 10).map((s) => ({ name: s.name, revenue: s.revenue })),
    categoryBreakdown,
    abcDetail,
    marginBubbleData,
    contributionDetail,
    stockoutDetail,
    customerSegmentation,
    regionData,
    waterfallData,
    inventoryAgingData,
    marketingData,
  };
}

// ── Template File Generators ────────────────────────────────────────────────────

function makeSheet(
  headers: string[],
  examples: (string | number)[],
  comments: string[],
  colWidths: number[],
): XLSX.WorkSheet {
  const data: (string | number)[][] = [headers, examples];
  const ws = XLSX.utils.aoa_to_sheet(data);
  ws["!cols"] = colWidths.map((w) => ({ wch: w }));
  return ws;
}

export function generateTemplateFile(id: TemplateId): ArrayBuffer {
  const def = TEMPLATE_CATALOG[id];
  const wb = XLSX.utils.book_new();

  const headers = def.columns.map((c) => c.key);
  const examples = def.columns.map((c) => c.example);
  const comments = def.columns.map((c) => c.comment);
  const widths = def.columns.map((c) => Math.max(c.key.length + 4, c.label.length + 2, 14));

  const ws = makeSheet(headers, examples, comments, widths);
  XLSX.utils.book_append_sheet(wb, ws, def.name);

  // Info sheet
  const infoData = [
    ["Plantilla", def.id + " — " + def.name],
    ["Descripción", def.description],
    ["Requerida", def.required ? "Sí (obligatoria)" : "No (opcional)"],
    ["KPIs que habilita", def.kpiLabels.join(", ")],
    [],
    ["Campo", "Etiqueta", "Tipo", "Requerido", "Descripción"],
    ...def.columns.map((c) => [c.key, c.label, c.type, c.required ? "Sí" : "No", c.comment]),
  ];
  const wsInfo = XLSX.utils.aoa_to_sheet(infoData);
  wsInfo["!cols"] = [{ wch: 30 }, { wch: 30 }, { wch: 12 }, { wch: 12 }, { wch: 60 }];
  XLSX.utils.book_append_sheet(wb, wsInfo, "Información");

  return XLSX.write(wb, { bookType: "xlsx", type: "array" });
}

// Keep backward-compatible alias
export function generateTemplate(): ArrayBuffer {
  return generateTemplateFile("T1");
}
