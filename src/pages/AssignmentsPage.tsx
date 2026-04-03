import React, { useState, useMemo } from "react";
import { AppLayout } from "@/components/AppLayout";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
  ArrowRight,
  Plus,
  Trash2,
  Edit2,
  Loader2,
  Settings2,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import {
  useDrivers,
  useResources,
  useActivities,
  useCostObjects,
  useDriverLines,
  useCostCenters,
  useActivityCenters,
  useCostObjectCenters,
} from "@/hooks/use-supabase-data";
import { useAllocation } from "@/hooks/use-allocation";
import { useCurrency } from "@/hooks/use-currency";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";

/* ───── Types ───── */
type DriverType = "uniform" | "extended";
type SourceType =
  | "resource"
  | "activity"
  | "resource_center"
  | "activity_center";
type DestType = "activity" | "cost_object" | "resource" | "activity_center" | "cost_object_center";

interface DestinationEntry {
  id: string;
  code: string;
  name: string;
  selected: boolean;
  value: number;
  percentage: number;
}

/* ───── Driver Type Labels ───── */
const driverTypeInfo: Record<
  string,
  { label: string; description: string; color: string }
> = {
  uniform: {
    label: "Uniforme",
    description: "Distribuye equitativamente entre los destinos",
    color: "bg-blue-500/10 text-blue-600",
  },
  extended: {
    label: "Extendido",
    description: "Distribución manual por valores o porcentajes",
    color: "bg-amber-500/10 text-amber-600",
  },
};

/* ───── Add Driver Dialog ───── */
function AddDriverDialog({
  resources,
  activities,
  costObjects,
  onCreate,
  loading,
  allocatedMap,
  receivedMap,
  editingDriver,
  onClose,
  costCenters,
  activityCenters,
  costObjectCenters,
  existingDriverNames = [],
}: {
  resources: {
    id: string;
    code: string;
    name: string;
    amount: number;
    type: string;
  }[];
  activities: { id: string; code: string; name: string; amount: number }[];
  costObjects: { id: string; code: string; name: string; amount: number }[];
  onCreate: (
    driver: Record<string, unknown>,
    lines: { destination_id: string; value: number; percentage: number }[],
  ) => void;
  loading: boolean;
  allocatedMap: Record<string, number>;
  receivedMap: Record<string, number>;
  editingDriver?: any;
  onClose?: () => void;
  costCenters: { id: string; code: string; name: string; amount: number }[];
  activityCenters: { id: string; code: string; name: string; amount: number }[];
  costObjectCenters: { id: string; code: string; name: string; amount: number }[];
  existingDriverNames?: string[];
}) {
  const getNextDriverCode = () => {
    const prefix = "D-";
    let maxNum = 0;
    for (const n of existingDriverNames) {
      if (n.startsWith(prefix)) {
        const numPart = parseInt(n.slice(prefix.length), 10);
        if (!isNaN(numPart) && numPart > maxNum) {
          maxNum = numPart;
        }
      }
    }
    return `${prefix}${String(maxNum + 1).padStart(4, "0")}`;
  };

  const { symbol, fmt } = useCurrency();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(editingDriver?.name || "");
  const [type, setType] = useState<DriverType>(
    editingDriver?.type || "uniform",
  );
  const [sourceType, setSourceType] = useState<SourceType>(
    editingDriver?.source_type || "resource",
  );
  const [sourceId, setSourceId] = useState(editingDriver?.source_id || "");
  const [destinationType, setDestinationType] = useState<DestType>(
    editingDriver?.destination_type || "activity",
  );
  const [totalValue, setTotalValue] = useState(
    editingDriver?.total_value?.toString() || "",
  );
  const [destinations, setDestinations] = useState<DestinationEntry[]>([]);
  const [initialLinesLoaded, setInitialLinesLoaded] = useState(false);

  const isEditing = !!editingDriver;
  const effectiveOpen = isEditing ? true : open;

  const { data: existingLinesData } = useDriverLines(
    isEditing ? editingDriver.id : undefined,
  );

  const sourceItems =
    sourceType === "resource"
      ? resources
      : sourceType === "activity"
        ? activities
        : sourceType === "resource_center"
          ? costCenters
          : activityCenters;
  const selectedResource =
    sourceType === "resource" ? resources.find((r) => r.id === sourceId) : null;
  const resourceType = selectedResource?.type || "";
  const destItems =
    destinationType === "activity"
      ? activities
      : destinationType === "resource"
        ? resources.filter((r) => r.id !== sourceId)
        : destinationType === "activity_center"
          ? activityCenters
          : destinationType === "cost_object_center"
            ? costObjectCenters
            : costObjects;
  const hasTotalValue = totalValue !== "" && parseFloat(totalValue) > 0;
  const totalValueNum = parseFloat(totalValue) || 0;

  // Sync destination list when destination type changes
  const refreshDestinations = (items: typeof destItems) => {
    setDestinations(
      items.map((item) => ({
        id: item.id,
        code: item.code,
        name: item.name,
        selected: false,
        value: 0,
        percentage: 0,
      })),
    );
  };

  const handleDestTypeChange = (val: DestType) => {
    setDestinationType(val);
    const items =
      val === "activity"
        ? activities
        : val === "resource"
          ? resources.filter((r) => r.id !== sourceId)
          : val === "activity_center"
            ? activityCenters
            : val === "cost_object_center"
              ? costObjectCenters
              : costObjects;
    refreshDestinations(items);
  };

  const handleOpenChange = (isOpen: boolean) => {
    if (isEditing && !isOpen) {
      onClose?.();
      return;
    }
    setOpen(isOpen);
    if (isOpen) {
      setName(editingDriver?.name || getNextDriverCode());
      setType(editingDriver?.type || "uniform");
      setSourceType(editingDriver?.source_type || "resource");
      setSourceId(editingDriver?.source_id || "");
      setDestinationType(editingDriver?.destination_type || "activity");
      setTotalValue(editingDriver?.total_value?.toString() || "");
      setInitialLinesLoaded(false);
      const targetItems =
        editingDriver?.destination_type === "activity"
          ? activities
          : editingDriver?.destination_type === "resource"
            ? resources
            : editingDriver?.destination_type === "activity_center"
              ? activityCenters
              : editingDriver?.destination_type === "cost_object_center"
                ? costObjectCenters
                : costObjects;
      refreshDestinations(targetItems);
    }
  };

  // Effect to load initial lines if editing
  React.useEffect(() => {
    if (isEditing && existingLinesData && !initialLinesLoaded) {
      const items =
        destinationType === "activity"
          ? activities
          : destinationType === "resource"
            ? resources.filter((r) => r.id !== sourceId)
            : destinationType === "activity_center"
              ? activityCenters
              : destinationType === "cost_object_center"
                ? costObjectCenters
                : costObjects;
      setDestinations(
        items.map((item) => {
          const line = existingLinesData.find(
            (l) => l.destination_id === item.id,
          );
          return {
            id: item.id,
            code: item.code,
            name: item.name,
            selected: !!line,
            value: line?.value || 0,
            percentage: line?.percentage || 0,
          };
        }),
      );
      setInitialLinesLoaded(true);
    }
  }, [
    isEditing,
    existingLinesData,
    initialLinesLoaded,
    destinationType,
    activities,
    costObjects,
  ]);

  const toggleDestination = (id: string) => {
    setDestinations((prev) =>
      prev.map((d) => (d.id === id ? { ...d, selected: !d.selected } : d)),
    );
  };

  const selectAll = () => {
    const allSelected = destinations.every((d) => d.selected);
    setDestinations((prev) =>
      prev.map((d) => ({ ...d, selected: !allSelected })),
    );
  };

  const updateDestValue = (id: string, value: number) => {
    setDestinations((prev) =>
      prev.map((d) => (d.id === id ? { ...d, value } : d)),
    );
  };

  const selectedDests = destinations.filter((d) => d.selected);
  const selectedCount = selectedDests.length;

  // Calculate percentages based on driver type
  const computedLines = useMemo(() => {
    if (selectedCount === 0) return [];

    if (type === "uniform") {
      const pct = 100 / selectedCount;
      const val = hasTotalValue ? totalValueNum / selectedCount : 0;
      return selectedDests.map((d) => ({
        destination_id: d.id,
        value: Math.round(val * 10000) / 10000,
        percentage: Math.round(pct * 10000) / 10000,
      }));
    }

    // Extended
    if (hasTotalValue) {
      // Extended con Valor Total: user provides values that must sum to totalValue
      return selectedDests.map((d) => ({
        destination_id: d.id,
        value: d.value,
        percentage:
          totalValueNum > 0
            ? Math.round((d.value / totalValueNum) * 100 * 10000) / 10000
            : 0,
      }));
    } else {
      // Extended sin Valor Total: user provides values, total = sum of values
      const sumValues = selectedDests.reduce((s, d) => s + d.value, 0);
      return selectedDests.map((d) => ({
        destination_id: d.id,
        value: d.value,
        percentage:
          sumValues > 0
            ? Math.round((d.value / sumValues) * 100 * 10000) / 10000
            : 0,
      }));
    }
  }, [type, selectedDests, selectedCount, hasTotalValue, totalValueNum]);

  const sumAllocated = computedLines.reduce((s, l) => s + l.value, 0);
  const sumPct = computedLines.reduce((s, l) => s + l.percentage, 0);

  const isValid =
    name.trim() &&
    sourceId &&
    selectedCount > 0 &&
    (type === "uniform" ||
      (selectedDests.every((d) => d.value > 0) &&
        (!hasTotalValue || Math.abs(sumAllocated - totalValueNum) < 0.01)));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onCreate(
      {
        ...(isEditing ? { id: editingDriver.id } : {}),
        name,
        type,
        source_type: sourceType,
        source_id: sourceId,
        destination_type: destinationType,
        total_value: hasTotalValue ? totalValueNum : null,
      },
      computedLines,
    );
    if (!isEditing) {
      setName("");
      setSourceId("");
      setTotalValue("");
      setOpen(false);
    }
  };

  return (
    <Dialog open={effectiveOpen} onOpenChange={handleOpenChange}>
      {!isEditing && (
        <DialogTrigger asChild>
          <Button size="sm">
            <Plus className="h-4 w-4 mr-2" />
            Nueva Asignación
          </Button>
        </DialogTrigger>
      )}
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Editar Asignación" : "Nueva Asignación (Driver)"}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-5 mt-2">
          {/* Row 1: Name + Driver Type */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Nombre del driver</Label>
              <Input
                placeholder="Ej: Horas Hombre, m², kWh"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Tipo de driver</Label>
              <Select
                value={type}
                onValueChange={(v) => setType(v as DriverType)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="uniform">
                    Uniforme — reparto equitativo
                  </SelectItem>
                  <SelectItem value="extended">
                    Extendido — distribución manual
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Row 2: Source type + Source item */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Tipo de origen</Label>
              <Select
                value={sourceType}
                onValueChange={(v) => {
                  setSourceType(v as SourceType);
                  setSourceId("");
                  if (v === "activity" || v === "activity_center") {
                    setDestinationType("cost_object");
                    refreshDestinations(costObjects);
                  }
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="resource">Recurso</SelectItem>
                  <SelectItem value="activity">Actividad</SelectItem>
                  <SelectItem value="resource_center">
                    Centro de Recursos
                  </SelectItem>
                  <SelectItem value="activity_center">
                    Centro de Actividades
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Origen</Label>
              <Select
                value={sourceId}
                onValueChange={(id) => {
                  setSourceId(id);
                  if (sourceType === "resource") {
                    const res = resources.find((r) => r.id === id);
                    if (res?.type === "directo") {
                      setDestinationType("cost_object");
                      refreshDestinations(costObjects);
                    } else if (res?.type === "indirecto") {
                      setDestinationType("activity");
                      refreshDestinations(activities);
                    }
                  }
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona el origen" />
                </SelectTrigger>
                <SelectContent>
                  {sourceItems.map((item) => {
                    const received = receivedMap[item.id] || 0;
                    const allocated = allocatedMap[item.id] || 0;
                    const totalAmount = item.amount + received;
                    const remaining = totalAmount - allocated;

                    return (
                      <SelectItem
                        key={item.id}
                        value={item.id}
                        disabled={remaining <= 0}
                      >
                        {item.code} — {item.name} (Disp: {fmt(remaining)})
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Row 3: Destination type + Total value */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Tipo de destino</Label>
              <Select
                value={destinationType}
                onValueChange={(v) => handleDestTypeChange(v as DestType)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {sourceType === "activity" || sourceType === "activity_center" ? (
                    <>
                      <SelectItem value="cost_object">Objetos de Costo</SelectItem>
                      <SelectItem value="cost_object_center">Centros de Objetos de Costo</SelectItem>
                    </>
                  ) : resourceType === "directo" ? (
                    <>
                      <SelectItem value="cost_object">Objetos de Costo</SelectItem>
                      <SelectItem value="cost_object_center">Centros de Objetos de Costo</SelectItem>
                    </>
                  ) : resourceType === "indirecto" ? (
                    <>
                      <SelectItem value="activity">Actividades</SelectItem>
                      <SelectItem value="activity_center">Centros de Actividades</SelectItem>
                      <SelectItem value="resource">Recursos</SelectItem>
                    </>
                  ) : (
                    <>
                      <SelectItem value="activity">Actividades</SelectItem>
                      <SelectItem value="activity_center">Centros de Actividades</SelectItem>
                      <SelectItem value="cost_object">Objetos de Costo</SelectItem>
                      <SelectItem value="cost_object_center">Centros de Objetos de Costo</SelectItem>
                    </>
                  )}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Valor total del driver (opcional)</Label>
              <Input
                type="number"
                step="0.01"
                placeholder="Ej: 600 (m²), 160 (hrs)"
                value={totalValue}
                onChange={(e) => setTotalValue(e.target.value)}
              />
              <p className="text-[10px] text-muted-foreground">
                {hasTotalValue
                  ? "Con valor total: el sistema usa este valor como base de distribución"
                  : "Sin valor total: el sistema calcula a partir de las asignaciones parciales"}
              </p>
            </div>
          </div>

          {/* Destination selection */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>
                Destinos ({selectedCount} de {destinations.length}{" "}
                seleccionados)
              </Label>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={selectAll}
              >
                {destinations.every((d) => d.selected)
                  ? "Deseleccionar todos"
                  : "Seleccionar todos"}
              </Button>
            </div>

            <div className="border rounded-lg max-h-60 overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10" />
                    <TableHead className="w-20">Código</TableHead>
                    <TableHead>Nombre</TableHead>
                    {type === "extended" && (
                      <TableHead className="w-32 text-right">Valor</TableHead>
                    )}
                    <TableHead className="w-24 text-right">%</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {destinations.map((dest) => {
                    const line = computedLines.find(
                      (l) => l.destination_id === dest.id,
                    );
                    return (
                      <TableRow
                        key={dest.id}
                        className={dest.selected ? "bg-primary/5" : ""}
                      >
                        <TableCell>
                          <Checkbox
                            checked={dest.selected}
                            onCheckedChange={() => toggleDestination(dest.id)}
                          />
                        </TableCell>
                        <TableCell className="font-mono text-xs">
                          {dest.code}
                        </TableCell>
                        <TableCell className="text-sm">{dest.name}</TableCell>
                        {type === "extended" && (
                          <TableCell className="text-right">
                            <Input
                              type="number"
                              step="0.01"
                              className="h-7 w-28 text-right text-xs"
                              value={dest.value || ""}
                              onChange={(e) =>
                                updateDestValue(
                                  dest.id,
                                  parseFloat(e.target.value) || 0,
                                )
                              }
                              disabled={!dest.selected}
                            />
                          </TableCell>
                        )}
                        <TableCell className="text-right font-mono text-xs">
                          {dest.selected && line
                            ? `${line.percentage.toFixed(2)}%`
                            : "—"}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>

            {/* Summary */}
            {selectedCount > 0 && (
              <div className="flex items-center gap-4 text-xs text-muted-foreground px-2">
                <span>
                  Total %:{" "}
                  <strong
                    className={
                      Math.abs(sumPct - 100) < 0.01
                        ? "text-green-600"
                        : "text-destructive"
                    }
                  >
                    {sumPct.toFixed(2)}%
                  </strong>
                </span>
                {type === "extended" && (
                  <span>
                    Suma valores:{" "}
                    {hasTotalValue ? (
                      <strong
                        className={
                          Math.abs(sumAllocated - totalValueNum) < 0.01
                            ? "text-green-600"
                            : "text-destructive"
                        }
                      >
                        {sumAllocated.toLocaleString()} /{" "}
                        {totalValueNum.toLocaleString()}
                      </strong>
                    ) : (
                      <strong>{sumAllocated.toLocaleString()}</strong>
                    )}
                  </span>
                )}
              </div>
            )}
          </div>

          <Button
            type="submit"
            className="w-full"
            disabled={loading || !isValid}
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            {isEditing
              ? "Guardar Cambios"
              : `Crear asignación con ${selectedCount} destino${selectedCount !== 1 ? "s" : ""}`}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/* ───── Driver Detail Card ───── */
function DriverCard({
  driver,
  sourceName,
  sourceAmount,
  destItems,
  onDelete,
  onEdit,
}: {
  driver: {
    id: string;
    name: string;
    type: string;
    source_type: string;
    source_id: string;
    destination_type: string;
    total_value: number | null;
  };
  sourceName: string;
  sourceAmount: number;
  destItems: { id: string; code: string; name: string }[];
  onDelete: (id: string) => void;
  onEdit: (driver: any) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const driverLines = useDriverLines(driver.id);
  const { symbol, fmt } = useCurrency();
  const info = driverTypeInfo[driver.type] || driverTypeInfo.uniform;

  const hasTotalValue = driver.total_value !== null && driver.total_value > 0;
  const modeLabel = hasTotalValue ? "Con valor total" : "Sin valor total";

  return (
    <Card className="border-border/50">
      <CardContent className="p-4">
        {/* Header row */}
        <div className="flex items-center gap-4 flex-wrap">
          <div className={`rounded-lg px-4 py-3 w-[260px] shrink-0 ${
            driver.source_type === "activity" || driver.source_type === "activity_center"
              ? "bg-warning/10 border border-warning/20"
              : "bg-primary/10 border border-primary/20"
          }`}>
            <p className="text-xs text-muted-foreground">
              Origen (
              {driver.source_type === "resource"
                ? "Recurso"
                : driver.source_type === "activity"
                  ? "Actividad"
                  : driver.source_type === "resource_center"
                    ? "Centro de Recursos"
                    : "Centro de Actividades"}
              )
            </p>
            <div className="mt-1 flex flex-wrap gap-1">
              <span className={`text-[10px] font-mono rounded px-1.5 py-0.5 text-foreground ${
                driver.source_type === "activity" || driver.source_type === "activity_center"
                  ? "bg-warning/30"
                  : "bg-primary/30"
              }`}>
                {sourceName}
              </span>
            </div>
          </div>

          <div className="flex flex-col items-center min-w-[130px] px-2">
            <ArrowRight className="h-5 w-5 text-muted-foreground" />
            <span className="text-[10px] text-muted-foreground mt-1 text-center">
              {driver.name}
            </span>
            <span className="text-sm font-bold font-mono mt-0.5">
              {fmt(sourceAmount)}
            </span>
          </div>

          <div className={`flex-1 rounded-lg px-4 py-3 ${
            driver.destination_type === "cost_object" || driver.destination_type === "cost_object_center"
              ? "bg-blue-500/10 border border-blue-500/20"
              : "bg-warning/10 border border-warning/20"
          }`}>
            <div className="flex items-start justify-between gap-2">
              <div className="flex flex-col gap-1">
                <p className="text-xs text-muted-foreground">
                  Destino →{" "}
                  {driver.destination_type === "activity"
                    ? "Actividades"
                    : driver.destination_type === "activity_center"
                      ? "Centros de Actividades"
                      : driver.destination_type === "resource"
                        ? "Recursos"
                        : driver.destination_type === "cost_object_center"
                          ? "Centros de Objetos de Costo"
                          : "Objetos de Costo"}
                </p>
                <div className="flex items-center gap-1 flex-wrap">
                  {!driverLines.isLoading && driverLines.lines.map((line) => {
                    const dest = destItems.find((d) => d.id === line.destination_id);
                    const isCostObject =
                      driver.destination_type === "cost_object" ||
                      driver.destination_type === "cost_object_center";
                    return dest ? (
                      <span
                        key={line.id}
                        className={`text-[10px] font-mono rounded px-1.5 py-0.5 text-foreground ${
                          isCostObject ? "bg-blue-500/30" : "bg-warning/30"
                        }`}
                      >
                        {dest.code}
                      </span>
                    ) : null;
                  })}
                </div>
              </div>
              <Badge variant="secondary" className={`${info.color} shrink-0`}>
                {info.label}
              </Badge>
            </div>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              {hasTotalValue && <span className="text-[10px] text-muted-foreground">{modeLabel}</span>}
              {hasTotalValue && (
                <span className="text-xs font-mono">
                  (Total: {driver.total_value!.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })})
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground"
              onClick={() => setExpanded(!expanded)}
            >
              {expanded ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground hover:text-primary"
              onClick={() => onEdit(driver)}
            >
              <Edit2 className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground hover:text-destructive"
              onClick={() => onDelete(driver.id)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Expanded: show driver lines */}
        {expanded && (
          <div className="mt-4 border-t pt-3">
            {driverLines.isLoading ? (
              <div className="flex justify-center py-4">
                <Loader2 className="h-4 w-4 animate-spin" />
              </div>
            ) : driverLines.lines.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-4">
                Sin líneas de distribución configuradas
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Destino</TableHead>
                    <TableHead className="text-right">Valor</TableHead>
                    <TableHead className="text-right">%</TableHead>
                    <TableHead className="text-right">
                      Monto asignado ({symbol})
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {driverLines.lines.map((line) => {
                    const dest = destItems.find(
                      (d) => d.id === line.destination_id,
                    );
                    const allocatedAmount =
                      (sourceAmount * line.percentage) / 100;
                    return (
                      <TableRow key={line.id}>
                        <TableCell className="text-sm">
                          {dest
                            ? `${dest.code} — ${dest.name}`
                            : line.destination_id}
                        </TableCell>
                        <TableCell className="text-right font-mono text-xs">
                          {line.value.toLocaleString()}
                        </TableCell>
                        <TableCell className="text-right font-mono text-xs">
                          {line.percentage.toFixed(2)}%
                        </TableCell>
                        <TableCell className="text-right font-mono text-xs font-medium">
                          {fmt(allocatedAmount)}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
                <tfoot>
                  <TableRow className="border-t-2 border-border font-bold">
                    <TableCell className="text-sm font-bold">Total</TableCell>
                    <TableCell className="text-right font-mono text-sm font-bold">
                      {driverLines.lines.reduce((sum, l) => sum + l.value, 0).toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right font-mono text-sm font-bold">
                      {driverLines.lines.reduce((sum, l) => sum + l.percentage, 0).toFixed(2)}%
                    </TableCell>
                    <TableCell className="text-right font-mono text-sm font-bold">
                      {fmt(driverLines.lines.reduce((sum, l) => sum + (sourceAmount * l.percentage) / 100, 0))}
                    </TableCell>
                  </TableRow>
                </tfoot>
              </Table>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/* ───── Page ───── */
const AssignmentsPage = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const drivers = useDrivers();
  const resources = useResources();
  const activities = useActivities();
  const costObjects = useCostObjects();
  const costCentersHook = useCostCenters();
  const activityCentersHook = useActivityCenters();
  const costObjectCentersHook = useCostObjectCenters();
  const driverLinesHook = useDriverLines();
  const allocation = useAllocation();
  const [editingDriver, setEditingDriver] = useState<any | null>(null);

  const enrichedCostCenters = useMemo(() => {
    return costCentersHook.items.map((center) => {
      const amount = resources.items
        .filter((r) => r.center_id === center.id)
        .reduce((sum, r) => sum + r.amount, 0);
      return { ...center, amount };
    });
  }, [costCentersHook.items, resources.items]);

  const enrichedActivityCenters = useMemo(() => {
    return activityCentersHook.items.map((center) => {
      const amount = activities.items
        .filter((a) => a.center_id === center.id)
        .reduce((sum, a) => sum + a.amount, 0);
      return { ...center, amount };
    });
  }, [activityCentersHook.items, activities.items]);

  const enrichedCostObjectCenters = useMemo(() => {
    return costObjectCentersHook.items.map((center) => {
      const amount = costObjects.items
        .filter((co) => co.center_id === center.id)
        .reduce((sum, co) => sum + co.amount, 0);
      return { ...center, amount };
    });
  }, [costObjectCentersHook.items, costObjects.items]);

  const allocatedMap = useMemo(() => {
    const map: Record<string, number> = {};
    for (const alloc of allocation.allocations) {
      map[alloc.source_id] =
        (map[alloc.source_id] || 0) + alloc.allocated_amount;
    }
    return map;
  }, [allocation.allocations]);

  const receivedMap = useMemo(() => {
    const map: Record<string, number> = {};
    for (const sum of allocation.activitySummaries) {
      map[sum.id] = (map[sum.id] || 0) + sum.received_amount;
    }
    // Include received amounts for activity centers
    if (allocation.activityCenterReceived) {
      for (const [id, amount] of Object.entries(allocation.activityCenterReceived)) {
        map[id] = (map[id] || 0) + amount;
      }
    }
    // Include received amounts for cost object centers
    if (allocation.costObjectCenterReceived) {
      for (const [id, amount] of Object.entries(allocation.costObjectCenterReceived)) {
        map[id] = (map[id] || 0) + amount;
      }
    }
    // Include received amounts for resources
    if (allocation.resourceReceived) {
      for (const [id, amount] of Object.entries(allocation.resourceReceived)) {
        map[id] = (map[id] || 0) + amount;
      }
    }
    // Include received amounts for cost objects
    if (allocation.costObjectReceived) {
      for (const [id, amount] of Object.entries(allocation.costObjectReceived)) {
        map[id] = (map[id] || 0) + amount;
      }
    }
    return map;
  }, [allocation.activitySummaries, allocation.activityCenterReceived, allocation.costObjectCenterReceived, allocation.resourceReceived, allocation.costObjectReceived]);

  const isLoading =
    drivers.isLoading ||
    resources.isLoading ||
    activities.isLoading ||
    costObjects.isLoading ||
    costCentersHook.isLoading ||
    activityCentersHook.isLoading ||
    costObjectCentersHook.isLoading;

  const getSourceInfo = (driver: {
    source_type: string;
    source_id: string;
  }) => {
    const list =
      driver.source_type === "resource"
        ? resources.items
        : driver.source_type === "activity"
          ? activities.items
          : driver.source_type === "resource_center"
            ? enrichedCostCenters
            : enrichedActivityCenters;
    const item = list.find((i) => i.id === driver.source_id);
    const baseAmount = item?.amount ?? 0;
    const received = receivedMap[driver.source_id] || 0;
    return {
      name: item ? `${item.code} — ${item.name}` : "—",
      amount: baseAmount + received,
    };
  };

  const getDestItems = (driver: { destination_type: string }) => {
    return driver.destination_type === "activity"
      ? activities.items
      : driver.destination_type === "activity_center"
        ? enrichedActivityCenters
        : driver.destination_type === "resource"
          ? resources.items
          : driver.destination_type === "cost_object_center"
            ? enrichedCostObjectCenters
            : costObjects.items;
  };

  const handleCreateOrUpdate = async (
    driverData: Record<string, unknown>,
    lines: { destination_id: string; value: number; percentage: number }[],
  ) => {
    try {
      if (driverData.id) {
        // Update
        await drivers.update.mutateAsync(driverData as any);
        // Delete old lines and insert new ones
        await supabase
          .from("driver_lines")
          .delete()
          .eq("driver_id", driverData.id);
        if (lines.length > 0) {
          const linesWithDriver = lines.map((l) => ({
            driver_id: driverData.id,
            ...l,
          }));
          const { error } = await supabase
            .from("driver_lines")
            .insert(linesWithDriver);
          if (error) throw error;
        }
        await queryClient.invalidateQueries({ queryKey: ["all_driver_lines"] });
        toast({ title: "Asignación actualizada" });
        setEditingDriver(null);
      } else {
        // Create
        const created = await drivers.create.mutateAsync(driverData as never);
        if (lines.length > 0 && created?.id) {
          const linesWithDriver = lines.map((l) => ({
            driver_id: created.id,
            ...l,
          }));
          const { error } = await supabase
            .from("driver_lines")
            .insert(linesWithDriver);
          if (error) throw error;
        }
        await queryClient.invalidateQueries({ queryKey: ["all_driver_lines"] });
        toast({
          title: "Asignación creada",
          description: `${lines.length} destino(s) configurados.`,
        });
      }
    } catch (err: unknown) {
      toast({
        variant: "destructive",
        title: "Error",
        description: (err as Error).message,
      });
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await drivers.remove.mutateAsync(id);
      await queryClient.invalidateQueries({ queryKey: ["all_driver_lines"] });
      toast({ title: "Asignación eliminada" });
    } catch (err: unknown) {
      toast({
        variant: "destructive",
        title: "Error",
        description: (err as Error).message,
      });
    }
  };

  // Group drivers by flow stage
  const resourceToActivity = drivers.items.filter(
    (d) =>
      (d.source_type === "resource" || d.source_type === "resource_center") &&
      (d.destination_type === "activity" || d.destination_type === "activity_center" || d.destination_type === "resource"),
  );
  const activityToObject = drivers.items.filter(
    (d) =>
      ((d.source_type === "activity" || d.source_type === "activity_center") &&
        (d.destination_type === "cost_object" || d.destination_type === "cost_object_center")) ||
      ((d.source_type === "resource" || d.source_type === "resource_center") &&
        (d.destination_type === "cost_object" || d.destination_type === "cost_object_center")),
  );

  return (
    <AppLayout>
      <PageHeader
        title="Asignaciones (Drivers)"
        description="Ruteo de costos: Recursos → Actividades → Objetos de Costo"
      >
        <AddDriverDialog
          resources={resources.items}
          activities={activities.items}
          costObjects={costObjects.items}
          costCenters={enrichedCostCenters}
          activityCenters={enrichedActivityCenters}
          costObjectCenters={enrichedCostObjectCenters}
          onCreate={handleCreateOrUpdate}
          loading={drivers.create.isPending || drivers.update.isPending}
          allocatedMap={allocatedMap}
          receivedMap={receivedMap}
          existingDriverNames={drivers.items.map((d) => d.name)}
        />
      </PageHeader>

      {editingDriver && (
        <AddDriverDialog
          resources={resources.items}
          activities={activities.items}
          costObjects={costObjects.items}
          costCenters={enrichedCostCenters}
          activityCenters={enrichedActivityCenters}
          costObjectCenters={enrichedCostObjectCenters}
          onCreate={handleCreateOrUpdate}
          loading={drivers.create.isPending || drivers.update.isPending}
          allocatedMap={allocatedMap}
          receivedMap={receivedMap}
          existingDriverNames={drivers.items.map((d) => d.name)}
          editingDriver={editingDriver}
          onClose={() => setEditingDriver(null)}
        />
      )}

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : drivers.items.length === 0 ? (
        <div className="mt-8 text-sm text-muted-foreground text-center py-12 border border-dashed rounded-lg">
          <Settings2 className="h-8 w-8 mx-auto mb-3 opacity-40" />
          <p>No hay asignaciones todavía.</p>
          <p className="text-xs mt-1">
            Crea tu primera asignación para conectar recursos con actividades u
            objetos de costo.
          </p>
          <p className="text-xs mt-3 max-w-md mx-auto text-muted-foreground/70">
            <strong>Uniforme:</strong> reparte equitativamente entre destinos.{" "}
            <strong>Extendido:</strong> distribución manual por valores medidos
            (m², hrs, kWh).
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Stage 1: Resources → Activities */}
          {resourceToActivity.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-muted-foreground flex items-center gap-2">
                <Badge variant="outline" className="bg-primary/5">
                  Etapa 1
                </Badge>
                Recursos → Actividades / Recursos ({resourceToActivity.length})
              </h3>
              <div className="grid grid-cols-1 gap-3">
                {resourceToActivity.map((driver) => {
                  const source = getSourceInfo(driver);
                  return (
                    <DriverCard
                      key={driver.id}
                      driver={driver}
                      sourceName={source.name}
                      sourceAmount={source.amount}
                      destItems={getDestItems(driver)}
                      onDelete={handleDelete}
                      onEdit={setEditingDriver}
                    />
                  );
                })}
              </div>
            </div>
          )}

          {/* Stage 2: Activities/Resources → Cost Objects */}
          {activityToObject.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-muted-foreground flex items-center gap-2">
                <Badge variant="outline" className="bg-warning/5">
                  Etapa 2
                </Badge>
                Actividades → Objetos de Costo ({activityToObject.length})
              </h3>
              <div className="grid grid-cols-1 gap-3">
                {activityToObject.map((driver) => {
                  const source = getSourceInfo(driver);
                  return (
                    <DriverCard
                      key={driver.id}
                      driver={driver}
                      sourceName={source.name}
                      sourceAmount={source.amount}
                      destItems={getDestItems(driver)}
                      onDelete={handleDelete}
                      onEdit={setEditingDriver}
                    />
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </AppLayout>
  );
};

export default AssignmentsPage;
