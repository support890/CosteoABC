import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { AppLayout } from "@/components/AppLayout";
import { PageHeader } from "@/components/PageHeader";
import {
  useDimensions,
  useDimensionItems,
  useCostObjectDimensions,
  useCostObjects,
  type Dimension,
  type DimensionItem,
} from "@/hooks/use-supabase-data";
import { supabase } from "@/lib/supabase";
import { useModelContext } from "@/contexts/ModelContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Layers,
  Plus,
  Pencil,
  Trash2,
  ChevronRight,
  ChevronDown,
  Tag,
  Link2,
} from "lucide-react";
import { useAllocation } from "@/hooks/use-allocation";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";

/* ── Tree builder ─────────────────────────────────────────── */
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

/* ── Tree row component ───────────────────────────────────── */
function TreeRow({
  node,
  depth,
  onEdit,
  onDelete,
  onAddChild,
  onAssign,
  getAssignedCount,
  getAssignedCost,
}: {
  node: TreeNode;
  depth: number;
  onEdit: (item: DimensionItem) => void;
  onDelete: (id: string) => void;
  onAddChild: (parent: DimensionItem) => void;
  onAssign: (item: DimensionItem) => void;
  getAssignedCount: (id: string) => number;
  getAssignedCost: (id: string) => number;
}) {
  const [open, setOpen] = useState(true);
  const hasChildren = node.children.length > 0;
  const assignedCount = getAssignedCount(node.id);
  const assignedCost = getAssignedCost(node.id);
  const venta = node.price ?? 0;
  const eficiencia = venta > 0 ? ((venta - assignedCost) / venta) * 100 : null;
  const fmt = (n: number) => n.toLocaleString("es-BO", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  return (
    <>
      <div
        className="flex items-center gap-2 py-1.5 px-2 rounded hover:bg-muted/50 group"
        style={{ paddingLeft: `${8 + depth * 20}px` }}
      >
        <button
          className="shrink-0 text-muted-foreground"
          onClick={() => setOpen((v) => !v)}
        >
          {hasChildren ? (
            open ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )
          ) : (
            <span className="h-4 w-4 block" />
          )}
        </button>
        <span className="text-xs text-muted-foreground font-mono whitespace-nowrap shrink-0 w-24">
          {node.code}
        </span>
        <span className="flex-1 text-sm">{node.name}</span>
        <span className="w-28 text-right text-xs font-mono text-muted-foreground shrink-0">
          {venta > 0 ? fmt(venta) : "—"}
        </span>
        <span className="w-28 text-right text-xs font-mono text-muted-foreground shrink-0">
          {assignedCost > 0 ? fmt(assignedCost) : "—"}
        </span>
        <span
          className={`w-20 text-right text-xs font-mono font-medium shrink-0 ${
            eficiencia === null
              ? "text-muted-foreground"
              : eficiencia >= 0
                ? "text-green-500"
                : "text-destructive"
          }`}
        >
          {eficiencia !== null ? `${eficiencia.toFixed(1)}%` : "—"}
        </span>
        <Badge
          variant="secondary"
          className={`text-xs shrink-0 ml-4 ${assignedCount === 0 ? "invisible" : ""}`}
        >
          {assignedCount} obj.
        </Badge>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            title="Asignar objetos de costo"
            onClick={() => onAssign(node)}
          >
            <Link2 className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            title="Agregar ítem hijo"
            onClick={() => onAddChild(node)}
          >
            <Plus className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            title="Editar"
            onClick={() => onEdit(node)}
          >
            <Pencil className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 text-destructive hover:text-destructive"
            title="Eliminar"
            onClick={() => onDelete(node.id)}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
      {open &&
        node.children.map((child) => (
          <TreeRow
            key={child.id}
            node={child}
            depth={depth + 1}
            onEdit={onEdit}
            onDelete={onDelete}
            onAddChild={onAddChild}
            onAssign={onAssign}
            getAssignedCount={getAssignedCount}
            getAssignedCost={getAssignedCost}
          />
        ))}
    </>
  );
}

/* ── Main page ────────────────────────────────────────────── */
export default function DimensionsPage() {
  const { selectedModel, selectedPeriod } = useModelContext();
  const { toast } = useToast();
  const qc = useQueryClient();

  const {
    items: dimensions,
    isLoading: loadingDims,
    create: createDim,
    update: updateDim,
    remove: removeDim,
  } = useDimensions();

  const {
    items: allItems,
    isLoading: loadingItems,
    create: createItem,
    update: updateItem,
    remove: removeItem,
  } = useDimensionItems();

  const { items: assignments } = useCostObjectDimensions();

  const { items: costObjects } = useCostObjects();

  const allocation = useAllocation();
  const costObjectReceivedMap: Record<string, number> = {};
  for (const sum of allocation.costObjectSummaries) {
    costObjectReceivedMap[sum.id] = sum.received_amount;
  }

  /* ── UI state ─────────────────────────────────────────────── */
  const [selectedDim, setSelectedDim] = useState<Dimension | null>(null);

  // Dimension dialog
  const [dimDialog, setDimDialog] = useState(false);
  const [editingDim, setEditingDim] = useState<Dimension | null>(null);
  const [dimForm, setDimForm] = useState({ name: "", code: "" });

  // Item dialog
  const [itemDialog, setItemDialog] = useState(false);
  const [editingItem, setEditingItem] = useState<DimensionItem | null>(null);
  const [itemParent, setItemParent] = useState<DimensionItem | null>(null);
  const [itemForm, setItemForm] = useState({ name: "", code: "", parent_id: "", price: "" });

  // Assignment dialog
  const [assignDialog, setAssignDialog] = useState(false);
  const [assigningItem, setAssigningItem] = useState<DimensionItem | null>(null);
  const [selectedCostObjects, setSelectedCostObjects] = useState<Set<string>>(new Set());
  const [coPercentages, setCoPercentages] = useState<Map<string, number>>(new Map());
  const [coSearch, setCoSearch] = useState("");

  /* ── Derived data ─────────────────────────────────────────── */
  const dimensionItems = selectedDim
    ? allItems.filter((i) => i.dimension_id === selectedDim.id)
    : [];

  const tree = buildTree(dimensionItems);

  function assignedCountForItem(itemId: string) {
    return assignments.filter((a) => a.dimension_item_id === itemId).length;
  }

  function assignedCostForItem(itemId: string) {
    return assignments
      .filter((a) => a.dimension_item_id === itemId)
      .reduce((sum, a) => {
        const co = costObjects.find((c) => c.id === a.cost_object_id);
        if (!co) return sum;
        const totalCost = co.amount + (costObjectReceivedMap[co.id] ?? 0);
        return sum + totalCost * ((a.percentage ?? 100) / 100);
      }, 0);
  }

  function dimItemCount(dimId: string) {
    return allItems.filter((i) => i.dimension_id === dimId).length;
  }

  /** Genera el siguiente código consecutivo para un ítem según su padre. */
  function generateNextCode(parentId: string | null, excludeId?: string): string {
    const prefix = parentId
      ? dimensionItems.find((i) => i.id === parentId)?.code ?? selectedDim?.code ?? "ITEM"
      : selectedDim?.code ?? "ITEM";
    const siblings = dimensionItems.filter(
      (i) => (i.parent_id ?? null) === parentId && i.id !== excludeId
    );
    const nextNum = siblings.length + 1;
    return `${prefix}-${String(nextNum).padStart(2, "0")}`;
  }

  /* ── Dimension handlers ───────────────────────────────────── */
  function openNewDim() {
    setEditingDim(null);
    const nextNum = dimensions.length + 1;
    const autoCode = `DIM-${String(nextNum).padStart(2, "0")}`;
    setDimForm({ name: "", code: autoCode });
    setDimDialog(true);
  }

  function openEditDim(dim: Dimension) {
    setEditingDim(dim);
    setDimForm({ name: dim.name, code: dim.code ?? "" });
    setDimDialog(true);
  }

  async function saveDim() {
    if (!dimForm.name.trim()) return;
    try {
      if (editingDim) {
        await updateDim.mutateAsync({ id: editingDim.id, name: dimForm.name, code: dimForm.code || null });
        toast({ title: "Dimensión actualizada" });
      } else {
        const created = await createDim.mutateAsync({
          name: dimForm.name,
          code: dimForm.code || null,
          sort_order: dimensions.length,
        });
        setSelectedDim(created);
        toast({ title: "Dimensión creada" });
      }
      setDimDialog(false);
    } catch (e: unknown) {
      toast({ title: "Error", description: (e as Error).message, variant: "destructive" });
    }
  }

  async function deleteDim(id: string) {
    try {
      await removeDim.mutateAsync(id);
      if (selectedDim?.id === id) setSelectedDim(null);
      toast({ title: "Dimensión eliminada" });
    } catch (e: unknown) {
      toast({ title: "Error", description: (e as Error).message, variant: "destructive" });
    }
  }

  /* ── Item handlers ────────────────────────────────────────── */
  function openNewItem(parent?: DimensionItem) {
    setEditingItem(null);
    setItemParent(parent ?? null);
    const parentId = parent?.id ?? null;
    const autoCode = generateNextCode(parentId);
    setItemForm({ name: "", code: autoCode, parent_id: parent?.id ?? "", price: "" });
    setItemDialog(true);
  }

  function openEditItem(item: DimensionItem) {
    setEditingItem(item);
    setItemParent(null);
    setItemForm({ name: item.name, code: item.code, parent_id: item.parent_id ?? "", price: item.price != null ? String(item.price) : "" });
    setItemDialog(true);
  }

  async function saveItem() {
    if (!itemForm.name.trim() || !itemForm.code.trim() || !selectedDim) return;
    const parentId = itemForm.parent_id || null;
    const parentItem = parentId ? dimensionItems.find((i) => i.id === parentId) : null;
    const level = parentItem ? parentItem.level + 1 : 0;

    const price = itemForm.price !== "" ? parseFloat(itemForm.price) : null;
    try {
      if (editingItem) {
        await updateItem.mutateAsync({
          id: editingItem.id,
          name: itemForm.name,
          code: itemForm.code,
          parent_id: parentId,
          level,
          price,
        });
        toast({ title: "Ítem actualizado" });
      } else {
        await createItem.mutateAsync({
          tenant_id: "",   // filled by hook
          dimension_id: selectedDim.id,
          parent_id: parentId,
          code: itemForm.code,
          name: itemForm.name,
          level,
          price,
        });
        toast({ title: "Ítem creado" });
      }
      setItemDialog(false);
    } catch (e: unknown) {
      toast({ title: "Error", description: (e as Error).message, variant: "destructive" });
    }
  }

  async function deleteItem(id: string) {
    try {
      await removeItem.mutateAsync(id);
      toast({ title: "Ítem eliminado" });
    } catch (e: unknown) {
      toast({ title: "Error", description: (e as Error).message, variant: "destructive" });
    }
  }

  /* ── Assignment handlers ──────────────────────────────────── */
  function openAssign(item: DimensionItem) {
    setAssigningItem(item);
    const currentForItem = assignments.filter((a) => a.dimension_item_id === item.id);
    setSelectedCostObjects(new Set(currentForItem.map((a) => a.cost_object_id)));
    setCoPercentages(new Map(currentForItem.map((a) => [a.cost_object_id, a.percentage ?? 100])));
    setCoSearch("");
    setAssignDialog(true);
  }

  /** Sum of percentages already assigned in OTHER items of the same dimension for this cost object. */
  function usedElsewhere(coId: string): number {
    if (!assigningItem) return 0;
    const siblingIds = new Set(
      allItems
        .filter((i) => i.dimension_id === assigningItem.dimension_id && i.id !== assigningItem.id)
        .map((i) => i.id)
    );
    return assignments
      .filter((a) => a.cost_object_id === coId && siblingIds.has(a.dimension_item_id))
      .reduce((sum, a) => sum + (a.percentage ?? 100), 0);
  }

  async function saveAssignment() {
    if (!assigningItem) return;
    try {
      const currentForItem = assignments.filter((a) => a.dimension_item_id === assigningItem.id);
      const currentIds = currentForItem.map((a) => a.cost_object_id);

      const toAdd = [...selectedCostObjects].filter((id) => !currentIds.includes(id));
      const toUpdate = [...selectedCostObjects].filter((id) => currentIds.includes(id));
      const toRemove = currentIds.filter((id) => !selectedCostObjects.has(id));

      if (toAdd.length > 0) {
        const { error } = await supabase.from("cost_object_dimensions").insert(
          toAdd.map((coId) => ({
            cost_object_id: coId,
            dimension_item_id: assigningItem.id,
            percentage: coPercentages.get(coId) ?? 100,
          }))
        );
        if (error) throw error;
      }

      for (const coId of toUpdate) {
        const { error } = await supabase
          .from("cost_object_dimensions")
          .update({ percentage: coPercentages.get(coId) ?? 100 })
          .eq("cost_object_id", coId)
          .eq("dimension_item_id", assigningItem.id);
        if (error) throw error;
      }

      for (const coId of toRemove) {
        const { error } = await supabase
          .from("cost_object_dimensions")
          .delete()
          .eq("cost_object_id", coId)
          .eq("dimension_item_id", assigningItem.id);
        if (error) throw error;
      }

      qc.invalidateQueries({ queryKey: ["cost_object_dimensions"] });
      toast({ title: "Asignaciones guardadas" });
      setAssignDialog(false);
    } catch (e: unknown) {
      toast({ title: "Error", description: (e as Error).message, variant: "destructive" });
    }
  }

  function toggleCostObject(coId: string) {
    if (selectedCostObjects.has(coId)) {
      setSelectedCostObjects((prev) => { const n = new Set(prev); n.delete(coId); return n; });
      setCoPercentages((prev) => { const m = new Map(prev); m.delete(coId); return m; });
    } else {
      const remaining = Math.max(0, 100 - usedElsewhere(coId));
      setSelectedCostObjects((prev) => { const n = new Set(prev); n.add(coId); return n; });
      setCoPercentages((prev) => new Map(prev).set(coId, remaining));
    }
  }

  const filteredCostObjects = costObjects.filter(
    (co) =>
      co.name.toLowerCase().includes(coSearch.toLowerCase()) ||
      co.code.toLowerCase().includes(coSearch.toLowerCase())
  );

  /* ── Guard: no model/period selected ─────────────────────── */
  if (!selectedModel || !selectedPeriod) {
    return (
      <AppLayout>
        <div className="flex flex-col items-center justify-center h-64 gap-4 text-muted-foreground">
          <Layers className="h-12 w-12 opacity-30" />
          <p>Seleccioná un modelo y período para gestionar dimensiones.</p>
        </div>
      </AppLayout>
    );
  }

  /* ── Render ───────────────────────────────────────────────── */
  return (
    <AppLayout>
      <PageHeader
        title="Dimensiones"
        description="Definí las dimensiones de análisis del modelo (productos, canales, regiones, etc.) y asigná los objetos de costo."
      />

      <div className="flex gap-4 h-[calc(100vh-11rem)] p-4">
        {/* ── Left: Dimensions list ───────────────────────── */}
        <div className="w-72 shrink-0 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
              Dimensiones
            </span>
            <Button size="sm" variant="outline" onClick={openNewDim}>
              <Plus className="h-4 w-4 mr-1" />
              Nueva
            </Button>
          </div>

          <Card className="flex-1 overflow-hidden">
            <ScrollArea className="h-full">
              {loadingDims ? (
                <div className="p-4 text-sm text-muted-foreground">Cargando…</div>
              ) : dimensions.length === 0 ? (
                <div className="p-6 flex flex-col items-center gap-3 text-muted-foreground">
                  <Tag className="h-8 w-8 opacity-40" />
                  <p className="text-sm text-center">
                    No hay dimensiones. Creá la primera dimensión para comenzar.
                  </p>
                </div>
              ) : (
                <div className="p-2 flex flex-col gap-1">
                  {dimensions.map((dim) => (
                    <div
                      key={dim.id}
                      className={cn(
                        "flex items-center gap-2 p-2 rounded-md cursor-pointer group transition-colors",
                        selectedDim?.id === dim.id
                          ? "bg-primary/10 text-primary"
                          : "hover:bg-muted/50"
                      )}
                      onClick={() => setSelectedDim(dim)}
                    >
                      <Layers className="h-4 w-4 shrink-0 opacity-60" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{dim.name}</p>
                        {dim.code && (
                          <p className="text-xs text-muted-foreground font-mono">{dim.code}</p>
                        )}
                      </div>
                      <Badge variant="outline" className="text-xs shrink-0">
                        {dimItemCount(dim.id)}
                      </Badge>
                      <div className="flex gap-0.5">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={(e) => {
                            e.stopPropagation();
                            openEditDim(dim);
                          }}
                        >
                          <Pencil className="h-3 w-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 text-destructive hover:text-destructive"
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteDim(dim.id);
                          }}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </Card>
        </div>

        {/* ── Right: Items tree ───────────────────────────── */}
        <div className="flex-1 flex flex-col gap-3 min-w-0">
          {selectedDim ? (
            <>
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                    Ítems de{" "}
                  </span>
                  <span className="text-sm font-semibold">{selectedDim.name}</span>
                </div>
                <Button size="sm" variant="outline" onClick={() => openNewItem()}>
                  <Plus className="h-4 w-4 mr-1" />
                  Nuevo ítem raíz
                </Button>
              </div>

              <Card className="flex-1 overflow-hidden">
                <ScrollArea className="h-full">
                  {loadingItems ? (
                    <div className="p-4 text-sm text-muted-foreground">Cargando…</div>
                  ) : tree.length === 0 ? (
                    <div className="p-8 flex flex-col items-center gap-3 text-muted-foreground">
                      <ChevronRight className="h-8 w-8 opacity-40" />
                      <p className="text-sm text-center">
                        No hay ítems en esta dimensión. Creá el primer ítem raíz.
                      </p>
                    </div>
                  ) : (
                    <div className="p-2">
                      {/* Column headers */}
                      <div className="flex items-center gap-2 pb-1 mb-1 border-b border-border/50" style={{ paddingLeft: "8px" }}>
                        <span className="h-4 w-4 shrink-0" />
                        <span className="w-24 shrink-0" />
                        <span className="flex-1" />
                        <span className="w-28 text-right text-xs font-medium text-muted-foreground shrink-0">Venta</span>
                        <span className="w-28 text-right text-xs font-medium text-muted-foreground shrink-0">Costo</span>
                        <span className="w-20 text-right text-xs font-medium text-muted-foreground shrink-0">Eficiencia</span>
                        <Badge variant="secondary" className="text-xs shrink-0 ml-4 invisible">0 obj.</Badge>
                        <div className="flex items-center gap-1">
                          <span className="h-6 w-6 shrink-0" />
                          <span className="h-6 w-6 shrink-0" />
                          <span className="h-6 w-6 shrink-0" />
                          <span className="h-6 w-6 shrink-0" />
                        </div>
                      </div>
                      {tree.map((node) => (
                        <TreeRow
                          key={node.id}
                          node={node}
                          depth={0}
                          onEdit={openEditItem}
                          onDelete={deleteItem}
                          onAddChild={openNewItem}
                          onAssign={openAssign}
                          getAssignedCount={assignedCountForItem}
                          getAssignedCost={assignedCostForItem}
                        />
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </Card>

              <div className="text-xs text-muted-foreground flex items-center gap-1">
                <Link2 className="h-3 w-3" />
                Usá el botón de enlace en cada ítem para asignar objetos de costo.
              </div>
            </>
          ) : (
            <Card className="flex-1 flex items-center justify-center">
              <div className="flex flex-col items-center gap-3 text-muted-foreground">
                <Layers className="h-12 w-12 opacity-20" />
                <p className="text-sm">Seleccioná una dimensión para ver sus ítems.</p>
              </div>
            </Card>
          )}
        </div>
      </div>

      {/* ── Dialog: New / Edit Dimension ─────────────────────── */}
      <Dialog open={dimDialog} onOpenChange={setDimDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>
              {editingDim ? "Editar dimensión" : "Nueva dimensión"}
            </DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label>Código</Label>
              <Input
                placeholder="ej: DIM-01"
                value={dimForm.code}
                onChange={(e) =>
                  setDimForm((f) => ({ ...f, code: e.target.value.toUpperCase() }))
                }
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Nombre *</Label>
              <Input
                placeholder="ej: Productos, Canales, Regiones"
                value={dimForm.name}
                onChange={(e) => setDimForm((f) => ({ ...f, name: e.target.value }))}
                autoFocus
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDimDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={saveDim} disabled={!dimForm.name.trim()}>
              {editingDim ? "Guardar cambios" : "Crear dimensión"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Dialog: New / Edit Item ───────────────────────────── */}
      <Dialog open={itemDialog} onOpenChange={setItemDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>
              {editingItem ? "Editar ítem" : "Nuevo ítem"}
              {itemParent && (
                <span className="text-muted-foreground font-normal text-sm ml-2">
                  hijo de {itemParent.name}
                </span>
              )}
            </DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label>Código *</Label>
              <Input
                placeholder="ej: PROD-001"
                value={itemForm.code}
                onChange={(e) =>
                  setItemForm((f) => ({ ...f, code: e.target.value.toUpperCase() }))
                }
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Nombre *</Label>
              <Input
                placeholder="ej: Producto A"
                value={itemForm.name}
                onChange={(e) => setItemForm((f) => ({ ...f, name: e.target.value }))}
                autoFocus
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Venta (opcional)</Label>
              <Input
                type="number"
                placeholder="ej: 15000"
                value={itemForm.price}
                onChange={(e) => setItemForm((f) => ({ ...f, price: e.target.value }))}
                min={0}
                step="0.01"
              />
            </div>
            {!itemParent && dimensionItems.length > 0 && (
              <div className="flex flex-col gap-1.5">
                <Label>Ítem padre (opcional)</Label>
                <Select
                  value={itemForm.parent_id || "none"}
                  onValueChange={(v) => {
                    const newParentId = v === "none" ? null : v;
                    const newCode = generateNextCode(newParentId, editingItem?.id);
                    setItemForm((f) => ({
                      ...f,
                      parent_id: newParentId ?? "",
                      code: newCode,
                    }));
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Sin padre (ítem raíz)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Sin padre (ítem raíz)</SelectItem>
                    {dimensionItems
                      .filter((i) => !editingItem || i.id !== editingItem.id)
                      .map((i) => (
                        <SelectItem key={i.id} value={i.id}>
                          {"  ".repeat(i.level)}
                          {i.name}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setItemDialog(false)}>
              Cancelar
            </Button>
            <Button
              onClick={saveItem}
              disabled={!itemForm.name.trim() || !itemForm.code.trim()}
            >
              {editingItem ? "Guardar cambios" : "Crear ítem"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Dialog: Assign Cost Objects ───────────────────────── */}
      <Dialog open={assignDialog} onOpenChange={setAssignDialog}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>
              Asignar objetos de costo a{" "}
              <span className="text-primary">{assigningItem?.name}</span>
            </DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-3">
            <Input
              placeholder="Buscar objeto de costo…"
              value={coSearch}
              onChange={(e) => setCoSearch(e.target.value)}
            />
            <Separator />
            {/* Column headers */}
            <div className="flex items-center gap-3 px-2 text-xs text-muted-foreground">
              <span className="w-4 shrink-0" />
              <span className="w-20 shrink-0">Código</span>
              <span className="flex-1">Nombre</span>
              <span className="w-14 text-right">% asig.</span>
              <span className="w-20 text-right shrink-0">Disp. dim.</span>
            </div>
            <ScrollArea className="h-72">
              {filteredCostObjects.length === 0 ? (
                <p className="text-sm text-muted-foreground p-2">
                  No hay objetos de costo en el período activo.
                </p>
              ) : (
                <div className="flex flex-col gap-0.5">
                  {filteredCostObjects.map((co) => {
                    const isSelected = selectedCostObjects.has(co.id);
                    const elsewhere = usedElsewhere(co.id);
                    const available = Math.max(0, 100 - elsewhere);
                    const currentPct = coPercentages.get(co.id) ?? 0;
                    const totalPct = isSelected ? elsewhere + currentPct : elsewhere;
                    const overAllocated = totalPct > 100;
                    return (
                      <div
                        key={co.id}
                        className={cn(
                          "flex items-center gap-3 px-2 py-1.5 rounded",
                          isSelected ? "bg-primary/5" : "hover:bg-muted/50"
                        )}
                      >
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={() => toggleCostObject(co.id)}
                          className="shrink-0"
                        />
                        <span
                          className="text-xs text-muted-foreground font-mono w-20 shrink-0 cursor-pointer"
                          onClick={() => toggleCostObject(co.id)}
                        >
                          {co.code}
                        </span>
                        <span
                          className="text-sm flex-1 cursor-pointer"
                          onClick={() => toggleCostObject(co.id)}
                        >
                          {co.name}
                        </span>
                        {isSelected ? (
                          <div className="flex items-center gap-1 w-14 justify-end">
                            <Input
                              type="number"
                              min={0}
                              max={available}
                              className={cn(
                                "w-14 h-6 text-xs px-1.5 text-right",
                                overAllocated && "border-destructive text-destructive"
                              )}
                              value={currentPct}
                              onChange={(e) => {
                                const val = Math.min(available, Math.max(0, Number(e.target.value) || 0));
                                setCoPercentages((prev) => new Map(prev).set(co.id, val));
                              }}
                            />
                            <span className="text-xs text-muted-foreground">%</span>
                          </div>
                        ) : (
                          <span className="w-14 text-right text-xs text-muted-foreground">—</span>
                        )}
                        <span
                          className={cn(
                            "w-20 text-right text-xs shrink-0",
                            available === 0 && !isSelected
                              ? "text-destructive"
                              : "text-muted-foreground"
                          )}
                        >
                          {available}% disp.
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </ScrollArea>
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>{selectedCostObjects.size} objeto(s) seleccionado(s)</span>
              {[...selectedCostObjects].some((id) => {
                const elsewhere = usedElsewhere(id);
                return elsewhere + (coPercentages.get(id) ?? 0) > 100;
              }) && (
                <span className="text-destructive font-medium">
                  ⚠ Algunos objetos superan el 100% en la dimensión
                </span>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAssignDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={saveAssignment}>Guardar asignaciones</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
