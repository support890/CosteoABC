import { AppLayout } from "@/components/AppLayout";
import { PageHeader } from "@/components/PageHeader";
import { GaugeChart } from "@/components/charts/GaugeChart";
import { StrategicMapCard } from "@/components/charts/StrategicMapCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

const gauges = [
  { name: "ROI", value: 82, status: "success" as const },
  { name: "NPS", value: 58, status: "warning" as const },
  { name: "Tiempo Ciclo", value: 25, status: "danger" as const },
  { name: "Margen Neto", value: 75, status: "success" as const },
  { name: "Retención", value: 61, status: "warning" as const },
  { name: "Defectos", value: 79, status: "success" as const },
];

const trendData = [
  { period: "Q1 2024", roi: 7.2, nps: 5.0, cycle: 4.5 },
  { period: "Q2 2024", roi: 7.5, nps: 5.3, cycle: 4.2 },
  { period: "Q3 2024", roi: 7.8, nps: 5.5, cycle: 3.8 },
  { period: "Q4 2024", roi: 8.2, nps: 5.8, cycle: 3.2 },
];

const strategicMap = [
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

const AnalyticsPage = () => {
  return (
    <AppLayout>
      <PageHeader
        title="Analítica"
        description="Dashboards interactivos y visualización de datos"
      />

      <Tabs defaultValue="gauges">
        <TabsList>
          <TabsTrigger value="gauges">Velocímetros</TabsTrigger>
          <TabsTrigger value="strategic">Mapa Estratégico</TabsTrigger>
          <TabsTrigger value="trends">Tendencias</TabsTrigger>
        </TabsList>

        <TabsContent value="gauges" className="mt-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {gauges.map((g) => (
              <Card key={g.name} className="border-border/50">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">
                    {g.name}
                  </CardTitle>
                </CardHeader>
                <CardContent className="flex justify-center pb-4">
                  <GaugeChart value={g.value} status={g.status} />
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="strategic" className="mt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {strategicMap.map((p) => (
              <StrategicMapCard
                key={p.perspective}
                perspective={p.perspective}
                kpis={p.kpis}
              />
            ))}
          </div>
        </TabsContent>

        <TabsContent value="trends" className="mt-4">
          <Card className="border-border/50">
            <CardHeader>
              <CardTitle className="text-sm font-medium">
                Tendencia Trimestral de KPIs (puntaje 0-10)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={320}>
                <BarChart data={trendData}>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="hsl(var(--border))"
                  />
                  <XAxis
                    dataKey="period"
                    stroke="hsl(var(--muted-foreground))"
                    fontSize={12}
                  />
                  <YAxis
                    stroke="hsl(var(--muted-foreground))"
                    fontSize={12}
                    domain={[0, 10]}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                      color: "hsl(var(--foreground))",
                    }}
                  />
                  <Bar
                    dataKey="roi"
                    fill="hsl(var(--success))"
                    radius={[4, 4, 0, 0]}
                    name="ROI"
                  />
                  <Bar
                    dataKey="nps"
                    fill="hsl(var(--warning))"
                    radius={[4, 4, 0, 0]}
                    name="NPS"
                  />
                  <Bar
                    dataKey="cycle"
                    fill="hsl(var(--danger))"
                    radius={[4, 4, 0, 0]}
                    name="Tiempo Ciclo"
                  />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </AppLayout>
  );
};

export default AnalyticsPage;
