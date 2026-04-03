import { useState, useMemo } from "react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, ChevronDown, FileDown } from "lucide-react";
import { useAllocation } from "@/hooks/use-allocation";
import { useCurrency } from "@/hooks/use-currency";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

/* ───── Colors ───── */
const COLORS = [
  "#3b82f6", "#f97316", "#a3a3a3", "#eab308", "#22c55e",
  "#8b5cf6", "#ec4899", "#14b8a6", "#f43f5e", "#6366f1",
  "#84cc16", "#06b6d4", "#d946ef", "#f59e0b", "#10b981",
];

const fmtShort = (n: number) => {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toFixed(0);
};

const fmt = (n: number) =>
  n.toLocaleString("es-BO", { minimumFractionDigits: 0, maximumFractionDigits: 0 });

/* ───── Types ───── */
interface DistributionItem {
  name: string;
  code: string;
  amount: number;
  percentage: number;
  sourceCodes: { code: string; name: string }[];
}

interface DistributionFilters {
  tipos: string[];
  selectedTipo: string;
  onTipoChange: (v: string) => void;
  categorias: string[];
  selectedCategoria: string;
  onCategoriaChange: (v: string) => void;
  origenNames: string[];
  selectedOrigenes: string[];
  onOrigenToggle: (name: string) => void;
  onOrigenClear: () => void;
  sourceLabel: string;
}

/* ───── Multi-select Popover ───── */
function MultiSelectDropdown({
  label,
  options,
  selected,
  onToggle,
  onClear,
}: {
  label: string;
  options: string[];
  selected: string[];
  onToggle: (v: string) => void;
  onClear: () => void;
}) {
  const buttonLabel =
    selected.length === 0
      ? "Todos"
      : selected.length === 1
      ? selected[0].length > 22
        ? selected[0].slice(0, 20) + "…"
        : selected[0]
      : `${selected.length} seleccionados`;

  return (
    <div className="space-y-1">
      <label className="text-xs text-muted-foreground">{label}</label>
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className="w-full h-8 text-xs justify-between font-normal px-2"
          >
            <span className="truncate">{buttonLabel}</span>
            <ChevronDown className="h-3 w-3 shrink-0 opacity-50 ml-1" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-60 p-2" align="start">
          {options.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-2">
              Sin opciones disponibles
            </p>
          ) : (
            <div className="max-h-52 overflow-y-auto space-y-0.5">
              {options.map((opt) => (
                <div
                  key={opt}
                  className="flex items-center gap-2 px-2 py-1.5 hover:bg-muted rounded-sm cursor-pointer"
                  onClick={() => onToggle(opt)}
                >
                  <Checkbox
                    checked={selected.includes(opt)}
                    onCheckedChange={() => onToggle(opt)}
                    className="pointer-events-none"
                  />
                  <span className="text-xs leading-tight">{opt}</span>
                </div>
              ))}
            </div>
          )}
          {selected.length > 0 && (
            <button
              onClick={onClear}
              className="mt-2 w-full text-xs text-center text-muted-foreground hover:text-foreground border-t pt-2"
            >
              Limpiar selección
            </button>
          )}
        </PopoverContent>
      </Popover>
    </div>
  );
}

/* ───── Reusable distribution view ───── */
function DistributionView({
  title,
  items,
  filters,
  sourceType,
}: {
  title: string;
  items: DistributionItem[];
  filters: DistributionFilters;
  sourceType: "resource" | "activity";
}) {
  const sortedItems = [...items].sort((a, b) => b.amount - a.amount);
  const total = items.reduce((s, i) => s + i.amount, 0);

  const pieData = sortedItems.map((d) => ({
    name: d.name,
    value: d.amount,
    pct: total > 0 ? ((d.amount / total) * 100).toFixed(1) : "0",
  }));

  const barData = sortedItems.map((d) => ({
    name: d.name.length > 25 ? d.name.slice(0, 22) + "..." : d.name,
    fullName: d.name,
    amount: d.amount,
  }));

  return (
    <div className="space-y-4">
      <div className="flex flex-col md:flex-row gap-4">
        {/* Filter panel */}
        <Card className="md:w-64 shrink-0">
          <CardHeader className="p-3 pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">
              Filtros
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3 pt-0 space-y-3">
            {/* Tipo */}
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Tipo</label>
              <Select
                value={filters.selectedTipo}
                onValueChange={filters.onTipoChange}
              >
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">Todos</SelectItem>
                  {filters.tipos.map((t) => (
                    <SelectItem key={t} value={t}>
                      {t}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Categoría */}
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Categoría</label>
              <Select
                value={filters.selectedCategoria}
                onValueChange={filters.onCategoriaChange}
              >
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">Todos</SelectItem>
                  {filters.categorias.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Origen / Recurso (multi-select) */}
            <MultiSelectDropdown
              label={filters.sourceLabel}
              options={filters.origenNames}
              selected={filters.selectedOrigenes}
              onToggle={filters.onOrigenToggle}
              onClear={filters.onOrigenClear}
            />
          </CardContent>
        </Card>

        {/* Charts */}
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Pie Chart */}
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
                <ResponsiveContainer width="100%" height={300}>
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

          {/* Bar Chart */}
          <Card>
            <CardHeader className="p-3 pb-0">
              <CardTitle className="text-sm">Monto por destino</CardTitle>
            </CardHeader>
            <CardContent className="p-2">
              {barData.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-10">
                  Sin datos
                </p>
              ) : (
                <ResponsiveContainer width="100%" height={300}>
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
                    <Bar dataKey="amount" name="Monto" radius={[4, 4, 0, 0]}>
                      {barData.map((_, i) => (
                        <Cell key={i} fill={COLORS[i % COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Detail table */}
      <Card>
        <CardHeader className="p-3 pb-2">
          <CardTitle className="text-sm">{title}</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nombre</TableHead>
                <TableHead>Orígenes</TableHead>
                <TableHead className="text-right">Costo asignado</TableHead>
                <TableHead className="text-right w-20">%</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedItems.map((item, i) => (
                <TableRow key={item.code + i}>
                  <TableCell>
                    <div className="flex flex-col gap-0.5">
                      <span className="font-mono text-sm text-muted-foreground leading-tight">{item.code}</span>
                      <span className="text-sm">{item.name}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {item.sourceCodes.map(({ code, name }) => (
                        <Popover key={code}>
                          <PopoverTrigger asChild>
                            <span
                              title={name}
                              className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-mono font-medium border cursor-pointer ${
                                sourceType === "resource"
                                  ? "bg-green-500/15 text-green-400 border-green-500/30 hover:bg-green-500/30"
                                  : "bg-amber-500/15 text-amber-400 border-amber-500/30 hover:bg-amber-500/30"
                              }`}
                            >
                              {code}
                            </span>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto px-3 py-2 text-xs" side="top">
                            {name}
                          </PopoverContent>
                        </Popover>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell className="text-right font-mono text-sm">
                    {fmt(item.amount)}
                  </TableCell>
                  <TableCell className="text-right font-mono text-sm">
                    {item.percentage.toFixed(1)}%
                  </TableCell>
                </TableRow>
              ))}
              {sortedItems.length > 0 && (
                <TableRow className="bg-muted/50 font-semibold">
                  <TableCell colSpan={2} className="text-right">
                    TOTAL
                  </TableCell>
                  <TableCell className="text-right font-mono text-sm">
                    {fmt(total)}
                  </TableCell>
                  <TableCell className="text-right font-mono text-sm">
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
const ReportsPage = () => {
  const allocation = useAllocation();
  const { fmt: _fmt } = useCurrency();
  const [activeTab, setActiveTab] = useState("res_to_act");

  // res_to_act filters
  const [resTipo, setResTipo] = useState("__all__");
  const [resCategoria, setResCategoria] = useState("__all__");
  const [resSelected, setResSelected] = useState<string[]>([]);

  // act_to_co filters
  const [actTipo, setActTipo] = useState("__all__");
  const [actCategoria, setActCategoria] = useState("__all__");
  const [actSelected, setActSelected] = useState<string[]>([]);

  // Build resource → activity distribution data
  const resData = useMemo(() => {
    const resAllocations = allocation.allocations.filter(
      (a) =>
        (a.source_type === "resource" || a.source_type === "resource_center") &&
        a.destination_type === "activity",
    );

    // Enrich each allocation with tipo/categoria from the source resource
    type EnrichedAlloc = typeof resAllocations[number] & {
      tipo: string | null;
      categoria: string | null;
    };
    const enriched: EnrichedAlloc[] = resAllocations.map((al) => {
      if (al.source_type === "resource") {
        const r = allocation.resources.find((x) => x.id === al.source_id);
        return { ...al, tipo: r?.type ?? null, categoria: r?.category ?? null };
      }
      return { ...al, tipo: null, categoria: null };
    });

    // All unique tipos (from individual resources only)
    const allTipos = [
      ...new Set(
        enriched
          .map((a) => a.tipo)
          .filter((t): t is string => t !== null),
      ),
    ].sort();

    // Filter by tipo → derive available categorías
    const afterTipo =
      resTipo === "__all__" ? enriched : enriched.filter((a) => a.tipo === resTipo);

    const availableCategorias = [
      ...new Set(
        afterTipo
          .map((a) => a.categoria)
          .filter((c): c is string => c !== null),
      ),
    ].sort();

    // Filter by categoria → derive available origenes
    const afterCategoria =
      resCategoria === "__all__"
        ? afterTipo
        : afterTipo.filter((a) => a.categoria === resCategoria);

    const availableOrigenes = [
      ...new Set(afterCategoria.map((a) => a.source_name)),
    ].sort();

    // Filter by selected origenes (multi-select)
    const filtered =
      resSelected.length === 0
        ? afterCategoria
        : afterCategoria.filter((a) => resSelected.includes(a.source_name));

    // Aggregate by destination activity
    const destMap = new Map<string, { code: string; name: string; amount: number; sourceMap: Map<string, string> }>();
    for (const al of filtered) {
      const existing = destMap.get(al.destination_id);
      if (existing) {
        existing.amount += al.allocated_amount;
        existing.sourceMap.set(al.source_code, al.source_name);
      } else {
        destMap.set(al.destination_id, {
          code: al.destination_code,
          name: al.destination_name,
          amount: al.allocated_amount,
          sourceMap: new Map([[al.source_code, al.source_name]]),
        });
      }
    }

    const total = Array.from(destMap.values()).reduce((s, d) => s + d.amount, 0);
    const items: DistributionItem[] = Array.from(destMap.values()).map((d) => ({
      code: d.code,
      name: d.name,
      amount: d.amount,
      percentage: total > 0 ? (d.amount / total) * 100 : 0,
      sourceCodes: Array.from(d.sourceMap.entries())
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([code, name]) => ({ code, name })),
    }));

    return { items, allTipos, availableCategorias, availableOrigenes };
  }, [
    allocation.allocations,
    allocation.resources,
    resTipo,
    resCategoria,
    resSelected,
  ]);

  // Build activity → cost object distribution data
  const actData = useMemo(() => {
    const actAllocations = allocation.allocations.filter(
      (a) =>
        (a.source_type === "activity" || a.source_type === "activity_center") &&
        (a.destination_type === "cost_object" ||
          a.destination_type === "cost_object_center"),
    );

    // Enrich with tipo/categoria from source activity
    type EnrichedAlloc = typeof actAllocations[number] & {
      tipo: string | null;
      categoria: string | null;
    };
    const enriched: EnrichedAlloc[] = actAllocations.map((al) => {
      if (al.source_type === "activity") {
        const a = allocation.activities.find((x) => x.id === al.source_id);
        return { ...al, tipo: a?.type ?? null, categoria: a?.category ?? null };
      }
      return { ...al, tipo: null, categoria: null };
    });

    const allTipos = [
      ...new Set(
        enriched
          .map((a) => a.tipo)
          .filter((t): t is string => t !== null),
      ),
    ].sort();

    const afterTipo =
      actTipo === "__all__" ? enriched : enriched.filter((a) => a.tipo === actTipo);

    const availableCategorias = [
      ...new Set(
        afterTipo
          .map((a) => a.categoria)
          .filter((c): c is string => c !== null),
      ),
    ].sort();

    const afterCategoria =
      actCategoria === "__all__"
        ? afterTipo
        : afterTipo.filter((a) => a.categoria === actCategoria);

    const availableOrigenes = [
      ...new Set(afterCategoria.map((a) => a.source_name)),
    ].sort();

    const filtered =
      actSelected.length === 0
        ? afterCategoria
        : afterCategoria.filter((a) => actSelected.includes(a.source_name));

    // Aggregate by destination cost object
    const destMap = new Map<string, { code: string; name: string; amount: number; sourceMap: Map<string, string> }>();
    for (const al of filtered) {
      const existing = destMap.get(al.destination_id);
      if (existing) {
        existing.amount += al.allocated_amount;
        existing.sourceMap.set(al.source_code, al.source_name);
      } else {
        destMap.set(al.destination_id, {
          code: al.destination_code,
          name: al.destination_name,
          amount: al.allocated_amount,
          sourceMap: new Map([[al.source_code, al.source_name]]),
        });
      }
    }

    const total = Array.from(destMap.values()).reduce((s, d) => s + d.amount, 0);
    const items: DistributionItem[] = Array.from(destMap.values()).map((d) => ({
      code: d.code,
      name: d.name,
      amount: d.amount,
      percentage: total > 0 ? (d.amount / total) * 100 : 0,
      sourceCodes: Array.from(d.sourceMap.entries())
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([code, name]) => ({ code, name })),
    }));

    return { items, allTipos, availableCategorias, availableOrigenes };
  }, [
    allocation.allocations,
    allocation.activities,
    actTipo,
    actCategoria,
    actSelected,
  ]);

  const exportToPDF = () => {
    const isResTab = activeTab === "res_to_act";
    const items = isResTab ? resData.items : actData.items;
    const sortedItems = [...items].sort((a, b) => b.amount - a.amount);
    const total = sortedItems.reduce((s, i) => s + i.amount, 0);

    const tabLabel = isResTab
      ? "Recursos → Actividades"
      : "Actividades → Objetos de Costo";

    const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
    const pageW = doc.internal.pageSize.getWidth();

    // Header background
    doc.setFillColor(17, 24, 39);
    doc.rect(0, 0, pageW, 28, "F");

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.text("Reporte de Distribución de Costos", 14, 11);

    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.text(`Vista: ${tabLabel}`, 14, 18);
    doc.text(`Fecha: ${new Date().toLocaleDateString("es-BO")}`, 14, 23);

    // Filter summary
    const filterParts: string[] = [];
    if (isResTab) {
      if (resTipo !== "__all__") filterParts.push(`Tipo: ${resTipo}`);
      if (resCategoria !== "__all__") filterParts.push(`Categoría: ${resCategoria}`);
      if (resSelected.length > 0) filterParts.push(`Recurso: ${resSelected.join(", ")}`);
    } else {
      if (actTipo !== "__all__") filterParts.push(`Tipo: ${actTipo}`);
      if (actCategoria !== "__all__") filterParts.push(`Categoría: ${actCategoria}`);
      if (actSelected.length > 0) filterParts.push(`Actividad: ${actSelected.join(", ")}`);
    }
    if (filterParts.length > 0) {
      doc.text(`Filtros: ${filterParts.join(" | ")}`, pageW - 14, 23, { align: "right" });
    }

    // Section title
    doc.setTextColor(30, 30, 30);
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    const sectionTitle = isResTab
      ? "Detalle: Distribución de recursos en actividades"
      : "Detalle: Distribución de actividades a objetos de costo";
    doc.text(sectionTitle, 14, 38);

    // Table
    const tableBody = sortedItems.map((item) => [
      item.code,
      item.name,
      fmt(item.amount),
      `${item.percentage.toFixed(1)}%`,
    ]);

    // Total row
    tableBody.push(["", "TOTAL", fmt(total), "100%"]);

    autoTable(doc, {
      startY: 42,
      head: [["Código", "Nombre", "Monto asignado", "%"]],
      body: tableBody,
      styles: { fontSize: 9, cellPadding: 3 },
      headStyles: { fillColor: [17, 24, 39], textColor: 255, fontStyle: "bold" },
      columnStyles: {
        0: { cellWidth: 30, font: "courier" },
        2: { halign: "right", font: "courier", cellWidth: 45 },
        3: { halign: "right", font: "courier", cellWidth: 20 },
      },
      didParseCell: (data) => {
        // Right-align headers for amount and % columns
        if (data.section === "head" && (data.column.index === 2 || data.column.index === 3)) {
          data.cell.styles.halign = "right";
        }
        // Bold + gray bg for total row
        if (data.section === "body" && data.row.index === tableBody.length - 1) {
          data.cell.styles.fontStyle = "bold";
          data.cell.styles.fillColor = [240, 240, 240];
        }
      },
      margin: { left: 14, right: 14 },
    });

    // Page numbers
    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(150);
      doc.text(
        `Página ${i} de ${pageCount}`,
        pageW / 2,
        doc.internal.pageSize.getHeight() - 8,
        { align: "center" },
      );
    }

    const fileName = isResTab
      ? "distribucion_recursos_actividades.pdf"
      : "distribucion_actividades_objetos_costo.pdf";
    doc.save(fileName);
  };

  if (allocation.isLoading) {
    return (
      <AppLayout>
        <PageHeader
          title="Reportes"
          description="Visualización de distribución de costos ABC"
        />
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      </AppLayout>
    );
  }

  const resFilters: DistributionFilters = {
    tipos: resData.allTipos,
    selectedTipo: resTipo,
    onTipoChange: (v) => {
      setResTipo(v);
      setResCategoria("__all__");
      setResSelected([]);
    },
    categorias: resData.availableCategorias,
    selectedCategoria: resCategoria,
    onCategoriaChange: (v) => {
      setResCategoria(v);
      setResSelected([]);
    },
    origenNames: resData.availableOrigenes,
    selectedOrigenes: resSelected,
    onOrigenToggle: (name) =>
      setResSelected((prev) =>
        prev.includes(name) ? prev.filter((x) => x !== name) : [...prev, name],
      ),
    onOrigenClear: () => setResSelected([]),
    sourceLabel: "Recurso",
  };

  const actFilters: DistributionFilters = {
    tipos: actData.allTipos,
    selectedTipo: actTipo,
    onTipoChange: (v) => {
      setActTipo(v);
      setActCategoria("__all__");
      setActSelected([]);
    },
    categorias: actData.availableCategorias,
    selectedCategoria: actCategoria,
    onCategoriaChange: (v) => {
      setActCategoria(v);
      setActSelected([]);
    },
    origenNames: actData.availableOrigenes,
    selectedOrigenes: actSelected,
    onOrigenToggle: (name) =>
      setActSelected((prev) =>
        prev.includes(name) ? prev.filter((x) => x !== name) : [...prev, name],
      ),
    onOrigenClear: () => setActSelected([]),
    sourceLabel: "Actividad",
  };

  return (
    <AppLayout>
      <PageHeader
        title="Reportes de Distribución"
        description="Visualización gráfica de la distribución de costos por etapa del modelo ABC"
      >
        <Button
          variant="outline"
          size="sm"
          onClick={exportToPDF}
          disabled={allocation.allocations.length === 0}
          className="gap-1.5"
        >
          <FileDown className="h-4 w-4" />
          Exportar PDF
        </Button>
      </PageHeader>

      {allocation.allocations.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-12 text-center text-muted-foreground">
            <p className="text-sm">
              No hay asignaciones configuradas para generar reportes.
            </p>
            <p className="text-xs mt-1">
              Configura drivers en la página de Asignaciones primero.
            </p>
          </CardContent>
        </Card>
      ) : (
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="w-full sm:w-auto flex flex-wrap h-auto gap-1 sm:flex-nowrap sm:h-9">
            <TabsTrigger value="res_to_act" className="flex-1 text-xs sm:text-sm">Recursos → Actividades</TabsTrigger>
            <TabsTrigger value="act_to_co" className="flex-1 text-xs sm:text-sm">
              Actividades → Objetos de Costo
            </TabsTrigger>
          </TabsList>

          <TabsContent value="res_to_act" className="mt-4">
            <DistributionView
              title="Detalle: Distribución de recursos en actividades"
              items={resData.items}
              filters={resFilters}
              sourceType="resource"
            />
          </TabsContent>

          <TabsContent value="act_to_co" className="mt-4">
            <DistributionView
              title="Detalle: Distribución de actividades a objetos de costo"
              items={actData.items}
              filters={actFilters}
              sourceType="activity"
            />
          </TabsContent>
        </Tabs>
      )}
    </AppLayout>
  );
};

export default ReportsPage;
