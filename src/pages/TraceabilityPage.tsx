import { useState, useMemo } from "react";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, Package, ArrowDown } from "lucide-react";
import { useAllocation } from "@/hooks/use-allocation";
import { useCurrency } from "@/hooks/use-currency";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";

/* ───── Helpers ───── */
const fmtShort = (n: number) => {
  if (Math.abs(n) >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (Math.abs(n) >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toFixed(0);
};

const COLORS = [
  "#3b82f6", "#f97316", "#a3a3a3", "#eab308", "#22c55e",
  "#8b5cf6", "#ec4899", "#14b8a6", "#f43f5e", "#6366f1",
  "#84cc16", "#06b6d4", "#d946ef", "#f59e0b", "#10b981",
];

const subtypeLabels: Record<string, string> = {
  product: "Producto",
  service: "Servicio",
  client: "Cliente",
  channel: "Canal",
  project: "Proyecto",
};

/* ───── Types ───── */
interface TraceEntry {
  resourceCode: string;
  resourceName: string;
  resourceAmount: number;
  driverName: string;
  activityCode: string;
  activityName: string;
  activityPct: number;
  activityAmount: number;
  driverToObj: string;
  objPct: number;
  finalAmount: number;
}

/* ───── Main Page ───── */
const TraceabilityPage = () => {
  const allocation = useAllocation();
  const { fmt } = useCurrency();
  const [selectedCO, setSelectedCO] = useState<string>("");

  // Build list of cost objects with cost
  const costObjectOptions = useMemo(() => {
    return allocation.costObjectSummaries
      .filter((co) => co.total_cost > 0)
      .sort((a, b) => b.total_cost - a.total_cost);
  }, [allocation.costObjectSummaries]);

  // Build trace data for selected cost object
  const traceData = useMemo(() => {
    if (!selectedCO) return null;

    const summary = allocation.costObjectSummaries.find((co) => co.id === selectedCO);
    if (!summary) return null;

    // Stage 2: Find all allocations TO this cost object (from activities)
    const toCostObject = allocation.allocations.filter(
      (al) =>
        al.destination_id === selectedCO &&
        (al.destination_type === "cost_object" || al.destination_type === "cost_object_center"),
    );

    // Stage 1: For each activity that feeds this cost object, find what resources feed it
    const traces: TraceEntry[] = [];

    for (const actAlloc of toCostObject) {
      // Find allocations TO this activity (from resources)
      const toActivity = allocation.allocations.filter(
        (al) =>
          al.destination_id === actAlloc.source_id &&
          al.destination_type === "activity" &&
          (al.source_type === "resource" || al.source_type === "resource_center"),
      );

      if (toActivity.length > 0) {
        for (const resAlloc of toActivity) {
          traces.push({
            resourceCode: resAlloc.source_code,
            resourceName: resAlloc.source_name,
            resourceAmount: resAlloc.source_amount,
            driverName: resAlloc.driver_name,
            activityCode: actAlloc.source_code,
            activityName: actAlloc.source_name,
            activityPct: resAlloc.percentage,
            activityAmount: resAlloc.allocated_amount,
            driverToObj: actAlloc.driver_name,
            objPct: actAlloc.percentage,
            finalAmount: (resAlloc.allocated_amount * actAlloc.percentage) / 100,
          });
        }
      } else {
        // Activity has direct cost (no resource driver) or the source is the activity itself
        traces.push({
          resourceCode: "—",
          resourceName: "(Costo directo actividad)",
          resourceAmount: actAlloc.source_amount,
          driverName: "—",
          activityCode: actAlloc.source_code,
          activityName: actAlloc.source_name,
          activityPct: 100,
          activityAmount: actAlloc.source_amount,
          driverToObj: actAlloc.driver_name,
          objPct: actAlloc.percentage,
          finalAmount: actAlloc.allocated_amount,
        });
      }
    }

    // Also check for direct resource-to-cost-object allocations
    const directToObj = allocation.allocations.filter(
      (al) =>
        al.destination_id === selectedCO &&
        (al.source_type === "resource" || al.source_type === "resource_center") &&
        al.destination_type === "cost_object",
    );
    for (const d of directToObj) {
      traces.push({
        resourceCode: d.source_code,
        resourceName: d.source_name,
        resourceAmount: d.source_amount,
        driverName: d.driver_name,
        activityCode: "—",
        activityName: "(Directo a objeto)",
        activityPct: d.percentage,
        activityAmount: d.allocated_amount,
        driverToObj: "—",
        objPct: 100,
        finalAmount: d.allocated_amount,
      });
    }

    // Aggregate by activity for the waterfall chart
    const byActivity = new Map<string, { name: string; amount: number }>();
    for (const t of traces) {
      const key = t.activityCode + "|" + t.activityName;
      const existing = byActivity.get(key);
      if (existing) {
        existing.amount += t.finalAmount;
      } else {
        byActivity.set(key, { name: t.activityName, amount: t.finalAmount });
      }
    }

    // Aggregate by resource for resource contribution chart
    const byResource = new Map<string, { name: string; amount: number }>();
    for (const t of traces) {
      const key = t.resourceCode + "|" + t.resourceName;
      const existing = byResource.get(key);
      if (existing) {
        existing.amount += t.finalAmount;
      } else {
        byResource.set(key, { name: t.resourceName, amount: t.finalAmount });
      }
    }

    const activityBreakdown = Array.from(byActivity.values())
      .sort((a, b) => b.amount - a.amount);
    const resourceBreakdown = Array.from(byResource.values())
      .sort((a, b) => b.amount - a.amount);

    const co = allocation.costObjects.find((c) => c.id === selectedCO);

    return {
      summary,
      traces: traces.sort((a, b) => b.finalAmount - a.finalAmount),
      activityBreakdown,
      resourceBreakdown,
      price: co?.price ?? 0,
    };
  }, [selectedCO, allocation]);

  if (allocation.isLoading) {
    return (
      <AppLayout>
        <PageHeader
          title="Trazabilidad"
          description="Desglose de costos por objeto de costo"
        />
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <PageHeader
        title="Trazabilidad de Costos"
        description="Selecciona un objeto de costo para ver el desglose completo: Recursos → Actividades → Objeto"
      />

      {/* Selector */}
      <div className="mb-6">
        <Select value={selectedCO} onValueChange={setSelectedCO}>
          <SelectTrigger className="w-full md:w-96">
            <SelectValue placeholder="Seleccionar objeto de costo..." />
          </SelectTrigger>
          <SelectContent>
            {costObjectOptions.map((co) => (
              <SelectItem key={co.id} value={co.id}>
                <span className="font-mono text-xs mr-2">{co.code}</span>
                {co.name}
                <span className="text-muted-foreground ml-2 text-xs">
                  ({fmt(co.total_cost)})
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {!selectedCO ? (
        <Card className="border-dashed">
          <CardContent className="py-12 text-center text-muted-foreground">
            <Package className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">
              Selecciona un objeto de costo para ver su trazabilidad completa.
            </p>
          </CardContent>
        </Card>
      ) : traceData ? (
        <div className="space-y-6">
          {/* Summary card */}
          <Card>
            <CardContent className="p-4">
              <div className="flex flex-col md:flex-row md:items-center gap-4">
                <div className="flex-1">
                  <p className="text-xs text-muted-foreground">Objeto de costo</p>
                  <p className="text-lg font-bold">
                    <span className="font-mono text-sm mr-2">{traceData.summary.code}</span>
                    {traceData.summary.name}
                  </p>
                  <Badge variant="secondary" className="text-xs mt-1">
                    {subtypeLabels[traceData.summary.type] || traceData.summary.type}
                  </Badge>
                </div>
                <div className="flex flex-wrap gap-4 sm:gap-6">
                  <div className="text-center">
                    <p className="text-xs text-muted-foreground">Costo ABC</p>
                    <p className="text-lg font-bold font-mono">
                      {fmt(traceData.summary.total_cost)}
                    </p>
                  </div>
                  {traceData.price > 0 && (
                    <>
                      <div className="text-center">
                        <p className="text-xs text-muted-foreground">Precio venta</p>
                        <p className="text-lg font-bold font-mono">
                          {fmt(traceData.price)}
                        </p>
                      </div>
                      <div className="text-center">
                        <p className="text-xs text-muted-foreground">Margen</p>
                        <p
                          className={`text-lg font-bold font-mono ${
                            traceData.price - traceData.summary.total_cost >= 0
                              ? "text-emerald-600"
                              : "text-red-600"
                          }`}
                        >
                          {fmt(traceData.price - traceData.summary.total_cost)}
                        </p>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* By Activity */}
            <Card>
              <CardHeader className="p-3 pb-0">
                <CardTitle className="text-sm">
                  Contribución por Actividad
                </CardTitle>
              </CardHeader>
              <CardContent className="p-2">
                {traceData.activityBreakdown.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-10">
                    Sin datos
                  </p>
                ) : (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart
                      data={traceData.activityBreakdown.map((d) => ({
                        name:
                          d.name.length > 22
                            ? d.name.slice(0, 19) + "..."
                            : d.name,
                        fullName: d.name,
                        amount: d.amount,
                      }))}
                      margin={{ top: 5, right: 10, left: 10, bottom: 60 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                      <XAxis
                        dataKey="name"
                        angle={-45}
                        textAnchor="end"
                        interval={0}
                        tick={{ fontSize: 10 }}
                        height={80}
                      />
                      <YAxis tickFormatter={fmtShort} tick={{ fontSize: 10 }} />
                      <Tooltip
                        formatter={(value: number) => fmt(value)}
                        labelFormatter={(_, payload) =>
                          payload?.[0]?.payload?.fullName ?? ""
                        }
                      />
                      <Bar dataKey="amount" name="Costo" radius={[4, 4, 0, 0]}>
                        {traceData.activityBreakdown.map((_, i) => (
                          <Cell key={i} fill={COLORS[i % COLORS.length]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            {/* By Resource */}
            <Card>
              <CardHeader className="p-3 pb-0">
                <CardTitle className="text-sm">
                  Contribución por Recurso
                </CardTitle>
              </CardHeader>
              <CardContent className="p-2">
                {traceData.resourceBreakdown.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-10">
                    Sin datos
                  </p>
                ) : (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart
                      data={traceData.resourceBreakdown.map((d) => ({
                        name:
                          d.name.length > 22
                            ? d.name.slice(0, 19) + "..."
                            : d.name,
                        fullName: d.name,
                        amount: d.amount,
                      }))}
                      margin={{ top: 5, right: 10, left: 10, bottom: 60 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                      <XAxis
                        dataKey="name"
                        angle={-45}
                        textAnchor="end"
                        interval={0}
                        tick={{ fontSize: 10 }}
                        height={80}
                      />
                      <YAxis tickFormatter={fmtShort} tick={{ fontSize: 10 }} />
                      <Tooltip
                        formatter={(value: number) => fmt(value)}
                        labelFormatter={(_, payload) =>
                          payload?.[0]?.payload?.fullName ?? ""
                        }
                      />
                      <Bar dataKey="amount" name="Costo" radius={[4, 4, 0, 0]}>
                        {traceData.resourceBreakdown.map((_, i) => (
                          <Cell key={i} fill={COLORS[i % COLORS.length]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Flow indicator */}
          <div className="flex items-center justify-center gap-2 text-muted-foreground">
            <Badge variant="outline">Recurso</Badge>
            <ArrowDown className="h-4 w-4 rotate-[-90deg]" />
            <Badge variant="outline">Actividad</Badge>
            <ArrowDown className="h-4 w-4 rotate-[-90deg]" />
            <Badge variant="outline">Objeto de Costo</Badge>
          </div>

          {/* Full trace table */}
          <Card>
            <CardHeader className="p-3 pb-2">
              <CardTitle className="text-sm">
                Trazabilidad completa: Recurso → Actividad → Objeto de Costo
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Recurso</TableHead>
                    <TableHead>Driver (R→A)</TableHead>
                    <TableHead>Actividad</TableHead>
                    <TableHead className="text-right">% a Actividad</TableHead>
                    <TableHead>Driver (A→OC)</TableHead>
                    <TableHead className="text-right">% a Objeto</TableHead>
                    <TableHead className="text-right font-semibold">
                      Monto final
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {traceData.traces.map((t, idx) => (
                    <TableRow key={idx}>
                      <TableCell>
                        <div className="text-xs">
                          <span className="font-mono">{t.resourceCode}</span>{" "}
                          <span className="text-muted-foreground">
                            {t.resourceName}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-xs">{t.driverName}</TableCell>
                      <TableCell>
                        <div className="text-xs">
                          <span className="font-mono">{t.activityCode}</span>{" "}
                          <span className="text-muted-foreground">
                            {t.activityName}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-mono text-xs">
                        {t.activityPct.toFixed(2)}%
                      </TableCell>
                      <TableCell className="text-xs">{t.driverToObj}</TableCell>
                      <TableCell className="text-right font-mono text-xs">
                        {t.objPct.toFixed(2)}%
                      </TableCell>
                      <TableCell className="text-right font-mono text-sm font-semibold">
                        {fmt(t.finalAmount)}
                      </TableCell>
                    </TableRow>
                  ))}
                  {traceData.traces.length > 0 && (
                    <TableRow className="bg-muted/50 font-semibold">
                      <TableCell colSpan={6} className="text-right">
                        TOTAL TRAZADO
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {fmt(
                          traceData.traces.reduce((s, t) => s + t.finalAmount, 0),
                        )}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      ) : null}
    </AppLayout>
  );
};

export default TraceabilityPage;
