import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { AppLayout } from "@/components/AppLayout";
import { PageHeader } from "@/components/PageHeader";
import { useBIExpressContext } from "@/contexts/BIExpressContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  TrendingUp, DollarSign, Settings2, AlertTriangle,
  CheckCircle2, XCircle, Lock, Trash2, Upload, BarChart3,
} from "lucide-react";
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell, PieChart, Pie, Legend,
} from "recharts";
import {
  calculateKPIs,
  type AlertLevel, type KPIResult,
} from "@/lib/bi-express-engine";

// ── Constants ───────────────────────────────────────────────────────────────────

const ALERT_CONFIG: Record<AlertLevel, { bg: string; border: string; icon: typeof CheckCircle2; label: string; iconColor: string }> = {
  green: { bg: "bg-emerald-50 dark:bg-emerald-950/30", border: "border-emerald-200 dark:border-emerald-800", icon: CheckCircle2, label: "Óptimo", iconColor: "text-emerald-600" },
  yellow: { bg: "bg-amber-50 dark:bg-amber-950/30", border: "border-amber-200 dark:border-amber-800", icon: AlertTriangle, label: "Intermedio", iconColor: "text-amber-600" },
  red: { bg: "bg-red-50 dark:bg-red-950/30", border: "border-red-200 dark:border-red-800", icon: XCircle, label: "Alerta", iconColor: "text-red-600" },
};

const ALERT_BADGE: Record<AlertLevel, string> = {
  green: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200",
  yellow: "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200",
  red: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
};

const BAR_COLORS = ["#10b981", "#3b82f6", "#8b5cf6", "#f59e0b", "#ef4444", "#06b6d4", "#ec4899", "#14b8a6", "#f97316", "#6366f1"];
const DONUT_COLORS = ["#3b82f6", "#10b981"];
const AGING_COLORS = ["#10b981", "#f59e0b", "#f97316", "#ef4444"];

// ── KPI Card ────────────────────────────────────────────────────────────────────

function KPICard({ kpi }: { kpi: KPIResult }) {
  if (!kpi.available) {
    return (
      <Card className="border-dashed border-muted-foreground/25 bg-muted/20">
        <CardContent className="p-4">
          <div className="flex items-start justify-between mb-2">
            <p className="text-xs font-medium text-muted-foreground/70 leading-tight max-w-[75%]">{kpi.name}</p>
            <Lock className="h-3.5 w-3.5 text-muted-foreground/40 shrink-0" />
          </div>
          <p className="text-lg font-bold text-muted-foreground/40">—</p>
          <p className="text-[10px] text-muted-foreground/50 mt-2 leading-relaxed">
            {kpi.requiredTemplates.length > 0
              ? `Requiere plantilla${kpi.requiredTemplates.length > 1 ? "s" : ""}: ${kpi.requiredTemplates.join(", ")}`
              : kpi.description}
          </p>
        </CardContent>
      </Card>
    );
  }

  const config = ALERT_CONFIG[kpi.alert];
  const Icon = config.icon;

  return (
    <Card className={`${config.bg} ${config.border} border transition-all hover:shadow-md`}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-2">
          <p className="text-xs font-medium text-muted-foreground leading-tight max-w-[70%]">{kpi.name}</p>
          <Badge className={`${ALERT_BADGE[kpi.alert]} text-[10px] px-1.5 py-0 shrink-0`}>{config.label}</Badge>
        </div>
        <div className="flex items-end gap-2">
          <Icon className={`h-5 w-5 shrink-0 ${config.iconColor}`} />
          <span className="text-xl font-bold tracking-tight">{kpi.formatted}</span>
        </div>
        <p className="text-[10px] text-muted-foreground mt-2 leading-relaxed">{kpi.description}</p>
      </CardContent>
    </Card>
  );
}

// ── Main Page ───────────────────────────────────────────────────────────────────

export default function BIExpressPage() {
  const {
    selectedBIModel, selectedBIPeriod,
    disabledKPIs, disabledVisuals, result, setResult,
    t1Rows, hasCostData,
    t2Rows,
    t3Rows, t4Rows, t5Rows, t6Rows, t7Rows, t8Rows,
    loadedTemplates, manualInputs, deletedRowIndices, excludedGenericRows,
    resetSession,
  } = useBIExpressContext();
  const navigate = useNavigate();

  useEffect(() => {
    if (!selectedBIModel || !selectedBIPeriod) navigate("/bi-express");
  }, [selectedBIModel, selectedBIPeriod, navigate]);

  // Recalculate whenever data changes
  useEffect(() => {
    const activeT1 = t1Rows.filter((_, i) => !deletedRowIndices.has(i));
    if (activeT1.length === 0) { setResult(null); return; }
    const kpiResult = calculateKPIs({
      t1: activeT1,
      t2: t2Rows.filter((_, i) => !excludedGenericRows.T2?.has(i)).length > 0 ? t2Rows.filter((_, i) => !excludedGenericRows.T2?.has(i)) : undefined,
      t3: t3Rows.filter((_, i) => !excludedGenericRows.T3?.has(i)).length > 0 ? t3Rows.filter((_, i) => !excludedGenericRows.T3?.has(i)) : undefined,
      t4: t4Rows.filter((_, i) => !excludedGenericRows.T4?.has(i)).length > 0 ? t4Rows.filter((_, i) => !excludedGenericRows.T4?.has(i)) : undefined,
      t5: t5Rows.filter((_, i) => !excludedGenericRows.T5?.has(i)).length > 0 ? t5Rows.filter((_, i) => !excludedGenericRows.T5?.has(i)) : undefined,
      t6: t6Rows.filter((_, i) => !excludedGenericRows.T6?.has(i)).length > 0 ? t6Rows.filter((_, i) => !excludedGenericRows.T6?.has(i)) : undefined,
      t7: t7Rows.filter((_, i) => !excludedGenericRows.T7?.has(i)).length > 0 ? t7Rows.filter((_, i) => !excludedGenericRows.T7?.has(i)) : undefined,
      t8: t8Rows.filter((_, i) => !excludedGenericRows.T8?.has(i)).length > 0 ? t8Rows.filter((_, i) => !excludedGenericRows.T8?.has(i)) : undefined,
      manualInputs,
      loadedTemplates,
    });
    setResult(kpiResult);
  }, [
    t1Rows, t2Rows,
    t3Rows, t4Rows, t5Rows, t6Rows, t7Rows, t8Rows,
    deletedRowIndices, excludedGenericRows, manualInputs, loadedTemplates, setResult,
  ]);

  const visibleKPIs = result?.kpis.filter((k) => !disabledKPIs.has(k.id)) ?? [];
  const gamaA = visibleKPIs.filter((k) => k.gama === "A");
  const gamaB = visibleKPIs.filter((k) => k.gama === "B");
  const gamaC = visibleKPIs.filter((k) => k.gama === "C");
  const activeCount = visibleKPIs.filter((k) => k.available).length;
  const totalLoaded = loadedTemplates.size;

  return (
    <AppLayout>
      <PageHeader
        title="BI Express"
        description="Tablero de control estratégico — carga las plantillas que necesites y activa tus indicadores"
      >
        {totalLoaded > 0 && (
          <Button variant="outline" size="sm" onClick={resetSession}>
            <Trash2 className="h-4 w-4 mr-2" />Limpiar sesión
          </Button>
        )}
      </PageHeader>

      {/* Summary badges */}
      {totalLoaded > 0 && (
        <div className="flex flex-wrap gap-2 mb-6">
          <Badge variant="secondary" className="text-sm px-3 py-1">
            {totalLoaded} plantilla{totalLoaded !== 1 ? "s" : ""} cargada{totalLoaded !== 1 ? "s" : ""}
          </Badge>
          {result && (
            <>
              <Badge variant="secondary" className="text-sm px-3 py-1">
                {result.totalRows.toLocaleString()} registros (T1)
              </Badge>
              <Badge variant="secondary" className="text-sm px-3 py-1">
                {activeCount} KPIs activos
              </Badge>
            </>
          )}
          {!hasCostData && loadedTemplates.has("T1") && (
            <Badge variant="outline" className="text-sm px-3 py-1 border-amber-300 text-amber-700 dark:text-amber-400">
              Gama B desactivada (sin costos)
            </Badge>
          )}
        </div>
      )}

      {/* ── Empty state ───────────────────────────────────────────────────────── */}
      {!loadedTemplates.has("T1") && (
        <div className="flex flex-col items-center justify-center py-16 text-center text-muted-foreground border-2 border-dashed rounded-xl">
          <Upload className="h-12 w-12 mb-3 opacity-20" />
          <p className="text-base font-medium">No hay datos cargados</p>
          <p className="text-sm mt-1 mb-4">
            Ve a <strong>Plantillas</strong> para cargar la plantilla T1 y activar los indicadores.
          </p>
          <Button variant="outline" size="sm" onClick={() => navigate("/bi-express/catalog")}>
            Ir a Plantillas
          </Button>
        </div>
      )}

      {/* ── KPI Dashboard ─────────────────────────────────────────────────────── */}
      {result && (
        <div className="space-y-6">
          <Tabs defaultValue="comercial" className="space-y-4">
            <TabsList className="grid w-full grid-cols-3 max-w-lg">
              <TabsTrigger value="comercial" className="text-xs">
                <TrendingUp className="h-3.5 w-3.5 mr-1.5" />
                Comerciales ({gamaA.filter((k) => k.available).length})
              </TabsTrigger>
              <TabsTrigger value="financiero" className="text-xs">
                <DollarSign className="h-3.5 w-3.5 mr-1.5" />
                Financieros ({gamaB.filter((k) => k.available).length})
              </TabsTrigger>
              <TabsTrigger value="operativo" className="text-xs">
                <Settings2 className="h-3.5 w-3.5 mr-1.5" />
                Operativos ({gamaC.filter((k) => k.available).length})
              </TabsTrigger>
            </TabsList>

            {/* ── GAMA A ──────────────────────────────────────────────────────── */}
            <TabsContent value="comercial" className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {gamaA.map((kpi) => <KPICard key={kpi.id} kpi={kpi} />)}
              </div>

              {/* Tendencia Mensual */}
              {!disabledVisuals.has("chart_monthly_sales") && result.monthlyData.length > 1 && (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      <BarChart3 className="h-4 w-4" />Tendencia de Ventas Mensual
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={260}>
                      <LineChart data={result.monthlyData}>
                        <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                        <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                        <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                        <Tooltip
                          formatter={(v: number) => [v.toLocaleString("es-BO", { minimumFractionDigits: 2 }), "Ventas"]}
                          labelFormatter={(l) => `Período: ${l}`}
                        />
                        <Line type="monotone" dataKey="ventas" stroke="#10b981" strokeWidth={2.5} dot={{ fill: "#10b981", r: 4 }} />
                      </LineChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              )}

              {/* Venta por Categoría */}
              {!disabledVisuals.has("chart_category_sales") && result.categoryBreakdown.length > 0 && (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">Venta por Categoría</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={Math.max(200, result.categoryBreakdown.length * 38)}>
                      <BarChart data={result.categoryBreakdown} layout="vertical" margin={{ left: 80 }}>
                        <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                        <XAxis type="number" tick={{ fontSize: 11 }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                        <YAxis type="category" dataKey="category" tick={{ fontSize: 11 }} width={75} />
                        <Tooltip formatter={(v: number) => [v.toLocaleString("es-BO", { minimumFractionDigits: 2 }), "Ventas"]} />
                        <Bar dataKey="revenue" radius={[0, 4, 4, 0]}>
                          {result.categoryBreakdown.map((_, i) => <Cell key={i} fill={BAR_COLORS[i % BAR_COLORS.length]} />)}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              )}

              {/* Clientes Nuevos vs. Recurrentes (T2) */}
              {!disabledVisuals.has("chart_customer_segmentation") && result.customerSegmentation && (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">Clientes Nuevos vs. Recurrentes</CardTitle>
                    <CardDescription className="text-xs">columna id_cliente en T1</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={220}>
                      <PieChart>
                        <Pie
                          data={result.customerSegmentation}
                          dataKey="value" nameKey="label"
                          cx="50%" cy="50%" innerRadius={55} outerRadius={85} paddingAngle={3}
                        >
                          {result.customerSegmentation.map((_, i) => <Cell key={i} fill={DONUT_COLORS[i % DONUT_COLORS.length]} />)}
                        </Pie>
                        <Legend iconType="circle" />
                        <Tooltip formatter={(v: number) => [v.toLocaleString(), "clientes"]} />
                      </PieChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              )}

              {/* Venta por Región (T5) */}
              {!disabledVisuals.has("chart_region_sales") && result.regionData && (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">Venta por Región</CardTitle>
                    <CardDescription className="text-xs">columnas zona / region en T1</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={Math.max(180, result.regionData.length * 36)}>
                      <BarChart data={result.regionData} layout="vertical" margin={{ left: 80 }}>
                        <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                        <XAxis type="number" tick={{ fontSize: 11 }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                        <YAxis type="category" dataKey="region" tick={{ fontSize: 11 }} width={75} />
                        <Tooltip formatter={(v: number) => [v.toLocaleString("es-BO", { minimumFractionDigits: 2 }), "Ventas"]} />
                        <Bar dataKey="revenue" fill="#8b5cf6" radius={[0, 4, 4, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              )}

              {/* Posibles Stockouts */}
              {!disabledVisuals.has("table_stockouts") && result.stockoutDetail.length > 0 && (
                <Card className="border-red-200 dark:border-red-800">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-red-700 dark:text-red-300 flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4" />SKUs con posible Stockout
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="text-xs">SKU</TableHead>
                          <TableHead className="text-xs">Producto</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {result.stockoutDetail.map((row) => (
                          <TableRow key={row.sku}>
                            <TableCell className="text-xs font-mono">{row.sku}</TableCell>
                            <TableCell className="text-xs">{row.nombre}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            {/* ── GAMA B ──────────────────────────────────────────────────────── */}
            <TabsContent value="financiero" className="space-y-6">
              {!hasCostData ? (
                <Card className="border-dashed">
                  <CardContent className="p-8 text-center text-muted-foreground">
                    <DollarSign className="h-10 w-10 mx-auto mb-3 opacity-30" />
                    <p className="text-sm">Los indicadores financieros requieren la columna <code className="bg-muted px-1 rounded">costo_unitario</code> en la Plantilla T1.</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {gamaB.map((kpi) => <KPICard key={kpi.id} kpi={kpi} />)}
                </div>
              )}

              {/* Contribución Marginal Top 10 */}
              {!disabledVisuals.has("chart_contribution_top10") && hasCostData && result.contributionDetail.length > 0 && (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">Top 10 SKUs — Contribución Marginal</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={Math.max(200, result.contributionDetail.length * 38)}>
                      <BarChart data={result.contributionDetail} layout="vertical" margin={{ left: 100 }}>
                        <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                        <XAxis type="number" tick={{ fontSize: 11 }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                        <YAxis type="category" dataKey="nombre" tick={{ fontSize: 11 }} width={95} />
                        <Tooltip formatter={(v: number) => [v.toLocaleString("es-BO", { minimumFractionDigits: 2 }), "Contribución"]} />
                        <Bar dataKey="contribucion" radius={[0, 4, 4, 0]}>
                          {result.contributionDetail.map((d, i) => (
                            <Cell key={i} fill={d.contribucion >= 0 ? "#10b981" : "#ef4444"} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              )}

              {/* Waterfall (T6) */}
              {!disabledVisuals.has("chart_waterfall") && result.waterfallData && (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">Venta Bruta → Utilidad Neta</CardTitle>
                    <CardDescription className="text-xs">
                      columnas precio_lista / descuento_aplicado{result.loadedTemplates.has("T4") ? " · T4 — Devoluciones" : ""}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={240}>
                      <BarChart data={result.waterfallData} margin={{ left: 20 }}>
                        <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                        <XAxis dataKey="label" tick={{ fontSize: 10 }} />
                        <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                        <Tooltip formatter={(v: number) => [v.toLocaleString("es-BO", { minimumFractionDigits: 2 }), "Valor"]} />
                        <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                          {result.waterfallData.map((d, i) => (
                            <Cell key={i} fill={d.type === "total" ? "#3b82f6" : d.value < 0 ? "#ef4444" : "#10b981"} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              )}

              {/* Margen por Categoría */}
              {!disabledVisuals.has("table_margin_category") && hasCostData && result.marginBubbleData.length > 0 && (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">Margen por Categoría</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="text-xs">Categoría</TableHead>
                          <TableHead className="text-xs text-right">Ventas</TableHead>
                          <TableHead className="text-xs text-right">Margen %</TableHead>
                          <TableHead className="text-xs text-right">Contribución</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {[...result.marginBubbleData].sort((a, b) => b.contribution - a.contribution).map((row) => (
                          <TableRow key={row.category}>
                            <TableCell className="text-xs">{row.category}</TableCell>
                            <TableCell className="text-xs text-right">{row.revenue.toLocaleString("es-BO", { minimumFractionDigits: 0 })}</TableCell>
                            <TableCell className={`text-xs text-right font-medium ${
                              row.marginPct >= 40 ? "text-emerald-600" : row.marginPct >= 25 ? "text-amber-600" : "text-red-600"
                            }`}>
                              {row.marginPct.toFixed(1)}%
                            </TableCell>
                            <TableCell className="text-xs text-right">{row.contribution.toLocaleString("es-BO", { minimumFractionDigits: 0 })}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              )}

              {/* ROAS por campaña (T5) */}
              {!disabledVisuals.has("table_roas_campaign") && result.marketingData && (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">ROAS por Campaña</CardTitle>
                    <CardDescription className="text-xs">T9 — Plantilla de Marketing</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="text-xs">Campaña</TableHead>
                          <TableHead className="text-xs text-right">Ventas</TableHead>
                          <TableHead className="text-xs text-right">Gasto</TableHead>
                          <TableHead className="text-xs text-right">ROAS</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {result.marketingData.map((row) => (
                          <TableRow key={row.campaña}>
                            <TableCell className="text-xs">{row.campaña}</TableCell>
                            <TableCell className="text-xs text-right">{row.ventas.toLocaleString("es-BO", { minimumFractionDigits: 0 })}</TableCell>
                            <TableCell className="text-xs text-right">{row.gasto.toLocaleString("es-BO", { minimumFractionDigits: 0 })}</TableCell>
                            <TableCell className={`text-xs text-right font-medium ${
                              row.roas >= 4 ? "text-emerald-600" : row.roas >= 2 ? "text-amber-600" : "text-red-600"
                            }`}>
                              {row.roas.toFixed(2)}x
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            {/* ── GAMA C ──────────────────────────────────────────────────────── */}
            <TabsContent value="operativo" className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {gamaC.map((kpi) => <KPICard key={kpi.id} kpi={kpi} />)}
              </div>

              {/* Top 10 SKUs */}
              {!disabledVisuals.has("chart_top10_products") && result.topProducts.length > 0 && (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">Top 10 Productos — Ingresos</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={Math.max(200, result.topProducts.length * 38)}>
                      <BarChart data={result.topProducts} layout="vertical" margin={{ left: 100 }}>
                        <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                        <XAxis type="number" tick={{ fontSize: 11 }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                        <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={95} />
                        <Tooltip formatter={(v: number) => [v.toLocaleString("es-BO", { minimumFractionDigits: 2 }), "Ingresos"]} />
                        <Bar dataKey="revenue" radius={[0, 4, 4, 0]}>
                          {result.topProducts.map((_, i) => <Cell key={i} fill={BAR_COLORS[i % BAR_COLORS.length]} />)}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              )}

              {/* Clasificación ABC */}
              {!disabledVisuals.has("table_abc_classification") && result.abcDetail.length > 0 && (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">Clasificación ABC — Top 20 SKUs</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="text-xs">Clase</TableHead>
                          <TableHead className="text-xs">SKU</TableHead>
                          <TableHead className="text-xs">Producto</TableHead>
                          <TableHead className="text-xs text-right">Ingresos</TableHead>
                          <TableHead className="text-xs text-right">% Acum.</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {result.abcDetail.slice(0, 20).map((row) => (
                          <TableRow key={row.sku_id}>
                            <TableCell className="text-xs">
                              <Badge className={`text-[10px] px-1.5 py-0 ${
                                row.class === "A"
                                  ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200"
                                  : row.class === "B"
                                  ? "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200"
                                  : "bg-muted text-muted-foreground"
                              }`}>{row.class}</Badge>
                            </TableCell>
                            <TableCell className="text-xs font-mono">{row.sku_id}</TableCell>
                            <TableCell className="text-xs max-w-[160px] truncate">{row.name}</TableCell>
                            <TableCell className="text-xs text-right">{row.revenue.toLocaleString("es-BO", { minimumFractionDigits: 0 })}</TableCell>
                            <TableCell className="text-xs text-right text-muted-foreground">{row.pct_accumulated.toFixed(1)}%</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              )}

              {/* Antigüedad de Inventario (T3) */}
              {!disabledVisuals.has("chart_inventory_aging") && result.inventoryAgingData && (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">Antigüedad de Inventario</CardTitle>
                    <CardDescription className="text-xs">T7 — Plantilla de Inventario</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={200}>
                      <BarChart data={result.inventoryAgingData}>
                        <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                        <XAxis dataKey="bucket" tick={{ fontSize: 11 }} />
                        <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                        <Tooltip formatter={(v: number) => [v.toLocaleString("es-BO", { minimumFractionDigits: 0 }), "Valor a costo"]} />
                        <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                          {result.inventoryAgingData.map((_, i) => (
                            <Cell key={i} fill={AGING_COLORS[i] ?? "#ef4444"} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              )}
            </TabsContent>
          </Tabs>
        </div>
      )}
    </AppLayout>
  );
}
