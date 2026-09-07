import type { GuardrailClientSafe } from "@/lib/data";
import { Card } from "@/app/_components/ui";
import { SectionHeading } from "./reportUi";

// ─── Guardrails — client-facing ──────────────────────────────────────────────
// Plain-language only: the condition text and whether it held. The raw
// threshold math (threshold_value/comparator/metric_type) never reaches this
// component — see getGuardrailsClientSafe in lib/data.ts.

export function GuardrailsSection({ guardrails }: { guardrails: GuardrailClientSafe[] }) {
  if (guardrails.length === 0) return null;

  const triggered = guardrails.filter((g) => !g.held);

  return (
    <section className="space-y-3">
      <SectionHeading title="Guardrails reviewed" />
      <Card className="space-y-2">
        <p className="text-xs text-neutral-500">
          Every campaign runs with limits we watch automatically — if one is crossed, we act before
          it becomes a bigger problem.
        </p>
        <div className="space-y-1.5 pt-1">
          {guardrails.map((g) => (
            <div key={g.id} className="flex items-start gap-2 text-xs">
              <span className={g.held ? "text-emerald-500" : "text-red-500"}>
                {g.held ? "✓" : "⚠"}
              </span>
              <span className="text-neutral-700 flex-1">{g.condition}</span>
              <span className={`text-[10px] font-semibold ${g.held ? "text-emerald-600" : "text-red-600"}`}>
                {g.held ? "Holding" : "Triggered"}
              </span>
            </div>
          ))}
        </div>
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
