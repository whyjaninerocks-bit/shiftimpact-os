import type { GuardrailClientSafe } from "@/lib/data";
import { Card } from "@/app/_components/ui";
import { SectionHeading } from "./reportUi";
import { Collapse } from "@/app/portal/_components/Collapse";

// ─── Guardrails — client-facing ──────────────────────────────────────────────
// Plain-language only: the condition text and whether it held. The raw
// threshold math (threshold_value/comparator/metric_type) never reaches this
// component — see getGuardrailsClientSafe in lib/data.ts.

export function GuardrailsSection({ guardrails }: { guardrails: GuardrailClientSafe[] }) {
  if (guardrails.length === 0) return null;

  const triggered = guardrails.filter((g) => !g.held);
  const allHolding = triggered.length === 0;

  return (
    <section className="space-y-3">
      <SectionHeading title="Guardrails reviewed" />
      <Card className="space-y-2">
        <div className="flex items-center justify-between gap-3">
          <p className="text-xs text-neutral-500">
            Limits we watch automatically — if one is crossed, we act before it grows.
          </p>
          <span className={`shrink-0 text-[10px] font-semibold px-2 py-0.5 rounded-full ${
            allHolding ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"
          }`}>
            {guardrails.length - triggered.length}/{guardrails.length} holding
          </span>
        </div>
        {/* List — collapsed by default when everything's holding (nothing to
             act on), auto-expanded when something's triggered so it can't be
             missed behind a click. */}
        <Collapse label="Show guardrails" variant="inline" defaultOpen={!allHolding}>
          <div className="space-y-1.5 pt-1">
            {guardrails.map((g) => (
              <div key={g.id} className="flex items-center gap-2.5 text-xs">
                <span
                  className={`shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                    g.held ? "bg-emerald-500 text-white" : "bg-red-500 text-white"
                  }`}
                >
                  {g.held ? "✓" : "!"}
                </span>
                <span className="text-neutral-700 flex-1">{g.condition}</span>
                <span className={`text-[10px] font-semibold ${g.held ? "text-emerald-600" : "text-red-600"}`}>
                  {g.held ? "Holding" : "Triggered"}
                </span>
              </div>
            ))}
          </div>
        </Collapse>
        {triggered.length > 0 && (
          <p className="text-[10px] text-red-500 pt-2 border-t border-neutral-100">
            {triggered.length} guardrail{triggered.length !== 1 ? "s" : ""} triggered this campaign —
            your strategist has already reviewed and acted on this.
          </p>
        )}
      </Card>
    </section>
  );
}
