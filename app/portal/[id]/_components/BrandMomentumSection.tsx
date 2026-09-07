import type { BrandMomentumClientSafe } from "@/lib/data";

// ─── Brand Momentum — client-facing ──────────────────────────────────────────
// ACCESS RULES: composite only (direction/velocity/confidence). The AI's
// internal reasoning (ai_read) and the dimension-conflict flag never reach
// this component — see getBrandMomentumClientSafe in lib/data.ts.

const DIRECTION_STYLES: Record<string, string> = {
  Positive: "bg-green-50 text-green-800 border-green-200",
  Neutral: "bg-neutral-100 text-neutral-600 border-neutral-200",
  Negative: "bg-red-50 text-red-800 border-red-200",
};

const VELOCITY_COPY: Record<string, string> = {
  Accelerating: "improving week over week",
  Stable: "holding consistent",
  Decelerating: "slowing down",
};

export function BrandMomentumSection({ momentum }: { momentum: BrandMomentumClientSafe | null }) {
  if (!momentum) return null;

  const tone = DIRECTION_STYLES[momentum.bms_direction] ?? DIRECTION_STYLES.Neutral;
  const velocityLine = VELOCITY_COPY[momentum.bms_velocity] ?? momentum.bms_velocity;

  return (
    <section className="space-y-3">
      <h2 className="text-[10px] font-bold uppercase tracking-widest text-neutral-400">
        Brand momentum
      </h2>
      <div className={`rounded-2xl border p-4 ${tone}`}>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-lg font-bold">{momentum.bms_direction}</p>
            <p className="text-xs opacity-80 mt-0.5">Your brand is {velocityLine}</p>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold">{momentum.bms_confidence}/10</p>
            <p className="text-[10px] opacity-70">confidence</p>
          </div>
        </div>
        {momentum.period_label && (
          <p className="text-[10px] opacity-60 mt-2 pt-2 border-t border-current/10">
            {momentum.period_label}
          </p>
        )}
      </div>
    </section>
  );
}
