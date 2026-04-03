import { useModelContext } from "@/contexts/ModelContext";

const CURRENCY_SYMBOLS: Record<string, string> = {
  USD: "$",
  EUR: "€",
  GBP: "£",
  BOB: "Bs.",
  ARS: "$",
  PEN: "S/",
  CLP: "$",
  COP: "$",
  MXN: "$",
  BRL: "R$",
  UYU: "$U",
  PYG: "₲",
  GTQ: "Q",
  HNL: "L",
  CRC: "₡",
  DOP: "RD$",
  NIO: "C$",
  PAB: "B/.",
  VES: "Bs.S",
  JPY: "¥",
  CNY: "¥",
};

export function getCurrencySymbol(code?: string): string {
  if (!code) return "$";
  return CURRENCY_SYMBOLS[code] ?? "$";
}

export function useCurrency() {
  const { selectedModel } = useModelContext();
  const symbol = getCurrencySymbol(selectedModel?.base_currency);

  const fmt = (n: number): string =>
    symbol +
    n.toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });

  const fmtCompact = (n: number): string => {
    if (Math.abs(n) >= 1_000_000)
      return `${symbol}${(n / 1_000_000).toFixed(1)}M`;
    if (Math.abs(n) >= 1_000) return `${symbol}${(n / 1_000).toFixed(1)}K`;
    return fmt(n);
  };

  return { symbol, fmt, fmtCompact };
}
