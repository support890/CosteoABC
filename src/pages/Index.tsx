import { AppLayout } from "@/components/AppLayout";
import { PageHeader } from "@/components/PageHeader";
import { GaugeChart } from "@/components/charts/GaugeChart";
import { StrategicMapCard } from "@/components/charts/StrategicMapCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import {
  TrendingUp,
  DollarSign,
  Activity,
  Target,
  Loader2,
} from "lucide-react";
import {
  useResources,
  useActivities,
  useKPIs,
  usePerspectives,
} from "@/hooks/use-supabase-data";
import { useTenant } from "@/hooks/use-tenant";

/* ───── fallback chart data ───── */
const histogramData = [
  { month: "Ene", actual: 12400, target: 13000 },
  { month: "Feb", actual: 11800, target: 13000 },
  { month: "Mar", actual: 14200, target: 13500 },
  { month: "Abr", actual: 13800, target: 13500 },
  { month: "May", actual: 15200, target: 14000 },
  { month: "Jun", actual: 14600, target: 14000 },
];

function getKPIStatus(kpi: {
  current_value: number;
  threshold_green: number | null;
  threshold_yellow: number | null;
}): "success" | "warning" | "danger" {
  if (kpi.threshold_green != null && kpi.current_value >= kpi.threshold_green)
    return "success";
  if (kpi.threshold_yellow != null && kpi.current_value >= kpi.threshold_yellow)
    return "warning";
  return "danger";
}

const Index = () => {
  const { tenant, loading: tenantLoading } = useTenant();
  const resources = useResources();
  const activities = useActivities();
  const kpis = useKPIs();
  const perspectives = usePerspectives();

  const isLoading =
    tenantLoading ||
    resources.isLoading ||
    activities.isLoading ||
    kpis.isLoading ||
    perspectives.isLoading;

  // Computed summary
  const totalCost = resources.items.reduce(
    (sum, r) => sum + (r.amount || 0),
    0,
  );
  const activeActivities = activities.items.length;
  const greenKpis = kpis.items.filter(
    (k) => getKPIStatus(k) === "success",
  ).length;
  const totalKpis = kpis.items.length;

  const summaryCards = [
    {
      label: "Costo Total Asignado",
      value: `$${totalCost.toLocaleString("en-US")}`,
      icon: DollarSign,
      change: `${resources.items.length} recursos`,
    },
    {
      label: "Actividades Activas",
      value: String(activeActivities),
      icon: Activity,
      change: "en diccionario",
    },
    {
      label: "KPIs en Verde",
      value: totalKpis > 0 ? `${greenKpis}/${totalKpis}` : "—",
      icon: Target,
      change:
        totalKpis > 0
          ? `${Math.round((greenKpis / totalKpis) * 100)}%`
          : "sin KPIs",
    },
    {
      label: "Tenant",
      value: tenant?.name || "—",
      icon: TrendingUp,
      change: tenant?.plan || "",
    },
  ];

  // KPIs for gauges (take first 3)
  const gaugeKpis = kpis.items.slice(0, 3).map((k) => ({
    name: k.name,
    value: Math.min(100, Math.max(0, k.current_value)),
    status: getKPIStatus(k),
  }));

  // Strategic map from perspectives + KPIs
  const strategicMap = perspectives.items.map((p) => ({
    perspective: p.name,
    kpis: kpis.items
      .filter((k) => k.perspective_id === p.id)
      .map((k) => ({
        name: k.name,
        score: k.current_value,
        status: getKPIStatus(k),
      })),
  }));

  if (isLoading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center py-32">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <PageHeader
        title="Dashboard"
        description="Vista general del desempeño corporativo"
      />

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {summaryCards.map((card) => (
          <Card key={card.label} className="border-border/50">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">{card.label}</p>
                  <p className="text-2xl font-bold mt-1">{card.value}</p>
                  <p className="text-xs text-primary mt-1">{card.change}</p>
                </div>
                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <card.icon className="h-5 w-5 text-primary" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Gauges Row */}
      {gaugeKpis.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-8">
          {gaugeKpis.map((kpi) => (
            <Card key={kpi.name} className="border-border/50">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">
                  {kpi.name}
                </CardTitle>
              </CardHeader>
              <CardContent className="flex justify-center pb-4">
                <GaugeChart value={kpi.value} status={kpi.status} />
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Histogram */}
      <Card className="border-border/50 mb-8">
        <CardHeader>
          <CardTitle className="text-sm font-medium">
            Tendencia de Costos vs Objetivo
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={histogramData}>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="hsl(var(--border))"
              />
              <XAxis
                dataKey="month"
                stroke="hsl(var(--muted-foreground))"
                fontSize={12}
              />
              <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "8px",
                  color: "hsl(var(--foreground))",
                }}
              />
              <Bar
                dataKey="actual"
                fill="hsl(var(--primary))"
                radius={[4, 4, 0, 0]}
                name="Real"
              />
              <Bar
                dataKey="target"
                fill="hsl(var(--muted-foreground))"
                radius={[4, 4, 0, 0]}
                name="Objetivo"
                opacity={0.4}
              />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Strategic Map */}
      {strategicMap.length > 0 && (
        <Card className="border-border/50">
          <CardHeader>
            <CardTitle className="text-sm font-medium">
              Mapa Estratégico
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {strategicMap.map((perspective) => (
                <StrategicMapCard
                  key={perspective.perspective}
                  perspective={perspective.perspective}
                  kpis={perspective.kpis}
                />
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </AppLayout>
  );
};

export default Index;
