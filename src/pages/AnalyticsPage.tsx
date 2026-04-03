import { useNavigate } from "react-router-dom";
import { AppLayout } from "@/components/AppLayout";
import { PageHeader } from "@/components/PageHeader";
import { GaugeChart } from "@/components/charts/GaugeChart";
import { StrategicMapCard } from "@/components/charts/StrategicMapCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Loader2, BarChart3 } from "lucide-react";
import { useBSCContext } from "@/contexts/BSCContext";
import { useBSCPerspectives, useBSCKPIs, type BSCKPI } from "@/hooks/use-bsc-data";

function getStatus(kpi: BSCKPI): "success" | "warning" | "danger" {
  if (kpi.threshold_green != null && kpi.current_value >= kpi.threshold_green)
    return "success";
  if (kpi.threshold_yellow != null && kpi.current_value >= kpi.threshold_yellow)
    return "warning";
  return "danger";
}

const AnalyticsPage = () => {
  const navigate = useNavigate();
  const { selectedBSCModel, selectedBSCPeriod } = useBSCContext();

  // Redirect guard
  if (!selectedBSCModel || !selectedBSCPeriod) {
    return (
      <AppLayout>
        <div className="flex flex-col items-center justify-center py-32 gap-4">
          <BarChart3 className="h-12 w-12 text-muted-foreground opacity-30" />
          <p className="text-muted-foreground text-sm">
            Selecciona un modelo y período BSC para ver la analítica.
          </p>
          <Button onClick={() => navigate("/bsc")}>Ir a Modelos BSC</Button>
        </div>
      </AppLayout>
    );
  }

  const perspectives = useBSCPerspectives(selectedBSCPeriod.id);
  const perspectiveIds = perspectives.items.map((p) => p.id);
  const kpis = useBSCKPIs(perspectiveIds);

  const isLoading = perspectives.isLoading || kpis.isLoading;

  // Root KPIs only for gauges (leaf KPIs make gauges unreadable)
  const rootKpis = kpis.items.filter((k) => !k.parent_id);

  // Strategic map: one entry per perspective
  const strategicMap = perspectives.items.map((p) => ({
    perspective: p.name,
    kpis: kpis.items
      .filter((k) => k.perspective_id === p.id && !k.parent_id)
      .map((k) => ({
        name: k.name,
        score: k.current_value,
        status: getStatus(k),
      })),
  }));

  return (
    <AppLayout>
      <PageHeader
        title="Analítica BSC"
        description={`${selectedBSCModel.name} — ${selectedBSCPeriod.name}`}
      />

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : (
        <Tabs defaultValue="gauges">
          <TabsList>
            <TabsTrigger value="gauges">Velocímetros</TabsTrigger>
            <TabsTrigger value="strategic">Mapa Estratégico</TabsTrigger>
          </TabsList>

          {/* Gauges tab */}
          <TabsContent value="gauges" className="mt-4">
            {rootKpis.length === 0 ? (
              <div className="py-20 text-center text-sm text-muted-foreground">
                No hay KPIs en este período. Crea perspectivas y KPIs desde{" "}
                <button
                  className="text-primary underline"
                  onClick={() => navigate("/bsc/strategy")}
                >
                  Estrategia
                </button>
                .
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {rootKpis.map((kpi) => {
                  const status = getStatus(kpi);
                  // Normalise value to 0-100 for the gauge
                  const maxRef =
                    kpi.target_value ??
                    kpi.threshold_green ??
                    kpi.threshold_yellow ??
                    100;
                  const gaugeValue =
                    maxRef > 0
                      ? Math.min(100, Math.max(0, (kpi.current_value / maxRef) * 100))
                      : Math.min(100, Math.max(0, kpi.current_value));

                  return (
                    <Card key={kpi.id} className="border-border/50">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium">
                          {kpi.name}
                        </CardTitle>
                        <p className="text-xs text-muted-foreground">
                          Actual: <strong>{kpi.current_value.toFixed(1)}{kpi.unit}</strong>
                          {kpi.target_value != null && (
                            <> / Objetivo: {kpi.target_value.toFixed(1)}{kpi.unit}</>
                          )}
                        </p>
                      </CardHeader>
                      <CardContent className="flex justify-center pb-4">
                        <GaugeChart value={gaugeValue} status={status} />
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>

          {/* Strategic map tab */}
          <TabsContent value="strategic" className="mt-4">
            {strategicMap.length === 0 ? (
              <div className="py-20 text-center text-sm text-muted-foreground">
                No hay perspectivas configuradas en este período.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {strategicMap.map((p) => (
                  <StrategicMapCard
                    key={p.perspective}
                    perspective={p.perspective}
                    kpis={p.kpis}
                  />
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      )}
    </AppLayout>
  );
};

export default AnalyticsPage;
