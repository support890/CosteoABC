import { useCallback, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AppLayout } from "@/components/AppLayout";
import { PageHeader } from "@/components/PageHeader";
import { useBIExpressContext } from "@/contexts/BIExpressContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  Upload, Download, CheckCircle2, Trash2, ChevronDown,
  FileSpreadsheet, Package, Settings2, AlertTriangle, BarChart3,
} from "lucide-react";
import { generateTemplateFile, TEMPLATE_CATALOG, type TemplateId } from "@/lib/bi-express-engine";

// ── Template Card ───────────────────────────────────────────────────────────────

function TemplateCard({ templateId }: { templateId: TemplateId }) {
  const { templateStates, loadTemplate, removeTemplate } = useBIExpressContext();
  const def = TEMPLATE_CATALOG[templateId];
  const state = templateStates[templateId];
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const isLoaded = state?.loaded ?? false;

  const handleFile = useCallback((file: File) => {
    setUploading(true);
    const reader = new FileReader();
    reader.onload = (e) => {
      if (e.target?.result instanceof ArrayBuffer) {
        loadTemplate(templateId, e.target.result, file.name);
      }
      setUploading(false);
    };
    reader.onerror = () => setUploading(false);
    reader.readAsArrayBuffer(file);
  }, [templateId, loadTemplate]);

  const handleDownload = () => {
    const buffer = generateTemplateFile(templateId);
    const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `plantilla_${templateId.toLowerCase()}_${def.name.toLowerCase().replace(/\s+/g, "_")}.xlsx`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const borderClass = isLoaded
    ? "border-emerald-300 dark:border-emerald-700"
    : def.required
    ? "border-primary/50"
    : "border-border";

  const bgClass = isLoaded
    ? "bg-emerald-50/50 dark:bg-emerald-950/20"
    : def.required
    ? "bg-primary/5"
    : "";

  return (
    <Card className={`${borderClass} ${bgClass} transition-all`}>
      <CardContent className="p-4 space-y-3">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant="outline" className="text-[10px] font-mono px-1.5 py-0 shrink-0">{templateId}</Badge>
            {def.required && (
              <Badge className="text-[10px] px-1.5 py-0 bg-primary/10 text-primary border-0 shrink-0">Obligatoria</Badge>
            )}
          </div>
          {isLoaded ? (
            <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
          ) : uploading ? (
            <div className="h-4 w-4 border-2 border-primary border-t-transparent rounded-full animate-spin shrink-0" />
          ) : null}
        </div>

        {/* Name + description */}
        <div>
          <p className="text-sm font-semibold leading-tight">{def.name}</p>
          <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed line-clamp-2">{def.description}</p>
        </div>

        {/* KPIs enabled (chips) */}
        <div className="flex flex-wrap gap-1">
          {def.kpiLabels.slice(0, 3).map((label) => (
            <span key={label} className="text-[10px] bg-muted px-1.5 py-0.5 rounded text-muted-foreground">{label}</span>
          ))}
          {def.kpiLabels.length > 3 && (
            <span className="text-[10px] bg-muted px-1.5 py-0.5 rounded text-muted-foreground">+{def.kpiLabels.length - 3} más</span>
          )}
        </div>

        {/* Load status */}
        {isLoaded && (
          <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
            ✓ {state!.rowCount.toLocaleString()} filas · {state!.fileName}
          </p>
        )}
        {state && !isLoaded && state.errors.length > 0 && (
          <p className="text-[11px] text-red-600 dark:text-red-400">{state.errors.length} error(es) al cargar</p>
        )}

        {/* Actions */}
        <div className="flex gap-2 pt-1">
          <Button variant="outline" size="sm" className="h-7 text-xs flex-1" onClick={handleDownload}>
            <Download className="h-3 w-3 mr-1" />Plantilla
          </Button>
          <input
            ref={inputRef}
            type="file"
            accept=".xlsx,.xls"
            className="hidden"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = ""; }}
          />
          {isLoaded ? (
            <Button
              variant="outline"
              size="sm"
              className="h-7 text-xs border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700 dark:border-red-800 dark:text-red-400"
              onClick={() => removeTemplate(templateId)}
            >
              <Trash2 className="h-3 w-3 mr-1" />Quitar
            </Button>
          ) : (
            <Button size="sm" className="h-7 text-xs flex-1" disabled={uploading} onClick={() => inputRef.current?.click()}>
              <Upload className="h-3 w-3 mr-1" />Cargar
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// ── Manual Inputs Form ──────────────────────────────────────────────────────────

function ManualInputsForm() {
  const { manualInputs, setManualInputs } = useBIExpressContext();
  const [open, setOpen] = useState(false);

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger asChild>
        <button className="w-full flex items-center justify-between px-4 py-2.5 rounded-lg border bg-card hover:bg-accent/30 transition-colors text-sm font-medium">
          <span className="flex items-center gap-2">
            <Settings2 className="h-4 w-4 text-muted-foreground" />
            Parámetros adicionales
            <span className="text-xs text-muted-foreground font-normal hidden sm:inline">
              (Costos Fijos, Objetivo de Ventas, Gasto Marketing)
            </span>
          </span>
          <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`} />
        </button>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="mt-2 px-4 py-4 rounded-lg border bg-card grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="space-y-1.5">
            <Label className="text-xs">Costos Fijos del Período</Label>
            <Input
              type="number"
              placeholder="Ej. 50000"
              value={manualInputs.costos_fijos ?? ""}
              onChange={(e) => setManualInputs({ costos_fijos: e.target.value ? Number(e.target.value) : undefined })}
              className="h-8 text-sm"
            />
            <p className="text-[10px] text-muted-foreground">Habilita el Punto de Equilibrio</p>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Objetivo de Ventas del Período</Label>
            <Input
              type="number"
              placeholder="Ej. 500000"
              value={manualInputs.objetivo_ventas ?? ""}
              onChange={(e) => setManualInputs({ objetivo_ventas: e.target.value ? Number(e.target.value) : undefined })}
              className="h-8 text-sm"
            />
            <p className="text-[10px] text-muted-foreground">Habilita Desviación de Cuota</p>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Gasto en Marketing Total</Label>
            <Input
              type="number"
              placeholder="Ej. 12000"
              value={manualInputs.gasto_marketing_total ?? ""}
              onChange={(e) => setManualInputs({ gasto_marketing_total: e.target.value ? Number(e.target.value) : undefined })}
              className="h-8 text-sm"
            />
            <p className="text-[10px] text-muted-foreground">Habilita ROAS global (sin T5)</p>
          </div>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

// ── Parse Errors Panel ──────────────────────────────────────────────────────────

function AllErrorsPanel() {
  const { templateStates } = useBIExpressContext();
  const withErrors = Object.entries(templateStates).filter(([, s]) => (s?.errors.length ?? 0) > 0);
  if (withErrors.length === 0) return null;

  return (
    <div className="space-y-2">
      {withErrors.map(([tid, state]) => (
        <Alert key={tid} className="border-amber-200 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-800">
          <AlertTriangle className="h-4 w-4 text-amber-600" />
          <AlertDescription>
            <details>
              <summary className="text-xs font-medium cursor-pointer text-amber-800 dark:text-amber-200">
                {tid}: {state!.errors.length} observación(es) durante la carga
              </summary>
              <ul className="mt-1 space-y-0.5 text-[11px] text-amber-700 dark:text-amber-300 max-h-28 overflow-y-auto">
                {state!.errors.map((err, i) => <li key={i}>• {err}</li>)}
              </ul>
            </details>
          </AlertDescription>
        </Alert>
      ))}
    </div>
  );
}

// ── Main Page ───────────────────────────────────────────────────────────────────

const OPTIONAL_TEMPLATES: TemplateId[] = ["T2", "T3", "T4", "T5", "T6", "T7", "T8"];

export default function BIExpressCatalogPage() {
  const { selectedBIModel, selectedBIPeriod, loadedTemplates } = useBIExpressContext();
  const navigate = useNavigate();

  if (!selectedBIModel || !selectedBIPeriod) {
    navigate("/bi-express");
    return null;
  }

  const t1Loaded = loadedTemplates.has("T1");

  return (
    <AppLayout>
      <PageHeader
        title="Catálogo de Plantillas"
        description="Descarga, completa y carga las plantillas que apliquen a tu operación"
      >
        {t1Loaded && (
          <Button size="sm" onClick={() => navigate("/bi-express/dashboard")}>
            <BarChart3 className="h-4 w-4 mr-2" />Ver Análisis
          </Button>
        )}
      </PageHeader>

      {/* ── Template Catalog ─────────────────────────────────────────────────── */}
      <section className="space-y-4 mb-6">
        <div className="flex items-center gap-2">
          <FileSpreadsheet className="h-4 w-4 text-muted-foreground" />
          <h2 className="text-sm font-semibold">Plantillas disponibles</h2>
          <span className="text-xs text-muted-foreground hidden sm:inline">
            — {loadedTemplates.size} de {Object.keys(TEMPLATE_CATALOG).length} cargadas
          </span>
        </div>

        {/* T1 — Core (always first) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <TemplateCard templateId="T1" />
        </div>

        {/* T2–T2 — Optional grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {OPTIONAL_TEMPLATES.map((id) => (
            <TemplateCard key={id} templateId={id} />
          ))}
        </div>

        <AllErrorsPanel />
      </section>

      {/* ── Manual Inputs ─────────────────────────────────────────────────────── */}
      {t1Loaded && (
        <section className="mb-6">
          <ManualInputsForm />
        </section>
      )}

      {/* ── Empty state ───────────────────────────────────────────────────────── */}
      {!t1Loaded && (
        <div className="flex flex-col items-center justify-center py-16 text-center text-muted-foreground border-2 border-dashed rounded-xl">
          <Package className="h-12 w-12 mb-3 opacity-20" />
          <p className="text-base font-medium">Carga la Plantilla T1 para comenzar</p>
          <p className="text-sm mt-1">
            La plantilla Core Transaccional es obligatoria y activa todos los indicadores base.
          </p>
        </div>
      )}
    </AppLayout>
  );
}
