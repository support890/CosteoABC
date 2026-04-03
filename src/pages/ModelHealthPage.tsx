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
  CheckCircle2,
  AlertTriangle,
  XCircle,
  ShieldCheck,
  Link2Off,
  DollarSign,
  Activity,
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
  Cell,
} from "recharts";

/* ───── Helpers ───── */
const fmtShort = (n: number) => {
  if (Math.abs(n) >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (Math.abs(n) >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toFixed(0);
};

type Severity = "ok" | "warning" | "error";

interface HealthCheck {
  label: string;
  description: string;
  severity: Severity;
  count: number;
  items: { code: string; name: string; detail: string }[];
}

/* ───── Severity Icon ───── */
function SeverityIcon({ severity }: { severity: Severity }) {
  if (severity === "ok")
    return <CheckCircle2 className="h-4 w-4 text-emerald-500" />;
  if (severity === "warning")
    return <AlertTriangle className="h-4 w-4 text-amber-500" />;
  return <XCircle className="h-4 w-4 text-red-500" />;
}

function SeverityBadge({ severity }: { severity: Severity }) {
  const map = {
    ok: { label: "OK", variant: "default" as const, className: "bg-emerald-500/10 text-emerald-700 border-emerald-200" },
    warning: { label: "Advertencia", variant: "default" as const, className: "bg-amber-500/10 text-amber-700 border-amber-200" },
    error: { label: "Error", variant: "default" as const, className: "bg-red-500/10 text-red-700 border-red-200" },
  };
  const cfg = map[severity];
  return (
    <Badge variant={cfg.variant} className={cfg.className}>
      {cfg.label}
    </Badge>
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

/* ───── Main Page ───── */
const ModelHealthPage = () => {
  const allocation = useAllocation();
  const { fmt } = useCurrency();

  const health = useMemo(() => {
    const checks: HealthCheck[] = [];
    const allocs = allocation.allocations;

    // 1. Resources without any driver (not assigned anywhere)
    const assignedResourceIds = new Set(
      allocs
        .filter(
          (a) =>
            a.source_type === "resource" || a.source_type === "resource_center",
        )
        .map((a) => a.source_id),
    );
    const unassignedResources = allocation.resources.filter(
      (r) => r.amount > 0 && !assignedResourceIds.has(r.id),
    );
    checks.push({
      label: "Recursos sin asignar",
      description: "Recursos con monto > 0 que no tienen ningún driver configurado",
      severity: unassignedResources.length > 0 ? "error" : "ok",
      count: unassignedResources.length,
      items: unassignedResources.map((r) => ({
        code: r.code,
        name: r.name,
        detail: fmt(r.amount),
      })),
    });

    // 2. Activities that receive cost but don't distribute it
    const activitiesThatReceive = new Set(
      allocs
        .filter(
          (a) =>
            a.destination_type === "activity" ||
            a.destination_type === "activity_center",
        )
        .map((a) => a.destination_id),
    );
    const activitiesThatDistribute = new Set(
      allocs
        .filter(
          (a) =>
            a.source_type === "activity" ||
            a.source_type === "activity_center",
        )
        .map((a) => a.source_id),
    );
    const deadEndActivities = allocation.activitySummaries.filter(
      (a) =>
        a.total_cost > 0 &&
        (activitiesThatReceive.has(a.id) || a.direct_amount > 0) &&
        !activitiesThatDistribute.has(a.id),
    );
    checks.push({
      label: "Actividades sin distribución",
      description:
        "Actividades con costo que no distribuyen a objetos de costo",
      severity: deadEndActivities.length > 0 ? "warning" : "ok",
      count: deadEndActivities.length,
      items: deadEndActivities.map((a) => ({
        code: a.code,
        name: a.name,
        detail: `Costo total: ${fmt(a.total_cost)}`,
      })),
    });

    // 3. Cost objects without price
    const noPriceCostObjects = allocation.costObjects.filter(
      (co) => !co.price || co.price === 0,
    );
    checks.push({
      label: "Objetos de costo sin precio",
      description: "Objetos de costo que no tienen precio de venta configurado",
      severity:
        noPriceCostObjects.length > 0
          ? noPriceCostObjects.length === allocation.costObjects.length
            ? "warning"
            : "warning"
          : "ok",
      count: noPriceCostObjects.length,
      items: noPriceCostObjects.map((co) => ({
        code: co.code,
        name: co.name,
        detail: co.type,
      })),
    });

    // 4. Cost objects that receive no allocation
    const costObjectsWithAllocation = new Set(
      allocs
        .filter(
          (a) =>
            a.destination_type === "cost_object" ||
            a.destination_type === "cost_object_center",
        )
        .map((a) => a.destination_id),
    );
    const orphanCostObjects = allocation.costObjects.filter(
      (co) => !costObjectsWithAllocation.has(co.id) && co.amount === 0,
    );
    checks.push({
      label: "Objetos de costo sin costo asignado",
      description:
        "Objetos de costo que no reciben ninguna asignación ni tienen monto directo",
      severity: orphanCostObjects.length > 0 ? "warning" : "ok",
      count: orphanCostObjects.length,
      items: orphanCostObjects.map((co) => ({
        code: co.code,
        name: co.name,
        detail: co.type,
      })),
    });

    // 5. Drivers with 0 lines
    const driversWithLines = new Set(allocs.map((a) => a.driver_id));
    const emptyDrivers = allocation.drivers.filter(
      (d) => !driversWithLines.has(d.id),
    );
    checks.push({
      label: "Drivers sin líneas de distribución",
      description: "Drivers configurados que no tienen líneas de asignación",
      severity: emptyDrivers.length > 0 ? "error" : "ok",
      count: emptyDrivers.length,
      items: emptyDrivers.map((d) => ({
        code: d.type,
        name: d.name,
        detail: `${d.source_type} → ${d.destination_type}`,
      })),
    });

    return checks;
  }, [allocation]);

  // Coverage stats
  const stats = useMemo(() => {
    const totalResourceCost = allocation.resources.reduce(
      (s, r) => s + r.amount,
      0,
    );
    const totalAllocated = allocation.allocations
      .filter(
        (a) =>
          (a.source_type === "resource" ||
            a.source_type === "resource_center") &&
          a.destination_type !== "resource",
      )
      .reduce((s, a) => s + a.allocated_amount, 0);
    const coveragePct =
      totalResourceCost > 0 ? (totalAllocated / totalResourceCost) * 100 : 0;

    const totalCostObjectCost = allocation.costObjectSummaries.reduce(
      (s, co) => s + co.total_cost,
      0,
    );

    const diff = totalResourceCost - totalCostObjectCost;

    const errorCount = health.filter((c) => c.severity === "error").length;
    const warningCount = health.filter((c) => c.severity === "warning").length;
    const okCount = health.filter((c) => c.severity === "ok").length;

    return {
      totalResourceCost,
      totalAllocated,
      coveragePct,
      totalCostObjectCost,
      diff,
      errorCount,
      warningCount,
      okCount,
    };
  }, [allocation, health]);

  // Waterfall chart data: resource total vs cost object total
  const waterfallData = useMemo(() => {
    const items = [
      {
        name: "Recursos",
        value: stats.totalResourceCost,
        fill: "#3b82f6",
      },
      {
        name: "Obj. de costo",
        value: stats.totalCostObjectCost,
        fill: "#22c55e",
      },
      {
        name: "Diferencia",
        value: Math.abs(stats.diff),
        fill: Math.abs(stats.diff) < 0.01 ? "#22c55e" : "#ef4444",
      },
    ];
    return items;
  }, [stats]);

  if (allocation.isLoading) {
    return (
      <AppLayout>
        <PageHeader
          title="Validación del Modelo"
          description="Diagnóstico de salud del modelo ABC"
        />
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      </AppLayout>
    );
  }

  const overallSeverity: Severity =
    stats.errorCount > 0
      ? "error"
      : stats.warningCount > 0
        ? "warning"
        : "ok";

  const overallLabel =
    overallSeverity === "ok"
      ? "Modelo completo"
      : overallSeverity === "warning"
        ? "Modelo con advertencias"
        : "Modelo con errores";

  return (
    <AppLayout>
      <PageHeader
        title="Validación del Modelo"
        description="Diagnóstico de integridad y cobertura del modelo de costeo ABC"
      />

      {/* Summary cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <StatCard
          title="Estado general"
          value={overallLabel}
          subtitle={`${stats.okCount} OK · ${stats.warningCount} advertencias · ${stats.errorCount} errores`}
          icon={ShieldCheck}
          color={
            overallSeverity === "ok"
              ? "bg-emerald-500/10 text-emerald-600"
              : overallSeverity === "warning"
                ? "bg-amber-500/10 text-amber-600"
                : "bg-red-500/10 text-red-600"
          }
        />
        <StatCard
          title="Costo total recursos"
          value={fmt(stats.totalResourceCost)}
          icon={DollarSign}
          color="bg-blue-500/10 text-blue-600"
        />
        <StatCard
          title="Costo en obj. de costo"
          value={fmt(stats.totalCostObjectCost)}
          subtitle={`${stats.coveragePct.toFixed(1)}% cobertura`}
          icon={Activity}
          color="bg-emerald-500/10 text-emerald-600"
        />
        <StatCard
          title="Diferencia no asignada"
          value={fmt(stats.diff)}
          subtitle={
            Math.abs(stats.diff) < 0.01
              ? "Modelo balanceado"
              : "Costo sin llegar a objetos"
          }
          icon={Link2Off}
          color={
            Math.abs(stats.diff) < 0.01
              ? "bg-emerald-500/10 text-emerald-600"
              : "bg-red-500/10 text-red-600"
          }
        />
      </div>


      {/* Health checks */}
      <div className="space-y-4">
        {health.map((check, idx) => (
          <Card
            key={idx}
            className={
              check.severity === "ok" ? "border-emerald-200/50" : ""
            }
          >
            <CardHeader className="p-3 pb-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <SeverityIcon severity={check.severity} />
                  <CardTitle className="text-sm">{check.label}</CardTitle>
                  {check.count > 0 && (
                    <Badge variant="secondary" className="text-xs">
                      {check.count}
                    </Badge>
                  )}
                </div>
                <SeverityBadge severity={check.severity} />
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {check.description}
              </p>
            </CardHeader>
            {check.items.length > 0 && (
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-20">Código</TableHead>
                      <TableHead>Nombre</TableHead>
                      <TableHead className="text-right">Detalle</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {check.items.map((item, i) => (
                      <TableRow key={i}>
                        <TableCell className="font-mono text-xs">
                          {item.code}
                        </TableCell>
                        <TableCell className="text-sm">{item.name}</TableCell>
                        <TableCell className="text-right text-xs text-muted-foreground">
                          {item.detail}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            )}
          </Card>
        ))}
      </div>
    </AppLayout>
  );
};

export default ModelHealthPage;
