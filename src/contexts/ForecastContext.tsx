import { createContext, useContext, useState, ReactNode } from "react";
import type { Model, Period } from "@/hooks/use-supabase-data";
import {
  type TimeSeriesPoint,
  type ForecastConfig,
  DEFAULT_CONFIG,
  SAMPLE_DATA,
} from "@/lib/forecast-engine";

interface ForecastContextType {
  selectedForecastModel: Model | null;
  setSelectedForecastModel: (model: Model | null) => void;
  selectedForecastPeriod: Period | null;
  setSelectedForecastPeriod: (period: Period | null) => void;
  // Shared forecast state persisted across route changes
  forecastData: TimeSeriesPoint[];
  setForecastData: (data: TimeSeriesPoint[]) => void;
  forecastEditingData: TimeSeriesPoint[];
  setForecastEditingData: (data: TimeSeriesPoint[]) => void;
  forecastConfig: ForecastConfig;
  setForecastConfig: (config: ForecastConfig) => void;
  forecastDataApplied: boolean;
  setForecastDataApplied: (applied: boolean) => void;
}

const ForecastContext = createContext<ForecastContextType | undefined>(undefined);

export function ForecastProvider({ children }: { children: ReactNode }) {
  const [selectedForecastModel, setSelectedForecastModel] = useState<Model | null>(null);
  const [selectedForecastPeriod, setSelectedForecastPeriod] = useState<Period | null>(null);
  const [forecastData, setForecastData] = useState<TimeSeriesPoint[]>(SAMPLE_DATA);
  const [forecastEditingData, setForecastEditingData] = useState<TimeSeriesPoint[]>([...SAMPLE_DATA]);
  const [forecastConfig, setForecastConfig] = useState<ForecastConfig>(DEFAULT_CONFIG);
  const [forecastDataApplied, setForecastDataApplied] = useState(true);

  return (
    <ForecastContext.Provider
      value={{
        selectedForecastModel,
        setSelectedForecastModel,
        selectedForecastPeriod,
        setSelectedForecastPeriod,
        forecastData,
        setForecastData,
        forecastEditingData,
        setForecastEditingData,
        forecastConfig,
        setForecastConfig,
        forecastDataApplied,
        setForecastDataApplied,
      }}
    >
      {children}
    </ForecastContext.Provider>
  );
}

export function useForecastContext() {
  const context = useContext(ForecastContext);
  if (context === undefined) {
    throw new Error("useForecastContext must be used within a ForecastProvider");
  }
  return context;
}
