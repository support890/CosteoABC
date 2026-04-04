import { useState, useMemo } from "react";
import { AppLayout } from "@/components/AppLayout";
import { PageHeader } from "@/components/PageHeader";
import {
  useDimensions,
  useDimensionItems,
  useCostObjectDimensions,
  type DimensionItem,
} from "@/hooks/use-supabase-data";
import { useAllocation, type CostObjectSummary } from "@/hooks/use-allocation";
import { useModelContext } from "@/contexts/ModelContext";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  ReferenceLine,
} from "recharts";
import { TableIcon, BarChart3, Layers, TrendingUp, TrendingDown } from "lucide-react";
import { cn } from "@/lib/utils";

/* ── Tree flattener (for rendering dimension item hierarchy) ── */
interface TreeNode extends DimensionItem {
  children: TreeNode[];
}

function buildTree(items: DimensionItem[]): TreeNode[] {
  const map = new Map<string, TreeNode>();
  items.forEach((i) => map.set(i.id, { ...i, children: [] }));
  const roots: TreeNode[] = [];
  map.forEach((node) => {
    if (node.parent_id && map.has(node.parent_id)) {
      map.get(node.parent_id)!.children.push(node);
    } else {
      roots.push(node);
    }
  });
  return roots;
}

function flattenTree(nodes: TreeNode[]): TreeNode[] {
  const result: TreeNode[] = [];
  function visit(node: TreeNode) {
    result.push(node);
    node.children.forEach(visit);
  }
  nodes.forEach(visit);
  return result;
}

/* ── Formatting helpers ───────────────────────────────────── */
function formatCurrency(value: number, currency = "USD") {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency,
    currencyDisplay: "narrowSymbol",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

function formatPct(value: number) {
  return `${value >= 0 ? "+" : ""}${value.toFixed(1)}%`;
}

/* ── Row data for the pivot table ─────────────────────────── */
interface DimRow {
  item: TreeNode;
  costObjects: CostObjectSummary[];
  totalCost: number;
  venta: number | null;         // from dimension item's price field
  margin: number | null;
  marginPct: number | null;
  unassignedCount?: never;  // only on summary row
}

interface UnassignedRow {
  costObjects: CostObjectSummary[];
  totalCost: number;
}

const COLORS = [
  "#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6",
  "#06b6d4", "#84cc16", "#f97316", "#ec4899", "#14b8a6",
];

/* ── Custom Tooltip ───────────────────────────────────────── */
function CustomTooltip({
  active,
  payload,
  currency,
}: {
  active?: boolean;
  payload?: { payload: { name: string; totalCost: number; count: number } }[];
  currency: string;
}) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="bg-background border rounded-lg shadow-md p-3 text-sm">
      <p className="font-medium mb-1">{d.name}</p>
      <p className="text-muted-foreground">
        Costo total: <span className="text-foreground font-mono">{formatCurrency(d.totalCost, currency)}</span>
      </p>
      <p className="text-muted-foreground">
        Objetos: <span className="text-foreground">{d.count}</span>
      </p>
    </div>
  );
}

/* ── Reusable dimension table ─────────────────────────────── */
function renderDimTable(
  dimName: string,
  dimRows: DimRow[],
  total: number,
  unassignedRow: UnassignedRow,
  currency: string
) {
  const totalVenta = dimRows.reduce((s, r) => s + (r.venta ?? 0), 0);
  const hasVenta = dimRows.some((r) => r.venta != null);
  const totalMarginPct =
    hasVenta && totalVenta > 0
      ? ((totalVenta - total) / totalVenta) * 100
      : null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <TableIcon className="h-4 w-4" />
          Distribución por {dimName}
        </CardTitle>
      </CardHeader>
      <CardContent className="overflow-auto">
        {dimRows.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No hay ítems en esta dimensión.
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Ítem</TableHead>
                <TableHead className="text-right">Venta</TableHead>
                <TableHead className="text-right">Costo total</TableHead>
                <TableHead className="text-right">% s/total</TableHead>
                <TableHead className="text-right">Margen %</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {dimRows.map((row) => {
                const pct = total > 0 ? (row.totalCost / total) * 100 : 0;
                return (
                  <TableRow key={row.item.id}>
                    <TableCell
                      className="font-medium"
                      style={{ paddingLeft: `${8 + row.item.level * 16}px` }}
                    >
                      <div className="flex flex-col gap-0.5">
                        <span className="font-mono text-sm text-muted-foreground leading-tight">
                          {row.item.code}
                        </span>
                        <span className="text-sm">{row.item.name}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right font-mono text-sm">
                      {row.venta != null
                        ? formatCurrency(row.venta, currency)
                        : <span className="text-muted-foreground">—</span>}
                    </TableCell>
                    <TableCell className="text-right font-mono text-sm">
                      {formatCurrency(row.totalCost, currency)}
                    </TableCell>
                    <TableCell className="text-right text-sm">
                      <div className="flex items-center justify-end gap-2">
                        <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden">
                          <div
                            className="h-full bg-primary rounded-full"
                            style={{ width: `${Math.min(pct, 100)}%` }}
                          />
                        </div>
                        <span className="text-xs text-muted-foreground w-10 text-right">
                          {pct.toFixed(1)}%
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right text-sm">
                      {row.marginPct != null ? (
                        <span
                          className={cn(
                            "flex items-center justify-end gap-1",
                            row.marginPct >= 0
                              ? "text-emerald-600 dark:text-emerald-400"
                              : "text-red-500"
                          )}
                        >
                          {row.marginPct >= 0
                            ? <TrendingUp className="h-3 w-3" />
                            : <TrendingDown className="h-3 w-3" />}
                          {formatPct(row.marginPct)}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
              {unassignedRow.costObjects.length > 0 && (
                <TableRow className="text-muted-foreground italic">
                  <TableCell>Sin dimensión asignada</TableCell>
                  <TableCell className="text-right">—</TableCell>
                  <TableCell className="text-right font-mono text-sm">
                    {formatCurrency(unassignedRow.totalCost, currency)}
                  </TableCell>
                  <TableCell className="text-right text-sm">
                    {total > 0
                      ? `${((unassignedRow.totalCost / total) * 100).toFixed(1)}%`
                      : "—"}
                  </TableCell>
                  <TableCell className="text-right">—</TableCell>
                </TableRow>
              )}
              <TableRow className="font-semibold bg-muted/30">
                <TableCell>Total</TableCell>
                <TableCell className="text-right font-mono text-sm">
                  {hasVenta ? formatCurrency(totalVenta, currency) : "—"}
                </TableCell>
                <TableCell className="text-right font-mono text-sm">
                  {formatCurrency(total, currency)}
                </TableCell>
                <TableCell className="text-right">100%</TableCell>
                <TableCell className="text-right text-sm">
                  {totalMarginPct != null ? (
                    <span className={cn(
                      "flex items-center justify-end gap-1",
                      totalMarginPct >= 0
                        ? "text-emerald-600 dark:text-emerald-400"
                        : "text-red-500"
                    )}>
                      {totalMarginPct >= 0
                        ? <TrendingUp className="h-3 w-3" />
                        : <TrendingDown className="h-3 w-3" />}
                      {formatPct(totalMarginPct)}
                    </span>
                  ) : "—"}
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}

/* ── Main page ────────────────────────────────────────────── */
export default function CrossAnalysisPage() {
  const { selectedModel, selectedPeriod } = useModelContext();
  const { items: dimensions } = useDimensions();
  const { items: allItems } = useDimensionItems();
  const { items: assignments } = useCostObjectDimensions();
  const { costObjectSummaries, isLoading } = useAllocation();

  const [selectedDimId, setSelectedDimId] = useState<string>("");
  const [secondDimId, setSecondDimId] = useState<string>("");

  const currency = selectedModel?.base_currency ?? "USD";

  /* ── Derived: items for selected dimension ─────────────── */
  const primaryItems = useMemo(
    () => allItems.filter((i) => i.dimension_id === selectedDimId),
    [allItems, selectedDimId]
  );

  const primaryTree = useMemo(() => buildTree(primaryItems), [primaryItems]);
  const primaryFlat = useMemo(() => flattenTree(primaryTree), [primaryTree]);

  /* ── Derived: rows for the primary dimension ────────────── */
  const rows: DimRow[] = useMemo(() => {
    if (!selectedDimId) return [];

    return primaryFlat.map((item) => {
      const assignedCoIds = assignments
        .filter((a) => a.dimension_item_id === item.id)
        .map((a) => a.cost_object_id);

      const cos = costObjectSummaries.filter((co) =>
        assignedCoIds.includes(co.id)
      );

      const totalCost = assignments
        .filter((a) => a.dimension_item_id === item.id)
        .reduce((sum, a) => {
          const co = costObjectSummaries.find((c) => c.id === a.cost_object_id);
          if (!co) return sum;
          return sum + co.total_cost * ((a.percentage ?? 100) / 100);
        }, 0);

      const venta = item.price != null ? item.price : null;
      const margin = venta !== null ? venta - totalCost : null;
      const marginPct = venta !== null && venta !== 0
        ? (margin! / venta) * 100
        : null;

      return { item, costObjects: cos, totalCost, venta, margin, marginPct };
    });
  }, [primaryFlat, assignments, costObjectSummaries, selectedDimId]);

  /* ── Derived: unassigned cost objects ───────────────────── */
  const unassigned: UnassignedRow = useMemo(() => {
    if (!selectedDimId) return { costObjects: [], totalCost: 0 };

    const primaryItemIds = new Set(primaryItems.map((i) => i.id));
    const assignedCoIds = new Set(
      assignments
        .filter((a) => primaryItemIds.has(a.dimension_item_id))
        .map((a) => a.cost_object_id)
    );

    const cos = costObjectSummaries.filter((co) => !assignedCoIds.has(co.id));
    return {
      costObjects: cos,
      totalCost: cos.reduce((s, co) => s + co.total_cost, 0),
    };
  }, [selectedDimId, primaryItems, assignments, costObjectSummaries]);

  /* ── Totals ─────────────────────────────────────────────── */
  const grandTotal = useMemo(
    () => rows.reduce((s, r) => s + r.totalCost, 0) + unassigned.totalCost,
    [rows, unassigned]
  );

  /* ── Chart data ─────────────────────────────────────────── */
  const chartData = useMemo(
    () =>
      rows
        .filter((r) => r.totalCost > 0)
        .map((r, idx) => ({
          name: r.item.name,
          totalCost: r.totalCost,
          count: r.costObjects.length,
          color: COLORS[idx % COLORS.length],
          marginPct: r.marginPct,
        }))
        .sort((a, b) => b.totalCost - a.totalCost),
    [rows]
  );

  /* ── Cross-analysis: second dimension ───────────────────── */
  const secondItems = useMemo(
    () => allItems.filter((i) => i.dimension_id === secondDimId),
    [allItems, secondDimId]
  );

  const secondaryTree = useMemo(() => buildTree(secondItems), [secondItems]);
  const secondaryFlat = useMemo(() => flattenTree(secondaryTree), [secondaryTree]);

  const secondaryRows: DimRow[] = useMemo(() => {
    if (!secondDimId) return [];
    return secondaryFlat.map((item) => {
      const assignedCoIds = assignments
        .filter((a) => a.dimension_item_id === item.id)
        .map((a) => a.cost_object_id);
      const cos = costObjectSummaries.filter((co) => assignedCoIds.includes(co.id));
      const totalCost = assignments
        .filter((a) => a.dimension_item_id === item.id)
        .reduce((sum, a) => {
          const co = costObjectSummaries.find((c) => c.id === a.cost_object_id);
          if (!co) return sum;
          return sum + co.total_cost * ((a.percentage ?? 100) / 100);
        }, 0);
      const venta = item.price != null ? item.price : null;
      const margin = venta !== null ? venta - totalCost : null;
      const marginPct = venta !== null && venta !== 0 ? (margin! / venta) * 100 : null;
      return { item, costObjects: cos, totalCost, venta, margin, marginPct };
    });
  }, [secondaryFlat, assignments, costObjectSummaries, secondDimId]);

  const secondaryGrandTotal = useMemo(
    () => secondaryRows.reduce((s, r) => s + r.totalCost, 0),
    [secondaryRows]
  );

  /* ── Guard ──────────────────────────────────────────────── */
  if (!selectedModel || !selectedPeriod) {
    return (
      <AppLayout>
        <div className="flex flex-col items-center justify-center h-64 gap-4 text-muted-foreground">
          <Layers className="h-12 w-12 opacity-30" />
          <p>Seleccioná un modelo y período para ver el análisis cruzado.</p>
        </div>
      </AppLayout>
    );
  }

  /* ── Render ─────────────────────────────────────────────── */
  return (
    <AppLayout>
      <PageHeader
        title="Análisis Cruzado"
        description="Analizá la rentabilidad y distribución de costos por dimensiones configuradas en el modelo."
      />

      <div className="flex flex-col gap-6">
        {/* ── Selectors ───────────────────────────────────── */}
        <Card>
          <CardContent className="pt-4">
            <div className="flex flex-wrap gap-4 items-end">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Dimensión primaria
                </label>
                <Select value={selectedDimId} onValueChange={setSelectedDimId}>
                  <SelectTrigger className="w-full sm:w-56">
                    <SelectValue placeholder="Seleccioná una dimensión…" />
                  </SelectTrigger>
                  <SelectContent>
                    {dimensions.map((d) => (
                      <SelectItem key={d.id} value={d.id}>
                        {d.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Cruzar con (opcional)
                </label>
                <Select
                  value={secondDimId || "none"}
                  onValueChange={(v) => setSecondDimId(v === "none" ? "" : v)}
                >
                  <SelectTrigger className="w-full sm:w-56">
                    <SelectValue placeholder="Sin cruce" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Sin cruce</SelectItem>
                    {dimensions
                      .filter((d) => d.id !== selectedDimId)
                      .map((d) => (
                        <SelectItem key={d.id} value={d.id}>
                          {d.name}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>

              {selectedDimId && (
                <div className="ml-auto flex items-center gap-3 text-sm text-muted-foreground">
                  <span>
                    <strong className="text-foreground">{rows.length}</strong> ítems
                  </span>
                  <span>
                    Costo total:{" "}
                    <strong className="text-foreground font-mono">
                      {formatCurrency(grandTotal, currency)}
                    </strong>
                  </span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {!selectedDimId ? (
          <div className="flex flex-col items-center justify-center h-48 text-muted-foreground gap-3">
            <BarChart3 className="h-10 w-10 opacity-30" />
            <p className="text-sm">
              Seleccioná una dimensión para ver el análisis.
            </p>
          </div>
        ) : isLoading ? (
          <div className="text-muted-foreground text-sm p-4">Calculando…</div>
        ) : secondDimId ? (
          /* ── Two independent dimension tables ──────────── */
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            {/* Primary dimension table */}
            {renderDimTable(
              dimensions.find((d) => d.id === selectedDimId)?.name ?? "",
              rows,
              grandTotal,
              unassigned,
              currency
            )}
            {/* Secondary dimension table */}
            {renderDimTable(
              dimensions.find((d) => d.id === secondDimId)?.name ?? "",
              secondaryRows,
              secondaryGrandTotal,
              { costObjects: [], totalCost: 0 },
              currency
            )}
          </div>
        ) : (
          /* ── Single dimension analysis ──────────────────── */
          <div className="flex flex-col gap-6">
            {renderDimTable(
              dimensions.find((d) => d.id === selectedDimId)?.name ?? "",
              rows,
              grandTotal,
              unassigned,
              currency
            )}

            {/* Chart */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <BarChart3 className="h-4 w-4" />
                  Costo por ítem de dimensión
                </CardTitle>
              </CardHeader>
              <CardContent>
                {chartData.length === 0 ? (
                  <div className="h-64 flex items-center justify-center text-muted-foreground text-sm">
                    Sin datos para graficar.
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height={340}>
                    <BarChart
                      data={chartData}
                      layout="vertical"
                      margin={{ left: 8, right: 16, top: 8, bottom: 8 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                      <XAxis
                        type="number"
                        tickFormatter={(v) => formatCurrency(v, currency)}
                        tick={{ fontSize: 11 }}
                      />
                      <YAxis
                        type="category"
                        dataKey="name"
                        width={120}
                        tick={{ fontSize: 12 }}
                      />
                      <Tooltip content={<CustomTooltip currency={currency} />} />
                      <ReferenceLine x={0} stroke="#666" />
                      <Bar dataKey="totalCost" radius={[0, 4, 4, 0]}>
                        {chartData.map((entry, idx) => (
                          <Cell key={idx} fill={COLORS[idx % COLORS.length]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
