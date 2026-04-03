// ── Types ──────────────────────────────────────────────────────────────────────

export interface TimeSeriesPoint {
  period: string;
  value: number;
}

export type AlgorithmType = "moving_average" | "holt_winters" | "linear_regression";

export interface ForecastConfig {
  algorithm: AlgorithmType;
  confidenceLevel: number; // 90, 95, 99
  seasonalityFactor: number; // multiplier e.g. 1.0, 1.1, 1.2
  forecastPeriods: number; // how many periods to project (1-10)
  movingAverageWindow: number; // window size for moving average (2-10)
}

export interface ForecastPoint {
  period: string;
  value: number | null;
  forecast: number | null;
  upperBound: number | null;
  lowerBound: number | null;
  isHistorical: boolean;
}

export interface ForecastResults {
  points: ForecastPoint[];
  mape: number;
  reliability: number; // 100 - MAPE
  trend: number; // percentage growth projected vs recent historical
  trendDirection: "up" | "down" | "stable";
  avgForecast: number;
  totalHistorical: number;
}

// ── Default Config ─────────────────────────────────────────────────────────────

export const DEFAULT_CONFIG: ForecastConfig = {
  algorithm: "holt_winters",
  confidenceLevel: 95,
  seasonalityFactor: 1.0,
  forecastPeriods: 5,
  movingAverageWindow: 3,
};

// ── Sample Data ────────────────────────────────────────────────────────────────

export const SAMPLE_DATA: TimeSeriesPoint[] = [
  { period: "Ene-24", value: 1200 },
  { period: "Feb-24", value: 1350 },
  { period: "Mar-24", value: 1100 },
  { period: "Abr-24", value: 1500 },
  { period: "May-24", value: 1420 },
  { period: "Jun-24", value: 1600 },
  { period: "Jul-24", value: 1380 },
  { period: "Ago-24", value: 1700 },
  { period: "Sep-24", value: 1550 },
  { period: "Oct-24", value: 1800 },
  { period: "Nov-24", value: 1650 },
  { period: "Dic-24", value: 1900 },
];

// ── Data Cleaning ──────────────────────────────────────────────────────────────

export function cleanData(data: TimeSeriesPoint[]): TimeSeriesPoint[] {
  if (data.length === 0) return [];

  // Interpolate missing/zero values
  const cleaned = data.map((p, i) => {
    if (p.value > 0) return { ...p };
    // Interpolate from neighbors
    const prev = data.slice(0, i).filter((d) => d.value > 0);
    const next = data.slice(i + 1).filter((d) => d.value > 0);
    const prevVal = prev.length > 0 ? prev[prev.length - 1].value : 0;
    const nextVal = next.length > 0 ? next[0].value : 0;
    const interpolated = prevVal && nextVal ? (prevVal + nextVal) / 2 : prevVal || nextVal;
    return { ...p, value: interpolated };
  });

  // Detect and smooth outliers (values > 3 std deviations from mean)
  const values = cleaned.map((p) => p.value);
  const mean = values.reduce((s, v) => s + v, 0) / values.length;
  const std = Math.sqrt(values.reduce((s, v) => s + (v - mean) ** 2, 0) / values.length);

  if (std > 0) {
    return cleaned.map((p, i) => {
      if (Math.abs(p.value - mean) > 3 * std) {
        // Replace outlier with average of neighbors
        const prev = i > 0 ? cleaned[i - 1].value : mean;
        const next = i < cleaned.length - 1 ? cleaned[i + 1].value : mean;
        return { ...p, value: (prev + next) / 2 };
      }
      return p;
    });
  }

  return cleaned;
}

// ── Z-Score for confidence intervals ───────────────────────────────────────────

function getZScore(confidenceLevel: number): number {
  switch (confidenceLevel) {
    case 90: return 1.645;
    case 95: return 1.96;
    case 99: return 2.576;
    default: return 1.96;
  }
}

// ── Simple Moving Average ──────────────────────────────────────────────────────

function forecastMovingAverage(
  data: TimeSeriesPoint[],
  config: ForecastConfig
): { forecasted: number[]; fittedValues: number[] } {
  const values = data.map((p) => p.value);
  const window = Math.min(config.movingAverageWindow, values.length);
  const fittedValues: number[] = [];

  // Calculate fitted values (in-sample)
  for (let i = 0; i < values.length; i++) {
    if (i < window) {
      fittedValues.push(values.slice(0, i + 1).reduce((s, v) => s + v, 0) / (i + 1));
    } else {
      const windowSlice = values.slice(i - window, i);
      fittedValues.push(windowSlice.reduce((s, v) => s + v, 0) / window);
    }
  }

  // Forecast future periods
  const forecasted: number[] = [];
  const extended = [...values];
  for (let i = 0; i < config.forecastPeriods; i++) {
    const windowSlice = extended.slice(extended.length - window);
    const avg = windowSlice.reduce((s, v) => s + v, 0) / window;
    const adjusted = avg * config.seasonalityFactor;
    forecasted.push(adjusted);
    extended.push(adjusted);
  }

  return { forecasted, fittedValues };
}

// ── Linear Regression ──────────────────────────────────────────────────────────

function forecastLinearRegression(
  data: TimeSeriesPoint[],
  config: ForecastConfig
): { forecasted: number[]; fittedValues: number[]; slope: number; intercept: number } {
  const values = data.map((p) => p.value);
  const n = values.length;

  // Simple linear regression: y = a + b*x
  const xMean = (n - 1) / 2;
  const yMean = values.reduce((s, v) => s + v, 0) / n;

  let numerator = 0;
  let denominator = 0;
  for (let i = 0; i < n; i++) {
    numerator += (i - xMean) * (values[i] - yMean);
    denominator += (i - xMean) ** 2;
  }

  const slope = denominator !== 0 ? numerator / denominator : 0;
  const intercept = yMean - slope * xMean;

  // Fitted values
  const fittedValues = values.map((_, i) => intercept + slope * i);

  // Forecast
  const forecasted: number[] = [];
  for (let i = 0; i < config.forecastPeriods; i++) {
    const x = n + i;
    forecasted.push((intercept + slope * x) * config.seasonalityFactor);
  }

  return { forecasted, fittedValues, slope, intercept };
}

// ── Holt-Winters (Double Exponential Smoothing) ────────────────────────────────

function forecastHoltWinters(
  data: TimeSeriesPoint[],
  config: ForecastConfig
): { forecasted: number[]; fittedValues: number[] } {
  const values = data.map((p) => p.value);
  const n = values.length;

  if (n < 2) {
    return {
      forecasted: Array(config.forecastPeriods).fill(values[0] || 0),
      fittedValues: [...values],
    };
  }

  // Optimize alpha and beta via grid search (minimizing MSE)
  let bestAlpha = 0.3;
  let bestBeta = 0.1;
  let bestMSE = Infinity;

  for (let a = 0.1; a <= 0.9; a += 0.1) {
    for (let b = 0.01; b <= 0.5; b += 0.05) {
      const { fittedValues } = runHoltWinters(values, a, b);
      let mse = 0;
      for (let i = 1; i < n; i++) {
        mse += (values[i] - fittedValues[i]) ** 2;
      }
      mse /= n - 1;
      if (mse < bestMSE) {
        bestMSE = mse;
        bestAlpha = a;
        bestBeta = b;
      }
    }
  }

  const { level, trend, fittedValues } = runHoltWinters(values, bestAlpha, bestBeta);

  // Forecast future
  const forecasted: number[] = [];
  for (let i = 1; i <= config.forecastPeriods; i++) {
    forecasted.push((level + i * trend) * config.seasonalityFactor);
  }

  return { forecasted, fittedValues };
}

function runHoltWinters(
  values: number[],
  alpha: number,
  beta: number
): { level: number; trend: number; fittedValues: number[] } {
  const n = values.length;

  // Initialize
  let level = values[0];
  let trend = values.length > 1 ? values[1] - values[0] : 0;
  const fittedValues: number[] = [level];

  for (let i = 1; i < n; i++) {
    const prevLevel = level;
    level = alpha * values[i] + (1 - alpha) * (prevLevel + trend);
    trend = beta * (level - prevLevel) + (1 - beta) * trend;
    fittedValues.push(prevLevel + trend);
  }

  return { level, trend, fittedValues };
}

// ── MAPE Calculation ───────────────────────────────────────────────────────────

function calculateMAPE(actual: number[], predicted: number[]): number {
  const n = Math.min(actual.length, predicted.length);
  if (n === 0) return 0;

  let sumAPE = 0;
  let validCount = 0;
  for (let i = 0; i < n; i++) {
    if (actual[i] !== 0) {
      sumAPE += Math.abs((actual[i] - predicted[i]) / actual[i]);
      validCount++;
    }
  }

  return validCount > 0 ? (sumAPE / validCount) * 100 : 0;
}

// ── Main Forecast Function ─────────────────────────────────────────────────────

export function runForecast(
  rawData: TimeSeriesPoint[],
  config: ForecastConfig
): ForecastResults {
  const data = cleanData(rawData);
  if (data.length === 0) {
    return {
      points: [],
      mape: 0,
      reliability: 0,
      trend: 0,
      trendDirection: "stable",
      avgForecast: 0,
      totalHistorical: 0,
    };
  }

  const values = data.map((p) => p.value);

  // Run selected algorithm
  let forecasted: number[];
  let fittedValues: number[];

  switch (config.algorithm) {
    case "moving_average": {
      const result = forecastMovingAverage(data, config);
      forecasted = result.forecasted;
      fittedValues = result.fittedValues;
      break;
    }
    case "linear_regression": {
      const result = forecastLinearRegression(data, config);
      forecasted = result.forecasted;
      fittedValues = result.fittedValues;
      break;
    }
    case "holt_winters":
    default: {
      const result = forecastHoltWinters(data, config);
      forecasted = result.forecasted;
      fittedValues = result.fittedValues;
      break;
    }
  }

  // MAPE
  const mape = calculateMAPE(values, fittedValues);
  const reliability = Math.max(0, Math.min(100, 100 - mape));

  // Std deviation of residuals for confidence intervals
  const residuals = values.map((v, i) => v - (fittedValues[i] || v));
  const residualStd = Math.sqrt(
    residuals.reduce((s, r) => s + r ** 2, 0) / Math.max(residuals.length - 1, 1)
  );
  const z = getZScore(config.confidenceLevel);

  // Build combined points
  const points: ForecastPoint[] = [];

  // Historical points
  for (let i = 0; i < data.length; i++) {
    points.push({
      period: data[i].period,
      value: data[i].value,
      forecast: null,
      upperBound: null,
      lowerBound: null,
      isHistorical: true,
    });
  }

  // Bridge point (last historical = first forecast)
  const lastHistorical = data[data.length - 1];
  points[points.length - 1] = {
    ...points[points.length - 1],
    forecast: lastHistorical.value,
    upperBound: lastHistorical.value,
    lowerBound: lastHistorical.value,
  };

  // Forecast points
  for (let i = 0; i < forecasted.length; i++) {
    const margin = z * residualStd * Math.sqrt(1 + i);
    points.push({
      period: `P+${i + 1}`,
      value: null,
      forecast: Math.max(0, forecasted[i]),
      upperBound: Math.max(0, forecasted[i] + margin),
      lowerBound: Math.max(0, forecasted[i] - margin),
      isHistorical: false,
    });
  }

  // Trend calculation
  const recentHistorical = values.slice(-3);
  const avgRecent = recentHistorical.reduce((s, v) => s + v, 0) / recentHistorical.length;
  const avgForecast = forecasted.reduce((s, v) => s + v, 0) / forecasted.length;
  const trend = avgRecent > 0 ? ((avgForecast - avgRecent) / avgRecent) * 100 : 0;
  const trendDirection: "up" | "down" | "stable" =
    trend > 2 ? "up" : trend < -2 ? "down" : "stable";

  const totalHistorical = values.reduce((s, v) => s + v, 0);

  return {
    points,
    mape: Math.round(mape * 100) / 100,
    reliability: Math.round(reliability * 100) / 100,
    trend: Math.round(trend * 100) / 100,
    trendDirection,
    avgForecast: Math.round(avgForecast * 100) / 100,
    totalHistorical,
  };
}

// ── Generate forecast period labels ────────────────────────────────────────────

export function generatePeriodLabels(
  lastPeriod: string,
  count: number
): string[] {
  // Try to parse "Mon-YY" format
  const monthMap: Record<string, number> = {
    Ene: 0, Feb: 1, Mar: 2, Abr: 3, May: 4, Jun: 5,
    Jul: 6, Ago: 7, Sep: 8, Oct: 9, Nov: 10, Dic: 11,
  };
  const reverseMap = Object.entries(monthMap).reduce(
    (acc, [k, v]) => ({ ...acc, [v]: k }),
    {} as Record<number, string>
  );

  const match = lastPeriod.match(/^(\w{3})-(\d{2})$/);
  if (match) {
    const [, monthStr, yearStr] = match;
    let month = monthMap[monthStr] ?? 0;
    let year = 2000 + parseInt(yearStr, 10);

    const labels: string[] = [];
    for (let i = 0; i < count; i++) {
      month++;
      if (month > 11) {
        month = 0;
        year++;
      }
      labels.push(`${reverseMap[month]}-${(year % 100).toString().padStart(2, "0")}`);
    }
    return labels;
  }

  // Fallback: P+1, P+2, ...
  return Array.from({ length: count }, (_, i) => `P+${i + 1}`);
}

// ── Formatting Helpers ─────────────────────────────────────────────────────────

export function fmtNumber(n: number, decimals = 1): string {
  return n.toLocaleString("es-BO", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

export function fmtCurrency(n: number, symbol = "$"): string {
  return `${symbol} ${n.toLocaleString("es-BO", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

// ── CSV Export ──────────────────────────────────────────────────────────────────

export function exportToCSV(points: ForecastPoint[]): string {
  const header = "Periodo,Valor Histórico,Forecast,Límite Inferior,Límite Superior\n";
  const rows = points
    .map(
      (p) =>
        `${p.period},${p.value ?? ""},${p.forecast ?? ""},${p.lowerBound ?? ""},${p.upperBound ?? ""}`
    )
    .join("\n");
  return header + rows;
}
