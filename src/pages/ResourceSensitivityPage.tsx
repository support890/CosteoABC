import { useState, useMemo, useCallback } from "react";
import { AppLayout } from "@/components/AppLayout";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Loader2,
  RotateCcw,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  FlaskConical,
  DollarSign,
  TrendingUp,
} from "lucide-react";
import { useAllocation, type AllocationEntry } from "@/hooks/use-allocation";
import { useCurrency } from "@/hooks/use-currency";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  ReferenceLine,
  Legend,
} from "recharts";

/* ───── Helpers ───── */
const fmtShort = (n: number) => {
  if (Math.abs(n) >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (Math.abs(n) >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toFixed(0);
};

const fmtPct = (n: number) => {
  if (!isFinite(n)) return "N/A";
  const sign = n > 0 ? "+" : "";
  return `${sign}${n.toFixed(1)}%`;
};

/* ───── Variation Icon ───── */
function VariationIcon({ diff }: { diff: number }) {
  if (Math.abs(diff) < 0.01)
    return <Minus className="h-3 w-3 text-muted-foreground" />;
  if (diff > 0) return <ArrowUpRight className="h-3 w-3 text-red-500" />;
  return <ArrowDownRight className="h-3 w-3 text-emerald-500" />;
}

/* ───── Stat Card ───── */
function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  color,
}: {
  title: string;
  value: string;
  subtitle?: string;
  icon: React.ElementType;
  color: string;
}) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center gap-3">
          <div
            className={`h-10 w-10 rounded-lg ${color} flex items-center justify-center`}
          >
            <Icon className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">{title}</p>
            <p className="text-lg font-bold font-mono">{value}</p>
            {subtitle && (
              <p className="text-[10px] text-muted-foreground">{subtitle}</p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

/* ───── Main Page ───── */
const ResourceSensitivityPage = () => {
  const allocation = useAllocation();
  const { fmt } = useCurrency();
  // Map of resource id → simulated amount
  const [simAmounts, setSimAmounts] = useState<Record<string, number>>({});

  const handleSliderChange = useCallback(
    (resourceId: string, value: number[]) => {
      setSimAmounts((prev) => ({ ...prev, [resourceId]: value[0] }));
    },
    [],
  );

  const handleInputChange = useCallback(
    (resourceId: string, value: string) => {
      const num = parseFloat(value);
      if (!isNaN(num) && num >= 0) {
        setSimAmounts((prev) => ({ ...prev, [resourceId]: num }));
      }
    },
    [],
  );

  const handleReset = useCallback(() => {
    setSimAmounts({});
  }, []);

  const hasChanges = Object.keys(simAmounts).length > 0;

  // Build the resource → cost object impact matrix
  // For each resource, trace through allocations to see which cost objects it affects
  const resourceImpactMatrix = useMemo(() => {
    const allocs = allocation.allocations;

    // Build: resource_id → [{ costObjectId, costObjectName, percentage_through }]
    // A resource reaches a cost object through:
    //   resource → (driver %) → activity → (driver %) → cost_object
    // The effective % = stage1% * stage2%

    // Stage 1: resource → activity mapping
    const resActMap = new Map<
      string,
      { actId: string; actName: string; pct: number }[]
    >();
    for (const a of allocs) {
      if (
        (a.source_type === "resource" || a.source_type === "resource_center") &&
        (a.destination_type === "activity" ||
          a.destination_type === "activity_center")
      ) {
        if (!resActMap.has(a.source_id)) resActMap.set(a.source_id, []);
        resActMap.get(a.source_id)!.push({
          actId: a.destination_id,
          actName: a.destination_name,
          pct: a.percentage,
        });
      }
    }

    // Stage 2: activity → cost_object mapping
    const actCOMap = new Map<
      string,
      { coId: string; coName: string; coCode: string; pct: number }[]
    >();
    for (const a of allocs) {
      if (
        (a.source_type === "activity" ||
          a.source_type === "activity_center") &&
        (a.destination_type === "cost_object" ||
          a.destination_type === "cost_object_center")
      ) {
        if (!actCOMap.has(a.source_id)) actCOMap.set(a.source_id, []);
        actCOMap.get(a.source_id)!.push({
          coId: a.destination_id,
          coName: a.destination_name,
          coCode: a.destination_code,
          pct: a.percentage,
        });
      }
    }

    // For each resource, calculate effective % to each cost object
    const matrix = new Map<
      string,
      Map<string, { coName: string; coCode: string; effectivePct: number }>
    >();

    for (const resource of allocation.resources) {
      const coEffects = new Map<
        string,
        { coName: string; coCode: string; effectivePct: number }
      >();

      // Direct resource → cost_object allocations
      for (const a of allocs) {
        if (
          a.source_id === resource.id &&
          (a.source_type === "resource" ||
            a.source_type === "resource_center") &&
          (a.destination_type === "cost_object" ||
            a.destination_type === "cost_object_center")
        ) {
          const existing = coEffects.get(a.destination_id);
          if (existing) {
            existing.effectivePct += a.percentage;
          } else {
            coEffects.set(a.destination_id, {
              coName: a.destination_name,
              coCode: a.destination_code,
              effectivePct: a.percentage,
            });
          }
        }
      }

      // Resource → Activity → Cost Object (two-stage)
      const actLinks = resActMap.get(resource.id) || [];
      for (const actLink of actLinks) {
        const coLinks = actCOMap.get(actLink.actId) || [];
        for (const coLink of coLinks) {
          // effective% = stage1% * stage2% / 100
          const effectivePct = (actLink.pct * coLink.pct) / 100;
          const existing = coEffects.get(coLink.coId);
          if (existing) {
            existing.effectivePct += effectivePct;
          } else {
            coEffects.set(coLink.coId, {
              coName: coLink.coName,
              coCode: coLink.coCode,
              effectivePct,
            });
          }
        }
      }

      if (coEffects.size > 0) {
        matrix.set(resource.id, coEffects);
      }
    }

    return matrix;
  }, [allocation.allocations, allocation.resources]);

  // Simulate: recalculate cost object totals with adjusted resource amounts
  const simulation = useMemo(() => {
    if (!hasChanges) return null;

    // Original cost per cost object (from allocations)
    const originalCO: Record<string, number> = {};
    const simCO: Record<string, number> = {};

    // For each resource, calculate its contribution to each cost object
    for (const resource of allocation.resources) {
      const originalAmount = resource.amount;
      const simAmount = simAmounts[resource.id] ?? originalAmount;
      const coEffects = resourceImpactMatrix.get(resource.id);

      if (!coEffects) continue;

      for (const [coId, effect] of coEffects) {
        const origContribution = (originalAmount * effect.effectivePct) / 100;
        const simContribution = (simAmount * effect.effectivePct) / 100;

        originalCO[coId] = (originalCO[coId] || 0) + origContribution;
        simCO[coId] = (simCO[coId] || 0) + simContribution;
      }
    }

    const allCOIds = new Set([
      ...Object.keys(originalCO),
      ...Object.keys(simCO),
    ]);

    const impacts: {
      id: string;
      code: string;
      name: string;
      original: number;
      simulated: number;
      diff: number;
      diffPct: number;
    }[] = [];

    for (const coId of allCOIds) {
      const orig = originalCO[coId] || 0;
      const sim = simCO[coId] || 0;
      const diff = sim - orig;
      if (Math.abs(diff) < 0.001) continue;

      const summary = allocation.costObjectSummaries.find(
        (s) => s.id === coId,
      );

      impacts.push({
        id: coId,
        code: summary?.code || "",
        name: summary?.name || coId,
        original: orig,
        simulated: sim,
        diff,
        diffPct: orig > 0 ? (diff / orig) * 100 : 0,
      });
    }

    const totalOriginal = Object.values(originalCO).reduce(
      (s, v) => s + v,
      0,
    );
    const totalSimulated = Object.values(simCO).reduce((s, v) => s + v, 0);
    const totalDiff = totalSimulated - totalOriginal;

    return {
      impacts: impacts.sort((a, b) => Math.abs(b.diff) - Math.abs(a.diff)),
      totalOriginal,
      totalSimulated,
      totalDiff,
      totalDiffPct: totalOriginal > 0 ? (totalDiff / totalOriginal) * 100 : 0,
    };
  }, [
    hasChanges,
    simAmounts,
    allocation.resources,
    allocation.costObjectSummaries,
    resourceImpactMatrix,
  ]);

  // Resources that have impact on cost objects (sorted by amount)
  const impactfulResources = useMemo(
    () =>
      allocation.resources
        .filter((r) => resourceImpactMatrix.has(r.id))
        .sort((a, b) => b.amount - a.amount),
    [allocation.resources, resourceImpactMatrix],
  );

  if (allocation.isLoading) {
    return (
      <AppLayout>
        <PageHeader
          title="Sensibilidad de Recursos"
          description="Simula cambios en recursos y observa el impacto en objetos de costo"
        />
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      </AppLayout>
    );
  }

  if (impactfulResources.length === 0) {
    return (
      <AppLayout>
        <PageHeader
          title="Sensibilidad de Recursos"
          description="Simula cambios en recursos y observa el impacto en objetos de costo"
        />
        <Card className="border-dashed">
          <CardContent className="py-12 text-center text-muted-foreground">
            <FlaskConical className="h-8 w-8 mx-auto mb-3 opacity-40" />
            <p className="text-sm">
              No hay recursos con asignaciones a objetos de costo.
            </p>
            <p className="text-xs mt-1">
              Configura drivers para conectar recursos con actividades y objetos
              de costo.
            </p>
          </CardContent>
        </Card>
      </AppLayout>
    );
  }

  // Max amount for slider range (2x the largest resource)
  const maxSliderValue = Math.max(
    ...impactfulResources.map((r) => r.amount),
  ) * 2;

  // Summary totals
  const totalOriginalResources = impactfulResources.reduce(
    (s, r) => s + r.amount,
    0,
  );
  const totalSimResources = impactfulResources.reduce(
    (s, r) => s + (simAmounts[r.id] ?? r.amount),
    0,
  );
  const resourceDiff = totalSimResources - totalOriginalResources;

  // Impact chart data
  const impactChartData = simulation
    ? simulation.impacts.slice(0, 12).map((impact) => ({
        name:
          impact.name.length > 18
            ? impact.name.slice(0, 15) + "..."
            : impact.name,
        fullName: impact.name,
        value: impact.diff,
        fill: impact.diff > 0 ? "#ef4444" : "#22c55e",
      }))
    : [];

  // Comparison chart: original vs simulated per cost object
  const compareChartData = simulation
    ? simulation.impacts.slice(0, 10).map((impact) => ({
        name:
          impact.name.length > 15
            ? impact.name.slice(0, 12) + "..."
            : impact.name,
        fullName: impact.name,
        Original: impact.original,
        Simulado: impact.simulated,
      }))
    : [];

  return (
    <AppLayout>
      <PageHeader
        title="Sensibilidad de Recursos → Objetos de Costo"
        description="Ajusta el monto de los recursos y observa en tiempo real cómo impacta el costo de cada objeto de costo"
      />

      {/* Summary cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <StatCard
          title="Recursos con impacto"
          value={String(impactfulResources.length)}
          subtitle={`de ${allocation.resources.length} totales`}
          icon={DollarSign}
          color="bg-blue-500/10 text-blue-600"
        />
        <StatCard
          title="Costo original recursos"
          value={fmt(totalOriginalResources)}
          icon={DollarSign}
          color="bg-violet-500/10 text-violet-600"
        />
        <StatCard
          title="Costo simulado recursos"
          value={fmt(totalSimResources)}
          subtitle={hasChanges ? fmtPct((resourceDiff / totalOriginalResources) * 100) : "Sin cambios"}
          icon={FlaskConical}
          color={
            !hasChanges
              ? "bg-muted text-muted-foreground"
              : resourceDiff > 0
                ? "bg-red-500/10 text-red-600"
                : "bg-emerald-500/10 text-emerald-600"
          }
        />
        <StatCard
          title="Impacto en obj. costo"
          value={simulation ? fmt(simulation.totalDiff) : "—"}
          subtitle={simulation ? fmtPct(simulation.totalDiffPct) : "Ajustá recursos para simular"}
          icon={TrendingUp}
          color={
            !simulation
              ? "bg-muted text-muted-foreground"
              : simulation.totalDiff > 0
                ? "bg-red-500/10 text-red-600"
                : "bg-emerald-500/10 text-emerald-600"
          }
        />
      </div>

      <div className="space-y-6">
        {/* Resource adjustment panel */}
        <Card>
          <CardHeader className="p-3 pb-2">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-sm flex items-center gap-2">
                  <FlaskConical className="h-4 w-4" />
                  Ajustar montos de recursos
                </CardTitle>
                <p className="text-[10px] text-muted-foreground mt-1">
                  Mueve los controles o escribe un valor para simular cambios
                </p>
              </div>
              {hasChanges && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleReset}
                  className="text-xs"
                >
                  <RotateCcw className="h-3 w-3 mr-1" />
                  Restaurar todo
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent className="p-4">
            <div className="space-y-4">
              {impactfulResources.map((resource) => {
                const simVal = simAmounts[resource.id] ?? resource.amount;
                const changed = Math.abs(simVal - resource.amount) > 0.01;
                const changePct =
                  resource.amount > 0
                    ? ((simVal - resource.amount) / resource.amount) * 100
                    : 0;

                return (
                  <div key={resource.id} className="space-y-1.5">
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        <Badge variant="outline" className="text-[10px] shrink-0">
                          {resource.code}
                        </Badge>
                        <span className="text-xs font-medium truncate">
                          {resource.name}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {changed && (
                          <span className="text-[10px] text-muted-foreground line-through">
                            {fmt(resource.amount)}
                          </span>
                        )}
                        <div className="relative w-28">
                          <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                            $
                          </span>
                          <Input
                            type="number"
                            value={simVal.toFixed(2)}
                            onChange={(e) =>
                              handleInputChange(resource.id, e.target.value)
                            }
                            className="h-7 text-xs font-mono pl-5 pr-2"
                            min={0}
                            step={0.01}
                          />
                        </div>
                        {changed && (
                          <Badge
                            variant={changePct > 0 ? "destructive" : "default"}
                            className="text-[10px] font-mono w-16 justify-center"
                          >
                            {fmtPct(changePct)}
                          </Badge>
                        )}
                      </div>
                    </div>
                    <Slider
                      value={[simVal]}
                      onValueChange={(v) =>
                        handleSliderChange(resource.id, v)
                      }
                      min={0}
                      max={Math.max(resource.amount * 2, 100)}
                      step={resource.amount > 1000 ? 10 : resource.amount > 100 ? 1 : 0.01}
                      className="w-full"
                    />
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* No changes message */}
        {!hasChanges && (
          <Card className="border-dashed">
            <CardContent className="py-8 text-center text-muted-foreground">
              <p className="text-xs">
                Ajustá los montos de los recursos con los controles de arriba
                para ver cómo cambian los costos de los objetos de costo.
              </p>
            </CardContent>
          </Card>
        )}

        {/* Impact results */}
        {simulation && simulation.impacts.length > 0 && (
          <>
            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Variation waterfall */}
              <Card>
                <CardHeader className="p-3 pb-0">
                  <CardTitle className="text-sm">
                    Variación en objetos de costo
                  </CardTitle>
                  <p className="text-[10px] text-muted-foreground">
                    Cambio absoluto por objeto de costo
                  </p>
                </CardHeader>
                <CardContent className="p-2">
                  <ResponsiveContainer width="100%" height={320}>
                    <BarChart
                      data={impactChartData}
                      margin={{ top: 5, right: 10, left: 10, bottom: 60 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                      <XAxis
                        dataKey="name"
                        angle={-45}
                        textAnchor="end"
                        interval={0}
                        tick={{ fontSize: 9 }}
                        height={80}
                      />
                      <YAxis tickFormatter={fmtShort} tick={{ fontSize: 10 }} />
                      <Tooltip
                        formatter={(value: number) => fmt(value)}
                        labelFormatter={(_, payload) =>
                          payload?.[0]?.payload?.fullName ?? ""
                        }
                      />
                      <ReferenceLine y={0} stroke="#888" />
                      <Bar
                        dataKey="value"
                        name="Variación"
                        radius={[4, 4, 0, 0]}
                      >
                        {impactChartData.map((entry, i) => (
                          <Cell key={i} fill={entry.fill} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Comparison: original vs simulated */}
              <Card>
                <CardHeader className="p-3 pb-0">
                  <CardTitle className="text-sm">
                    Original vs. Simulado
                  </CardTitle>
                  <p className="text-[10px] text-muted-foreground">
                    Costo recibido por objeto de costo
                  </p>
                </CardHeader>
                <CardContent className="p-2">
                  <ResponsiveContainer width="100%" height={320}>
                    <BarChart
                      data={compareChartData}
                      margin={{ top: 5, right: 10, left: 10, bottom: 60 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                      <XAxis
                        dataKey="name"
                        angle={-45}
                        textAnchor="end"
                        interval={0}
                        tick={{ fontSize: 9 }}
                        height={80}
                      />
                      <YAxis tickFormatter={fmtShort} tick={{ fontSize: 10 }} />
                      <Tooltip
                        formatter={(value: number) => fmt(value)}
                        labelFormatter={(_, payload) =>
                          payload?.[0]?.payload?.fullName ?? ""
                        }
                      />
                      <Legend wrapperStyle={{ fontSize: "11px" }} />
                      <Bar
                        dataKey="Original"
                        fill="#94a3b8"
                        radius={[4, 4, 0, 0]}
                      />
                      <Bar
                        dataKey="Simulado"
                        fill="#3b82f6"
                        radius={[4, 4, 0, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>

            {/* Impact detail table */}
            <Card>
              <CardHeader className="p-3 pb-2">
                <CardTitle className="text-sm">
                  Detalle del impacto en objetos de costo
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-20">Código</TableHead>
                      <TableHead>Objeto de costo</TableHead>
                      <TableHead className="text-right">
                        Costo original
                      </TableHead>
                      <TableHead className="text-right">
                        Costo simulado
                      </TableHead>
                      <TableHead className="text-right">Variación</TableHead>
                      <TableHead className="text-right w-20">
                        % Var.
                      </TableHead>
                      <TableHead className="w-8" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {simulation.impacts.map((impact) => (
                      <TableRow key={impact.id}>
                        <TableCell className="font-mono text-xs">
                          {impact.code}
                        </TableCell>
                        <TableCell className="text-sm font-medium">
                          {impact.name}
                        </TableCell>
                        <TableCell className="text-right font-mono text-xs">
                          {fmt(impact.original)}
                        </TableCell>
                        <TableCell className="text-right font-mono text-xs">
                          {fmt(impact.simulated)}
                        </TableCell>
                        <TableCell
                          className={`text-right font-mono text-xs font-semibold ${
                            impact.diff > 0
                              ? "text-red-600"
                              : impact.diff < 0
                                ? "text-emerald-600"
                                : ""
                          }`}
                        >
                          {fmt(impact.diff)}
                        </TableCell>
                        <TableCell
                          className={`text-right font-mono text-xs ${
                            impact.diffPct > 0
                              ? "text-red-600"
                              : impact.diffPct < 0
                                ? "text-emerald-600"
                                : ""
                          }`}
                        >
                          {fmtPct(impact.diffPct)}
                        </TableCell>
                        <TableCell>
                          <VariationIcon diff={impact.diff} />
                        </TableCell>
                      </TableRow>
                    ))}
                    <TableRow className="bg-muted/50 font-semibold">
                      <TableCell colSpan={2} className="text-right">
                        TOTAL
                      </TableCell>
                      <TableCell className="text-right font-mono text-xs">
                        {fmt(simulation.totalOriginal)}
                      </TableCell>
                      <TableCell className="text-right font-mono text-xs">
                        {fmt(simulation.totalSimulated)}
                      </TableCell>
                      <TableCell
                        className={`text-right font-mono text-xs font-semibold ${
                          simulation.totalDiff > 0
                            ? "text-red-600"
                            : simulation.totalDiff < 0
                              ? "text-emerald-600"
                              : ""
                        }`}
                      >
                        {fmt(simulation.totalDiff)}
                      </TableCell>
                      <TableCell
                        className={`text-right font-mono text-xs ${
                          simulation.totalDiffPct > 0
                            ? "text-red-600"
                            : simulation.totalDiffPct < 0
                              ? "text-emerald-600"
                              : ""
                        }`}
                      >
                        {fmtPct(simulation.totalDiffPct)}
                      </TableCell>
                      <TableCell />
                    </TableRow>
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </>
        )}

        {/* Impact matrix: which resources affect which cost objects */}
        <Card>
          <CardHeader className="p-3 pb-2">
            <CardTitle className="text-sm">
              Matriz de impacto: Recurso → Objeto de Costo
            </CardTitle>
            <p className="text-[10px] text-muted-foreground">
              Porcentaje efectivo que cada recurso contribuye a cada objeto de
              costo (a través de actividades)
            </p>
          </CardHeader>
          <CardContent className="p-0 overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="sticky left-0 bg-background z-10">
                    Recurso
                  </TableHead>
                  {allocation.costObjectSummaries
                    .filter((co) => co.total_cost > 0)
                    .map((co) => (
                      <TableHead
                        key={co.id}
                        className="text-center text-[10px] min-w-[80px]"
                      >
                        {co.name.length > 12
                          ? co.name.slice(0, 10) + "..."
                          : co.name}
                      </TableHead>
                    ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {impactfulResources.slice(0, 20).map((resource) => {
                  const coEffects = resourceImpactMatrix.get(resource.id);
                  return (
                    <TableRow key={resource.id}>
                      <TableCell className="sticky left-0 bg-background z-10 text-xs font-medium whitespace-nowrap">
                        <span className="font-mono text-muted-foreground mr-1">
                          {resource.code}
                        </span>
                        {resource.name.length > 20
                          ? resource.name.slice(0, 17) + "..."
                          : resource.name}
                      </TableCell>
                      {allocation.costObjectSummaries
                        .filter((co) => co.total_cost > 0)
                        .map((co) => {
                          const effect = coEffects?.get(co.id);
                          const pct = effect?.effectivePct ?? 0;
                          return (
                            <TableCell
                              key={co.id}
                              className="text-center font-mono text-[10px]"
                            >
                              {pct > 0 ? (
                                <span
                                  className="inline-block px-1.5 py-0.5 rounded"
                                  style={{
                                    backgroundColor:
                                      pct > 30
                                        ? "rgba(59, 130, 246, 0.2)"
                                        : pct > 10
                                          ? "rgba(59, 130, 246, 0.1)"
                                          : "rgba(59, 130, 246, 0.05)",
                                    color:
                                      pct > 30
                                        ? "#1d4ed8"
                                        : pct > 10
                                          ? "#3b82f6"
                                          : "#93c5fd",
                                  }}
                                >
                                  {pct.toFixed(1)}%
                                </span>
                              ) : (
                                <span className="text-muted-foreground/30">
                                  —
                                </span>
                              )}
                            </TableCell>
                          );
                        })}
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
};

export default ResourceSensitivityPage;
