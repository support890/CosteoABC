import { useMemo } from "react";
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
  Activity,
  Zap,
  AlertTriangle,
  TrendingUp,
} from "lucide-react";
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
  Legend,
  Cell,
  PieChart,
  Pie,
  ScatterChart,
  Scatter,
  ZAxis,
  ReferenceLine,
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
];

const TYPE_LABELS: Record<string, string> = {
  operative: "Operativa",
  production: "Producción",
  support: "Soporte",
  administrative: "Administrativa",
  management: "Gestión",
};

const TYPE_COLORS: Record<string, string> = {
  operative: "#3b82f6",
  production: "#22c55e",
  support: "#f97316",
  administrative: "#8b5cf6",
  management: "#eab308",
};

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
const ActivityEfficiencyPage = () => {
  const allocation = useAllocation();
  const { fmt } = useCurrency();

  const analysis = useMemo(() => {
    const summaries = allocation.activitySummaries;
    const allocs = allocation.allocations;

    // Calculate what each activity distributes to cost objects
    const activityDistributed: Record<string, number> = {};
    for (const a of allocs) {
      if (
        (a.source_type === "activity" || a.source_type === "activity_center") &&
        (a.destination_type === "cost_object" ||
          a.destination_type === "cost_object_center")
      ) {
        activityDistributed[a.source_id] =
          (activityDistributed[a.source_id] || 0) + a.allocated_amount;
      }
    }

    // Count how many cost objects each activity feeds
    const activityCOCount: Record<string, Set<string>> = {};
    for (const a of allocs) {
      if (
        (a.source_type === "activity" || a.source_type === "activity_center") &&
        (a.destination_type === "cost_object" ||
          a.destination_type === "cost_object_center")
      ) {
        if (!activityCOCount[a.source_id])
          activityCOCount[a.source_id] = new Set();
        activityCOCount[a.source_id].add(a.destination_id);
      }
    }

    const items = summaries.map((s) => {
      const distributed = activityDistributed[s.id] || 0;
      const retained = s.total_cost - distributed;
      const efficiency =
        s.total_cost > 0 ? (distributed / s.total_cost) * 100 : 0;
      const costObjectCount = activityCOCount[s.id]?.size || 0;

      return {
        ...s,
        distributed,
        retained,
        efficiency,
        costObjectCount,
        typeLabel: TYPE_LABELS[s.type] || s.type,
        typeColor: TYPE_COLORS[s.type] || "#94a3b8",
      };
    });

    // Group by type
    const byType = new Map<string, { label: string; total: number; count: number; color: string }>();
    for (const item of items) {
      const existing = byType.get(item.type);
      if (existing) {
        existing.total += item.total_cost;
        existing.count += 1;
      } else {
        byType.set(item.type, {
          label: item.typeLabel,
          total: item.total_cost,
          count: 1,
          color: item.typeColor,
        });
      }
    }

    const totalCost = summaries.reduce((s, a) => s + a.total_cost, 0);
    const totalDistributed = Object.values(activityDistributed).reduce(
      (s, v) => s + v,
      0,
    );
    const avgEfficiency = totalCost > 0 ? (totalDistributed / totalCost) * 100 : 0;

    // Support activities (type contains 'support' or 'soporte' or 'administrative')
    const supportTypes = new Set(["support", "soporte", "administrative", "admin"]);
    const supportActivities = items.filter((i) =>
      supportTypes.has(i.type.toLowerCase()),
    );
    const supportCost = supportActivities.reduce(
      (s, a) => s + a.total_cost,
      0,
    );
    const supportPct = totalCost > 0 ? (supportCost / totalCost) * 100 : 0;

    // Top absorbers (highest cost activities)
    const sorted = [...items].sort((a, b) => b.total_cost - a.total_cost);

    // Pareto: calculate cumulative percentage
    let cumulative = 0;
    const pareto = sorted.map((item) => {
      cumulative += item.total_cost;
      return {
        ...item,
        cumulativePct: totalCost > 0 ? (cumulative / totalCost) * 100 : 0,
      };
    });

    // Activities that absorb 80% of cost
    const top80 = pareto.filter((p) => p.cumulativePct <= 80 || pareto.indexOf(p) === 0);

    return {
      items: sorted,
      pareto,
      byType: Array.from(byType.values()),
      totalCost,
      totalDistributed,
      avgEfficiency,
      supportCost,
      supportPct,
      top80Count: top80.length,
      totalCount: items.length,
    };
  }, [allocation.activitySummaries, allocation.allocations]);

  if (allocation.isLoading) {
    return (
      <AppLayout>
        <PageHeader
          title="Eficiencia de Actividades"
          description="Análisis de consumo y distribución de costos por actividad"
        />
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      </AppLayout>
    );
  }

  if (analysis.items.length === 0) {
    return (
      <AppLayout>
        <PageHeader
          title="Eficiencia de Actividades"
          description="Análisis de consumo y distribución de costos por actividad"
        />
        <Card className="border-dashed">
          <CardContent className="py-12 text-center text-muted-foreground">
            <p className="text-sm">No hay actividades configuradas.</p>
          </CardContent>
        </Card>
      </AppLayout>
    );
  }

  // Chart: Cost by type (pie)
  const typeData = analysis.byType.map((t) => ({
    name: t.label,
    value: t.total,
    count: t.count,
    color: t.color,
  }));

  // Chart: Stacked bar — direct vs received per activity
  const stackedData = analysis.items.slice(0, 15).map((a) => ({
    name: a.name.length > 18 ? a.name.slice(0, 15) + "..." : a.name,
    fullName: a.name,
    Directo: a.direct_amount,
    Recibido: a.received_amount,
  }));

  // Chart: Efficiency scatter — cost vs efficiency
  const scatterData = analysis.items
    .filter((a) => a.total_cost > 0)
    .map((a) => ({
      name: a.name,
      x: a.total_cost,
      y: a.efficiency,
      z: a.costObjectCount || 1,
      type: a.typeLabel,
    }));

  return (
    <AppLayout>
      <PageHeader
        title="Eficiencia de Actividades"
        description="Análisis de consumo, composición y distribución de costos por actividad"
      />

      {/* Summary cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <StatCard
          title="Costo total actividades"
          value={fmt(analysis.totalCost)}
          subtitle={`${analysis.totalCount} actividades`}
          icon={Activity}
          color="bg-blue-500/10 text-blue-600"
        />
        <StatCard
          title="Eficiencia promedio"
          value={`${analysis.avgEfficiency.toFixed(1)}%`}
          subtitle="Costo que llega a obj. de costo"
          icon={Zap}
          color={
            analysis.avgEfficiency >= 80
              ? "bg-emerald-500/10 text-emerald-600"
              : "bg-amber-500/10 text-amber-600"
          }
        />
        <StatCard
          title="Costo de soporte"
          value={fmt(analysis.supportCost)}
          subtitle={`${analysis.supportPct.toFixed(1)}% del total`}
          icon={AlertTriangle}
          color={
            analysis.supportPct > 30
              ? "bg-red-500/10 text-red-600"
              : "bg-emerald-500/10 text-emerald-600"
          }
        />
        <StatCard
          title="Concentración (Pareto)"
          value={`${analysis.top80Count} de ${analysis.totalCount}`}
          subtitle="actividades concentran el 80% del costo"
          icon={TrendingUp}
          color="bg-violet-500/10 text-violet-600"
        />
      </div>

      <div className="space-y-6">
        {/* Charts row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Cost by type pie */}
          <Card>
            <CardHeader className="p-3 pb-0">
              <CardTitle className="text-sm">Costo por tipo de actividad</CardTitle>
            </CardHeader>
            <CardContent className="p-2">
              {typeData.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-10">
                  Sin datos
                </p>
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={typeData}
                      cx="50%"
                      cy="50%"
                      outerRadius={100}
                      dataKey="value"
                      label={({ name, percent }) =>
                        `${name} (${(percent * 100).toFixed(0)}%)`
                      }
                      labelLine={true}
                    >
                      {typeData.map((entry, i) => (
                        <Cell key={i} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value: number) => fmt(value)} />
                    <Legend wrapperStyle={{ fontSize: "11px" }} />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          {/* Stacked bar: direct vs received */}
          <Card>
            <CardHeader className="p-3 pb-0">
              <CardTitle className="text-sm">
                Composición: Costo directo vs. recibido
              </CardTitle>
            </CardHeader>
            <CardContent className="p-2">
              <ResponsiveContainer width="100%" height={300}>
                <BarChart
                  data={stackedData}
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
                    dataKey="Directo"
                    stackId="a"
                    fill="#3b82f6"
                    radius={[0, 0, 0, 0]}
                  />
                  <Bar
                    dataKey="Recibido"
                    stackId="a"
                    fill="#f97316"
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Scatter: cost vs efficiency */}
        {scatterData.length > 0 && (
          <Card>
            <CardHeader className="p-3 pb-0">
              <CardTitle className="text-sm">
                Costo total vs. Eficiencia de distribución
              </CardTitle>
              <p className="text-[10px] text-muted-foreground">
                Actividades en el cuadrante inferior-derecho (alto costo, baja
                eficiencia) son candidatas a optimización
              </p>
            </CardHeader>
            <CardContent className="p-2">
              <ResponsiveContainer width="100%" height={320}>
                <ScatterChart
                  margin={{ top: 10, right: 20, left: 10, bottom: 10 }}
                >
                  <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                  <XAxis
                    type="number"
                    dataKey="x"
                    name="Costo"
                    tickFormatter={fmtShort}
                    tick={{ fontSize: 10 }}
                    label={{
                      value: "Costo total",
                      position: "insideBottom",
                      offset: -5,
                      fontSize: 10,
                    }}
                  />
                  <YAxis
                    type="number"
                    dataKey="y"
                    name="Eficiencia"
                    tickFormatter={(v) => `${v}%`}
                    tick={{ fontSize: 10 }}
                    domain={[0, 100]}
                    label={{
                      value: "Eficiencia %",
                      angle: -90,
                      position: "insideLeft",
                      fontSize: 10,
                    }}
                  />
                  <ZAxis type="number" dataKey="z" range={[40, 300]} />
                  <Tooltip
                    formatter={(value: number, name: string) =>
                      name === "Costo" ? fmt(value) : `${value.toFixed(1)}%`
                    }
                    labelFormatter={(_, payload) =>
                      payload?.[0]?.payload?.name ?? ""
                    }
                  />
                  <ReferenceLine
                    y={50}
                    stroke="#ef4444"
                    strokeDasharray="3 3"
                    strokeOpacity={0.5}
                  />
                  <Scatter name="Actividades" data={scatterData} fill="#3b82f6">
                    {scatterData.map((entry, i) => (
                      <Cell
                        key={i}
                        fill={
                          entry.y < 50 ? "#ef4444" : entry.y < 80 ? "#eab308" : "#22c55e"
                        }
                        fillOpacity={0.7}
                      />
                    ))}
                  </Scatter>
                </ScatterChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {/* Detail table */}
        <Card>
          <CardHeader className="p-3 pb-2">
            <CardTitle className="text-sm">
              Detalle de eficiencia por actividad
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-20">Código</TableHead>
                  <TableHead>Actividad</TableHead>
                  <TableHead className="w-24">Tipo</TableHead>
                  <TableHead className="text-right">Directo</TableHead>
                  <TableHead className="text-right">Recibido</TableHead>
                  <TableHead className="text-right font-semibold">
                    Total
                  </TableHead>
                  <TableHead className="text-right">Distribuido</TableHead>
                  <TableHead className="text-right w-16">Efic. %</TableHead>
                  <TableHead className="text-right w-12">OC</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {analysis.items.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-mono text-xs">
                      {item.code}
                    </TableCell>
                    <TableCell className="font-medium text-sm">
                      {item.name}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="secondary"
                        className="text-xs"
                        style={{
                          backgroundColor: `${item.typeColor}15`,
                          color: item.typeColor,
                          borderColor: `${item.typeColor}30`,
                        }}
                      >
                        {item.typeLabel}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-mono text-xs">
                      {fmt(item.direct_amount)}
                    </TableCell>
                    <TableCell className="text-right font-mono text-xs">
                      {fmt(item.received_amount)}
                    </TableCell>
                    <TableCell className="text-right font-mono text-xs font-semibold">
                      {fmt(item.total_cost)}
                    </TableCell>
                    <TableCell className="text-right font-mono text-xs">
                      {fmt(item.distributed)}
                    </TableCell>
                    <TableCell
                      className={`text-right font-mono text-xs font-semibold ${
                        item.efficiency >= 80
                          ? "text-emerald-600"
                          : item.efficiency >= 50
                            ? "text-amber-600"
                            : "text-red-600"
                      }`}
                    >
                      {item.efficiency.toFixed(1)}%
                    </TableCell>
                    <TableCell className="text-right text-xs">
                      {item.costObjectCount}
                    </TableCell>
                  </TableRow>
                ))}
                {/* Totals */}
                <TableRow className="bg-muted/50 font-semibold">
                  <TableCell colSpan={3} className="text-right">
                    TOTAL
                  </TableCell>
                  <TableCell className="text-right font-mono text-xs">
                    {fmt(
                      analysis.items.reduce((s, a) => s + a.direct_amount, 0),
                    )}
                  </TableCell>
                  <TableCell className="text-right font-mono text-xs">
                    {fmt(
                      analysis.items.reduce(
                        (s, a) => s + a.received_amount,
                        0,
                      ),
                    )}
                  </TableCell>
                  <TableCell className="text-right font-mono text-xs">
                    {fmt(analysis.totalCost)}
                  </TableCell>
                  <TableCell className="text-right font-mono text-xs">
                    {fmt(analysis.totalDistributed)}
                  </TableCell>
                  <TableCell className="text-right font-mono text-xs font-semibold">
                    {analysis.avgEfficiency.toFixed(1)}%
                  </TableCell>
                  <TableCell />
                </TableRow>
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
};

export default ActivityEfficiencyPage;
