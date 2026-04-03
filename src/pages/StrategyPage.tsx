import { useState } from "react";
import { useNavigate } from "react-router-dom";
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
import { useBSCContext } from "@/contexts/BSCContext";
import {
  useBSCPerspectives,
  useBSCKPIs,
  type BSCPerspective,
  type BSCKPI,
} from "@/hooks/use-bsc-data";
import { useToast } from "@/hooks/use-toast";

/* ── KPI status helpers ── */
function getStatus(kpi: BSCKPI): "success" | "warning" | "danger" {
  if (kpi.threshold_green != null && kpi.current_value >= kpi.threshold_green)
    return "success";
  if (kpi.threshold_yellow != null && kpi.current_value >= kpi.threshold_yellow)
    return "warning";
  return "danger";
}

const statusDot = { success: "bg-success", warning: "bg-warning", danger: "bg-danger" };
const statusText = { success: "text-success", warning: "text-warning", danger: "text-danger" };

/* ── KPI Tree Item ── */
function KPITreeItem({
  kpi,
  allKpis,
  depth = 0,
  selectedId,
  onSelect,
}: {
  kpi: BSCKPI;
  allKpis: BSCKPI[];
  depth?: number;
  selectedId: string | null;
  onSelect: (kpi: BSCKPI) => void;
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
        onClick={() => { onSelect(kpi); if (hasChildren) setExpanded(!expanded); }}
      >
        {hasChildren ? (
          expanded
            ? <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
            : <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
        ) : (
          <Target className="h-4 w-4 text-muted-foreground shrink-0" />
        )}
        <div className={`h-2 w-2 rounded-full ${statusDot[status]} shrink-0`} />
        <span className={`text-sm ${depth === 0 ? "font-semibold" : "font-medium"} flex-1`}>
          {kpi.name}
        </span>
        <span className="text-xs text-muted-foreground">{kpi.weight}%</span>
        <span className={`text-sm font-bold ${statusText[status]}`}>
          {kpi.current_value.toFixed(1)}
        </span>
      </div>
      {hasChildren && expanded && children.map((child) => (
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

/* ── Add KPI Dialog ── */
function AddKPIDialog({
  perspectives,
  kpis,
  onCreate,
  loading,
}: {
  perspectives: BSCPerspective[];
  kpis: BSCKPI[];
  onCreate: (kpi: Partial<BSCKPI>) => void;
  loading: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [perspectiveId, setPerspectiveId] = useState("");
  const [parentId, setParentId] = useState("none");
  const [weight, setWeight] = useState("50");
  const [targetValue, setTargetValue] = useState("");
  const [currentValue, setCurrentValue] = useState("0");
  const [thresholdGreen, setThresholdGreen] = useState("");
  const [thresholdYellow, setThresholdYellow] = useState("");
  const [unit, setUnit] = useState("%");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onCreate({
      name,
      perspective_id: perspectiveId,
      parent_id: parentId === "none" ? null : parentId,
      weight: parseFloat(weight),
      target_value: targetValue ? parseFloat(targetValue) : null,
      current_value: parseFloat(currentValue),
      threshold_green: thresholdGreen ? parseFloat(thresholdGreen) : null,
      threshold_yellow: thresholdYellow ? parseFloat(thresholdYellow) : null,
      unit,
    });
    setName(""); setWeight("50"); setTargetValue(""); setCurrentValue("0");
    setThresholdGreen(""); setThresholdYellow(""); setUnit("%"); setParentId("none");
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
            <Input placeholder="Ej: ROI" value={name} onChange={(e) => setName(e.target.value)} required />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Perspectiva</Label>
              <Select value={perspectiveId} onValueChange={setPerspectiveId}>
                <SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                <SelectContent>
                  {perspectives.map((p) => (
                    <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Unidad</Label>
              <Input placeholder="%, pts, $..." value={unit} onChange={(e) => setUnit(e.target.value)} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Peso (%)</Label>
              <Input type="number" value={weight} onChange={(e) => setWeight(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Valor actual</Label>
              <Input type="number" step="0.01" value={currentValue} onChange={(e) => setCurrentValue(e.target.value)} />
            </div>
          </div>
          <div className="space-y-2">
            <Label>KPI padre (opcional)</Label>
            <Select value={parentId} onValueChange={setParentId}>
              <SelectTrigger><SelectValue placeholder="Ninguno (raíz)" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Ninguno (raíz)</SelectItem>
                {kpis.filter((k) => !k.parent_id).map((k) => (
                  <SelectItem key={k.id} value={k.id}>{k.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-2">
              <Label>Objetivo</Label>
              <Input type="number" step="0.01" placeholder="—" value={targetValue} onChange={(e) => setTargetValue(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Umbral verde</Label>
              <Input type="number" step="0.01" placeholder="—" value={thresholdGreen} onChange={(e) => setThresholdGreen(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Umbral amarillo</Label>
              <Input type="number" step="0.01" placeholder="—" value={thresholdYellow} onChange={(e) => setThresholdYellow(e.target.value)} />
            </div>
          </div>
          <Button type="submit" className="w-full" disabled={loading || !perspectiveId}>
            {loading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            Crear KPI
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/* ── Add Perspective Dialog ── */
function AddPerspectiveDialog({
  onCreate,
  loading,
}: {
  onCreate: (p: { name: string; weight: number }) => void;
  loading: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [weight, setWeight] = useState("25");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onCreate({ name, weight: parseFloat(weight) });
    setName(""); setWeight("25"); setOpen(false);
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
            <Input placeholder="Ej: Financiera" value={name} onChange={(e) => setName(e.target.value)} required />
          </div>
          <div className="space-y-2">
            <Label>Peso (%)</Label>
            <Input type="number" value={weight} onChange={(e) => setWeight(e.target.value)} />
          </div>
          <Button type="submit" className="w-full" disabled={loading}>Crear</Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/* ── Page ── */
const StrategyPage = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { selectedBSCModel, selectedBSCPeriod } = useBSCContext();

  // Redirect if no model/period selected
  if (!selectedBSCModel || !selectedBSCPeriod) {
    return (
      <AppLayout>
        <div className="flex flex-col items-center justify-center py-32 gap-4">
          <Target className="h-12 w-12 text-muted-foreground opacity-30" />
          <p className="text-muted-foreground text-sm">
            Selecciona un modelo y período BSC para continuar.
          </p>
          <Button onClick={() => navigate("/bsc")}>Ir a Modelos BSC</Button>
        </div>
      </AppLayout>
    );
  }

  const perspectives = useBSCPerspectives(selectedBSCPeriod.id);
  const perspectiveIds = perspectives.items.map((p) => p.id);
  const kpis = useBSCKPIs(perspectiveIds);
  const [selectedKPI, setSelectedKPI] = useState<BSCKPI | null>(null);

  const isLoading = perspectives.isLoading || kpis.isLoading;
  const rootKpis = kpis.items.filter((k) => !k.parent_id);

  const handleCreateKPI = async (item: Partial<BSCKPI>) => {
    try {
      await kpis.create.mutateAsync(item);
      toast({ title: "KPI creado" });
    } catch (err: unknown) {
      toast({ variant: "destructive", title: "Error", description: (err as Error).message });
    }
  };

  const handleCreatePerspective = async (item: { name: string; weight: number }) => {
    try {
      await perspectives.create.mutateAsync(item);
      toast({ title: "Perspectiva creada" });
    } catch (err: unknown) {
      toast({ variant: "destructive", title: "Error", description: (err as Error).message });
    }
  };

  const selStatus = selectedKPI ? getStatus(selectedKPI) : null;

  return (
    <AppLayout>
      <PageHeader
        title="Estrategia (BSC)"
        description={`${selectedBSCModel.name} — ${selectedBSCPeriod.name}`}
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
          {/* KPI tree */}
          <div className="lg:col-span-2">
            <Card className="border-border/50">
              <CardContent className="p-4">
                {perspectives.items.length === 0 ? (
                  <div className="py-12 text-center text-sm text-muted-foreground">
                    Crea tu primera perspectiva (Financiera, Clientes, etc.) para empezar.
                  </div>
                ) : (
                  perspectives.items.map((perspective) => {
                    const perspKpis = rootKpis.filter(
                      (k) => k.perspective_id === perspective.id,
                    );
                    return (
                      <div key={perspective.id} className="mb-4">
                        <div className="flex items-center gap-2 py-2 px-3 bg-muted/50 rounded-md mb-1">
                          <span className="text-sm font-semibold flex-1">{perspective.name}</span>
                          <span className="text-xs text-muted-foreground">{perspective.weight}%</span>
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

          {/* KPI detail panel */}
          <div>
            <Card className="border-border/50">
              <CardContent className="p-4">
                <h3 className="text-sm font-semibold mb-4">Detalle del KPI</h3>
                {!selectedKPI ? (
                  <p className="text-xs text-muted-foreground">
                    Selecciona un KPI del árbol para ver sus detalles.
                  </p>
                ) : (
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 mb-2">
                      <div className={`h-3 w-3 rounded-full ${statusDot[selStatus!]}`} />
                      <span className="font-medium">{selectedKPI.name}</span>
                    </div>
                    {[
                      { label: "Valor actual", value: selectedKPI.current_value.toFixed(1), colored: true },
                      { label: "Objetivo", value: selectedKPI.target_value?.toFixed(1) ?? "—" },
                      { label: "Umbral verde", value: selectedKPI.threshold_green?.toFixed(1) ?? "—" },
                      { label: "Umbral amarillo", value: selectedKPI.threshold_yellow?.toFixed(1) ?? "—" },
                      { label: "Peso", value: `${selectedKPI.weight}%` },
                      { label: "Unidad", value: selectedKPI.unit },
                    ].map(({ label, value, colored }) => (
                      <div key={label} className="flex justify-between text-sm">
                        <span className="text-muted-foreground">{label}</span>
                        <span className={`font-mono font-bold ${colored ? statusText[selStatus!] : "font-medium"}`}>
                          {value}
                        </span>
                      </div>
                    ))}
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
