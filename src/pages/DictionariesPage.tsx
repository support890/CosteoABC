import React, { useState, useRef, useCallback, useEffect } from "react";
import * as XLSX from "xlsx";
import { AppLayout } from "@/components/AppLayout";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogDescription,
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
import { Textarea } from "@/components/ui/textarea";
import {
  Plus,
  Upload,
  Download,
  Trash2,
  Edit2,
  Loader2,
  FileSpreadsheet,
  AlertTriangle,
  CheckCircle2,
  ChevronRight,
  ChevronDown,
  FolderOpen,
  Folder,
  Building2,
} from "lucide-react";
import {
  useResources,
  useActivities,
  useCostObjects,
  useCostCenters,
  useActivityCenters,
  useCostObjectCenters,
} from "@/hooks/use-supabase-data";
import type {
  CostCenter,
  ActivityCenter,
  CostObjectCenter,
  Model,
  Period,
  Resource,
  Activity,
  CostObject,
} from "@/hooks/use-supabase-data";
import { useAllocation } from "@/hooks/use-allocation";
import { useToast } from "@/hooks/use-toast";
import { useModelContext } from "@/contexts/ModelContext";
import { getCurrencySymbol } from "@/hooks/use-currency";

/* ───── Column specs per dictionary type ───── */
const COLUMN_SPECS: Record<
  string,
  { required: string[]; optional: string[]; validTypes?: string[] }
> = {
  resources: {
    required: ["codigo", "nombre", "monto"],
    optional: ["categoria", "tipo"],
    validTypes: ["directo", "indirecto", "direct", "indirect"],
  },
  activities: {
    required: ["codigo", "nombre", "monto"],
    optional: ["tipo"],
    validTypes: [
      "operative",
      "production",
      "support",
      "operativa",
      "producción",
      "produccion",
      "apoyo",
    ],
  },
  objects: {
    required: ["codigo", "nombre", "monto"],
    optional: ["tipo", "ventas"],
    validTypes: [
      "product",
      "service",
      "client",
      "channel",
      "project",
      "distribution_channel",
      "sales_channel",
      "branch",
      "agency",
      "producto",
      "servicio",
      "cliente",
      "canal",
      "proyecto",
      "canal de distribucion",
      "canal de distribución",
      "canal de venta",
      "sucursal",
      "agencia",
    ],
  },
};

/* ───── Normalize Spanish type values to English DB values ───── */
const typeNormalize: Record<string, string> = {
  directo: "directo",
  direct: "directo",
  indirecto: "indirecto",
  indirect: "indirecto",
  operativa: "operative",
  operative: "operative",
  producción: "production",
  produccion: "production",
  production: "production",
  apoyo: "support",
  support: "support",
  producto: "product",
  product: "product",
  servicio: "service",
  service: "service",
  cliente: "client",
  client: "client",
  canal: "channel",
  channel: "channel",
  proyecto: "project",
  project: "project",
  "canal de distribucion": "distribution_channel",
  "canal de distribución": "distribution_channel",
  distribution_channel: "distribution_channel",
  "canal de venta": "sales_channel",
  sales_channel: "sales_channel",
  sucursal: "branch",
  branch: "branch",
  agencia: "agency",
  agency: "agency",
};

/* ───── Column header normalization ───── */
function normalizeHeader(h: string): string {
  const s = h
    .toLowerCase()
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/g, "");
  const map: Record<string, string> = {
    codigo: "codigo",
    code: "codigo",
    cod: "codigo",
    nombre: "nombre",
    name: "nombre",
    descripcion: "nombre",
    monto: "monto",
    amount: "monto",
    valor: "monto",
    importe: "monto",
    costo: "monto",
    cost: "monto",
    categoria: "categoria",
    category: "categoria",
    cat: "categoria",
    tipo: "tipo",
    type: "tipo",
    ventas: "price",
    price: "price",
  };
  return map[s] || s;
}


/* ───── Parsed row type ───── */
interface ParsedRow {
  rowNum: number;
  codigo: string;
  nombre: string;
  monto: number;
  tipo?: string;
  categoria?: string;
  errors: string[];
}

/* ───── Add Item Dialog ───── */
function AddItemDialog({
  type,
  onAdd,
  loading,
  existingCategories = [],
  existingCodes = [],
  existingTypes = [],
  centers = [],
  activityCenters = [],
  costObjectCenters = [],
}: {
  type: "resource" | "activity" | "cost_object";
  onAdd: (item: {
    code: string;
    name: string;
    amount: number;
    category?: string;
    type?: string;
    center_id?: string | null;
    price?: number | null;
  }) => void;
  loading: boolean;
  existingCategories?: string[];
  existingCodes?: string[];
  existingTypes?: string[];
  centers?: CostCenter[];
  activityCenters?: ActivityCenter[];
  costObjectCenters?: CostObjectCenter[];
}) {
  const { selectedModel } = useModelContext();
  const currencySymbol = getCurrencySymbol(selectedModel?.base_currency);
  const [open, setOpen] = useState(false);
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("");
  const [isNewCategory, setIsNewCategory] = useState(false);
  const [subtype, setSubtype] = useState(
    type === "resource"
      ? "indirecto"
      : type === "activity"
        ? "operative"
        : "product",
  );
  const [isNewType, setIsNewType] = useState(false);
  const [centerId, setCenterId] = useState("");
  const [price, setPrice] = useState("");

  const labels: Record<string, string> = {
    resource: "Recurso",
    activity: "Actividad",
    cost_object: "Objeto de Costo",
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const item: Record<string, unknown> = {
      code,
      name,
      amount: parseFloat(amount) || 0,
    };
    if (category) item.category = category;
    if (subtype) item.type = subtype;
    if (
      (type === "resource" || type === "activity" || type === "cost_object") &&
      centerId &&
      centerId !== "none"
    )
      item.center_id = centerId;
    if (type === "cost_object") item.price = parseFloat(price) || 0;
    onAdd(
      item as any
    );
    setCode("");
    setName("");
    setAmount("");
    setCategory("");
    setCenterId("");
    setPrice("");
    setIsNewCategory(false);
    setOpen(false);
  };

  const getNextCode = () => {
    const prefix =
      type === "resource" ? "R-" : type === "activity" ? "A-" : "OC-";
    let maxNum = 0;
    for (const c of existingCodes) {
      if (c.startsWith(prefix)) {
        const numPart = parseInt(c.slice(prefix.length), 10);
        if (!isNaN(numPart) && numPart > maxNum) {
          maxNum = numPart;
        }
      }
    }
    return `${prefix}${String(maxNum + 1).padStart(4, "0")}`;
  };

  const handleOpenChange = (isOpen: boolean) => {
    setOpen(isOpen);
    if (isOpen) {
      setCode(getNextCode());
    } else {
      setCode("");
      setName("");
      setAmount("");
      setCategory("");
      setPrice("");
      setIsNewCategory(false);
      setSubtype(
        type === "resource"
          ? "indirecto"
          : type === "activity"
            ? "operative"
            : "product",
      );
      setIsNewType(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus className="h-4 w-4 mr-2" />
          {type === "activity" ? "Nueva Actividad" : `Nuevo ${labels[type]}`}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {type === "activity" ? "Nueva Actividad" : `Nuevo ${labels[type]}`}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Código</Label>
              <Input
                placeholder="R-001"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label>
                {type === "resource"
                  ? `Monto (${currencySymbol})`
                  : `Costo Directo (${currencySymbol})`}
              </Label>
              <Input
                type="number"
                step="0.01"
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
              {type !== "resource" && (
                <p className="text-xs text-muted-foreground mt-1 leading-tight">
                  Este es un costo extra que se sumará al costo recibido.
                </p>
              )}
            </div>
          </div>
          <div className="space-y-2">
            <Label>Nombre</Label>
            <Input
              placeholder="Nombre del item"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>
          {type === "cost_object" && (
            <div className="space-y-2">
              <Label>Ventas ({currencySymbol})</Label>
              <Input
                type="number"
                step="0.01"
                placeholder="0.00"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
              />
              <p className="text-xs text-muted-foreground mt-1 leading-tight">
                Las ventas totales para este objeto de costo (usado para calcular rentabilidad).
              </p>
            </div>
          )}
          <div className="space-y-2">
            <Label>Categoría</Label>
            {!isNewCategory && existingCategories.length > 0 ? (
              <Select
                value={category}
                onValueChange={(val) => {
                  if (val === "new") {
                    setIsNewCategory(true);
                    setCategory("");
                  } else {
                    setCategory(val);
                  }
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccione una categoría (Opcional)" />
                </SelectTrigger>
                <SelectContent>
                  {existingCategories.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                  <div className="h-px bg-border my-1" />
                  <SelectItem value="new" className="font-medium text-primary">
                    + Agregar nueva categoría
                  </SelectItem>
                </SelectContent>
              </Select>
            ) : (
              <div className="flex gap-2">
                <Input
                  placeholder="Ej: labor, insumos (Opcional)"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="flex-1"
                />
                {existingCategories.length > 0 && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setIsNewCategory(false);
                      setCategory("");
                    }}
                  >
                    Cancelar
                  </Button>
                )}
              </div>
            )}
          </div>
          <div className="space-y-2">
            <Label>Tipo</Label>
            {type === "resource" ? (
              <Select value={subtype} onValueChange={setSubtype}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccione un tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="directo">Directo</SelectItem>
                  <SelectItem value="indirecto">Indirecto</SelectItem>
                </SelectContent>
              </Select>
            ) : !isNewType && existingTypes && existingTypes.length > 0 ? (
              <Select
                value={subtype}
                onValueChange={(val) => {
                  if (val === "new") {
                    setIsNewType(true);
                    setSubtype("");
                  } else {
                    setSubtype(val);
                  }
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccione un tipo" />
                </SelectTrigger>
                <SelectContent>
                  {existingTypes.map((t) => (
                    <SelectItem key={t} value={t}>
                      {subtypeLabels[t] || t}
                    </SelectItem>
                  ))}
                  <div className="h-px bg-border my-1" />
                  <SelectItem value="new" className="font-medium text-primary">
                    + Agregar nuevo tipo
                  </SelectItem>
                </SelectContent>
              </Select>
            ) : (
              <div className="flex gap-2">
                <Input
                  placeholder="Ej: nuevo tipo"
                  value={subtype}
                  onChange={(e) => setSubtype(e.target.value)}
                  className="flex-1"
                />
                {existingTypes && existingTypes.length > 0 && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setIsNewType(false);
                      setSubtype(type === "activity" ? "operative" : "product");
                    }}
                  >
                    Cancelar
                  </Button>
                )}
              </div>
            )}
            {type === "resource" && subtype === "directo" && (
              <p className="text-xs text-muted-foreground mt-1 leading-tight">
                Se asigna directamente a un objeto de costo.
              </p>
            )}
            {type === "resource" && subtype === "indirecto" && (
              <p className="text-xs text-muted-foreground mt-1 leading-tight">
                Se asigna a una actividad o a otro recurso.
              </p>
            )}
            {type === "activity" && subtype === "operative" && (
              <p className="text-xs text-muted-foreground mt-1 leading-tight">
                Desarrolladas en un sector. Consumen recursos para poder
                llevarse a cabo.
              </p>
            )}
            {type === "activity" && subtype === "production" && (
              <p className="text-xs text-muted-foreground mt-1 leading-tight">
                Se realizan en planta o en fábrica.
              </p>
            )}
            {type === "activity" && subtype === "support" && (
              <p className="text-xs text-muted-foreground mt-1 leading-tight">
                No se consumen directamente por productos o clientes, sirven de
                soporte a otras actividades internas finales.
              </p>
            )}
          </div>
          {type === "resource" && centers.length > 0 && (
            <div className="space-y-2">
              <Label>Centro / Subcentro (opcional)</Label>
              <Select value={centerId} onValueChange={setCenterId}>
                <SelectTrigger>
                  <SelectValue placeholder="Sin centro asignado" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Sin centro asignado</SelectItem>
                  {centers.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.code} — {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          {type === "activity" && activityCenters.length > 0 && (
            <div className="space-y-2">
              <Label>Centro de Actividades / Subcentro (opcional)</Label>
              <Select value={centerId} onValueChange={setCenterId}>
                <SelectTrigger>
                  <SelectValue placeholder="Sin centro asignado" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Sin centro asignado</SelectItem>
                  {activityCenters.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.code} — {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          {type === "cost_object" && costObjectCenters.length > 0 && (
            <div className="space-y-2">
              <Label>Centro de Objetos de Costo / Subcentro (opcional)</Label>
              <Select value={centerId} onValueChange={setCenterId}>
                <SelectTrigger>
                  <SelectValue placeholder="Sin centro asignado" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Sin centro asignado</SelectItem>
                  {costObjectCenters.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.code} — {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            Crear
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/* ───── Edit Item Dialog ───── */
function EditItemDialog({
  item,
  type,
  onSave,
  loading,
  existingCategories = [],
  existingTypes = [],
  centers = [],
  activityCenters = [],
  costObjectCenters = [],
  open,
  onOpenChange,
}: {
  item: Resource | Activity | CostObject | null;
  type: "resource" | "activity" | "cost_object";
  onSave: (
    id: string,
    item: {
      code: string;
      name: string;
      amount: number;
      category?: string;
      type?: string;
      center_id?: string | null;
      price?: number | null;
    },
  ) => void;
  loading: boolean;
  existingCategories?: string[];
  existingTypes?: string[];
  centers?: CostCenter[];
  activityCenters?: ActivityCenter[];
  costObjectCenters?: CostObjectCenter[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { selectedModel } = useModelContext();
  const currencySymbol = getCurrencySymbol(selectedModel?.base_currency);
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("");
  const [isNewCategory, setIsNewCategory] = useState(false);
  const [subtype, setSubtype] = useState(
    type === "resource"
      ? "indirecto"
      : type === "activity"
        ? "operative"
        : "product",
  );
  const [isNewType, setIsNewType] = useState(false);
  const [centerId, setCenterId] = useState("");
  const [price, setPrice] = useState("");

  useEffect(() => {
    if (item && open) {
      setCode(item.code || "");
      setName(item.name || "");
      setAmount(String(item.amount ?? ""));
      setCategory(item.category || "");
      setSubtype(
        item.type ||
          (type === "resource"
            ? "indirecto"
            : type === "activity"
              ? "operative"
              : "product"),
      );
      setCenterId(item.center_id || "");
      setPrice(String((item as any)?.price ?? ""));
      setIsNewCategory(false);
      setIsNewType(false);
    }
  }, [item, open, type]);

  const labels: Record<string, string> = {
    resource: "Recurso",
    activity: "Actividad",
    cost_object: "Objeto de Costo",
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const payload: Record<string, unknown> = {
      code,
      name,
      amount: parseFloat(amount) || 0,
    };
    if (category) payload.category = category;
    if (subtype) payload.type = subtype;
    if (type === "resource" || type === "activity" || type === "cost_object")
      payload.center_id = centerId && centerId !== "none" ? centerId : null;
    if (type === "cost_object") payload.price = parseFloat(price) || 0;
    onSave(item!.id, payload as any);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Editar {labels[type]}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Código</Label>
              <Input
                placeholder="R-001"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label>
                {type === "resource"
                  ? `Monto (${currencySymbol})`
                  : `Costo Directo (${currencySymbol})`}
              </Label>
              <Input
                type="number"
                step="0.01"
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
              {type !== "resource" && (
                <p className="text-xs text-muted-foreground mt-1 leading-tight">
                  Este es un costo extra que se sumará al costo recibido.
                </p>
              )}
            </div>
          </div>
          <div className="space-y-2">
            <Label>Nombre</Label>
            <Input
              placeholder="Nombre del item"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>
          {type === "cost_object" && (
            <div className="space-y-2">
              <Label>Ventas ({currencySymbol})</Label>
              <Input
                type="number"
                step="0.01"
                placeholder="0.00"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
              />
              <p className="text-xs text-muted-foreground mt-1 leading-tight">
                Las ventas totales para este objeto de costo (usado para calcular rentabilidad).
              </p>
            </div>
          )}
          <div className="space-y-2">
            <Label>Categoría</Label>
            {!isNewCategory && existingCategories.length > 0 ? (
              <Select
                value={category}
                onValueChange={(val) => {
                  if (val === "new") {
                    setIsNewCategory(true);
                    setCategory("");
                  } else {
                    setCategory(val);
                  }
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccione una categoría (Opcional)" />
                </SelectTrigger>
                <SelectContent>
                  {existingCategories.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                  <div className="h-px bg-border my-1" />
                  <SelectItem value="new" className="font-medium text-primary">
                    + Agregar nueva categoría
                  </SelectItem>
                </SelectContent>
              </Select>
            ) : (
              <div className="flex gap-2">
                <Input
                  placeholder="Ej: labor, insumos (Opcional)"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="flex-1"
                />
                {existingCategories.length > 0 && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setIsNewCategory(false);
                      setCategory("");
                    }}
                  >
                    Cancelar
                  </Button>
                )}
              </div>
            )}
          </div>
          <div className="space-y-2">
            <Label>Tipo</Label>
            {type === "resource" ? (
              <Select value={subtype} onValueChange={setSubtype}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccione un tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="directo">Directo</SelectItem>
                  <SelectItem value="indirecto">Indirecto</SelectItem>
                </SelectContent>
              </Select>
            ) : !isNewType && existingTypes && existingTypes.length > 0 ? (
              <Select
                value={subtype}
                onValueChange={(val) => {
                  if (val === "new") {
                    setIsNewType(true);
                    setSubtype("");
                  } else {
                    setSubtype(val);
                  }
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccione un tipo" />
                </SelectTrigger>
                <SelectContent>
                  {existingTypes.map((t) => (
                    <SelectItem key={t} value={t}>
                      {subtypeLabels[t] || t}
                    </SelectItem>
                  ))}
                  <div className="h-px bg-border my-1" />
                  <SelectItem value="new" className="font-medium text-primary">
                    + Agregar nuevo tipo
                  </SelectItem>
                </SelectContent>
              </Select>
            ) : (
              <div className="flex gap-2">
                <Input
                  placeholder="Ej: nuevo tipo"
                  value={subtype}
                  onChange={(e) => setSubtype(e.target.value)}
                  className="flex-1"
                />
                {existingTypes && existingTypes.length > 0 && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setIsNewType(false);
                      setSubtype(type === "activity" ? "operative" : "product");
                    }}
                  >
                    Cancelar
                  </Button>
                )}
              </div>
            )}
            {type === "resource" && subtype === "directo" && (
              <p className="text-xs text-muted-foreground mt-1 leading-tight">
                Se asigna directamente a un objeto de costo.
              </p>
            )}
            {type === "resource" && subtype === "indirecto" && (
              <p className="text-xs text-muted-foreground mt-1 leading-tight">
                Se asigna a una actividad o a otro recurso.
              </p>
            )}
            {type === "activity" && subtype === "operative" && (
              <p className="text-xs text-muted-foreground mt-1 leading-tight">
                Desarrolladas en un sector. Consumen recursos para poder
                llevarse a cabo.
              </p>
            )}
            {type === "activity" && subtype === "production" && (
              <p className="text-xs text-muted-foreground mt-1 leading-tight">
                Se realizan en planta o en fábrica.
              </p>
            )}
            {type === "activity" && subtype === "support" && (
              <p className="text-xs text-muted-foreground mt-1 leading-tight">
                No se consumen directamente por productos o clientes, sirven de
                soporte a otras actividades internas finales.
              </p>
            )}
          </div>
          {type === "resource" && centers.length > 0 && (
            <div className="space-y-2">
              <Label>Centro / Subcentro (opcional)</Label>
              <Select value={centerId} onValueChange={setCenterId}>
                <SelectTrigger>
                  <SelectValue placeholder="Sin centro asignado" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Sin centro asignado</SelectItem>
                  {centers.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.code} — {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          {type === "activity" && activityCenters.length > 0 && (
            <div className="space-y-2">
              <Label>Centro de Actividades / Subcentro (opcional)</Label>
              <Select value={centerId} onValueChange={setCenterId}>
                <SelectTrigger>
                  <SelectValue placeholder="Sin centro asignado" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Sin centro asignado</SelectItem>
                  {activityCenters.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.code} — {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          {type === "cost_object" && costObjectCenters.length > 0 && (
            <div className="space-y-2">
              <Label>Centro de Objetos de Costo / Subcentro (opcional)</Label>
              <Select value={centerId} onValueChange={setCenterId}>
                <SelectTrigger>
                  <SelectValue placeholder="Sin centro asignado" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Sin centro asignado</SelectItem>
                  {costObjectCenters.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.code} — {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            Guardar Cambios
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/* ───── Excel Import Dialog ───── */
function ExcelImportDialog({
  activeTab,
  onImport,
}: {
  activeTab: string;
  onImport: (rows: ParsedRow[]) => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const [parsedRows, setParsedRows] = useState<ParsedRow[]>([]);
  const [fileName, setFileName] = useState("");
  const [importing, setImporting] = useState(false);
  const [sheetNames, setSheetNames] = useState<string[]>([]);
  const [selectedSheet, setSelectedSheet] = useState("");
  const [workbook, setWorkbook] = useState<XLSX.WorkBook | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const spec = COLUMN_SPECS[activeTab] || COLUMN_SPECS.resources;
  const tabLabel =
    activeTab === "resources"
      ? "Recursos"
      : activeTab === "activities"
        ? "Actividades"
        : "Objetos de Costo";

  const parseSheet = useCallback(
    (wb: XLSX.WorkBook, sheetName: string) => {
      const ws = wb.Sheets[sheetName];
      if (!ws) return;

      const raw = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, {
        defval: "",
      });
      if (raw.length === 0) {
        setParsedRows([]);
        return;
      }

      // Detect column mapping from first row headers
      const headers = Object.keys(raw[0]);
      const colMap: Record<string, string> = {};
      for (const h of headers) {
        const normalized = normalizeHeader(h);
        colMap[h] = normalized;
      }

      const rows: ParsedRow[] = raw.map((row, idx) => {
        const errors: string[] = [];
        const get = (key: string) => {
          const originalCol = headers.find((h) => colMap[h] === key);
          return originalCol ? String(row[originalCol] ?? "").trim() : "";
        };

        const codigo = get("codigo");
        const nombre = get("nombre");
        const montoStr = get("monto");
        const tipo = get("tipo");
        const categoria = get("categoria");

        if (!codigo) errors.push("Código vacío");
        if (!nombre) errors.push("Nombre vacío");

        const monto = parseFloat(montoStr) || 0;
        if (montoStr && isNaN(parseFloat(montoStr)))
          errors.push("Monto no numérico");

        // Validate type for activities/objects
        if (tipo && spec.validTypes) {
          const normalized = typeNormalize[tipo.toLowerCase()];
          if (!normalized) {
            errors.push(`Tipo "${tipo}" no válido`);
          }
        }

        return {
          rowNum: idx + 2, // +2 because row 1 is header, 0-indexed
          codigo,
          nombre,
          monto,
          tipo: tipo ? typeNormalize[tipo.toLowerCase()] || tipo : undefined,
          categoria: categoria || undefined,
          errors,
        };
      });

      setParsedRows(rows);
    },
    [spec],
  );

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (evt) => {
      const data = new Uint8Array(evt.target?.result as ArrayBuffer);
      const wb = XLSX.read(data, { type: "array" });
      setWorkbook(wb);
      setSheetNames(wb.SheetNames);

      // Auto-select first sheet
      const firstSheet = wb.SheetNames[0];
      setSelectedSheet(firstSheet);
      parseSheet(wb, firstSheet);
    };
    reader.readAsArrayBuffer(file);
  };

  const handleSheetChange = (name: string) => {
    setSelectedSheet(name);
    if (workbook) parseSheet(workbook, name);
  };

  const validRows = parsedRows.filter((r) => r.errors.length === 0);
  const errorRows = parsedRows.filter((r) => r.errors.length > 0);

  const handleImport = async () => {
    setImporting(true);
    try {
      await onImport(validRows);
      setOpen(false);
      setParsedRows([]);
      setFileName("");
      setWorkbook(null);
      if (fileRef.current) fileRef.current.value = "";
    } finally {
      setImporting(false);
    }
  };

  const handleOpenChange = (isOpen: boolean) => {
    setOpen(isOpen);
    if (!isOpen) {
      setParsedRows([]);
      setFileName("");
      setWorkbook(null);
      setSheetNames([]);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const handleDownloadTemplate = () => {
    const wb = XLSX.utils.book_new();
    let headers: string[];
    let sampleRow: Record<string, unknown>;

    if (activeTab === "resources") {
      headers = ["codigo", "nombre", "monto", "categoria"];
      sampleRow = {
        codigo: "R-001",
        nombre: "Salarios directos",
        monto: 50000,
        categoria: "labor",
      };
    } else if (activeTab === "activities") {
      headers = ["codigo", "nombre", "monto", "tipo"];
      sampleRow = {
        codigo: "A-001",
        nombre: "Ensamblar componentes",
        monto: 0,
        tipo: "operative",
      };
    } else {
      headers = ["codigo", "nombre", "monto", "tipo"];
      sampleRow = {
        codigo: "CO-001",
        nombre: "Producto A",
        monto: 0,
        tipo: "product",
      };
    }

    const ws = XLSX.utils.json_to_sheet([sampleRow], { header: headers });

    // Set column widths
    ws["!cols"] = headers.map((h) => ({ wch: Math.max(h.length + 5, 18) }));

    XLSX.utils.book_append_sheet(wb, ws, tabLabel);
    XLSX.writeFile(wb, `plantilla_${activeTab}.xlsx`);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Upload className="h-4 w-4 mr-2" />
          Importar Excel
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5" />
            Importar {tabLabel} desde Excel
          </DialogTitle>
          <DialogDescription>
            Sube un archivo .xlsx o .xls con las columnas:{" "}
            <strong>{spec.required.join(", ")}</strong>
            {spec.optional.length > 0 && (
              <> (opcionales: {spec.optional.join(", ")})</>
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 mt-2">
          {/* File picker + template download */}
          <div className="flex items-center gap-3">
            <div className="flex-1">
              <Input
                ref={fileRef}
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={handleFileChange}
                className="cursor-pointer"
              />
            </div>
            <Button variant="ghost" size="sm" onClick={handleDownloadTemplate}>
              <Download className="h-4 w-4 mr-1" />
              Plantilla
            </Button>
          </div>

          {/* Sheet selector (if multiple sheets) */}
          {sheetNames.length > 1 && (
            <div className="space-y-1">
              <Label className="text-xs">Hoja del archivo</Label>
              <Select value={selectedSheet} onValueChange={handleSheetChange}>
                <SelectTrigger className="h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {sheetNames.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Validation summary */}
          {parsedRows.length > 0 && (
            <div className="flex items-center gap-4 text-sm">
              <span className="flex items-center gap-1 text-green-600">
                <CheckCircle2 className="h-4 w-4" />
                {validRows.length} filas válidas
              </span>
              {errorRows.length > 0 && (
                <span className="flex items-center gap-1 text-destructive">
                  <AlertTriangle className="h-4 w-4" />
                  {errorRows.length} filas con errores
                </span>
              )}
              <span className="text-muted-foreground">
                Total: {parsedRows.length} filas
              </span>
            </div>
          )}

          {/* Preview table */}
          {parsedRows.length > 0 && (
            <div className="border rounded-lg max-h-72 overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-14">Fila</TableHead>
                    <TableHead className="w-10">Estado</TableHead>
                    <TableHead className="w-20">Código</TableHead>
                    <TableHead>Nombre</TableHead>
                    <TableHead className="text-right w-24">
                      {activeTab === "resources" ? "Monto" : "Costo Directo"}
                    </TableHead>
                    <TableHead className="w-24">
                      {activeTab === "resources" ? "Categoría" : "Tipo"}
                    </TableHead>
                    <TableHead>Errores</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {parsedRows.slice(0, 100).map((row) => (
                    <TableRow
                      key={row.rowNum}
                      className={
                        row.errors.length > 0 ? "bg-destructive/5" : ""
                      }
                    >
                      <TableCell className="font-mono text-xs text-muted-foreground">
                        {row.rowNum}
                      </TableCell>
                      <TableCell>
                        {row.errors.length === 0 ? (
                          <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
                        ) : (
                          <AlertTriangle className="h-3.5 w-3.5 text-destructive" />
                        )}
                      </TableCell>
                      <TableCell className="font-mono text-xs">
                        {row.codigo || "—"}
                      </TableCell>
                      <TableCell className="text-sm">
                        {row.nombre || "—"}
                      </TableCell>
                      <TableCell className="text-right font-mono text-xs">
                        {row.monto.toLocaleString("en-US", {
                          minimumFractionDigits: 2,
                        })}
                      </TableCell>
                      <TableCell className="text-xs">
                        {row.tipo || row.categoria || "—"}
                      </TableCell>
                      <TableCell>
                        {row.errors.length > 0 && (
                          <span className="text-xs text-destructive">
                            {row.errors.join("; ")}
                          </span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                  {parsedRows.length > 100 && (
                    <TableRow>
                      <TableCell
                        colSpan={7}
                        className="text-center text-xs text-muted-foreground"
                      >
                        ... y {parsedRows.length - 100} filas más
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          )}

          {/* Type help */}
          {(activeTab === "activities" || activeTab === "objects") &&
            parsedRows.length > 0 && (
              <div className="text-[11px] text-muted-foreground bg-muted/50 p-2 rounded">
                <strong>Valores válidos para "tipo":</strong>{" "}
                {activeTab === "activities"
                  ? "operative (Operativa), production (Producción), support (Apoyo)"
                  : "product (Producto), service (Servicio), client (Cliente), channel (Canal), distribution_channel (Canal de distribución), sales_channel (Canal de venta), branch (Sucursal), agency (Agencia), project (Proyecto)"}
                . Se aceptan valores en español o inglés.
              </div>
            )}
        </div>

        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={() => handleOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            onClick={handleImport}
            disabled={importing || validRows.length === 0}
          >
            {importing ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Upload className="h-4 w-4 mr-2" />
            )}
            Importar {validRows.length} registro
            {validRows.length !== 1 ? "s" : ""}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ───── Default categories ───── */
export const DEFAULT_CATEGORIES = [
  "Logistica",
  "Produccion",
  "Comercial",
  "Apoyo",
  "Ventas",
  "Finanzas",
  "Administracion",
  "RRHH",
];

const categoryColors: Record<string, string> = {
  Logistica: "bg-blue-500/10 text-blue-500",
  Produccion: "bg-amber-500/10 text-amber-500",
  Comercial: "bg-emerald-500/10 text-emerald-500",
  Apoyo: "bg-purple-500/10 text-purple-500",
  Ventas: "bg-rose-500/10 text-rose-500",
  Finanzas: "bg-cyan-500/10 text-cyan-500",
  Administracion: "bg-orange-500/10 text-orange-500",
  RRHH: "bg-pink-500/10 text-pink-500",
};

/* ───── Subtype labels ───── */
const subtypeLabels: Record<string, string> = {
  directo: "Directo",
  indirecto: "Indirecto",
  operative: "Operativa",
  production: "Producción",
  support: "Apoyo",
  product: "Producto",
  service: "Servicio",
  client: "Cliente",
  channel: "Canal",
  distribution_channel: "Canal de distribución",
  sales_channel: "Canal de venta",
  branch: "Sucursal",
  agency: "Agencia",
  project: "Proyecto",
};

const subtypeColors: Record<string, string> = {
  directo: "bg-green-500/10 text-green-600",
  indirecto: "bg-violet-500/10 text-violet-600",
  operative: "bg-blue-500/10 text-blue-600",
  production: "bg-amber-500/10 text-amber-600",
  support: "bg-purple-500/10 text-purple-600",
  product: "bg-emerald-500/10 text-emerald-600",
  service: "bg-cyan-500/10 text-cyan-600",
  client: "bg-rose-500/10 text-rose-600",
  channel: "bg-orange-500/10 text-orange-600",
  distribution_channel: "bg-orange-600/10 text-orange-700",
  sales_channel: "bg-amber-600/10 text-amber-700",
  branch: "bg-teal-500/10 text-teal-600",
  agency: "bg-sky-500/10 text-sky-600",
  project: "bg-indigo-500/10 text-indigo-600",
};

/* ───── Add/Edit Center Dialog ───── */
function AddCenterDialog({
  onAdd,
  loading,
  existingCodes,
  centers,
  editingCenter,
  open: controlledOpen,
  onOpenChange: controlledOnOpenChange,
}: {
  onAdd: (item: {
    code: string;
    name: string;
    type: string;
    note?: string;
    parent_id?: string | null;
  }) => void;
  loading: boolean;
  existingCodes: string[];
  centers: CostCenter[];
  editingCenter?: CostCenter | null;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}) {
  const [internalOpen, setInternalOpen] = useState(false);
  const open = controlledOpen ?? internalOpen;
  const setOpen = controlledOnOpenChange ?? setInternalOpen;

  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [centerType, setCenterType] = useState<"agrupador" | "totalizador">(
    "agrupador",
  );
  const [note, setNote] = useState("");
  const [parentId, setParentId] = useState<string>("");

  const getNextCode = () => {
    const prefix = "CC-";
    let maxNum = 0;
    for (const c of existingCodes) {
      if (c.startsWith(prefix)) {
        const numPart = parseInt(c.slice(prefix.length), 10);
        if (!isNaN(numPart) && numPart > maxNum) maxNum = numPart;
      }
    }
    return `${prefix}${String(maxNum + 1).padStart(4, "0")}`;
  };

  // Populate fields when editingCenter is provided (controlled open)
  useEffect(() => {
    if (editingCenter && open) {
      setCode(editingCenter.code);
      setName(editingCenter.name);
      setCenterType(editingCenter.type);
      setNote(editingCenter.note || "");
      setParentId(editingCenter.parent_id || "");
    }
  }, [editingCenter, open]);

  const handleOpenChange = (isOpen: boolean) => {
    setOpen(isOpen);
    if (isOpen) {
      if (editingCenter) {
        setCode(editingCenter.code);
        setName(editingCenter.name);
        setCenterType(editingCenter.type);
        setNote(editingCenter.note || "");
        setParentId(editingCenter.parent_id || "");
      } else {
        setCode(getNextCode());
        setName("");
        setCenterType("agrupador");
        setNote("");
        setParentId("");
      }
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onAdd({
      code,
      name,
      type: centerType,
      note: note || undefined,
      parent_id: parentId || null,
    });
    if (!controlledOpen) setOpen(false);
  };

  // For parent selector, exclude self and all descendants to prevent circular references
  const getDescendantIds = (centerId: string): Set<string> => {
    const ids = new Set<string>();
    const queue = [centerId];
    while (queue.length > 0) {
      const current = queue.shift()!;
      ids.add(current);
      for (const c of centers) {
        if (c.parent_id === current && !ids.has(c.id)) {
          queue.push(c.id);
        }
      }
    }
    return ids;
  };

  const availableParents = editingCenter
    ? centers.filter((c) => !getDescendantIds(editingCenter.id).has(c.id))
    : centers;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      {!controlledOpen && (
        <DialogTrigger asChild>
          <Button size="sm" variant="outline">
            <Building2 className="h-4 w-4 mr-2" />
            Nuevo Centro
          </Button>
        </DialogTrigger>
      )}
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {editingCenter ? "Editar Centro" : "Nuevo Centro / Subcentro"}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Código</Label>
              <Input
                placeholder="CC-0001"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Tipo</Label>
              <Select
                value={centerType}
                onValueChange={(v) =>
                  setCenterType(v as "agrupador" | "totalizador")
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="agrupador">Agrupador</SelectItem>
                  <SelectItem value="totalizador">Totalizador</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <Label>Nombre</Label>
            <Input
              placeholder="Nombre del centro"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label>Centro padre (opcional)</Label>
            <Select value={parentId} onValueChange={setParentId}>
              <SelectTrigger>
                <SelectValue placeholder="Sin padre (raíz)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Sin padre (raíz)</SelectItem>
                {availableParents.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.code} — {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Nota (opcional)</Label>
            <Textarea
              placeholder="Nota o descripción adicional"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={2}
            />
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            {editingCenter ? "Guardar Cambios" : "Crear Centro"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/* ───── Resource Tree View (with drag & drop) ───── */
function ResourceTreeView({
  resources,
  centers,
  onDeleteResource,
  onEditResource,
  onDeleteCenter,
  onEditCenter,
  onMoveResource,
  onMoveCenter,
  allocatedMap,
  receivedMap,
  centerReceivedMap,
}: {
  resources: {
    id: string;
    code: string;
    name: string;
    amount: number;
    type?: string;
    category?: string | null;
    center_id?: string | null;
  }[];
  centers: CostCenter[];
  onDeleteResource: (id: string) => void;
  onEditResource: (item: any) => void;
  onDeleteCenter: (id: string) => void;
  onEditCenter: (center: CostCenter) => void;
  onMoveResource: (resourceId: string, centerId: string | null) => void;
  onMoveCenter: (centerId: string, newParentId: string | null) => void;
  allocatedMap?: Record<string, number>;
  receivedMap?: Record<string, number>;
  centerReceivedMap?: Record<string, number>;
}) {
  const { selectedModel } = useModelContext();
  const currencySymbol = getCurrencySymbol(selectedModel?.base_currency);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [draggingType, setDraggingType] = useState<
    "resource" | "center" | null
  >(null);
  const [dropTargetId, setDropTargetId] = useState<string | null>(null);
  const dragCounterRef = useRef<Record<string, number>>({});
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const deleteResource = deleteConfirmId
    ? resources.find((r) => r.id === deleteConfirmId)
    : null;
  const [deleteCenterConfirmId, setDeleteCenterConfirmId] = useState<
    string | null
  >(null);
  const deleteCenterItem = deleteCenterConfirmId
    ? centers.find((c) => c.id === deleteCenterConfirmId)
    : null;

  const toggleExpand = (id: string) => {
    setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  // Build tree structure
  const rootCenters = centers.filter((c) => !c.parent_id);
  const getChildCenters = (parentId: string) =>
    centers.filter((c) => c.parent_id === parentId);
  const getResources = (centerId: string) =>
    resources.filter((r) => r.center_id === centerId);
  const orphanResources = resources.filter((r) => !r.center_id);

  const sortedGetResources = (centerId: string) =>
    getResources(centerId)
      .slice()
      .sort((a, b) => (a.code || "").localeCompare(b.code || ""));
  const sortedOrphanResources = orphanResources
    .slice()
    .sort((a, b) => (a.code || "").localeCompare(b.code || ""));

  const getCenterAllocated = (centerId: string): number => {
    const directAllocated = allocatedMap?.[centerId] || 0;
    const objectsAllocated = getResources(centerId).reduce(
      (s, r) => s + (allocatedMap?.[r.id] || 0),
      0,
    );
    const childAllocated = getChildCenters(centerId).reduce(
      (s, c) => s + getCenterAllocated(c.id),
      0,
    );
    return directAllocated + objectsAllocated + childAllocated;
  };

  const getCenterMonto = (centerId: string): number => {
    const directResources = getResources(centerId);
    const directMonto = directResources.reduce((s, r) => s + r.amount, 0);
    const childMonto = getChildCenters(centerId).reduce(
      (s, c) => s + getCenterMonto(c.id),
      0,
    );
    return directMonto + childMonto;
  };

  const getCenterReceivedInCenter = (centerId: string): number => {
    const directCenterReceived = centerReceivedMap?.[centerId] || 0;
    const childCenterReceived = getChildCenters(centerId).reduce(
      (s, c) => s + getCenterReceivedInCenter(c.id),
      0,
    );
    return directCenterReceived + childCenterReceived;
  };

  const getCenterReceived = (centerId: string): number => {
    const directResources = getResources(centerId);
    const directReceived = directResources.reduce(
      (s, r) => s + (receivedMap?.[r.id] || 0),
      0,
    );
    const childReceived = getChildCenters(centerId).reduce(
      (s, c) => s + getCenterReceived(c.id),
      0,
    );
    return directReceived + childReceived;
  };

  const getCenterTotal = (centerId: string): number => {
    const directResources = getResources(centerId);
    const directTotal = directResources.reduce(
      (s, r) => s + r.amount + (receivedMap?.[r.id] || 0),
      0,
    );
    const childTotal = getChildCenters(centerId).reduce(
      (s, c) => s + getCenterTotal(c.id),
      0,
    );
    const centerRcvd = centerReceivedMap?.[centerId] || 0;
    return directTotal + childTotal + centerRcvd;
  };

  const getCenterResourceCount = (centerId: string): number => {
    const directCount = getResources(centerId).length;
    const childCount = getChildCenters(centerId).reduce(
      (s, c) => s + getCenterResourceCount(c.id),
      0,
    );
    return directCount + childCount;
  };

  const deleteCenterHasContent = deleteCenterConfirmId
    ? getCenterResourceCount(deleteCenterConfirmId) > 0 ||
      centers.some((c) => c.parent_id === deleteCenterConfirmId)
    : false;

  // Get all descendant center IDs (to prevent circular drops)
  const getDescendantCenterIds = (centerId: string): Set<string> => {
    const ids = new Set<string>();
    const queue = [centerId];
    while (queue.length > 0) {
      const current = queue.shift()!;
      ids.add(current);
      for (const c of centers) {
        if (c.parent_id === current && !ids.has(c.id)) {
          queue.push(c.id);
        }
      }
    }
    return ids;
  };

  // Drag handlers
  const handleDragStart = (
    e: React.DragEvent,
    itemId: string,
    type: "resource" | "center" = "resource",
  ) => {
    setDraggingId(itemId);
    setDraggingType(type);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", itemId);
    e.dataTransfer.setData("application/x-drag-type", type);
  };

  const handleDragEnd = () => {
    setDraggingId(null);
    setDraggingType(null);
    setDropTargetId(null);
    dragCounterRef.current = {};
  };

  const isInvalidDropTarget = (targetId: string | null) => {
    if (!draggingId) return false;
    if (draggingType === "resource") {
      const r = resources.find((res) => res.id === draggingId);
      if (!r) return false;
      return (r.center_id || null) === targetId;
    }
    if (draggingType === "center") {
      // Can't drop on itself
      if (draggingId === targetId) return true;
      // Can't drop on its own descendants
      if (targetId && getDescendantCenterIds(draggingId).has(targetId))
        return true;
      // Can't drop on current parent (already there)
      const c = centers.find((ctr) => ctr.id === draggingId);
      if (!c) return false;
      return (c.parent_id || null) === targetId;
    }
    return false;
  };

  const handleDragEnter = (e: React.DragEvent, targetId: string | null) => {
    e.preventDefault();
    const key = targetId ?? "__orphan__";
    dragCounterRef.current[key] = (dragCounterRef.current[key] || 0) + 1;
    if (dropTargetId !== targetId) setDropTargetId(targetId);
  };

  const handleDragOver = (e: React.DragEvent, targetId?: string | null) => {
    e.preventDefault();
    e.dataTransfer.dropEffect =
      targetId !== undefined && isInvalidDropTarget(targetId) ? "none" : "move";
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
    const itemType =
      e.dataTransfer.getData("application/x-drag-type") || "resource";
    if (!itemId) return;

    if (itemType === "center") {
      const center = centers.find((c) => c.id === itemId);
      if (!center) return;
      // Don't move if already in target parent
      if ((center.parent_id || null) === targetCenterId) return;
      // Don't drop on self or descendants
      if (targetCenterId && getDescendantCenterIds(itemId).has(targetCenterId))
        return;
      onMoveCenter(itemId, targetCenterId);
    } else {
      const resource = resources.find((r) => r.id === itemId);
      if (!resource) return;
      if ((resource.center_id || null) === targetCenterId) return;
      onMoveResource(itemId, targetCenterId);
    }

    // Auto-expand target center
    if (targetCenterId) {
      setExpanded((prev) => ({ ...prev, [targetCenterId]: true }));
    }

    setDraggingId(null);
    setDraggingType(null);
    setDropTargetId(null);
  };

  const renderResourceRow = (
    item: (typeof resources)[0],
    depth: number,
    parentLineLeft?: number,
  ) => {
    const subtype = item.type || "";
    const label = subtypeLabels[subtype] || subtype || "—";
    const color = subtypeColors[subtype] || "bg-primary/10 text-primary";
    const allocated = allocatedMap?.[item.id] || 0;
    const received = receivedMap?.[item.id] || 0;
    const totalCost = item.amount + received;
    const remaining = totalCost - allocated;
    const isDragging = draggingId === item.id;

    return (
      <div
        key={item.id}
        draggable
        onDragStart={(e) => handleDragStart(e, item.id)}
        onDragEnd={handleDragEnd}
        className={`flex items-center gap-2 py-2 px-3 border-b border-border/30 cursor-grab active:cursor-grabbing transition-opacity ${isDragging ? "opacity-30" : "hover:bg-muted/50"}`}
        style={{
          paddingLeft: `${parentLineLeft !== undefined ? parentLineLeft + 16 : depth * 24 + 12}px`,
        }}
      >
        <div className="w-4 flex items-center justify-center shrink-0">
          <svg
            className="h-3 w-3 text-muted-foreground/50"
            viewBox="0 0 6 10"
            fill="currentColor"
          >
            <circle cx="1" cy="1" r="1" />
            <circle cx="5" cy="1" r="1" />
            <circle cx="1" cy="5" r="1" />
            <circle cx="5" cy="5" r="1" />
            <circle cx="1" cy="9" r="1" />
            <circle cx="5" cy="9" r="1" />
          </svg>
        </div>
        <span className="w-4 shrink-0" />
        <div className="flex flex-col flex-1 min-w-0">
          <span className="font-mono text-sm text-muted-foreground leading-tight">
            {item.code}
          </span>
          <span className="text-sm truncate" title={item.name}>
            {item.name}
          </span>
        </div>
        <Badge
          variant="secondary"
          className={`${color} w-24 justify-center text-[10px]`}
        >
          {label}
        </Badge>
        <Badge
          variant="secondary"
          className={`${categoryColors[item.category || ""] || "bg-muted/50 text-muted-foreground"} w-28 justify-center text-[10px] truncate`}
          title={item.category || undefined}
        >
          {item.category || "—"}
        </Badge>
        <span className="font-mono text-sm w-28 text-right">
          {item.amount.toLocaleString("en-US", { minimumFractionDigits: 2 })}
        </span>
        <span className="font-mono text-sm w-36 text-right text-blue-500/70">
          0.00
        </span>
        <span className="font-mono text-sm w-28 text-right text-muted-foreground">
          {received.toLocaleString("en-US", { minimumFractionDigits: 2 })}
        </span>
        <span className="font-mono text-sm w-28 text-right font-medium">
          {totalCost.toLocaleString("en-US", { minimumFractionDigits: 2 })}
        </span>
        <span className="font-mono text-sm w-28 text-right text-muted-foreground">
          {allocated.toLocaleString("en-US", { minimumFractionDigits: 2 })}
        </span>
        <span
          className={`font-mono text-sm w-28 text-right font-medium ${remaining < -0.01 ? "text-destructive" : Math.abs(remaining) < 0.01 ? "text-green-600" : "text-amber-600"}`}
        >
          {remaining.toLocaleString("en-US", { minimumFractionDigits: 2 })}
        </span>
        <div className="flex gap-1 w-20 justify-end shrink-0">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-muted-foreground hover:text-primary"
            onClick={() => onEditResource(item)}
          >
            <Edit2 className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-muted-foreground hover:text-destructive"
            onClick={() => setDeleteConfirmId(item.id)}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    );
  };

  const renderCenter = (
    center: CostCenter,
    depth: number,
    parentLineLeft?: number,
  ) => {
    const isExpanded = expanded[center.id] ?? true;
    const childCenters = getChildCenters(center.id);
    const centerResources = sortedGetResources(center.id);
    const totalAmount = getCenterTotal(center.id);
    const centerReceivedInCenter = getCenterReceivedInCenter(center.id);
    const centerReceived = getCenterReceived(center.id);
    const resourceCount = getCenterResourceCount(center.id);
    const hasChildren = childCenters.length > 0 || centerResources.length > 0;
    const centerTypeLabel =
      center.type === "agrupador" ? "Agrupador" : "Totalizador";
    const centerTypeColor =
      center.type === "agrupador"
        ? "bg-sky-500/10 text-sky-600"
        : "bg-orange-500/10 text-orange-600";
    const isDropTarget =
      draggingId &&
      dropTargetId === center.id &&
      !isInvalidDropTarget(center.id);
    const isSubcenter = !!center.parent_id;
    const isDraggingThis =
      draggingId === center.id && draggingType === "center";

    return (
      <div
        key={center.id}
        onDragEnter={(e) => {
          e.stopPropagation();
          handleDragEnter(e, center.id);
        }}
        onDragOver={(e) => {
          e.stopPropagation();
          handleDragOver(e, center.id);
        }}
        onDragLeave={(e) => {
          e.stopPropagation();
          handleDragLeave(e, center.id);
        }}
        onDrop={(e) => handleDrop(e, center.id)}
      >
        {/* Center header row */}
        <div
          draggable={isSubcenter}
          onDragStart={
            isSubcenter
              ? (e) => {
                  e.stopPropagation();
                  handleDragStart(e, center.id, "center");
                }
              : undefined
          }
          onDragEnd={isSubcenter ? handleDragEnd : undefined}
          className={`flex items-center gap-2 py-2.5 px-3 border-b border-border/50 transition-colors ${isDraggingThis ? "opacity-30" : ""} ${isDropTarget ? "bg-primary/15 ring-2 ring-primary/40 ring-inset" : "hover:bg-muted bg-muted"} ${isSubcenter ? "cursor-grab active:cursor-grabbing" : "cursor-pointer"}`}
          style={{
            paddingLeft: `${parentLineLeft !== undefined ? parentLineLeft + 16 : depth * 24 + 12}px`,
          }}
          onClick={() => toggleExpand(center.id)}
        >
          {isSubcenter && (
            <div className="w-4 flex items-center justify-center shrink-0">
              <svg
                className="h-3 w-3 text-muted-foreground/50"
                viewBox="0 0 6 10"
                fill="currentColor"
              >
                <circle cx="1" cy="1" r="1" />
                <circle cx="5" cy="1" r="1" />
                <circle cx="1" cy="5" r="1" />
                <circle cx="5" cy="5" r="1" />
                <circle cx="1" cy="9" r="1" />
                <circle cx="5" cy="9" r="1" />
              </svg>
            </div>
          )}
          <span className="w-4 flex items-center justify-center shrink-0">
            {hasChildren ? (
              isExpanded ? (
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              ) : (
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              )
            ) : (
              <span className="w-4" />
            )}
          </span>
          {isDropTarget ? (
            <FolderOpen className="h-4 w-4 text-primary shrink-0" />
          ) : isExpanded ? (
            <FolderOpen className="h-4 w-4 text-amber-500 shrink-0" />
          ) : (
            <Folder className="h-4 w-4 text-amber-500 shrink-0" />
          )}
          <span className="font-mono text-xs text-muted-foreground w-20 shrink-0">
            {center.code}
          </span>
          <span
            className="text-sm font-semibold flex-1 truncate"
            title={center.note || undefined}
          >
            {center.name}
            <span className="text-xs font-normal text-muted-foreground ml-2">
              {resourceCount} recurso{resourceCount !== 1 ? "s" : ""}
            </span>
          </span>
          <Badge
            variant="secondary"
            className={`${centerTypeColor} w-24 justify-center text-[10px]`}
          >
            {centerTypeLabel}
          </Badge>
          <span className="font-mono text-sm w-28 text-right font-medium">
            {getCenterMonto(center.id).toLocaleString("en-US", { minimumFractionDigits: 2 })}
          </span>
          <span className="font-mono text-sm w-36 text-right text-blue-500">
            {centerReceivedInCenter.toLocaleString("en-US", { minimumFractionDigits: 2 })}
          </span>
          <span className="font-mono text-sm w-28 text-right text-muted-foreground">
            {centerReceived.toLocaleString("en-US", { minimumFractionDigits: 2 })}
          </span>
          <span className="font-mono text-sm w-28 text-right font-semibold">
            {totalAmount.toLocaleString("en-US", { minimumFractionDigits: 2 })}
          </span>
          <span className="font-mono text-sm w-28 text-right text-muted-foreground">
            {getCenterAllocated(center.id).toLocaleString("en-US", { minimumFractionDigits: 2 })}
          </span>
          <span className={`font-mono text-sm w-28 text-right font-medium ${(totalAmount - getCenterAllocated(center.id)) < -0.01 ? "text-destructive" : Math.abs(totalAmount - getCenterAllocated(center.id)) < 0.01 ? "text-green-600" : "text-amber-600"}`}>
            {(totalAmount - getCenterAllocated(center.id)).toLocaleString("en-US", { minimumFractionDigits: 2 })}
          </span>
          <div
            className="flex gap-1 w-20 justify-end shrink-0"
            onClick={(e) => e.stopPropagation()}
          >
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-muted-foreground hover:text-primary"
              onClick={() => onEditCenter(center)}
            >
              <Edit2 className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-muted-foreground hover:text-destructive"
              onClick={() => setDeleteCenterConfirmId(center.id)}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>

        {/* Children */}
        {isExpanded &&
          (() => {
            // Line aligns under the chevron arrow of this center
            // paddingLeft = depth*24+12, then subcenters have drag handle (w-4 + gap-2 = 24px), then chevron center is w-4/2 = 8px
            // Line aligns under the chevron: paddingLeft + (drag handle if subcenter) + half chevron width
            const myPadding =
              parentLineLeft !== undefined
                ? parentLineLeft + 16
                : depth * 24 + 12;
            const lineLeft = myPadding + (isSubcenter ? 24 : 0) + 8;
            return (
              <div className="relative">
                {/* Vertical connector line */}
                <div
                  className="absolute top-0 bottom-0 w-px bg-muted-foreground/40"
                  style={{ left: `${lineLeft}px` }}
                />
                {childCenters.map((child) =>
                  renderCenter(child, depth + 1, lineLeft),
                )}
                {centerResources.map((r) =>
                  renderResourceRow(r, depth + 1, lineLeft),
                )}
                {/* Empty drop zone when center has no resources */}
                {centerResources.length === 0 && childCenters.length === 0 && (
                  <div
                    className={`py-4 text-center text-xs border-b border-border/30 transition-colors ${isDropTarget ? "text-primary bg-primary/5" : "text-muted-foreground/50"}`}
                    style={{ paddingLeft: `${lineLeft + 16}px` }}
                  >
                    {isDropTarget ? "Soltar aquí" : "Arrastra recursos aquí"}
                  </div>
                )}
              </div>
            );
          })()}
      </div>
    );
  };

  if (centers.length === 0 && resources.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
        <p className="text-sm">No hay items todavía</p>
        <p className="text-xs mt-1">
          Agrega tu primer centro o recurso con los botones de arriba
        </p>
      </div>
    );
  }

  const draggingResourceOrphan = draggingId
    ? resources.find((r) => r.id === draggingId)
    : null;
  const isAlreadyOrphan =
    draggingResourceOrphan && !draggingResourceOrphan.center_id;
  const isOrphanDropTarget =
    draggingId && dropTargetId === "__orphan__" && !isAlreadyOrphan;

  return (
    <div className="overflow-x-auto">
    <div className="text-sm min-w-[1280px]">
      {/* Header */}
      <div className="flex items-center gap-2 py-2 px-3 border-b border-border bg-muted/40 text-xs font-medium text-muted-foreground">
        <span className="w-4" />
        <span className="w-4" />
        <span className="flex-1">Código / Nombre</span>
        <span className="w-24 text-center">Tipo</span>
        <span className="w-28 text-center">Categoría</span>
        <span className="w-28 text-right">Monto ({currencySymbol})</span>
        <span className="w-36 text-right text-blue-500/70">
          Recibido en centro ({currencySymbol})
        </span>
        <span className="w-28 text-right text-muted-foreground/50">
          Recibido ({currencySymbol})
        </span>
        <span className="w-28 text-right text-muted-foreground/50">
          Total ({currencySymbol})
        </span>
        <span className="w-28 text-right">Asignado ({currencySymbol})</span>
        <span className="w-28 text-right">Restante ({currencySymbol})</span>
        <span className="w-20" />
      </div>

      {/* Root centers */}
      {rootCenters.map((center) => renderCenter(center, 0))}

      {/* Orphan resources / drop zone to remove from center */}
      {(orphanResources.length > 0 || (draggingId && centers.length > 0)) && (
        <div
          onDragEnter={(e) => handleDragEnter(e, null)}
          onDragOver={(e) => handleDragOver(e, null)}
          onDragLeave={(e) => handleDragLeave(e, null)}
          onDrop={(e) => handleDrop(e, null)}
        >
          {rootCenters.length > 0 && (
            <div
              className={`flex items-center gap-2 py-2 px-3 border-b border-border/50 transition-colors ${isOrphanDropTarget ? "bg-primary/10 ring-2 ring-primary/40 ring-inset" : "bg-muted/10"}`}
            >
              <span className="text-xs text-muted-foreground italic">
                {isOrphanDropTarget
                  ? "Soltar para quitar del centro"
                  : "Sin centro asignado"}
              </span>
            </div>
          )}
          {sortedOrphanResources.map((r) => renderResourceRow(r, 0))}
        </div>
      )}
      {/* Delete confirmation dialog */}
      <AlertDialog
        open={!!deleteConfirmId}
        onOpenChange={(open) => {
          if (!open) setDeleteConfirmId(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Eliminar recurso
            </AlertDialogTitle>
            <AlertDialogDescription>
              ¿Está seguro de eliminar el recurso{" "}
              <strong>{deleteResource?.name}</strong>?
              <br />
              <br />
              Es posible que si se borra este recurso podría haber discrepancia
              entre las actividades o objetos de costo relacionados.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (deleteConfirmId) onDeleteResource(deleteConfirmId);
                setDeleteConfirmId(null);
              }}
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Center delete confirmation dialog */}
      <AlertDialog
        open={!!deleteCenterConfirmId}
        onOpenChange={(open) => {
          if (!open) setDeleteCenterConfirmId(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Eliminar centro
            </AlertDialogTitle>
            <AlertDialogDescription>
              {deleteCenterHasContent ? (
                <>
                  No se puede eliminar el centro{" "}
                  <strong>{deleteCenterItem?.name}</strong> porque contiene
                  recursos o subcentros.
                  <br />
                  <br />
                  Primero debe mover o eliminar todos los recursos y subcentros
                  que contiene.
                </>
              ) : (
                <>
                  ¿Está seguro de eliminar el centro{" "}
                  <strong>{deleteCenterItem?.name}</strong>?
                  <br />
                  <br />
                  Esta acción no se puede deshacer.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>
              {deleteCenterHasContent ? "Cerrar" : "Cancelar"}
            </AlertDialogCancel>
            {!deleteCenterHasContent && (
              <AlertDialogAction
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                onClick={() => {
                  if (deleteCenterConfirmId)
                    onDeleteCenter(deleteCenterConfirmId);
                  setDeleteCenterConfirmId(null);
                }}
              >
                Eliminar
              </AlertDialogAction>
            )}
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
    </div>
  );
}

/* ───── Add/Edit Activity Center Dialog ───── */
function AddActivityCenterDialog({
  onAdd,
  loading,
  existingCodes,
  centers,
  editingCenter,
  open: controlledOpen,
  onOpenChange: controlledOnOpenChange,
}: {
  onAdd: (item: {
    code: string;
    name: string;
    type: string;
    note?: string;
    parent_id?: string | null;
  }) => void;
  loading: boolean;
  existingCodes: string[];
  centers: ActivityCenter[];
  editingCenter?: ActivityCenter | null;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}) {
  const [internalOpen, setInternalOpen] = useState(false);
  const open = controlledOpen ?? internalOpen;
  const setOpen = controlledOnOpenChange ?? setInternalOpen;

  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [centerType, setCenterType] = useState<"agrupador" | "totalizador">(
    "agrupador",
  );
  const [note, setNote] = useState("");
  const [parentId, setParentId] = useState<string>("");

  const getNextCode = () => {
    const prefix = "CA-";
    let maxNum = 0;
    for (const c of existingCodes) {
      if (c.startsWith(prefix)) {
        const numPart = parseInt(c.slice(prefix.length), 10);
        if (!isNaN(numPart) && numPart > maxNum) maxNum = numPart;
      }
    }
    return `${prefix}${String(maxNum + 1).padStart(4, "0")}`;
  };

  useEffect(() => {
    if (editingCenter && open) {
      setCode(editingCenter.code);
      setName(editingCenter.name);
      setCenterType(editingCenter.type);
      setNote(editingCenter.note || "");
      setParentId(editingCenter.parent_id || "");
    }
  }, [editingCenter, open]);

  const handleOpenChange = (isOpen: boolean) => {
    setOpen(isOpen);
    if (isOpen) {
      if (editingCenter) {
        setCode(editingCenter.code);
        setName(editingCenter.name);
        setCenterType(editingCenter.type);
        setNote(editingCenter.note || "");
        setParentId(editingCenter.parent_id || "");
      } else {
        setCode(getNextCode());
        setName("");
        setCenterType("agrupador");
        setNote("");
        setParentId("");
      }
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onAdd({
      code,
      name,
      type: centerType,
      note: note || undefined,
      parent_id: parentId || null,
    });
    if (!controlledOpen) setOpen(false);
  };

  const getDescendantIds = (centerId: string): Set<string> => {
    const ids = new Set<string>();
    const queue = [centerId];
    while (queue.length > 0) {
      const current = queue.shift()!;
      ids.add(current);
      for (const c of centers) {
        if (c.parent_id === current && !ids.has(c.id)) {
          queue.push(c.id);
        }
      }
    }
    return ids;
  };

  const availableParents = editingCenter
    ? centers.filter((c) => !getDescendantIds(editingCenter.id).has(c.id))
    : centers;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      {!controlledOpen && (
        <DialogTrigger asChild>
          <Button size="sm" variant="outline">
            <Building2 className="h-4 w-4 mr-2" />
            Nuevo Centro
          </Button>
        </DialogTrigger>
      )}
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {editingCenter
              ? "Editar Centro de Actividades"
              : "Nuevo Centro de Actividades"}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Código</Label>
              <Input
                placeholder="CA-0001"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Tipo</Label>
              <Select
                value={centerType}
                onValueChange={(v) =>
                  setCenterType(v as "agrupador" | "totalizador")
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="agrupador">Agrupador</SelectItem>
                  <SelectItem value="totalizador">Totalizador</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <Label>Nombre</Label>
            <Input
              placeholder="Nombre del centro de actividades"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label>Centro padre (opcional)</Label>
            <Select value={parentId} onValueChange={setParentId}>
              <SelectTrigger>
                <SelectValue placeholder="Sin padre (raíz)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Sin padre (raíz)</SelectItem>
                {availableParents.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.code} — {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Nota (opcional)</Label>
            <Textarea
              placeholder="Nota o descripción adicional"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={2}
            />
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            {editingCenter ? "Guardar Cambios" : "Crear Centro"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/* ───── Activity Tree View (with drag & drop) ───── */
function ActivityTreeView({
  activities,
  centers,
  onDeleteActivity,
  onEditActivity,
  onDeleteCenter,
  onEditCenter,
  onMoveActivity,
  onMoveCenter,
  allocatedMap,
  receivedMap,
  centerReceivedMap,
}: {
  activities: {
    id: string;
    code: string;
    name: string;
    amount: number;
    type?: string;
    category?: string | null;
    center_id?: string | null;
  }[];
  centers: ActivityCenter[];
  onDeleteActivity: (id: string) => void;
  onEditActivity: (item: any) => void;
  onDeleteCenter: (id: string) => void;
  onEditCenter: (center: ActivityCenter) => void;
  onMoveActivity: (activityId: string, centerId: string | null) => void;
  onMoveCenter: (centerId: string, newParentId: string | null) => void;
  allocatedMap?: Record<string, number>;
  receivedMap?: Record<string, number>;
  centerReceivedMap?: Record<string, number>;
}) {
  const { selectedModel } = useModelContext();
  const currencySymbol = getCurrencySymbol(selectedModel?.base_currency);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [draggingType, setDraggingType] = useState<
    "activity" | "center" | null
  >(null);
  const [dropTargetId, setDropTargetId] = useState<string | null>(null);
  const dragCounterRef = useRef<Record<string, number>>({});
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const deleteActivity = deleteConfirmId
    ? activities.find((a) => a.id === deleteConfirmId)
    : null;
  const [deleteCenterConfirmId, setDeleteCenterConfirmId] = useState<
    string | null
  >(null);
  const deleteCenterItem = deleteCenterConfirmId
    ? centers.find((c) => c.id === deleteCenterConfirmId)
    : null;

  const toggleExpand = (id: string) => {
    setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  // Build tree structure
  const rootCenters = centers.filter((c) => !c.parent_id);
  const getChildCenters = (parentId: string) =>
    centers.filter((c) => c.parent_id === parentId);
  const getActivities = (centerId: string) =>
    activities.filter((a) => a.center_id === centerId);
  const orphanActivities = activities.filter((a) => !a.center_id);

  const sortedGetActivities = (centerId: string) =>
    getActivities(centerId)
      .slice()
      .sort((a, b) => (a.code || "").localeCompare(b.code || ""));
  const sortedOrphanActivities = orphanActivities
    .slice()
    .sort((a, b) => (a.code || "").localeCompare(b.code || ""));

  const getCenterReceivedInCenter = (centerId: string): number => {
    const directCenterReceived = centerReceivedMap?.[centerId] || 0;
    const childCenterReceived = getChildCenters(centerId).reduce(
      (s, c) => s + getCenterReceivedInCenter(c.id),
      0,
    );
    return directCenterReceived + childCenterReceived;
  };

  const getCenterReceived = (centerId: string): number => {
    const itemsReceived = getActivities(centerId).reduce(
      (s, a) => s + (receivedMap?.[a.id] || 0),
      0,
    );
    const childReceived = getChildCenters(centerId).reduce(
      (s, c) => s + getCenterReceived(c.id),
      0,
    );
    return itemsReceived + childReceived;
  };

  const getCenterAllocated = (centerId: string): number => {
    const directAllocated = allocatedMap?.[centerId] || 0;
    const itemsAllocated = getActivities(centerId).reduce(
      (s, a) => s + (allocatedMap?.[a.id] || 0),
      0,
    );
    const childAllocated = getChildCenters(centerId).reduce(
      (s, c) => s + getCenterAllocated(c.id),
      0,
    );
    return directAllocated + itemsAllocated + childAllocated;
  };

  const getCenterDirectAmount = (centerId: string): number => {
    const directActivities = getActivities(centerId);
    const directAmount = directActivities.reduce((s, a) => s + a.amount, 0);
    const childAmount = getChildCenters(centerId).reduce(
      (s, c) => s + getCenterDirectAmount(c.id),
      0,
    );
    return directAmount + childAmount;
  };

  const getCenterTotal = (centerId: string): number => {
    const directActivities = getActivities(centerId);
    const directTotal = directActivities.reduce(
      (s, a) => s + a.amount + (receivedMap?.[a.id] || 0),
      0,
    );
    const childTotal = getChildCenters(centerId).reduce(
      (s, c) => s + getCenterTotal(c.id),
      0,
    );
    const centerRcvd = centerReceivedMap?.[centerId] || 0;
    return directTotal + childTotal + centerRcvd;
  };

  const getCenterActivityCount = (centerId: string): number => {
    const directCount = getActivities(centerId).length;
    const childCount = getChildCenters(centerId).reduce(
      (s, c) => s + getCenterActivityCount(c.id),
      0,
    );
    return directCount + childCount;
  };

  const deleteCenterHasContent = deleteCenterConfirmId
    ? getCenterActivityCount(deleteCenterConfirmId) > 0 ||
      centers.some((c) => c.parent_id === deleteCenterConfirmId)
    : false;

  const getDescendantCenterIds = (centerId: string): Set<string> => {
    const ids = new Set<string>();
    const queue = [centerId];
    while (queue.length > 0) {
      const current = queue.shift()!;
      ids.add(current);
      for (const c of centers) {
        if (c.parent_id === current && !ids.has(c.id)) {
          queue.push(c.id);
        }
      }
    }
    return ids;
  };

  // Drag handlers
  const handleDragStart = (
    e: React.DragEvent,
    itemId: string,
    type: "activity" | "center" = "activity",
  ) => {
    setDraggingId(itemId);
    setDraggingType(type);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", itemId);
    e.dataTransfer.setData("application/x-drag-type", type);
  };

  const handleDragEnd = () => {
    setDraggingId(null);
    setDraggingType(null);
    setDropTargetId(null);
    dragCounterRef.current = {};
  };

  const isInvalidDropTarget = (targetId: string | null) => {
    if (!draggingId) return false;
    if (draggingType === "activity") {
      const a = activities.find((act) => act.id === draggingId);
      if (!a) return false;
      return (a.center_id || null) === targetId;
    }
    if (draggingType === "center") {
      if (draggingId === targetId) return true;
      if (targetId && getDescendantCenterIds(draggingId).has(targetId))
        return true;
      const c = centers.find((ctr) => ctr.id === draggingId);
      if (!c) return false;
      return (c.parent_id || null) === targetId;
    }
    return false;
  };

  const handleDragEnter = (e: React.DragEvent, targetId: string | null) => {
    e.preventDefault();
    const key = targetId ?? "__orphan__";
    dragCounterRef.current[key] = (dragCounterRef.current[key] || 0) + 1;
    if (dropTargetId !== targetId) setDropTargetId(targetId);
  };

  const handleDragOver = (e: React.DragEvent, targetId?: string | null) => {
    e.preventDefault();
    e.dataTransfer.dropEffect =
      targetId !== undefined && isInvalidDropTarget(targetId) ? "none" : "move";
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
    const itemType =
      e.dataTransfer.getData("application/x-drag-type") || "activity";
    if (!itemId) return;

    if (itemType === "center") {
      const center = centers.find((c) => c.id === itemId);
      if (!center) return;
      if ((center.parent_id || null) === targetCenterId) return;
      if (targetCenterId && getDescendantCenterIds(itemId).has(targetCenterId))
        return;
      onMoveCenter(itemId, targetCenterId);
    } else {
      const activity = activities.find((a) => a.id === itemId);
      if (!activity) return;
      if ((activity.center_id || null) === targetCenterId) return;
      onMoveActivity(itemId, targetCenterId);
    }

    if (targetCenterId) {
      setExpanded((prev) => ({ ...prev, [targetCenterId]: true }));
    }

    setDraggingId(null);
    setDraggingType(null);
    setDropTargetId(null);
  };

  const renderActivityRow = (
    item: (typeof activities)[0],
    depth: number,
    parentLineLeft?: number,
  ) => {
    const subtype = item.type || "";
    const label = subtypeLabels[subtype] || subtype || "—";
    const color = subtypeColors[subtype] || "bg-primary/10 text-primary";
    const received = receivedMap?.[item.id] || 0;
    const totalCost = item.amount + received;
    const allocated = allocatedMap?.[item.id] || 0;
    const remaining = totalCost - allocated;
    const isDragging = draggingId === item.id;

    return (
      <div
        key={item.id}
        draggable
        onDragStart={(e) => handleDragStart(e, item.id)}
        onDragEnd={handleDragEnd}
        className={`flex items-center gap-2 py-2 px-3 border-b border-border/30 cursor-grab active:cursor-grabbing transition-opacity ${isDragging ? "opacity-30" : "hover:bg-muted/50"}`}
        style={{
          paddingLeft: `${parentLineLeft !== undefined ? parentLineLeft + 16 : depth * 24 + 12}px`,
        }}
      >
        <div className="w-4 flex items-center justify-center shrink-0">
          <svg
            className="h-3 w-3 text-muted-foreground/50"
            viewBox="0 0 6 10"
            fill="currentColor"
          >
            <circle cx="1" cy="1" r="1" />
            <circle cx="5" cy="1" r="1" />
            <circle cx="1" cy="5" r="1" />
            <circle cx="5" cy="5" r="1" />
            <circle cx="1" cy="9" r="1" />
            <circle cx="5" cy="9" r="1" />
          </svg>
        </div>
        <span className="w-4 shrink-0" />
        <div className="flex flex-col flex-1 min-w-0">
          <span className="font-mono text-sm text-muted-foreground leading-tight">
            {item.code}
          </span>
          <span className="text-sm truncate" title={item.name}>
            {item.name}
          </span>
        </div>
        <Badge
          variant="secondary"
          className={`${color} w-24 justify-center text-[10px]`}
        >
          {label}
        </Badge>
        <Badge
          variant="secondary"
          className={`${categoryColors[item.category || ""] || "bg-muted/50 text-muted-foreground"} w-28 justify-center text-[10px] truncate`}
          title={item.category || undefined}
        >
          {item.category || "—"}
        </Badge>
        <span className="font-mono text-sm w-28 text-right">
          {item.amount.toLocaleString("en-US", { minimumFractionDigits: 2 })}
        </span>
        <span className="font-mono text-sm w-36 text-right text-blue-500/70">
          0.00
        </span>
        <span className="font-mono text-sm w-28 text-right text-muted-foreground">
          {received.toLocaleString("en-US", { minimumFractionDigits: 2 })}
        </span>
        <span className="font-mono text-sm w-28 text-right font-medium">
          {totalCost.toLocaleString("en-US", { minimumFractionDigits: 2 })}
        </span>
        <span className="font-mono text-sm w-28 text-right text-muted-foreground">
          {allocated.toLocaleString("en-US", { minimumFractionDigits: 2 })}
        </span>
        <span
          className={`font-mono text-sm w-28 text-right font-medium ${remaining < -0.01 ? "text-destructive" : Math.abs(remaining) < 0.01 ? "text-green-600" : "text-amber-600"}`}
        >
          {remaining.toLocaleString("en-US", { minimumFractionDigits: 2 })}
        </span>
        <div className="flex gap-1 w-20 justify-end shrink-0">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-muted-foreground hover:text-primary"
            onClick={() => onEditActivity(item)}
          >
            <Edit2 className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-muted-foreground hover:text-destructive"
            onClick={() => setDeleteConfirmId(item.id)}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    );
  };

  const renderCenter = (
    center: ActivityCenter,
    depth: number,
    parentLineLeft?: number,
  ) => {
    const isExpanded = expanded[center.id] ?? true;
    const childCenters = getChildCenters(center.id);
    const centerActivities = sortedGetActivities(center.id);
    const directAmount = getCenterDirectAmount(center.id);
    const activityCount = getCenterActivityCount(center.id);
    const hasChildren = childCenters.length > 0 || centerActivities.length > 0;
    const centerTypeLabel =
      center.type === "agrupador" ? "Agrupador" : "Totalizador";
    const centerTypeColor =
      center.type === "agrupador"
        ? "bg-sky-500/10 text-sky-600"
        : "bg-orange-500/10 text-orange-600";
    const isDropTarget =
      draggingId &&
      dropTargetId === center.id &&
      !isInvalidDropTarget(center.id);
    const isSubcenter = !!center.parent_id;
    const isDraggingThis =
      draggingId === center.id && draggingType === "center";

    const finalReceivedInCenter = getCenterReceivedInCenter(center.id);
    const finalReceived = getCenterReceived(center.id);
    const finalAllocated = getCenterAllocated(center.id);
    const finalTotal = getCenterTotal(center.id);

    return (
      <div
        key={center.id}
        onDragEnter={(e) => {
          e.stopPropagation();
          handleDragEnter(e, center.id);
        }}
        onDragOver={(e) => {
          e.stopPropagation();
          handleDragOver(e, center.id);
        }}
        onDragLeave={(e) => {
          e.stopPropagation();
          handleDragLeave(e, center.id);
        }}
        onDrop={(e) => handleDrop(e, center.id)}
      >
        {/* Center header row */}
        <div
          draggable={isSubcenter}
          onDragStart={
            isSubcenter
              ? (e) => {
                  e.stopPropagation();
                  handleDragStart(e, center.id, "center");
                }
              : undefined
          }
          onDragEnd={isSubcenter ? handleDragEnd : undefined}
          className={`flex items-center gap-2 py-2.5 px-3 border-b border-border/50 transition-colors ${isDraggingThis ? "opacity-30" : ""} ${isDropTarget ? "bg-primary/15 ring-2 ring-primary/40 ring-inset" : "hover:bg-muted bg-muted"} ${isSubcenter ? "cursor-grab active:cursor-grabbing" : "cursor-pointer"}`}
          style={{
            paddingLeft: `${parentLineLeft !== undefined ? parentLineLeft + 16 : depth * 24 + 12}px`,
          }}
          onClick={() => toggleExpand(center.id)}
        >
          {isSubcenter && (
            <div className="w-4 flex items-center justify-center shrink-0">
              <svg
                className="h-3 w-3 text-muted-foreground/50"
                viewBox="0 0 6 10"
                fill="currentColor"
              >
                <circle cx="1" cy="1" r="1" />
                <circle cx="5" cy="1" r="1" />
                <circle cx="1" cy="5" r="1" />
                <circle cx="5" cy="5" r="1" />
                <circle cx="1" cy="9" r="1" />
                <circle cx="5" cy="9" r="1" />
              </svg>
            </div>
          )}
          <span className="w-4 flex items-center justify-center shrink-0">
            {hasChildren ? (
              isExpanded ? (
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              ) : (
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              )
            ) : (
              <span className="w-4" />
            )}
          </span>
          {isDropTarget ? (
            <FolderOpen className="h-4 w-4 text-primary shrink-0" />
          ) : isExpanded ? (
            <FolderOpen className="h-4 w-4 text-amber-500 shrink-0" />
          ) : (
            <Folder className="h-4 w-4 text-amber-500 shrink-0" />
          )}
          <span className="font-mono text-xs text-muted-foreground w-20 shrink-0">
            {center.code}
          </span>
          <span
            className="text-sm font-semibold flex-1 truncate"
            title={center.note || undefined}
          >
            {center.name}
            <span className="text-xs font-normal text-muted-foreground ml-2">
              {activityCount} actividad{activityCount !== 1 ? "es" : ""}
            </span>
          </span>
          <Badge
            variant="secondary"
            className={`${centerTypeColor} w-24 justify-center text-[10px]`}
          >
            {centerTypeLabel}
          </Badge>
          <span className="w-28" />
          <span className="font-mono text-sm w-28 text-right font-medium">
            {directAmount.toLocaleString("en-US", { minimumFractionDigits: 2 })}
          </span>
          <span className="font-mono text-sm w-36 text-right text-blue-500">
            {finalReceivedInCenter.toLocaleString("en-US", { minimumFractionDigits: 2 })}
          </span>
          <span className="font-mono text-sm w-28 text-right text-muted-foreground">
            {finalReceived.toLocaleString("en-US", { minimumFractionDigits: 2 })}
          </span>
          <span className="font-mono text-sm w-28 text-right font-semibold">
            {finalTotal.toLocaleString("en-US", { minimumFractionDigits: 2 })}
          </span>
          <span className="font-mono text-sm w-28 text-right text-muted-foreground">
            {finalAllocated.toLocaleString("en-US", { minimumFractionDigits: 2 })}
          </span>
          <span className={`font-mono text-sm w-28 text-right font-medium ${(finalTotal - finalAllocated) < -0.01 ? "text-destructive" : Math.abs(finalTotal - finalAllocated) < 0.01 ? "text-green-600" : "text-amber-600"}`}>
            {(finalTotal - finalAllocated).toLocaleString("en-US", { minimumFractionDigits: 2 })}
          </span>
          <div
            className="flex gap-1 w-20 justify-end shrink-0"
            onClick={(e) => e.stopPropagation()}
          >
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-muted-foreground hover:text-primary"
              onClick={() => onEditCenter(center)}
            >
              <Edit2 className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-muted-foreground hover:text-destructive"
              onClick={() => setDeleteCenterConfirmId(center.id)}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>

        {/* Children */}
        {isExpanded &&
          (() => {
            const myPadding =
              parentLineLeft !== undefined
                ? parentLineLeft + 16
                : depth * 24 + 12;
            const lineLeft = myPadding + (isSubcenter ? 24 : 0) + 8;
            return (
              <div className="relative">
                <div
                  className="absolute top-0 bottom-0 w-px bg-muted-foreground/40"
                  style={{ left: `${lineLeft}px` }}
                />
                {childCenters.map((child) =>
                  renderCenter(child, depth + 1, lineLeft),
                )}
                {centerActivities.map((a) =>
                  renderActivityRow(a, depth + 1, lineLeft),
                )}
                {centerActivities.length === 0 && childCenters.length === 0 && (
                  <div
                    className={`py-4 text-center text-xs border-b border-border/30 transition-colors ${isDropTarget ? "text-primary bg-primary/5" : "text-muted-foreground/50"}`}
                    style={{ paddingLeft: `${lineLeft + 16}px` }}
                  >
                    {isDropTarget ? "Soltar aquí" : "Arrastra actividades aquí"}
                  </div>
                )}
              </div>
            );
          })()}
      </div>
    );
  };

  if (centers.length === 0 && activities.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
        <p className="text-sm">No hay items todavía</p>
        <p className="text-xs mt-1">
          Agrega tu primer centro o actividad con los botones de arriba
        </p>
      </div>
    );
  }

  const draggingActivityOrphan = draggingId
    ? activities.find((a) => a.id === draggingId)
    : null;
  const isAlreadyOrphan =
    draggingActivityOrphan && !draggingActivityOrphan.center_id;
  const isOrphanDropTarget =
    draggingId && dropTargetId === "__orphan__" && !isAlreadyOrphan;

  return (
    <div className="overflow-x-auto">
    <div className="text-sm min-w-[1280px]">
      {/* Header */}
      <div className="flex items-center gap-2 py-2 px-3 border-b border-border bg-muted/40 text-xs font-medium text-muted-foreground">
        <span className="w-4" />
        <span className="w-4" />
        <span className="flex-1">Código / Nombre</span>
        <span className="w-24 text-center">Tipo</span>
        <span className="w-28 text-center">Categoría</span>
        <span className="w-28 text-right">C. Directo ({currencySymbol})</span>
        <span className="w-36 text-right text-blue-500/70">Recibido en centro ({currencySymbol})</span>
        <span className="w-28 text-right">Recibido ({currencySymbol})</span>
        <span className="w-28 text-right">Total ({currencySymbol})</span>
        <span className="w-28 text-right">Asignado ({currencySymbol})</span>
        <span className="w-28 text-right">Restante ({currencySymbol})</span>
        <span className="w-20" />
      </div>

      {/* Root centers */}
      {rootCenters.map((center) => renderCenter(center, 0))}

      {/* Orphan activities / drop zone to remove from center */}
      {(orphanActivities.length > 0 || (draggingId && centers.length > 0)) && (
        <div
          onDragEnter={(e) => handleDragEnter(e, null)}
          onDragOver={(e) => handleDragOver(e, null)}
          onDragLeave={(e) => handleDragLeave(e, null)}
          onDrop={(e) => handleDrop(e, null)}
        >
          {rootCenters.length > 0 && (
            <div
              className={`flex items-center gap-2 py-2 px-3 border-b border-border/50 transition-colors ${isOrphanDropTarget ? "bg-primary/10 ring-2 ring-primary/40 ring-inset" : "bg-muted/10"}`}
            >
              <span className="text-xs text-muted-foreground italic">
                {isOrphanDropTarget
                  ? "Soltar para quitar del centro"
                  : "Sin centro asignado"}
              </span>
            </div>
          )}
          {sortedOrphanActivities.map((a) => renderActivityRow(a, 0))}
        </div>
      )}

      {/* Delete confirmation dialog */}
      <AlertDialog
        open={!!deleteConfirmId}
        onOpenChange={(open) => {
          if (!open) setDeleteConfirmId(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Eliminar actividad
            </AlertDialogTitle>
            <AlertDialogDescription>
              ¿Está seguro de eliminar la actividad{" "}
              <strong>{deleteActivity?.name}</strong>?
              <br />
              <br />
              Es posible que si se borra esta actividad podría haber
              discrepancia entre los objetos de costo relacionados.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (deleteConfirmId) onDeleteActivity(deleteConfirmId);
                setDeleteConfirmId(null);
              }}
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Center delete confirmation dialog */}
      <AlertDialog
        open={!!deleteCenterConfirmId}
        onOpenChange={(open) => {
          if (!open) setDeleteCenterConfirmId(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Eliminar centro de actividades
            </AlertDialogTitle>
            <AlertDialogDescription>
              {deleteCenterHasContent ? (
                <>
                  No se puede eliminar el centro{" "}
                  <strong>{deleteCenterItem?.name}</strong> porque contiene
                  actividades o subcentros.
                  <br />
                  <br />
                  Primero debe mover o eliminar todas las actividades y
                  subcentros que contiene.
                </>
              ) : (
                <>
                  ¿Está seguro de eliminar el centro{" "}
                  <strong>{deleteCenterItem?.name}</strong>?
                  <br />
                  <br />
                  Esta acción no se puede deshacer.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>
              {deleteCenterHasContent ? "Cerrar" : "Cancelar"}
            </AlertDialogCancel>
            {!deleteCenterHasContent && (
              <AlertDialogAction
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                onClick={() => {
                  if (deleteCenterConfirmId)
                    onDeleteCenter(deleteCenterConfirmId);
                  setDeleteCenterConfirmId(null);
                }}
              >
                Eliminar
              </AlertDialogAction>
            )}
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
    </div>
  );
}

/* ───── Add/Edit Cost Object Center Dialog ───── */
function AddCostObjectCenterDialog({
  onAdd,
  loading,
  existingCodes,
  centers,
  editingCenter,
  open: controlledOpen,
  onOpenChange: controlledOnOpenChange,
}: {
  onAdd: (item: {
    code: string;
    name: string;
    type: string;
    note?: string;
    parent_id?: string | null;
  }) => void;
  loading: boolean;
  existingCodes: string[];
  centers: CostObjectCenter[];
  editingCenter?: CostObjectCenter | null;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}) {
  const [internalOpen, setInternalOpen] = useState(false);
  const open = controlledOpen ?? internalOpen;
  const setOpen = controlledOnOpenChange ?? setInternalOpen;

  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [centerType, setCenterType] = useState<"agrupador" | "totalizador">(
    "agrupador",
  );
  const [note, setNote] = useState("");
  const [parentId, setParentId] = useState<string>("");

  const getNextCode = () => {
    const prefix = "COC-";
    let maxNum = 0;
    for (const c of existingCodes) {
      if (c.startsWith(prefix)) {
        const numPart = parseInt(c.slice(prefix.length), 10);
        if (!isNaN(numPart) && numPart > maxNum) maxNum = numPart;
      }
    }
    return `${prefix}${String(maxNum + 1).padStart(4, "0")}`;
  };

  useEffect(() => {
    if (editingCenter && open) {
      setCode(editingCenter.code);
      setName(editingCenter.name);
      setCenterType(editingCenter.type);
      setNote(editingCenter.note || "");
      setParentId(editingCenter.parent_id || "");
    }
  }, [editingCenter, open]);

  const handleOpenChange = (isOpen: boolean) => {
    setOpen(isOpen);
    if (isOpen) {
      if (editingCenter) {
        setCode(editingCenter.code);
        setName(editingCenter.name);
        setCenterType(editingCenter.type);
        setNote(editingCenter.note || "");
        setParentId(editingCenter.parent_id || "");
      } else {
        setCode(getNextCode());
        setName("");
        setCenterType("agrupador");
        setNote("");
        setParentId("");
      }
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onAdd({
      code,
      name,
      type: centerType,
      note: note || undefined,
      parent_id: parentId || null,
    });
    if (!controlledOpen) setOpen(false);
  };

  const getDescendantIds = (centerId: string): Set<string> => {
    const ids = new Set<string>();
    const queue = [centerId];
    while (queue.length > 0) {
      const current = queue.shift()!;
      ids.add(current);
      for (const c of centers) {
        if (c.parent_id === current && !ids.has(c.id)) {
          queue.push(c.id);
        }
      }
    }
    return ids;
  };

  const availableParents = editingCenter
    ? centers.filter((c) => !getDescendantIds(editingCenter.id).has(c.id))
    : centers;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      {!controlledOpen && (
        <DialogTrigger asChild>
          <Button size="sm" variant="outline">
            <Building2 className="h-4 w-4 mr-2" />
            Nuevo Centro
          </Button>
        </DialogTrigger>
      )}
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {editingCenter
              ? "Editar Centro de Objetos de Costo"
              : "Nuevo Centro de Objetos de Costo"}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Código</Label>
              <Input
                placeholder="COC-0001"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Tipo</Label>
              <Select
                value={centerType}
                onValueChange={(v) =>
                  setCenterType(v as "agrupador" | "totalizador")
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="agrupador">Agrupador</SelectItem>
                  <SelectItem value="totalizador">Totalizador</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <Label>Nombre</Label>
            <Input
              placeholder="Nombre del centro de objetos de costo"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label>Centro padre (opcional)</Label>
            <Select value={parentId} onValueChange={setParentId}>
              <SelectTrigger>
                <SelectValue placeholder="Sin padre (raíz)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Sin padre (raíz)</SelectItem>
                {availableParents.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.code} — {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Nota (opcional)</Label>
            <Textarea
              placeholder="Nota o descripción adicional"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={2}
            />
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            {editingCenter ? "Guardar Cambios" : "Crear Centro"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/* ───── Cost Object Tree View (with drag & drop) ───── */
function CostObjectTreeView({
  costObjects,
  centers,
  onDeleteCostObject,
  onEditCostObject,
  onDeleteCenter,
  onEditCenter,
  onMoveCostObject,
  onMoveCenter,
  receivedMap,
  centerReceivedMap,
}: {
  costObjects: {
    id: string;
    code: string;
    name: string;
    amount: number;
    type?: string;
    category?: string | null;
    center_id?: string | null;
    price?: number | null;
  }[];
  centers: CostObjectCenter[];
  onDeleteCostObject: (id: string) => void;
  onEditCostObject: (item: any) => void;
  onDeleteCenter: (id: string) => void;
  onEditCenter: (center: CostObjectCenter) => void;
  onMoveCostObject: (costObjectId: string, centerId: string | null) => void;
  onMoveCenter: (centerId: string, newParentId: string | null) => void;
  receivedMap?: Record<string, number>;
  centerReceivedMap?: Record<string, number>;
}) {
  const { selectedModel } = useModelContext();
  const currencySymbol = getCurrencySymbol(selectedModel?.base_currency);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [draggingType, setDraggingType] = useState<
    "cost_object" | "center" | null
  >(null);
  const [dropTargetId, setDropTargetId] = useState<string | null>(null);
  const dragCounterRef = useRef<Record<string, number>>({});
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const deleteCostObject = deleteConfirmId
    ? costObjects.find((o) => o.id === deleteConfirmId)
    : null;
  const [deleteCenterConfirmId, setDeleteCenterConfirmId] = useState<
    string | null
  >(null);
  const deleteCenterItem = deleteCenterConfirmId
    ? centers.find((c) => c.id === deleteCenterConfirmId)
    : null;

  const toggleExpand = (id: string) => {
    setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const rootCenters = centers.filter((c) => !c.parent_id);
  const getChildCenters = (parentId: string) =>
    centers.filter((c) => c.parent_id === parentId);
  const getCostObjects = (centerId: string) =>
    costObjects.filter((o) => o.center_id === centerId);
  const orphanCostObjects = costObjects.filter((o) => !o.center_id);

  const sortedGetCostObjects = (centerId: string) =>
    getCostObjects(centerId)
      .slice()
      .sort((a, b) => (a.code || "").localeCompare(b.code || ""));
  const sortedOrphanCostObjects = orphanCostObjects
    .slice()
    .sort((a, b) => (a.code || "").localeCompare(b.code || ""));

  const getCenterReceivedInCenter = (centerId: string): number => {
    const directCenterReceived = centerReceivedMap?.[centerId] || 0;
    const childCenterReceived = getChildCenters(centerId).reduce(
      (s, c) => s + getCenterReceivedInCenter(c.id),
      0,
    );
    return directCenterReceived + childCenterReceived;
  };

  const getCenterReceived = (centerId: string): number => {
    const objectsReceived = getCostObjects(centerId).reduce(
      (s, o) => s + (receivedMap?.[o.id] || 0),
      0,
    );
    const childReceived = getChildCenters(centerId).reduce(
      (s, c) => s + getCenterReceived(c.id),
      0,
    );
    return objectsReceived + childReceived;
  };

  const getCenterTotal = (centerId: string): number => {
    const objectsTotal = getCostObjects(centerId).reduce(
      (s, o) => s + o.amount + (receivedMap?.[o.id] || 0),
      0,
    );
    const childTotal = getChildCenters(centerId).reduce(
      (s, c) => s + getCenterTotal(c.id),
      0,
    );
    const centerRcvd = centerReceivedMap?.[centerId] || 0;
    return objectsTotal + childTotal + centerRcvd;
  };

  const getCenterSales = (centerId: string): number => {
    const objectsSales = getCostObjects(centerId).reduce(
      (s, o) => s + (o.price || 0),
      0,
    );
    const childSales = getChildCenters(centerId).reduce(
      (s, c) => s + getCenterSales(c.id),
      0,
    );
    return objectsSales + childSales;
  };

  const getCenterObjectCount = (centerId: string): number => {
    const directCount = getCostObjects(centerId).length;
    const childCount = getChildCenters(centerId).reduce(
      (s, c) => s + getCenterObjectCount(c.id),
      0,
    );
    return directCount + childCount;
  };

  const deleteCenterHasContent = deleteCenterConfirmId
    ? getCenterObjectCount(deleteCenterConfirmId) > 0 ||
      centers.some((c) => c.parent_id === deleteCenterConfirmId)
    : false;

  const getDescendantCenterIds = (centerId: string): Set<string> => {
    const ids = new Set<string>();
    const queue = [centerId];
    while (queue.length > 0) {
      const current = queue.shift()!;
      ids.add(current);
      for (const c of centers) {
        if (c.parent_id === current && !ids.has(c.id)) {
          queue.push(c.id);
        }
      }
    }
    return ids;
  };

  const handleDragStart = (
    e: React.DragEvent,
    itemId: string,
    type: "cost_object" | "center" = "cost_object",
  ) => {
    setDraggingId(itemId);
    setDraggingType(type);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", itemId);
    e.dataTransfer.setData("application/x-drag-type", type);
  };

  const handleDragEnd = () => {
    setDraggingId(null);
    setDraggingType(null);
    setDropTargetId(null);
    dragCounterRef.current = {};
  };

  const isInvalidDropTarget = (targetId: string | null) => {
    if (!draggingId) return false;
    if (draggingType === "cost_object") {
      const o = costObjects.find((obj) => obj.id === draggingId);
      if (!o) return false;
      return (o.center_id || null) === targetId;
    }
    if (draggingType === "center") {
      if (draggingId === targetId) return true;
      if (targetId && getDescendantCenterIds(draggingId).has(targetId))
        return true;
      const c = centers.find((ctr) => ctr.id === draggingId);
      if (!c) return false;
      return (c.parent_id || null) === targetId;
    }
    return false;
  };

  const handleDragEnter = (e: React.DragEvent, targetId: string | null) => {
    e.preventDefault();
    const key = targetId ?? "__orphan__";
    dragCounterRef.current[key] = (dragCounterRef.current[key] || 0) + 1;
    if (dropTargetId !== targetId) setDropTargetId(targetId);
  };

  const handleDragOver = (e: React.DragEvent, targetId?: string | null) => {
    e.preventDefault();
    e.dataTransfer.dropEffect =
      targetId !== undefined && isInvalidDropTarget(targetId) ? "none" : "move";
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
    const itemType =
      e.dataTransfer.getData("application/x-drag-type") || "cost_object";
    if (!itemId) return;

    if (itemType === "center") {
      const center = centers.find((c) => c.id === itemId);
      if (!center) return;
      if ((center.parent_id || null) === targetCenterId) return;
      if (targetCenterId && getDescendantCenterIds(itemId).has(targetCenterId))
        return;
      onMoveCenter(itemId, targetCenterId);
    } else {
      const obj = costObjects.find((o) => o.id === itemId);
      if (!obj) return;
      if ((obj.center_id || null) === targetCenterId) return;
      onMoveCostObject(itemId, targetCenterId);
    }

    if (targetCenterId) {
      setExpanded((prev) => ({ ...prev, [targetCenterId]: true }));
    }

    setDraggingId(null);
    setDraggingType(null);
    setDropTargetId(null);
  };

  const renderCostObjectRow = (
    item: (typeof costObjects)[0],
    depth: number,
    parentLineLeft?: number,
  ) => {
    const subtype = item.type || "";
    const label = subtypeLabels[subtype] || subtype || "—";
    const color = subtypeColors[subtype] || "bg-primary/10 text-primary";
    const received = receivedMap?.[item.id] || 0;
    const totalCost = item.amount + received;
    const isDragging = draggingId === item.id;

    return (
      <div
        key={item.id}
        draggable
        onDragStart={(e) => handleDragStart(e, item.id)}
        onDragEnd={handleDragEnd}
        className={`flex items-center gap-2 py-2 px-3 border-b border-border/30 cursor-grab active:cursor-grabbing transition-opacity ${isDragging ? "opacity-30" : "hover:bg-muted/50"}`}
        style={{
          paddingLeft: `${parentLineLeft !== undefined ? parentLineLeft + 16 : depth * 24 + 12}px`,
        }}
      >
        <div className="w-4 flex items-center justify-center shrink-0">
          <svg
            className="h-3 w-3 text-muted-foreground/50"
            viewBox="0 0 6 10"
            fill="currentColor"
          >
            <circle cx="1" cy="1" r="1" />
            <circle cx="5" cy="1" r="1" />
            <circle cx="1" cy="5" r="1" />
            <circle cx="5" cy="5" r="1" />
            <circle cx="1" cy="9" r="1" />
            <circle cx="5" cy="9" r="1" />
          </svg>
        </div>
        <span className="w-4 shrink-0" />
        <div className="flex flex-col flex-1 min-w-0">
          <span className="font-mono text-sm text-muted-foreground leading-tight">
            {item.code}
          </span>
          <span className="text-sm truncate" title={item.name}>
            {item.name}
          </span>
        </div>
        <Badge
          variant="secondary"
          className={`${color} w-24 justify-center text-[10px]`}
        >
          {label}
        </Badge>
        <Badge
          variant="secondary"
          className={`${categoryColors[item.category || ""] || "bg-muted/50 text-muted-foreground"} w-28 justify-center text-[10px] truncate`}
          title={item.category || undefined}
        >
          {item.category || "—"}
        </Badge>
        <span className="font-mono text-sm w-28 text-right">
          {item.amount.toLocaleString("en-US", { minimumFractionDigits: 2 })}
        </span>
        <span className="font-mono text-sm w-36 text-right text-blue-500/70">
          0.00
        </span>
        <span className="font-mono text-sm w-28 text-right text-muted-foreground">
          {received.toLocaleString("en-US", { minimumFractionDigits: 2 })}
        </span>
        <span className="font-mono text-sm w-28 text-right font-medium">
          {totalCost.toLocaleString("en-US", { minimumFractionDigits: 2 })}
        </span>
        <span className="font-mono text-sm w-28 text-right text-primary">
          {item.price?.toLocaleString("en-US", {
            minimumFractionDigits: 2,
          }) || "0.00"}
        </span>
        <span className="w-28" />
        <div className="flex gap-1 w-20 justify-end shrink-0">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-muted-foreground hover:text-primary"
            onClick={() => onEditCostObject(item)}
          >
            <Edit2 className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-muted-foreground hover:text-destructive"
            onClick={() => setDeleteConfirmId(item.id)}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    );
  };

  const renderCenter = (
    center: CostObjectCenter,
    depth: number,
    parentLineLeft?: number,
  ) => {
    const isExpanded = expanded[center.id] ?? true;
    const childCenters = getChildCenters(center.id);
    const centerObjects = sortedGetCostObjects(center.id);
    const finalTotal = getCenterTotal(center.id);
    const finalReceivedInCenter = getCenterReceivedInCenter(center.id);
    const finalReceived = getCenterReceived(center.id);
    const finalSales = getCenterSales(center.id);
    const totalAmount = getCostObjects(center.id).reduce((s, o) => s + o.amount, 0) +
                       getChildCenters(center.id).reduce((s, c) => s + getCenterTotal(c.id), 0);
    // Note: totalAmount in center view usually shows the sum of direct amounts of children.
    // However, to keep it consistent with the "Total" column:
    const centerDirectAmount = getCostObjects(center.id).reduce((s, o) => s + o.amount, 0) +
                              getChildCenters(center.id).reduce((s, c) => s + getCostObjects(c.id).reduce((sum, obj) => sum + obj.amount, 0), 0);
    
    const objectCount = getCenterObjectCount(center.id);
    const hasChildren = childCenters.length > 0 || centerObjects.length > 0;
    const centerTypeLabel =
      center.type === "agrupador" ? "Agrupador" : "Totalizador";
    const centerTypeColor =
      center.type === "agrupador"
        ? "bg-sky-500/10 text-sky-600"
        : "bg-orange-500/10 text-orange-600";
    const isDropTarget =
      draggingId &&
      dropTargetId === center.id &&
      !isInvalidDropTarget(center.id);
    const isSubcenter = !!center.parent_id;
    const isDraggingThis =
      draggingId === center.id && draggingType === "center";

    return (
      <div
        key={center.id}
        onDragEnter={(e) => {
          e.stopPropagation();
          handleDragEnter(e, center.id);
        }}
        onDragOver={(e) => {
          e.stopPropagation();
          handleDragOver(e, center.id);
        }}
        onDragLeave={(e) => {
          e.stopPropagation();
          handleDragLeave(e, center.id);
        }}
        onDrop={(e) => handleDrop(e, center.id)}
      >
        <div
          draggable={isSubcenter}
          onDragStart={
            isSubcenter
              ? (e) => {
                  e.stopPropagation();
                  handleDragStart(e, center.id, "center");
                }
              : undefined
          }
          onDragEnd={isSubcenter ? handleDragEnd : undefined}
          className={`flex items-center gap-2 py-2.5 px-3 border-b border-border/50 transition-colors ${isDraggingThis ? "opacity-30" : ""} ${isDropTarget ? "bg-primary/15 ring-2 ring-primary/40 ring-inset" : "hover:bg-muted bg-muted"} ${isSubcenter ? "cursor-grab active:cursor-grabbing" : "cursor-pointer"}`}
          style={{
            paddingLeft: `${parentLineLeft !== undefined ? parentLineLeft + 16 : depth * 24 + 12}px`,
          }}
          onClick={() => toggleExpand(center.id)}
        >
          {isSubcenter && (
            <div className="w-4 flex items-center justify-center shrink-0">
              <svg
                className="h-3 w-3 text-muted-foreground/50"
                viewBox="0 0 6 10"
                fill="currentColor"
              >
                <circle cx="1" cy="1" r="1" />
                <circle cx="5" cy="1" r="1" />
                <circle cx="1" cy="5" r="1" />
                <circle cx="5" cy="5" r="1" />
                <circle cx="1" cy="9" r="1" />
                <circle cx="5" cy="9" r="1" />
              </svg>
            </div>
          )}
          <span className="w-4 flex items-center justify-center shrink-0">
            {hasChildren ? (
              isExpanded ? (
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              ) : (
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              )
            ) : (
              <span className="w-4" />
            )}
          </span>
          {isDropTarget ? (
            <FolderOpen className="h-4 w-4 text-primary shrink-0" />
          ) : isExpanded ? (
            <FolderOpen className="h-4 w-4 text-amber-500 shrink-0" />
          ) : (
            <Folder className="h-4 w-4 text-amber-500 shrink-0" />
          )}
          <span className="font-mono text-xs text-muted-foreground w-20 shrink-0">
            {center.code}
          </span>
          <span
            className="text-sm font-semibold flex-1 truncate"
            title={center.note || undefined}
          >
            {center.name}
            <span className="text-xs font-normal text-muted-foreground ml-2">
              {objectCount} objeto{objectCount !== 1 ? "s" : ""}
            </span>
          </span>
          <Badge
            variant="secondary"
            className={`${centerTypeColor} w-24 justify-center text-[10px]`}
          >
            {centerTypeLabel}
          </Badge>
          <span className="w-28" />
          <span className="font-mono text-sm w-28 text-right font-medium">
            {totalAmount.toLocaleString("en-US", { minimumFractionDigits: 2 })}
          </span>
          <span className="font-mono text-sm w-36 text-right text-blue-500">
            {finalReceivedInCenter.toLocaleString("en-US", { minimumFractionDigits: 2 })}
          </span>
          <span className="font-mono text-sm w-28 text-right text-muted-foreground">
            {finalReceived.toLocaleString("en-US", { minimumFractionDigits: 2 })}
          </span>
          <span className="font-mono text-sm w-28 text-right font-semibold">
            {finalTotal.toLocaleString("en-US", { minimumFractionDigits: 2 })}
          </span>
          <span className="font-mono text-sm w-28 text-right text-primary font-medium">
            {finalSales.toLocaleString("en-US", { minimumFractionDigits: 2 })}
          </span>
          <span className="w-28" />
          <div
            className="flex gap-1 w-20 justify-end shrink-0"
            onClick={(e) => e.stopPropagation()}
          >
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-muted-foreground hover:text-primary"
              onClick={() => onEditCenter(center)}
            >
              <Edit2 className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-muted-foreground hover:text-destructive"
              onClick={() => setDeleteCenterConfirmId(center.id)}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>

        {isExpanded &&
          (() => {
            const myPadding =
              parentLineLeft !== undefined
                ? parentLineLeft + 16
                : depth * 24 + 12;
            const lineLeft = myPadding + (isSubcenter ? 24 : 0) + 8;
            return (
              <div className="relative">
                <div
                  className="absolute top-0 bottom-0 w-px bg-muted-foreground/40"
                  style={{ left: `${lineLeft}px` }}
                />
                {childCenters.map((child) =>
                  renderCenter(child, depth + 1, lineLeft),
                )}
                {centerObjects.map((o) =>
                  renderCostObjectRow(o, depth + 1, lineLeft),
                )}
                {centerObjects.length === 0 && childCenters.length === 0 && (
                  <div
                    className={`py-4 text-center text-xs border-b border-border/30 transition-colors ${isDropTarget ? "text-primary bg-primary/5" : "text-muted-foreground/50"}`}
                    style={{ paddingLeft: `${lineLeft + 16}px` }}
                  >
                    {isDropTarget
                      ? "Soltar aquí"
                      : "Arrastra objetos de costo aquí"}
                  </div>
                )}
              </div>
            );
          })()}
      </div>
    );
  };

  if (centers.length === 0 && costObjects.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
        <p className="text-sm">No hay items todavía</p>
        <p className="text-xs mt-1">
          Agrega tu primer centro u objeto de costo con los botones de arriba
        </p>
      </div>
    );
  }

  const draggingObjectOrphan = draggingId
    ? costObjects.find((o) => o.id === draggingId)
    : null;
  const isAlreadyOrphan =
    draggingObjectOrphan && !draggingObjectOrphan.center_id;
  const isOrphanDropTarget =
    draggingId && dropTargetId === "__orphan__" && !isAlreadyOrphan;

  return (
    <div className="overflow-x-auto">
    <div className="text-sm min-w-[1280px]">
      <div className="flex items-center gap-2 py-2 px-3 border-b border-border bg-muted/40 text-xs font-medium text-muted-foreground">
        <span className="w-4" />
        <span className="w-4" />
        <span className="flex-1">Código / Nombre</span>
        <span className="w-24 text-center">Tipo</span>
        <span className="w-28 text-center">Categoría</span>
        <span className="w-28 text-right">C. Directo ({currencySymbol})</span>
        <span className="w-36 text-right text-blue-500/70">Recibido en centro ({currencySymbol})</span>
        <span className="w-28 text-right">Recibido ({currencySymbol})</span>
        <span className="w-28 text-right">Total ({currencySymbol})</span>
        <span className="w-28 text-right text-primary">Ventas ({currencySymbol})</span>
        <span className="w-28 text-right text-muted-foreground/50" />
        <span className="w-20" />
      </div>

      {rootCenters.map((center) => renderCenter(center, 0))}

      {(orphanCostObjects.length > 0 || (draggingId && centers.length > 0)) && (
        <div
          onDragEnter={(e) => handleDragEnter(e, null)}
          onDragOver={(e) => handleDragOver(e, null)}
          onDragLeave={(e) => handleDragLeave(e, null)}
          onDrop={(e) => handleDrop(e, null)}
        >
          {rootCenters.length > 0 && (
            <div
              className={`flex items-center gap-2 py-2 px-3 border-b border-border/50 transition-colors ${isOrphanDropTarget ? "bg-primary/10 ring-2 ring-primary/40 ring-inset" : "bg-muted/10"}`}
            >
              <span className="text-xs text-muted-foreground italic">
                {isOrphanDropTarget
                  ? "Soltar para quitar del centro"
                  : "Sin centro asignado"}
              </span>
            </div>
          )}
          {sortedOrphanCostObjects.map((o) => renderCostObjectRow(o, 0))}
        </div>
      )}

      <AlertDialog
        open={!!deleteConfirmId}
        onOpenChange={(open) => {
          if (!open) setDeleteConfirmId(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Eliminar objeto de costo
            </AlertDialogTitle>
            <AlertDialogDescription>
              ¿Está seguro de eliminar el objeto de costo{" "}
              <strong>{deleteCostObject?.name}</strong>?
              <br />
              <br />
              Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (deleteConfirmId) onDeleteCostObject(deleteConfirmId);
                setDeleteConfirmId(null);
              }}
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={!!deleteCenterConfirmId}
        onOpenChange={(open) => {
          if (!open) setDeleteCenterConfirmId(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Eliminar centro de objetos de costo
            </AlertDialogTitle>
            <AlertDialogDescription>
              {deleteCenterHasContent ? (
                <>
                  No se puede eliminar el centro{" "}
                  <strong>{deleteCenterItem?.name}</strong> porque contiene
                  objetos de costo o subcentros.
                  <br />
                  <br />
                  Primero debe mover o eliminar todos los objetos y subcentros
                  que contiene.
                </>
              ) : (
                <>
                  ¿Está seguro de eliminar el centro{" "}
                  <strong>{deleteCenterItem?.name}</strong>?
                  <br />
                  <br />
                  Esta acción no se puede deshacer.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>
              {deleteCenterHasContent ? "Cerrar" : "Cancelar"}
            </AlertDialogCancel>
            {!deleteCenterHasContent && (
              <AlertDialogAction
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                onClick={() => {
                  if (deleteCenterConfirmId)
                    onDeleteCenter(deleteCenterConfirmId);
                  setDeleteCenterConfirmId(null);
                }}
              >
                Eliminar
              </AlertDialogAction>
            )}
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
    </div>
  );
}

/* ───── Table ───── */
function DictionaryTable({
  items,
  dictType,
  onDelete,
  onEdit,
  allocatedMap,
  receivedMap,
}: {
  items: {
    id: string;
    code: string;
    name: string;
    amount: number;
    type?: string;
    category?: string | null;
  }[];
  dictType: "resource" | "activity" | "cost_object";
  onDelete: (id: string) => void;
  onEdit: (item: any) => void;
  allocatedMap?: Record<string, number>;
  receivedMap?: Record<string, number>;
}) {
  const groupColors: Record<string, string> = {
    resource: "bg-primary/10 text-primary",
    activity: "bg-warning/10 text-warning",
    cost_object: "bg-success/10 text-success",
  };

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
        <p className="text-sm">No hay items todavía</p>
        <p className="text-xs mt-1">
          Agrega tu primer item con el botón de arriba
        </p>
      </div>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-24">Código</TableHead>
          <TableHead>Nombre</TableHead>
          <TableHead className="text-right">
            {dictType === "resource" ? "Monto ($)" : "Costo Directo ($)"}
          </TableHead>
          {(dictType === "activity" || dictType === "cost_object") && (
            <>
              <TableHead className="text-right w-28">Recibido ($)</TableHead>
              <TableHead className="text-right w-28">Total ($)</TableHead>
            </>
          )}
          {(dictType === "resource" || dictType === "activity") && (
            <>
              <TableHead className="text-right w-28">Asignado ($)</TableHead>
              <TableHead className="text-right w-28">Restante ($)</TableHead>
            </>
          )}
          <TableHead className="w-28">Tipo</TableHead>
          {dictType === "resource" && (
            <TableHead className="w-28">Categoría</TableHead>
          )}
          <TableHead className="w-12" />
        </TableRow>
      </TableHeader>
      <TableBody>
        {items.map((item) => {
          const subtype = item.type || "";
          const label = subtypeLabels[subtype] || subtype || "—";
          const color = subtypeColors[subtype] || groupColors[dictType];
          return (
            <TableRow key={item.id}>
              <TableCell className="font-mono text-xs">{item.code}</TableCell>
              <TableCell className="font-medium">{item.name}</TableCell>
              <TableCell className="text-right font-mono">
                {item.amount.toLocaleString("en-US", {
                  minimumFractionDigits: 2,
                })}
              </TableCell>
              {(dictType === "activity" || dictType === "cost_object") && (
                <>
                  <TableCell className="text-right font-mono text-muted-foreground">
                    {(receivedMap?.[item.id] || 0).toLocaleString("en-US", {
                      minimumFractionDigits: 2,
                    })}
                  </TableCell>
                  <TableCell className="text-right font-mono font-medium">
                    {(
                      item.amount + (receivedMap?.[item.id] || 0)
                    ).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                  </TableCell>
                </>
              )}
              {(dictType === "resource" || dictType === "activity") && (
                <>
                  <TableCell className="text-right font-mono text-muted-foreground">
                    {(allocatedMap?.[item.id] || 0).toLocaleString("en-US", {
                      minimumFractionDigits: 2,
                    })}
                  </TableCell>
                  <TableCell className="text-right font-mono">
                    <span
                      className={
                        item.amount +
                          (receivedMap?.[item.id] || 0) -
                          (allocatedMap?.[item.id] || 0) <
                        -0.01 // Small margin for floating point
                          ? "text-destructive font-medium"
                          : Math.abs(
                                item.amount +
                                  (receivedMap?.[item.id] || 0) -
                                  (allocatedMap?.[item.id] || 0),
                              ) < 0.01
                            ? "text-green-600 font-medium"
                            : "text-amber-600 font-medium"
                      }
                    >
                      {(
                        item.amount +
                        (receivedMap?.[item.id] || 0) -
                        (allocatedMap?.[item.id] || 0)
                      ).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                    </span>
                  </TableCell>
                </>
              )}
              <TableCell>
                <Badge variant="secondary" className={color}>
                  {label}
                </Badge>
              </TableCell>
              {dictType === "resource" && (
                <TableCell className="text-xs text-muted-foreground">
                  {item.category || "—"}
                </TableCell>
              )}
              <TableCell>
                <div className="flex justify-end gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-muted-foreground hover:text-primary"
                    onClick={() => onEdit(item)}
                  >
                    <Edit2 className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-muted-foreground hover:text-destructive"
                    onClick={() => onDelete(item.id)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}

/* ───── Page ───── */
const DictionariesPage = () => {
  const { toast } = useToast();
  const { selectedModel } = useModelContext();
  const currencySymbol = getCurrencySymbol(selectedModel?.base_currency);
  const resources = useResources();
  const activities = useActivities();
  const costObjects = useCostObjects();
  const costCenters = useCostCenters();
  const activityCenters = useActivityCenters();
  const costObjectCenters = useCostObjectCenters();
  const allocation = useAllocation();
  const [activeTab, setActiveTab] = useState("resources");
  const [editingItem, setEditingItem] = useState<{
    id: string;
    type: string;
    item: any;
  } | null>(null);
  const [editingCenter, setEditingCenter] = useState<CostCenter | null>(null);
  const [editingActivityCenter, setEditingActivityCenter] =
    useState<ActivityCenter | null>(null);
  const [editingCostObjectCenter, setEditingCostObjectCenter] =
    useState<CostObjectCenter | null>(null);

  const resourceAllocatedMap = React.useMemo(() => {
    const map: Record<string, number> = {};
    for (const alloc of allocation.allocations) {
      if (alloc.source_type === "resource" || alloc.source_type === "resource_center") {
        map[alloc.source_id] =
          (map[alloc.source_id] || 0) + alloc.allocated_amount;
      }
    }
    return map;
  }, [allocation.allocations]);

  const activityAllocatedMap = React.useMemo(() => {
    const map: Record<string, number> = {};
    for (const alloc of allocation.allocations) {
      if (alloc.source_type === "activity" || alloc.source_type === "activity_center") {
        map[alloc.source_id] =
          (map[alloc.source_id] || 0) + alloc.allocated_amount;
      }
    }
    return map;
  }, [allocation.allocations]);

  const resourceReceivedMap = React.useMemo(() => {
    return allocation.resourceReceived ?? {};
  }, [allocation.resourceReceived]);

  const resourceCenterReceivedMap = React.useMemo(() => {
    return allocation.resourceCenterReceived ?? {};
  }, [allocation.resourceCenterReceived]);

  const activityReceivedMap = React.useMemo(() => {
    const map: Record<string, number> = {};
    for (const sum of allocation.activitySummaries) {
      map[sum.id] = sum.received_amount;
    }
    return map;
  }, [allocation.activitySummaries]);

  const activityCenterReceivedMap = React.useMemo(() => {
    return allocation.activityCenterReceived ?? {};
  }, [allocation.activityCenterReceived]);

  const costObjectReceivedMap = React.useMemo(() => {
    const map: Record<string, number> = {};
    for (const sum of allocation.costObjectSummaries) {
      map[sum.id] = sum.received_amount;
    }
    return map;
  }, [allocation.costObjectSummaries]);

  const costObjectCenterReceivedMap = React.useMemo(() => {
    return allocation.costObjectCenterReceived ?? {};
  }, [allocation.costObjectCenterReceived]);

  // ── Grand totals for each tab ──
  const resourcesGrandTotal = React.useMemo(() => {
    const items = resources.items;
    const ctrs = costCenters.items;
    const rcvMap = resourceReceivedMap;
    const ctrRcvMap = resourceCenterReceivedMap;

    const getRes = (cId: string) => items.filter((r) => r.center_id === cId);
    const getChildren = (pId: string) => ctrs.filter((c) => c.parent_id === pId);
    const getCTotal = (cId: string): number => {
      const direct = getRes(cId).reduce((s, r) => s + r.amount + (rcvMap[r.id] || 0), 0);
      const child = getChildren(cId).reduce((s, c) => s + getCTotal(c.id), 0);
      return direct + child + (ctrRcvMap[cId] || 0);
    };
    const rootCtrs = ctrs.filter((c) => !c.parent_id);
    const centersTotal = rootCtrs.reduce((s, c) => s + getCTotal(c.id), 0);
    const orphanTotal = items
      .filter((r) => !r.center_id)
      .reduce((s, r) => s + r.amount + (rcvMap[r.id] || 0), 0);
    return centersTotal + orphanTotal;
  }, [resources.items, costCenters.items, resourceReceivedMap, resourceCenterReceivedMap]);

  const activitiesGrandTotal = React.useMemo(() => {
    const items = activities.items;
    const ctrs = activityCenters.items;
    const rcvMap = activityReceivedMap;
    const ctrRcvMap = activityCenterReceivedMap;

    const getAct = (cId: string) => items.filter((a) => a.center_id === cId);
    const getChildren = (pId: string) => ctrs.filter((c) => c.parent_id === pId);
    const getCTotal = (cId: string): number => {
      const direct = getAct(cId).reduce((s, a) => s + a.amount + (rcvMap[a.id] || 0), 0);
      const child = getChildren(cId).reduce((s, c) => s + getCTotal(c.id), 0);
      return direct + child + (ctrRcvMap[cId] || 0);
    };
    const rootCtrs = ctrs.filter((c) => !c.parent_id);
    const centersTotal = rootCtrs.reduce((s, c) => s + getCTotal(c.id), 0);
    const orphanTotal = items
      .filter((a) => !a.center_id)
      .reduce((s, a) => s + a.amount + (rcvMap[a.id] || 0), 0);
    return centersTotal + orphanTotal;
  }, [activities.items, activityCenters.items, activityReceivedMap, activityCenterReceivedMap]);

  const costObjectsGrandTotal = React.useMemo(() => {
    const items = costObjects.items;
    const ctrs = costObjectCenters.items;
    const rcvMap = costObjectReceivedMap;
    const ctrRcvMap = costObjectCenterReceivedMap;

    const getObj = (cId: string) => items.filter((o) => o.center_id === cId);
    const getChildren = (pId: string) => ctrs.filter((c) => c.parent_id === pId);
    const getCTotal = (cId: string): number => {
      const direct = getObj(cId).reduce((s, o) => s + o.amount + (rcvMap[o.id] || 0), 0);
      const child = getChildren(cId).reduce((s, c) => s + getCTotal(c.id), 0);
      return direct + child + (ctrRcvMap[cId] || 0);
    };
    const rootCtrs = ctrs.filter((c) => !c.parent_id);
    const centersTotal = rootCtrs.reduce((s, c) => s + getCTotal(c.id), 0);
    const orphanTotal = items
      .filter((o) => !o.center_id)
      .reduce((s, o) => s + o.amount + (rcvMap[o.id] || 0), 0);
    return centersTotal + orphanTotal;
  }, [costObjects.items, costObjectCenters.items, costObjectReceivedMap, costObjectCenterReceivedMap]);

  const handleEdit = (item: any, type: string) => {
    setEditingItem({ id: item.id, type, item });
  };

  const handleUpdate = async (
    hook: any,
    id: string,
    data: any,
    label: string,
  ) => {
    try {
      await hook.update.mutateAsync({ id, ...data } as never);
      toast({
        title: `${label} actualizado`,
        description: `${data.name} actualizado correctamente.`,
      });
      setEditingItem(null);
    } catch (err: unknown) {
      toast({
        variant: "destructive",
        title: "Error",
        description: (err as Error).message,
      });
    }
  };

  const handleCreate = async (
    hook: any,
    item: Record<string, unknown>,
    label: string,
  ) => {
    try {
      await hook.create.mutateAsync(item as never);
      toast({
        title: `${label} creado`,
        description: `${item.name} agregado correctamente.`,
      });
    } catch (err: unknown) {
      toast({
        variant: "destructive",
        title: "Error",
        description: (err as Error).message,
      });
    }
  };

  const handleDelete = async (hook: any, id: string, label: string) => {
    try {
      await hook.remove.mutateAsync(id);
      toast({ title: `${label} eliminado` });
    } catch (err: unknown) {
      toast({
        variant: "destructive",
        title: "Error",
        description: (err as Error).message,
      });
    }
  };

  const handleExcelImport = async (rows: ParsedRow[]) => {
    const hook =
      activeTab === "resources"
        ? resources
        : activeTab === "activities"
          ? activities
          : costObjects;
    const label =
      activeTab === "resources"
        ? "Recurso"
        : activeTab === "activities"
          ? "Actividad"
          : "Objeto";

    let success = 0;
    let failed = 0;

    for (const row of rows) {
      try {
        const item: Record<string, unknown> = {
          code: row.codigo,
          name: row.nombre,
          amount: row.monto,
        };

        if (activeTab === "resources") {
          if (row.categoria) item.category = row.categoria;
          item.type = row.tipo || "indirecto";
        }
        if (
          (activeTab === "activities" || activeTab === "objects") &&
          row.tipo
        ) {
          item.type = row.tipo;
        }
        // Set defaults for type if not provided
        if (activeTab === "activities" && !item.type) {
          item.type = "operative";
        }
        if (activeTab === "objects" && !item.type) {
          item.type = "product";
        }

        await hook.create.mutateAsync(item as never);
        success++;
      } catch {
        failed++;
      }
    }

    if (success > 0) {
      toast({
        title: "Importación completada",
        description: `${success} ${label}(s) importados correctamente.${failed > 0 ? ` ${failed} fallaron (código duplicado u otro error).` : ""}`,
      });
    } else {
      toast({
        variant: "destructive",
        title: "Importación fallida",
        description: `Ningún registro pudo importarse. Verifica que los códigos no estén duplicados.`,
      });
    }
  };

  const handleCreateCenter = async (item: Record<string, unknown>) => {
    try {
      // Fix "none" parent_id to null
      if (item.parent_id === "none") item.parent_id = null;
      await costCenters.create.mutateAsync(item as never);
      toast({
        title: "Centro creado",
        description: `${item.name} agregado correctamente.`,
      });
    } catch (err: unknown) {
      toast({
        variant: "destructive",
        title: "Error",
        description: (err as Error).message,
      });
    }
  };

  const handleUpdateCenter = async (
    center: CostCenter,
    data: Record<string, unknown>,
  ) => {
    try {
      if (data.parent_id === "none") data.parent_id = null;
      await costCenters.update.mutateAsync({ id: center.id, ...data } as never);
      toast({ title: "Centro actualizado" });
      setEditingCenter(null);
    } catch (err: unknown) {
      toast({
        variant: "destructive",
        title: "Error",
        description: (err as Error).message,
      });
    }
  };

  const handleDeleteCenter = async (id: string) => {
    try {
      await costCenters.remove.mutateAsync(id);
      toast({ title: "Centro eliminado" });
    } catch (err: unknown) {
      toast({
        variant: "destructive",
        title: "Error",
        description: (err as Error).message,
      });
    }
  };

  const handleMoveResource = async (
    resourceId: string,
    centerId: string | null,
  ) => {
    try {
      await resources.update.mutateAsync({
        id: resourceId,
        center_id: centerId,
      } as never);
      const resource = resources.items.find((r) => r.id === resourceId);
      const center = centerId
        ? costCenters.items.find((c) => c.id === centerId)
        : null;
      toast({
        title: "Recurso movido",
        description: center
          ? `${resource?.name} movido a ${center.name}`
          : `${resource?.name} removido del centro`,
      });
    } catch (err: unknown) {
      toast({
        variant: "destructive",
        title: "Error",
        description: (err as Error).message,
      });
    }
  };

  const handleMoveCenter = async (
    centerId: string,
    newParentId: string | null,
  ) => {
    try {
      await costCenters.update.mutateAsync({
        id: centerId,
        parent_id: newParentId,
      } as never);
      const center = costCenters.items.find((c) => c.id === centerId);
      const parent = newParentId
        ? costCenters.items.find((c) => c.id === newParentId)
        : null;
      toast({
        title: "Centro movido",
        description: parent
          ? `${center?.name} movido a ${parent.name}`
          : `${center?.name} movido a la raíz`,
      });
    } catch (err: unknown) {
      toast({
        variant: "destructive",
        title: "Error",
        description: (err as Error).message,
      });
    }
  };

  const handleCreateActivityCenter = async (item: Record<string, unknown>) => {
    try {
      if (item.parent_id === "none") item.parent_id = null;
      await activityCenters.create.mutateAsync(item as never);
      toast({
        title: "Centro de actividades creado",
        description: `${item.name} agregado correctamente.`,
      });
    } catch (err: unknown) {
      toast({
        variant: "destructive",
        title: "Error",
        description: (err as Error).message,
      });
    }
  };

  const handleUpdateActivityCenter = async (
    center: ActivityCenter,
    data: Record<string, unknown>,
  ) => {
    try {
      if (data.parent_id === "none") data.parent_id = null;
      await activityCenters.update.mutateAsync({
        id: center.id,
        ...data,
      } as never);
      toast({ title: "Centro de actividades actualizado" });
      setEditingActivityCenter(null);
    } catch (err: unknown) {
      toast({
        variant: "destructive",
        title: "Error",
        description: (err as Error).message,
      });
    }
  };

  const handleDeleteActivityCenter = async (id: string) => {
    try {
      await activityCenters.remove.mutateAsync(id);
      toast({ title: "Centro de actividades eliminado" });
    } catch (err: unknown) {
      toast({
        variant: "destructive",
        title: "Error",
        description: (err as Error).message,
      });
    }
  };

  const handleMoveActivity = async (
    activityId: string,
    centerId: string | null,
  ) => {
    try {
      await activities.update.mutateAsync({
        id: activityId,
        center_id: centerId,
      } as never);
      const activity = activities.items.find((a) => a.id === activityId);
      const center = centerId
        ? activityCenters.items.find((c) => c.id === centerId)
        : null;
      toast({
        title: "Actividad movida",
        description: center
          ? `${activity?.name} movida a ${center.name}`
          : `${activity?.name} removida del centro`,
      });
    } catch (err: unknown) {
      toast({
        variant: "destructive",
        title: "Error",
        description: (err as Error).message,
      });
    }
  };

  const handleMoveActivityCenter = async (
    centerId: string,
    newParentId: string | null,
  ) => {
    try {
      await activityCenters.update.mutateAsync({
        id: centerId,
        parent_id: newParentId,
      } as never);
      const center = activityCenters.items.find((c) => c.id === centerId);
      const parent = newParentId
        ? activityCenters.items.find((c) => c.id === newParentId)
        : null;
      toast({
        title: "Centro movido",
        description: parent
          ? `${center?.name} movido a ${parent.name}`
          : `${center?.name} movido a la raíz`,
      });
    } catch (err: unknown) {
      toast({
        variant: "destructive",
        title: "Error",
        description: (err as Error).message,
      });
    }
  };

  const handleCreateCostObjectCenter = async (
    item: Record<string, unknown>,
  ) => {
    try {
      if (item.parent_id === "none") item.parent_id = null;
      await costObjectCenters.create.mutateAsync(item as never);
      toast({
        title: "Centro de objetos de costo creado",
        description: `${item.name} agregado correctamente.`,
      });
    } catch (err: unknown) {
      toast({
        variant: "destructive",
        title: "Error",
        description: (err as Error).message,
      });
    }
  };

  const handleUpdateCostObjectCenter = async (
    center: CostObjectCenter,
    data: Record<string, unknown>,
  ) => {
    try {
      if (data.parent_id === "none") data.parent_id = null;
      await costObjectCenters.update.mutateAsync({
        id: center.id,
        ...data,
      } as never);
      toast({ title: "Centro de objetos de costo actualizado" });
      setEditingCostObjectCenter(null);
    } catch (err: unknown) {
      toast({
        variant: "destructive",
        title: "Error",
        description: (err as Error).message,
      });
    }
  };

  const handleDeleteCostObjectCenter = async (id: string) => {
    try {
      await costObjectCenters.remove.mutateAsync(id);
      toast({ title: "Centro de objetos de costo eliminado" });
    } catch (err: unknown) {
      toast({
        variant: "destructive",
        title: "Error",
        description: (err as Error).message,
      });
    }
  };

  const handleMoveCostObject = async (
    costObjectId: string,
    centerId: string | null,
  ) => {
    try {
      await costObjects.update.mutateAsync({
        id: costObjectId,
        center_id: centerId,
      } as never);
      const obj = costObjects.items.find((o) => o.id === costObjectId);
      const center = centerId
        ? costObjectCenters.items.find((c) => c.id === centerId)
        : null;
      toast({
        title: "Objeto de costo movido",
        description: center
          ? `${obj?.name} movido a ${center.name}`
          : `${obj?.name} removido del centro`,
      });
    } catch (err: unknown) {
      toast({
        variant: "destructive",
        title: "Error",
        description: (err as Error).message,
      });
    }
  };

  const handleMoveCostObjectCenter = async (
    centerId: string,
    newParentId: string | null,
  ) => {
    try {
      await costObjectCenters.update.mutateAsync({
        id: centerId,
        parent_id: newParentId,
      } as never);
      const center = costObjectCenters.items.find((c) => c.id === centerId);
      const parent = newParentId
        ? costObjectCenters.items.find((c) => c.id === newParentId)
        : null;
      toast({
        title: "Centro movido",
        description: parent
          ? `${center?.name} movido a ${parent.name}`
          : `${center?.name} movido a la raíz`,
      });
    } catch (err: unknown) {
      toast({
        variant: "destructive",
        title: "Error",
        description: (err as Error).message,
      });
    }
  };

  const isLoading =
    resources.isLoading ||
    activities.isLoading ||
    costObjects.isLoading ||
    costCenters.isLoading ||
    activityCenters.isLoading ||
    costObjectCenters.isLoading;

  return (
    <AppLayout>
      <PageHeader
        title="Diccionarios ABC"
        description="Gestión de Recursos, Actividades y Objetos de Costo"
      >
        <ExcelImportDialog activeTab={activeTab} onImport={handleExcelImport} />
        {activeTab === "resources" && (
          <>
            <AddCenterDialog
              onAdd={(item) => handleCreateCenter(item)}
              loading={costCenters.create.isPending}
              existingCodes={costCenters.items.map((c) => c.code)}
              centers={costCenters.items}
            />
            <AddItemDialog
              type="resource"
              onAdd={(item) => handleCreate(resources, item, "Recurso")}
              loading={resources.create.isPending}
              existingCategories={
                Array.from(
                  new Set([
                    ...DEFAULT_CATEGORIES,
                    ...resources.items.map((r) => r.category).filter(Boolean),
                  ]),
                ) as string[]
              }
              existingCodes={resources.items.map((i) => i.code)}
              existingTypes={["directo", "indirecto"]}
              centers={costCenters.items}
            />
          </>
        )}
        {activeTab === "activities" && (
          <>
            <AddActivityCenterDialog
              onAdd={(item) => handleCreateActivityCenter(item)}
              loading={activityCenters.create.isPending}
              existingCodes={activityCenters.items.map((c) => c.code)}
              centers={activityCenters.items}
            />
            <AddItemDialog
              type="activity"
              onAdd={(item) => handleCreate(activities, item, "Actividad")}
              loading={activities.create.isPending}
              existingCodes={activities.items.map((i) => i.code)}
              existingCategories={
                Array.from(
                  new Set([
                    ...DEFAULT_CATEGORIES,
                    ...activities.items.map((a) => a.category).filter(Boolean),
                  ]),
                ) as string[]
              }
              existingTypes={Array.from(
                new Set([
                  "operative",
                  "production",
                  "support",
                  ...activities.items.map((a) => a.type),
                ]),
              )}
              activityCenters={activityCenters.items}
            />
          </>
        )}
        {activeTab === "objects" && (
          <>
            <AddCostObjectCenterDialog
              onAdd={(item) => handleCreateCostObjectCenter(item)}
              loading={costObjectCenters.create.isPending}
              existingCodes={costObjectCenters.items.map((c) => c.code)}
              centers={costObjectCenters.items}
            />
            <AddItemDialog
              type="cost_object"
              onAdd={(item) => handleCreate(costObjects, item, "Objeto")}
              loading={costObjects.create.isPending}
              existingCodes={costObjects.items.map((i) => i.code)}
              existingCategories={
                Array.from(
                  new Set([
                    ...DEFAULT_CATEGORIES,
                    ...costObjects.items.map((a) => a.category).filter(Boolean),
                  ]),
                ) as string[]
              }
              existingTypes={Array.from(
                new Set([
                  "product",
                  "service",
                  "client",
                  "channel",
                  "distribution_channel",
                  "sales_channel",
                  "branch",
                  "agency",
                  "project",
                  ...costObjects.items.map((a) => a.type),
                ]),
              )}
              costObjectCenters={costObjectCenters.items}
            />
          </>
        )}
      </PageHeader>

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : (
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          {(() => {
            const rT = resourcesGrandTotal;
            const aT = activitiesGrandTotal;
            const oT = costObjectsGrandTotal;
            const allEqual = rT > 0 && Math.abs(rT - aT) < 0.01 && Math.abs(aT - oT) < 0.01;
            const actOk  = aT > 0 && Math.abs(aT - rT) < 0.01;
            const objOk  = oT > 0 && Math.abs(oT - aT) < 0.01;
            const actWarn = aT > 0 && !actOk;
            const objWarn = oT > 0 && !objOk;
            const fmtT = (n: number) => n.toLocaleString("en", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
            return (
          <TabsList className="h-auto py-1 w-full grid grid-cols-3">
            <TabsTrigger value="resources" className="flex flex-col items-center gap-0.5 py-2 px-1">
              <span className="text-center leading-tight">
                <span className="hidden sm:inline">Recursos</span>
                <span className="sm:hidden">Rec.</span>
                {" "}({resources.items.length}
                <span className="hidden sm:inline">{costCenters.items.length > 0 ? ` / ${costCenters.items.length} centros` : ""}</span>)
              </span>
              <span className={`text-xs font-normal inline-flex items-center gap-1 leading-none ${allEqual ? "text-green-500" : "text-muted-foreground"}`}>
                {allEqual && <CheckCircle2 className="h-3 w-3" />}
                <span className="hidden sm:inline">Total: </span>{fmtT(rT)} {currencySymbol}
              </span>
            </TabsTrigger>
            <TabsTrigger value="activities" className="flex flex-col items-center gap-0.5 py-2 px-1">
              <span className="text-center leading-tight">
                <span className="hidden sm:inline">Actividades</span>
                <span className="sm:hidden">Activ.</span>
                {" "}({activities.items.length}
                <span className="hidden sm:inline">{activityCenters.items.length > 0 ? ` / ${activityCenters.items.length} centros` : ""}</span>)
              </span>
              <span className={`text-xs font-normal inline-flex items-center gap-1 leading-none ${actOk ? "text-green-500" : actWarn ? "text-amber-500" : "text-muted-foreground"}`}>
                {actOk && <CheckCircle2 className="h-3 w-3" />}
                <span className="hidden sm:inline">Total: </span>{fmtT(aT)} {currencySymbol}
              </span>
            </TabsTrigger>
            <TabsTrigger value="objects" className="flex flex-col items-center gap-0.5 py-2 px-1">
              <span className="text-center leading-tight">
                <span className="hidden sm:inline">Objetos de Costo</span>
                <span className="sm:hidden">Objetos</span>
                {" "}({costObjects.items.length}
                <span className="hidden sm:inline">{costObjectCenters.items.length > 0 ? ` / ${costObjectCenters.items.length} centros` : ""}</span>)
              </span>
              <span className={`text-xs font-normal inline-flex items-center gap-1 leading-none ${objOk ? "text-green-500" : objWarn ? "text-amber-500" : "text-muted-foreground"}`}>
                {objOk && <CheckCircle2 className="h-3 w-3" />}
                <span className="hidden sm:inline">Total: </span>{fmtT(oT)} {currencySymbol}
              </span>
            </TabsTrigger>
          </TabsList>
            );
          })()}

          <TabsContent value="resources">
            <Card className="border-border/50 mt-4">
              <CardContent className="p-0">
                <ResourceTreeView
                  resources={resources.items}
                  centers={costCenters.items}
                  onDeleteResource={(id) =>
                    handleDelete(resources, id, "Recurso")
                  }
                  onEditResource={(item) => handleEdit(item, "resource")}
                  onDeleteCenter={handleDeleteCenter}
                  onEditCenter={setEditingCenter}
                  onMoveResource={handleMoveResource}
                  onMoveCenter={handleMoveCenter}
                  allocatedMap={resourceAllocatedMap}
                  receivedMap={resourceReceivedMap}
                  centerReceivedMap={resourceCenterReceivedMap}
                />
              </CardContent>
            </Card>

            {/* Edit Center Dialog */}
            {editingCenter && (
              <AddCenterDialog
                onAdd={(data) => handleUpdateCenter(editingCenter, data)}
                loading={costCenters.update.isPending}
                existingCodes={costCenters.items.map((c) => c.code)}
                centers={costCenters.items}
                editingCenter={editingCenter}
                open={true}
                onOpenChange={(open) => {
                  if (!open) setEditingCenter(null);
                }}
              />
            )}
          </TabsContent>

          <TabsContent value="activities">
            <Card className="border-border/50 mt-4">
              <CardContent className="p-0">
                <ActivityTreeView
                  activities={activities.items}
                  centers={activityCenters.items}
                  onDeleteActivity={(id) =>
                    handleDelete(activities, id, "Actividad")
                  }
                  onEditActivity={(item) => handleEdit(item, "activity")}
                  onDeleteCenter={handleDeleteActivityCenter}
                  onEditCenter={setEditingActivityCenter}
                  onMoveActivity={handleMoveActivity}
                  onMoveCenter={handleMoveActivityCenter}
                  allocatedMap={activityAllocatedMap}
                  receivedMap={activityReceivedMap}
                  centerReceivedMap={activityCenterReceivedMap}
                />
              </CardContent>
            </Card>

            {/* Edit Activity Center Dialog */}
            {editingActivityCenter && (
              <AddActivityCenterDialog
                onAdd={(data) =>
                  handleUpdateActivityCenter(editingActivityCenter, data)
                }
                loading={activityCenters.update.isPending}
                existingCodes={activityCenters.items.map((c) => c.code)}
                centers={activityCenters.items}
                editingCenter={editingActivityCenter}
                open={true}
                onOpenChange={(open) => {
                  if (!open) setEditingActivityCenter(null);
                }}
              />
            )}
          </TabsContent>

          <TabsContent value="objects">
            <Card className="border-border/50 mt-4">
              <CardContent className="p-0">
                <CostObjectTreeView
                  costObjects={costObjects.items}
                  centers={costObjectCenters.items}
                  onDeleteCostObject={(id) =>
                    handleDelete(costObjects, id, "Objeto")
                  }
                  onEditCostObject={(item) => handleEdit(item, "cost_object")}
                  onDeleteCenter={handleDeleteCostObjectCenter}
                  onEditCenter={setEditingCostObjectCenter}
                  onMoveCostObject={handleMoveCostObject}
                  onMoveCenter={handleMoveCostObjectCenter}
                  receivedMap={costObjectReceivedMap}
                  centerReceivedMap={costObjectCenterReceivedMap}
                />
              </CardContent>
            </Card>

            {/* Edit Cost Object Center Dialog */}
            {editingCostObjectCenter && (
              <AddCostObjectCenterDialog
                onAdd={(data) =>
                  handleUpdateCostObjectCenter(editingCostObjectCenter, data)
                }
                loading={costObjectCenters.update.isPending}
                existingCodes={costObjectCenters.items.map((c) => c.code)}
                centers={costObjectCenters.items}
                editingCenter={editingCostObjectCenter}
                open={true}
                onOpenChange={(open) => {
                  if (!open) setEditingCostObjectCenter(null);
                }}
              />
            )}
          </TabsContent>
        </Tabs>
      )}

      {/* Shared Edit Dialog */}
      <EditItemDialog
        open={Boolean(editingItem)}
        onOpenChange={(open) => !open && setEditingItem(null)}
        item={editingItem?.item}
        type={
          (editingItem?.type as "resource" | "activity" | "cost_object") ||
          "resource"
        }
        loading={
          resources.update.isPending ||
          activities.update.isPending ||
          costObjects.update.isPending
        }
        existingCategories={
          editingItem?.type === "resource"
            ? (Array.from(
                new Set([...DEFAULT_CATEGORIES, ...resources.items.map((r) => r.category).filter(Boolean)]),
              ) as string[])
            : editingItem?.type === "activity"
              ? (Array.from(
                  new Set([...DEFAULT_CATEGORIES, ...activities.items.map((a) => a.category).filter(Boolean)]),
                ) as string[])
              : (Array.from(
                  new Set([...DEFAULT_CATEGORIES, ...costObjects.items.map((c) => c.category).filter(Boolean)]),
                ) as string[])
        }
        existingTypes={
          editingItem?.type === "activity"
            ? Array.from(
                new Set([
                  "operative",
                  "production",
                  "support",
                  ...activities.items.map((a) => a.type),
                ]),
              )
            : editingItem?.type === "cost_object"
              ? Array.from(
                  new Set([
                    "product",
                    "service",
                    "client",
                    "channel",
                    "distribution_channel",
                    "sales_channel",
                    "branch",
                    "agency",
                    "project",
                    ...costObjects.items.map((a) => a.type),
                  ]),
                )
              : ["directo", "indirecto"]
        }
        centers={editingItem?.type === "resource" ? costCenters.items : []}
        activityCenters={
          editingItem?.type === "activity" ? activityCenters.items : []
        }
        costObjectCenters={
          editingItem?.type === "cost_object" ? costObjectCenters.items : []
        }
        onSave={(id, data) => {
          if (editingItem?.type === "resource")
            handleUpdate(resources, id, data, "Recurso");
          if (editingItem?.type === "activity")
            handleUpdate(activities, id, data, "Actividad");
          if (editingItem?.type === "cost_object")
            handleUpdate(costObjects, id, data, "Objeto de Costo");
        }}
      />
    </AppLayout>
  );
};

export default DictionariesPage;
