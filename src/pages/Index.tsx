import React from "react";
import { AppLayout } from "@/components/AppLayout";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Calculator,
  BarChart2,
  Truck,
  TrendingUp,
  Target,
  Loader2,
  Calendar,
  Box,
  Building2,
  Users,
} from "lucide-react";
import { useModels, usePeriods } from "@/hooks/use-supabase-data";
import { useBIModels } from "@/hooks/use-bi-express-data";
import { useLogisticsModels } from "@/hooks/use-logistics-data";
import { useForecastModels } from "@/hooks/use-forecast-data";
import { useBSCModels } from "@/hooks/use-bsc-data";
import { useTenant } from "@/hooks/use-tenant";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";

/* ── Small stat pill inside a tool card ── */
function Stat({ value, label }: { value: number; label: string }) {
  return (
    <div className="text-center">
      <p className="text-2xl font-bold leading-tight">{value}</p>
      <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
    </div>
  );
}

/* ── Model list row: name + period badge ── */
function ModelRow({ name, periodCount }: { name: string; periodCount: number }) {
  return (
    <div className="flex items-center justify-between py-1.5 border-b border-border/40 last:border-0">
      <span className="text-sm truncate max-w-[70%]">{name}</span>
      <Badge variant="secondary" className="text-xs shrink-0 gap-1">
        <Calendar className="h-3 w-3" />
        {periodCount} {periodCount === 1 ? "período" : "períodos"}
      </Badge>
    </div>
  );
}

/* ── Tool card ── */
interface ToolCardProps {
  icon: React.ElementType;
  iconColor: string;
  iconBg: string;
  name: string;
  description: string;
  models: { id: string; name: string }[];
  periodsByModel: Record<string, number>;
}

function ToolCard({
  icon: Icon,
  iconColor,
  iconBg,
  name,
  description,
  models,
  periodsByModel,
}: ToolCardProps) {
  const totalModels = models.length;
  const totalPeriods = models.reduce(
    (sum, m) => sum + (periodsByModel[m.id] ?? 0),
    0,
  );

  return (
    <Card className="border-border/50 flex flex-col">
      <CardHeader className="pb-3">
        <div className="flex items-start gap-3">
          <div
            className={`h-9 w-9 rounded-lg ${iconBg} flex items-center justify-center shrink-0`}
          >
            <Icon className={`h-5 w-5 ${iconColor}`} />
          </div>
          <div className="min-w-0">
            <CardTitle className="text-sm font-semibold leading-tight">
              {name}
            </CardTitle>
            <p className="text-xs text-muted-foreground mt-0.5 leading-snug">
              {description}
            </p>
          </div>
        </div>

        {/* Summary stats */}
        <div className="flex gap-6 mt-3 pt-3 border-t border-border/40">
          <Stat value={totalModels} label="modelos" />
          <Stat value={totalPeriods} label="períodos" />
        </div>
      </CardHeader>

      <CardContent className="pt-0 flex-1">
        {models.length === 0 ? (
          <p className="text-xs text-muted-foreground italic">
            Sin modelos creados
          </p>
        ) : (
          <div>
            {models.map((m) => (
              <ModelRow
                key={m.id}
                name={m.name}
                periodCount={periodsByModel[m.id] ?? 0}
              />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/* ══════════════════════════════════════════════════════════
   DASHBOARD
══════════════════════════════════════════════════════════ */
const Index = () => {
  const { tenant, loading: tenantLoading } = useTenant();
  const [userCount, setUserCount] = useState<number>(0);
  const [usersLoading, setUsersLoading] = useState(true);

  useEffect(() => {
    if (!tenant) return;
    supabase
      .from("tenant_members")
      .select("id", { count: "exact", head: true })
      .eq("tenant_id", tenant.id)
      .then(({ count }) => {
        setUserCount(count ?? 0);
        setUsersLoading(false);
      });
  }, [tenant]);

  const abcModels = useModels();
  const biModels = useBIModels();
  const logisticsModels = useLogisticsModels();
  const forecastModels = useForecastModels();
  const bscModels = useBSCModels();
  const periods = usePeriods();

  const isLoading =
    tenantLoading ||
    usersLoading ||
    abcModels.isLoading ||
    biModels.isLoading ||
    logisticsModels.isLoading ||
    forecastModels.isLoading ||
    bscModels.isLoading ||
    periods.isLoading;

  /* Build a map: modelId → period count */
  const periodsByModel: Record<string, number> = {};
  for (const p of periods.items) {
    if (p.model_id) {
      periodsByModel[p.model_id] = (periodsByModel[p.model_id] ?? 0) + 1;
    }
  }

  const totalModels =
    abcModels.items.length +
    biModels.items.length +
    logisticsModels.items.length +
    forecastModels.items.length +
    bscModels.items.length;

  if (isLoading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center py-32">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <PageHeader
        title="Dashboard"
        description="Vista general del desempeño corporativo"
      />

      {/* ── Global summary ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        {/* Tenant */}
        <Card className="border-border/50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Organización</p>
                <p className="text-2xl font-bold mt-1">
                  {tenant?.name ?? "—"}
                </p>
                <p className="text-xs text-primary mt-1 capitalize">
                  {tenant?.plan ?? ""}
                </p>
              </div>
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Building2 className="h-5 w-5 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Total models */}
        <Card className="border-border/50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">
                  Modelos creados
                </p>
                <p className="text-2xl font-bold mt-1">{totalModels}</p>
                <p className="text-xs text-primary mt-1">en todas las herramientas</p>
              </div>
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Box className="h-5 w-5 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Users */}
        <Card className="border-border/50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Usuarios</p>
                <p className="text-2xl font-bold mt-1">{userCount}</p>
                <p className="text-xs text-primary mt-1">en esta cuenta</p>
              </div>
              <div className="h-10 w-10 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                <Users className="h-5 w-5 text-emerald-500" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── Herramientas de Análisis ── */}
      <p className="text-xs font-medium text-muted-foreground uppercase tracking-widest mb-3">
        Herramientas de análisis
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
        <ToolCard
          icon={Calculator}
          iconColor="text-primary"
          iconBg="bg-primary/10"
          name="Costeo ABC"
          description="Asignación de costos por actividades"
          models={abcModels.items}
          periodsByModel={periodsByModel}
        />
        <ToolCard
          icon={BarChart2}
          iconColor="text-blue-400"
          iconBg="bg-blue-400/10"
          name="BI Express"
          description="Análisis de rentabilidad y KPIs comerciales"
          models={biModels.items}
          periodsByModel={periodsByModel}
        />
        <ToolCard
          icon={Truck}
          iconColor="text-orange-400"
          iconBg="bg-orange-400/10"
          name="Eficiencia Logística"
          description="Punto de equilibrio y análisis de rutas"
          models={logisticsModels.items}
          periodsByModel={periodsByModel}
        />
        <ToolCard
          icon={TrendingUp}
          iconColor="text-purple-400"
          iconBg="bg-purple-400/10"
          name="Forecast"
          description="Proyección de series de tiempo"
          models={forecastModels.items}
          periodsByModel={periodsByModel}
        />
        <ToolCard
          icon={Target}
          iconColor="text-emerald-500"
          iconBg="bg-emerald-500/10"
          name="Estrategia BSC"
          description="Balanced Scorecard y KPIs estratégicos"
          models={bscModels.items}
          periodsByModel={periodsByModel}
        />
      </div>
    </AppLayout>
  );
};

export default Index;
