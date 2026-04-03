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
  Loader2,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  CalendarRange,
  GitCompare,
} from "lucide-react";
import { useAllocation } from "@/hooks/use-allocation";
import { useCurrency } from "@/hooks/use-currency";
import { usePeriods } from "@/hooks/use-supabase-data";
import { useModelContext } from "@/contexts/ModelContext";
import { useTenant } from "@/hooks/use-tenant";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
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
  ReferenceLine,
} from "recharts";

/* ───── Helpers ───── */
const fmtShort = (n: number) => {
  if (Math.abs(n) >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (Math.abs(n) >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toFixed(0);
};

const fmtPct = (n: number) => {
  if (!isFinite(n)) return "N/A";
  const sign = n > 0 ? "+" : "";
  return `${sign}${n.toFixed(1)}%`;
};

interface ComparisonRow {
  code: string;
  name: string;
  type: string;
  currentValue: number;
  compareValue: number;
  diff: number;
  diffPct: number;
}

/* ───── Variation Icon ───── */
function VariationIcon({ diff }: { diff: number }) {
  if (Math.abs(diff) < 0.01) return <Minus className="h-3 w-3 text-muted-foreground" />;
  if (diff > 0) return <ArrowUpRight className="h-3 w-3 text-red-500" />;
  return <ArrowDownRight className="h-3 w-3 text-emerald-500" />;
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

/* ───── Hook: fetch period snapshot ───── */
function usePeriodSnapshot(periodId: string | null) {
  const { tenant } = useTenant();
  const tenantId = tenant?.id;

  return useQuery({
    queryKey: ["period_snapshot", tenantId, periodId],
    queryFn: async () => {
      if (!tenantId || !periodId) return null;

      const [resResult, actResult, coResult, driverResult] = await Promise.all([
        supabase
          .from("resources")
          .select("*")
          .eq("tenant_id", tenantId)
          .eq("period_id", periodId),
        supabase
          .from("activities")
          .select("*")
          .eq("tenant_id", tenantId)
          .eq("period_id", periodId),
        supabase
          .from("cost_objects")
          .select("*")
          .eq("tenant_id", tenantId)
          .eq("period_id", periodId),
        supabase
          .from("drivers")
          .select("*")
          .eq("tenant_id", tenantId)
          .eq("period_id", periodId),
      ]);

      const resources = (resResult.data ?? []) as Array<{
        id: string;
        code: string;
        name: string;
        amount: number;
      }>;
      const activities = (actResult.data ?? []) as Array<{
        id: string;
        code: string;
        name: string;
        amount: number;
        type: string;
      }>;
      const costObjects = (coResult.data ?? []) as Array<{
        id: string;
        code: string;
        name: string;
        amount: number;
        type: string;
        price: number | null;
      }>;
      const drivers = (driverResult.data ?? []) as Array<{ id: string }>;

      return {
        resources,
        activities,
        costObjects,
        drivers,
        totalResourceCost: resources.reduce((s, r) => s + r.amount, 0),
        totalActivityCost: activities.reduce((s, a) => s + a.amount, 0),
        totalCOCost: costObjects.reduce((s, co) => s + co.amount, 0),
        driverCount: drivers.length,
      };
    },
    enabled: !!tenantId && !!periodId,
  });
}

/* ───── Main Page ───── */
const PeriodComparisonPage = () => {
  const allocation = useAllocation();
  const { fmt } = useCurrency();
  const { items: allPeriods } = usePeriods();
  const { selectedModel, selectedPeriod } = useModelContext();
  const [comparePeriodId, setComparePeriodId] = useState<string | null>(null);

  // Periods belonging to the same model
  const modelPeriods = useMemo(
    () =>
      allPeriods
        .filter(
          (p) =>
            p.model_id === selectedModel?.id && p.id !== selectedPeriod?.id,
        )
        .sort(
          (a, b) =>
            new Date(a.start_date).getTime() - new Date(b.start_date).getTime(),
        ),
    [allPeriods, selectedModel, selectedPeriod],
  );

  const compareSnapshot = usePeriodSnapshot(comparePeriodId);
  const comparePeriod = modelPeriods.find((p) => p.id === comparePeriodId);

  // Build comparison data
  const comparison = useMemo(() => {
    if (!compareSnapshot.data) return null;

    const snap = compareSnapshot.data;

    // Resources comparison by code
    const resMap = new Map(snap.resources.map((r) => [r.code, r]));
    const resourceRows: ComparisonRow[] = allocation.resources.map((r) => {
      const compare = resMap.get(r.code);
      const compareVal = compare?.amount ?? 0;
      const diff = r.amount - compareVal;
      const diffPct = compareVal > 0 ? (diff / compareVal) * 100 : r.amount > 0 ? 100 : 0;
      return {
        code: r.code,
        name: r.name,
        type: "resource",
        currentValue: r.amount,
        compareValue: compareVal,
        diff,
        diffPct,
      };
    });
    // Add resources that exist in compare but not in current
    for (const [code, r] of resMap) {
      if (!allocation.resources.find((cr) => cr.code === code)) {
        resourceRows.push({
          code,
          name: r.name,
          type: "resource",
          currentValue: 0,
          compareValue: r.amount,
          diff: -r.amount,
          diffPct: -100,
        });
      }
    }

    // Activities comparison by code
    const actMap = new Map(snap.activities.map((a) => [a.code, a]));
    const activityRows: ComparisonRow[] = allocation.activitySummaries.map((a) => {
      const compare = actMap.get(a.code);
      const compareVal = compare?.amount ?? 0;
      const diff = a.total_cost - compareVal;
      const diffPct = compareVal > 0 ? (diff / compareVal) * 100 : a.total_cost > 0 ? 100 : 0;
      return {
        code: a.code,
        name: a.name,
        type: a.type,
        currentValue: a.total_cost,
        compareValue: compareVal,
        diff,
        diffPct,
      };
    });

    // Cost objects comparison by code
    const coMap = new Map(snap.costObjects.map((co) => [co.code, co]));
    const coRows: ComparisonRow[] = allocation.costObjectSummaries.map(
      (co) => {
        const compare = coMap.get(co.code);
        const compareVal = compare?.amount ?? 0;
        const diff = co.total_cost - compareVal;
        const diffPct = compareVal > 0 ? (diff / compareVal) * 100 : co.total_cost > 0 ? 100 : 0;
        return {
          code: co.code,
          name: co.name,
          type: co.type,
          currentValue: co.total_cost,
          compareValue: compareVal,
          diff,
          diffPct,
        };
      },
    );

    // Totals
    const currentTotal = allocation.resources.reduce(
      (s, r) => s + r.amount,
      0,
    );
    const compareTotal = snap.totalResourceCost;
    const totalDiff = currentTotal - compareTotal;
    const totalDiffPct =
      compareTotal > 0 ? (totalDiff / compareTotal) * 100 : 0;

    return {
      resourceRows: resourceRows.sort((a, b) => Math.abs(b.diff) - Math.abs(a.diff)),
      activityRows: activityRows.sort((a, b) => Math.abs(b.diff) - Math.abs(a.diff)),
      coRows: coRows.sort((a, b) => Math.abs(b.diff) - Math.abs(a.diff)),
      currentTotal,
      compareTotal,
      totalDiff,
      totalDiffPct,
      currentDriverCount: allocation.drivers.length,
      compareDriverCount: snap.driverCount,
    };
  }, [
    compareSnapshot.data,
    allocation.resources,
    allocation.activitySummaries,
    allocation.costObjectSummaries,
    allocation.drivers,
  ]);

  if (allocation.isLoading) {
    return (
      <AppLayout>
        <PageHeader
          title="Comparativo entre Períodos"
          description="Análisis de variaciones entre períodos"
        />
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      </AppLayout>
    );
  }

  // Waterfall chart: top variations in resources
  const waterfallData = comparison
    ? comparison.resourceRows
        .filter((r) => Math.abs(r.diff) > 0)
        .slice(0, 12)
        .map((r) => ({
          name: r.name.length > 15 ? r.name.slice(0, 12) + "..." : r.name,
          fullName: r.name,
          value: r.diff,
          fill: r.diff > 0 ? "#ef4444" : "#22c55e",
        }))
    : [];

  // Bar comparison chart for cost objects
  const coCompareData = comparison
    ? comparison.coRows
        .filter((r) => r.currentValue > 0 || r.compareValue > 0)
        .slice(0, 10)
        .map((r) => ({
          name: r.name.length > 15 ? r.name.slice(0, 12) + "..." : r.name,
          fullName: r.name,
          Actual: r.currentValue,
          Comparación: r.compareValue,
        }))
    : [];

  return (
    <AppLayout>
      <PageHeader
        title="Comparativo entre Períodos"
        description="Compara costos entre el período actual y otro período del mismo modelo"
      />

      {/* Period selector */}
      <Card className="mb-6">
        <CardHeader className="p-3 pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <CalendarRange className="h-4 w-4" />
            Seleccionar período de comparación
          </CardTitle>
        </CardHeader>
        <CardContent className="p-3 pt-0">
          <div className="flex items-center gap-3 mt-2">
            <div className="text-xs text-muted-foreground">
              Período actual:{" "}
              <Badge variant="default" className="ml-1">
                {selectedPeriod?.name}
              </Badge>
            </div>
            <span className="text-muted-foreground">vs.</span>
            <div className="flex flex-wrap gap-2">
              {modelPeriods.length === 0 ? (
                <p className="text-xs text-muted-foreground">
                  No hay otros períodos en este modelo para comparar.
                </p>
              ) : (
                modelPeriods.map((p) => (
                  <button
                    key={p.id}
                    onClick={() =>
                      setComparePeriodId(
                        comparePeriodId === p.id ? null : p.id,
                      )
                    }
                    className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                      comparePeriodId === p.id
                        ? "bg-primary text-primary-foreground border-primary"
                        : "hover:bg-muted border-border text-foreground"
                    }`}
                  >
                    {p.name}
                  </button>
                ))
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Loading state for comparison */}
      {comparePeriodId && compareSnapshot.isLoading && (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      )}

      {/* No selection state */}
      {!comparePeriodId && modelPeriods.length > 0 && (
        <Card className="border-dashed">
          <CardContent className="py-12 text-center text-muted-foreground">
            <GitCompare className="h-8 w-8 mx-auto mb-3 opacity-40" />
            <p className="text-sm">
              Selecciona un período de comparación para ver el análisis de variaciones.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Comparison results */}
      {comparison && comparePeriod && (
        <div className="space-y-6">
          {/* Summary cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <StatCard
              title={`Recursos (${selectedPeriod?.name})`}
              value={fmt(comparison.currentTotal)}
              icon={CalendarRange}
              color="bg-blue-500/10 text-blue-600"
            />
            <StatCard
              title={`Recursos (${comparePeriod.name})`}
              value={fmt(comparison.compareTotal)}
              icon={CalendarRange}
              color="bg-orange-500/10 text-orange-600"
            />
            <StatCard
              title="Variación absoluta"
              value={fmt(comparison.totalDiff)}
              subtitle={fmtPct(comparison.totalDiffPct)}
              icon={comparison.totalDiff > 0 ? ArrowUpRight : ArrowDownRight}
              color={
                comparison.totalDiff > 0
                  ? "bg-red-500/10 text-red-600"
                  : "bg-emerald-500/10 text-emerald-600"
              }
            />
            <StatCard
              title="Drivers"
              value={`${comparison.currentDriverCount} vs ${comparison.compareDriverCount}`}
              subtitle="actual vs comparación"
              icon={GitCompare}
              color="bg-violet-500/10 text-violet-600"
            />
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Waterfall: resource variations */}
            {waterfallData.length > 0 && (
              <Card>
                <CardHeader className="p-3 pb-0">
                  <CardTitle className="text-sm">
                    Principales variaciones en recursos
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-2">
                  <ResponsiveContainer width="100%" height={320}>
                    <BarChart
                      data={waterfallData}
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
                      <ReferenceLine y={0} stroke="#888" />
                      <Bar
                        dataKey="value"
                        name="Variación"
                        radius={[4, 4, 0, 0]}
                      >
                        {waterfallData.map((entry, i) => (
                          <Cell key={i} fill={entry.fill} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            )}

            {/* Grouped bar: cost objects comparison */}
            {coCompareData.length > 0 && (
              <Card>
                <CardHeader className="p-3 pb-0">
                  <CardTitle className="text-sm">
                    Objetos de costo: actual vs. comparación
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-2">
                  <ResponsiveContainer width="100%" height={320}>
                    <BarChart
                      data={coCompareData}
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
                        dataKey="Actual"
                        fill="#3b82f6"
                        radius={[4, 4, 0, 0]}
                      />
                      <Bar
                        dataKey="Comparación"
                        fill="#f97316"
                        radius={[4, 4, 0, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Resource detail table */}
          <ComparisonTable
            title="Variaciones en Recursos"
            rows={comparison.resourceRows}
            currentLabel={selectedPeriod?.name ?? "Actual"}
            compareLabel={comparePeriod.name}
          />

          {/* Activity detail table */}
          <ComparisonTable
            title="Variaciones en Actividades"
            rows={comparison.activityRows}
            currentLabel={selectedPeriod?.name ?? "Actual"}
            compareLabel={comparePeriod.name}
          />

          {/* Cost object detail table */}
          <ComparisonTable
            title="Variaciones en Objetos de Costo"
            rows={comparison.coRows}
            currentLabel={selectedPeriod?.name ?? "Actual"}
            compareLabel={comparePeriod.name}
          />
        </div>
      )}
    </AppLayout>
  );
};

/* ───── Comparison Table ───── */
function ComparisonTable({
  title,
  rows,
  currentLabel,
  compareLabel,
}: {
  title: string;
  rows: ComparisonRow[];
  currentLabel: string;
  compareLabel: string;
}) {
  const { fmt } = useCurrency();

  if (rows.length === 0) return null;

  const totalCurrent = rows.reduce((s, r) => s + r.currentValue, 0);
  const totalCompare = rows.reduce((s, r) => s + r.compareValue, 0);
  const totalDiff = totalCurrent - totalCompare;
  const totalDiffPct = totalCompare > 0 ? (totalDiff / totalCompare) * 100 : 0;

  return (
    <Card>
      <CardHeader className="p-3 pb-2">
        <CardTitle className="text-sm">{title}</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-20">Código</TableHead>
              <TableHead>Nombre</TableHead>
              <TableHead className="text-right">{currentLabel}</TableHead>
              <TableHead className="text-right">{compareLabel}</TableHead>
              <TableHead className="text-right">Variación</TableHead>
              <TableHead className="text-right w-20">% Var.</TableHead>
              <TableHead className="w-8" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => (
              <TableRow key={row.code}>
                <TableCell className="font-mono text-xs">{row.code}</TableCell>
                <TableCell className="text-sm font-medium">{row.name}</TableCell>
                <TableCell className="text-right font-mono text-xs">
                  {fmt(row.currentValue)}
                </TableCell>
                <TableCell className="text-right font-mono text-xs text-muted-foreground">
                  {fmt(row.compareValue)}
                </TableCell>
                <TableCell
                  className={`text-right font-mono text-xs font-semibold ${
                    row.diff > 0
                      ? "text-red-600"
                      : row.diff < 0
                        ? "text-emerald-600"
                        : ""
                  }`}
                >
                  {fmt(row.diff)}
                </TableCell>
                <TableCell
                  className={`text-right font-mono text-xs ${
                    row.diffPct > 0
                      ? "text-red-600"
                      : row.diffPct < 0
                        ? "text-emerald-600"
                        : ""
                  }`}
                >
                  {fmtPct(row.diffPct)}
                </TableCell>
                <TableCell>
                  <VariationIcon diff={row.diff} />
                </TableCell>
              </TableRow>
            ))}
            <TableRow className="bg-muted/50 font-semibold">
              <TableCell colSpan={2} className="text-right">
                TOTAL
              </TableCell>
              <TableCell className="text-right font-mono text-xs">
                {fmt(totalCurrent)}
              </TableCell>
              <TableCell className="text-right font-mono text-xs">
                {fmt(totalCompare)}
              </TableCell>
              <TableCell
                className={`text-right font-mono text-xs font-semibold ${
                  totalDiff > 0 ? "text-red-600" : totalDiff < 0 ? "text-emerald-600" : ""
                }`}
              >
                {fmt(totalDiff)}
              </TableCell>
              <TableCell
                className={`text-right font-mono text-xs ${
                  totalDiffPct > 0 ? "text-red-600" : totalDiffPct < 0 ? "text-emerald-600" : ""
                }`}
              >
                {fmtPct(totalDiffPct)}
              </TableCell>
              <TableCell />
            </TableRow>
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

export default PeriodComparisonPage;
