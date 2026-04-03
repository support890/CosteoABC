import { useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { ChevronRight, ChevronDown, Target, Plus, Loader2 } from "lucide-react";
import {
  usePerspectives,
  useKPIs,
  type KPI,
  type Perspective,
} from "@/hooks/use-supabase-data";
import { useToast } from "@/hooks/use-toast";

/* ───── KPI status helper ───── */
function getStatus(kpi: KPI): "success" | "warning" | "danger" {
  if (kpi.threshold_green != null && kpi.current_value >= kpi.threshold_green)
    return "success";
  if (kpi.threshold_yellow != null && kpi.current_value >= kpi.threshold_yellow)
    return "warning";
  return "danger";
}

const statusDot = {
  success: "bg-success",
  warning: "bg-warning",
  danger: "bg-danger",
};

const statusText = {
  success: "text-success",
  warning: "text-warning",
  danger: "text-danger",
};

/* ───── KPI Tree Item ───── */
function KPITreeItem({
  kpi,
  allKpis,
  depth = 0,
  selectedId,
  onSelect,
}: {
  kpi: KPI;
  allKpis: KPI[];
  depth?: number;
  selectedId: string | null;
  onSelect: (kpi: KPI) => void;
}) {
  const [expanded, setExpanded] = useState(true);
  const children = allKpis.filter((k) => k.parent_id === kpi.id);
  const hasChildren = children.length > 0;
  const status = getStatus(kpi);

  return (
    <div>
      <div
        className={`flex items-center gap-3 py-2 px-3 rounded-md hover:bg-accent/50 cursor-pointer transition-colors ${selectedId === kpi.id ? "bg-accent" : ""}`}
        style={{ paddingLeft: `${depth * 24 + 12}px` }}
        onClick={() => {
          onSelect(kpi);
          if (hasChildren) setExpanded(!expanded);
        }}
      >
        {hasChildren ? (
          expanded ? (
            <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
          ) : (
            <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
          )
        ) : (
          <Target className="h-4 w-4 text-muted-foreground shrink-0" />
        )}
        <div className={`h-2 w-2 rounded-full ${statusDot[status]} shrink-0`} />
        <span
          className={`text-sm ${depth === 0 ? "font-semibold" : "font-medium"} flex-1`}
        >
          {kpi.name}
        </span>
        <span className="text-xs text-muted-foreground">{kpi.weight}%</span>
        <span className={`text-sm font-bold ${statusText[status]}`}>
          {kpi.current_value.toFixed(1)}
        </span>
      </div>
      {hasChildren &&
        expanded &&
        children.map((child) => (
          <KPITreeItem
            key={child.id}
            kpi={child}
            allKpis={allKpis}
            depth={depth + 1}
            selectedId={selectedId}
            onSelect={onSelect}
          />
        ))}
    </div>
  );
}

/* ───── Add KPI Dialog ───── */
function AddKPIDialog({
  perspectives,
  kpis,
  onCreate,
  loading,
}: {
  perspectives: Perspective[];
  kpis: KPI[];
  onCreate: (kpi: Record<string, unknown>) => void;
  loading: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [perspectiveId, setPerspectiveId] = useState("");
  const [parentId, setParentId] = useState("none");
  const [weight, setWeight] = useState("50");
  const [targetValue, setTargetValue] = useState("");
  const [thresholdGreen, setThresholdGreen] = useState("");
  const [thresholdYellow, setThresholdYellow] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onCreate({
      name,
      perspective_id: perspectiveId,
      parent_id: parentId === "none" ? null : parentId,
      weight: parseFloat(weight),
      target_value: targetValue ? parseFloat(targetValue) : null,
      threshold_green: thresholdGreen ? parseFloat(thresholdGreen) : null,
      threshold_yellow: thresholdYellow ? parseFloat(thresholdYellow) : null,
      current_value: 0,
    });
    setName("");
    setWeight("50");
    setTargetValue("");
    setThresholdGreen("");
    setThresholdYellow("");
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus className="h-4 w-4 mr-2" />
          Nuevo KPI
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nuevo KPI</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          <div className="space-y-2">
            <Label>Nombre</Label>
            <Input
              placeholder="Ej: ROI"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Perspectiva</Label>
              <Select value={perspectiveId} onValueChange={setPerspectiveId}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar" />
                </SelectTrigger>
                <SelectContent>
                  {perspectives.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Peso (%)</Label>
              <Input
                type="number"
                value={weight}
                onChange={(e) => setWeight(e.target.value)}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label>KPI padre (opcional)</Label>
            <Select value={parentId} onValueChange={setParentId}>
              <SelectTrigger>
                <SelectValue placeholder="Ninguno (raíz)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Ninguno (raíz)</SelectItem>
                {kpis
                  .filter((k) => !k.parent_id)
                  .map((k) => (
                    <SelectItem key={k.id} value={k.id}>
                      {k.name}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-2">
              <Label>Objetivo</Label>
              <Input
                type="number"
                step="0.01"
                placeholder="—"
                value={targetValue}
                onChange={(e) => setTargetValue(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Umbral verde</Label>
              <Input
                type="number"
                step="0.01"
                placeholder="—"
                value={thresholdGreen}
                onChange={(e) => setThresholdGreen(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Umbral amarillo</Label>
              <Input
                type="number"
                step="0.01"
                placeholder="—"
                value={thresholdYellow}
                onChange={(e) => setThresholdYellow(e.target.value)}
              />
            </div>
          </div>
          <Button
            type="submit"
            className="w-full"
            disabled={loading || !perspectiveId}
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            Crear KPI
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/* ───── Add Perspective Dialog ───── */
function AddPerspectiveDialog({
  onCreate,
  loading,
}: {
  onCreate: (p: Record<string, unknown>) => void;
  loading: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [weight, setWeight] = useState("25");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onCreate({ name, weight: parseFloat(weight) });
    setName("");
    setWeight("25");
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          <Plus className="h-4 w-4 mr-2" />
          Perspectiva
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nueva Perspectiva</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          <div className="space-y-2">
            <Label>Nombre</Label>
            <Input
              placeholder="Ej: Financiera"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label>Peso (%)</Label>
            <Input
              type="number"
              value={weight}
              onChange={(e) => setWeight(e.target.value)}
            />
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            Crear
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/* ───── Page ───── */
const StrategyPage = () => {
  const { toast } = useToast();
  const perspectives = usePerspectives();
  const kpis = useKPIs();
  const [selectedKPI, setSelectedKPI] = useState<KPI | null>(null);

  const isLoading = perspectives.isLoading || kpis.isLoading;

  // Group KPIs by perspective, showing root KPIs (no parent) per perspective
  const rootKpis = kpis.items.filter((k) => !k.parent_id);

  const handleCreateKPI = async (item: Record<string, unknown>) => {
    try {
      await kpis.create.mutateAsync(item as never);
      toast({ title: "KPI creado" });
    } catch (err: unknown) {
      toast({
        variant: "destructive",
        title: "Error",
        description: (err as Error).message,
      });
    }
  };

  const handleCreatePerspective = async (item: Record<string, unknown>) => {
    try {
      await perspectives.create.mutateAsync(item as never);
      toast({ title: "Perspectiva creada" });
    } catch (err: unknown) {
      toast({
        variant: "destructive",
        title: "Error",
        description: (err as Error).message,
      });
    }
  };

  const selected = selectedKPI;
  const selStatus = selected ? getStatus(selected) : null;

  return (
    <AppLayout>
      <PageHeader
        title="Estrategia (BSC)"
        description="Balanced Scorecard — Árbol de KPIs y Objetivos Estratégicos"
      >
        <AddPerspectiveDialog
          onCreate={handleCreatePerspective}
          loading={perspectives.create.isPending}
        />
        <AddKPIDialog
          perspectives={perspectives.items}
          kpis={kpis.items}
          onCreate={handleCreateKPI}
          loading={kpis.create.isPending}
        />
      </PageHeader>

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <Card className="border-border/50">
              <CardContent className="p-4">
                {perspectives.items.length === 0 ? (
                  <div className="py-12 text-center text-sm text-muted-foreground">
                    Crea tu primera perspectiva (Financiera, Clientes, etc.)
                    para empezar.
                  </div>
                ) : (
                  perspectives.items.map((perspective) => {
                    const perspKpis = rootKpis.filter(
                      (k) => k.perspective_id === perspective.id,
                    );
                    return (
                      <div key={perspective.id} className="mb-4">
                        <div className="flex items-center gap-2 py-2 px-3 bg-muted/50 rounded-md mb-1">
                          <span className="text-sm font-semibold flex-1">
                            {perspective.name}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {perspective.weight}%
                          </span>
                        </div>
                        {perspKpis.length === 0 ? (
                          <p className="text-xs text-muted-foreground px-3 py-2">
                            Sin KPIs en esta perspectiva
                          </p>
                        ) : (
                          perspKpis.map((kpi) => (
                            <KPITreeItem
                              key={kpi.id}
                              kpi={kpi}
                              allKpis={kpis.items}
                              selectedId={selectedKPI?.id ?? null}
                              onSelect={setSelectedKPI}
                            />
                          ))
                        )}
                      </div>
                    );
                  })
                )}
              </CardContent>
            </Card>
          </div>

          <div>
            <Card className="border-border/50">
              <CardContent className="p-4">
                <h3 className="text-sm font-semibold mb-4">Detalle del KPI</h3>
                {!selected ? (
                  <p className="text-xs text-muted-foreground">
                    Selecciona un KPI del árbol para ver sus detalles.
                  </p>
                ) : (
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 mb-2">
                      <div
                        className={`h-3 w-3 rounded-full ${statusDot[selStatus!]}`}
                      />
                      <span className="font-medium">{selected.name}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">
                        Valor actual
                      </span>
                      <span
                        className={`font-mono font-bold ${statusText[selStatus!]}`}
                      >
                        {selected.current_value.toFixed(1)}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Objetivo</span>
                      <span className="font-mono font-medium">
                        {selected.target_value?.toFixed(1) ?? "—"}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">
                        Umbral verde
                      </span>
                      <span className="font-mono font-medium">
                        {selected.threshold_green?.toFixed(1) ?? "—"}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">
                        Umbral amarillo
                      </span>
                      <span className="font-mono font-medium">
                        {selected.threshold_yellow?.toFixed(1) ?? "—"}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Peso</span>
                      <span className="font-mono font-medium">
                        {selected.weight}%
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Unidad</span>
                      <span className="font-mono font-medium">
                        {selected.unit}
                      </span>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </AppLayout>
  );
};

export default StrategyPage;
