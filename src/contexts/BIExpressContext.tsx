import { createContext, useContext, useState, useCallback, useEffect, ReactNode } from "react";
import type { Model, Period } from "@/hooks/use-supabase-data";
import {
  type BIExpressResult,
  type TransactionRow,
  type ReturnRow,
  type InventoryRow,
  type LogisticsRow,
  type MarketingRow,
  type HistoricalCostRow,
  type ForecastRow,
  type LocationRow,
  type ManualInputs,
  type TemplateId,
  parseT1, parseT2,
  parseT3, parseT4, parseT5, parseT6, parseT7, parseT8,
} from "@/lib/bi-express-engine";

// ── Template load state ─────────────────────────────────────────────────────────

export interface TemplateLoadState {
  loaded: boolean;
  rowCount: number;
  errors: string[];
  fileName?: string;
}

export type TemplateStates = Partial<Record<TemplateId, TemplateLoadState>>;

// ── Persistence helpers ─────────────────────────────────────────────────────────

function storageKey(model: Model, period: Period) {
  return `biexpress_${model.id}_${period.id}`;
}

function serialize(value: unknown): string {
  return JSON.stringify(value, (_k, v) => {
    if (v instanceof Date) return { __date: v.toISOString() };
    if (v instanceof Set) return { __set: Array.from(v) };
    return v;
  });
}

function deserialize<T>(json: string): T {
  return JSON.parse(json, (_k, v) => {
    if (v && typeof v === "object") {
      if ("__date" in v) return new Date(v.__date as string);
      if ("__set" in v) return new Set(v.__set as unknown[]);
    }
    return v;
  }) as T;
}

interface PersistedSession {
  t1Rows: TransactionRow[];
  hasCostData: boolean;
  t2Rows: ReturnRow[];
  t3Rows: InventoryRow[];
  t4Rows: LogisticsRow[];
  t5Rows: MarketingRow[];
  t6Rows: HistoricalCostRow[];
  t7Rows: ForecastRow[];
  t8Rows: LocationRow[];
  templateStates: TemplateStates;
  loadedTemplates: Set<TemplateId>;
  deletedRowIndices: Set<number>;
  excludedGenericRows: Partial<Record<TemplateId, Set<number>>>;
  manualInputs: ManualInputs;
}

// ── Context type ────────────────────────────────────────────────────────────────

interface BIExpressContextType {
  // Model/Period selection
  selectedBIModel: Model | null;
  setSelectedBIModel: (model: Model | null) => void;
  selectedBIPeriod: Period | null;
  setSelectedBIPeriod: (period: Period | null) => void;

  // KPI visibility
  disabledKPIs: Set<string>;
  toggleKPI: (id: string) => void;
  resetKPIs: () => void;

  // Visual (chart/table) visibility
  disabledVisuals: Set<string>;
  toggleVisual: (id: string) => void;

  // Template rows (read-only access for consumers)
  t1Rows: TransactionRow[];
  hasCostData: boolean;
  t2Rows: ReturnRow[];
  t3Rows: InventoryRow[];
  t4Rows: LogisticsRow[];
  t5Rows: MarketingRow[];
  t6Rows: HistoricalCostRow[];
  t7Rows: ForecastRow[];
  t8Rows: LocationRow[];

  // Template states (load status per template)
  templateStates: TemplateStates;
  loadedTemplates: Set<TemplateId>;

  // Single entry-point for loading any template from an ArrayBuffer
  loadTemplate: (id: TemplateId, buffer: ArrayBuffer, fileName: string) => void;
  removeTemplate: (id: TemplateId) => void;

  // Manual inputs
  manualInputs: ManualInputs;
  setManualInputs: (inputs: Partial<ManualInputs>) => void;

  // Computed result
  result: BIExpressResult | null;
  setResult: (result: BIExpressResult | null) => void;

  // Row exclusion (T1)
  deletedRowIndices: Set<number>;
  toggleDeletedRow: (index: number) => void;

  // Row exclusion (generic templates T2–T8)
  excludedGenericRows: Partial<Record<TemplateId, Set<number>>>;
  toggleExcludedGenericRow: (templateId: TemplateId, index: number) => void;

  // Session
  resetSession: () => void;
}

// ── Context ─────────────────────────────────────────────────────────────────────

const BIExpressContext = createContext<BIExpressContextType | undefined>(undefined);

export function BIExpressProvider({ children }: { children: ReactNode }) {
  const [selectedBIModel, setSelectedBIModel] = useState<Model | null>(null);
  const [selectedBIPeriod, setSelectedBIPeriod] = useState<Period | null>(null);
  const [disabledKPIs, setDisabledKPIs] = useState<Set<string>>(new Set());
  const [disabledVisuals, setDisabledVisuals] = useState<Set<string>>(new Set());
  const [result, setResult] = useState<BIExpressResult | null>(null);
  const [deletedRowIndices, setDeletedRowIndices] = useState<Set<number>>(new Set());
  const [manualInputs, setManualInputsState] = useState<ManualInputs>({});

  // Template rows
  const [t1Rows, setT1Rows] = useState<TransactionRow[]>([]);
  const [hasCostData, setHasCostData] = useState(false);
  const [t2Rows, setT2Rows] = useState<ReturnRow[]>([]);
  const [t3Rows, setT3Rows] = useState<InventoryRow[]>([]);
  const [t4Rows, setT4Rows] = useState<LogisticsRow[]>([]);
  const [t5Rows, setT5Rows] = useState<MarketingRow[]>([]);
  const [t6Rows, setT6Rows] = useState<HistoricalCostRow[]>([]);
  const [t7Rows, setT7Rows] = useState<ForecastRow[]>([]);
  const [t8Rows, setT8Rows] = useState<LocationRow[]>([]);

  // Template load states
  const [templateStates, setTemplateStates] = useState<TemplateStates>({});
  const [loadedTemplates, setLoadedTemplates] = useState<Set<TemplateId>>(new Set());

  // Row exclusion (generic)
  const [excludedGenericRows, setExcludedGenericRows] = useState<Partial<Record<TemplateId, Set<number>>>>({});

  // ── Restore session when model+period are selected ─────────────────────────
  useEffect(() => {
    if (!selectedBIModel || !selectedBIPeriod) return;
    const saved = localStorage.getItem(storageKey(selectedBIModel, selectedBIPeriod));
    if (!saved) return;
    try {
      const s = deserialize<PersistedSession>(saved);
      setT1Rows(s.t1Rows ?? []);
      setHasCostData(s.hasCostData ?? false);
      setT2Rows(s.t2Rows ?? []);
      setT3Rows(s.t3Rows ?? []);
      setT4Rows(s.t4Rows ?? []);
      setT5Rows(s.t5Rows ?? []);
      setT6Rows(s.t6Rows ?? []);
      setT7Rows(s.t7Rows ?? []);
      setT8Rows(s.t8Rows ?? []);
      setTemplateStates(s.templateStates ?? {});
      setLoadedTemplates(s.loadedTemplates instanceof Set ? s.loadedTemplates : new Set(s.loadedTemplates ?? []));
      setDeletedRowIndices(s.deletedRowIndices instanceof Set ? s.deletedRowIndices : new Set(s.deletedRowIndices ?? []));
      setExcludedGenericRows(
        Object.fromEntries(
          Object.entries(s.excludedGenericRows ?? {}).map(([k, v]) => [
            k,
            v instanceof Set ? v : new Set(v as number[]),
          ])
        ) as Partial<Record<TemplateId, Set<number>>>
      );
      setManualInputsState(s.manualInputs ?? {});
    } catch {
      // corrupted data — ignore
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedBIModel?.id, selectedBIPeriod?.id]);

  // ── Persist session whenever data changes ──────────────────────────────────
  useEffect(() => {
    if (!selectedBIModel || !selectedBIPeriod) return;
    const session: PersistedSession = {
      t1Rows, hasCostData,
      t2Rows, t3Rows, t4Rows, t5Rows, t6Rows, t7Rows, t8Rows,
      templateStates, loadedTemplates,
      deletedRowIndices, excludedGenericRows,
      manualInputs,
    };
    try {
      localStorage.setItem(storageKey(selectedBIModel, selectedBIPeriod), serialize(session));
    } catch {
      // localStorage full — ignore
    }
  }, [
    selectedBIModel, selectedBIPeriod,
    t1Rows, hasCostData,
    t2Rows, t3Rows, t4Rows, t5Rows, t6Rows, t7Rows, t8Rows,
    templateStates, loadedTemplates,
    deletedRowIndices, excludedGenericRows,
    manualInputs,
  ]);

  // ── KPI toggles ────────────────────────────────────────────────────────────
  const toggleKPI = useCallback((id: string) => {
    setDisabledKPIs((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const resetKPIs = useCallback(() => setDisabledKPIs(new Set()), []);

  const toggleVisual = useCallback((id: string) => {
    setDisabledVisuals((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  // ── Row exclusion (T1) ────────────────────────────────────────────────────
  const toggleDeletedRow = useCallback((index: number) => {
    setDeletedRowIndices((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  }, []);

  // ── Row exclusion (generic T2–T8) ─────────────────────────────────────────
  const toggleExcludedGenericRow = useCallback((templateId: TemplateId, index: number) => {
    setExcludedGenericRows((prev) => {
      const current = new Set(prev[templateId] ?? []);
      if (current.has(index)) current.delete(index);
      else current.add(index);
      return { ...prev, [templateId]: current };
    });
  }, []);

  // ── Internal helper to register a template load state ─────────────────────
  const markTemplate = useCallback((id: TemplateId, state: TemplateLoadState) => {
    setTemplateStates((prev) => ({ ...prev, [id]: state }));
    setLoadedTemplates((prev) => {
      const next = new Set(prev);
      if (state.loaded) next.add(id);
      else next.delete(id);
      return next;
    });
  }, []);

  // ── Single load entry-point ─────────────────────────────────────────────────
  const loadTemplate = useCallback((id: TemplateId, buffer: ArrayBuffer, fileName: string) => {
    switch (id) {
      case "T1": {
        const { rows, hasCostData: hasC, errors } = parseT1(buffer);
        setT1Rows(rows);
        setHasCostData(hasC);
        setDeletedRowIndices(new Set());
        markTemplate("T1", { loaded: rows.length > 0, rowCount: rows.length, errors, fileName });
        break;
      }
      case "T2": { const r = parseT2(buffer); setT2Rows(r.rows); markTemplate("T2", { loaded: r.rows.length > 0, rowCount: r.rows.length, errors: r.errors, fileName }); break; }
      case "T3": { const r = parseT3(buffer); setT3Rows(r.rows); markTemplate("T3", { loaded: r.rows.length > 0, rowCount: r.rows.length, errors: r.errors, fileName }); break; }
      case "T4": { const r = parseT4(buffer); setT4Rows(r.rows); markTemplate("T4", { loaded: r.rows.length > 0, rowCount: r.rows.length, errors: r.errors, fileName }); break; }
      case "T5": { const r = parseT5(buffer); setT5Rows(r.rows); markTemplate("T5", { loaded: r.rows.length > 0, rowCount: r.rows.length, errors: r.errors, fileName }); break; }
      case "T6": { const r = parseT6(buffer); setT6Rows(r.rows); markTemplate("T6", { loaded: r.rows.length > 0, rowCount: r.rows.length, errors: r.errors, fileName }); break; }
      case "T7": { const r = parseT7(buffer); setT7Rows(r.rows); markTemplate("T7", { loaded: r.rows.length > 0, rowCount: r.rows.length, errors: r.errors, fileName }); break; }
      case "T8": { const r = parseT8(buffer); setT8Rows(r.rows); markTemplate("T8", { loaded: r.rows.length > 0, rowCount: r.rows.length, errors: r.errors, fileName }); break; }
    }
  }, [markTemplate]);

  // ── Remove template ────────────────────────────────────────────────────────
  const removeTemplate = useCallback((id: TemplateId) => {
    switch (id) {
      case "T1": setT1Rows([]); setHasCostData(false); setDeletedRowIndices(new Set()); setResult(null); break;
      case "T2": setT2Rows([]); break;
      case "T3": setT3Rows([]); break;
      case "T4": setT4Rows([]); break;
      case "T5": setT5Rows([]); break;
      case "T6": setT6Rows([]); break;
      case "T7": setT7Rows([]); break;
      case "T8": setT8Rows([]); break;
    }
    setTemplateStates((prev) => { const next = { ...prev }; delete next[id]; return next; });
    setLoadedTemplates((prev) => { const next = new Set(prev); next.delete(id); return next; });
    setExcludedGenericRows((prev) => { const next = { ...prev }; delete next[id]; return next; });
  }, []);

  // ── Manual inputs ──────────────────────────────────────────────────────────
  const setManualInputs = useCallback((inputs: Partial<ManualInputs>) => {
    setManualInputsState((prev) => ({ ...prev, ...inputs }));
  }, []);

  // ── Session reset ──────────────────────────────────────────────────────────
  const resetSession = useCallback(() => {
    if (selectedBIModel && selectedBIPeriod) {
      localStorage.removeItem(storageKey(selectedBIModel, selectedBIPeriod));
    }
    setResult(null);
    setT1Rows([]); setHasCostData(false);
    setT2Rows([]); setT3Rows([]); setT4Rows([]); setT5Rows([]);
    setT6Rows([]); setT7Rows([]); setT8Rows([]);
    setTemplateStates({});
    setLoadedTemplates(new Set());
    setDisabledKPIs(new Set());
    setDeletedRowIndices(new Set());
    setExcludedGenericRows({});
    setManualInputsState({});
  }, [selectedBIModel, selectedBIPeriod]);

  return (
    <BIExpressContext.Provider
      value={{
        selectedBIModel, setSelectedBIModel,
        selectedBIPeriod, setSelectedBIPeriod,
        disabledKPIs, toggleKPI, resetKPIs,
        disabledVisuals, toggleVisual,
        t1Rows, hasCostData,
        t2Rows,
        t3Rows, t4Rows, t5Rows, t6Rows, t7Rows, t8Rows,
        templateStates, loadedTemplates,
        loadTemplate, removeTemplate,
        manualInputs, setManualInputs,
        result, setResult,
        deletedRowIndices, toggleDeletedRow,
        excludedGenericRows, toggleExcludedGenericRow,
        resetSession,
      }}
    >
      {children}
    </BIExpressContext.Provider>
  );
}

export function useBIExpressContext() {
  const context = useContext(BIExpressContext);
  if (context === undefined) {
    throw new Error("useBIExpressContext must be used within a BIExpressProvider");
  }
  return context;
}
