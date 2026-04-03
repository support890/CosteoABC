import { useState, useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useEffect } from "react";
import { AppLayout } from "@/components/AppLayout";
import { PageHeader } from "@/components/PageHeader";
import { useBIExpressContext } from "@/contexts/BIExpressContext";
import { TEMPLATE_CATALOG, type TemplateId } from "@/lib/bi-express-engine";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { ChevronLeft, ChevronRight, Search, Trash2, Undo2 } from "lucide-react";
import type { TransactionRow } from "@/lib/bi-express-engine";

const PAGE_SIZE = 50;

// ── T1 Data Table (with exclude/restore) ────────────────────────────────────────

function DataTable({
  rows,
  hasCostData,
  actionIcon,
  actionLabel,
  actionVariant,
  onAction,
}: {
  rows: { row: TransactionRow; globalIndex: number }[];
  hasCostData: boolean;
  actionIcon: React.ReactNode;
  actionLabel: string;
  actionVariant: "destructive" | "outline";
  onAction: (index: number) => void;
}) {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  const filtered = useMemo(() => {
    if (!search.trim()) return rows;
    const q = search.toLowerCase();
    return rows.filter(
      ({ row: r }) =>
        r.id_transaccion.toLowerCase().includes(q) ||
        r.sku_id.toLowerCase().includes(q) ||
        r.nombre_producto.toLowerCase().includes(q) ||
        r.categoria.toLowerCase().includes(q),
    );
  }, [rows, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const handleSearch = (value: string) => {
    setSearch(value);
    setPage(1);
  };

  if (rows.length === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="p-12 text-center text-muted-foreground text-sm">
          No hay registros en esta sección.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar por ID, SKU, producto, categoría..."
          value={search}
          onChange={(e) => handleSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      <div className="rounded-md border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-xs w-8" />
              <TableHead className="text-xs whitespace-nowrap">ID Transacción</TableHead>
              <TableHead className="text-xs whitespace-nowrap">Fecha</TableHead>
              <TableHead className="text-xs whitespace-nowrap">SKU</TableHead>
              <TableHead className="text-xs">Producto</TableHead>
              <TableHead className="text-xs">Categoría</TableHead>
              <TableHead className="text-xs text-right whitespace-nowrap">Cantidad</TableHead>
              <TableHead className="text-xs text-right whitespace-nowrap">Precio Unit.</TableHead>
              {hasCostData && <TableHead className="text-xs text-right whitespace-nowrap">Costo Unit.</TableHead>}
              <TableHead className="text-xs text-right whitespace-nowrap">Total</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginated.map(({ row: r, globalIndex }) => (
              <TableRow key={globalIndex} className="group">
                <TableCell className="p-1">
                  <Button
                    variant={actionVariant}
                    size="icon"
                    className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                    title={actionLabel}
                    onClick={() => onAction(globalIndex)}
                  >
                    {actionIcon}
                  </Button>
                </TableCell>
                <TableCell className="text-xs font-mono">{r.id_transaccion}</TableCell>
                <TableCell className="text-xs whitespace-nowrap">{r.fecha.toLocaleDateString("es-BO")}</TableCell>
                <TableCell className="text-xs font-mono">{r.sku_id}</TableCell>
                <TableCell className="text-xs max-w-[160px] truncate">{r.nombre_producto}</TableCell>
                <TableCell className="text-xs">{r.categoria}</TableCell>
                <TableCell className="text-xs text-right">{r.cantidad.toLocaleString()}</TableCell>
                <TableCell className="text-xs text-right font-mono">
                  {r.precio_unitario.toLocaleString("es-BO", { minimumFractionDigits: 2 })}
                </TableCell>
                {hasCostData && (
                  <TableCell className="text-xs text-right font-mono">
                    {r.costo_unitario != null
                      ? r.costo_unitario.toLocaleString("es-BO", { minimumFractionDigits: 2 })
                      : "—"}
                  </TableCell>
                )}
                <TableCell className="text-xs text-right font-mono font-medium">
                  {(r.cantidad * r.precio_unitario).toLocaleString("es-BO", { minimumFractionDigits: 2 })}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">
            Página {page} de {totalPages} · {filtered.length.toLocaleString()} registros
          </span>
          <div className="flex items-center gap-1">
            <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Generic read-only table for T4, T7, T8, T9, T10, T11, T12 ───────────────────

function formatCellValue(value: unknown, type: "string" | "number" | "date"): string {
  if (value == null) return "—";
  if (type === "date" && value instanceof Date) return value.toLocaleDateString("es-BO");
  if (type === "number" && typeof value === "number")
    return value.toLocaleString("es-BO", { minimumFractionDigits: 2 });
  return String(value);
}

function GenericDataTable({
  templateId,
  rows,
  actionIcon,
  actionLabel,
  actionVariant,
  onAction,
}: {
  templateId: TemplateId;
  rows: Record<string, unknown>[];
  actionIcon?: React.ReactNode;
  actionLabel?: string;
  actionVariant?: "destructive" | "outline";
  onAction?: (index: number) => void;
}) {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const columns = TEMPLATE_CATALOG[templateId].columns;
  const stringCols = columns.filter((c) => c.type === "string");

  const filtered = useMemo(() => {
    if (!search.trim()) return rows;
    const q = search.toLowerCase();
    return rows.filter((row) =>
      stringCols.some((col) => String(row[col.key] ?? "").toLowerCase().includes(q)),
    );
  }, [rows, search, stringCols]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const handleSearch = (value: string) => {
    setSearch(value);
    setPage(1);
  };

  if (rows.length === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="p-12 text-center text-muted-foreground text-sm">
          No hay registros cargados.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {stringCols.length > 0 && (
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={`Buscar por ${stringCols.map((c) => c.label).join(", ")}...`}
            value={search}
            onChange={(e) => handleSearch(e.target.value)}
            className="pl-9"
          />
        </div>
      )}

      <div className="rounded-md border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              {onAction && <TableHead className="text-xs w-8" />}
              {columns.map((col) => (
                <TableHead
                  key={col.key}
                  className={`text-xs whitespace-nowrap${col.type === "number" ? " text-right" : ""}`}
                >
                  {col.label}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginated.map((row, i) => (
              <TableRow key={i} className={onAction ? "group" : ""}>
                {onAction && (
                  <TableCell className="p-1">
                    <Button
                      variant={actionVariant}
                      size="icon"
                      className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                      title={actionLabel}
                      onClick={() => onAction(i)}
                    >
                      {actionIcon}
                    </Button>
                  </TableCell>
                )}
                {columns.map((col) => (
                  <TableCell
                    key={col.key}
                    className={`text-xs${col.type === "number" ? " text-right font-mono" : col.type === "date" ? " whitespace-nowrap" : ""}`}
                  >
                    {formatCellValue(row[col.key], col.type)}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">
            Página {page} de {totalPages} · {filtered.length.toLocaleString()} registros
          </span>
          <div className="flex items-center gap-1">
            <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Page ────────────────────────────────────────────────────────────────────────

export default function BIExpressDataPage() {
  const { templateId = "T1" } = useParams<{ templateId: string }>();
  const id = templateId as TemplateId;

  const {
    selectedBIModel, selectedBIPeriod,
    t1Rows, hasCostData,
    t2Rows, t3Rows, t4Rows, t5Rows, t6Rows, t7Rows, t8Rows,
    deletedRowIndices, toggleDeletedRow,
    excludedGenericRows, toggleExcludedGenericRow,
    result,
    loadedTemplates,
  } = useBIExpressContext();
  const navigate = useNavigate();

  useEffect(() => {
    if (!selectedBIModel || !selectedBIPeriod) navigate("/bi-express");
  }, [selectedBIModel, selectedBIPeriod, navigate]);

  const templateDef = TEMPLATE_CATALOG[id];

  // ── T1 specific ──
  const activeRows = useMemo(
    () => t1Rows.map((row, i) => ({ row, globalIndex: i })).filter(({ globalIndex }) => !deletedRowIndices.has(globalIndex)),
    [t1Rows, deletedRowIndices],
  );
  const deletedRows = useMemo(
    () => t1Rows.map((row, i) => ({ row, globalIndex: i })).filter(({ globalIndex }) => deletedRowIndices.has(globalIndex)),
    [t1Rows, deletedRowIndices],
  );

  // ── Generic template rows ──
  const genericRows = useMemo((): Record<string, unknown>[] => {
    const map: Partial<Record<TemplateId, unknown[]>> = {
      T2: t2Rows, T3: t3Rows, T4: t4Rows, T5: t5Rows, T6: t6Rows,
      T7: t7Rows, T8: t8Rows,
    };
    return (map[id] ?? []) as Record<string, unknown>[];
  }, [id, t2Rows, t3Rows, t4Rows, t5Rows, t6Rows, t7Rows, t8Rows]);

  const excludedSet = excludedGenericRows[id] ?? new Set<number>();
  const activeGenericRows = useMemo(
    () => genericRows.map((row, i) => ({ row, globalIndex: i })).filter(({ globalIndex }) => !excludedSet.has(globalIndex)),
    [genericRows, excludedSet],
  );
  const excludedGenericRowsList = useMemo(
    () => genericRows.map((row, i) => ({ row, globalIndex: i })).filter(({ globalIndex }) => excludedSet.has(globalIndex)),
    [genericRows, excludedSet],
  );

  // ── Empty state ──
  const isEmpty = id === "T1" ? (!result || t1Rows.length === 0) : !loadedTemplates.has(id);
  if (isEmpty) {
    return (
      <AppLayout>
        <PageHeader
          title={`Datos Cargados (${id})`}
          description={`Visualiza los datos importados desde la Plantilla ${id} · ${templateDef?.name ?? ""}`}
        />
        <Card className="border-dashed">
          <CardContent className="p-12 text-center text-muted-foreground">
            No hay datos cargados. Ve a <strong>Plantillas</strong> y carga la Plantilla {id}.
          </CardContent>
        </Card>
      </AppLayout>
    );
  }

  // ── T1 view ──
  if (id === "T1") {
    return (
      <AppLayout>
        <PageHeader
          title="Datos Cargados (T1)"
          description="Visualiza y administra las transacciones de la Plantilla Core Transaccional"
        >
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="text-sm px-3 py-1">
              {activeRows.length.toLocaleString()} activos
            </Badge>
            {deletedRows.length > 0 && (
              <Badge variant="outline" className="text-sm px-3 py-1 border-red-300 text-red-600 dark:text-red-400">
                {deletedRows.length.toLocaleString()} excluidos
              </Badge>
            )}
          </div>
        </PageHeader>

        <Tabs defaultValue="active">
          <TabsList className="mb-4">
            <TabsTrigger value="active" className="text-xs">
              Activos ({activeRows.length.toLocaleString()})
            </TabsTrigger>
            <TabsTrigger value="deleted" className="text-xs">
              <Trash2 className="h-3 w-3 mr-1.5 text-red-500" />
              Excluidos ({deletedRows.length.toLocaleString()})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="active">
            <DataTable
              rows={activeRows}
              hasCostData={hasCostData}
              actionIcon={<Trash2 className="h-3 w-3" />}
              actionLabel="Excluir del cálculo"
              actionVariant="destructive"
              onAction={toggleDeletedRow}
            />
          </TabsContent>

          <TabsContent value="deleted">
            {deletedRows.length > 0 && (
              <div className="mb-3 p-3 rounded-md border border-amber-200 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-800 text-xs text-amber-800 dark:text-amber-200">
                Estos registros están excluidos del cálculo de KPIs. Restáuralos para incluirlos nuevamente.
              </div>
            )}
            <DataTable
              rows={deletedRows}
              hasCostData={hasCostData}
              actionIcon={<Undo2 className="h-3 w-3" />}
              actionLabel="Restaurar al cálculo"
              actionVariant="outline"
              onAction={toggleDeletedRow}
            />
          </TabsContent>
        </Tabs>
      </AppLayout>
    );
  }

  // ── Generic view for T2–T8 ──
  return (
    <AppLayout>
      <PageHeader
        title={`Datos Cargados (${id})`}
        description={`${templateDef.name} · ${templateDef.description}`}
      >
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="text-sm px-3 py-1">
            {activeGenericRows.length.toLocaleString()} activos
          </Badge>
          {excludedGenericRowsList.length > 0 && (
            <Badge variant="outline" className="text-sm px-3 py-1 border-red-300 text-red-600 dark:text-red-400">
              {excludedGenericRowsList.length.toLocaleString()} excluidos
            </Badge>
          )}
        </div>
      </PageHeader>

      <Tabs defaultValue="active">
        <TabsList className="mb-4">
          <TabsTrigger value="active" className="text-xs">
            Activos ({activeGenericRows.length.toLocaleString()})
          </TabsTrigger>
          <TabsTrigger value="excluded" className="text-xs">
            <Trash2 className="h-3 w-3 mr-1.5 text-red-500" />
            Excluidos ({excludedGenericRowsList.length.toLocaleString()})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="active">
          <GenericDataTable
            templateId={id}
            rows={activeGenericRows.map((r) => r.row)}
            actionIcon={<Trash2 className="h-3 w-3" />}
            actionLabel="Excluir del cálculo"
            actionVariant="destructive"
            onAction={(i) => toggleExcludedGenericRow(id, activeGenericRows[i].globalIndex)}
          />
        </TabsContent>

        <TabsContent value="excluded">
          {excludedGenericRowsList.length > 0 && (
            <div className="mb-3 p-3 rounded-md border border-amber-200 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-800 text-xs text-amber-800 dark:text-amber-200">
              Estos registros están excluidos del cálculo de KPIs. Restáuralos para incluirlos nuevamente.
            </div>
          )}
          <GenericDataTable
            templateId={id}
            rows={excludedGenericRowsList.map((r) => r.row)}
            actionIcon={<Undo2 className="h-3 w-3" />}
            actionLabel="Restaurar al cálculo"
            actionVariant="outline"
            onAction={(i) => toggleExcludedGenericRow(id, excludedGenericRowsList[i].globalIndex)}
          />
        </TabsContent>
      </Tabs>
    </AppLayout>
  );
}
