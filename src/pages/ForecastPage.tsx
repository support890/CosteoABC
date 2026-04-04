import { useMemo } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { AppLayout } from "@/components/AppLayout";
import { PageHeader } from "@/components/PageHeader";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  ComposedChart,
  Line,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import {
  TrendingUp,
  TrendingDown,
  Minus,
  ShieldCheck,
  BarChart3,
  Download,
  Plus,
  Trash2,
  Upload,
  Copy,
  ArrowRight,
} from "lucide-react";
import {
  type AlgorithmType,
  SAMPLE_DATA,
  runForecast,
  generatePeriodLabels,
  fmtNumber,
  exportToCSV,
} from "@/lib/forecast-engine";
import { useForecastContext } from "@/contexts/ForecastContext";
import { toast } from "sonner";

export default function ForecastPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const isDataView = location.pathname === "/forecast/data";

  const {
    forecastData: data,
    setForecastData: setData,
    forecastEditingData: editingData,
    setForecastEditingData: setEditingData,
    forecastConfig: config,
    setForecastConfig: setConfig,
    forecastDataApplied: dataApplied,
    setForecastDataApplied: setDataApplied,
  } = useForecastContext();

  // ── Computed ───────────────────────────────────────────────────────────────
  const results = useMemo(() => runForecast(data, config), [data, config]);

  const chartData = useMemo(() => {
    if (data.length === 0) return results.points;
    const lastPeriod = data[data.length - 1].period;
    const labels = generatePeriodLabels(lastPeriod, config.forecastPeriods);
    return results.points.map((p) => {
      const match = p.period.match(/^P\+(\d+)$/);
      if (match) {
        const idx = parseInt(match[1], 10) - 1;
        return { ...p, period: labels[idx] || p.period };
      }
      return p;
    });
  }, [results.points, data, config.forecastPeriods]);

  const forecastRows = chartData.filter((p) => !p.isHistorical);

  // ── Handlers ───────────────────────────────────────────────────────────────
  const handleApplyData = () => {
    const valid = editingData.filter((p) => p.period.trim() && p.value > 0);
    if (valid.length < 2) {
      toast.error("Se necesitan al menos 2 períodos con valores para generar el forecast");
      return;
    }
    setData(valid);
    setDataApplied(true);
    toast.success(`${valid.length} períodos cargados correctamente`);
    navigate("/forecast/results");
  };

  const handleAddRow = () => {
    setEditingData([...editingData, { period: "", value: 0 }]);
  };

  const handleRemoveRow = (index: number) => {
    setEditingData(editingData.filter((_, i) => i !== index));
  };

  const handleLoadSample = () => {
    setEditingData([...SAMPLE_DATA]);
    setData([...SAMPLE_DATA]);
    setDataApplied(true);
    toast.success("Datos de ejemplo cargados");
  };

  const handleExportCSV = () => {
    const csv = exportToCSV(chartData);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "forecast_export.csv";
    link.click();
    URL.revokeObjectURL(url);
    toast.success("CSV exportado");
  };

  const handleCopyTable = () => {
    const header = "Periodo\tForecast\tLímite Inf.\tLímite Sup.";
    const rows = forecastRows
      .map((r) => `${r.period}\t${fmtNumber(r.forecast ?? 0, 2)}\t${fmtNumber(r.lowerBound ?? 0, 2)}\t${fmtNumber(r.upperBound ?? 0, 2)}`)
      .join("\n");
    navigator.clipboard.writeText(`${header}\n${rows}`);
    toast.success("Tabla copiada al portapapeles");
  };

  const handlePasteData = async () => {
    try {
      const text = await navigator.clipboard.readText();
      const lines = text.trim().split("\n");
      const parsed = [];
      for (const line of lines) {
        const parts = line.split(/[\t,;]+/);
        if (parts.length >= 2) {
          const period = parts[0].trim();
          const value = parseFloat(parts[1].replace(/[^\d.-]/g, ""));
          if (period && !isNaN(value)) {
            parsed.push({ period, value });
          }
        }
      }
      if (parsed.length > 0) {
        setEditingData(parsed);
        setDataApplied(false);
        toast.success(`${parsed.length} filas pegadas desde el portapapeles`);
      } else {
        toast.error("No se encontraron datos válidos en el portapapeles");
      }
    } catch {
      toast.error("No se pudo leer el portapapeles");
    }
  };

  // ── Trend ──────────────────────────────────────────────────────────────────
  const TrendIcon =
    results.trendDirection === "up" ? TrendingUp :
    results.trendDirection === "down" ? TrendingDown : Minus;
  const trendColor =
    results.trendDirection === "up" ? "text-emerald-600" :
    results.trendDirection === "down" ? "text-red-600" : "text-amber-600";

  const algorithmLabels: Record<AlgorithmType, string> = {
    moving_average: "Promedio Móvil Simple",
    holt_winters: "Suavizamiento Exponencial (Holt-Winters)",
    linear_regression: "Regresión Lineal",
  };

  // ══════════════════════════════════════════════════════════════════════════
  // VISTA: DATOS DE ENTRADA
  // ══════════════════════════════════════════════════════════════════════════
  if (isDataView) {
    return (
      <AppLayout>
        <div className="flex flex-col gap-6">
          <PageHeader
            title="Datos de Entrada"
            description="Serie de tiempo histórica para el modelo de forecast"
          />

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* ── Input Table ────────────────────────────────────────────── */}
            <div className="lg:col-span-2">
              <Card>
                <CardHeader className="pb-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <CardTitle className="text-base">Serie de Tiempo Histórica</CardTitle>
                      <CardDescription>
                        Ingresa los datos por período — mínimo 2 filas con valor mayor a cero
                      </CardDescription>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={handlePasteData}>
                        <Upload className="h-3.5 w-3.5 mr-1" />
                        Pegar
                      </Button>
                      <Button variant="outline" size="sm" onClick={handleLoadSample}>
                        Ejemplo
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-[1fr_1fr_auto] gap-2 mb-2 px-1">
                    <Label className="text-xs text-muted-foreground">Período</Label>
                    <Label className="text-xs text-muted-foreground">Valor</Label>
                    <div className="w-8" />
                  </div>

                  <div className="space-y-2 max-h-[440px] overflow-y-auto pr-2">
                    {editingData.map((row, i) => (
                      <div key={i} className="grid grid-cols-[1fr_1fr_auto] gap-2 items-center">
                        <Input
                          placeholder="Ej. Ene-24"
                          value={row.period}
                          onChange={(e) => {
                            const updated = [...editingData];
                            updated[i] = { ...updated[i], period: e.target.value };
                            setEditingData(updated);
                            setDataApplied(false);
                          }}
                        />
                        <Input
                          type="number"
                          placeholder="0"
                          value={row.value || ""}
                          onChange={(e) => {
                            const updated = [...editingData];
                            updated[i] = { ...updated[i], value: parseFloat(e.target.value) || 0 };
                            setEditingData(updated);
                            setDataApplied(false);
                          }}
                        />
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-destructive"
                          onClick={() => handleRemoveRow(i)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    ))}
                  </div>

                  <div className="flex items-center gap-2 mt-4 pt-4 border-t">
                    <Button variant="outline" size="sm" onClick={handleAddRow}>
                      <Plus className="h-3.5 w-3.5 mr-1" />
                      Agregar Fila
                    </Button>
                    <Button size="sm" onClick={handleApplyData} className="gap-2">
                      Aplicar y Ver Resultados
                      <ArrowRight className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* ── Side Panel ─────────────────────────────────────────────── */}
            <div className="space-y-4">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Resumen de Datos</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Filas ingresadas</span>
                    <span className="font-medium">{editingData.length}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Filas válidas</span>
                    <span className="font-medium text-emerald-600">
                      {editingData.filter((p) => p.period.trim() && p.value > 0).length}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Estado</span>
                    <Badge variant={dataApplied ? "default" : "secondary"} className="text-xs">
                      {dataApplied ? "Aplicado" : "Pendiente"}
                    </Badge>
                  </div>
                  {editingData.filter((p) => p.value > 0).length > 0 && (
                    <div className="border-t pt-3 space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Mínimo</span>
                        <span className="font-medium">
                          {fmtNumber(Math.min(...editingData.filter(p => p.value > 0).map(p => p.value)), 0)}
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Máximo</span>
                        <span className="font-medium">
                          {fmtNumber(Math.max(...editingData.filter(p => p.value > 0).map(p => p.value)), 0)}
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Promedio</span>
                        <span className="font-medium">
                          {fmtNumber(
                            editingData.filter(p => p.value > 0).reduce((s, p) => s + p.value, 0) /
                            editingData.filter(p => p.value > 0).length,
                            0
                          )}
                        </span>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card className="bg-muted/30">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Formato para Pegar</CardTitle>
                </CardHeader>
                <CardContent className="text-xs text-muted-foreground space-y-1">
                  <p>Copia desde Excel con dos columnas:</p>
                  <code className="block bg-background rounded p-2 mt-2 font-mono text-xs">
                    Ene-24  1200<br />
                    Feb-24  1350<br />
                    Mar-24  1180
                  </code>
                  <p className="pt-1">Separadores aceptados: tab, coma o punto y coma.</p>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </AppLayout>
    );
  }

  // ══════════════════════════════════════════════════════════════════════════
  // VISTA: RESULTADOS Y PARÁMETROS
  // ══════════════════════════════════════════════════════════════════════════
  return (
    <AppLayout>
      <div className="flex flex-col gap-6">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
          <PageHeader
            title="Resultados del Forecast"
            description="Proyección predictiva basada en datos históricos"
          />
          <Button variant="outline" size="sm" onClick={handleExportCSV} className="shrink-0">
            <Download className="h-4 w-4 mr-2" />
            Exportar CSV
          </Button>
        </div>

        {/* ── KPI Cards ────────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Confiabilidad del Modelo</p>
                  <p className="text-3xl font-bold mt-1">{fmtNumber(results.reliability)}%</p>
                  <p className="text-xs text-muted-foreground mt-1">MAPE: {fmtNumber(results.mape)}%</p>
                </div>
                <div className="p-3 bg-primary/10 rounded-full">
                  <ShieldCheck className="h-6 w-6 text-primary" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Crecimiento Proyectado</p>
                  <p className={`text-3xl font-bold mt-1 ${trendColor}`}>
                    {results.trend > 0 ? "+" : ""}{fmtNumber(results.trend)}%
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">vs. promedio reciente</p>
                </div>
                <div className={`p-3 rounded-full ${results.trendDirection === "up" ? "bg-emerald-100" : results.trendDirection === "down" ? "bg-red-100" : "bg-amber-100"}`}>
                  <TrendIcon className={`h-6 w-6 ${trendColor}`} />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Promedio Forecast</p>
                  <p className="text-3xl font-bold mt-1">{fmtNumber(results.avgForecast, 0)}</p>
                  <p className="text-xs text-muted-foreground mt-1">{config.forecastPeriods} períodos proyectados</p>
                </div>
                <div className="p-3 bg-blue-100 rounded-full">
                  <BarChart3 className="h-6 w-6 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* ── Sidebar + Chart/Table ─────────────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Parámetros */}
          <Card className="lg:col-span-1 h-fit">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Parámetros del Modelo</CardTitle>
              <CardDescription>Ajusta los controles para recalcular en tiempo real</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="space-y-2">
                <Label className="text-xs">Algoritmo</Label>
                <Select
                  value={config.algorithm}
                  onValueChange={(val: AlgorithmType) => setConfig({ ...config, algorithm: val })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="holt_winters">Holt-Winters</SelectItem>
                    <SelectItem value="moving_average">Promedio Móvil</SelectItem>
                    <SelectItem value="linear_regression">Regresión Lineal</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {config.algorithm === "moving_average" && (
                <div className="space-y-2">
                  <Label className="text-xs flex justify-between">
                    Ventana Móvil
                    <span className="text-muted-foreground">{config.movingAverageWindow}</span>
                  </Label>
                  <Slider
                    min={2}
                    max={Math.min(10, data.length)}
                    step={1}
                    value={[config.movingAverageWindow]}
                    onValueChange={([v]) => setConfig({ ...config, movingAverageWindow: v })}
                  />
                </div>
              )}

              <div className="space-y-2">
                <Label className="text-xs flex justify-between">
                  Períodos a Proyectar
                  <span className="text-muted-foreground">{config.forecastPeriods}</span>
                </Label>
                <Slider
                  min={1}
                  max={10}
                  step={1}
                  value={[config.forecastPeriods]}
                  onValueChange={([v]) => setConfig({ ...config, forecastPeriods: v })}
                />
              </div>

              <div className="space-y-2">
                <Label className="text-xs">Nivel de Confianza</Label>
                <Select
                  value={config.confidenceLevel.toString()}
                  onValueChange={(val) => setConfig({ ...config, confidenceLevel: parseInt(val, 10) })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="90">90%</SelectItem>
                    <SelectItem value="95">95%</SelectItem>
                    <SelectItem value="99">99%</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-xs flex justify-between">
                  Factor de Ajuste
                  <span className="text-muted-foreground">{config.seasonalityFactor.toFixed(2)}x</span>
                </Label>
                <Slider
                  min={0.5}
                  max={2.0}
                  step={0.05}
                  value={[config.seasonalityFactor]}
                  onValueChange={([v]) => setConfig({ ...config, seasonalityFactor: v })}
                />
                <p className="text-[10px] text-muted-foreground">
                  Multiplicador para inyectar know-how comercial (ej. 1.2x para campaña agresiva)
                </p>
              </div>

              <div className="pt-2 border-t">
                <div className="text-xs space-y-1 text-muted-foreground">
                  <p><strong>Algoritmo:</strong> {algorithmLabels[config.algorithm]}</p>
                  <p><strong>Confianza:</strong> {config.confidenceLevel}%</p>
                  <p><strong>Datos:</strong> {data.length} períodos históricos</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Gráfica + Tabla */}
          <div className="lg:col-span-3 space-y-6">
            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">Gráfica Predictiva</CardTitle>
                  <Badge variant="outline" className="text-xs">
                    {algorithmLabels[config.algorithm]}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="h-[360px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis dataKey="period" tick={{ fontSize: 11 }} className="text-muted-foreground" />
                      <YAxis tick={{ fontSize: 11 }} className="text-muted-foreground" />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "hsl(var(--card))",
                          border: "1px solid hsl(var(--border))",
                          borderRadius: "8px",
                          fontSize: "12px",
                        }}
                        formatter={(value: number, name: string) => {
                          const labels: Record<string, string> = {
                            value: "Histórico",
                            forecast: "Forecast",
                            upperBound: "Límite Superior",
                            lowerBound: "Límite Inferior",
                          };
                          return [fmtNumber(value, 2), labels[name] || name];
                        }}
                      />
                      <Legend
                        formatter={(value: string) => {
                          const labels: Record<string, string> = {
                            value: "Datos Históricos",
                            forecast: "Proyección",
                            confidence: "Intervalo de Confianza",
                          };
                          return labels[value] || value;
                        }}
                      />
                      <Area type="monotone" dataKey="upperBound" stroke="none" fill="hsl(var(--primary))" fillOpacity={0.08} name="confidence" />
                      <Area type="monotone" dataKey="lowerBound" stroke="none" fill="hsl(var(--background))" fillOpacity={1} name="lowerBound" legendType="none" />
                      <Line type="monotone" dataKey="value" stroke="hsl(var(--foreground))" strokeWidth={2.5} dot={{ r: 4, fill: "hsl(var(--foreground))" }} connectNulls={false} name="value" />
                      <Line type="monotone" dataKey="forecast" stroke="hsl(var(--primary))" strokeWidth={2.5} strokeDasharray="8 4" dot={{ r: 4, fill: "hsl(var(--primary))", strokeWidth: 2 }} connectNulls={false} name="forecast" />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">Períodos Proyectados</CardTitle>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={handleCopyTable}>
                      <Copy className="h-3.5 w-3.5 mr-1" />
                      Copiar
                    </Button>
                    <Button variant="outline" size="sm" onClick={handleExportCSV}>
                      <Download className="h-3.5 w-3.5 mr-1" />
                      CSV
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Período</TableHead>
                      <TableHead className="text-right">Límite Inferior</TableHead>
                      <TableHead className="text-right font-semibold">Valor Central</TableHead>
                      <TableHead className="text-right">Límite Superior</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {forecastRows.map((row, i) => (
                      <TableRow key={i}>
                        <TableCell className="font-medium">{row.period}</TableCell>
                        <TableCell className="text-right text-muted-foreground">
                          {fmtNumber(row.lowerBound ?? 0, 2)}
                        </TableCell>
                        <TableCell className="text-right font-semibold text-primary">
                          {fmtNumber(row.forecast ?? 0, 2)}
                        </TableCell>
                        <TableCell className="text-right text-muted-foreground">
                          {fmtNumber(row.upperBound ?? 0, 2)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                <div className="mt-4 p-3 bg-muted/30 rounded-md border text-sm text-muted-foreground">
                  <strong>Resumen de Supuestos:</strong> Escenario base calculado con modelo{" "}
                  {algorithmLabels[config.algorithm]}, nivel de confianza del {config.confidenceLevel}%
                  {config.seasonalityFactor !== 1
                    ? ` y factor de ajuste manual de ${config.seasonalityFactor.toFixed(2)}x`
                    : ""}.
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
