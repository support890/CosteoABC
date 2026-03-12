interface GaugeChartProps {
  value: number; // 0-100
  status: "success" | "warning" | "danger";
  size?: number;
}

export function GaugeChart({ value, status, size = 160 }: GaugeChartProps) {
  const clampedValue = Math.min(100, Math.max(0, value));
  const angle = (clampedValue / 100) * 180 - 90; // -90 to 90 degrees

  const statusColors = {
    success: "var(--success)",
    warning: "var(--warning)",
    danger: "var(--danger)",
  };

  const color = statusColors[status];
  const radius = size / 2 - 10;
  const cx = size / 2;
  const cy = size / 2 + 10;

  // Arc path for background
  const arcPath = (startAngle: number, endAngle: number) => {
    const startRad = ((startAngle - 180) * Math.PI) / 180;
    const endRad = ((endAngle - 180) * Math.PI) / 180;
    const x1 = cx + radius * Math.cos(startRad);
    const y1 = cy + radius * Math.sin(startRad);
    const x2 = cx + radius * Math.cos(endRad);
    const y2 = cy + radius * Math.sin(endRad);
    const largeArc = endAngle - startAngle > 180 ? 1 : 0;
    return `M ${x1} ${y1} A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2}`;
  };

  // Needle endpoint
  const needleRad = ((angle) * Math.PI) / 180;
  const needleLen = radius - 15;
  const needleX = cx + needleLen * Math.cos(needleRad - Math.PI / 2 + Math.PI);
  // Corrected: needle points up at 0, rotates CW
  const nRad = ((clampedValue / 100) * Math.PI);
  const nX = cx - (radius - 20) * Math.cos(nRad);
  const nY = cy - (radius - 20) * Math.sin(nRad);

  return (
    <div className="flex flex-col items-center">
      <svg width={size} height={size / 2 + 30} viewBox={`0 0 ${size} ${size / 2 + 30}`}>
        {/* Background arc segments */}
        <path
          d={arcPath(0, 60)}
          fill="none"
          stroke="hsl(var(--danger))"
          strokeWidth={12}
          strokeLinecap="round"
          opacity={0.2}
        />
        <path
          d={arcPath(60, 120)}
          fill="none"
          stroke="hsl(var(--warning))"
          strokeWidth={12}
          strokeLinecap="round"
          opacity={0.2}
        />
        <path
          d={arcPath(120, 180)}
          fill="none"
          stroke="hsl(var(--success))"
          strokeWidth={12}
          strokeLinecap="round"
          opacity={0.2}
        />

        {/* Active arc */}
        <path
          d={arcPath(0, (clampedValue / 100) * 180)}
          fill="none"
          stroke={`hsl(${color})`}
          strokeWidth={12}
          strokeLinecap="round"
        />

        {/* Needle */}
        <line
          x1={cx}
          y1={cy}
          x2={nX}
          y2={nY}
          stroke="hsl(var(--foreground))"
          strokeWidth={2}
          strokeLinecap="round"
        />
        <circle cx={cx} cy={cy} r={4} fill="hsl(var(--foreground))" />
      </svg>
      <span className="text-2xl font-bold mt-1" style={{ color: `hsl(${color})` }}>
        {clampedValue}%
      </span>
    </div>
  );
}
