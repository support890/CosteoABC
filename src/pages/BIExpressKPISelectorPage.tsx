import { AppLayout } from "@/components/AppLayout";
import { PageHeader } from "@/components/PageHeader";
import { useBIExpressContext } from "@/contexts/BIExpressContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { TrendingUp, DollarSign, Settings2, Info, Lock, BarChart3, Table2 } from "lucide-react";
import { useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useEffect } from "react";
import type { TemplateId } from "@/lib/bi-express-engine";

// ── KPI registry ────────────────────────────────────────────────────────────────

interface KPIDef {
  id: string;
  name: string;
  formula: string;
  example: string;
  requiredTemplates: TemplateId[];
  requiresCostData?: boolean;
}

interface VisualDef {
  id: string;
  name: string;
  type: "grafico" | "tabla";
  description: string;
  requiredTemplates: TemplateId[];
  requiresCostData?: boolean;
}

const KPI_CATEGORIES: {
  gama: "A" | "B" | "C";
  label: string;
  icon: typeof TrendingUp;
  color: string;
  badge: string;
  kpis: KPIDef[];
  visuals: VisualDef[];
}[] = [
  {
    gama: "A",
    label: "Comerciales",
    icon: TrendingUp,
    color: "text-emerald-600",
    badge: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200",
    kpis: [
      {
        id: "aov", name: "Ticket Promedio (AOV)",
        formula: "Ventas Totales ÷ Nº Facturas únicas",
        example: "$100,000 ÷ 500 tickets = $200 por ticket",
        requiredTemplates: ["T1"],
      },
      {
        id: "upt", name: "Artículos por Ticket (UPT)",
        formula: "Total Artículos Vendidos ÷ Nº Facturas únicas",
        example: "1,500 artículos ÷ 500 tickets = 3 artículos/ticket",
        requiredTemplates: ["T1"],
      },
      {
        id: "pareto", name: "Tasa de Concentración (Pareto)",
        formula: "Ingresos del top 20% de SKUs ÷ Ingresos Totales × 100",
        example: "50 de 250 SKUs (20%) generan el 80% de los ingresos",
        requiredTemplates: ["T1"],
      },
      {
        id: "category_share", name: "Venta por Categoría (Top)",
        formula: "Ventas Categoría X ÷ Ventas Totales × 100",
        example: "Electrónica $40,000 ÷ $100,000 total = 40%",
        requiredTemplates: ["T1"],
      },
      {
        id: "growth_mom", name: "Crecimiento de Ventas (MoM)",
        formula: "(Ventas Mes Actual − Ventas Mes Anterior) ÷ Ventas Mes Anterior × 100",
        example: "($110,000 − $100,000) ÷ $100,000 = 10% de crecimiento",
        requiredTemplates: ["T1"],
      },
      {
        id: "stockout", name: "Posibles Stockouts",
        formula: "SKUs con historial de venta y 0 ventas en los últimos 7 días",
        example: "SKU-023 tuvo ventas consistentes pero 0 en la última semana",
        requiredTemplates: ["T1"],
      },
      {
        id: "churn_sku", name: "Churn Rate de Productos",
        formula: "SKUs con 0 ventas en período actual ÷ SKUs activos período anterior × 100",
        example: "20 SKUs sin ventas de 200 activos = 10% de churn",
        requiredTemplates: ["T1"],
      },
      {
        id: "exit_velocity", name: "Velocidad de Salida",
        formula: "Total Unidades Vendidas ÷ Días del Período",
        example: "3,000 unidades ÷ 30 días = 100 unidades/día",
        requiredTemplates: ["T1"],
      },
      {
        id: "crr", name: "Customer Retention Rate (CRR)",
        formula: "Clientes retenidos ÷ Clientes período anterior × 100",
        example: "60 de 100 clientes repitieron = 60% de retención",
        requiredTemplates: ["T1"],
      },
      {
        id: "acquisition_rate", name: "Tasa de Captación",
        formula: "Clientes nuevos ÷ Total clientes históricos × 100",
        example: "50 clientes nuevos de 250 históricos = 20%",
        requiredTemplates: ["T1"],
      },
      {
        id: "ltv", name: "LTV Estimado (6 meses)",
        formula: "AOV × Frecuencia de Compra Esperada (6 meses)",
        example: "$200 AOV × 4 compras esperadas = $800 LTV",
        requiredTemplates: ["T1"],
      },
      {
        id: "penetration", name: "Clientes Únicos",
        formula: "Total clientes únicos en el período",
        example: "350 clientes únicos identificados con id_cliente",
        requiredTemplates: ["T1"],
      },
      {
        id: "return_rate", name: "Ratio de Devoluciones",
        formula: "Total Unidades Devueltas ÷ Total Unidades Vendidas × 100",
        example: "150 devueltas ÷ 3,000 vendidas = 5%",
        requiredTemplates: ["T1", "T2"],
      },
      {
        id: "region_sales", name: "Venta por Región",
        formula: "Ventas Zona X ÷ Ventas Totales × 100, rankeadas",
        example: "Norte: $60,000 ÷ $100,000 = 60% (alerta: concentración)",
        requiredTemplates: ["T1"],
      },
    ],
    visuals: [
      {
        id: "chart_monthly_sales", name: "Tendencia de Ventas Mensual",
        type: "grafico",
        description: "Línea de ventas mes a mes para identificar tendencias y estacionalidad",
        requiredTemplates: ["T1"],
      },
      {
        id: "chart_category_sales", name: "Venta por Categoría",
        type: "grafico",
        description: "Barras horizontales con el ingreso por categoría de producto",
        requiredTemplates: ["T1"],
      },
      {
        id: "chart_customer_segmentation", name: "Clientes Nuevos vs. Recurrentes",
        type: "grafico",
        description: "Dona que compara clientes nuevos y recurrentes (requiere columna id_cliente en T1)",
        requiredTemplates: ["T1"],
      },
      {
        id: "chart_region_sales", name: "Venta por Región",
        type: "grafico",
        description: "Barras horizontales de ventas por zona/región (requiere columna zona o region en T1)",
        requiredTemplates: ["T1"],
      },
      {
        id: "table_stockouts", name: "SKUs con posible Stockout",
        type: "tabla",
        description: "Lista de SKUs con historial de venta que no registraron ventas en los últimos 7 días",
        requiredTemplates: ["T1"],
      },
    ],
  },
  {
    gama: "B",
    label: "Financieros",
    icon: DollarSign,
    color: "text-blue-600",
    badge: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
    kpis: [
      {
        id: "gross_margin", name: "Margen Bruto Total",
        formula: "(Ventas − Costo de Ventas) ÷ Ventas × 100",
        example: "($100,000 − $60,000) ÷ $100,000 = 40% de margen",
        requiredTemplates: ["T1"], requiresCostData: true,
      },
      {
        id: "contribution", name: "Contribución Marginal Total",
        formula: "Σ (Precio Unitario − Costo Unitario) × Cantidad",
        example: "$100,000 − $65,000 = $35,000 de contribución marginal",
        requiredTemplates: ["T1"], requiresCostData: true,
      },
      {
        id: "break_even", name: "Punto de Equilibrio (Unidades)",
        formula: "Costos Fijos ÷ (Precio Prom. − Costo Prom.)",
        example: "$20,000 ÷ ($50 − $30) = 1,000 unidades",
        requiredTemplates: ["T1"], requiresCostData: true,
      },
      {
        id: "margin_concentration", name: "Concentración de Margen (80/20)",
        formula: "% del catálogo de SKUs que genera el 80% de la utilidad bruta",
        example: "40 de 200 SKUs (20%) generan el 80% del margen",
        requiredTemplates: ["T1"], requiresCostData: true,
      },
      {
        id: "gmroi", name: "GMROI",
        formula: "Margen Bruto ÷ Valor del Inventario Promedio",
        example: "$40,000 ÷ $20,000 = 2.0× (por cada $1 en inventario se obtienen $2 de margen)",
        requiredTemplates: ["T1", "T3"], requiresCostData: true,
      },
      {
        id: "discount_index", name: "Índice de Descuento",
        formula: "(Venta Precio Lista − Venta Real) ÷ Venta Precio Lista × 100",
        example: "($120,000 − $100,000) ÷ $120,000 = 16.7% de descuento promedio",
        requiredTemplates: ["T1"], requiresCostData: true,
      },
      {
        id: "net_contribution", name: "Margen de Contribución Neto",
        formula: "Venta Real − Descuentos − Costo Variable − Devoluciones",
        example: "$100,000 − $5,000 − $60,000 − $2,000 = $33,000 neto",
        requiredTemplates: ["T1", "T2"], requiresCostData: true,
      },
      {
        id: "roas", name: "ROAS Estimado",
        formula: "Ventas de Campaña ÷ Gasto en Marketing",
        example: "$50,000 ÷ $12,500 = 4× ROAS",
        requiredTemplates: ["T5"],
      },
      {
        id: "quota_deviation", name: "Desviación de Cuota",
        formula: "(Ventas Reales − Objetivo) ÷ Objetivo × 100",
        example: "($110,000 − $100,000) ÷ $100,000 = +10%",
        requiredTemplates: [],
      },
    ],
    visuals: [
      {
        id: "chart_contribution_top10", name: "Top 10 SKUs — Contribución Marginal",
        type: "grafico",
        description: "Barras horizontales de los 10 SKUs con mayor contribución marginal",
        requiredTemplates: ["T1"], requiresCostData: true,
      },
      {
        id: "chart_waterfall", name: "Venta Bruta → Utilidad Neta",
        type: "grafico",
        description: "Cascada desde venta bruta hasta utilidad neta mostrando descuentos y costos",
        requiredTemplates: ["T1"],
      },
      {
        id: "table_margin_category", name: "Margen por Categoría",
        type: "tabla",
        description: "Tabla con ventas, margen % y contribución desglosados por categoría",
        requiredTemplates: ["T1"], requiresCostData: true,
      },
      {
        id: "table_roas_campaign", name: "ROAS por Campaña",
        type: "tabla",
        description: "Tabla de ventas, gasto y ROAS por campaña de marketing",
        requiredTemplates: ["T5"],
      },
    ],
  },
  {
    gama: "C",
    label: "Operativos",
    icon: Settings2,
    color: "text-violet-600",
    badge: "bg-violet-100 text-violet-800 dark:bg-violet-900 dark:text-violet-200",
    kpis: [
      {
        id: "abc_class", name: "Clasificación ABC",
        formula: "Ranking de SKUs por % acumulado de ingresos (A=80%, B=95%, C=100%)",
        example: "SKU-001 = 45% de ventas → Clase A",
        requiredTemplates: ["T1"],
      },
      {
        id: "sku_concentration", name: "Concentración de SKU",
        formula: "Nº SKUs distintos por categoría",
        example: "Electrónica: 45 SKUs | Ropa: 120 SKUs | Hogar: 30 SKUs",
        requiredTemplates: ["T1"],
      },
      {
        id: "rotation", name: "Rotación de Inventario",
        formula: "Costo de Ventas Total ÷ Valor Stock Promedio",
        example: "$60,000 ÷ $15,000 = 4× rotaciones al año",
        requiredTemplates: ["T1", "T3"],
      },
      {
        id: "doh", name: "Días de Inventario (DOH)",
        formula: "365 ÷ Rotación de Inventario",
        example: "365 ÷ 4 rotaciones = 91 días de cobertura",
        requiredTemplates: ["T1", "T3"],
      },
      {
        id: "sell_through", name: "Sell-Through Rate",
        formula: "Unidades Vendidas ÷ Unidades Recibidas al Inicio × 100",
        example: "800 vendidas ÷ 1,000 recibidas = 80% sell-through",
        requiredTemplates: ["T1", "T3"],
      },
      {
        id: "stock_break_rate", name: "Tasa de Quiebre de Stock",
        formula: "SKUs con stock = 0 ÷ Total SKUs activos × 100",
        example: "10 SKUs sin stock de 200 activos = 5% de quiebre",
        requiredTemplates: ["T1", "T3"],
      },
      {
        id: "days_coverage", name: "Días de Cobertura (Prom.)",
        formula: "Stock Actual ÷ (Ventas Período ÷ Días del Período)",
        example: "150 unidades ÷ (100 u/30 días) = 45 días de cobertura",
        requiredTemplates: ["T1", "T3"],
      },
      {
        id: "fill_rate", name: "Fill Rate",
        formula: "Pedidos Surtidos Completos ÷ Total Pedidos Solicitados × 100",
        example: "95 pedidos surtidos ÷ 100 solicitados = 95%",
        requiredTemplates: ["T4"],
      },
      {
        id: "lead_time", name: "Lead Time de Venta",
        formula: "Promedio de días entre fecha_recepcion y fecha_primera_venta",
        example: "SKU-001: recibido 01/01, primera venta 05/01 = 4 días",
        requiredTemplates: ["T4"],
      },
      {
        id: "forecast_accuracy", name: "Exactitud de Pronóstico (MAPE)",
        formula: "100% − (|Venta Real − Venta Proyectada| ÷ Venta Proyectada × 100)",
        example: "|$95,000 − $100,000| ÷ $100,000 = 5% de error → 95% exactitud",
        requiredTemplates: ["T7"],
      },
    ],
    visuals: [
      {
        id: "chart_top10_products", name: "Top 10 Productos — Ingresos",
        type: "grafico",
        description: "Barras horizontales de los 10 productos con mayor ingreso en el período",
        requiredTemplates: ["T1"],
      },
      {
        id: "table_abc_classification", name: "Clasificación ABC — Top 20 SKUs",
        type: "tabla",
        description: "Tabla con clase A/B/C, SKU, nombre, ingresos y % acumulado para los 20 principales",
        requiredTemplates: ["T1"],
      },
      {
        id: "chart_inventory_aging", name: "Antigüedad de Inventario",
        type: "grafico",
        description: "Barras por rango de antigüedad del inventario (valor a costo)",
        requiredTemplates: ["T3"],
      },
    ],
  },
];

// ── Type badge config ────────────────────────────────────────────────────────────

const TYPE_BADGE = {
  kpi:     "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
  grafico: "bg-cyan-100 text-cyan-700 dark:bg-cyan-900 dark:text-cyan-300",
  tabla:   "bg-violet-100 text-violet-700 dark:bg-violet-900 dark:text-violet-300",
};

const TYPE_LABEL = {
  kpi:     "KPI",
  grafico: "Gráfico",
  tabla:   "Tabla",
};

// ── Page ────────────────────────────────────────────────────────────────────────

export default function BIExpressKPISelectorPage() {
  const {
    selectedBIModel, selectedBIPeriod,
    disabledKPIs, toggleKPI,
    disabledVisuals, toggleVisual,
    loadedTemplates, hasCostData,
  } = useBIExpressContext();
  const navigate = useNavigate();

  useEffect(() => {
    if (!selectedBIModel || !selectedBIPeriod) navigate("/bi-express");
  }, [selectedBIModel, selectedBIPeriod, navigate]);

  const totalEnabled =
    KPI_CATEGORIES.flatMap((c) => c.kpis).filter((k) => !disabledKPIs.has(k.id)).length +
    KPI_CATEGORIES.flatMap((c) => c.visuals).filter((v) => !disabledVisuals.has(v.id)).length;

  const totalItems =
    KPI_CATEGORIES.flatMap((c) => c.kpis).length +
    KPI_CATEGORIES.flatMap((c) => c.visuals).length;

  const toggleCategory = useCallback(
    (kpis: KPIDef[], visuals: VisualDef[], allEnabled: boolean) => {
      kpis.forEach((kpi) => {
        const isDisabled = disabledKPIs.has(kpi.id);
        if (allEnabled && !isDisabled) toggleKPI(kpi.id);
        if (!allEnabled && isDisabled) toggleKPI(kpi.id);
      });
      visuals.forEach((v) => {
        const isDisabled = disabledVisuals.has(v.id);
        if (allEnabled && !isDisabled) toggleVisual(v.id);
        if (!allEnabled && isDisabled) toggleVisual(v.id);
      });
    },
    [disabledKPIs, toggleKPI, disabledVisuals, toggleVisual]
  );

  function isKPIUnlocked(kpi: KPIDef): boolean {
    if (kpi.requiresCostData && !hasCostData) return false;
    if (kpi.requiredTemplates.length === 0) return true;
    return kpi.requiredTemplates.every((t) => t === "T1" || loadedTemplates.has(t));
  }

  function isVisualUnlocked(v: VisualDef): boolean {
    if (v.requiresCostData && !hasCostData) return false;
    if (v.requiredTemplates.length === 0) return true;
    return v.requiredTemplates.every((t) => t === "T1" || loadedTemplates.has(t));
  }

  return (
    <AppLayout>
      <PageHeader
        title="Selector de Indicadores"
        description="Elige qué KPIs, gráficos y tablas aparecen en el tablero — los bloqueados requieren plantillas adicionales"
      >
        <Badge variant="secondary" className="text-sm px-3 py-1">
          {totalEnabled}/{totalItems} activos
        </Badge>
      </PageHeader>

      <div className="space-y-6">
        {KPI_CATEGORIES.map((category) => {
          const Icon = category.icon;
          const enabledKPIs = category.kpis.filter((k) => !disabledKPIs.has(k.id)).length;
          const enabledVisuals = category.visuals.filter((v) => !disabledVisuals.has(v.id)).length;
          const enabledCount = enabledKPIs + enabledVisuals;
          const totalCat = category.kpis.length + category.visuals.length;
          const allEnabled = enabledCount === totalCat;

          return (
            <Card key={category.gama}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <CardTitle className="text-sm font-semibold flex items-center gap-2">
                      <Icon className={`h-4 w-4 ${category.color}`} />
                      Gama {category.gama} — {category.label}
                    </CardTitle>
                    <Switch
                      checked={allEnabled}
                      onCheckedChange={() => toggleCategory(category.kpis, category.visuals, allEnabled)}
                    />
                  </div>
                  <Badge className={`${category.badge} text-[10px] px-2 py-0`}>
                    {enabledCount}/{totalCat}
                  </Badge>
                </div>
              </CardHeader>

              <CardContent className="space-y-4">
                {/* KPIs section */}
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                    Indicadores (KPI)
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {category.kpis.map((kpi) => {
                      const enabled = !disabledKPIs.has(kpi.id);
                      const unlocked = isKPIUnlocked(kpi);

                      return (
                        <div
                          key={kpi.id}
                          className={`flex items-center justify-between p-3 rounded-lg border transition-colors ${
                            !unlocked
                              ? "border-dashed border-muted-foreground/20 bg-muted/20 opacity-60 cursor-not-allowed"
                              : enabled
                              ? "border-border bg-card hover:bg-accent/30 cursor-pointer"
                              : "border-dashed border-muted-foreground/30 bg-muted/30 cursor-pointer"
                          }`}
                          onClick={() => unlocked && toggleKPI(kpi.id)}
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            {!unlocked && <Lock className="h-3 w-3 text-muted-foreground/50 shrink-0" />}
                            <Label
                              className={`text-sm truncate ${
                                !unlocked ? "text-muted-foreground/50 cursor-not-allowed" :
                                enabled ? "cursor-pointer" : "text-muted-foreground cursor-pointer"
                              }`}
                            >
                              {kpi.name}
                            </Label>
                            <Badge className={`${TYPE_BADGE.kpi} text-[9px] px-1.5 py-0 shrink-0 font-normal`}>
                              {TYPE_LABEL.kpi}
                            </Badge>
                            {/* Template requirements */}
                            {!unlocked && kpi.requiredTemplates.length > 0 && (
                              <div className="flex gap-1 shrink-0">
                                {kpi.requiredTemplates.filter((t) => !loadedTemplates.has(t) && t !== "T1").map((t) => (
                                  <Badge key={t} variant="outline" className="text-[9px] px-1 py-0 font-mono">{t}</Badge>
                                ))}
                                {kpi.requiresCostData && !hasCostData && (
                                  <Badge variant="outline" className="text-[9px] px-1 py-0">costo</Badge>
                                )}
                              </div>
                            )}
                            {/* Info popover */}
                            <Popover>
                              <PopoverTrigger asChild>
                                <button
                                  type="button"
                                  className="shrink-0 text-muted-foreground hover:text-foreground transition-colors"
                                  onClick={(e) => e.stopPropagation()}
                                  aria-label={`Ver fórmula de ${kpi.name}`}
                                >
                                  <Info className="h-3.5 w-3.5" />
                                </button>
                              </PopoverTrigger>
                              <PopoverContent side="top" align="start" className="w-72 p-0 text-sm" onClick={(e) => e.stopPropagation()}>
                                <div className="px-4 py-3 border-b">
                                  <p className="font-semibold text-xs text-muted-foreground uppercase tracking-wide mb-1">Fórmula</p>
                                  <p className="font-mono text-xs leading-relaxed">{kpi.formula}</p>
                                </div>
                                <div className="px-4 py-3 border-b">
                                  <p className="font-semibold text-xs text-muted-foreground uppercase tracking-wide mb-1">Ejemplo</p>
                                  <p className="text-xs leading-relaxed">{kpi.example}</p>
                                </div>
                                {kpi.requiredTemplates.length > 0 && (
                                  <div className="px-4 py-3">
                                    <p className="font-semibold text-xs text-muted-foreground uppercase tracking-wide mb-1">Requiere</p>
                                    <div className="flex flex-wrap gap-1">
                                      {kpi.requiredTemplates.map((t) => (
                                        <Badge key={t} variant={loadedTemplates.has(t) ? "default" : "outline"} className="text-[10px] px-1.5 py-0 font-mono">
                                          {t}
                                        </Badge>
                                      ))}
                                      {kpi.requiresCostData && (
                                        <Badge variant={hasCostData ? "default" : "outline"} className="text-[10px] px-1.5 py-0">
                                          costo_unitario
                                        </Badge>
                                      )}
                                    </div>
                                  </div>
                                )}
                              </PopoverContent>
                            </Popover>
                          </div>
                          <Switch
                            checked={enabled && unlocked}
                            disabled={!unlocked}
                            onCheckedChange={() => unlocked && toggleKPI(kpi.id)}
                            onClick={(e) => e.stopPropagation()}
                          />
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Visuals section */}
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                    Visualizaciones (Gráficos y Tablas)
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {category.visuals.map((visual) => {
                      const enabled = !disabledVisuals.has(visual.id);
                      const unlocked = isVisualUnlocked(visual);
                      const VisualIcon = visual.type === "grafico" ? BarChart3 : Table2;

                      return (
                        <div
                          key={visual.id}
                          className={`flex items-center justify-between p-3 rounded-lg border transition-colors ${
                            !unlocked
                              ? "border-dashed border-muted-foreground/20 bg-muted/20 opacity-60 cursor-not-allowed"
                              : enabled
                              ? "border-border bg-card hover:bg-accent/30 cursor-pointer"
                              : "border-dashed border-muted-foreground/30 bg-muted/30 cursor-pointer"
                          }`}
                          onClick={() => unlocked && toggleVisual(visual.id)}
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            {!unlocked
                              ? <Lock className="h-3 w-3 text-muted-foreground/50 shrink-0" />
                              : <VisualIcon className="h-3 w-3 text-muted-foreground/60 shrink-0" />
                            }
                            <Label
                              className={`text-sm truncate ${
                                !unlocked ? "text-muted-foreground/50 cursor-not-allowed" :
                                enabled ? "cursor-pointer" : "text-muted-foreground cursor-pointer"
                              }`}
                            >
                              {visual.name}
                            </Label>
                            <Badge className={`${TYPE_BADGE[visual.type]} text-[9px] px-1.5 py-0 shrink-0 font-normal`}>
                              {TYPE_LABEL[visual.type]}
                            </Badge>
                            {/* Template requirements */}
                            {!unlocked && (
                              <div className="flex gap-1 shrink-0">
                                {visual.requiredTemplates.filter((t) => !loadedTemplates.has(t) && t !== "T1").map((t) => (
                                  <Badge key={t} variant="outline" className="text-[9px] px-1 py-0 font-mono">{t}</Badge>
                                ))}
                                {visual.requiresCostData && !hasCostData && (
                                  <Badge variant="outline" className="text-[9px] px-1 py-0">costo</Badge>
                                )}
                              </div>
                            )}
                            {/* Info popover */}
                            <Popover>
                              <PopoverTrigger asChild>
                                <button
                                  type="button"
                                  className="shrink-0 text-muted-foreground hover:text-foreground transition-colors"
                                  onClick={(e) => e.stopPropagation()}
                                  aria-label={`Ver descripción de ${visual.name}`}
                                >
                                  <Info className="h-3.5 w-3.5" />
                                </button>
                              </PopoverTrigger>
                              <PopoverContent side="top" align="start" className="w-72 p-0 text-sm" onClick={(e) => e.stopPropagation()}>
                                <div className="px-4 py-3 border-b">
                                  <p className="font-semibold text-xs text-muted-foreground uppercase tracking-wide mb-1">Descripción</p>
                                  <p className="text-xs leading-relaxed">{visual.description}</p>
                                </div>
                                {visual.requiredTemplates.length > 0 && (
                                  <div className="px-4 py-3">
                                    <p className="font-semibold text-xs text-muted-foreground uppercase tracking-wide mb-1">Requiere</p>
                                    <div className="flex flex-wrap gap-1">
                                      {visual.requiredTemplates.map((t) => (
                                        <Badge key={t} variant={loadedTemplates.has(t) ? "default" : "outline"} className="text-[10px] px-1.5 py-0 font-mono">
                                          {t}
                                        </Badge>
                                      ))}
                                      {visual.requiresCostData && (
                                        <Badge variant={visual.requiresCostData && hasCostData ? "default" : "outline"} className="text-[10px] px-1.5 py-0">
                                          costo_unitario
                                        </Badge>
                                      )}
                                    </div>
                                  </div>
                                )}
                              </PopoverContent>
                            </Popover>
                          </div>
                          <Switch
                            checked={enabled && unlocked}
                            disabled={!unlocked}
                            onCheckedChange={() => unlocked && toggleVisual(visual.id)}
                            onClick={(e) => e.stopPropagation()}
                          />
                        </div>
                      );
                    })}
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </AppLayout>
  );
}
