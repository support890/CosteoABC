import { useState, useMemo } from "react";
import { AppLayout } from "@/components/AppLayout";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Loader2,
  DollarSign,
  Layers,
  Package,
  Folder,
  ChevronRight,
} from "lucide-react";
import { useAllocation } from "@/hooks/use-allocation";
import { useCurrency } from "@/hooks/use-currency";
import {
  useCostCenters,
  useActivityCenters,
  useCostObjectCenters,
} from "@/hooks/use-supabase-data";
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

const COLORS = [
  "#3b82f6", "#f97316", "#a3a3a3", "#eab308", "#22c55e",
  "#8b5cf6", "#ec4899", "#14b8a6", "#f43f5e", "#6366f1",
  "#84cc16", "#06b6d4", "#d946ef", "#f59e0b", "#10b981",
];

const PARETO_THRESHOLD = 80;

/* ───── Types ───── */
interface SummaryItem {
  id: string;
  name: string;
  total: number;
  isCenter: boolean;
  category: string | null;
  children?: SummaryItem[];
}

interface ColumnData {
  allItems: SummaryItem[];
  categories: string[];
}

/* ───── Summary Column ───── */
function SummaryColumn({
  title,
  icon: Icon,
  color,
  allItems,
  categories,
  headerLabel,
}: {
  title: string;
  icon: React.ElementType;
  color: string;
  allItems: SummaryItem[];
  categories: string[];
  headerLabel: string;
}) {
  const { fmt } = useCurrency();
  const [viewMode, setViewMode] = useState<"centers" | "items">("centers");
  const [selectedCategory, setSelectedCategory] = useState("__all__");
  const [expandedCenters, setExpandedCenters] = useState<Set<string>>(new Set());

  const hasAnyCenters = allItems.some((i) => i.isCenter);

  const toggleCenter = (id: string) => {
    setExpandedCenters((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // Apply view mode + category filter
  const displayItems = useMemo((): SummaryItem[] => {
    if (viewMode === "items") {
      // Flatten all, then filter
      const flat: SummaryItem[] = [];
      for (const item of allItems) {
        if (item.isCenter && item.children) {
          flat.push(...item.children);
        } else {
          flat.push(item);
        }
      }
      const filtered =
        selectedCategory === "__all__"
          ? flat
          : flat.filter((i) => i.category === selectedCategory);
      return filtered.sort((a, b) => b.total - a.total);
    }

    // Centers mode: filter by category inside centers
    const result: SummaryItem[] = [];
    for (const item of allItems) {
      if (item.isCenter && item.children) {
        if (selectedCategory === "__all__") {
          result.push(item);
        } else {
          const filteredChildren = item.children.filter(
            (c) => c.category === selectedCategory,
          );
          if (filteredChildren.length > 0) {
            result.push({
              ...item,
              total: filteredChildren.reduce((s, c) => s + c.total, 0),
              children: filteredChildren,
            });
          }
        }
      } else {
        if (
          selectedCategory === "__all__" ||
          item.category === selectedCategory
        ) {
          result.push(item);
        }
      }
    }
    return result.sort((a, b) => b.total - a.total);
  }, [allItems, viewMode, selectedCategory]);

  // Calculate cumulative % and pareto flag (sorted descending)
  const withPareto = useMemo(() => {
    const total = displayItems.reduce((s, i) => s + i.total, 0);
    let cum = 0;
    return displayItems.map((item) => {
      const pct = total > 0 ? (item.total / total) * 100 : 0;
      const prevCum = cum;
      cum += pct;
      return {
        ...item,
        pct,
        cumulative: cum,
        isPareto: prevCum < PARETO_THRESHOLD,
      };
    });
  }, [displayItems]);

  const displayTotal = displayItems.reduce((s, i) => s + i.total, 0);

  // Flat rows for table (with expanded children)
  const flatRows = useMemo(() => {
    type FlatRow = {
      id: string;
      name: string;
      total: number;
      pct: number;
      isCenter: boolean;
      isChild: boolean;
      isPareto: boolean;
      colorIndex: number;
      children?: SummaryItem[];
    };
    const result: FlatRow[] = [];
    withPareto.forEach((item, i) => {
      result.push({
        id: item.id,
        name: item.name,
        total: item.total,
        pct: item.pct,
        isCenter: item.isCenter,
        isChild: false,
        isPareto: item.isPareto,
        colorIndex: i,
        children: item.children,
      });
      if (item.isCenter && expandedCenters.has(item.id) && item.children) {
        const childSum = item.children.reduce((s, c) => s + c.total, 0);
        item.children.forEach((child) => {
          result.push({
            id: `child-${child.id}`,
            name: child.name,
            total: child.total,
            pct: childSum > 0 ? (child.total / childSum) * 100 : 0,
            isCenter: false,
            isChild: true,
            isPareto: item.isPareto,
            colorIndex: i,
          });
        });
      }
    });
    return result;
  }, [withPareto, expandedCenters]);

  // Chart data: top 8 from withPareto
  const chartData = withPareto.slice(0, 8).map((item) => ({
    name: item.name.length > 18 ? item.name.slice(0, 15) + "..." : item.name,
    fullName: item.name,
    total: item.total,
    isPareto: item.isPareto,
  }));

  return (
    <Card className="flex flex-col h-full">
      <CardHeader className="p-3 pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <div
            className={`h-6 w-6 rounded ${color} flex items-center justify-center`}
          >
            <Icon className="h-3.5 w-3.5" />
          </div>
          {title}
        </CardTitle>

        {/* Controls row */}
        <div className="flex items-center gap-2 mt-2">
          {/* Category filter */}
          <Select value={selectedCategory} onValueChange={setSelectedCategory}>
            <SelectTrigger className="h-7 text-xs flex-1 min-w-0">
              <SelectValue placeholder="Todas las categorías" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">Todas las categorías</SelectItem>
              {categories.map((c) => (
                <SelectItem key={c} value={c}>
                  {c}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* View mode toggle — only when there are centers */}
          {hasAnyCenters && (
            <div className="flex border rounded-md overflow-hidden shrink-0 text-[10px]">
              <button
                className={`px-2.5 py-1 transition-colors ${
                  viewMode === "centers"
                    ? "bg-primary text-primary-foreground"
                    : "hover:bg-muted"
                }`}
                onClick={() => setViewMode("centers")}
              >
                Centros
              </button>
              <button
                className={`px-2.5 py-1 transition-colors ${
                  viewMode === "items"
                    ? "bg-primary text-primary-foreground"
                    : "hover:bg-muted"
                }`}
                onClick={() => setViewMode("items")}
              >
                Items
              </button>
            </div>
          )}
        </div>
      </CardHeader>

      <CardContent className="p-0 flex-1 flex flex-col">
        {/* Bar chart */}
        <div className="px-2">
          <ResponsiveContainer width="100%" height={180}>
            <BarChart
              data={chartData}
              layout="vertical"
              margin={{ top: 2, right: 10, left: 5, bottom: 2 }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                opacity={0.2}
                horizontal={false}
              />
              <XAxis
                type="number"
                tickFormatter={fmtShort}
                tick={{ fontSize: 9 }}
                hide
              />
              <YAxis
                type="category"
                dataKey="name"
                tick={{ fontSize: 9 }}
                width={120}
                tickFormatter={(v: string) =>
                  v.length > 22 ? v.slice(0, 19) + "..." : v
                }
              />
              <Tooltip
                formatter={(v: number) => fmtShort(v)}
                labelFormatter={(_, p) => p?.[0]?.payload?.fullName ?? ""}
              />
              <Bar dataKey="total" radius={[0, 3, 3, 0]}>
                {chartData.map((item, i) => (
                  <Cell
                    key={i}
                    fill={item.isPareto ? COLORS[i % COLORS.length] : "#4b5563"}
                    opacity={item.isPareto ? 1 : 0.5}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Pareto legend */}
        <div className="px-3 pb-1 flex items-center gap-2 text-[10px] text-muted-foreground">
          <span className="flex items-center gap-1">
            <span className="inline-block h-2 w-3 rounded-sm bg-blue-500" />
            Top 80%
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block h-2 w-3 rounded-sm bg-[#4b5563] opacity-50" />
            Resto
          </span>
        </div>

        {/* Table */}
        <div className="flex-1 overflow-y-auto max-h-[400px]">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-xs sticky top-0 bg-background z-10">
                  {headerLabel}
                </TableHead>
                <TableHead className="text-right text-xs sticky top-0 bg-background z-10 w-24">
                  Total
                </TableHead>
                <TableHead className="text-right text-xs sticky top-0 bg-background z-10 w-16">
                  %
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {flatRows.map((row) => (
                <TableRow
                  key={row.id}
                  className={
                    row.isChild
                      ? "bg-muted/20"
                      : row.isPareto
                      ? "bg-amber-500/5"
                      : "opacity-40"
                  }
                >
                  <TableCell
                    className={`text-xs py-1.5 ${row.isChild ? "pl-8" : ""}`}
                  >
                    <div className="flex items-center gap-1.5">
                      {row.isCenter ? (
                        <button
                          className="flex items-center gap-0.5 hover:opacity-80"
                          onClick={() => toggleCenter(row.id)}
                        >
                          <Folder className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                          <ChevronRight
                            className={`h-3 w-3 text-muted-foreground transition-transform ${
                              expandedCenters.has(row.id) ? "rotate-90" : ""
                            }`}
                          />
                        </button>
                      ) : row.isChild ? (
                        <div className="h-1.5 w-1.5 rounded-full shrink-0 bg-muted-foreground/40 ml-1" />
                      ) : (
                        <div
                          className="h-2 w-2 rounded-sm shrink-0"
                          style={{
                            backgroundColor: COLORS[row.colorIndex % COLORS.length],
                            opacity: row.isPareto ? 1 : 0.4,
                          }}
                        />
                      )}
                      <span
                        className={`truncate ${
                          row.isCenter
                            ? "font-medium"
                            : row.isChild
                            ? "text-muted-foreground text-[11px]"
                            : ""
                        }`}
                        title={row.name}
                      >
                        {row.name}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="text-right font-mono text-[11px] py-1.5">
                    {fmt(row.total)}
                  </TableCell>
                  <TableCell className="text-right font-mono text-[11px] py-1.5 text-muted-foreground">
                    {row.pct.toFixed(2)}%
                  </TableCell>
                </TableRow>
              ))}

              {/* Pareto divider row */}
              {withPareto.some((r) => !r.isPareto) && (
                <TableRow className="border-t-2 border-amber-500/30">
                  <TableCell
                    colSpan={3}
                    className="text-[10px] text-amber-500/70 text-center py-0.5 italic"
                  >
                    ─ 80% del total acumulado ─
                  </TableCell>
                </TableRow>
              )}

              <TableRow className="bg-muted/50 font-semibold">
                <TableCell className="text-xs py-1.5">Total general</TableCell>
                <TableCell className="text-right font-mono text-[11px] py-1.5">
                  {fmt(displayTotal)}
                </TableCell>
                <TableCell className="text-right font-mono text-[11px] py-1.5">
                  100.00%
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}

/* ───── Main Page ───── */
const ExecutiveSummaryPage = () => {
  const allocation = useAllocation();
  const costCenters = useCostCenters();
  const activityCenters = useActivityCenters();
  const costObjectCenters = useCostObjectCenters();

  // Build resources column data
  const resourceData = useMemo((): ColumnData => {
    const centerMap = new Map(costCenters.items.map((c) => [c.id, c]));
    const groups = new Map<
      string,
      { name: string; children: SummaryItem[] }
    >();
    const standalone: SummaryItem[] = [];

    for (const r of allocation.resources) {
      const item: SummaryItem = {
        id: r.id,
        name: r.name,
        total: r.amount,
        isCenter: false,
        category: r.category,
      };
      if (r.center_id) {
        const center = centerMap.get(r.center_id);
        if (!groups.has(r.center_id)) {
          groups.set(r.center_id, {
            name: center?.name ?? r.name,
            children: [],
          });
        }
        groups.get(r.center_id)!.children.push(item);
      } else {
        standalone.push(item);
      }
    }

    const centerItems: SummaryItem[] = Array.from(
      groups.entries(),
    ).map(([id, g]) => ({
      id,
      name: g.name,
      total: g.children.reduce((s, c) => s + c.total, 0),
      isCenter: true,
      category: null,
      children: g.children.sort((a, b) => b.total - a.total),
    }));

    const categories = [
      ...new Set(
        allocation.resources
          .map((r) => r.category)
          .filter((c): c is string => c !== null),
      ),
    ].sort();

    return {
      allItems: [...centerItems, ...standalone],
      categories,
    };
  }, [allocation.resources, costCenters.items]);

  // Build activities column data
  const activityData = useMemo((): ColumnData => {
    const centerMap = new Map(activityCenters.items.map((c) => [c.id, c]));
    const summaryMap = new Map(
      allocation.activitySummaries.map((s) => [s.id, s]),
    );
    const groups = new Map<
      string,
      { name: string; children: SummaryItem[] }
    >();
    const standalone: SummaryItem[] = [];

    for (const a of allocation.activities) {
      const summary = summaryMap.get(a.id);
      const totalCost = summary?.total_cost ?? a.amount;
      const item: SummaryItem = {
        id: a.id,
        name: a.name,
        total: totalCost,
        isCenter: false,
        category: a.category,
      };
      if (a.center_id) {
        const center = centerMap.get(a.center_id);
        if (!groups.has(a.center_id)) {
          groups.set(a.center_id, {
            name: center?.name ?? a.name,
            children: [],
          });
        }
        groups.get(a.center_id)!.children.push(item);
      } else {
        standalone.push(item);
      }
    }

    const centerItems: SummaryItem[] = Array.from(
      groups.entries(),
    ).map(([id, g]) => ({
      id,
      name: g.name,
      total: g.children.reduce((s, c) => s + c.total, 0),
      isCenter: true,
      category: null,
      children: g.children.sort((a, b) => b.total - a.total),
    }));

    const categories = [
      ...new Set(
        allocation.activities
          .map((a) => a.category)
          .filter((c): c is string => c !== null),
      ),
    ].sort();

    return {
      allItems: [...centerItems, ...standalone],
      categories,
    };
  }, [
    allocation.activities,
    allocation.activitySummaries,
    activityCenters.items,
  ]);

  // Build cost objects column data
  const costObjectData = useMemo((): ColumnData => {
    const centerMap = new Map(costObjectCenters.items.map((c) => [c.id, c]));
    const summaryMap = new Map(
      allocation.costObjectSummaries.map((s) => [s.id, s]),
    );
    const groups = new Map<
      string,
      { name: string; children: SummaryItem[] }
    >();
    const standalone: SummaryItem[] = [];

    for (const co of allocation.costObjects) {
      const summary = summaryMap.get(co.id);
      const totalCost = summary?.total_cost ?? co.amount;
      const item: SummaryItem = {
        id: co.id,
        name: co.name,
        total: totalCost,
        isCenter: false,
        category: co.category,
      };
      if (co.center_id) {
        const center = centerMap.get(co.center_id);
        if (!groups.has(co.center_id)) {
          groups.set(co.center_id, {
            name: center?.name ?? co.name,
            children: [],
          });
        }
        groups.get(co.center_id)!.children.push(item);
      } else {
        standalone.push(item);
      }
    }

    const centerItems: SummaryItem[] = Array.from(
      groups.entries(),
    ).map(([id, g]) => ({
      id,
      name: g.name,
      total: g.children.reduce((s, c) => s + c.total, 0),
      isCenter: true,
      category: null,
      children: g.children.sort((a, b) => b.total - a.total),
    }));

    const categories = [
      ...new Set(
        allocation.costObjects
          .map((co) => co.category)
          .filter((c): c is string => c !== null),
      ),
    ].sort();

    return {
      allItems: [...centerItems, ...standalone],
      categories,
    };
  }, [
    allocation.costObjects,
    allocation.costObjectSummaries,
    costObjectCenters.items,
  ]);

  const isLoading =
    allocation.isLoading ||
    costCenters.isLoading ||
    activityCenters.isLoading ||
    costObjectCenters.isLoading;

  if (isLoading) {
    return (
      <AppLayout>
        <PageHeader
          title="Resumen Ejecutivo"
          description="Vista consolidada del modelo ABC"
        />
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <PageHeader
        title="Resumen Ejecutivo del Modelo ABC"
        description="Vista consolidada: Recursos → Actividades → Objetos de Costo con totales y porcentajes"
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <SummaryColumn
          title="Recursos o Centros de Recursos"
          icon={DollarSign}
          color="bg-blue-500/10 text-blue-600"
          allItems={resourceData.allItems}
          categories={resourceData.categories}
          headerLabel="Recurso"
        />
        <SummaryColumn
          title="Actividades o Centro de Actividades"
          icon={Layers}
          color="bg-orange-500/10 text-orange-600"
          allItems={activityData.allItems}
          categories={activityData.categories}
          headerLabel="Actividad"
        />
        <SummaryColumn
          title="Objetos de Costo o Centros de Obj. Costo"
          icon={Package}
          color="bg-emerald-500/10 text-emerald-600"
          allItems={costObjectData.allItems}
          categories={costObjectData.categories}
          headerLabel="Objeto de Costo"
        />
      </div>
    </AppLayout>
  );
};

export default ExecutiveSummaryPage;
