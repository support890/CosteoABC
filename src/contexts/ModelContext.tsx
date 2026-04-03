import React, { createContext, useContext, useState, ReactNode } from "react";
import type { Model, Period } from "@/hooks/use-supabase-data";

interface ModelContextType {
  selectedModel: Model | null;
  setSelectedModel: (model: Model | null) => void;
  selectedPeriod: Period | null;
  setSelectedPeriod: (period: Period | null) => void;
}

const ModelContext = createContext<ModelContextType | undefined>(undefined);

export function ModelProvider({ children }: { children: ReactNode }) {
  const [selectedModel, setSelectedModel] = useState<Model | null>(null);
  const [selectedPeriod, setSelectedPeriod] = useState<Period | null>(null);

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
