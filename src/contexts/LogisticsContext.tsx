import { createContext, useContext, useState, ReactNode } from "react";
import type { Model, Period } from "@/hooks/use-supabase-data";

interface LogisticsContextType {
  selectedLogisticsModel: Model | null;
  setSelectedLogisticsModel: (model: Model | null) => void;
  selectedLogisticsPeriod: Period | null;
  setSelectedLogisticsPeriod: (period: Period | null) => void;
}

const LogisticsContext = createContext<LogisticsContextType | undefined>(undefined);

export function LogisticsProvider({ children }: { children: ReactNode }) {
  const [selectedLogisticsModel, setSelectedLogisticsModel] = useState<Model | null>(null);
  const [selectedLogisticsPeriod, setSelectedLogisticsPeriod] = useState<Period | null>(null);

  return (
    <LogisticsContext.Provider
      value={{
        selectedLogisticsModel,
        setSelectedLogisticsModel,
        selectedLogisticsPeriod,
        setSelectedLogisticsPeriod,
      }}
    >
      {children}
    </LogisticsContext.Provider>
  );
}

export function useLogisticsContext() {
  const context = useContext(LogisticsContext);
  if (context === undefined) {
    throw new Error("useLogisticsContext must be used within a LogisticsProvider");
  }
  return context;
}
