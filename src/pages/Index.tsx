import { AppLayout } from "@/components/AppLayout";
import { PageHeader } from "@/components/PageHeader";
import { GaugeChart } from "@/components/charts/GaugeChart";
import { StrategicMapCard } from "@/components/charts/StrategicMapCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { TrendingUp, DollarSign, Activity, Target } from "lucide-react";

const summaryCards = [
  { label: "Costo Total Asignado", value: "$142,580", icon: DollarSign, change: "+12.5%" },
  { label: "Actividades Activas", value: "24", icon: Activity, change: "+3" },
  { label: "KPIs en Verde", value: "18/25", icon: Target, change: "72%" },
  { label: "Eficiencia Promedio", value: "87%", icon: TrendingUp, change: "+4.2%" },
];

const histogramData = [
  { month: "Ene", actual: 12400, target: 13000 },
  { month: "Feb", actual: 11800, target: 13000 },
  { month: "Mar", actual: 14200, target: 13500 },
  { month: "Abr", actual: 13800, target: 13500 },
  { month: "May", actual: 15200, target: 14000 },
  { month: "Jun", actual: 14600, target: 14000 },
];

const kpiSamples = [
  { name: "Margen Bruto", value: 78, status: "success" as const },
  { name: "Satisfacción Cliente", value: 52, status: "warning" as const },
  { name: "Rotación Inventario", value: 25, status: "danger" as const },
];

const strategicKPIs = [
  {
    perspective: "Financiera",
    kpis: [
      { name: "ROI", score: 8.2, status: "success" as const },
      { name: "Margen Neto", score: 7.5, status: "success" as const },
    ],
  },
  {
    perspective: "Clientes",
    kpis: [
      { name: "NPS", score: 5.8, status: "warning" as const },
      { name: "Retención", score: 6.1, status: "warning" as const },
    ],
  },
  {
    perspective: "Procesos",
    kpis: [
      { name: "Tiempo Ciclo", score: 3.2, status: "danger" as const },
      { name: "Defectos", score: 7.9, status: "success" as const },
    ],
  },
  {
    perspective: "Aprendizaje",
    kpis: [
      { name: "Capacitación", score: 8.5, status: "success" as const },
      { name: "Innovación", score: 4.5, status: "warning" as const },
    ],
  },
];

const Index = () => {
  return (
    <AppLayout>
      <PageHeader title="Dashboard" description="Vista general del desempeño corporativo" />

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
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-8">
        {kpiSamples.map((kpi) => (
          <Card key={kpi.name} className="border-border/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">{kpi.name}</CardTitle>
            </CardHeader>
            <CardContent className="flex justify-center pb-4">
              <GaugeChart value={kpi.value} status={kpi.status} />
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Histogram */}
      <Card className="border-border/50 mb-8">
        <CardHeader>
          <CardTitle className="text-sm font-medium">Tendencia de Costos vs Objetivo</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={histogramData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" fontSize={12} />
              <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "8px",
                  color: "hsl(var(--foreground))",
                }}
              />
              <Bar dataKey="actual" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} name="Real" />
              <Bar dataKey="target" fill="hsl(var(--muted-foreground))" radius={[4, 4, 0, 0]} name="Objetivo" opacity={0.4} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Strategic Map */}
      <Card className="border-border/50">
        <CardHeader>
          <CardTitle className="text-sm font-medium">Mapa Estratégico</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {strategicKPIs.map((perspective) => (
              <StrategicMapCard key={perspective.perspective} perspective={perspective.perspective} kpis={perspective.kpis} />
            ))}
          </div>
        </CardContent>
      </Card>
    </AppLayout>
  );
};

export default Index;
