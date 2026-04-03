import { useMemo } from "react";
import { AppLayout } from "@/components/AppLayout";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
  DollarSign,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
} from "lucide-react";
import { useAllocation } from "@/hooks/use-allocation";
import { useCurrency } from "@/hooks/use-currency";
const subtypeLabels: Record<string, string> = {
  product: "Producto",
  service: "Servicio",
  client: "Cliente",
  channel: "Canal",
  project: "Proyecto",
};

/* ───── Stat Card ───── */
function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  color,
}: {
  title: string;
  value: string;
  subtitle?: string;
  icon: React.ElementType;
  color: string;
}) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center gap-3">
          <div
            className={`h-10 w-10 rounded-lg ${color} flex items-center justify-center`}
          >
            <Icon className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">{title}</p>
            <p className="text-lg font-bold font-mono">{value}</p>
            {subtitle && (
              <p className="text-[10px] text-muted-foreground">{subtitle}</p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

/* ───── Main Page ───── */
const ProfitabilityPage = () => {
  const allocation = useAllocation();
  const { fmt } = useCurrency();

  const profitData = useMemo(() => {
    // Cross-reference costObjectSummaries (has total_cost) with costObjects (has price)
    const coMap = new Map(
      allocation.costObjects.map((co) => [co.id, co]),
    );

    const items = allocation.costObjectSummaries
      .map((summary) => {
        const co = coMap.get(summary.id);
        const price = co?.price ?? 0;
        const cost = summary.total_cost;
        const margin = price - cost;
        const marginPct = price > 0 ? (margin / price) * 100 : cost > 0 ? -100 : 0;

        return {
          id: summary.id,
          code: summary.code,
          name: summary.name,
          type: summary.type,
          category: co?.category ?? null,
          price,
          cost,
          margin,
          marginPct,
          hasPrice: (co?.price ?? 0) > 0,
        };
      })
      .sort((a, b) => b.margin - a.margin);

    const withPrice = items.filter((i) => i.hasPrice);
    const totalRevenue = withPrice.reduce((s, i) => s + i.price, 0);
    const totalCost = withPrice.reduce((s, i) => s + i.cost, 0);
    const totalMargin = totalRevenue - totalCost;
    const avgMarginPct = totalRevenue > 0 ? (totalMargin / totalRevenue) * 100 : 0;
    const profitable = withPrice.filter((i) => i.margin > 0).length;
    const unprofitable = withPrice.filter((i) => i.margin <= 0).length;

    return {
      items,
      withPrice,
      totalRevenue,
      totalCost,
      totalMargin,
      avgMarginPct,
      profitable,
      unprofitable,
    };
  }, [allocation.costObjectSummaries, allocation.costObjects]);

  if (allocation.isLoading) {
    return (
      <AppLayout>
        <PageHeader
          title="Rentabilidad"
          description="Análisis de rentabilidad por objeto de costo"
        />
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      </AppLayout>
    );
  }

  const noPriceItems = profitData.items.filter((i) => !i.hasPrice);

  return (
    <AppLayout>
      <PageHeader
        title="Análisis de Rentabilidad"
        description="Comparación de costo ABC vs. precio de venta por objeto de costo"
      />

      {/* Summary cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <StatCard
          title="Ingreso total"
          value={fmt(profitData.totalRevenue)}
          subtitle={`${profitData.withPrice.length} objetos con precio`}
          icon={DollarSign}
          color="bg-primary/10 text-primary"
        />
        <StatCard
          title="Costo ABC total"
          value={fmt(profitData.totalCost)}
          icon={DollarSign}
          color="bg-blue-500/10 text-blue-600"
        />
        <StatCard
          title="Margen total"
          value={fmt(profitData.totalMargin)}
          subtitle={`${profitData.avgMarginPct.toFixed(1)}% margen promedio`}
          icon={profitData.totalMargin >= 0 ? TrendingUp : TrendingDown}
          color={
            profitData.totalMargin >= 0
              ? "bg-emerald-500/10 text-emerald-600"
              : "bg-red-500/10 text-red-600"
          }
        />
        <StatCard
          title="Rentables / No rentables"
          value={`${profitData.profitable} / ${profitData.unprofitable}`}
          icon={
            profitData.unprofitable > 0 ? AlertTriangle : TrendingUp
          }
          color={
            profitData.unprofitable > 0
              ? "bg-amber-500/10 text-amber-600"
              : "bg-emerald-500/10 text-emerald-600"
          }
        />
      </div>

      {profitData.withPrice.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-12 text-center text-muted-foreground">
            <p className="text-sm">
              No hay objetos de costo con precio de venta configurado.
            </p>
            <p className="text-xs mt-1">
              Asigna precios en el diccionario de Objetos de Costo para ver el
              análisis de rentabilidad.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {/* Detail table */}
          <Card>
            <CardHeader className="p-3 pb-2">
              <CardTitle className="text-sm">
                Detalle de rentabilidad por objeto de costo
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nombre</TableHead>
                    <TableHead className="w-24">Tipo</TableHead>
                    <TableHead className="w-32">Categoría</TableHead>
                    <TableHead className="text-right">Venta</TableHead>
                    <TableHead className="text-right">Costo ABC</TableHead>
                    <TableHead className="text-right font-semibold">
                      Margen
                    </TableHead>
                    <TableHead className="text-right w-32">Rentabilidad</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {profitData.withPrice
                    .sort((a, b) => b.margin - a.margin)
                    .map((item) => (
                      <TableRow key={item.id}>
                        <TableCell>
                          <div className="flex flex-col gap-0.5">
                            <span className="font-mono text-sm text-muted-foreground leading-tight">{item.code}</span>
                            <span className="text-sm">{item.name}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary" className="text-xs">
                            {subtypeLabels[item.type] || item.type}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {item.category ?? "—"}
                        </TableCell>
                        <TableCell className="text-right font-mono text-sm">
                          {fmt(item.price)}
                        </TableCell>
                        <TableCell className="text-right font-mono text-sm">
                          {fmt(item.cost)}
                        </TableCell>
                        <TableCell
                          className={`text-right font-mono text-sm font-semibold ${
                            item.margin >= 0 ? "text-emerald-600" : "text-red-600"
                          }`}
                        >
                          {fmt(item.margin)}
                        </TableCell>
                        <TableCell
                          className={`text-right font-mono text-sm ${
                            item.marginPct >= 0
                              ? "text-emerald-600"
                              : "text-red-600"
                          }`}
                        >
                          {item.marginPct.toFixed(1)}%
                        </TableCell>
                      </TableRow>
                    ))}
                  {/* Totals */}
                  <TableRow className="bg-muted/50 font-semibold">
                    <TableCell colSpan={3} className="text-right">
                      TOTAL
                    </TableCell>
                    <TableCell className="text-right font-mono text-sm">
                      {fmt(profitData.totalRevenue)}
                    </TableCell>
                    <TableCell className="text-right font-mono text-sm">
                      {fmt(profitData.totalCost)}
                    </TableCell>
                    <TableCell
                      className={`text-right font-mono text-sm ${
                        profitData.totalMargin >= 0
                          ? "text-emerald-600"
                          : "text-red-600"
                      }`}
                    >
                      {fmt(profitData.totalMargin)}
                    </TableCell>
                    <TableCell
                      className={`text-right font-mono text-sm ${
                        profitData.avgMarginPct >= 0
                          ? "text-emerald-600"
                          : "text-red-600"
                      }`}
                    >
                      {profitData.avgMarginPct.toFixed(1)}%
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Items without price */}
          {noPriceItems.length > 0 && (
            <Card className="border-dashed">
              <CardHeader className="p-3 pb-2">
                <CardTitle className="text-sm text-muted-foreground">
                  Objetos de costo sin precio de venta ({noPriceItems.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nombre</TableHead>
                      <TableHead className="w-24">Tipo</TableHead>
                      <TableHead className="text-right">Costo ABC</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {noPriceItems.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell>
                          <div className="flex flex-col gap-0.5">
                            <span className="font-mono text-sm text-muted-foreground leading-tight">{item.code}</span>
                            <span className="text-sm">{item.name}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-xs">
                            {subtypeLabels[item.type] || item.type}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right font-mono text-xs">
                          {fmt(item.cost)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </AppLayout>
  );
};

export default ProfitabilityPage;
