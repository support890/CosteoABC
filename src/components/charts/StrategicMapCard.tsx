interface KPI {
  name: string;
  score: number;
  status: "success" | "warning" | "danger";
}

interface StrategicMapCardProps {
  perspective: string;
  kpis: KPI[];
}

export function StrategicMapCard({ perspective, kpis }: StrategicMapCardProps) {
  const statusBg = {
    success: "bg-success/10 border-success/30",
    warning: "bg-warning/10 border-warning/30",
    danger: "bg-danger/10 border-danger/30",
  };

  const statusDot = {
    success: "bg-success",
    warning: "bg-warning",
    danger: "bg-danger",
  };

  return (
    <div className="space-y-3">
      <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
        {perspective}
      </h3>
      {kpis.map((kpi) => (
        <div
          key={kpi.name}
          className={`rounded-lg border p-3 ${statusBg[kpi.status]} transition-colors`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div
                className={`h-2 w-2 rounded-full ${statusDot[kpi.status]}`}
              />
              <span className="text-sm font-medium">{kpi.name}</span>
            </div>
            <span className="text-sm font-bold">{kpi.score.toFixed(1)}</span>
          </div>
        </div>
      ))}
    </div>
  );
}
