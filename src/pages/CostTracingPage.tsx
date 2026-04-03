import { useState, useMemo } from "react";
import { AppLayout } from "@/components/AppLayout";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Loader2, Search, ChevronRight } from "lucide-react";
import { useAllocation } from "@/hooks/use-allocation";
import { useCurrency } from "@/hooks/use-currency";
import {
  Sankey,
  Tooltip,
  ResponsiveContainer,
  Layer,
  Rectangle,
} from "recharts";

/* ───── Helpers ───── */
const COLORS: Record<string, string> = {
  resource: "#3b82f6",
  resource_center: "#6366f1",
  activity: "#f97316",
  activity_center: "#eab308",
  cost_object: "#22c55e",
  cost_object_center: "#14b8a6",
};

const TYPE_LABELS: Record<string, string> = {
  resource: "Recurso",
  resource_center: "Centro de recurso",
  activity: "Actividad",
  activity_center: "Centro de actividad",
  cost_object: "Objeto de costo",
  cost_object_center: "Centro de obj. costo",
};

/* ───── Custom Sankey Node ───── */
function SankeyNode({ x, y, width, height, payload }: any) {
  const color = COLORS[payload.nodeType] || "#94a3b8";
  return (
    <Layer>
      <Rectangle
        x={x}
        y={y}
        width={width}
        height={height}
        fill={color}
        fillOpacity={0.9}
        rx={3}
      />
      {height > 14 && (
        <text
          x={x + width + 6}
          y={y + height / 2}
          textAnchor="start"
          dominantBaseline="middle"
          fontSize={10}
          fill="#64748b"
        >
          {payload.name?.length > 30
            ? payload.name.slice(0, 27) + "..."
            : payload.name}
        </text>
      )}
    </Layer>
  );
}

/* ───── Trace row for detail table ───── */
interface TraceStep {
  sourceType: string;
  sourceName: string;
  sourceCode: string;
  driverName: string;
  percentage: number;
  amount: number;
  destType: string;
  destName: string;
  destCode: string;
}

/* ───── Main Page ───── */
const CostTracingPage = () => {
  const allocation = useAllocation();
  const { fmt } = useCurrency();
  const [selectedCostObject, setSelectedCostObject] = useState<string | null>(
    null,
  );

  // Build full trace for selected cost object (reverse path)
  const traceData = useMemo(() => {
    if (!selectedCostObject) return { steps: [] as TraceStep[], total: 0 };

    const allocs = allocation.allocations;

    // Stage 2: activity/activity_center → cost_object
    const stage2 = allocs.filter(
      (a) =>
        a.destination_id === selectedCostObject &&
        (a.destination_type === "cost_object" ||
          a.destination_type === "cost_object_center"),
    );

    const steps: TraceStep[] = [];

    for (const s2 of stage2) {
      // Add stage 2 step
      steps.push({
        sourceType: s2.source_type,
        sourceName: s2.source_name,
        sourceCode: s2.source_code,
        driverName: s2.driver_name,
        percentage: s2.percentage,
        amount: s2.allocated_amount,
        destType: s2.destination_type,
        destName: s2.destination_name,
        destCode: s2.destination_code,
      });

      // Stage 1: resource/resource_center → this activity
      const stage1 = allocs.filter(
        (a) =>
          a.destination_id === s2.source_id &&
          (a.destination_type === "activity" ||
            a.destination_type === "activity_center"),
      );

      for (const s1 of stage1) {
        steps.push({
          sourceType: s1.source_type,
          sourceName: s1.source_name,
          sourceCode: s1.source_code,
          driverName: s1.driver_name,
          percentage: s1.percentage,
          amount: s1.allocated_amount,
          destType: s1.destination_type,
          destName: s1.destination_name,
          destCode: s1.destination_code,
        });
      }
    }

    const total = stage2.reduce((s, a) => s + a.allocated_amount, 0);
    return { steps, total };
  }, [selectedCostObject, allocation.allocations]);

  // Build Sankey data from all allocations
  const sankeyData = useMemo(() => {
    const allocs = allocation.allocations;
    if (allocs.length === 0) return null;

    // Build unique nodes: id → index
    const nodeMap = new Map<string, number>();
    const nodes: { name: string; nodeType: string }[] = [];

    const addNode = (id: string, name: string, type: string) => {
      const key = `${type}::${id}`;
      if (!nodeMap.has(key)) {
        nodeMap.set(key, nodes.length);
        nodes.push({ name, nodeType: type });
      }
      return nodeMap.get(key)!;
    };

    const links: { source: number; target: number; value: number }[] = [];
    // Aggregate by source+dest to avoid duplicate links
    const linkAgg = new Map<string, number>();

    for (const a of allocs) {
      if (a.allocated_amount <= 0) continue;
      const srcIdx = addNode(a.source_id, a.source_name, a.source_type);
      const dstIdx = addNode(
        a.destination_id,
        a.destination_name,
        a.destination_type,
      );
      if (srcIdx === dstIdx) continue;
      const key = `${srcIdx}->${dstIdx}`;
      linkAgg.set(key, (linkAgg.get(key) || 0) + a.allocated_amount);
    }

    for (const [key, value] of linkAgg) {
      const [src, tgt] = key.split("->").map(Number);
      links.push({ source: src, target: tgt, value });
    }

    if (links.length === 0) return null;
    return { nodes, links };
  }, [allocation.allocations]);

  if (allocation.isLoading) {
    return (
      <AppLayout>
        <PageHeader
          title="Trazabilidad de Costos"
          description="Rastrea el origen de cada peso asignado a tus objetos de costo"
        />
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      </AppLayout>
    );
  }

  const costObjectOptions = allocation.costObjectSummaries.filter(
    (co) => co.total_cost > 0,
  );

  const selectedObj = selectedCostObject
    ? allocation.costObjectSummaries.find((co) => co.id === selectedCostObject)
    : null;

  return (
    <AppLayout>
      <PageHeader
        title="Trazabilidad de Costos"
        description="Visualiza el flujo completo de costos: Recursos → Actividades → Objetos de Costo"
      />

      {allocation.allocations.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-12 text-center text-muted-foreground">
            <p className="text-sm">
              No hay asignaciones configuradas para visualizar.
            </p>
            <p className="text-xs mt-1">
              Configura drivers en la página de Asignaciones primero.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {/* Sankey Diagram */}
          <Card>
            <CardHeader className="p-3 pb-0">
              <CardTitle className="text-sm">
                Flujo de costos del modelo ABC
              </CardTitle>
            </CardHeader>
            <CardContent className="p-2">
              {sankeyData ? (
                <ResponsiveContainer width="100%" height={420}>
                  <Sankey
                    data={sankeyData}
                    nodeWidth={10}
                    nodePadding={14}
                    linkCurvature={0.5}
                    iterations={64}
                    node={<SankeyNode />}
                    link={{ stroke: "#94a3b8", strokeOpacity: 0.2 }}
                    margin={{ top: 10, right: 160, bottom: 10, left: 10 }}
                  >
                    <Tooltip
                      formatter={(value: number) => fmt(value)}
                    />
                  </Sankey>
                </ResponsiveContainer>
              ) : (
                <p className="text-xs text-muted-foreground text-center py-10">
                  Sin datos suficientes para el diagrama
                </p>
              )}
              {/* Legend */}
              <div className="flex flex-wrap gap-3 mt-2 px-2 pb-2">
                {Object.entries(COLORS).map(([key, color]) => (
                  <div key={key} className="flex items-center gap-1.5">
                    <div
                      className="h-3 w-3 rounded-sm"
                      style={{ backgroundColor: color }}
                    />
                    <span className="text-[10px] text-muted-foreground">
                      {TYPE_LABELS[key]}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Cost Object selector */}
          <Card>
            <CardHeader className="p-3 pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Search className="h-4 w-4" />
                Rastrear origen del costo de un objeto
              </CardTitle>
            </CardHeader>
            <CardContent className="p-3 pt-0">
              <div className="flex flex-wrap gap-2 mt-2">
                {costObjectOptions.map((co) => (
                  <button
                    key={co.id}
                    onClick={() =>
                      setSelectedCostObject(
                        selectedCostObject === co.id ? null : co.id,
                      )
                    }
                    className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                      selectedCostObject === co.id
                        ? "bg-primary text-primary-foreground border-primary"
                        : "hover:bg-muted border-border text-foreground"
                    }`}
                  >
                    {co.name}
                    <span className="ml-1.5 opacity-70">{fmt(co.total_cost)}</span>
                  </button>
                ))}
                {costObjectOptions.length === 0 && (
                  <p className="text-xs text-muted-foreground">
                    No hay objetos de costo con costo asignado.
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Trace detail */}
          {selectedObj && (
            <Card>
              <CardHeader className="p-3 pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm">
                    Trazabilidad: {selectedObj.name}
                  </CardTitle>
                  <Badge variant="outline" className="font-mono">
                    Costo total: {fmt(selectedObj.total_cost)}
                  </Badge>
                </div>
                {selectedObj.direct_amount > 0 && (
                  <p className="text-xs text-muted-foreground">
                    Costo directo: {fmt(selectedObj.direct_amount)} + Recibido:{" "}
                    {fmt(selectedObj.received_amount)}
                  </p>
                )}
              </CardHeader>
              <CardContent className="p-0">
                {traceData.steps.length === 0 ? (
                  <div className="py-8 text-center text-xs text-muted-foreground">
                    Este objeto de costo no recibe asignaciones de actividades.
                    {selectedObj.direct_amount > 0 &&
                      " Solo tiene costo directo."}
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Origen</TableHead>
                        <TableHead className="w-8" />
                        <TableHead>Destino</TableHead>
                        <TableHead>Driver</TableHead>
                        <TableHead className="text-right w-16">%</TableHead>
                        <TableHead className="text-right">Monto</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {traceData.steps
                        .sort((a, b) => b.amount - a.amount)
                        .map((step, i) => (
                          <TableRow key={i}>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <div
                                  className="h-2.5 w-2.5 rounded-sm shrink-0"
                                  style={{
                                    backgroundColor:
                                      COLORS[step.sourceType] || "#94a3b8",
                                  }}
                                />
                                <div>
                                  <p className="text-xs font-medium">
                                    {step.sourceName}
                                  </p>
                                  <p className="text-[10px] text-muted-foreground">
                                    {TYPE_LABELS[step.sourceType]}
                                  </p>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <ChevronRight className="h-3 w-3 text-muted-foreground" />
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <div
                                  className="h-2.5 w-2.5 rounded-sm shrink-0"
                                  style={{
                                    backgroundColor:
                                      COLORS[step.destType] || "#94a3b8",
                                  }}
                                />
                                <div>
                                  <p className="text-xs font-medium">
                                    {step.destName}
                                  </p>
                                  <p className="text-[10px] text-muted-foreground">
                                    {TYPE_LABELS[step.destType]}
                                  </p>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell className="text-xs">
                              {step.driverName}
                            </TableCell>
                            <TableCell className="text-right font-mono text-xs">
                              {step.percentage.toFixed(1)}%
                            </TableCell>
                            <TableCell className="text-right font-mono text-xs font-semibold">
                              {fmt(step.amount)}
                            </TableCell>
                          </TableRow>
                        ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </AppLayout>
  );
};

export default CostTracingPage;
