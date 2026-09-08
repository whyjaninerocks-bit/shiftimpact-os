// ─── Signal Sparkline — client-facing ────────────────────────────────────────
// Plain inline SVG, no charting library. Visual language matches the agency
// view's Sparkline exactly (gradient fill under the line, bold dashed
// benchmark/gate reference line, thicker stroke) so the two portals read as
// the same product instead of a "light" client version and a "real" agency
// version — see AgencyPortalView.tsx's Sparkline for the reference this was
// brought in line with.

export function SignalSparkline({
  values,
  threshold,
  color = "#10b981",
  width = 200,
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
  const min = Math.min(...allVals) * 0.92;
  const max = Math.max(...allVals) * 1.08;
  const range = max - min || 1;
  const pad = 6;
  const py = height > 80 ? 14 : 8;

  const points = values.map((v, i) => {
    if (v == null) return null;
    const x = pad + (i / (values.length - 1)) * (width - pad * 2);
    const y = height - py - ((v - min) / range) * (height - py * 2);
    return { x, y };
  });

  const validPoints = points.filter((p): p is { x: number; y: number } => p != null);
  if (validPoints.length < 2) return null;

  const linePath = validPoints.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(" ");
  const areaPath = `${linePath} L ${validPoints[validPoints.length - 1].x.toFixed(1)} ${height} L ${validPoints[0].x.toFixed(1)} ${height} Z`;
  const thresholdY =
    threshold != null ? height - py - ((threshold - min) / range) * (height - py * 2) : null;
  const gradId = `cs-${color.replace("#", "")}`;

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full" style={{ height }} preserveAspectRatio="none">
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.25" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={areaPath} fill={`url(#${gradId})`} />
      {thresholdY != null && (
        <line
          x1={pad}
          y1={thresholdY}
          x2={width - pad}
          y2={thresholdY}
          stroke="#f87171"
          strokeWidth="1.5"
          strokeDasharray="5 3"
          strokeOpacity="0.9"
        />
      )}
      <path d={linePath} fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      {validPoints.map((p, i) => (
        <circle
          key={i}
          cx={p.x}
          cy={p.y}
          r={i === validPoints.length - 1 ? 4.5 : 3}
          fill={i === validPoints.length - 1 ? color : "white"}
          stroke={color}
          strokeWidth="2"
        />
      ))}
    </svg>
  );
}
