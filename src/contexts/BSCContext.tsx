import { createContext, useContext, useState, ReactNode } from "react";
import type { Model, Period } from "@/hooks/use-supabase-data";

interface BSCContextType {
  selectedBSCModel: Model | null;
  setSelectedBSCModel: (model: Model | null) => void;
  selectedBSCPeriod: Period | null;
  setSelectedBSCPeriod: (period: Period | null) => void;
}

const BSCContext = createContext<BSCContextType | undefined>(undefined);

export function BSCProvider({ children }: { children: ReactNode }) {
  const [selectedBSCModel, setSelectedBSCModel] = useState<Model | null>(null);
  const [selectedBSCPeriod, setSelectedBSCPeriod] = useState<Period | null>(null);

  return (
    <BSCContext.Provider
      value={{
        selectedBSCModel,
        setSelectedBSCModel,
        selectedBSCPeriod,
        setSelectedBSCPeriod,
      }}
    >
      {children}
    </BSCContext.Provider>
  );
}

export function useBSCContext() {
  const context = useContext(BSCContext);
  if (context === undefined) {
    throw new Error("useBSCContext must be used within a BSCProvider");
  }
  return context;
}
