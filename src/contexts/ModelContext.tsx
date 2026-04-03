import React, { createContext, useContext, useState, ReactNode } from "react";
import type { Model, Period } from "@/hooks/use-supabase-data";

const STORAGE_KEY_MODEL = "abc_selected_model";
const STORAGE_KEY_PERIOD = "abc_selected_period";

function loadFromStorage<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

function saveToStorage(key: string, value: unknown | null) {
  if (value === null) {
    localStorage.removeItem(key);
  } else {
    localStorage.setItem(key, JSON.stringify(value));
  }
}

interface ModelContextType {
  selectedModel: Model | null;
  setSelectedModel: (model: Model | null) => void;
  selectedPeriod: Period | null;
  setSelectedPeriod: (period: Period | null) => void;
}

const ModelContext = createContext<ModelContextType | undefined>(undefined);

export function ModelProvider({ children }: { children: ReactNode }) {
  const [selectedModel, _setSelectedModel] = useState<Model | null>(
    () => loadFromStorage<Model>(STORAGE_KEY_MODEL),
  );
  const [selectedPeriod, _setSelectedPeriod] = useState<Period | null>(
    () => loadFromStorage<Period>(STORAGE_KEY_PERIOD),
  );

  const setSelectedModel = (model: Model | null) => {
    _setSelectedModel(model);
    saveToStorage(STORAGE_KEY_MODEL, model);
  };

  const setSelectedPeriod = (period: Period | null) => {
    _setSelectedPeriod(period);
    saveToStorage(STORAGE_KEY_PERIOD, period);
  };

  return (
    <ModelContext.Provider
      value={{
        selectedModel,
        setSelectedModel,
        selectedPeriod,
        setSelectedPeriod,
      }}
    >
      {children}
    </ModelContext.Provider>
  );
}

export function useModelContext() {
  const context = useContext(ModelContext);
  if (context === undefined) {
    throw new Error("useModelContext must be used within a ModelProvider");
  }
  return context;
}
