// ─── Signal Sparkline — client-facing ────────────────────────────────────────
// Plain inline SVG, no charting library — matches the demo portal's per-signal
// trend lines (dashed threshold reference + week-over-week line) using data
// the real portal already fetches (getSignalWeeklyReports returns every week,
// not just the latest). No new intelligence, just showing the trend instead
// of throwing away everything except the most recent point.

export function SignalSparkline({
  values,
  threshold,
  color = "#10b981",
  width = 140,
  height = 40,
}: {
  values: (number | null)[];
  threshold?: number | null;
  color?: string;
  width?: number;
  height?: number;
}) {
  const clean = values.filter((v): v is number => v != null);
  if (clean.length < 2) return null;

  const allVals = threshold != null ? [...clean, threshold] : clean;
  const min = Math.min(...allVals);
  const max = Math.max(...allVals);
  const range = max - min || 1;
  const pad = 4;

  const points = values.map((v, i) => {
    if (v == null) return null;
    const x = pad + (i / (values.length - 1)) * (width - pad * 2);
    const y = height - pad - ((v - min) / range) * (height - pad * 2);
    return { x, y };
  });

  const validPoints = points.filter((p): p is { x: number; y: number } => p != null);
  if (validPoints.length < 2) return null;

  const path = validPoints.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(" ");
  const thresholdY =
    threshold != null ? height - pad - ((threshold - min) / range) * (height - pad * 2) : null;

  return (
    <svg viewBox={`0 0 ${width} ${height}`} width="100%" height={height} preserveAspectRatio="none">
      {thresholdY != null && (
        <line
          x1={pad}
          y1={thresholdY}
          x2={width - pad}
          y2={thresholdY}
          stroke="#d1d5db"
          strokeWidth={1}
          strokeDasharray="3,3"
        />
      )}
      <path d={path} fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      {validPoints.map((p, i) => (
        <circle
          key={i}
          cx={p.x}
          cy={p.y}
          r={i === validPoints.length - 1 ? 3 : 2}
          fill={i === validPoints.length - 1 ? color : "#ffffff"}
          stroke={color}
          strokeWidth={1.5}
        />
      ))}
    </svg>
  );
}
