import React, { useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { PageHeader } from "@/components/PageHeader";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useBSCModels, useBSCPeriods } from "@/hooks/use-bsc-data";
import type { Model, Period } from "@/hooks/use-supabase-data";
import { useBSCContext } from "@/contexts/BSCContext";
import {
  Plus,
  Play,
  Target,
  Edit2,
  Trash2,
  Loader2,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { usePlanLimits } from "@/hooks/use-plan-limits";
import { UsageDialog } from "@/components/UsageDialog";

/* ── Period helpers ──────────────────────────────────── */
const months = [
  { value: "1", label: "Enero" }, { value: "2", label: "Febrero" },
  { value: "3", label: "Marzo" }, { value: "4", label: "Abril" },
  { value: "5", label: "Mayo" }, { value: "6", label: "Junio" },
  { value: "7", label: "Julio" }, { value: "8", label: "Agosto" },
  { value: "9", label: "Septiembre" }, { value: "10", label: "Octubre" },
  { value: "11", label: "Noviembre" }, { value: "12", label: "Diciembre" },
];
const trimestres = [
  { value: "1", label: "1º Trimestre (Ene-Mar)" },
  { value: "2", label: "2º Trimestre (Abr-Jun)" },
  { value: "3", label: "3º Trimestre (Jul-Sep)" },
  { value: "4", label: "4º Trimestre (Oct-Dic)" },
];
const semestres = [
  { value: "1", label: "1º Semestre (Ene-Jun)" },
  { value: "2", label: "2º Semestre (Jul-Dic)" },
];

/* ── BSC Model Card ──────────────────────────────────── */
function BSCModelCard({
  model,
  allPeriods,
  createPeriod,
  onEdit,
  onStart,
}: {
  model: Model;
  allPeriods: Period[];
  createPeriod: { mutateAsync: (data: Partial<Period>) => Promise<Period>; isPending: boolean };
  onEdit: () => void;
  onStart: (period: Period) => void;
}) {
  const modelPeriods = allPeriods.filter((p) => p.model_id === model.id);
  const [selectedPeriodId, setSelectedPeriodId] = useState<string>(
    modelPeriods[0]?.id || "",
  );
  const [openPeriodDialog, setOpenPeriodDialog] = useState(false);
  const [periodMode, setPeriodMode] = useState<
    "monthly" | "quarterly" | "semiannually" | "annually" | "custom"
  >("quarterly");
  const [selectedSubPeriod, setSelectedSubPeriod] = useState<string>("1");
  const [selectedYear, setSelectedYear] = useState<string>(
    new Date().getFullYear().toString(),
  );
  const [newPeriod, setNewPeriod] = useState({
    name: "",
    start_date: "",
    end_date: "",
    status: "open" as const,
    model_id: model.id,
  });

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 7 }, (_, i) =>
    (currentYear - 3 + i).toString(),
  );

  const updateDates = React.useCallback(
    (mode: string, subValue: string, year: string) => {
      const yearNum = parseInt(year, 10);
      const subNum = parseInt(subValue, 10);
      let startDate: Date, endDate: Date, name = "";
      switch (mode) {
        case "monthly":
          startDate = new Date(yearNum, subNum - 1, 1);
          endDate = new Date(yearNum, subNum, 0);
          name = `${months.find((m) => m.value === subValue)?.label} ${year}`;
          break;
        case "quarterly":
          startDate = new Date(yearNum, (subNum - 1) * 3, 1);
          endDate = new Date(yearNum, subNum * 3, 0);
          name = `${subNum}º Trimestre ${year}`;
          break;
        case "semiannually":
          startDate = new Date(yearNum, (subNum - 1) * 6, 1);
          endDate = new Date(yearNum, subNum * 6, 0);
          name = `${subNum}º Semestre ${year}`;
          break;
        case "annually":
          startDate = new Date(yearNum, 0, 1);
          endDate = new Date(yearNum, 12, 0);
          name = `Año ${year}`;
          break;
        default:
          return;
      }
      setNewPeriod((prev) => ({
        ...prev,
        name,
        start_date: startDate.toISOString().split("T")[0],
        end_date: endDate.toISOString().split("T")[0],
      }));
    },
    [],
  );

  React.useEffect(() => {
    if (openPeriodDialog && periodMode !== "custom") {
      updateDates(periodMode, selectedSubPeriod, selectedYear);
    }
  }, [openPeriodDialog, periodMode, selectedSubPeriod, selectedYear, updateDates]);

  const handleCreatePeriod = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const created = await createPeriod.mutateAsync(newPeriod);
      setOpenPeriodDialog(false);
      setSelectedPeriodId(created.id);
      setNewPeriod({ name: "", start_date: "", end_date: "", status: "open", model_id: model.id });
      toast.success("Período creado");
    } catch {
      toast.error("Error al crear período");
    }
  };

  const handleStart = () => {
    if (!selectedPeriodId) {
      toast.error("Selecciona un período para empezar");
      return;
    }
    const period = modelPeriods.find((p) => p.id === selectedPeriodId);
    if (!period) return;
    onStart(period);
  };

  return (
    <Card className="flex flex-col relative overflow-hidden group hover:shadow-md transition-shadow">
      <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-bl-full -mr-16 -mt-16 transition-transform group-hover:scale-110" />
      <CardHeader className="pb-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-background rounded-xl border shadow-sm">
            <Target className="h-6 w-6 text-emerald-500" />
          </div>
          <div className="flex-1 min-w-0">
            <CardTitle className="text-xl truncate">{model.name}</CardTitle>
            <CardDescription className="text-xs mt-1">
              Balanced Scorecard
            </CardDescription>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-muted-foreground hover:text-primary shrink-0"
            onClick={onEdit}
          >
            <Edit2 className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>

      <CardContent className="flex-1">
        <p className="text-sm text-muted-foreground line-clamp-2 min-h-[2.5rem]">
          {model.description || "Sin descripción proporcionada."}
        </p>

        <div className="mt-6 space-y-3">
          <Label className="text-xs text-muted-foreground flex items-center justify-between">
            <span>Período de Evaluación</span>
            <Dialog open={openPeriodDialog} onOpenChange={setOpenPeriodDialog}>
              <DialogTrigger asChild>
                <button className="text-primary hover:underline flex items-center text-xs">
                  <Plus className="h-3 w-3 mr-1" /> Nuevo
                </button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Crear Período para {model.name}</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleCreatePeriod} className="space-y-4">
                  <div className="space-y-2">
                    <Label>Tipo de Período</Label>
                    <Select
                      value={periodMode}
                      onValueChange={(val: typeof periodMode) => {
                        setPeriodMode(val);
                        if (val !== "custom") {
                          const initialSub = val === "monthly" ? (new Date().getMonth() + 1).toString() : "1";
                          setSelectedSubPeriod(initialSub);
                          updateDates(val, initialSub, selectedYear);
                        } else {
                          setNewPeriod({ ...newPeriod, name: "", start_date: "", end_date: "" });
                        }
                      }}
                    >
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="monthly">Mensual</SelectItem>
                        <SelectItem value="quarterly">Trimestral</SelectItem>
                        <SelectItem value="semiannually">Semestral</SelectItem>
                        <SelectItem value="annually">Anual</SelectItem>
                        <SelectItem value="custom">Personalizado</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {periodMode !== "custom" && (
                    <div className="grid grid-cols-2 gap-4">
                      {periodMode !== "annually" && (
                        <div className="space-y-2">
                          <Label>
                            {periodMode === "monthly" && "Mes"}
                            {periodMode === "quarterly" && "Trimestre"}
                            {periodMode === "semiannually" && "Semestre"}
                          </Label>
                          <Select
                            value={selectedSubPeriod}
                            onValueChange={(val) => {
                              setSelectedSubPeriod(val);
                              updateDates(periodMode, val, selectedYear);
                            }}
                          >
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                              {periodMode === "monthly" && months.map((m) => (
                                <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                              ))}
                              {periodMode === "quarterly" && trimestres.map((t) => (
                                <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                              ))}
                              {periodMode === "semiannually" && semestres.map((s) => (
                                <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      )}
                      <div className={periodMode === "annually" ? "col-span-2 space-y-2" : "space-y-2"}>
                        <Label>Año</Label>
                        <Select
                          value={selectedYear}
                          onValueChange={(val) => {
                            setSelectedYear(val);
                            updateDates(periodMode, selectedSubPeriod, val);
                          }}
                        >
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {years.map((y) => <SelectItem key={y} value={y}>{y}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  )}

                  {periodMode === "custom" && (
                    <>
                      <div className="space-y-2">
                        <Label>Nombre del período</Label>
                        <Input
                          required
                          value={newPeriod.name}
                          onChange={(e) => setNewPeriod({ ...newPeriod, name: e.target.value })}
                          placeholder="Ej. Q1 2026"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Inicio</Label>
                          <Input required type="date" value={newPeriod.start_date} onChange={(e) => setNewPeriod({ ...newPeriod, start_date: e.target.value })} />
                        </div>
                        <div className="space-y-2">
                          <Label>Fin</Label>
                          <Input required type="date" value={newPeriod.end_date} onChange={(e) => setNewPeriod({ ...newPeriod, end_date: e.target.value })} />
                        </div>
                      </div>
                    </>
                  )}

                  {periodMode !== "custom" && newPeriod.name && (
                    <p className="text-xs text-muted-foreground bg-muted/50 px-3 py-2 rounded-md">
                      Período: <strong>{newPeriod.name}</strong> ({newPeriod.start_date} → {newPeriod.end_date})
                    </p>
                  )}

                  <DialogFooter>
                    <Button type="button" variant="outline" onClick={() => setOpenPeriodDialog(false)}>Cancelar</Button>
                    <Button type="submit" disabled={createPeriod.isPending || !newPeriod.name}>
                      {createPeriod.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                      Crear
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </Label>

          {modelPeriods.length > 0 ? (
            <Select value={selectedPeriodId} onValueChange={setSelectedPeriodId}>
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar período..." />
              </SelectTrigger>
              <SelectContent>
                {modelPeriods.map((p) => (
                  <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <div className="text-sm text-amber-600 bg-amber-50 dark:bg-amber-950/30 dark:text-amber-400 px-3 py-2 rounded-md border border-amber-200 dark:border-amber-800">
              No hay períodos. Crea uno para empezar.
            </div>
          )}
        </div>
      </CardContent>

      <CardFooter className="pt-2 border-t mt-auto">
        <Button
          className="w-full relative z-10"
          disabled={!selectedPeriodId || modelPeriods.length === 0}
          onClick={handleStart}
        >
          <Play className="h-4 w-4 mr-2 fill-current" />
          Abrir Balanced Scorecard
        </Button>
      </CardFooter>
    </Card>
  );
}

/* ── Main Page ───────────────────────────────────────── */
export default function BSCModelsPage() {
  const { items: models, create: createModel, update: updateModel, remove: removeModel, isLoading } = useBSCModels();
  const { items: periods, create: createPeriod } = useBSCPeriods();
  const { setSelectedBSCModel, setSelectedBSCPeriod } = useBSCContext();
  const navigate = useNavigate();

  const { canCreateModel } = usePlanLimits();
  const [limitDialogOpen, setLimitDialogOpen] = useState(false);
  const [openModelDialog, setOpenModelDialog] = useState(false);
  const [editingModel, setEditingModel] = useState<Model | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [newModel, setNewModel] = useState({ name: "", description: "" });

  const handleCreateModel = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createModel.mutateAsync({
        ...newModel,
        base_currency: "USD",
        type: "gobierno",
        module: "bsc",
      } as Partial<Model>);
      setOpenModelDialog(false);
      setNewModel({ name: "", description: "" });
      toast.success("Modelo BSC creado");
    } catch {
      toast.error("Error al crear el modelo");
    }
  };

  const handleUpdateModel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingModel) return;
    try {
      await updateModel.mutateAsync({ id: editingModel.id, name: newModel.name, description: newModel.description });
      setEditingModel(null);
      toast.success("Modelo actualizado");
    } catch {
      toast.error("Error al actualizar");
    }
  };

  const handleDeleteModel = async () => {
    if (!editingModel) return;
    try {
      await removeModel.mutateAsync(editingModel.id);
      setEditingModel(null);
      setIsDeleting(false);
      setDeleteConfirmText("");
      toast.success("Modelo eliminado");
    } catch {
      toast.error("Error al eliminar");
    }
  };

  return (
    <AppLayout>
      <div className="flex flex-col gap-6">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
          <PageHeader
            title="Estrategia BSC"
            description="Balanced Scorecard — define modelos estratégicos y evalúa KPIs por período"
          />
          <Dialog open={openModelDialog} onOpenChange={setOpenModelDialog}>
            <Button onClick={() => {
              if (!canCreateModel) { setLimitDialogOpen(true); return; }
              setNewModel({ name: "", description: "" });
              setEditingModel(null);
              setOpenModelDialog(true);
            }}>
              <Plus className="h-4 w-4 mr-2" />
              Nuevo Modelo BSC
            </Button>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>Crear Modelo BSC</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleCreateModel} className="space-y-4">
                <div className="space-y-2">
                  <Label>Nombre del modelo</Label>
                  <Input
                    required
                    value={newModel.name}
                    onChange={(e) => setNewModel({ ...newModel, name: e.target.value })}
                    placeholder="Ej. Estrategia Corporativa 2025"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Descripción</Label>
                  <Textarea
                    value={newModel.description}
                    onChange={(e) => setNewModel({ ...newModel, description: e.target.value })}
                    placeholder="Descripción del modelo estratégico..."
                  />
                </div>
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setOpenModelDialog(false)}>Cancelar</Button>
                  <Button type="submit" disabled={createModel.isPending}>
                    {createModel.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    Crear Modelo
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : models.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-12 text-center text-muted-foreground bg-muted/20 rounded-lg border border-dashed">
            <Target className="h-12 w-12 mb-4 opacity-20" />
            <p>No tienes modelos BSC creados.</p>
            <p className="text-sm">Crea un modelo para empezar a definir perspectivas y KPIs.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {models.map((model) => (
              <BSCModelCard
                key={model.id}
                model={model}
                allPeriods={periods}
                createPeriod={createPeriod}
                onEdit={() => {
                  setNewModel({ name: model.name, description: model.description || "" });
                  setEditingModel(model);
                }}
                onStart={(period) => {
                  setSelectedBSCModel(model);
                  setSelectedBSCPeriod(period);
                  navigate("/bsc/strategy");
                  toast.success(`Abriendo: ${model.name} — ${period.name}`);
                }}
              />
            ))}
          </div>
        )}
      </div>

      {/* Edit dialog */}
      <Dialog open={!!editingModel} onOpenChange={(open) => !open && setEditingModel(null)}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Editar Modelo BSC</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleUpdateModel} className="space-y-4">
            <div className="space-y-2">
              <Label>Nombre</Label>
              <Input required value={newModel.name} onChange={(e) => setNewModel({ ...newModel, name: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Descripción</Label>
              <Textarea value={newModel.description} onChange={(e) => setNewModel({ ...newModel, description: e.target.value })} />
            </div>
            <DialogFooter className="flex items-center justify-between sm:justify-between w-full">
              <Button type="button" variant="destructive" onClick={() => setIsDeleting(true)}>
                <Trash2 className="h-4 w-4 mr-2" />
                Eliminar
              </Button>
              <div className="flex gap-2">
                <Button type="button" variant="outline" onClick={() => setEditingModel(null)}>Cancelar</Button>
                <Button type="submit" disabled={updateModel.isPending}>Guardar</Button>
              </div>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={isDeleting} onOpenChange={(open) => { setIsDeleting(open); if (!open) setDeleteConfirmText(""); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar modelo?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción eliminará permanentemente <strong>{editingModel?.name}</strong> y todos sus períodos y KPIs.
              <div className="mt-4 space-y-2">
                <Label className="text-sm font-normal">Escribe <strong>{editingModel?.name}</strong> para confirmar:</Label>
                <Input
                  value={deleteConfirmText}
                  onChange={(e) => setDeleteConfirmText(e.target.value)}
                  placeholder="Nombre del modelo"
                  className="border-destructive/20 focus-visible:ring-destructive"
                />
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteModel}
              disabled={deleteConfirmText !== editingModel?.name}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90 disabled:opacity-50"
            >
              Confirmar Eliminación
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <UsageDialog open={limitDialogOpen} onOpenChange={setLimitDialogOpen} showUpgrade />
    </AppLayout>
  );
}
