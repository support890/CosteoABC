import { useState, useMemo, useCallback } from "react";
import { AppLayout } from "@/components/AppLayout";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Loader2,
  RotateCcw,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  FlaskConical,
  DollarSign,
  SlidersHorizontal,
  Tag,
  FileDown,
} from "lucide-react";
import { useAllocation } from "@/hooks/use-allocation";
import { useCurrency } from "@/hooks/use-currency";
import { useModelContext } from "@/contexts/ModelContext";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

/* ───── Helpers ───── */
const fmtPct = (n: number) => {
  if (!isFinite(n)) return "N/A";
  const sign = n > 0 ? "+" : "";
  return `${sign}${n.toFixed(1)}%`;
};

const SOURCE_LABELS: Record<string, string> = {
  resource: "Recurso",
  resource_center: "Centro de recurso",
  activity: "Actividad",
  activity_center: "Centro de actividad",
};

const DEST_LABELS: Record<string, string> = {
  activity: "Actividad",
  activity_center: "Centro de actividad",
  cost_object: "Objeto de costo",
  cost_object_center: "Centro de obj. costo",
  resource: "Recurso",
};

/* ───── Types ───── */
interface DriverAdjustment {
  driverId: string;
  destId: string;
  newPercentage: number;
}

interface DriverInfo {
  id: string;
  name: string;
  sourceType: string;
  sourceName: string;
  destType: string;
  sourceAmount: number;
  lines: { destId: string; destName: string; percentage: number }[];
}

/* ───── Variation Icon ───── */
function VariationIcon({ diff }: { diff: number }) {
  if (Math.abs(diff) < 0.01)
    return <Minus className="h-3 w-3 text-muted-foreground" />;
  if (diff > 0) return <ArrowUpRight className="h-3 w-3 text-red-500" />;
  return <ArrowDownRight className="h-3 w-3 text-emerald-500" />;
}

/* ───── Main Page ───── */
const CombinedSensitivityPage = () => {
  const allocation = useAllocation();
  const { fmt, symbol: currencySymbol } = useCurrency();
  const { selectedModel, selectedPeriod } = useModelContext();

  // Resource amount adjustments: resourceId → simulated amount
  const [simAmounts, setSimAmounts] = useState<Record<string, number>>({});

  // Driver distribution adjustments: driverId + destId → new percentage
  const [driverAdjs, setDriverAdjs] = useState<DriverAdjustment[]>([]);

  // Price adjustments: costObjectId → simulated price
  const [simPrices, setSimPrices] = useState<Record<string, number>>({});

  // Which driver is being displayed in the drivers panel
  const [selectedDriverId, setSelectedDriverId] = useState<string | null>(null);

  /* ── Resource handlers ── */
  const handleResourceSlider = useCallback((resourceId: string, value: number[]) => {
    setSimAmounts((prev) => ({ ...prev, [resourceId]: value[0] }));
  }, []);

  const handleResourceInput = useCallback((resourceId: string, value: string) => {
    const num = parseFloat(value);
    if (!isNaN(num) && num >= 0) {
      setSimAmounts((prev) => ({ ...prev, [resourceId]: num }));
    }
  }, []);

  /* ── Driver handlers ── */
  const getSimDriverPct = useCallback(
    (driverId: string, destId: string, originalPct: number) => {
      const adj = driverAdjs.find(
        (a) => a.driverId === driverId && a.destId === destId,
      );
      return adj ? adj.newPercentage : originalPct;
    },
    [driverAdjs],
  );

  const handleDriverSlider = useCallback(
    (driverId: string, destId: string, value: number[]) => {
      const newPct = value[0];
      setDriverAdjs((prev) => {
        const filtered = prev.filter(
          (a) => !(a.driverId === driverId && a.destId === destId),
        );
        return [...filtered, { driverId, destId, newPercentage: newPct }];
      });
    },
    [],
  );

  /* ── Price handlers ── */
  const handlePriceInput = useCallback((coId: string, value: string) => {
    const num = parseFloat(value);
    if (!isNaN(num) && num >= 0) {
      setSimPrices((prev) => ({ ...prev, [coId]: num }));
    }
  }, []);

  const handleReset = useCallback(() => {
    setSimAmounts({});
    setDriverAdjs([]);
    setSimPrices({});
  }, []);

  const hasResourceChanges = Object.keys(simAmounts).length > 0;
  const hasDriverChanges = driverAdjs.length > 0;
  const hasPriceChanges = Object.keys(simPrices).length > 0;
  const hasAnyChanges = hasResourceChanges || hasDriverChanges || hasPriceChanges;

  /* ── Build driver info list ── */
  const driverInfos = useMemo((): DriverInfo[] => {
    const allocs = allocation.allocations;
    const driverMap = new Map<string, DriverInfo>();

    for (const a of allocs) {
      if (!driverMap.has(a.driver_id)) {
        driverMap.set(a.driver_id, {
          id: a.driver_id,
          name: a.driver_name,
          sourceType: a.source_type,
          sourceName: a.source_name,
          destType: a.destination_type,
          sourceAmount: a.source_amount,
          lines: [],
        });
      }
      const driver = driverMap.get(a.driver_id)!;
      if (!driver.lines.find((l) => l.destId === a.destination_id)) {
        driver.lines.push({
          destId: a.destination_id,
          destName: a.destination_name,
          percentage: a.percentage,
        });
      }
    }

    return Array.from(driverMap.values()).sort(
      (a, b) => b.sourceAmount - a.sourceAmount,
    );
  }, [allocation.allocations]);

  const selectedDriver = driverInfos.find((d) => d.id === selectedDriverId);

  /* ── Build resource → cost_object effective percentage matrix ──
     Uses simulated driver percentages to account for both types of changes */
  const effectiveMatrix = useMemo(() => {
    const allocs = allocation.allocations;

    // Stage 1: resource → activity (with simulated driver percentages)
    const resActMap = new Map<string, { actId: string; pct: number }[]>();
    for (const a of allocs) {
      if (
        (a.source_type === "resource" || a.source_type === "resource_center") &&
        (a.destination_type === "activity" || a.destination_type === "activity_center")
      ) {
        const pct = getSimDriverPct(a.driver_id, a.destination_id, a.percentage);
        if (!resActMap.has(a.source_id)) resActMap.set(a.source_id, []);
        resActMap.get(a.source_id)!.push({ actId: a.destination_id, pct });
      }
    }

    // Stage 2: activity → cost_object (with simulated driver percentages)
    const actCOMap = new Map<
      string,
      { coId: string; coName: string; coCode: string; pct: number }[]
    >();
    for (const a of allocs) {
      if (
        (a.source_type === "activity" || a.source_type === "activity_center") &&
        (a.destination_type === "cost_object" || a.destination_type === "cost_object_center")
      ) {
        const pct = getSimDriverPct(a.driver_id, a.destination_id, a.percentage);
        if (!actCOMap.has(a.source_id)) actCOMap.set(a.source_id, []);
        actCOMap.get(a.source_id)!.push({
          coId: a.destination_id,
          coName: a.destination_name,
          coCode: a.destination_code,
          pct,
        });
      }
    }

    // For each resource, compute effective % to each cost object
    const matrix = new Map<
      string,
      Map<string, { coName: string; coCode: string; effectivePct: number }>
    >();

    for (const resource of allocation.resources) {
      const coEffects = new Map<
        string,
        { coName: string; coCode: string; effectivePct: number }
      >();

      // Direct resource → cost_object (with simulated driver pct)
      for (const a of allocs) {
        if (
          a.source_id === resource.id &&
          (a.source_type === "resource" || a.source_type === "resource_center") &&
          (a.destination_type === "cost_object" || a.destination_type === "cost_object_center")
        ) {
          const pct = getSimDriverPct(a.driver_id, a.destination_id, a.percentage);
          const existing = coEffects.get(a.destination_id);
          if (existing) {
            existing.effectivePct += pct;
          } else {
            coEffects.set(a.destination_id, {
              coName: a.destination_name,
              coCode: a.destination_code,
              effectivePct: pct,
            });
          }
        }
      }

      // Resource → Activity → Cost Object (two-stage)
      const actLinks = resActMap.get(resource.id) || [];
      for (const actLink of actLinks) {
        const coLinks = actCOMap.get(actLink.actId) || [];
        for (const coLink of coLinks) {
          const effectivePct = (actLink.pct * coLink.pct) / 100;
          const existing = coEffects.get(coLink.coId);
          if (existing) {
            existing.effectivePct += effectivePct;
          } else {
            coEffects.set(coLink.coId, {
              coName: coLink.coName,
              coCode: coLink.coCode,
              effectivePct,
            });
          }
        }
      }

      if (coEffects.size > 0) {
        matrix.set(resource.id, coEffects);
      }
    }

    return matrix;
  }, [allocation.allocations, allocation.resources, getSimDriverPct]);

  /* ── Original matrix (no driver adjustments) for comparing ── */
  const originalMatrix = useMemo(() => {
    const allocs = allocation.allocations;
    const resActMap = new Map<string, { actId: string; pct: number }[]>();
    for (const a of allocs) {
      if (
        (a.source_type === "resource" || a.source_type === "resource_center") &&
        (a.destination_type === "activity" || a.destination_type === "activity_center")
      ) {
        if (!resActMap.has(a.source_id)) resActMap.set(a.source_id, []);
        resActMap.get(a.source_id)!.push({ actId: a.destination_id, pct: a.percentage });
      }
    }
    const actCOMap = new Map<
      string,
      { coId: string; coName: string; coCode: string; pct: number }[]
    >();
    for (const a of allocs) {
      if (
        (a.source_type === "activity" || a.source_type === "activity_center") &&
        (a.destination_type === "cost_object" || a.destination_type === "cost_object_center")
      ) {
        if (!actCOMap.has(a.source_id)) actCOMap.set(a.source_id, []);
        actCOMap.get(a.source_id)!.push({
          coId: a.destination_id,
          coName: a.destination_name,
          coCode: a.destination_code,
          pct: a.percentage,
        });
      }
    }

    const matrix = new Map<
      string,
      Map<string, { coName: string; coCode: string; effectivePct: number }>
    >();

    for (const resource of allocation.resources) {
      const coEffects = new Map<
        string,
        { coName: string; coCode: string; effectivePct: number }
      >();

      for (const a of allocs) {
        if (
          a.source_id === resource.id &&
          (a.source_type === "resource" || a.source_type === "resource_center") &&
          (a.destination_type === "cost_object" || a.destination_type === "cost_object_center")
        ) {
          const existing = coEffects.get(a.destination_id);
          if (existing) {
            existing.effectivePct += a.percentage;
          } else {
            coEffects.set(a.destination_id, {
              coName: a.destination_name,
              coCode: a.destination_code,
              effectivePct: a.percentage,
            });
          }
        }
      }

      const actLinks = resActMap.get(resource.id) || [];
      for (const actLink of actLinks) {
        const coLinks = actCOMap.get(actLink.actId) || [];
        for (const coLink of coLinks) {
          const effectivePct = (actLink.pct * coLink.pct) / 100;
          const existing = coEffects.get(coLink.coId);
          if (existing) {
            existing.effectivePct += effectivePct;
          } else {
            coEffects.set(coLink.coId, {
              coName: coLink.coName,
              coCode: coLink.coCode,
              effectivePct,
            });
          }
        }
      }

      if (coEffects.size > 0) {
        matrix.set(resource.id, coEffects);
      }
    }
    return matrix;
  }, [allocation.allocations, allocation.resources]);

  /* ── Combined simulation: resource amount changes + driver % changes ── */
  const simulation = useMemo(() => {
    if (!hasResourceChanges && !hasDriverChanges) return null;

    const originalCO: Record<string, number> = {};
    const simCO: Record<string, number> = {};

    for (const resource of allocation.resources) {
      const originalAmount = resource.amount;
      const simAmount = simAmounts[resource.id] ?? originalAmount;

      // Original: use original matrix
      const origEffects = originalMatrix.get(resource.id);
      if (origEffects) {
        for (const [coId, effect] of origEffects) {
          originalCO[coId] = (originalCO[coId] || 0) + (originalAmount * effect.effectivePct) / 100;
        }
      }

      // Simulated: use effective matrix (with driver adjustments) + simulated amounts
      const simEffects = effectiveMatrix.get(resource.id);
      if (simEffects) {
        for (const [coId, effect] of simEffects) {
          simCO[coId] = (simCO[coId] || 0) + (simAmount * effect.effectivePct) / 100;
        }
      }
    }

    // Price map for profitability (use simulated prices when available)
    const priceMap = new Map(allocation.costObjects.map((co) => [co.id, simPrices[co.id] ?? co.price ?? 0]));

    const allCOIds = new Set([...Object.keys(originalCO), ...Object.keys(simCO)]);

    const impacts: {
      id: string;
      code: string;
      name: string;
      original: number;
      simulated: number;
      diff: number;
      diffPct: number;
      price: number;
      originalMargin: number;
      simulatedMargin: number;
      originalMarginPct: number;
      simulatedMarginPct: number;
    }[] = [];

    for (const coId of allCOIds) {
      const orig = originalCO[coId] || 0;
      const sim = simCO[coId] || 0;
      const diff = sim - orig;
      if (Math.abs(diff) < 0.001) continue;

      const summary = allocation.costObjectSummaries.find((s) => s.id === coId);
      const price = priceMap.get(coId) ?? 0;
      const originalMargin = price - orig;
      const simulatedMargin = price - sim;

      impacts.push({
        id: coId,
        code: summary?.code || "",
        name: summary?.name || coId,
        original: orig,
        simulated: sim,
        diff,
        diffPct: orig > 0 ? (diff / orig) * 100 : 0,
        price,
        originalMargin,
        simulatedMargin,
        originalMarginPct: price > 0 ? (originalMargin / price) * 100 : orig > 0 ? -100 : 0,
        simulatedMarginPct: price > 0 ? (simulatedMargin / price) * 100 : sim > 0 ? -100 : 0,
      });
    }

    const totalOriginal = Object.values(originalCO).reduce((s, v) => s + v, 0);
    const totalSimulated = Object.values(simCO).reduce((s, v) => s + v, 0);
    const totalDiff = totalSimulated - totalOriginal;
    const totalPrice = impacts.reduce((s, i) => s + i.price, 0);

    return {
      impacts: impacts.sort((a, b) => Math.abs(b.diff) - Math.abs(a.diff)),
      totalOriginal,
      totalSimulated,
      totalDiff,
      totalDiffPct: totalOriginal > 0 ? (totalDiff / totalOriginal) * 100 : 0,
      totalPrice,
      totalSimulatedMargin: totalPrice - totalSimulated,
    };
  }, [
    hasResourceChanges,
    hasDriverChanges,
    simAmounts,
    driverAdjs,
    simPrices,
    allocation.resources,
    allocation.costObjectSummaries,
    allocation.costObjects,
    originalMatrix,
    effectiveMatrix,
  ]);

  /* ── Derived values ── */
  const impactfulResources = useMemo(
    () =>
      allocation.resources
        .filter((r) => originalMatrix.has(r.id))
        .sort((a, b) => b.amount - a.amount),
    [allocation.resources, originalMatrix],
  );

  const maxSliderValue = impactfulResources.length > 0
    ? Math.max(...impactfulResources.map((r) => r.amount)) * 2
    : 100;

  const adjustedDriverIds = new Set(driverAdjs.map((a) => a.driverId));

  /* ── Base table rows: always show all cost objects ── */
  const tableRows = useMemo(() => {
    const basePriceMap = new Map(allocation.costObjects.map((co) => [co.id, co.price ?? 0]));
    const getEffectivePrice = (coId: string) => simPrices[coId] ?? basePriceMap.get(coId) ?? 0;

    if (simulation) {
      // Cost simulation active: apply simPrices on top of simulation impacts
      return simulation.impacts.map((row) => {
        const price = getEffectivePrice(row.id);
        return {
          ...row,
          price,
          originalMargin: price - row.original,
          simulatedMargin: price - row.simulated,
        };
      });
    }

    // No cost changes: use original cost object summaries with effective prices
    return allocation.costObjectSummaries
      .filter((s) => s.total_cost > 0)
      .map((s) => {
        const price = getEffectivePrice(s.id);
        const orig = s.total_cost;
        return {
          id: s.id,
          code: s.code,
          name: s.name,
          original: orig,
          simulated: orig,
          diff: 0,
          diffPct: 0,
          price,
          originalMargin: price - orig,
          simulatedMargin: price - orig,
          originalMarginPct: price > 0 ? ((price - orig) / price) * 100 : orig > 0 ? -100 : 0,
          simulatedMarginPct: price > 0 ? ((price - orig) / price) * 100 : orig > 0 ? -100 : 0,
        };
      })
      .sort((a, b) => b.original - a.original);
  }, [simulation, allocation.costObjectSummaries, allocation.costObjects, simPrices]);

  /* ── PDF Export ── */
  const handleExportPDF = useCallback(() => {
    const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
    const pageW = doc.internal.pageSize.getWidth();
    const sym = currencySymbol;
    const fmtN = (n: number) => `${sym}${n.toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    const today = new Date().toLocaleDateString("es-AR", { day: "2-digit", month: "long", year: "numeric" });

    doc.setFillColor(17, 17, 17);
    doc.rect(0, 0, pageW, 22, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("Análisis de Sensibilidad", 14, 10);
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.text(`Modelo: ${selectedModel?.name ?? "—"}   ·   Período: ${selectedPeriod?.name ?? "—"}   ·   Generado el: ${today}`, 14, 17);
    doc.setTextColor(0, 0, 0);

    let y = 30;

    const sectionTitle = (title: string) => {
      doc.setFillColor(240, 240, 240);
      doc.rect(14, y - 4, pageW - 28, 7, "F");
      doc.setFontSize(9);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(40, 40, 40);
      doc.text(title, 16, y);
      doc.setTextColor(0, 0, 0);
      y += 4;
    };

    // Section 1: Resource adjustments
    const resourceRows = impactfulResources
      .filter((r) => simAmounts[r.id] !== undefined)
      .map((r) => {
        const sim = simAmounts[r.id];
        const diff = sim - r.amount;
        const pct = r.amount > 0 ? ((diff / r.amount) * 100).toFixed(1) + "%" : "—";
        return [r.code, r.name, fmtN(r.amount), fmtN(sim), diff >= 0 ? `+${fmtN(diff)}` : fmtN(diff), diff >= 0 ? `+${pct}` : pct];
      });

    if (resourceRows.length > 0) {
      sectionTitle("Ajustes en Recursos");
      autoTable(doc, {
        startY: y + 2,
        head: [["Código", "Recurso", "Monto original", "Monto simulado", "Variación $", "% Var."]],
        body: resourceRows,
        theme: "striped",
        headStyles: { fillColor: [30, 30, 30], textColor: 255, fontSize: 8 },
        bodyStyles: { fontSize: 7.5 },
        columnStyles: {
          0: { halign: "left" }, 1: { halign: "left" },
          2: { halign: "right" }, 3: { halign: "right" }, 4: { halign: "right" }, 5: { halign: "right" },
        },
        didParseCell: (data) => {
          if (data.section === "head" && data.column.index >= 2) {
            data.cell.styles.halign = "right";
          }
          if (data.section !== "body") return;
          const col = data.column.index;
          if (col === 4 || col === 5) {
            const raw = String(data.cell.raw ?? "");
            if (raw.startsWith("+")) data.cell.styles.textColor = [20, 120, 60];
            else if (raw.startsWith("-") || raw.startsWith("€-")) data.cell.styles.textColor = [180, 30, 30];
          }
        },
        margin: { left: 14, right: 14 },
      });
      y = (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 8;
    }

    // Section 2: Driver adjustments
    const pdfAdjustedDriverIds = new Set(driverAdjs.map((a) => a.driverId));
    const driverRows: string[][] = [];
    for (const driverId of pdfAdjustedDriverIds) {
      const driver = driverInfos.find((d) => d.id === driverId);
      if (!driver) continue;
      for (const line of driver.lines) {
        const adj = driverAdjs.find((a) => a.driverId === driverId && a.destId === line.destId);
        if (!adj) continue;
        driverRows.push([
          driver.name,
          line.destName,
          `${line.percentage.toFixed(1)}%`,
          `${adj.newPercentage.toFixed(1)}%`,
          `${(adj.newPercentage - line.percentage).toFixed(1)}pp`,
        ]);
      }
    }

    if (driverRows.length > 0) {
      if (y > 160) { doc.addPage(); y = 20; }
      sectionTitle("Ajustes en Drivers");
      autoTable(doc, {
        startY: y + 2,
        head: [["Driver", "Destino", "% original", "% simulado", "Δ pp"]],
        body: driverRows,
        theme: "striped",
        headStyles: { fillColor: [30, 30, 30], textColor: 255, fontSize: 8 },
        bodyStyles: { fontSize: 7.5 },
        columnStyles: {
          0: { halign: "left" }, 1: { halign: "left" },
          2: { halign: "right" }, 3: { halign: "right" }, 4: { halign: "right" },
        },
        didParseCell: (data) => {
          if (data.section === "head" && data.column.index >= 2) {
            data.cell.styles.halign = "right";
          }
          if (data.section !== "body" || data.column.index !== 4) return;
          const raw = String(data.cell.raw ?? "");
          if (raw.startsWith("+")) data.cell.styles.textColor = [20, 120, 60];
          else if (raw.startsWith("-")) data.cell.styles.textColor = [180, 30, 30];
        },
        margin: { left: 14, right: 14 },
      });
      y = (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 8;
    }

    // Section 3: Price adjustments
    const basePriceMap = new Map(allocation.costObjects.map((co) => [co.id, co.price ?? 0]));
    const priceRows = Object.entries(simPrices).map(([coId, simPrice]) => {
      const summary = allocation.costObjectSummaries.find((s) => s.id === coId);
      const basePrice = basePriceMap.get(coId) ?? 0;
      const diff = simPrice - basePrice;
      const pct = basePrice > 0 ? `${diff >= 0 ? "+" : ""}${((diff / basePrice) * 100).toFixed(1)}%` : "—";
      const margin = simPrice - (summary?.total_cost ?? 0);
      const marginPct = simPrice > 0 ? `${margin >= 0 ? "+" : ""}${((margin / simPrice) * 100).toFixed(1)}%` : "—";
      return [
        summary?.code ?? coId,
        summary?.name ?? coId,
        fmtN(basePrice),
        fmtN(simPrice),
        diff >= 0 ? `+${fmtN(diff)}` : fmtN(diff),
        pct,
        margin >= 0 ? `+${fmtN(margin)}` : fmtN(margin),
        marginPct,
      ];
    });

    if (priceRows.length > 0) {
      if (y > 160) { doc.addPage(); y = 20; }
      sectionTitle("Ajustes en Precios de Venta");
      autoTable(doc, {
        startY: y + 2,
        head: [["Código", "Objeto de costo", "Precio original", "Precio simulado", "Variación $", "% Var.", "Margen $", "% Rent."]],
        body: priceRows,
        theme: "striped",
        headStyles: { fillColor: [30, 30, 30], textColor: 255, fontSize: 8 },
        bodyStyles: { fontSize: 7.5 },
        columnStyles: {
          0: { halign: "left" }, 1: { halign: "left" },
          2: { halign: "right" }, 3: { halign: "right" }, 4: { halign: "right" },
          5: { halign: "right" }, 6: { halign: "right" }, 7: { halign: "right" },
        },
        didParseCell: (data) => {
          if (data.section === "head" && data.column.index >= 2) {
            data.cell.styles.halign = "right";
          }
          if (data.section !== "body") return;
          const col = data.column.index;
          if (col === 4 || col === 5 || col === 6 || col === 7) {
            const raw = String(data.cell.raw ?? "");
            if (raw.startsWith("+")) data.cell.styles.textColor = [20, 120, 60];
            else if (raw.startsWith("-")) data.cell.styles.textColor = [180, 30, 30];
          }
        },
        margin: { left: 14, right: 14 },
      });
      y = (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 8;
    }

    // Section 4: Profitability impact
    if (y > 140) { doc.addPage(); y = 20; }
    sectionTitle("Análisis de Rentabilidad — Resultado Final");

    const totalOriginal = tableRows.reduce((s, r) => s + r.original, 0);
    const totalSimulated = tableRows.reduce((s, r) => s + r.simulated, 0);
    const totalPrice = tableRows.reduce((s, r) => s + r.price, 0);
    const totalMargin = totalPrice - totalSimulated;
    const totalMarginPct = totalPrice > 0 ? ((totalMargin / totalPrice) * 100).toFixed(1) + "%" : "—";

    const profitRows = tableRows.map((row) => {
      const marginPct = row.price > 0 ? `${row.simulatedMargin >= 0 ? "+" : ""}${((row.simulatedMargin / row.price) * 100).toFixed(1)}%` : "—";
      return [
        row.code,
        row.name,
        fmtN(row.original),
        fmtN(row.simulated),
        row.diff !== 0 ? (row.diff >= 0 ? `+${fmtN(row.diff)}` : fmtN(row.diff)) : "—",
        row.diff !== 0 ? `${row.diffPct >= 0 ? "+" : ""}${row.diffPct.toFixed(1)}%` : "—",
        row.price > 0 ? fmtN(row.price) : "—",
        row.price > 0 ? (row.simulatedMargin >= 0 ? `+${fmtN(row.simulatedMargin)}` : fmtN(row.simulatedMargin)) : "—",
        row.price > 0 ? marginPct : "—",
      ];
    });
    const totalDiffVal = totalSimulated - totalOriginal;
    profitRows.push([
      "", "TOTAL",
      fmtN(totalOriginal),
      fmtN(totalSimulated),
      totalDiffVal !== 0 ? (totalDiffVal >= 0 ? `+${fmtN(totalDiffVal)}` : fmtN(totalDiffVal)) : "—",
      totalOriginal > 0 && totalDiffVal !== 0 ? `${totalDiffVal >= 0 ? "+" : ""}${((totalDiffVal / totalOriginal) * 100).toFixed(1)}%` : "—",
      fmtN(totalPrice),
      totalMargin >= 0 ? `+${fmtN(totalMargin)}` : fmtN(totalMargin),
      totalMarginPct,
    ]);

    autoTable(doc, {
      startY: y + 2,
      head: [["Código", "Objeto de costo", "Costo original", "Costo simulado", "Variación $", "% Var.", "Precio venta", "Margen $", "% Rent."]],
      body: profitRows,
      theme: "striped",
      headStyles: { fillColor: [20, 83, 45], textColor: 255, fontSize: 8 },
      bodyStyles: { fontSize: 7.5 },
      columnStyles: {
        0: { halign: "left" }, 1: { halign: "left" },
        2: { halign: "right" }, 3: { halign: "right" }, 4: { halign: "right" },
        5: { halign: "right" }, 6: { halign: "right" }, 7: { halign: "right" }, 8: { halign: "right" },
      },
      didParseCell: (data) => {
        if (data.section === "head" && data.column.index >= 2) {
          data.cell.styles.halign = "right";
        }
        const isTotal = data.row.index === profitRows.length - 1;
        if (isTotal) {
          data.cell.styles.fontStyle = "bold";
          data.cell.styles.fillColor = [230, 245, 235];
        }
        if (data.section !== "body") return;
        const col = data.column.index;
        if (col === 4 || col === 5 || col === 7 || col === 8) {
          const raw = String(data.cell.raw ?? "");
          if (raw.startsWith("+")) data.cell.styles.textColor = [20, 120, 60];
          else if (raw.startsWith("-")) data.cell.styles.textColor = [180, 30, 30];
        }
      },
      margin: { left: 14, right: 14 },
    });

    // Footer on each page
    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(7);
      doc.setTextColor(150, 150, 150);
      doc.text(
        `${selectedModel?.name ?? ""} · ${selectedPeriod?.name ?? ""} · Generado el ${today} · Pág. ${i} de ${pageCount}`,
        pageW / 2,
        doc.internal.pageSize.getHeight() - 5,
        { align: "center" }
      );
    }

    const fileName = `sensibilidad_${(selectedPeriod?.name ?? "reporte").replace(/\s+/g, "_").toLowerCase()}.pdf`;
    doc.save(fileName);
  }, [
    currencySymbol,
    selectedModel,
    selectedPeriod,
    simAmounts,
    driverAdjs,
    simPrices,
    impactfulResources,
    driverInfos,
    allocation.costObjects,
    allocation.costObjectSummaries,
    tableRows,
  ]);

  /* ── Loading / empty states ── */
  if (allocation.isLoading) {
    return (
      <AppLayout>
        <PageHeader
          title="Análisis de Sensibilidad"
          description="Simula cambios en recursos y drivers y observa el impacto en objetos de costo"
        />
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      </AppLayout>
    );
  }

  if (impactfulResources.length === 0 && driverInfos.length === 0) {
    return (
      <AppLayout>
        <PageHeader
          title="Análisis de Sensibilidad"
          description="Simula cambios en recursos y drivers y observa el impacto en objetos de costo"
        />
        <Card className="border-dashed">
          <CardContent className="py-12 text-center text-muted-foreground">
            <FlaskConical className="h-8 w-8 mx-auto mb-3 opacity-40" />
            <p className="text-sm">No hay recursos ni drivers con asignaciones configuradas.</p>
          </CardContent>
        </Card>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <PageHeader
        title="Análisis de Sensibilidad"
        description="Ajustá recursos y drivers simultáneamente y observá cómo impactan en los objetos de costo"
      >
        <Button variant="outline" size="sm" onClick={handleExportPDF} className="gap-1.5">
          <FileDown className="h-4 w-4" />
          Exportar PDF
        </Button>
      </PageHeader>

      <div className="space-y-6">
        {/* Input panels: Recursos + Drivers */}
        <Tabs defaultValue="recursos">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
            <TabsList>
              <TabsTrigger value="recursos" className="gap-1.5">
                <DollarSign className="h-3.5 w-3.5" />
                Recursos
                {hasResourceChanges && (
                  <Badge className="ml-1 h-4 text-[10px] px-1">
                    {Object.keys(simAmounts).length}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="drivers" className="gap-1.5">
                <SlidersHorizontal className="h-3.5 w-3.5" />
                Drivers
                {hasDriverChanges && (
                  <Badge className="ml-1 h-4 text-[10px] px-1">
                    {adjustedDriverIds.size}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="objetos" className="gap-1.5">
                <Tag className="h-3.5 w-3.5" />
                Objetos de costo
                {hasPriceChanges && (
                  <Badge className="ml-1 h-4 text-[10px] px-1">
                    {Object.keys(simPrices).length}
                  </Badge>
                )}
              </TabsTrigger>
            </TabsList>
            {hasAnyChanges && (
              <Button variant="outline" size="sm" onClick={handleReset} className="text-xs">
                <RotateCcw className="h-3 w-3 mr-1" />
                Restaurar todo
              </Button>
            )}
          </div>

          {/* ── Recursos tab ── */}
          <TabsContent value="recursos">
            <Card>
              <CardHeader className="p-3 pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <FlaskConical className="h-4 w-4" />
                  Ajustar montos de recursos
                </CardTitle>
                <p className="text-[10px] text-muted-foreground">
                  Mueve los controles o escribe un valor para simular cambios
                </p>
              </CardHeader>
              <CardContent className="p-4">
                {impactfulResources.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-4">
                    No hay recursos con impacto en objetos de costo.
                  </p>
                ) : (
                  <div className="space-y-4">
                    {impactfulResources.map((resource) => {
                      const simVal = simAmounts[resource.id] ?? resource.amount;
                      const changed = Math.abs(simVal - resource.amount) > 0.01;
                      const changePct =
                        resource.amount > 0
                          ? ((simVal - resource.amount) / resource.amount) * 100
                          : 0;

                      return (
                        <div key={resource.id} className="space-y-1.5">
                          <div className="flex items-center justify-between gap-4">
                            <div className="flex items-center gap-2 min-w-0 flex-1">
                              <Badge variant="outline" className="text-[10px] shrink-0">
                                {resource.code}
                              </Badge>
                              <span className="text-xs font-medium truncate">
                                {resource.name}
                              </span>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              {changed && (
                                <span className="text-[10px] text-muted-foreground line-through">
                                  {fmt(resource.amount)}
                                </span>
                              )}
                              <div className="relative w-28">
                                <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                                  $
                                </span>
                                <Input
                                  type="number"
                                  value={simVal.toFixed(2)}
                                  onChange={(e) =>
                                    handleResourceInput(resource.id, e.target.value)
                                  }
                                  className="h-7 text-xs font-mono pl-5 pr-2"
                                  min={0}
                                  step={0.01}
                                />
                              </div>
                              {changed && (
                                <Badge
                                  variant={changePct > 0 ? "destructive" : "default"}
                                  className="text-[10px] font-mono w-16 justify-center"
                                >
                                  {fmtPct(changePct)}
                                </Badge>
                              )}
                            </div>
                          </div>
                          <div className="relative w-full">
                            <Slider
                              value={[simVal]}
                              onValueChange={(v) => handleResourceSlider(resource.id, v)}
                              min={0}
                              max={Math.max(resource.amount * 2, 100)}
                              step={
                                resource.amount > 1000
                                  ? 10
                                  : resource.amount > 100
                                    ? 1
                                    : 0.01
                              }
                              className="w-full"
                            />
                            {changed && (() => {
                              const sliderMax = Math.max(resource.amount * 2, 100);
                              const originPct = (resource.amount / sliderMax) * 100;
                              return (
                                <div
                                  className="absolute top-1/2 -translate-y-1/2 h-5 w-5 rounded-full border-2 border-muted-foreground/40 bg-background/30 cursor-pointer hover:border-muted-foreground/70 transition-colors"
                                  style={{ left: `calc(${originPct}% - 10px)` }}
                                  onClick={() => setSimAmounts((prev) => {
                                    const next = { ...prev };
                                    delete next[resource.id];
                                    return next;
                                  })}
                                  title="Restaurar valor original"
                                />
                              );
                            })()}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── Drivers tab ── */}
          <TabsContent value="drivers">
            <div className="space-y-4">
              {/* Driver selector dropdown */}
              {driverInfos.length > 0 && (
                <Select
                  value={selectedDriverId ?? ""}
                  onValueChange={(v) => setSelectedDriverId(v || null)}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Seleccioná un driver para ajustar..." />
                  </SelectTrigger>
                  <SelectContent>
                    {driverInfos.map((d) => {
                      const isAdjusted = adjustedDriverIds.has(d.id);
                      return (
                        <SelectItem key={d.id} value={d.id}>
                          <span className="flex items-center gap-2">
                            {isAdjusted && <span className="text-amber-500 text-[10px] font-bold">✱</span>}
                            <span>{d.name}</span>
                            <span className="text-muted-foreground text-[10px]">
                              ({SOURCE_LABELS[d.sourceType] || d.sourceType} → {DEST_LABELS[d.destType] || d.destType})
                            </span>
                          </span>
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              )}

              {/* Driver simulation panel */}
              {selectedDriver && (
                <Card>
                  <CardHeader className="p-3 pb-2">
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="text-sm">
                          {selectedDriver.name}
                        </CardTitle>
                        <p className="text-xs text-muted-foreground mt-1">
                          Fuente: {selectedDriver.sourceName} (
                          {fmt(selectedDriver.sourceAmount)}) →{" "}
                          {DEST_LABELS[selectedDriver.destType] || selectedDriver.destType}
                        </p>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="p-4">
                    <div className="space-y-4">
                      {selectedDriver.lines.map((line) => {
                        const simPct = getSimDriverPct(
                          selectedDriver.id,
                          line.destId,
                          line.percentage,
                        );
                        const changed = Math.abs(simPct - line.percentage) > 0.1;
                        const simAmount = (selectedDriver.sourceAmount * simPct) / 100;

                        return (
                          <div key={line.destId} className="space-y-1.5">
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-medium">
                                {line.destName}
                              </span>
                              <div className="flex items-center gap-2">
                                {changed && (
                                  <span className="text-[10px] text-muted-foreground line-through">
                                    {line.percentage.toFixed(1)}%
                                  </span>
                                )}
                                <Badge
                                  variant={changed ? "default" : "secondary"}
                                  className={`font-mono text-xs ${changed ? "bg-primary" : ""}`}
                                >
                                  {simPct.toFixed(1)}%
                                </Badge>
                                <span className="text-xs font-mono text-muted-foreground w-24 text-right">
                                  {fmt(simAmount)}
                                </span>
                              </div>
                            </div>
                            <div className="relative w-full">
                              <Slider
                                value={[simPct]}
                                onValueChange={(v) =>
                                  handleDriverSlider(selectedDriver.id, line.destId, v)
                                }
                                min={0}
                                max={100}
                                step={0.5}
                                className="w-full"
                              />
                              {changed && (
                                <div
                                  className="absolute top-1/2 -translate-y-1/2 h-5 w-5 rounded-full border-2 border-muted-foreground/40 bg-background/30 cursor-pointer hover:border-muted-foreground/70 transition-colors"
                                  style={{ left: `calc(${line.percentage}% - 10px)` }}
                                  onClick={() => setDriverAdjs((prev) =>
                                    prev.filter((a) => !(a.driverId === selectedDriver.id && a.destId === line.destId))
                                  )}
                                  title="Restaurar valor original"
                                />
                              )}
                            </div>
                          </div>
                        );
                      })}

                      {/* Total percentage indicator */}
                      {(() => {
                        const totalPct = selectedDriver.lines.reduce(
                          (s, l) =>
                            s + getSimDriverPct(selectedDriver.id, l.destId, l.percentage),
                          0,
                        );
                        const isValid = Math.abs(totalPct - 100) < 0.5;
                        return (
                          <div
                            className={`flex items-center justify-between pt-2 border-t ${
                              isValid ? "text-muted-foreground" : "text-amber-600"
                            }`}
                          >
                            <span className="text-xs font-medium">
                              Total distribución
                            </span>
                            <Badge
                              variant={isValid ? "secondary" : "destructive"}
                              className="font-mono text-xs"
                            >
                              {totalPct.toFixed(1)}%
                            </Badge>
                          </div>
                        );
                      })()}
                    </div>
                  </CardContent>
                </Card>
              )}

            </div>
          </TabsContent>

          {/* ── Objetos de costo tab ── */}
          <TabsContent value="objetos">
            <Card>
              <CardHeader className="p-3 pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Tag className="h-4 w-4" />
                  Simular precio de venta
                </CardTitle>
                <p className="text-[10px] text-muted-foreground">
                  Modificá el precio de venta para simular el impacto en el margen
                </p>
              </CardHeader>
              <CardContent className="p-4">
                {allocation.costObjectSummaries.filter((s) => s.total_cost > 0).length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-4">
                    No hay objetos de costo configurados.
                  </p>
                ) : (
                  <div className="space-y-4">
                    {allocation.costObjectSummaries
                      .filter((s) => s.total_cost > 0)
                      .sort((a, b) => b.total_cost - a.total_cost)
                      .map((s) => {
                        const basePrice = (allocation.costObjects.find((co) => co.id === s.id)?.price ?? 0);
                        const simVal = simPrices[s.id] ?? basePrice;
                        const changed = Math.abs(simVal - basePrice) > 0.01;
                        const changePct = basePrice > 0 ? ((simVal - basePrice) / basePrice) * 100 : 0;
                        const simulatedMargin = simVal - s.total_cost;
                        const marginPct = simVal > 0 ? (simulatedMargin / simVal) * 100 : 0;

                        return (
                          <div key={s.id} className="space-y-1.5">
                            <div className="flex items-center justify-between gap-4">
                              <div className="flex items-center gap-2 min-w-0 flex-1">
                                <Badge variant="outline" className="text-[10px] shrink-0">
                                  {s.code}
                                </Badge>
                                <span className="text-xs font-medium truncate">{s.name}</span>
                              </div>
                              <div className="flex items-center gap-2 shrink-0">
                                {changed && (
                                  <span className="text-[10px] text-muted-foreground line-through">
                                    {fmt(basePrice)}
                                  </span>
                                )}
                                <div className="relative w-28">
                                  <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                                    $
                                  </span>
                                  <Input
                                    type="number"
                                    value={simVal.toFixed(2)}
                                    onChange={(e) => handlePriceInput(s.id, e.target.value)}
                                    className="h-7 text-xs font-mono pl-5 pr-2"
                                    min={0}
                                    step={0.01}
                                  />
                                </div>
                                {changed && (
                                  <Badge
                                    variant={changePct < 0 ? "destructive" : "default"}
                                    className="text-[10px] font-mono w-16 justify-center"
                                  >
                                    {fmtPct(changePct)}
                                  </Badge>
                                )}
                                <span
                                  className={`text-[10px] font-mono w-20 text-right ${
                                    simulatedMargin > 0 ? "text-emerald-600" : simulatedMargin < 0 ? "text-red-600" : "text-muted-foreground"
                                  }`}
                                >
                                  {simVal > 0 ? `${marginPct.toFixed(1)}% mg.` : "—"}
                                </span>
                              </div>
                            </div>
                            <Slider
                              value={[simVal]}
                              onValueChange={(v) => setSimPrices((prev) => ({ ...prev, [s.id]: v[0] }))}
                              min={0}
                              max={Math.max(basePrice > 0 ? basePrice * 2 : s.total_cost * 2, 100)}
                              step={
                                (basePrice || s.total_cost) > 1000
                                  ? 10
                                  : (basePrice || s.total_cost) > 100
                                    ? 1
                                    : 0.01
                              }
                              className="w-full"
                            />
                          </div>
                        );
                      })}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* ── Impact table: always visible ── */}
        {tableRows.length > 0 && (() => {
          const totalOriginal = tableRows.reduce((s, r) => s + r.original, 0);
          const totalSimulated = tableRows.reduce((s, r) => s + r.simulated, 0);
          const totalDiff = totalSimulated - totalOriginal;
          const totalDiffPct = totalOriginal > 0 ? (totalDiff / totalOriginal) * 100 : 0;
          const totalPrice = tableRows.reduce((s, r) => s + r.price, 0);
          const totalSimulatedMargin = totalPrice - totalSimulated;

          return (
            <Card>
              <CardHeader className="p-3 pb-2">
                <CardTitle className="text-sm">
                  Impacto combinado en objetos de costo
                </CardTitle>
                <p className="text-[10px] text-muted-foreground">
                  Efecto neto de los cambios en recursos y drivers · Rentabilidad calculada sobre precio configurado
                </p>
              </CardHeader>
              <CardContent className="p-0 overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Objeto de costo</TableHead>
                      <TableHead className="text-right">Costo original</TableHead>
                      <TableHead className="text-right">Costo simulado</TableHead>
                      <TableHead className="text-right">Variación $</TableHead>
                      <TableHead className="text-right w-20">% Var.</TableHead>
                      <TableHead className="text-right border-l border-border/50">Venta</TableHead>
                      <TableHead className="text-right">Margen simulado</TableHead>
                      <TableHead className="text-right w-40">% Rentabilidad</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {tableRows.map((row) => {
                      const hasPrice = row.price > 0;
                      return (
                        <TableRow key={row.id}>
                          <TableCell>
                            <div className="flex flex-col gap-0.5">
                              <span className="font-mono text-sm text-muted-foreground leading-tight">{row.code}</span>
                              <span className="text-sm">{row.name}</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-right font-mono text-sm">{fmt(row.original)}</TableCell>
                          <TableCell className="text-right font-mono text-sm">{fmt(row.simulated)}</TableCell>
                          <TableCell
                            className={`text-right font-mono text-sm font-semibold ${
                              row.diff < 0 ? "text-red-600" : row.diff > 0 ? "text-emerald-600" : ""
                            }`}
                          >
                            {row.diff !== 0 ? fmt(row.diff) : <span className="text-muted-foreground/40">—</span>}
                          </TableCell>
                          <TableCell
                            className={`text-right font-mono text-sm ${
                              row.diffPct < 0 ? "text-red-600" : row.diffPct > 0 ? "text-emerald-600" : ""
                            }`}
                          >
                            {row.diff !== 0 ? fmtPct(row.diffPct) : <span className="text-muted-foreground/40">—</span>}
                          </TableCell>
                          <TableCell className="text-right font-mono text-sm border-l border-border/50">
                            {hasPrice ? fmt(row.price) : <span className="text-muted-foreground/40">—</span>}
                          </TableCell>
                          <TableCell
                            className={`text-right font-mono text-sm font-semibold ${
                              !hasPrice ? "text-muted-foreground/40" : row.simulatedMargin > 0 ? "text-emerald-600" : "text-red-600"
                            }`}
                          >
                            {hasPrice ? fmt(row.simulatedMargin) : "—"}
                          </TableCell>
                          <TableCell
                            className={`text-right font-mono text-sm ${
                              !hasPrice ? "text-muted-foreground/40" : row.simulatedMargin > 0 ? "text-emerald-600" : "text-red-600"
                            }`}
                          >
                            {hasPrice ? fmtPct((row.simulatedMargin / row.price) * 100) : "—"}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                    <TableRow className="bg-muted/50 font-semibold">
                      <TableCell colSpan={2} className="text-right text-xs">TOTAL</TableCell>
                      <TableCell className="text-right font-mono text-xs">{fmt(totalOriginal)}</TableCell>
                      <TableCell className="text-right font-mono text-xs">{fmt(totalSimulated)}</TableCell>
                      <TableCell
                        className={`text-right font-mono text-xs font-semibold ${
                          totalDiff < 0 ? "text-red-600" : totalDiff > 0 ? "text-emerald-600" : ""
                        }`}
                      >
                        {totalDiff !== 0 ? fmt(totalDiff) : <span className="text-muted-foreground/40">—</span>}
                      </TableCell>
                      <TableCell
                        className={`text-right font-mono text-xs ${
                          totalDiffPct < 0 ? "text-red-600" : totalDiffPct > 0 ? "text-emerald-600" : ""
                        }`}
                      >
                        {totalDiff !== 0 ? fmtPct(totalDiffPct) : <span className="text-muted-foreground/40">—</span>}
                      </TableCell>
                      <TableCell className="text-right font-mono text-xs border-l border-border/50">
                        {fmt(totalPrice)}
                      </TableCell>
                      <TableCell
                        className={`text-right font-mono text-xs font-semibold ${
                          totalSimulatedMargin > 0 ? "text-emerald-600" : "text-red-600"
                        }`}
                      >
                        {fmt(totalSimulatedMargin)}
                      </TableCell>
                      <TableCell
                        className={`text-right font-mono text-xs ${
                          totalSimulatedMargin > 0 ? "text-emerald-600" : "text-red-600"
                        }`}
                      >
                        {totalPrice > 0 ? fmtPct((totalSimulatedMargin / totalPrice) * 100) : "—"}
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          );
        })()}
      </div>
    </AppLayout>
  );
};

export default CombinedSensitivityPage;
