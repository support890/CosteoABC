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
import { useLogisticsModels, useLogisticsPeriods } from "@/hooks/use-logistics-data";
import type { Model, Period } from "@/hooks/use-supabase-data";
import { useLogisticsContext } from "@/contexts/LogisticsContext";
import { seedDefaultLogisticsData } from "@/hooks/use-logistics-expenses";
import { useTenant } from "@/hooks/use-tenant";
import {
  Plus,
  Play,
  Briefcase,
  Settings,
  ShoppingBag,
  Landmark,
  Edit2,
  Trash2,
  Building,
  Truck,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

const BASE_CURRENCIES = [
  { code: "BOB", name: "Boliviano", symbol: "Bs." },
  { code: "ARS", name: "Peso Argentino", symbol: "$" },
  { code: "USD", name: "Dólar Estadounidense", symbol: "$" },
  { code: "EUR", name: "Euro", symbol: "€" },
  { code: "GBP", name: "Libra Esterlina", symbol: "£" },
  { code: "PEN", name: "Sol Peruano", symbol: "S/" },
  { code: "CLP", name: "Peso Chileno", symbol: "$" },
  { code: "COP", name: "Peso Colombiano", symbol: "$" },
  { code: "BRL", name: "Real Brasileño", symbol: "R$" },
  { code: "MXN", name: "Peso Mexicano", symbol: "$" },
  { code: "UYU", name: "Peso Uruguayo", symbol: "$" },
  { code: "PYG", name: "Guaraní Paraguayo", symbol: "₲" },
  { code: "CRC", name: "Colón Costarricense", symbol: "₡" },
  { code: "DOP", name: "Peso Dominicano", symbol: "RD$" },
  { code: "GTQ", name: "Quetzal Guatemalteco", symbol: "Q" },
  { code: "HNL", name: "Lempira Hondureño", symbol: "L" },
  { code: "NIO", name: "Córdoba Nicaragüense", symbol: "C$" },
  { code: "PAB", name: "Balboa Panameño", symbol: "B/." },
  { code: "VES", name: "Bolívar Venezolano", symbol: "Bs.S" },
  { code: "JPY", name: "Yen Japonés", symbol: "¥" },
  { code: "CNY", name: "Yuan Chino", symbol: "¥" },
  { code: "CAD", name: "Dólar Canadiense", symbol: "$" },
  { code: "AUD", name: "Dólar Australiano", symbol: "$" },
  { code: "CHF", name: "Franco Suizo", symbol: "CHF" },
];

export default function LogisticsModelsPage() {
  const {
    items: models,
    create: createModel,
    update: updateModel,
    remove: removeModel,
    isLoading: isLoadingModels,
  } = useLogisticsModels();
  const { items: periods, create: createPeriod } = useLogisticsPeriods();
  const { setSelectedLogisticsModel, setSelectedLogisticsPeriod } = useLogisticsContext();
  const navigate = useNavigate();

  const [openModelDialog, setOpenModelDialog] = useState(false);
  const [editingModel, setEditingModel] = useState<Model | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [newModel, setNewModel] = useState({
    name: "",
    description: "",
    base_currency: "USD",
    type: "comercio" as "servicio" | "industria" | "comercio" | "gobierno",
  });

  const handleCreateModel = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createModel.mutateAsync({ ...newModel, module: "logistics" });
      setOpenModelDialog(false);
      setNewModel({ name: "", description: "", base_currency: "USD", type: "comercio" });
      toast.success("Modelo de eficiencia logística creado exitosamente");
    } catch (error) {
      toast.error("Error al crear el modelo");
    }
  };

  const handleUpdateModel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingModel) return;
    try {
      await updateModel.mutateAsync({
        id: editingModel.id,
        name: newModel.name,
        description: newModel.description,
        base_currency: newModel.base_currency,
        type: newModel.type,
      });
      setEditingModel(null);
      toast.success("Modelo actualizado");
    } catch (error) {
      toast.error("Error al actualizar el modelo");
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
    } catch (error) {
      toast.error("Error al eliminar el modelo");
    }
  };

  return (
    <AppLayout>
      <div className="flex flex-col gap-6 p-6">
        <div className="flex items-center justify-between">
          <PageHeader
            title="Eficiencia Logística"
            description="Calcula el Punto de Equilibrio y Drop Size Mínimo por ruta para optimizar la rentabilidad logística"
          />
          <Dialog open={openModelDialog} onOpenChange={setOpenModelDialog}>
            <DialogTrigger asChild>
              <Button onClick={() => {
                setNewModel({ name: "", description: "", base_currency: "BOB", type: "comercio" });
                setEditingModel(null);
              }}>
                <Plus className="h-4 w-4 mr-2" />
                Nueva Ruta
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px]">
              <DialogHeader>
                <DialogTitle>Crear Modelo de Eficiencia Logística</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleCreateModel} className="space-y-4">
                <div className="space-y-2">
                  <Label>Nombre de la Ruta / Modelo</Label>
                  <Input
                    required
                    value={newModel.name}
                    onChange={(e) => setNewModel({ ...newModel, name: e.target.value })}
                    placeholder="Ej. Ruta Norte - Santa Cruz"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Descripción</Label>
                  <Textarea
                    value={newModel.description}
                    onChange={(e) => setNewModel({ ...newModel, description: e.target.value })}
                    placeholder="Descripción de la ruta o zona de distribución..."
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Moneda Base</Label>
                    <Select
                      value={newModel.base_currency}
                      onValueChange={(val) => setNewModel({ ...newModel, base_currency: val })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccionar moneda" />
                      </SelectTrigger>
                      <SelectContent>
                        {BASE_CURRENCIES.map((c) => (
                          <SelectItem key={c.code} value={c.code}>
                            {c.name} ({c.symbol})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Sector</Label>
                    <Select
                      value={newModel.type}
                      onValueChange={(val: "servicio" | "industria" | "comercio" | "gobierno") =>
                        setNewModel({ ...newModel, type: val })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="servicio">Servicio</SelectItem>
                        <SelectItem value="industria">Industria</SelectItem>
                        <SelectItem value="comercio">Comercio</SelectItem>
                        <SelectItem value="gobierno">Gobierno</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setOpenModelDialog(false)}>
                    Cancelar
                  </Button>
                  <Button type="submit" disabled={createModel.isPending}>
                    Crear Modelo
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {models.length === 0 && !isLoadingModels ? (
          <div className="flex flex-col items-center justify-center p-12 text-center text-muted-foreground bg-muted/20 rounded-lg border border-dashed">
            <Truck className="h-12 w-12 mb-4 opacity-20" />
            <p>No tienes modelos de eficiencia logística creados.</p>
            <p className="text-sm">Empieza creando una nueva ruta para analizar su punto de equilibrio y drop size.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {models.map((model: Model) => (
              <LogisticsModelCard
                key={model.id}
                model={model}
                allPeriods={periods}
                createPeriod={createPeriod}
                onEdit={() => {
                  setNewModel({
                    name: model.name,
                    description: model.description || "",
                    base_currency: model.base_currency,
                    type: model.type,
                  });
                  setEditingModel(model);
                }}
                onStart={(period: Period) => {
                  setSelectedLogisticsModel(model);
                  setSelectedLogisticsPeriod(period);
                  navigate("/logistics/inputs");
                  toast.success(`Iniciando análisis: ${model.name}`);
                }}
              />
            ))}
          </div>
        )}
      </div>

      {/* Edit dialog */}
      <Dialog open={!!editingModel} onOpenChange={(open) => !open && setEditingModel(null)}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Editar Modelo Logístico</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleUpdateModel} className="space-y-4">
            <div className="space-y-2">
              <Label>Nombre</Label>
              <Input
                required
                value={newModel.name}
                onChange={(e) => setNewModel({ ...newModel, name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Descripción</Label>
              <Textarea
                value={newModel.description}
                onChange={(e) => setNewModel({ ...newModel, description: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Moneda Base</Label>
                <Select
                  value={newModel.base_currency}
                  onValueChange={(val) => setNewModel({ ...newModel, base_currency: val })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {BASE_CURRENCIES.map((c) => (
                      <SelectItem key={c.code} value={c.code}>
                        {c.name} ({c.symbol})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Sector</Label>
                <Select
                  value={newModel.type}
                  onValueChange={(val: "servicio" | "industria" | "comercio" | "gobierno") =>
                    setNewModel({ ...newModel, type: val })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="servicio">Servicio</SelectItem>
                    <SelectItem value="industria">Industria</SelectItem>
                    <SelectItem value="comercio">Comercio</SelectItem>
                    <SelectItem value="gobierno">Gobierno</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter className="flex items-center justify-between sm:justify-between w-full">
              <Button type="button" variant="destructive" onClick={() => setIsDeleting(true)}>
                <Trash2 className="h-4 w-4 mr-2" />
                Eliminar
              </Button>
              <div className="flex gap-2">
                <Button type="button" variant="outline" onClick={() => setEditingModel(null)}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={updateModel.isPending}>
                  Guardar Cambios
                </Button>
              </div>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={isDeleting} onOpenChange={(open) => { setIsDeleting(open); if (!open) setDeleteConfirmText(""); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Está absolutamente seguro?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción eliminará permanentemente el modelo <strong>{editingModel?.name}</strong> y todos sus datos asociados.
              <div className="mt-4 space-y-2">
                <Label className="text-sm font-normal">
                  Escribe <strong>{editingModel?.name}</strong> para confirmar:
                </Label>
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
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Confirmar Eliminación
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppLayout>
  );
}

// ── Period helpers ──────────────────────────────────────────────────────────────

const months = [
  { value: "1", label: "Enero" }, { value: "2", label: "Febrero" },
  { value: "3", label: "Marzo" }, { value: "4", label: "Abril" },
  { value: "5", label: "Mayo" }, { value: "6", label: "Junio" },
  { value: "7", label: "Julio" }, { value: "8", label: "Agosto" },
  { value: "9", label: "Septiembre" }, { value: "10", label: "Octubre" },
  { value: "11", label: "Noviembre" }, { value: "12", label: "Diciembre" },
];

const bimestres = [
  { value: "1", label: "1º Bimestre (Ene-Feb)" }, { value: "2", label: "2º Bimestre (Mar-Abr)" },
  { value: "3", label: "3º Bimestre (May-Jun)" }, { value: "4", label: "4º Bimestre (Jul-Ago)" },
  { value: "5", label: "5º Bimestre (Sep-Oct)" }, { value: "6", label: "6º Bimestre (Nov-Dic)" },
];

const trimestres = [
  { value: "1", label: "1º Trimestre (Ene-Mar)" }, { value: "2", label: "2º Trimestre (Abr-Jun)" },
  { value: "3", label: "3º Trimestre (Jul-Sep)" }, { value: "4", label: "4º Trimestre (Oct-Dic)" },
];

const semestres = [
  { value: "1", label: "1º Semestre (Ene-Jun)" }, { value: "2", label: "2º Semestre (Jul-Dic)" },
];

// ── Model Card ─────────────────────────────────────────────────────────────────

function LogisticsModelCard({
  model,
  allPeriods,
  createPeriod,
  onStart,
  onEdit,
}: {
  model: Model;
  allPeriods: Period[];
  createPeriod: { mutateAsync: (data: any) => Promise<any>; isPending: boolean };
  onStart: (period: Period) => void;
  onEdit: () => void;
}) {
  const { tenant } = useTenant();
  const modelPeriods = allPeriods.filter((p) => p.model_id === model.id);
  const [selectedPeriodId, setSelectedPeriodId] = useState<string>(modelPeriods[0]?.id || "");
  const [openPeriodDialog, setOpenPeriodDialog] = useState(false);
  const [periodMode, setPeriodMode] = useState<"monthly" | "bimesterly" | "quarterly" | "semiannually" | "annually" | "custom">("monthly");
  const [selectedSubPeriod, setSelectedSubPeriod] = useState<string>((new Date().getMonth() + 1).toString());
  const [selectedYear, setSelectedYear] = useState<string>(new Date().getFullYear().toString());
  const [newPeriod, setNewPeriod] = useState({
    name: "",
    start_date: "",
    end_date: "",
    status: "open" as const,
    model_id: model.id,
  });

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 7 }, (_, i) => (currentYear - 3 + i).toString());

  const updateDates = React.useCallback((mode: string, subValue: string, year: string) => {
    const yearNum = parseInt(year, 10);
    const subNum = parseInt(subValue, 10);
    let startDate: Date;
    let endDate: Date;
    let name = "";

    switch (mode) {
      case "monthly":
        startDate = new Date(yearNum, subNum - 1, 1);
        endDate = new Date(yearNum, subNum, 0);
        name = `${months.find((m) => m.value === subValue)?.label} ${year}`;
        break;
      case "bimesterly":
        startDate = new Date(yearNum, (subNum - 1) * 2, 1);
        endDate = new Date(yearNum, subNum * 2, 0);
        name = `${subNum}º Bimestre ${year}`;
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
  }, []);

  React.useEffect(() => {
    if (openPeriodDialog && periodMode !== "custom" && !newPeriod.name) {
      updateDates(periodMode, selectedSubPeriod, selectedYear);
    }
  }, [openPeriodDialog, periodMode, selectedSubPeriod, selectedYear, newPeriod.name, updateDates]);

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "servicio": return <Briefcase className="h-6 w-6 text-blue-500" />;
      case "industria": return <Settings className="h-6 w-6 text-amber-500" />;
      case "comercio": return <ShoppingBag className="h-6 w-6 text-emerald-500" />;
      case "gobierno": return <Building className="h-6 w-6 text-purple-500" />;
      default: return <Landmark className="h-6 w-6 text-gray-500" />;
    }
  };

  const handleCreatePeriod = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const created: Period = await createPeriod.mutateAsync(newPeriod);
      if (tenant?.id) {
        await seedDefaultLogisticsData(tenant.id, created.id);
      }
      setOpenPeriodDialog(false);
      setSelectedPeriodId(created.id);
      setNewPeriod({ name: "", start_date: "", end_date: "", status: "open", model_id: model.id });
      setPeriodMode("monthly");
      toast.success("Período creado");
    } catch (error) {
      toast.error("Error al crear período");
    }
  };

  const handleStart = () => {
    if (!selectedPeriodId) {
      toast.error("Seleccione un período para empezar");
      return;
    }
    const selected = modelPeriods.find((p) => p.id === selectedPeriodId);
    if (!selected) return;
    onStart(selected);
  };

  const currencyInfo = BASE_CURRENCIES.find((c) => c.code === model.base_currency);
  const currencyDisplay = currencyInfo ? `${currencyInfo.name} (${currencyInfo.symbol})` : model.base_currency;

  return (
    <Card className="flex flex-col relative overflow-hidden group hover:shadow-md transition-shadow">
      <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-bl-full -mr-16 -mt-16 transition-transform group-hover:scale-110" />
      <CardHeader className="pb-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-background rounded-xl border shadow-sm">
            {getTypeIcon(model.type)}
          </div>
          <div className="flex-1">
            <CardTitle className="text-xl">{model.name}</CardTitle>
            <CardDescription className="text-xs tracking-wider font-semibold mt-1">
              Sector <span className="capitalize">{model.type}</span> • {currencyDisplay}
            </CardDescription>
          </div>
          <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-primary" onClick={onEdit}>
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
            <span>Período de Análisis</span>
            <Dialog open={openPeriodDialog} onOpenChange={setOpenPeriodDialog}>
              <DialogTrigger asChild>
                <button className="text-primary hover:underline flex items-center">
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
                        <SelectItem value="bimesterly">Bimestral</SelectItem>
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
                            {periodMode === "bimesterly" && "Bimestre"}
                            {periodMode === "quarterly" && "Trimestre"}
                            {periodMode === "semiannually" && "Semestre"}
                          </Label>
                          <Select
                            value={selectedSubPeriod}
                            onValueChange={(val) => { setSelectedSubPeriod(val); updateDates(periodMode, val, selectedYear); }}
                          >
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                              {periodMode === "monthly" && months.map((m) => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}
                              {periodMode === "bimesterly" && bimestres.map((b) => <SelectItem key={b.value} value={b.value}>{b.label}</SelectItem>)}
                              {periodMode === "quarterly" && trimestres.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                              {periodMode === "semiannually" && semestres.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        </div>
                      )}
                      <div className={periodMode === "annually" ? "col-span-2 space-y-2" : "space-y-2"}>
                        <Label>Año</Label>
                        <Select value={selectedYear} onValueChange={(val) => { setSelectedYear(val); updateDates(periodMode, selectedSubPeriod, val); }}>
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
                        <Input required value={newPeriod.name} onChange={(e) => setNewPeriod({ ...newPeriod, name: e.target.value })} placeholder="Ej. Q1 2026" />
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
                  <DialogFooter>
                    <Button type="button" variant="outline" onClick={() => setOpenPeriodDialog(false)}>Cancelar</Button>
                    <Button type="submit" disabled={createPeriod.isPending}>Crear</Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </Label>

          {modelPeriods.length > 0 ? (
            <Select value={selectedPeriodId} onValueChange={setSelectedPeriodId}>
              <SelectTrigger><SelectValue placeholder="Seleccionar período..." /></SelectTrigger>
              <SelectContent>
                {modelPeriods.map((p: Period) => (
                  <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <div className="text-sm text-amber-600 bg-amber-50 px-3 py-2 rounded-md border border-amber-200">
              No hay períodos creados. Crea uno para empezar.
            </div>
          )}
        </div>
      </CardContent>
      <CardFooter className="pt-2 border-t mt-auto">
        <Button className="w-full relative z-10" disabled={!selectedPeriodId || modelPeriods.length === 0} onClick={handleStart}>
          <Play className="h-4 w-4 mr-2 fill-current" />
          Empezar Análisis
        </Button>
      </CardFooter>
    </Card>
  );
}
