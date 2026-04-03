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
  SlidersHorizontal,
  RotateCcw,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  FlaskConical,
} from "lucide-react";
import { useAllocation, type AllocationEntry } from "@/hooks/use-allocation";
import { useCurrency } from "@/hooks/use-currency";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  Cell,
  ReferenceLine,
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

const SOURCE_LABELS: Record<string, string> = {
  resource: "Recurso",
  resource_center: "Centro de recurso",
  activity: "Actividad",
  activity_center: "Centro de actividad",
};

const DEST_LABELS: Record<string, string> = {
  activity: "Actividad",
  activity_center: "Centro de actividad",
  cost_object: "Objeto de costo",
  cost_object_center: "Centro de obj. costo",
  resource: "Recurso",
};

/* ───── Types ───── */
interface DriverInfo {
  id: string;
  name: string;
  sourceType: string;
  sourceName: string;
  destType: string;
  sourceAmount: number;
  lines: { destId: string; destName: string; percentage: number }[];
}

interface SimAdjustment {
  driverId: string;
  lineIndex: number;
  newPercentage: number;
}

/* ───── Variation Icon ───── */
function VariationIcon({ diff }: { diff: number }) {
  if (Math.abs(diff) < 0.01)
    return <Minus className="h-3 w-3 text-muted-foreground" />;
  if (diff > 0) return <ArrowUpRight className="h-3 w-3 text-red-500" />;
  return <ArrowDownRight className="h-3 w-3 text-emerald-500" />;
}

/* ───── Main Page ───── */
const DriverSensitivityPage = () => {
  const allocation = useAllocation();
  const { fmt } = useCurrency();
  const [selectedDriverId, setSelectedDriverId] = useState<string | null>(null);
  const [adjustments, setAdjustments] = useState<SimAdjustment[]>([]);

  // Build driver info with their allocation lines
  const driverInfos = useMemo(() => {
    const allocs = allocation.allocations;
    const driverMap = new Map<string, DriverInfo>();

    for (const a of allocs) {
      if (!driverMap.has(a.driver_id)) {
        driverMap.set(a.driver_id, {
          id: a.driver_id,
          name: a.driver_name,
          sourceType: a.source_type,
          sourceName: a.source_name,
          destType: a.destination_type,
          sourceAmount: a.source_amount,
          lines: [],
        });
      }
      const driver = driverMap.get(a.driver_id)!;
      // Avoid duplicate lines
      if (!driver.lines.find((l) => l.destId === a.destination_id)) {
        driver.lines.push({
          destId: a.destination_id,
          destName: a.destination_name,
          percentage: a.percentage,
        });
      }
    }

    return Array.from(driverMap.values()).sort(
      (a, b) => b.sourceAmount - a.sourceAmount,
    );
  }, [allocation.allocations]);

  const selectedDriver = driverInfos.find((d) => d.id === selectedDriverId);

  // Get current percentages (with adjustments applied)
  const getSimPercentage = useCallback(
    (driverId: string, lineIndex: number, originalPct: number) => {
      const adj = adjustments.find(
        (a) => a.driverId === driverId && a.lineIndex === lineIndex,
      );
      return adj ? adj.newPercentage : originalPct;
    },
    [adjustments],
  );

  const handleSliderChange = useCallback(
    (driverId: string, lineIndex: number, value: number[]) => {
      const newPct = value[0];
      setAdjustments((prev) => {
        const filtered = prev.filter(
          (a) => !(a.driverId === driverId && a.lineIndex === lineIndex),
        );
        return [...filtered, { driverId, lineIndex, newPercentage: newPct }];
      });
    },
    [],
  );

  const handleReset = useCallback(() => {
    setAdjustments([]);
  }, []);

  // Simulate impact: recalculate allocations with adjusted percentages
  const simulation = useMemo(() => {
    if (adjustments.length === 0 || !selectedDriver) return null;

    const allocs = allocation.allocations;

    // Build simulated allocations
    const simAllocations: AllocationEntry[] = allocs.map((a) => {
      if (a.driver_id !== selectedDriverId) return a;

      // Find the line index for this destination
      const lineIndex = selectedDriver.lines.findIndex(
        (l) => l.destId === a.destination_id,
      );
      if (lineIndex === -1) return a;

      const simPct = getSimPercentage(
        a.driver_id,
        lineIndex,
        a.percentage,
      );
      const simAmount = (a.source_amount * simPct) / 100;

      return { ...a, percentage: simPct, allocated_amount: simAmount };
    });

    // Calculate impact on cost objects
    const originalCO: Record<string, number> = {};
    const simCO: Record<string, number> = {};

    for (const a of allocs) {
      if (
        a.destination_type === "cost_object" ||
        a.destination_type === "cost_object_center"
      ) {
        originalCO[a.destination_id] =
          (originalCO[a.destination_id] || 0) + a.allocated_amount;
      }
    }

    for (const a of simAllocations) {
      if (
        a.destination_type === "cost_object" ||
        a.destination_type === "cost_object_center"
      ) {
        simCO[a.destination_id] =
          (simCO[a.destination_id] || 0) + a.allocated_amount;
      }
    }

    // Also calculate impact on activities
    const originalAct: Record<string, number> = {};
    const simAct: Record<string, number> = {};

    for (const a of allocs) {
      if (
        a.destination_type === "activity" ||
        a.destination_type === "activity_center"
      ) {
        originalAct[a.destination_id] =
          (originalAct[a.destination_id] || 0) + a.allocated_amount;
      }
    }

    for (const a of simAllocations) {
      if (
        a.destination_type === "activity" ||
        a.destination_type === "activity_center"
      ) {
        simAct[a.destination_id] =
          (simAct[a.destination_id] || 0) + a.allocated_amount;
      }
    }

    // Merge into impact rows
    const allDestIds = new Set([
      ...Object.keys(originalCO),
      ...Object.keys(simCO),
      ...Object.keys(originalAct),
      ...Object.keys(simAct),
    ]);

    const impacts: {
      id: string;
      name: string;
      type: string;
      original: number;
      simulated: number;
      diff: number;
      diffPct: number;
    }[] = [];

    for (const id of allDestIds) {
      const origCO = originalCO[id] || 0;
      const sCO = simCO[id] || 0;
      const origA = originalAct[id] || 0;
      const sA = simAct[id] || 0;

      const original = origCO || origA;
      const simulated = sCO || sA;
      const diff = simulated - original;

      if (Math.abs(diff) < 0.001) continue;

      const diffPct = original > 0 ? (diff / original) * 100 : 0;

      // Find name
      const alloc = allocs.find((a) => a.destination_id === id);
      const name = alloc?.destination_name || id;
      const type = origCO > 0 || sCO > 0 ? "Obj. de costo" : "Actividad";

      impacts.push({ id, name, type, original, simulated, diff, diffPct });
    }

    return {
      impacts: impacts.sort((a, b) => Math.abs(b.diff) - Math.abs(a.diff)),
    };
  }, [
    adjustments,
    selectedDriver,
    selectedDriverId,
    allocation.allocations,
    getSimPercentage,
  ]);

  if (allocation.isLoading) {
    return (
      <AppLayout>
        <PageHeader
          title="Sensibilidad de Drivers"
          description="Simula cambios en drivers y observa el impacto"
        />
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      </AppLayout>
    );
  }

  if (driverInfos.length === 0) {
    return (
      <AppLayout>
        <PageHeader
          title="Sensibilidad de Drivers"
          description="Simula cambios en drivers y observa el impacto"
        />
        <Card className="border-dashed">
          <CardContent className="py-12 text-center text-muted-foreground">
            <p className="text-sm">
              No hay drivers con asignaciones configuradas.
            </p>
          </CardContent>
        </Card>
      </AppLayout>
    );
  }

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

  return (
    <AppLayout>
      <PageHeader
        title="Análisis de Sensibilidad de Drivers"
        description="Simula cambios en la distribución de un driver y observa el impacto en los costos finales"
      />

      <div className="space-y-6">
        {/* Driver selector */}
        <Card>
          <CardHeader className="p-3 pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <SlidersHorizontal className="h-4 w-4" />
              Seleccionar driver para simular
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3 pt-0">
            <div className="flex flex-wrap gap-2 mt-2">
              {driverInfos.map((d) => (
                <button
                  key={d.id}
                  onClick={() => {
                    setSelectedDriverId(
                      selectedDriverId === d.id ? null : d.id,
                    );
                    setAdjustments([]);
                  }}
                  className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                    selectedDriverId === d.id
                      ? "bg-primary text-primary-foreground border-primary"
                      : "hover:bg-muted border-border text-foreground"
                  }`}
                >
                  {d.name}
                  <span className="ml-1.5 opacity-70 text-[10px]">
                    ({SOURCE_LABELS[d.sourceType] || d.sourceType} →{" "}
                    {DEST_LABELS[d.destType] || d.destType})
                  </span>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* No selection */}
        {!selectedDriver && (
          <Card className="border-dashed">
            <CardContent className="py-12 text-center text-muted-foreground">
              <FlaskConical className="h-8 w-8 mx-auto mb-3 opacity-40" />
              <p className="text-sm">
                Selecciona un driver para simular cambios en su distribución.
              </p>
            </CardContent>
          </Card>
        )}

        {/* Simulation panel */}
        {selectedDriver && (
          <>
            <Card>
              <CardHeader className="p-3 pb-2">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-sm">
                      Simulación: {selectedDriver.name}
                    </CardTitle>
                    <p className="text-xs text-muted-foreground mt-1">
                      Fuente: {selectedDriver.sourceName} ({fmt(selectedDriver.sourceAmount)})
                      → {DEST_LABELS[selectedDriver.destType] || selectedDriver.destType}
                    </p>
                  </div>
                  {adjustments.length > 0 && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleReset}
                      className="text-xs"
                    >
                      <RotateCcw className="h-3 w-3 mr-1" />
                      Restaurar
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent className="p-4">
                <div className="space-y-4">
                  {selectedDriver.lines.map((line, idx) => {
                    const simPct = getSimPercentage(
                      selectedDriver.id,
                      idx,
                      line.percentage,
                    );
                    const changed = Math.abs(simPct - line.percentage) > 0.1;
                    const simAmount =
                      (selectedDriver.sourceAmount * simPct) / 100;

                    return (
                      <div key={idx} className="space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-medium">
                            {line.destName}
                          </span>
                          <div className="flex items-center gap-2">
                            {changed && (
                              <span className="text-[10px] text-muted-foreground line-through">
                                {line.percentage.toFixed(1)}%
                              </span>
                            )}
                            <Badge
                              variant={changed ? "default" : "secondary"}
                              className={`font-mono text-xs ${
                                changed ? "bg-primary" : ""
                              }`}
                            >
                              {simPct.toFixed(1)}%
                            </Badge>
                            <span className="text-xs font-mono text-muted-foreground w-24 text-right">
                              {fmt(simAmount)}
                            </span>
                          </div>
                        </div>
                        <Slider
                          value={[simPct]}
                          onValueChange={(v) =>
                            handleSliderChange(selectedDriver.id, idx, v)
                          }
                          min={0}
                          max={100}
                          step={0.5}
                          className="w-full"
                        />
                      </div>
                    );
                  })}

                  {/* Total percentage indicator */}
                  {(() => {
                    const totalPct = selectedDriver.lines.reduce(
                      (s, l, idx) =>
                        s +
                        getSimPercentage(selectedDriver.id, idx, l.percentage),
                      0,
                    );
                    const isValid = Math.abs(totalPct - 100) < 0.5;
                    return (
                      <div
                        className={`flex items-center justify-between pt-2 border-t ${
                          isValid
                            ? "text-muted-foreground"
                            : "text-amber-600"
                        }`}
                      >
                        <span className="text-xs font-medium">
                          Total distribución
                        </span>
                        <Badge
                          variant={isValid ? "secondary" : "destructive"}
                          className="font-mono text-xs"
                        >
                          {totalPct.toFixed(1)}%
                        </Badge>
                      </div>
                    );
                  })()}
                </div>
              </CardContent>
            </Card>

            {/* Impact results */}
            {simulation && simulation.impacts.length > 0 && (
              <>
                {/* Impact chart */}
                <Card>
                  <CardHeader className="p-3 pb-0">
                    <CardTitle className="text-sm">
                      Impacto de la simulación en costos
                    </CardTitle>
                    <p className="text-[10px] text-muted-foreground">
                      Variación en costos asignados por el cambio en la distribución del driver
                    </p>
                  </CardHeader>
                  <CardContent className="p-2">
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart
                        data={impactChartData}
                        margin={{ top: 5, right: 10, left: 10, bottom: 60 }}
                      >
                        <CartesianGrid
                          strokeDasharray="3 3"
                          opacity={0.3}
                        />
                        <XAxis
                          dataKey="name"
                          angle={-45}
                          textAnchor="end"
                          interval={0}
                          tick={{ fontSize: 9 }}
                          height={80}
                        />
                        <YAxis
                          tickFormatter={fmtShort}
                          tick={{ fontSize: 10 }}
                        />
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

                {/* Impact table */}
                <Card>
                  <CardHeader className="p-3 pb-2">
                    <CardTitle className="text-sm">
                      Detalle del impacto simulado
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-0">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Destino</TableHead>
                          <TableHead className="w-24">Tipo</TableHead>
                          <TableHead className="text-right">Original</TableHead>
                          <TableHead className="text-right">Simulado</TableHead>
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
                            <TableCell className="text-sm font-medium">
                              {impact.name}
                            </TableCell>
                            <TableCell>
                              <Badge variant="secondary" className="text-xs">
                                {impact.type}
                              </Badge>
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
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              </>
            )}

            {/* No adjustments message */}
            {adjustments.length === 0 && (
              <Card className="border-dashed">
                <CardContent className="py-8 text-center text-muted-foreground">
                  <p className="text-xs">
                    Mueve los controles deslizantes para simular cambios en la distribución y ver el impacto.
                  </p>
                </CardContent>
              </Card>
            )}
          </>
        )}
      </div>
    </AppLayout>
  );
};

export default DriverSensitivityPage;
