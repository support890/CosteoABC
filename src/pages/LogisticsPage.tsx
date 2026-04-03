import { useState, useEffect, useMemo, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { AppLayout } from "@/components/AppLayout";
import { PageHeader } from "@/components/PageHeader";
import { useLogisticsContext } from "@/contexts/LogisticsContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Truck,
  Users,
  Megaphone,
  Settings2,
  TrendingUp,
  AlertTriangle,
  DollarSign,
  BarChart3,
  RefreshCcw,
  Plus,
  Edit2,
  Trash2,
  ChevronDown,
  ChevronRight,
  Folder,
  FolderOpen,
  Package,
  Check,
  ChevronsUpDown,
  Tag,
} from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import {
  calculateFromExpenses,
  calculateSensitivityFromExpenses,
  calculateWhatIfFromExpenses,
  generateBreakEvenData,
  getCostDistributionFromExpenses,
  fmtCurrency,
  fmtNumber,
  DEFAULT_OPERATION_DRIVERS,
  type DynamicLogisticsInputs,
  type LogisticsResults,
  type OperationDrivers,
  type ExpenseCategory,
  type ExpenseItem,
} from "@/lib/logistics-engine";
import {
  useLogisticsExpenses,
  useLogisticsExpenseCenters,
  useLogisticsOperationDrivers,
  type LogisticsExpense,
  type LogisticsExpenseCenter,
} from "@/hooks/use-logistics-expenses";
import { useToast } from "@/hooks/use-toast";

// ── Helpers ─────────────────────────────────────────────────────────────────────

function WiSlider({ value, onChange, base, min, max, step }: {
  value: number; onChange: (v: number) => void; base: number; min: number; max: number; step: number;
}) {
  const basePos = ((base - min) / (max - min)) * 100;
  const changed = value !== base;
  return (
    <div className="relative">
      <Slider value={[value]} onValueChange={([v]) => onChange(v)} min={min} max={max} step={step} />
      {changed && (
        <div
          className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-4 h-4 rounded-full border-2 border-gray-400/40 bg-white/20 dark:bg-black/10 pointer-events-none"
          style={{ left: `${basePos}%` }}
        />
      )}
    </div>
  );
}

const DEFAULT_CATEGORIES: { value: string; label: string; icon: React.ReactNode; color: string; badgeColor: string }[] = [
  { value: "reparto", label: "Reparto", icon: <Truck className="h-3.5 w-3.5" />, color: "text-red-500", badgeColor: "bg-red-500/10 text-red-600" },
  { value: "preventa", label: "Preventa", icon: <Users className="h-3.5 w-3.5" />, color: "text-blue-500", badgeColor: "bg-blue-500/10 text-blue-600" },
  { value: "otros", label: "Otros", icon: <Package className="h-3.5 w-3.5" />, color: "text-gray-500", badgeColor: "bg-gray-500/10 text-gray-600" },
];

const EXTRA_BADGE_COLORS = [
  "bg-amber-500/10 text-amber-600",
  "bg-teal-500/10 text-teal-600",
  "bg-indigo-500/10 text-indigo-600",
  "bg-pink-500/10 text-pink-600",
  "bg-cyan-500/10 text-cyan-600",
  "bg-orange-500/10 text-orange-600",
  "bg-lime-500/10 text-lime-600",
];

function getCategoryBadgeColor(cat: string): string {
  const known = DEFAULT_CATEGORIES.find((c) => c.value === cat);
  if (known) return known.badgeColor;
  let hash = 0;
  for (let i = 0; i < cat.length; i++) hash = cat.charCodeAt(i) + ((hash << 5) - hash);
  return EXTRA_BADGE_COLORS[Math.abs(hash) % EXTRA_BADGE_COLORS.length];
}

function getCategoryLabel(cat: string): string {
  const known = DEFAULT_CATEGORIES.find((c) => c.value === cat);
  return known ? known.label : cat;
}

function getCategoryIcon(cat: string): React.ReactNode {
  const known = DEFAULT_CATEGORIES.find((c) => c.value === cat);
  return known ? known.icon : <Tag className="h-3.5 w-3.5" />;
}

// ── Multi-Category Selector ──────────────────────────────────────────────────

function CategorySelect({
  value,
  onChange,
  allCategories,
}: {
  value: string;
  onChange: (cat: string) => void;
  allCategories: string[];
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const options = Array.from(new Set([
    ...DEFAULT_CATEGORIES.map((c) => c.value),
    ...allCategories,
  ]));

  const filtered = search
    ? options.filter((o) => o.includes(search.toLowerCase()) || getCategoryLabel(o).toLowerCase().includes(search.toLowerCase()))
    : options;

  const isNewValue = search.trim() && !options.some(
    (o) => o === search.trim().toLowerCase().replace(/\s+/g, "_") || getCategoryLabel(o).toLowerCase() === search.trim().toLowerCase()
  );

  const select = (cat: string) => {
    onChange(cat);
    setOpen(false);
    setSearch("");
  };

  const createAndSelect = () => {
    const val = search.trim().toLowerCase().replace(/\s+/g, "_");
    if (val) {
      onChange(val);
      setOpen(false);
      setSearch("");
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="h-9 w-full justify-between text-sm font-normal">
          <span className="flex items-center gap-1.5 overflow-hidden">
            <span className={DEFAULT_CATEGORIES.find((c) => c.value === value)?.color || "text-muted-foreground"}>
              {getCategoryIcon(value)}
            </span>
            <span>{getCategoryLabel(value)}</span>
          </span>
          <ChevronsUpDown className="h-3.5 w-3.5 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[260px] p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput
            placeholder="Buscar o crear..."
            value={search}
            onValueChange={setSearch}
          />
          <CommandList>
            <CommandEmpty className="py-2 px-3 text-xs text-muted-foreground">
              Sin resultados
            </CommandEmpty>
            <CommandGroup>
              {filtered.map((cat) => (
                <CommandItem key={cat} onSelect={() => select(cat)} className="flex items-center gap-2 cursor-pointer">
                  <Check className={`h-3.5 w-3.5 ${value === cat ? "opacity-100" : "opacity-0"}`} />
                  <span className={DEFAULT_CATEGORIES.find((c) => c.value === cat)?.color || "text-muted-foreground"}>
                    {getCategoryIcon(cat)}
                  </span>
                  <span className="text-sm">{getCategoryLabel(cat)}</span>
                </CommandItem>
              ))}
              {isNewValue && (
                <CommandItem onSelect={createAndSelect} className="flex items-center gap-2 cursor-pointer text-primary">
                  <Plus className="h-3.5 w-3.5" />
                  <span className="text-sm">Crear "{search.trim()}"</span>
                </CommandItem>
              )}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

function NumericInput({
  label,
  value,
  onChange,
  prefix,
  suffix,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  prefix?: string;
  suffix?: string;
}) {
  return (
    <div className="space-y-1">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      <div className="relative">
        {prefix && (
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
            {prefix}
          </span>
        )}
        <Input
          type="number"
          min={0}
          step="any"
          className={`h-9 text-sm ${prefix ? "pl-8" : ""} ${suffix ? "pr-8" : ""}`}
          value={value || ""}
          onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
        />
        {suffix && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
            {suffix}
          </span>
        )}
      </div>
    </div>
  );
}

// ── Add/Edit Expense Dialog ─────────────────────────────────────────────────────

function ExpenseDialog({
  open,
  onOpenChange,
  onSave,
  editItem,
  centers,
  nextCode,
  allCategories,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (data: { code: string; name: string; amount: number; category: string; center_id: string | null }) => void;
  editItem?: LogisticsExpense | null;
  centers: LogisticsExpenseCenter[];
  nextCode: string;
  allCategories: string[];
}) {
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [amount, setAmount] = useState(0);
  const [category, setCategory] = useState("reparto");
  const [centerId, setCenterId] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      if (editItem) {
        setCode(editItem.code);
        setName(editItem.name);
        setAmount(editItem.amount);
        setCategory(editItem.category);
        setCenterId(editItem.center_id);
      } else {
        setCode(nextCode);
        setName("");
        setAmount(0);
        setCategory("reparto");
        setCenterId(null);
      }
    }
  }, [open, editItem, nextCode]);

  const handleSave = () => {
    if (!name.trim()) return;
    onSave({ code: code.trim() || nextCode, name: name.trim(), amount, category, center_id: centerId });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{editItem ? "Editar Gasto" : "Nuevo Gasto"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Código</Label>
              <Input value={code} onChange={(e) => setCode(e.target.value)} className="h-9 text-sm font-mono" />
            </div>
            <div className="col-span-2 space-y-1">
              <Label className="text-xs">Monto (Bs.)</Label>
              <Input
                type="number"
                min={0}
                step="any"
                value={amount || ""}
                onChange={(e) => setAmount(parseFloat(e.target.value) || 0)}
                className="h-9 text-sm"
                autoFocus
              />
            </div>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Nombre</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} className="h-9 text-sm" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Categoría</Label>
            <CategorySelect value={category} onChange={setCategory} allCategories={allCategories} />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Centro (opcional)</Label>
            <Select value={centerId || "__none__"} onValueChange={(v) => setCenterId(v === "__none__" ? null : v)}>
              <SelectTrigger className="h-9 text-sm">
                <SelectValue placeholder="Sin centro" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">Sin centro</SelectItem>
                {centers.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    <span className="flex items-center gap-2">
                      <Folder className="h-3 w-3 text-amber-500" />
                      {c.code} - {c.name}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleSave} disabled={!name.trim()}>
            {editItem ? "Guardar" : "Crear"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Add/Edit Center Dialog ──────────────────────────────────────────────────────

function CenterDialog({
  open,
  onOpenChange,
  onSave,
  editItem,
  centers,
  nextCode,
  allCategories,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (data: { code: string; name: string; category: null; note: string | null; parent_id: string | null }) => void;
  editItem?: LogisticsExpenseCenter | null;
  centers: LogisticsExpenseCenter[];
  nextCode: string;
  allCategories: string[];
}) {
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [note, setNote] = useState("");
  const [parentId, setParentId] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      if (editItem) {
        setCode(editItem.code);
        setName(editItem.name);
        setNote(editItem.note || "");
        setParentId(editItem.parent_id);
      } else {
        setCode(nextCode);
        setName("");
        setNote("");
        setParentId(null);
      }
    }
  }, [open, editItem, nextCode]);

  const availableParents = centers.filter((c) => c.id !== editItem?.id);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{editItem ? "Editar Centro" : "Nuevo Centro"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Código</Label>
              <Input value={code} onChange={(e) => setCode(e.target.value)} className="h-9 text-sm font-mono" />
            </div>
            <div className="col-span-2 space-y-1">
              <Label className="text-xs">Nombre</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} className="h-9 text-sm" autoFocus />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Centro padre (opcional)</Label>
              <Select value={parentId || "__none__"} onValueChange={(v) => setParentId(v === "__none__" ? null : v)}>
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue placeholder="Ninguno" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">Ninguno (raíz)</SelectItem>
                  {availableParents.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.code} - {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Nota (opcional)</Label>
            <Input value={note} onChange={(e) => setNote(e.target.value)} className="h-9 text-sm" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={() => {
            if (!name.trim()) return;
            onSave({ code: code.trim() || nextCode, name: name.trim(), category: null, note: note.trim() || null, parent_id: parentId });
            onOpenChange(false);
          }} disabled={!name.trim()}>
            {editItem ? "Guardar" : "Crear"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Expense Tree View ───────────────────────────────────────────────────────────

function ExpenseTreeView({
  expenses,
  centers,
  currSymbol,
  onEditExpense,
  onDeleteExpense,
  onEditCenter,
  onDeleteCenter,
  onMoveExpense,
}: {
  expenses: LogisticsExpense[];
  centers: LogisticsExpenseCenter[];
  currSymbol: string;
  onEditExpense: (item: LogisticsExpense) => void;
  onDeleteExpense: (id: string) => void;
  onEditCenter: (center: LogisticsExpenseCenter) => void;
  onDeleteCenter: (id: string) => void;
  onMoveExpense: (expenseId: string, centerId: string | null) => void;
}) {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dropTargetId, setDropTargetId] = useState<string | null>(null);
  const dragCounterRef = useRef<Record<string, number>>({});
  const [deleteExpenseId, setDeleteExpenseId] = useState<string | null>(null);
  const [deleteCenterId, setDeleteCenterId] = useState<string | null>(null);

  const toggleExpand = (id: string) =>
    setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));

  const rootCenters = centers.filter((c) => !c.parent_id);
  const getChildCenters = (parentId: string) =>
    centers.filter((c) => c.parent_id === parentId);
  const getExpenses = (centerId: string) =>
    expenses.filter((e) => e.center_id === centerId);
  const orphanExpenses = expenses.filter((e) => !e.center_id);

  const getCenterMonto = (centerId: string): number => {
    const direct = getExpenses(centerId).reduce((s, e) => s + e.amount, 0);
    const children = getChildCenters(centerId).reduce(
      (s, c) => s + getCenterMonto(c.id), 0
    );
    return direct + children;
  };

  const getCenterExpenseCount = (centerId: string): number => {
    const direct = getExpenses(centerId).length;
    const children = getChildCenters(centerId).reduce(
      (s, c) => s + getCenterExpenseCount(c.id), 0
    );
    return direct + children;
  };

  // Drag handlers
  const handleDragStart = (e: React.DragEvent, itemId: string) => {
    setDraggingId(itemId);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", itemId);
  };

  const handleDragEnd = () => {
    setDraggingId(null);
    setDropTargetId(null);
    dragCounterRef.current = {};
  };

  const handleDragEnter = (e: React.DragEvent, targetId: string | null) => {
    e.preventDefault();
    const key = targetId ?? "__orphan__";
    dragCounterRef.current[key] = (dragCounterRef.current[key] || 0) + 1;
    if (dropTargetId !== targetId) setDropTargetId(targetId);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  const handleDragLeave = (_e: React.DragEvent, targetId: string | null) => {
    const key = targetId ?? "__orphan__";
    dragCounterRef.current[key] = (dragCounterRef.current[key] || 0) - 1;
    if (dragCounterRef.current[key] <= 0) {
      dragCounterRef.current[key] = 0;
      if (dropTargetId === targetId) setDropTargetId(null);
    }
  };

  const handleDrop = (e: React.DragEvent, targetCenterId: string | null) => {
    e.preventDefault();
    e.stopPropagation();
    const itemId = e.dataTransfer.getData("text/plain");
    if (!itemId) return;
    const expense = expenses.find((exp) => exp.id === itemId);
    if (!expense) return;
    if ((expense.center_id || null) === targetCenterId) return;
    onMoveExpense(itemId, targetCenterId);
    if (targetCenterId) setExpanded((prev) => ({ ...prev, [targetCenterId]: true }));
    setDraggingId(null);
    setDropTargetId(null);
  };

  const renderExpenseRow = (item: LogisticsExpense, depth: number) => {
    const isDragging = draggingId === item.id;
    return (
      <div
        key={item.id}
        draggable
        onDragStart={(e) => handleDragStart(e, item.id)}
        onDragEnd={handleDragEnd}
        className={`flex items-center gap-2 py-2 px-3 border-b border-border/30 cursor-grab active:cursor-grabbing transition-opacity ${isDragging ? "opacity-30" : "hover:bg-muted/50"}`}
        style={{ paddingLeft: `${depth * 24 + 12}px` }}
      >
        <div className="w-4 flex items-center justify-center shrink-0">
          <svg className="h-3 w-3 text-muted-foreground/50" viewBox="0 0 6 10" fill="currentColor">
            <circle cx="1" cy="1" r="1" /><circle cx="5" cy="1" r="1" />
            <circle cx="1" cy="5" r="1" /><circle cx="5" cy="5" r="1" />
            <circle cx="1" cy="9" r="1" /><circle cx="5" cy="9" r="1" />
          </svg>
        </div>
        <span className="font-mono text-xs text-muted-foreground w-20 shrink-0">{item.code}</span>
        <span className="text-sm flex-1 truncate">{item.name}</span>
        <div className="flex gap-1 w-28 justify-center flex-wrap">
          <Badge variant="secondary" className={`${getCategoryBadgeColor(item.category)} text-[10px] px-1.5`}>
            {getCategoryLabel(item.category)}
          </Badge>
        </div>
        <span className="font-mono text-xs w-32 text-right font-medium">
          {item.amount.toLocaleString("es-BO", { minimumFractionDigits: 2 })}
        </span>
        <div className="flex gap-1 w-16 justify-end shrink-0">
          <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-primary" onClick={() => onEditExpense(item)}>
            <Edit2 className="h-3.5 w-3.5" />
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={() => setDeleteExpenseId(item.id)}>
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    );
  };

  const renderCenter = (center: LogisticsExpenseCenter, depth: number) => {
    const isExpanded = expanded[center.id] ?? true;
    const childCenters = getChildCenters(center.id);
    const centerExpenses = getExpenses(center.id);
    const totalAmount = getCenterMonto(center.id);
    const expenseCount = getCenterExpenseCount(center.id);
    const hasChildren = childCenters.length > 0 || centerExpenses.length > 0;
    const isDropTarget = draggingId && dropTargetId === center.id;

    return (
      <div
        key={center.id}
        onDragEnter={(e) => { e.stopPropagation(); handleDragEnter(e, center.id); }}
        onDragOver={(e) => { e.stopPropagation(); handleDragOver(e); }}
        onDragLeave={(e) => { e.stopPropagation(); handleDragLeave(e, center.id); }}
        onDrop={(e) => handleDrop(e, center.id)}
      >
        <div
          className={`flex items-center gap-2 py-2.5 px-3 border-b border-border/50 cursor-pointer transition-colors ${isDropTarget ? "bg-primary/15 ring-2 ring-primary/40 ring-inset" : "hover:bg-muted/30 bg-muted/20"}`}
          style={{ paddingLeft: `${depth * 24 + 12}px` }}
          onClick={() => toggleExpand(center.id)}
        >
          <span className="w-4 flex items-center justify-center shrink-0">
            {hasChildren ? (
              isExpanded ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />
            ) : <span className="w-4" />}
          </span>
          {isDropTarget ? (
            <FolderOpen className="h-4 w-4 text-primary shrink-0" />
          ) : isExpanded ? (
            <FolderOpen className="h-4 w-4 text-amber-500 shrink-0" />
          ) : (
            <Folder className="h-4 w-4 text-amber-500 shrink-0" />
          )}
          <span className="font-mono text-xs text-muted-foreground w-20 shrink-0">{center.code}</span>
          <span className="text-sm font-semibold flex-1 truncate" title={center.note || undefined}>
            {center.name}
            <span className="text-xs font-normal text-muted-foreground ml-2">
              {expenseCount} gasto{expenseCount !== 1 ? "s" : ""}
            </span>
          </span>
          <div className="flex gap-1 w-28 justify-center flex-wrap" />
          <span className="font-mono text-xs w-32 text-right font-semibold">
            {totalAmount.toLocaleString("es-BO", { minimumFractionDigits: 2 })}
          </span>
          <div className="flex gap-1 w-16 justify-end shrink-0" onClick={(e) => e.stopPropagation()}>
            <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-primary" onClick={() => onEditCenter(center)}>
              <Edit2 className="h-3.5 w-3.5" />
            </Button>
            <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={() => setDeleteCenterId(center.id)}>
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
        {isExpanded && (
          <div className="relative">
            <div className="absolute top-0 bottom-0 w-px bg-muted-foreground/20" style={{ left: `${depth * 24 + 20}px` }} />
            {childCenters.map((child) => renderCenter(child, depth + 1))}
            {centerExpenses.map((e) => renderExpenseRow(e, depth + 1))}
            {centerExpenses.length === 0 && childCenters.length === 0 && (
              <div
                className={`py-4 text-center text-xs border-b border-border/30 transition-colors ${isDropTarget ? "text-primary bg-primary/5" : "text-muted-foreground/50"}`}
                style={{ paddingLeft: `${(depth + 1) * 24 + 12}px` }}
              >
                {isDropTarget ? "Soltar aquí" : "Arrastra gastos aquí"}
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  const deleteExpense = deleteExpenseId ? expenses.find((e) => e.id === deleteExpenseId) : null;
  const deleteCenterItem = deleteCenterId ? centers.find((c) => c.id === deleteCenterId) : null;

  if (centers.length === 0 && expenses.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
        <p className="text-sm">No hay gastos todavía</p>
        <p className="text-xs mt-1">Agrega tu primer centro o gasto con los botones de arriba</p>
      </div>
    );
  }

  return (
    <div className="text-sm">
      {/* Header */}
      <div className="flex items-center gap-2 py-2 px-3 border-b border-border bg-muted/40 text-xs font-medium text-muted-foreground sticky top-0 z-10">
        <span className="w-4" />
        <span className="w-4" />
        <span className="w-20 shrink-0">Código</span>
        <span className="flex-1">Nombre</span>
        <span className="w-24 text-center">Categoría</span>
        <span className="w-32 text-right">Monto ({currSymbol})</span>
        <span className="w-16" />
      </div>

      {/* Root centers */}
      {rootCenters.map((center) => renderCenter(center, 0))}

      {/* Orphan expenses */}
      {(orphanExpenses.length > 0 || (draggingId && centers.length > 0)) && (
        <div
          onDragEnter={(e) => handleDragEnter(e, null)}
          onDragOver={handleDragOver}
          onDragLeave={(e) => handleDragLeave(e, null)}
          onDrop={(e) => handleDrop(e, null)}
        >
          {rootCenters.length > 0 && (
            <div className={`flex items-center gap-2 py-2 px-3 border-b border-border/50 transition-colors ${draggingId && dropTargetId === null ? "bg-primary/10 ring-2 ring-primary/40 ring-inset" : "bg-muted/10"}`}>
              <span className="text-xs text-muted-foreground italic">
                {draggingId && dropTargetId === null ? "Soltar para quitar del centro" : "Sin centro asignado"}
              </span>
            </div>
          )}
          {orphanExpenses.map((e) => renderExpenseRow(e, 0))}
        </div>
      )}

      {/* Delete expense confirmation */}
      <AlertDialog open={!!deleteExpenseId} onOpenChange={(open) => { if (!open) setDeleteExpenseId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Eliminar gasto
            </AlertDialogTitle>
            <AlertDialogDescription>
              ¿Está seguro de eliminar el gasto <strong>{deleteExpense?.name}</strong>?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={() => {
              if (deleteExpenseId) onDeleteExpense(deleteExpenseId);
              setDeleteExpenseId(null);
            }}>
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete center confirmation */}
      <AlertDialog open={!!deleteCenterId} onOpenChange={(open) => { if (!open) setDeleteCenterId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Eliminar centro
            </AlertDialogTitle>
            <AlertDialogDescription>
              ¿Está seguro de eliminar el centro <strong>{deleteCenterItem?.name}</strong>?
              Los gastos dentro de este centro quedarán sin centro asignado.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={() => {
              if (deleteCenterId) onDeleteCenter(deleteCenterId);
              setDeleteCenterId(null);
            }}>
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// ── Main Page ───────────────────────────────────────────────────────────────────

export default function LogisticsPage() {
  const { selectedLogisticsModel, selectedLogisticsPeriod } = useLogisticsContext();
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const section = location.pathname.split("/").pop() || "inputs";

  // Data hooks
  const { items: expenses, create: createExpense, update: updateExpense, remove: removeExpense } = useLogisticsExpenses();
  const { items: centers, create: createCenter, update: updateCenter, remove: removeCenter } = useLogisticsExpenseCenters();
  const { drivers: savedDrivers, upsert: upsertDrivers } = useLogisticsOperationDrivers();

  // Local operation drivers (synced from DB)
  const [operacion, setOperacion] = useState<OperationDrivers>(DEFAULT_OPERATION_DRIVERS);

  useEffect(() => {
    if (savedDrivers) {
      setOperacion({
        dias_laborales: savedDrivers.dias_laborales,
        margen_contribucion_pct: savedDrivers.margen_contribucion_pct,
        efectividad_reparto_pct: savedDrivers.efectividad_reparto_pct,
        pedidos_programados_diarios: savedDrivers.pedidos_programados_diarios,
        pedidos_programados_baja: savedDrivers.pedidos_programados_baja ?? 22,
        tasa_iva_pct: savedDrivers.tasa_iva_pct,
        zonas_visitadas: savedDrivers.zonas_visitadas ?? 1,
      });
    }
  }, [savedDrivers]);

  // Dialog state
  const [expenseDialogOpen, setExpenseDialogOpen] = useState(false);
  const [centerDialogOpen, setCenterDialogOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<LogisticsExpense | null>(null);
  const [editingCenter, setEditingCenter] = useState<LogisticsExpenseCenter | null>(null);

  // What-If sliders
  const [wiEfectividad, setWiEfectividad] = useState(operacion.efectividad_reparto_pct);
  const [wiMargen, setWiMargen] = useState(operacion.margen_contribucion_pct);
  const [wiPedidos, setWiPedidos] = useState(operacion.pedidos_programados_diarios);
  const [wiPedidosBaja, setWiPedidosBaja] = useState(operacion.pedidos_programados_baja);
  const [wiDias, setWiDias] = useState(operacion.dias_laborales);
  const [wiZonas, setWiZonas] = useState(operacion.zonas_visitadas);
  const [wiIva, setWiIva] = useState(operacion.tasa_iva_pct);

  // Redirect if no model selected
  useEffect(() => {
    if (!selectedLogisticsModel || !selectedLogisticsPeriod) {
      navigate("/logistics");
    }
  }, [selectedLogisticsModel, selectedLogisticsPeriod, navigate]);

  // Sync what-if sliders when operacion changes
  useEffect(() => {
    setWiEfectividad(operacion.efectividad_reparto_pct);
    setWiMargen(operacion.margen_contribucion_pct);
    setWiPedidos(operacion.pedidos_programados_diarios);
    setWiPedidosBaja(operacion.pedidos_programados_baja);
    setWiDias(operacion.dias_laborales);
    setWiZonas(operacion.zonas_visitadas);
    setWiIva(operacion.tasa_iva_pct);
  }, [operacion.efectividad_reparto_pct, operacion.margen_contribucion_pct, operacion.pedidos_programados_diarios, operacion.pedidos_programados_baja, operacion.dias_laborales, operacion.zonas_visitadas, operacion.tasa_iva_pct]);

  // Build dynamic inputs from expenses
  const expenseItems: ExpenseItem[] = useMemo(
    () => expenses.map((e) => ({ id: e.id, name: e.name, amount: e.amount, category: e.category || "otro" })),
    [expenses]
  );

  const dynamicInputs: DynamicLogisticsInputs = useMemo(
    () => ({ expenses: expenseItems, operacion: { ...operacion, pedidos_programados_diarios: operacion.pedidos_programados_diarios } }),
    [expenseItems, operacion]
  );

  const dynamicInputsBaja: DynamicLogisticsInputs = useMemo(
    () => ({ expenses: expenseItems, operacion: { ...operacion, pedidos_programados_diarios: operacion.pedidos_programados_baja } }),
    [expenseItems, operacion]
  );

  // Base results (Alta = primary)
  const results: LogisticsResults = useMemo(() => calculateFromExpenses(dynamicInputs), [dynamicInputs]);
  const resultsBaja: LogisticsResults = useMemo(() => calculateFromExpenses(dynamicInputsBaja), [dynamicInputsBaja]);

  // What-If results
  const wiInputs: DynamicLogisticsInputs = useMemo(() => {
    const modified: DynamicLogisticsInputs = JSON.parse(JSON.stringify(dynamicInputs));
    modified.operacion.efectividad_reparto_pct = wiEfectividad;
    modified.operacion.margen_contribucion_pct = wiMargen;
    modified.operacion.pedidos_programados_diarios = wiPedidos;
    modified.operacion.pedidos_programados_baja = wiPedidosBaja;
    modified.operacion.dias_laborales = wiDias;
    modified.operacion.zonas_visitadas = wiZonas;
    modified.operacion.tasa_iva_pct = wiIva;
    return modified;
  }, [dynamicInputs, wiEfectividad, wiMargen, wiPedidos, wiPedidosBaja, wiDias, wiZonas, wiIva]);

  const wiResults: LogisticsResults = useMemo(() => calculateFromExpenses(wiInputs), [wiInputs]);

  const hasWhatIfChanges =
    wiEfectividad !== operacion.efectividad_reparto_pct ||
    wiMargen !== operacion.margen_contribucion_pct ||
    wiPedidos !== operacion.pedidos_programados_diarios ||
    wiPedidosBaja !== operacion.pedidos_programados_baja ||
    wiDias !== operacion.dias_laborales ||
    wiZonas !== operacion.zonas_visitadas ||
    wiIva !== operacion.tasa_iva_pct;

  // Break-even data
  const breakEvenData = useMemo(() => generateBreakEvenData(results, operacion), [results, operacion]);

  // Cost distribution
  const costDistribution = useMemo(() => getCostDistributionFromExpenses(expenseItems), [expenseItems]);
  const totalCost = costDistribution.reduce((s, c) => s + c.value, 0);

  // Sensitivity data
  const [sensitivityMetric, setSensitivityMetric] = useState<"drop_size" | "punto_equilibrio">("drop_size");
  const sensitivityData = useMemo(() => {
    const range = [-30, -20, -10, 0, 10, 20, 30];
    if (sensitivityMetric === "drop_size") {
      const veh  = calculateSensitivityFromExpenses(dynamicInputs, "vehiculo", range);
      const marg = calculateSensitivityFromExpenses(dynamicInputs, "margen", range);
      const iva  = calculateSensitivityFromExpenses(dynamicInputs, "iva", range);
      const dias = calculateSensitivityFromExpenses(dynamicInputs, "dias", range);
      return range.map((pct, i) => ({
        variacion: `${pct > 0 ? "+" : ""}${pct}%`,
        linea1: veh[i].drop_size,
        linea2: marg[i].drop_size,
        linea3: iva[i].drop_size,
        linea4: dias[i].drop_size,
      }));
    } else {
      const veh   = calculateSensitivityFromExpenses(dynamicInputs, "vehiculo", range);
      const marg  = calculateSensitivityFromExpenses(dynamicInputs, "margen", range);
      const iva   = calculateSensitivityFromExpenses(dynamicInputs, "iva", range);
      const zonas = calculateSensitivityFromExpenses(dynamicInputs, "zonas", range);
      return range.map((pct, i) => ({
        variacion: `${pct > 0 ? "+" : ""}${pct}%`,
        linea1: veh[i].punto_equilibrio,
        linea2: marg[i].punto_equilibrio,
        linea3: iva[i].punto_equilibrio,
        linea4: zonas[i].punto_equilibrio,
      }));
    }
  }, [dynamicInputs, sensitivityMetric]);

  const sensLabels = sensitivityMetric === "drop_size"
    ? { l1: "Gastos Totales", l2: "Margen Contribución", l3: "Tasa IVA", l4: "Días Laborales" }
    : { l1: "Gastos Totales", l2: "Margen Contribución", l3: "Tasa IVA", l4: "Zonas Visitadas" };

  const currSymbol = selectedLogisticsModel?.base_currency === "BOB" ? "Bs." : "$";

  // All unique categories from existing data
  const allCategories = useMemo(() => {
    const cats = new Set<string>();
    expenses.forEach((e) => { if (e.category) cats.add(e.category); });
    centers.forEach((c) => { if (c.category) cats.add(c.category); });
    return Array.from(cats);
  }, [expenses, centers]);

  // Auto-generate codes
  const nextExpenseCode = useMemo(() => {
    const nums = expenses.map((e) => {
      const m = e.code.match(/G-(\d+)/);
      return m ? parseInt(m[1]) : 0;
    });
    const next = Math.max(0, ...nums) + 1;
    return `G-${String(next).padStart(4, "0")}`;
  }, [expenses]);

  const nextCenterCode = useMemo(() => {
    const nums = centers.map((c) => {
      const m = c.code.match(/GC-(\d+)/);
      return m ? parseInt(m[1]) : 0;
    });
    const next = Math.max(0, ...nums) + 1;
    return `GC-${String(next).padStart(4, "0")}`;
  }, [centers]);

  // Category totals for summary bar
  // Handlers
  const handleSaveExpense = async (data: { code: string; name: string; amount: number; category: string; center_id: string | null }) => {
    try {
      if (editingExpense) {
        await updateExpense.mutateAsync({ id: editingExpense.id, ...data });
        toast({ title: "Gasto actualizado" });
      } else {
        await createExpense.mutateAsync(data as any);
        toast({ title: "Gasto creado" });
      }
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
    setEditingExpense(null);
  };

  const handleSaveCenter = async (data: { code: string; name: string; category: null; note: string | null; parent_id: string | null }) => {
    try {
      if (editingCenter) {
        await updateCenter.mutateAsync({ id: editingCenter.id, ...data });
        toast({ title: "Centro actualizado" });
      } else {
        await createCenter.mutateAsync(data as any);
        toast({ title: "Centro creado" });
      }
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
    setEditingCenter(null);
  };

  const handleDeleteExpense = async (id: string) => {
    try {
      await removeExpense.mutateAsync(id);
      toast({ title: "Gasto eliminado" });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  const handleDeleteCenter = async (id: string) => {
    try {
      await removeCenter.mutateAsync(id);
      toast({ title: "Centro eliminado" });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  const handleMoveExpense = async (expenseId: string, centerId: string | null) => {
    try {
      await updateExpense.mutateAsync({ id: expenseId, center_id: centerId } as any);
    } catch (err: any) {
      toast({ title: "Error al mover", description: err.message, variant: "destructive" });
    }
  };

  // Debounced save for operation drivers
  const driverSaveTimeoutRef = useRef<ReturnType<typeof setTimeout>>();
  const updateOperacion = (key: keyof OperationDrivers, val: number) => {
    const updated = { ...operacion, [key]: val };
    setOperacion(updated);
    clearTimeout(driverSaveTimeoutRef.current);
    driverSaveTimeoutRef.current = setTimeout(() => {
      upsertDrivers.mutate(updated);
    }, 800);
  };

  const resetWhatIf = () => {
    setWiEfectividad(operacion.efectividad_reparto_pct);
    setWiMargen(operacion.margen_contribucion_pct);
    setWiPedidos(operacion.pedidos_programados_diarios);
    setWiPedidosBaja(operacion.pedidos_programados_baja);
    setWiDias(operacion.dias_laborales);
    setWiZonas(operacion.zonas_visitadas);
    setWiIva(operacion.tasa_iva_pct);
  };

  return (
    <AppLayout>
      {/* ── Header + Hero KPI en la misma fila ─────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Eficiencia Logística</h1>
          <p className="text-muted-foreground text-sm mt-1">Punto de Equilibrio y Drop Size Mínimo por ruta</p>
        </div>

        <Card className="flex-[0.9] bg-gradient-to-r from-primary/10 via-primary/5 to-transparent border-primary/20">
          <CardContent className="p-3">
            <div className="flex items-center justify-between gap-4">
              <div className="text-left">
                <p className="text-[10px] text-muted-foreground mb-0.5">P.E. Mensual</p>
                <p className="text-sm font-bold text-primary">{fmtCurrency(results.punto_equilibrio_mensual, currSymbol)}</p>
              </div>
              <div className="text-center">
                <p className="text-[10px] text-muted-foreground">Gasto total diario</p>
                <p className="text-sm font-bold">{fmtCurrency(results.gasto_diario, currSymbol)}</p>
              </div>
              <div className="text-left">
                <p className="text-[10px] text-muted-foreground mb-0.5">Drop Size Mínimo (IVA incl.)</p>
                <p className="text-sm font-bold text-amber-500">{fmtCurrency(results.drop_size_minimo, currSymbol)}</p>
                <p className="text-[11px] text-muted-foreground/70">{fmtCurrency(resultsBaja.drop_size_minimo, currSymbol)} <span className="italic">baja</span></p>
              </div>
              <div className="text-center">
                <p className="text-[10px] text-muted-foreground">Gasto total por PDV</p>
                <p className="text-sm font-bold">{fmtCurrency(results.gasto_por_pdv, currSymbol)}</p>
                <p className="text-[11px] text-muted-foreground/70">{fmtCurrency(resultsBaja.gasto_por_pdv, currSymbol)} <span className="italic">baja</span></p>
              </div>
              <div className="text-center">
                <p className="text-[10px] text-muted-foreground">Pedidos Efect./Día</p>
                <p className="text-sm font-bold">{fmtNumber(results.pedidos_efectivos_diarios, 0)}</p>
                <p className="text-[11px] text-muted-foreground/70">{fmtNumber(resultsBaja.pedidos_efectivos_diarios, 0)} <span className="italic">baja</span></p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-6">
        {/* ── Section: Inputs ─────────────────────────────────────────────── */}
        {section === "inputs" && <div className="space-y-6">
          {/* Drivers de operación */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Settings2 className="h-4 w-4 text-emerald-500" />
                Variables de Operación (Drivers de Eficiencia)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-7 gap-4">
                <NumericInput label="Tasa IVA" value={operacion.tasa_iva_pct} onChange={(v) => updateOperacion("tasa_iva_pct", v)} suffix="%" />
                <NumericInput label="Margen Contribución" value={operacion.margen_contribucion_pct} onChange={(v) => updateOperacion("margen_contribucion_pct", v)} suffix="%" />
                <NumericInput label="Días Laborales / Mes" value={operacion.dias_laborales} onChange={(v) => updateOperacion("dias_laborales", v)} suffix="días" />
                <NumericInput label="Zonas Visitadas" value={operacion.zonas_visitadas} onChange={(v) => updateOperacion("zonas_visitadas", v)} suffix="zon." />
                <NumericInput label="Efectividad Reparto" value={operacion.efectividad_reparto_pct} onChange={(v) => updateOperacion("efectividad_reparto_pct", v)} suffix="%" />
                <NumericInput label="Pedidos / Día (Alta)" value={operacion.pedidos_programados_diarios} onChange={(v) => updateOperacion("pedidos_programados_diarios", v)} suffix="ped." />
                <NumericInput label="Pedidos / Día (Baja)" value={operacion.pedidos_programados_baja} onChange={(v) => updateOperacion("pedidos_programados_baja", v)} suffix="ped." />
              </div>
            </CardContent>
          </Card>

          {/* Expense tree */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <DollarSign className="h-4 w-4 text-emerald-500" />
                  Gastos Logísticos
                  <Badge variant="secondary" className="text-xs">
                    {expenses.length} gasto{expenses.length !== 1 ? "s" : ""} / {centers.length} centro{centers.length !== 1 ? "s" : ""}
                  </Badge>
                  <Badge variant="outline" className="text-xs font-bold">
                    Total: {fmtCurrency(results.gasto_total_mensual, currSymbol)}
                  </Badge>
                </span>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => { setEditingCenter(null); setCenterDialogOpen(true); }}>
                    <Folder className="h-3.5 w-3.5 mr-1.5" />
                    Nuevo Centro
                  </Button>
                  <Button size="sm" onClick={() => { setEditingExpense(null); setExpenseDialogOpen(true); }}>
                    <Plus className="h-3.5 w-3.5 mr-1.5" />
                    Nuevo Gasto
                  </Button>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <ExpenseTreeView
                expenses={expenses}
                centers={centers}
                currSymbol={currSymbol}
                onEditExpense={(item) => { setEditingExpense(item); setExpenseDialogOpen(true); }}
                onDeleteExpense={handleDeleteExpense}
                onEditCenter={(center) => { setEditingCenter(center); setCenterDialogOpen(true); }}
                onDeleteCenter={handleDeleteCenter}
                onMoveExpense={handleMoveExpense}
              />
            </CardContent>
          </Card>
        </div>}

        {/* ── Section: Results ────────────────────────────────────────────── */}
        {section === "results" && <div className="space-y-6">
          {/* Calculation detail table */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Detalle del Cálculo en Cascada</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">Paso</TableHead>
                    <TableHead className="text-xs">Métrica</TableHead>
                    <TableHead className="text-xs">Fórmula</TableHead>
                    <TableHead className="text-xs text-right">Resultado</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow>
                    <TableCell className="text-xs font-mono">1</TableCell>
                    <TableCell className="text-xs font-medium">Gasto Total Mensual</TableCell>
                    <TableCell className="text-xs text-muted-foreground">Suma de todos los gastos logísticos</TableCell>
                    <TableCell className="text-xs text-right font-bold">{fmtCurrency(results.gasto_total_mensual, currSymbol)}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="text-xs font-mono">2</TableCell>
                    <TableCell className="text-xs font-medium">Gasto Diario</TableCell>
                    <TableCell className="text-xs text-muted-foreground">Gasto Total / Días Lab. / Zonas</TableCell>
                    <TableCell className="text-xs text-right font-bold">{fmtCurrency(results.gasto_diario, currSymbol)}</TableCell>
                  </TableRow>
                  <TableRow className="bg-primary/5">
                    <TableCell className="text-xs font-mono">2</TableCell>
                    <TableCell className="text-xs font-medium">P.E. Mensual</TableCell>
                    <TableCell className="text-xs text-muted-foreground">Gasto Total / Margen % / (1 - IVA%)</TableCell>
                    <TableCell className="text-xs text-right font-bold text-primary">{fmtCurrency(results.punto_equilibrio_mensual, currSymbol)}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="text-xs font-mono">3</TableCell>
                    <TableCell className="text-xs font-medium">Pedidos Efectivos/Día</TableCell>
                    <TableCell className="text-xs text-muted-foreground">Pedidos Programados x Efectividad % x Zonas</TableCell>
                    <TableCell className="text-xs text-right font-bold">{fmtNumber(results.pedidos_efectivos_diarios, 1)}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="text-xs font-mono">3</TableCell>
                    <TableCell className="text-xs font-medium">Gasto por PDV</TableCell>
                    <TableCell className="text-xs text-muted-foreground">Gasto Diario / Pedidos Efectivos</TableCell>
                    <TableCell className="text-xs text-right font-bold">{fmtCurrency(results.gasto_por_pdv, currSymbol)}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="text-xs font-mono">4</TableCell>
                    <TableCell className="text-xs font-medium">Drop Size sin IVA</TableCell>
                    <TableCell className="text-xs text-muted-foreground">Gasto por PDV / Margen %</TableCell>
                    <TableCell className="text-xs text-right font-bold">{fmtCurrency(results.drop_size_sin_iva, currSymbol)}</TableCell>
                  </TableRow>
                  <TableRow className="bg-primary/5">
                    <TableCell className="text-xs font-mono">4</TableCell>
                    <TableCell className="text-xs font-bold">Drop Size Mínimo (c/IVA)</TableCell>
                    <TableCell className="text-xs text-muted-foreground">Drop Size sin IVA x (1 + IVA %)</TableCell>
                    <TableCell className="text-xs text-right font-bold text-amber-500">{fmtCurrency(results.drop_size_minimo, currSymbol)}</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Break-even chart */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <TrendingUp className="h-4 w-4" />
                  Gráfico de Punto de Equilibrio
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={breakEvenData}>
                    <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                    <XAxis dataKey="ventas" tick={{ fontSize: 10 }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                    <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                    <Tooltip
                      formatter={(value: number, name: string) => [fmtCurrency(value, currSymbol), name]}
                      labelFormatter={() => ""}
                    />
                    <Legend />
                    <Line type="monotone" dataKey="ingresos" stroke="#10b981" strokeWidth={2} name="Ingresos" dot={false} />
                    <Line type="monotone" dataKey="costos_totales" stroke="#ef4444" strokeWidth={2} name="Costos Totales" dot={false} />
                    <Line type="monotone" dataKey="costos_fijos" stroke="#f59e0b" strokeWidth={1.5} strokeDasharray="5 5" name="Costos Fijos" dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Cost distribution pie */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <DollarSign className="h-4 w-4" />
                  Distribución de Costos
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={costDistribution}
                      cx="50%"
                      cy="50%"
                      outerRadius={100}
                      dataKey="value"
                      nameKey="name"
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      labelLine={false}
                      fontSize={10}
                    >
                      {costDistribution.map((entry, i) => (
                        <Cell key={i} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value: number, name: string) => [
                        `${fmtCurrency(value, currSymbol)} (${totalCost > 0 ? ((value / totalCost) * 100).toFixed(1) : 0}%)`,
                        name,
                      ]}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </div>}

        {/* ── Section: What-If ────────────────────────────────────────────── */}
        {section === "whatif" && <div className="space-y-6">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-amber-500" />
                  Simulación de Escenarios (What-If)
                </span>
                <Button variant="ghost" size="sm" onClick={resetWhatIf}>
                  <RefreshCcw className="h-3.5 w-3.5 mr-1.5" />
                  Resetear
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Columna 1 */}
                <div className="space-y-6">
                  {/* Tasa IVA */}
                  <div className="space-y-3">
                    <Label className="text-xs flex justify-between">
                      <span>Tasa IVA</span>
                      <Badge variant="outline" className="text-xs">{wiIva}%</Badge>
                    </Label>
                    <WiSlider value={wiIva} onChange={setWiIva} base={operacion.tasa_iva_pct} min={0} max={25} step={1} />
                  </div>

                  {/* Margen */}
                  <div className="space-y-3">
                    <Label className="text-xs flex justify-between">
                      <span>Margen de Contribución</span>
                      <Badge variant="outline" className="text-xs">{wiMargen}%</Badge>
                    </Label>
                    <WiSlider value={wiMargen} onChange={setWiMargen} base={operacion.margen_contribucion_pct} min={5} max={50} step={1} />
                  </div>

                  {/* Días Laborales */}
                  <div className="space-y-3">
                    <Label className="text-xs flex justify-between">
                      <span>Días Laborales / Mes</span>
                      <Badge variant="outline" className="text-xs">{wiDias} días</Badge>
                    </Label>
                    <WiSlider value={wiDias} onChange={setWiDias} base={operacion.dias_laborales} min={15} max={31} step={1} />
                  </div>

                  {/* Zonas Visitadas */}
                  <div className="space-y-3">
                    <Label className="text-xs flex justify-between">
                      <span>Zonas Visitadas</span>
                      <Badge variant="outline" className="text-xs">{wiZonas} zon.</Badge>
                    </Label>
                    <WiSlider value={wiZonas} onChange={setWiZonas} base={operacion.zonas_visitadas} min={1} max={10} step={1} />
                  </div>
                </div>

                {/* Columna 2 */}
                <div className="space-y-6">
                  {/* Efectividad */}
                  <div className="space-y-3">
                    <Label className="text-xs flex justify-between">
                      <span>Efectividad de Reparto</span>
                      <Badge variant="outline" className="text-xs">{wiEfectividad}%</Badge>
                    </Label>
                    <WiSlider value={wiEfectividad} onChange={setWiEfectividad} base={operacion.efectividad_reparto_pct} min={50} max={100} step={5} />
                  </div>

                  {/* Pedidos Alta */}
                  <div className="space-y-3">
                    <Label className="text-xs flex justify-between">
                      <span>Pedidos / Día (Alta)</span>
                      <Badge variant="outline" className="text-xs">{wiPedidos}</Badge>
                    </Label>
                    <WiSlider value={wiPedidos} onChange={setWiPedidos} base={operacion.pedidos_programados_diarios} min={5} max={80} step={1} />
                  </div>

                  {/* Pedidos Baja */}
                  <div className="space-y-3">
                    <Label className="text-xs flex justify-between">
                      <span>Pedidos / Día (Baja)</span>
                      <Badge variant="outline" className="text-xs">{wiPedidosBaja}</Badge>
                    </Label>
                    <WiSlider value={wiPedidosBaja} onChange={setWiPedidosBaja} base={operacion.pedidos_programados_baja} min={1} max={80} step={1} />
                  </div>
                </div>
              </div>

              {/* Comparison table */}
              <Card className="border-amber-200 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-950/20">
                  <CardContent className="p-4">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="text-xs">Métrica</TableHead>
                          <TableHead className="text-xs text-right">Base</TableHead>
                          <TableHead className="text-xs text-right">Escenario</TableHead>
                          <TableHead className="text-xs text-right">Impacto</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {[
                          { label: "Drop Size Mínimo", base: results.drop_size_minimo, wi: wiResults.drop_size_minimo },
                          { label: "P.E. Mensual", base: results.punto_equilibrio_mensual, wi: wiResults.punto_equilibrio_mensual },
                          { label: "Gasto Diario", base: results.gasto_diario, wi: wiResults.gasto_diario },
                          { label: "Gasto por PDV", base: results.gasto_por_pdv, wi: wiResults.gasto_por_pdv },
                        ].map((row) => {
                          const delta = row.base > 0 ? ((row.wi - row.base) / row.base) * 100 : 0;
                          return (
                            <TableRow key={row.label}>
                              <TableCell className="text-xs font-medium">{row.label}</TableCell>
                              <TableCell className="text-xs text-right">{fmtCurrency(row.base, currSymbol)}</TableCell>
                              <TableCell className="text-xs text-right font-bold">{fmtCurrency(row.wi, currSymbol)}</TableCell>
                              <TableCell className={`text-xs text-right font-bold ${delta > 0 ? "text-emerald-600" : delta < 0 ? "text-red-600" : ""}`}>
                                {delta > 0 ? "+" : ""}{fmtNumber(delta, 1)}%
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
            </CardContent>
          </Card>
        </div>}

        {/* ── Section: Sensitivity ────────────────────────────────────────── */}
        {section === "sensitivity" && <div className="space-y-6">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <BarChart3 className="h-4 w-4" />
                  Análisis de Sensibilidad — {sensitivityMetric === "drop_size" ? "Drop Size Mínimo" : "Punto de Equilibrio"}
                </span>
                <div className="flex items-center gap-1 rounded-lg border p-1">
                  <Button
                    variant={sensitivityMetric === "drop_size" ? "secondary" : "ghost"}
                    size="sm"
                    className="h-6 text-xs px-2"
                    onClick={() => setSensitivityMetric("drop_size")}
                  >
                    Drop Size
                  </Button>
                  <Button
                    variant={sensitivityMetric === "punto_equilibrio" ? "secondary" : "ghost"}
                    size="sm"
                    className="h-6 text-xs px-2"
                    onClick={() => setSensitivityMetric("punto_equilibrio")}
                  >
                    P.E. Mensual
                  </Button>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={350}>
                <LineChart data={sensitivityData}>
                  <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                  <XAxis dataKey="variacion" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => fmtNumber(v, 0)} />
                  <Tooltip
                    formatter={(value: number, name: string) => [fmtCurrency(value, currSymbol), name]}
                  />
                  <Legend />
                  <Line type="monotone" dataKey="linea1" stroke="#ef4444" strokeWidth={2} name={sensLabels.l1} dot={{ r: 3 }} />
                  <Line type="monotone" dataKey="linea2" stroke="#3b82f6" strokeWidth={2} name={sensLabels.l2} dot={{ r: 3 }} />
                  <Line type="monotone" dataKey="linea3" stroke="#10b981" strokeWidth={2} name={sensLabels.l3} dot={{ r: 3 }} />
                  <Line type="monotone" dataKey="linea4" stroke="#f59e0b" strokeWidth={2} name={sensLabels.l4} dot={{ r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Tabla de Sensibilidad</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">Variación</TableHead>
                    <TableHead className="text-xs text-right">{sensLabels.l1}</TableHead>
                    <TableHead className="text-xs text-right">{sensLabels.l2}</TableHead>
                    <TableHead className="text-xs text-right">{sensLabels.l3}</TableHead>
                    <TableHead className="text-xs text-right">{sensLabels.l4}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sensitivityData.map((row) => (
                    <TableRow key={row.variacion} className={row.variacion === "0%" ? "bg-primary/5 font-bold" : ""}>
                      <TableCell className="text-xs font-mono">{row.variacion}</TableCell>
                      <TableCell className="text-xs text-right">{fmtCurrency(row.linea1, currSymbol)}</TableCell>
                      <TableCell className="text-xs text-right">{fmtCurrency(row.linea2, currSymbol)}</TableCell>
                      <TableCell className="text-xs text-right">{fmtCurrency(row.linea3, currSymbol)}</TableCell>
                      <TableCell className="text-xs text-right">{fmtCurrency(row.linea4, currSymbol)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>}
      </div>

      {/* ── Dialogs ──────────────────────────────────────────────────────── */}
      <ExpenseDialog
        open={expenseDialogOpen}
        onOpenChange={setExpenseDialogOpen}
        onSave={handleSaveExpense}
        editItem={editingExpense}
        centers={centers}
        nextCode={nextExpenseCode}
        allCategories={allCategories}
      />
      <CenterDialog
        open={centerDialogOpen}
        onOpenChange={setCenterDialogOpen}
        onSave={handleSaveCenter}
        editItem={editingCenter}
        centers={centers}
        nextCode={nextCenterCode}
        allCategories={allCategories}
      />
    </AppLayout>
  );
}
