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
  Package,
  Layers,
  DollarSign,
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

const TYPE_LABELS: Record<string, string> = {
  product: "Producto",
  service: "Servicio",
  client: "Cliente",
  channel: "Canal",
  project: "Proyecto",
  branch: "Sucursal",
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
const UnitCostPage = () => {
  const allocation = useAllocation();
  const { fmt } = useCurrency();

  const analysis = useMemo(() => {
    const summaries = allocation.costObjectSummaries;
    const coMap = new Map(allocation.costObjects.map((co) => [co.id, co]));

    const items = summaries.map((s) => {
      const co = coMap.get(s.id);
      const price = co?.price ?? 0;
      const margin = price > 0 ? price - s.total_cost : 0;
      const marginPct = price > 0 ? (margin / price) * 100 : 0;
      const directPct =
        s.total_cost > 0 ? (s.direct_amount / s.total_cost) * 100 : 0;
      const receivedPct =
        s.total_cost > 0 ? (s.received_amount / s.total_cost) * 100 : 0;

      return {
        id: s.id,
        code: s.code,
        name: s.name,
        type: s.type,
        typeLabel: TYPE_LABELS[s.type] || s.type,
        direct_amount: s.direct_amount,
        received_amount: s.received_amount,
        total_cost: s.total_cost,
        price,
        margin,
        marginPct,
        directPct,
        receivedPct,
      };
    });

    // Group by type
    const byType = new Map<
      string,
      { label: string; totalCost: number; count: number; avgCost: number }
    >();
    for (const item of items) {
      const existing = byType.get(item.type);
      if (existing) {
        existing.totalCost += item.total_cost;
        existing.count += 1;
        existing.avgCost = existing.totalCost / existing.count;
      } else {
        byType.set(item.type, {
          label: item.typeLabel,
          totalCost: item.total_cost,
          count: 1,
          avgCost: item.total_cost,
        });
      }
    }

    const totalCost = items.reduce((s, i) => s + i.total_cost, 0);
    const totalDirect = items.reduce((s, i) => s + i.direct_amount, 0);
    const totalReceived = items.reduce((s, i) => s + i.received_amount, 0);
    const avgCost = items.length > 0 ? totalCost / items.length : 0;
    const maxCost = items.length > 0 ? Math.max(...items.map((i) => i.total_cost)) : 0;
    const minCost = items.length > 0 ? Math.min(...items.map((i) => i.total_cost)) : 0;

    return {
      items: [...items].sort((a, b) => b.total_cost - a.total_cost),
      byType: Array.from(byType.values()),
      totalCost,
      totalDirect,
      totalReceived,
      avgCost,
      maxCost,
      minCost,
      count: items.length,
    };
  }, [allocation.costObjectSummaries, allocation.costObjects]);

  if (allocation.isLoading) {
    return (
      <AppLayout>
        <PageHeader
          title="Costo Unitario"
          description="Desglose del costo por objeto de costo"
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
          title="Costo Unitario"
          description="Desglose del costo por objeto de costo"
        />
        <Card className="border-dashed">
          <CardContent className="py-12 text-center text-muted-foreground">
            <p className="text-sm">No hay objetos de costo configurados.</p>
          </CardContent>
        </Card>
      </AppLayout>
    );
  }

  // Stacked bar chart: direct vs received
  const stackedData = analysis.items.slice(0, 15).map((item) => ({
    name:
      item.name.length > 18 ? item.name.slice(0, 15) + "..." : item.name,
    fullName: item.name,
    Directo: item.direct_amount,
    Recibido: item.received_amount,
  }));

  // Pie chart: cost by type
  const typeData = analysis.byType.map((t, i) => ({
    name: t.label,
    value: t.totalCost,
    count: t.count,
    color: COLORS[i % COLORS.length],
  }));

  // Horizontal bar: ranking by total cost
  const rankingData = analysis.items.slice(0, 10).map((item, i) => ({
    name:
      item.name.length > 22 ? item.name.slice(0, 19) + "..." : item.name,
    fullName: item.name,
    total: item.total_cost,
    color: COLORS[i % COLORS.length],
  }));

  return (
    <AppLayout>
      <PageHeader
        title="Costo Unitario por Objeto de Costo"
        description="Desglose detallado del costo total (directo + recibido) de cada objeto de costo"
      />

      {/* Summary cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <StatCard
          title="Costo total asignado"
          value={fmt(analysis.totalCost)}
          subtitle={`${analysis.count} objetos de costo`}
          icon={DollarSign}
          color="bg-blue-500/10 text-blue-600"
        />
        <StatCard
          title="Costo promedio"
          value={fmt(analysis.avgCost)}
          subtitle="por objeto de costo"
          icon={Package}
          color="bg-violet-500/10 text-violet-600"
        />
        <StatCard
          title="Composición"
          value={`${analysis.totalCost > 0 ? ((analysis.totalDirect / analysis.totalCost) * 100).toFixed(0) : 0}% / ${analysis.totalCost > 0 ? ((analysis.totalReceived / analysis.totalCost) * 100).toFixed(0) : 0}%`}
          subtitle="directo / recibido"
          icon={Layers}
          color="bg-orange-500/10 text-orange-600"
        />
        <StatCard
          title="Rango de costos"
          value={`${fmtShort(analysis.minCost)} – ${fmtShort(analysis.maxCost)}`}
          subtitle="mín – máx"
          icon={TrendingUp}
          color="bg-emerald-500/10 text-emerald-600"
        />
      </div>

      <div className="space-y-6">
        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Stacked bar: composition */}
          <Card>
            <CardHeader className="p-3 pb-0">
              <CardTitle className="text-sm">
                Composición: Costo directo vs. recibido
              </CardTitle>
            </CardHeader>
            <CardContent className="p-2">
              <ResponsiveContainer width="100%" height={320}>
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

          {/* Pie: by type */}
          <Card>
            <CardHeader className="p-3 pb-0">
              <CardTitle className="text-sm">Costo por tipo de objeto</CardTitle>
            </CardHeader>
            <CardContent className="p-2">
              <ResponsiveContainer width="100%" height={320}>
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
            </CardContent>
          </Card>
        </div>

        {/* Ranking chart */}
        <Card>
          <CardHeader className="p-3 pb-0">
            <CardTitle className="text-sm">
              Top 10 objetos de costo por costo total
            </CardTitle>
          </CardHeader>
          <CardContent className="p-2">
            <ResponsiveContainer width="100%" height={280}>
              <BarChart
                data={rankingData}
                layout="vertical"
                margin={{ top: 5, right: 20, left: 100, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                <XAxis
                  type="number"
                  tickFormatter={fmtShort}
                  tick={{ fontSize: 10 }}
                />
                <YAxis
                  type="category"
                  dataKey="name"
                  tick={{ fontSize: 10 }}
                  width={95}
                />
                <Tooltip
                  formatter={(value: number) => fmt(value)}
                  labelFormatter={(_, payload) =>
                    payload?.[0]?.payload?.fullName ?? ""
                  }
                />
                <Bar dataKey="total" name="Costo total" radius={[0, 4, 4, 0]}>
                  {rankingData.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Detail table */}
        <Card>
          <CardHeader className="p-3 pb-2">
            <CardTitle className="text-sm">
              Detalle de costo unitario por objeto de costo
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-20">Código</TableHead>
                  <TableHead>Nombre</TableHead>
                  <TableHead className="w-24">Tipo</TableHead>
                  <TableHead className="text-right">Directo</TableHead>
                  <TableHead className="text-right">% Dir.</TableHead>
                  <TableHead className="text-right">Recibido</TableHead>
                  <TableHead className="text-right">% Rec.</TableHead>
                  <TableHead className="text-right font-semibold">
                    Costo total
                  </TableHead>
                  <TableHead className="text-right">Precio</TableHead>
                  <TableHead className="text-right">Margen</TableHead>
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
                      <Badge variant="secondary" className="text-xs">
                        {item.typeLabel}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-mono text-xs">
                      {fmt(item.direct_amount)}
                    </TableCell>
                    <TableCell className="text-right font-mono text-xs text-muted-foreground">
                      {item.directPct.toFixed(0)}%
                    </TableCell>
                    <TableCell className="text-right font-mono text-xs">
                      {fmt(item.received_amount)}
                    </TableCell>
                    <TableCell className="text-right font-mono text-xs text-muted-foreground">
                      {item.receivedPct.toFixed(0)}%
                    </TableCell>
                    <TableCell className="text-right font-mono text-xs font-semibold">
                      {fmt(item.total_cost)}
                    </TableCell>
                    <TableCell className="text-right font-mono text-xs">
                      {item.price > 0 ? fmt(item.price) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell
                      className={`text-right font-mono text-xs ${
                        item.price > 0
                          ? item.margin >= 0
                            ? "text-emerald-600"
                            : "text-red-600"
                          : "text-muted-foreground"
                      }`}
                    >
                      {item.price > 0 ? (
                        <>
                          {fmt(item.margin)}{" "}
                          <span className="text-[10px]">
                            ({item.marginPct.toFixed(0)}%)
                          </span>
                        </>
                      ) : (
                        "—"
                      )}
                    </TableCell>
                  </TableRow>
                ))}
                {/* Totals */}
                <TableRow className="bg-muted/50 font-semibold">
                  <TableCell colSpan={3} className="text-right">
                    TOTAL
                  </TableCell>
                  <TableCell className="text-right font-mono text-xs">
                    {fmt(analysis.totalDirect)}
                  </TableCell>
                  <TableCell className="text-right font-mono text-xs text-muted-foreground">
                    {analysis.totalCost > 0
                      ? `${((analysis.totalDirect / analysis.totalCost) * 100).toFixed(0)}%`
                      : "0%"}
                  </TableCell>
                  <TableCell className="text-right font-mono text-xs">
                    {fmt(analysis.totalReceived)}
                  </TableCell>
                  <TableCell className="text-right font-mono text-xs text-muted-foreground">
                    {analysis.totalCost > 0
                      ? `${((analysis.totalReceived / analysis.totalCost) * 100).toFixed(0)}%`
                      : "0%"}
                  </TableCell>
                  <TableCell className="text-right font-mono text-xs">
                    {fmt(analysis.totalCost)}
                  </TableCell>
                  <TableCell colSpan={2} />
                </TableRow>
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
};

export default UnitCostPage;
