import { useMemo, useState } from "react";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Building2, Layers, Package } from "lucide-react";
import { useAllocation } from "@/hooks/use-allocation";
import { useCurrency } from "@/hooks/use-currency";
import {
  useCostCenters,
  useActivityCenters,
  useCostObjectCenters,
} from "@/hooks/use-supabase-data";
import {
  Treemap,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Cell,
  PieChart,
  Pie,
  Legend,
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

interface CenterData {
  id: string;
  code: string;
  name: string;
  amount: number;
  percentage: number;
  itemCount: number;
  parentName: string | null;
}

/* ───── Custom Treemap Content ───── */
function CustomTreemapContent(props: any) {
  const { x, y, width, height, name, value, index } = props;
  if (width < 40 || height < 25) return null;
  const color = COLORS[index % COLORS.length];

  return (
    <g>
      <rect
        x={x}
        y={y}
        width={width}
        height={height}
        fill={color}
        fillOpacity={0.85}
        rx={4}
        stroke="#fff"
        strokeWidth={2}
      />
      {width > 60 && height > 35 && (
        <>
          <text
            x={x + width / 2}
            y={y + height / 2 - 6}
            textAnchor="middle"
            fill="#fff"
            fontSize={11}
            fontWeight="600"
          >
            {name?.length > 18 ? name.slice(0, 15) + "..." : name}
          </text>
          <text
            x={x + width / 2}
            y={y + height / 2 + 10}
            textAnchor="middle"
            fill="rgba(255,255,255,0.8)"
            fontSize={9}
          >
            {fmtShort(value)}
          </text>
        </>
      )}
    </g>
  );
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

/* ───── Center View component ───── */
function CenterView({
  title,
  centers,
  total,
}: {
  title: string;
  centers: CenterData[];
  total: number;
}) {
  const { fmt } = useCurrency();
  const sorted = [...centers].sort((a, b) => b.amount - a.amount);

  const treemapData = sorted
    .filter((c) => c.amount > 0)
    .map((c) => ({
      name: c.name,
      value: c.amount,
    }));

  const pieData = sorted
    .filter((c) => c.amount > 0)
    .map((c) => ({
      name: c.name,
      value: c.amount,
      pct: total > 0 ? ((c.amount / total) * 100).toFixed(1) : "0",
    }));

  const barData = sorted.map((c) => ({
    name: c.name.length > 20 ? c.name.slice(0, 17) + "..." : c.name,
    fullName: c.name,
    amount: c.amount,
    items: c.itemCount,
  }));

  return (
    <div className="space-y-4">
      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Treemap */}
        <Card>
          <CardHeader className="p-3 pb-0">
            <CardTitle className="text-sm">Mapa de costos por centro</CardTitle>
          </CardHeader>
          <CardContent className="p-2">
            {treemapData.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-10">
                Sin datos
              </p>
            ) : (
              <ResponsiveContainer width="100%" height={320}>
                <Treemap
                  data={treemapData}
                  dataKey="value"
                  aspectRatio={4 / 3}
                  content={<CustomTreemapContent />}
                >
                  <Tooltip formatter={(value: number) => fmt(value)} />
                </Treemap>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Pie */}
        <Card>
          <CardHeader className="p-3 pb-0">
            <CardTitle className="text-sm">Distribución porcentual</CardTitle>
          </CardHeader>
          <CardContent className="p-2">
            {pieData.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-10">
                Sin datos
              </p>
            ) : (
              <ResponsiveContainer width="100%" height={320}>
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    outerRadius={100}
                    dataKey="value"
                    label={({ pct }) => `${pct}%`}
                    labelLine={true}
                  >
                    {pieData.map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: number) => fmt(value)} />
                  <Legend wrapperStyle={{ fontSize: "11px" }} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Bar chart */}
      <Card>
        <CardHeader className="p-3 pb-0">
          <CardTitle className="text-sm">Costo por centro</CardTitle>
        </CardHeader>
        <CardContent className="p-2">
          {barData.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-10">
              Sin datos
            </p>
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart
                data={barData}
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
                <Bar dataKey="amount" name="Costo total" radius={[4, 4, 0, 0]}>
                  {barData.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* Detail table */}
      <Card>
        <CardHeader className="p-3 pb-2">
          <CardTitle className="text-sm">{title}</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-20">Código</TableHead>
                <TableHead>Centro</TableHead>
                <TableHead>Padre</TableHead>
                <TableHead className="text-right w-16">Items</TableHead>
                <TableHead className="text-right">Costo</TableHead>
                <TableHead className="text-right w-16">%</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sorted.map((c) => (
                <TableRow key={c.id}>
                  <TableCell className="font-mono text-xs">{c.code}</TableCell>
                  <TableCell className="font-medium text-sm">{c.name}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {c.parentName || "—"}
                  </TableCell>
                  <TableCell className="text-right">
                    <Badge variant="secondary" className="text-xs">
                      {c.itemCount}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right font-mono text-xs">
                    {fmt(c.amount)}
                  </TableCell>
                  <TableCell className="text-right font-mono text-xs">
                    {c.percentage.toFixed(1)}%
                  </TableCell>
                </TableRow>
              ))}
              {sorted.length > 0 && (
                <TableRow className="bg-muted/50 font-semibold">
                  <TableCell colSpan={4} className="text-right">
                    TOTAL
                  </TableCell>
                  <TableCell className="text-right font-mono text-xs">
                    {fmt(total)}
                  </TableCell>
                  <TableCell className="text-right font-mono text-xs">
                    100%
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

/* ───── Main Page ───── */
const CostCenterAnalysisPage = () => {
  const allocation = useAllocation();
  const { fmt } = useCurrency();
  const costCenters = useCostCenters();
  const activityCenters = useActivityCenters();
  const costObjectCenters = useCostObjectCenters();
  const [activeTab, setActiveTab] = useState("resource_centers");

  // Resource centers data
  const resCenterData = useMemo(() => {
    const centerMap = new Map(costCenters.items.map((c) => [c.id, c]));

    const data: CenterData[] = costCenters.items.map((center) => {
      const resources = allocation.resources.filter(
        (r) => r.center_id === center.id,
      );
      const amount = resources.reduce((s, r) => s + r.amount, 0);
      const parent = center.parent_id ? centerMap.get(center.parent_id) : null;

      return {
        id: center.id,
        code: center.code,
        name: center.name,
        amount,
        percentage: 0,
        itemCount: resources.length,
        parentName: parent?.name ?? null,
      };
    });

    // Also include resources without center
    const resourcesWithoutCenter = allocation.resources.filter(
      (r) => !r.center_id,
    );
    if (resourcesWithoutCenter.length > 0) {
      const amount = resourcesWithoutCenter.reduce((s, r) => s + r.amount, 0);
      data.push({
        id: "__no_center__",
        code: "—",
        name: "Sin centro asignado",
        amount,
        percentage: 0,
        itemCount: resourcesWithoutCenter.length,
        parentName: null,
      });
    }

    const total = data.reduce((s, d) => s + d.amount, 0);
    for (const d of data) {
      d.percentage = total > 0 ? (d.amount / total) * 100 : 0;
    }

    return { data, total };
  }, [costCenters.items, allocation.resources]);

  // Activity centers data
  const actCenterData = useMemo(() => {
    const centerMap = new Map(activityCenters.items.map((c) => [c.id, c]));

    const data: CenterData[] = activityCenters.items.map((center) => {
      const activities = allocation.activities.filter(
        (a) => a.center_id === center.id,
      );
      const summary = allocation.activitySummaries.filter((s) =>
        activities.some((a) => a.id === s.id),
      );
      const amount = summary.reduce((s, a) => s + a.total_cost, 0);
      const parent = center.parent_id ? centerMap.get(center.parent_id) : null;

      return {
        id: center.id,
        code: center.code,
        name: center.name,
        amount,
        percentage: 0,
        itemCount: activities.length,
        parentName: parent?.name ?? null,
      };
    });

    const activitiesWithoutCenter = allocation.activities.filter(
      (a) => !a.center_id,
    );
    if (activitiesWithoutCenter.length > 0) {
      const summary = allocation.activitySummaries.filter((s) =>
        activitiesWithoutCenter.some((a) => a.id === s.id),
      );
      const amount = summary.reduce((s, a) => s + a.total_cost, 0);
      data.push({
        id: "__no_center__",
        code: "—",
        name: "Sin centro asignado",
        amount,
        percentage: 0,
        itemCount: activitiesWithoutCenter.length,
        parentName: null,
      });
    }

    const total = data.reduce((s, d) => s + d.amount, 0);
    for (const d of data) {
      d.percentage = total > 0 ? (d.amount / total) * 100 : 0;
    }

    return { data, total };
  }, [activityCenters.items, allocation.activities, allocation.activitySummaries]);

  // Cost object centers data
  const coCenterData = useMemo(() => {
    const centerMap = new Map(costObjectCenters.items.map((c) => [c.id, c]));

    const data: CenterData[] = costObjectCenters.items.map((center) => {
      const costObjs = allocation.costObjects.filter(
        (co) => co.center_id === center.id,
      );
      const summary = allocation.costObjectSummaries.filter((s) =>
        costObjs.some((co) => co.id === s.id),
      );
      const amount = summary.reduce((s, co) => s + co.total_cost, 0);
      const parent = center.parent_id ? centerMap.get(center.parent_id) : null;

      return {
        id: center.id,
        code: center.code,
        name: center.name,
        amount,
        percentage: 0,
        itemCount: costObjs.length,
        parentName: parent?.name ?? null,
      };
    });

    const costObjsWithoutCenter = allocation.costObjects.filter(
      (co) => !co.center_id,
    );
    if (costObjsWithoutCenter.length > 0) {
      const summary = allocation.costObjectSummaries.filter((s) =>
        costObjsWithoutCenter.some((co) => co.id === s.id),
      );
      const amount = summary.reduce((s, co) => s + co.total_cost, 0);
      data.push({
        id: "__no_center__",
        code: "—",
        name: "Sin centro asignado",
        amount,
        percentage: 0,
        itemCount: costObjsWithoutCenter.length,
        parentName: null,
      });
    }

    const total = data.reduce((s, d) => s + d.amount, 0);
    for (const d of data) {
      d.percentage = total > 0 ? (d.amount / total) * 100 : 0;
    }

    return { data, total };
  }, [costObjectCenters.items, allocation.costObjects, allocation.costObjectSummaries]);

  const isLoading =
    allocation.isLoading ||
    costCenters.isLoading ||
    activityCenters.isLoading ||
    costObjectCenters.isLoading;

  if (isLoading) {
    return (
      <AppLayout>
        <PageHeader
          title="Análisis por Centro"
          description="Distribución de costos agrupada por centros"
        />
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      </AppLayout>
    );
  }

  const hasCenters =
    costCenters.items.length > 0 ||
    activityCenters.items.length > 0 ||
    costObjectCenters.items.length > 0;

  return (
    <AppLayout>
      <PageHeader
        title="Análisis por Centro de Costo"
        description="Visualización del costo acumulado por centro jerárquico en cada etapa del modelo"
      />

      {/* Summary cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <StatCard
          title="Centros de recurso"
          value={String(costCenters.items.length)}
          subtitle={`${allocation.resources.length} recursos`}
          icon={Building2}
          color="bg-blue-500/10 text-blue-600"
        />
        <StatCard
          title="Centros de actividad"
          value={String(activityCenters.items.length)}
          subtitle={`${allocation.activities.length} actividades`}
          icon={Layers}
          color="bg-orange-500/10 text-orange-600"
        />
        <StatCard
          title="Centros de obj. costo"
          value={String(costObjectCenters.items.length)}
          subtitle={`${allocation.costObjects.length} objetos de costo`}
          icon={Package}
          color="bg-emerald-500/10 text-emerald-600"
        />
      </div>

      {!hasCenters ? (
        <Card className="border-dashed">
          <CardContent className="py-12 text-center text-muted-foreground">
            <p className="text-sm">No hay centros configurados.</p>
            <p className="text-xs mt-1">
              Configura centros en los diccionarios para agrupar recursos,
              actividades y objetos de costo.
            </p>
          </CardContent>
        </Card>
      ) : (
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="resource_centers">
              Centros de Recurso
            </TabsTrigger>
            <TabsTrigger value="activity_centers">
              Centros de Actividad
            </TabsTrigger>
            <TabsTrigger value="cost_object_centers">
              Centros de Obj. Costo
            </TabsTrigger>
          </TabsList>

          <TabsContent value="resource_centers" className="mt-4">
            <CenterView
              title="Detalle: Costo por centro de recurso"
              centers={resCenterData.data}
              total={resCenterData.total}
            />
          </TabsContent>

          <TabsContent value="activity_centers" className="mt-4">
            <CenterView
              title="Detalle: Costo por centro de actividad"
              centers={actCenterData.data}
              total={actCenterData.total}
            />
          </TabsContent>

          <TabsContent value="cost_object_centers" className="mt-4">
            <CenterView
              title="Detalle: Costo por centro de objeto de costo"
              centers={coCenterData.data}
              total={coCenterData.total}
            />
          </TabsContent>
        </Tabs>
      )}
    </AppLayout>
  );
};

export default CostCenterAnalysisPage;
