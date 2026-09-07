import type { CategoryBenchmarkClientSafe } from "@/lib/data";
import { SectionHeading } from "./reportUi";
import { Collapse } from "@/app/portal/_components/Collapse";

// ─── Category Benchmark Reference — client-facing, read-only ────────────────
// Externally sourced industry norms (Nielsen, Kantar, CRM/POS data) for the
// campaign's category, grouped by gate. Deliberately framed as reference
// context, not a direct comparison line-by-line against this campaign's own
// gate thresholds — the two data sets use different signal definitions, and
// implying an exact match would overstate what's real. See getCategoryBenchmarksClientSafe.

const GATE_ORDER = ["Demand", "Conversion", "Retention", "Scale"];

export function CategoryBenchmarkSection({
  data,
}: {
  data: { category: string; benchmarks: CategoryBenchmarkClientSafe } | null;
}) {
  if (!data) return null;

  const grouped = GATE_ORDER.map((gate) => ({
    gate,
    rows: data.benchmarks.filter((b) => b.gateType === gate),
  })).filter((g) => g.rows.length > 0);

  if (grouped.length === 0) return null;

  return (
    <section id="benchmarks" className="space-y-3 scroll-mt-20">
      <SectionHeading
        title="How this compares to the category"
        subtitle={`Published ${data.category} industry norms — for context on how your targets stack up`}
      />
      <div className="rounded-2xl border border-neutral-200 bg-white p-4 space-y-3">
        <p className="text-xs text-neutral-500 leading-relaxed">
          These are external, publicly sourced benchmarks for {data.category} campaigns generally —
          not a direct line-by-line match to your own gate thresholds above, since every campaign
          defines its signals slightly differently. Use them as a sense check.
        </p>
        <Collapse label={`Show ${data.category} benchmarks`} variant="inline">
          <div className="space-y-4 pt-1">
            {grouped.map(({ gate, rows }) => (
              <div key={gate}>
                <p className="text-[10px] font-semibold uppercase tracking-widest text-neutral-400 mb-1.5">
                  {gate}
                </p>
                <div className="space-y-1.5">
                  {rows.map((row, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between gap-3 rounded-lg bg-neutral-50 border border-neutral-100 px-3 py-2"
                    >
                      <div className="min-w-0">
                        <p className="text-xs text-neutral-700">{row.signalName}</p>
                        <p className="text-[10px] text-neutral-400 mt-0.5">{row.source}</p>
                      </div>
                      <span className="shrink-0 text-xs font-semibold text-neutral-800">
                        {row.benchmarkMin}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </Collapse>
      </div>
    </section>
  );
}
