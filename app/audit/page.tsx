import { createQuickAudit } from "@/lib/actions";
import { Card, ErrorBanner, SectionTitle, buttonClass, inputClass, labelClass } from "@/app/_components/ui";

const ICS_DIMENSIONS = [
  {
    key: "ics_cultural_fit",
    label: "Cultural Fit",
    weight: 20,
    description: "Does this idea feel true to the culture the brand is speaking into? Is it credible here — not transplanted from another market or trend?",
  },
  {
    key: "ics_business_alignment",
    label: "Business Alignment",
    weight: 20,
    description: "Does this idea directly serve the commercial objective, or is it dressing up something unrelated? Creative work that doesn't move the business number is decoration.",
  },
  {
    key: "ics_audience_tension",
    label: "Audience Tension",
    weight: 20,
    description: "Does this idea tap into a real, present tension the target audience is already living? Not manufactured conflict — actual pressure that already exists.",
  },
  {
    key: "ics_executional_coherence",
    label: "Executional Coherence",
    weight: 15,
    description: "Can this idea hold across all required channels and touchpoints without breaking or becoming generic? Does the KOL execution feel like the same campaign as the radio spot?",
  },
  {
    key: "ics_measurability",
    label: "Measurability",
    weight: 15,
    description: "Can the idea's effect on audience behaviour be observed and recorded within the campaign window? If you can't measure it, you can't hold a gate on it.",
  },
  {
    key: "ics_scalability",
    label: "Scalability",
    weight: 10,
    description: "Can this idea grow in intensity, spend level, or market without losing its integrity? Does spending more sharpen it or dilute it?",
  },
];

function ScoreInput({ name, defaultValue = 3 }: { name: string; defaultValue?: number }) {
  return (
    <div className="flex items-center gap-2">
      <input
        type="range"
        name={name}
        min="1"
        max="5"
        step="1"
        defaultValue={defaultValue}
        className="flex-1 accent-neutral-900"
      />
      <select
        name={name}
        className="w-28 border border-neutral-200 rounded px-2 py-1 text-sm"
        defaultValue={defaultValue}
      >
        <option value="1">1 — Absent</option>
        <option value="2">2 — Weak</option>
        <option value="3">3 — Average</option>
        <option value="4">4 — Strong</option>
        <option value="5">5 — Exceptional</option>
      </select>
    </div>
  );
}

export default async function QuickAuditPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <div className="max-w-2xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">Quick Campaign Audit</h1>
        <p className="text-sm text-neutral-500 mt-1">
          Score any campaign in 2 minutes. No client onboarding required — the diagnostic generates immediately from your expert read.
        </p>
      </div>

      <ErrorBanner message={error} />

      <form action={createQuickAudit} className="space-y-5">

        {/* Brand & Campaign */}
        <Card>
          <SectionTitle>Brand & Campaign</SectionTitle>
          <div className="space-y-3">
            <div className="grid sm:grid-cols-2 gap-3">
              <div>
                <label className={labelClass} htmlFor="brand_name">Brand / Client Name</label>
                <input
                  className={inputClass}
                  id="brand_name"
                  name="brand_name"
                  placeholder="e.g. Yeos"
                  required
                />
              </div>
              <div>
                <label className={labelClass} htmlFor="campaign_name">Campaign Name</label>
                <input
                  className={inputClass}
                  id="campaign_name"
                  name="campaign_name"
                  placeholder="e.g. Caramel Ramadhan Push"
                  required
                />
              </div>
            </div>
            <div className="grid sm:grid-cols-2 gap-3">
              <div>
                <label className={labelClass} htmlFor="industry_profile">Industry</label>
                <select className={inputClass} id="industry_profile" name="industry_profile" defaultValue="Other">
                  <option value="QSR">QSR</option>
                  <option value="Retail">Retail</option>
                  <option value="B2B">B2B</option>
                  <option value="Other">Other / FMCG</option>
                </select>
              </div>
              <div>
                <label className={labelClass} htmlFor="current_phase">Campaign Phase</label>
                <select className={inputClass} id="current_phase" name="current_phase" defaultValue="Demand">
                  <option value="Demand">Demand</option>
                  <option value="Conversion">Conversion</option>
                  <option value="Retention">Retention</option>
                  <option value="Complete">Complete</option>
                </select>
              </div>
            </div>
            <div>
              <label className={labelClass} htmlFor="business_outcome_label">
                Business Outcome Being Tracked <span className="font-normal text-neutral-400">(optional)</span>
              </label>
              <input
                className={inputClass}
                id="business_outcome_label"
                name="business_outcome_label"
                placeholder="e.g. Sales Volume Lift, Market Share, Pipeline Revenue"
              />
            </div>
            <div>
              <label className={labelClass} htmlFor="context_notes">
                Campaign Context / Big Idea <span className="font-normal text-neutral-400">(optional — paste the campaign brief or tagline)</span>
              </label>
              <textarea
                className={inputClass}
                id="context_notes"
                name="context_notes"
                rows={3}
                placeholder="e.g. 'Yeos Caramel — the drink that marks the end of the fast. Paired with the first meal, not the last.' Paste any context that helps you score below."
              />
            </div>
          </div>
        </Card>

        {/* ICS Scoring */}
        <Card>
          <SectionTitle>Idea Certainty Score (ICS)</SectionTitle>
          <p className="text-xs text-neutral-400 mb-4">
            Score each dimension 1–5 based on what you observe about this campaign. Your expert read — not the client's view.
            The system computes the weighted total and threshold automatically.
          </p>

          <div className="space-y-5">
            {ICS_DIMENSIONS.map((dim) => (
              <div key={dim.key}>
                <div className="flex items-baseline justify-between mb-1">
                  <label className="text-sm font-semibold text-neutral-800">
                    {dim.label}
                    <span className="ml-1.5 text-xs font-normal text-neutral-400">({dim.weight}% weight)</span>
                  </label>
                </div>
                <p className="text-xs text-neutral-500 mb-2">{dim.description}</p>
                <ScoreInput name={dim.key} />
              </div>
            ))}
          </div>

          <div className="mt-4 pt-3 border-t border-neutral-100">
            <p className="text-xs text-neutral-400">
              <span className="font-medium text-neutral-600">Score thresholds:</span>{" "}
              ≥85 = Advance · 70–84 = Conditional · 55–69 = Rework · &lt;55 = Stop
            </p>
          </div>
        </Card>

        <button type="submit" className={`${buttonClass} w-full py-3 text-base`}>
          Generate Audit Report →
        </button>
        <p className="text-xs text-neutral-400 text-center">
          Creates a full campaign diagnostic instantly. You can add signal data and channel briefs after.
        </p>
      </form>
    </div>
  );
}
