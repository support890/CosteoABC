import { useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  Loader2,
  DollarSign,
  Activity,
  Package,
  ArrowRight,
} from "lucide-react";
import { useAllocation } from "@/hooks/use-allocation";
import { useCurrency } from "@/hooks/use-currency";

/* ───── Stat Card ───── */
function StatCard({
  title,
  value,
  icon: Icon,
  color,
}: {
  title: string;
  value: string;
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
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

/* ───── Subtype labels ───── */
const subtypeLabels: Record<string, string> = {
  operative: "Operativa",
  production: "Producción",
  support: "Apoyo",
  product: "Producto",
  service: "Servicio",
  client: "Cliente",
  channel: "Canal",
  project: "Proyecto",
};

const AllocationResultsPage = () => {
  const allocation = useAllocation();
  const [activeTab, setActiveTab] = useState("activities");

  if (allocation.isLoading) {
    return (
      <AppLayout>
        <PageHeader
          title="Resultados de Costeo"
          description="Distribución final de costos ABC"
        />
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      </AppLayout>
    );
  }

  const { fmt } = useCurrency();
  const totalCostObjectCost = allocation.costObjectSummaries.reduce(
    (s, co) => s + co.total_cost,
    0,
  );

  return (
    <AppLayout>
      <PageHeader
        title="Resultados de Costeo ABC"
        description="Visualización de la distribución final de costos por el motor de asignación"
      />

      {/* Summary cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <StatCard
          title="Costo total recursos"
          value={fmt(allocation.totalResourceCost)}
          icon={DollarSign}
          color="bg-primary/10 text-primary"
        />
        <StatCard
          title="Total asignado (drivers)"
          value={fmt(allocation.totalAllocated)}
          icon={ArrowRight}
          color="bg-blue-500/10 text-blue-600"
        />
        <StatCard
          title="Actividades con costo"
          value={`${allocation.activitySummaries.filter((a) => a.total_cost > 0).length} / ${allocation.activitySummaries.length}`}
          icon={Activity}
          color="bg-amber-500/10 text-amber-600"
        />
        <StatCard
          title="Costo en objetos"
          value={fmt(totalCostObjectCost)}
          icon={Package}
          color="bg-emerald-500/10 text-emerald-600"
        />
      </div>

      {allocation.allocations.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-12 text-center text-muted-foreground">
            <p className="text-sm">
              No hay asignaciones con líneas de distribución configuradas.
            </p>
            <p className="text-xs mt-1">
              Crea drivers con destinos en la página de Asignaciones para ver
              los resultados aquí.
            </p>
          </CardContent>
        </Card>
      ) : (
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="w-full grid grid-cols-2 md:grid-cols-4 h-auto">
            <TabsTrigger value="resources" className="text-xs py-2">
              Recursos ({allocation.resources.length})
            </TabsTrigger>
            <TabsTrigger value="activities" className="text-xs py-2">
              Actividades ({allocation.activitySummaries.length})
            </TabsTrigger>
            <TabsTrigger value="cost_objects" className="text-xs py-2">
              Obj. Costo ({allocation.costObjectSummaries.length})
            </TabsTrigger>
            <TabsTrigger value="detail" className="text-xs py-2">
              Detalle ({allocation.allocations.length})
            </TabsTrigger>
          </TabsList>

          {/* Tab 0: Resources summary */}
          <TabsContent value="resources">
            <Card className="mt-4">
              <CardHeader>
                <CardTitle className="text-sm">
                  Costo por Recurso (Monto + Recibido)
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-20">Código</TableHead>
                      <TableHead>Nombre</TableHead>
                      <TableHead className="w-24">Tipo</TableHead>
                      <TableHead className="text-right">
                        Monto original
                      </TableHead>
                      <TableHead className="text-right">
                        Costo recibido
                      </TableHead>
                      <TableHead className="text-right font-semibold">
                        Costo total
                      </TableHead>
                      <TableHead className="text-right w-20">
                        % del total
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(() => {
                      const resourcesWithTotals = allocation.resources.map((r) => {
                        const received = allocation.resourceReceived[r.id] || 0;
                        return { ...r, received, total: r.amount + received };
                      });
                      const grandTotal = resourcesWithTotals.reduce((s, r) => s + r.total, 0);
                      return (
                        <>
                          {resourcesWithTotals
                            .sort((a, b) => b.total - a.total)
                            .map((r) => {
                              const pct = grandTotal > 0 ? (r.total / grandTotal) * 100 : 0;
                              return (
                                <TableRow key={r.id}>
                                  <TableCell className="font-mono text-xs">
                                    {r.code}
                                  </TableCell>
                                  <TableCell className="font-medium">
                                    {r.name}
                                  </TableCell>
                                  <TableCell>
                                    <Badge variant="secondary" className="text-xs">
                                      {r.type === "directo" ? "Directo" : "Indirecto"}
                                    </Badge>
                                  </TableCell>
                                  <TableCell className="text-right font-mono text-xs">
                                    {fmt(r.amount)}
                                  </TableCell>
                                  <TableCell className="text-right font-mono text-xs">
                                    {r.received > 0 ? (
                                      <span className="text-green-600">
                                        +{fmt(r.received)}
                                      </span>
                                    ) : (
                                      "—"
                                    )}
                                  </TableCell>
                                  <TableCell className="text-right font-mono text-sm font-semibold">
                                    {fmt(r.total)}
                                  </TableCell>
                                  <TableCell className="text-right font-mono text-xs">
                                    {pct.toFixed(1)}%
                                  </TableCell>
                                </TableRow>
                              );
                            })}
                          <TableRow className="bg-muted/50 font-semibold">
                            <TableCell colSpan={3} className="text-right">
                              TOTAL
                            </TableCell>
                            <TableCell className="text-right font-mono text-xs">
                              {fmt(resourcesWithTotals.reduce((s, r) => s + r.amount, 0))}
                            </TableCell>
                            <TableCell className="text-right font-mono text-xs text-green-600">
                              +{fmt(resourcesWithTotals.reduce((s, r) => s + r.received, 0))}
                            </TableCell>
                            <TableCell className="text-right font-mono">
                              {fmt(grandTotal)}
                            </TableCell>
                            <TableCell className="text-right font-mono text-xs">
                              100%
                            </TableCell>
                          </TableRow>
                        </>
                      );
                    })()}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tab 1: Activities summary */}
          <TabsContent value="activities">
            <Card className="mt-4">
              <CardHeader>
                <CardTitle className="text-sm">
                  Costo por Actividad (Directo + Recibido)
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-20">Código</TableHead>
                      <TableHead>Nombre</TableHead>
                      <TableHead className="w-24">Tipo</TableHead>
                      <TableHead className="text-right">
                        Costo directo
                      </TableHead>
                      <TableHead className="text-right">
                        Costo recibido
                      </TableHead>
                      <TableHead className="text-right font-semibold">
                        Costo total
                      </TableHead>
                      <TableHead className="text-right w-20">
                        % del total
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {allocation.activitySummaries
                      .sort((a, b) => b.total_cost - a.total_cost)
                      .map((a) => {
                        const totalAct = allocation.activitySummaries.reduce(
                          (s, x) => s + x.total_cost,
                          0,
                        );
                        const pct =
                          totalAct > 0 ? (a.total_cost / totalAct) * 100 : 0;
                        return (
                          <TableRow key={a.id}>
                            <TableCell className="font-mono text-xs">
                              {a.code}
                            </TableCell>
                            <TableCell className="font-medium">
                              {a.name}
                            </TableCell>
                            <TableCell>
                              <Badge variant="secondary" className="text-xs">
                                {subtypeLabels[a.type] || a.type}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right font-mono text-xs">
                              {fmt(a.direct_amount)}
                            </TableCell>
                            <TableCell className="text-right font-mono text-xs">
                              {a.received_amount > 0 ? (
                                <span className="text-green-600">
                                  +{fmt(a.received_amount)}
                                </span>
                              ) : (
                                "—"
                              )}
                            </TableCell>
                            <TableCell className="text-right font-mono text-sm font-semibold">
                              {fmt(a.total_cost)}
                            </TableCell>
                            <TableCell className="text-right font-mono text-xs">
                              {pct.toFixed(1)}%
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    {/* Totals row */}
                    <TableRow className="bg-muted/50 font-semibold">
                      <TableCell colSpan={3} className="text-right">
                        TOTAL
                      </TableCell>
                      <TableCell className="text-right font-mono text-xs">
                        {fmt(
                          allocation.activitySummaries.reduce(
                            (s, a) => s + a.direct_amount,
                            0,
                          ),
                        )}
                      </TableCell>
                      <TableCell className="text-right font-mono text-xs text-green-600">
                        +
                        {fmt(
                          allocation.activitySummaries.reduce(
                            (s, a) => s + a.received_amount,
                            0,
                          ),
                        )}
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {fmt(
                          allocation.activitySummaries.reduce(
                            (s, a) => s + a.total_cost,
                            0,
                          ),
                        )}
                      </TableCell>
                      <TableCell className="text-right font-mono text-xs">
                        100%
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tab 2: Cost Objects summary */}
          <TabsContent value="cost_objects">
            <Card className="mt-4">
              <CardHeader>
                <CardTitle className="text-sm">
                  Costo por Objeto de Costo (Directo + Recibido)
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-20">Código</TableHead>
                      <TableHead>Nombre</TableHead>
                      <TableHead className="w-24">Tipo</TableHead>
                      <TableHead className="text-right">
                        Costo directo
                      </TableHead>
                      <TableHead className="text-right">
                        Costo recibido
                      </TableHead>
                      <TableHead className="text-right font-semibold">
                        Costo total
                      </TableHead>
                      <TableHead className="text-right w-20">
                        % del total
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {allocation.costObjectSummaries
                      .sort((a, b) => b.total_cost - a.total_cost)
                      .map((co) => {
                        const pct =
                          totalCostObjectCost > 0
                            ? (co.total_cost / totalCostObjectCost) * 100
                            : 0;
                        return (
                          <TableRow key={co.id}>
                            <TableCell className="font-mono text-xs">
                              {co.code}
                            </TableCell>
                            <TableCell className="font-medium">
                              {co.name}
                            </TableCell>
                            <TableCell>
                              <Badge variant="secondary" className="text-xs">
                                {subtypeLabels[co.type] || co.type}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right font-mono text-xs">
                              {fmt(co.direct_amount)}
                            </TableCell>
                            <TableCell className="text-right font-mono text-xs">
                              {co.received_amount > 0 ? (
                                <span className="text-green-600">
                                  +{fmt(co.received_amount)}
                                </span>
                              ) : (
                                "—"
                              )}
                            </TableCell>
                            <TableCell className="text-right font-mono text-sm font-semibold">
                              {fmt(co.total_cost)}
                            </TableCell>
                            <TableCell className="text-right font-mono text-xs">
                              {pct.toFixed(1)}%
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    {/* Totals row */}
                    <TableRow className="bg-muted/50 font-semibold">
                      <TableCell colSpan={3} className="text-right">
                        TOTAL
                      </TableCell>
                      <TableCell className="text-right font-mono text-xs">
                        {fmt(
                          allocation.costObjectSummaries.reduce(
                            (s, co) => s + co.direct_amount,
                            0,
                          ),
                        )}
                      </TableCell>
                      <TableCell className="text-right font-mono text-xs text-green-600">
                        +
                        {fmt(
                          allocation.costObjectSummaries.reduce(
                            (s, co) => s + co.received_amount,
                            0,
                          ),
                        )}
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {fmt(totalCostObjectCost)}
                      </TableCell>
                      <TableCell className="text-right font-mono text-xs">
                        100%
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tab 3: Full allocation detail */}
          <TabsContent value="detail">
            <Card className="mt-4">
              <CardHeader>
                <CardTitle className="text-sm">
                  Trazabilidad completa de asignaciones
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Origen</TableHead>
                      <TableHead className="text-right">Monto origen</TableHead>
                      <TableHead>Driver</TableHead>
                      <TableHead>Destino</TableHead>
                      <TableHead className="text-right">%</TableHead>
                      <TableHead className="text-right font-semibold">
                        Monto asignado
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {allocation.allocations
                      .sort((a, b) => b.allocated_amount - a.allocated_amount)
                      .map((al, idx) => (
                        <TableRow
                          key={`${al.driver_id}-${al.destination_id}-${idx}`}
                        >
                          <TableCell>
                            <div>
                              <span className="text-xs font-mono">
                                {al.source_code}
                              </span>
                              <span className="text-xs text-muted-foreground ml-1">
                                {al.source_name}
                              </span>
                            </div>
                            <Badge
                              variant="outline"
                              className="text-[10px] mt-0.5"
                            >
                              {al.source_type === "resource"
                                ? "Recurso"
                                : "Actividad"}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right font-mono text-xs">
                            {fmt(al.source_amount)}
                          </TableCell>
                          <TableCell>
                            <div className="text-xs">{al.driver_name}</div>
                            <Badge variant="secondary" className="text-[10px]">
                              {al.driver_type === "uniform"
                                ? "Uniforme"
                                : "Extendido"}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div>
                              <span className="text-xs font-mono">
                                {al.destination_code}
                              </span>
                              <span className="text-xs text-muted-foreground ml-1">
                                {al.destination_name}
                              </span>
                            </div>
                            <Badge
                              variant="outline"
                              className="text-[10px] mt-0.5"
                            >
                              {al.destination_type === "activity"
                                ? "Actividad"
                                : "Objeto de Costo"}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right font-mono text-xs">
                            {al.percentage.toFixed(2)}%
                          </TableCell>
                          <TableCell className="text-right font-mono text-sm font-semibold">
                            {fmt(al.allocated_amount)}
                          </TableCell>
                        </TableRow>
                      ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}
    </AppLayout>
  );
};

export default AllocationResultsPage;
