"use client";

// app/(os)/growth-sprint/demo/[slug]/_components/DemoWalkthrough.tsx
// Growth Sprint Pilot Demo Mode — guided live-client walkthrough.
// INTERNAL ONLY. Facilitator (Janine) runs this on her own screen with a
// business owner. Nothing here is persisted — it's a presentation surface
// over pre-authored, methodology-consistent scenario content, not a new
// intelligence layer or a live AI call.

import { useState } from "react";
import Link from "next/link";
import { Card, Badge } from "@/app/_components/ui";
import type { DemoScenario } from "@/lib/growth-sprint/demo-scenarios";
import type { EvidenceConfidence } from "@/lib/growth-sprint/types";

const STEPS = [
  "Opening",
  "Business Context",
  "Growth Question",
  "Growth Moment Discovery",
  "Evidence Confidence",
  "AI Diagnosis Reveal",
  "Recommendation",
  "Decision Rules",
  "Client Reflection",
  "Growth Decision Pack",
] as const;

const EVIDENCE_LABEL: Record<EvidenceConfidence, string> = {
  Confirmed: "We know this happened",
  Observed: "Someone has seen this pattern",
  Directional: "Early indication",
  Inferred: "Logical assumption",
  Missing: "Need validation",
};

const EVIDENCE_TONE: Record<EvidenceConfidence, string> = {
  Confirmed: "bg-emerald-100 text-emerald-800 border-emerald-200",
  Observed: "bg-blue-100 text-blue-800 border-blue-200",
  Directional: "bg-amber-100 text-amber-800 border-amber-200",
  Inferred: "bg-purple-100 text-purple-800 border-purple-200",
  Missing: "bg-neutral-100 text-neutral-500 border-neutral-200",
};

const DECISION_TONE: Record<string, string> = {
  Scale: "bg-emerald-50 border-emerald-200 text-emerald-800",
  Shift: "bg-blue-50 border-blue-200 text-blue-800",
  Retest: "bg-purple-50 border-purple-200 text-purple-800",
  Stop: "bg-red-50 border-red-200 text-red-800",
};

function FacilitatorPanel({ text }: { text: string }) {
  const [open, setOpen] = useState(true);
  return (
    <div className="rounded-lg border border-dashed border-indigo-200 bg-indigo-50/50">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-3 py-2 text-left"
      >
        <span className="text-[11px] font-semibold text-indigo-700 uppercase tracking-wide">Facilitator — say this</span>
        <span className="text-[11px] text-indigo-400">{open ? "Hide" : "Show"}</span>
      </button>
      {open && <p className="px-3 pb-3 text-xs text-indigo-900 leading-relaxed">{text}</p>}
    </div>
  );
}

export function DemoWalkthrough({ scenario: s }: { scenario: DemoScenario }) {
  const [step, setStep] = useState(0);
  const [beforeAnswer, setBeforeAnswer] = useState("");
  const [afterAnswer, setAfterAnswer] = useState("");
  const [changedPriority, setChangedPriority] = useState<boolean | null>(null);
  const [missedOpportunity, setMissedOpportunity] = useState<boolean | null>(null);
  const [wouldRunTest, setWouldRunTest] = useState<boolean | null>(null);
  const [copied, setCopied] = useState(false);

  const next = () => setStep((v) => Math.min(v, STEPS.length - 1) + 1 <= STEPS.length - 1 ? v + 1 : v);
  const back = () => setStep((v) => Math.max(0, v - 1));

  function restart() {
    setStep(0);
    setBeforeAnswer("");
    setAfterAnswer("");
    setChangedPriority(null);
    setMissedOpportunity(null);
    setWouldRunTest(null);
    setCopied(false);
  }

  function YesNo({ value, onChange }: { value: boolean | null; onChange: (v: boolean) => void }) {
    return (
      <div className="flex gap-2">
        {[
          { label: "Yes", v: true },
          { label: "No", v: false },
        ].map((opt) => (
          <button
            key={opt.label}
            type="button"
            onClick={() => onChange(opt.v)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium border ${
              value === opt.v ? "bg-neutral-900 text-white border-neutral-900" : "bg-white text-neutral-600 border-neutral-200 hover:border-neutral-400"
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>
    );
  }

  function copySummary() {
    const lines = [
      `Growth Sprint demo — ${s.businessName} (${s.archetype})`,
      `Before: ${beforeAnswer || "—"}`,
      `After: ${afterAnswer || "—"}`,
      `Changed priority: ${changedPriority === null ? "—" : changedPriority ? "Yes" : "No"}`,
      `Revealed a missed opportunity: ${missedOpportunity === null ? "—" : missedOpportunity ? "Yes" : "No"}`,
      `Would run the 30-day test: ${wouldRunTest === null ? "—" : wouldRunTest ? "Yes" : "No"}`,
    ];
    navigator.clipboard.writeText(lines.join("\n")).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-5 print:max-w-none">
      <div className="flex items-center justify-between print:hidden">
        <div>
          <Link href="/growth-sprint/demo" className="text-xs text-neutral-400 hover:text-neutral-600">← All scenarios</Link>
          <h1 className="text-lg font-bold text-neutral-900 mt-1">{s.businessName}</h1>
          <p className="text-xs text-neutral-500">{s.archetype} · Step {step + 1} of {STEPS.length} — {STEPS[step]}</p>
        </div>
        <div className="flex items-center gap-3">
          {step > 0 && (
            <button onClick={restart} className="text-xs text-neutral-400 hover:text-red-600 hover:underline">
              Start over
            </button>
          )}
          <Badge tone="neutral">Demo mode</Badge>
        </div>
      </div>

      {/* ── 0. Opening ── */}
      {step === 0 && (
        <Card className="space-y-4">
          <p className="text-lg font-medium text-neutral-900 leading-snug">
            &ldquo;Most businesses do not lack ideas. They lack clarity on which opportunity deserves investment first.&rdquo;
          </p>
          <p className="text-sm text-neutral-600 leading-relaxed">
            Growth Sprint helps identify: where the opportunity exists, why it matters, what should be tested first,
            and what evidence determines the next decision.
          </p>
          <FacilitatorPanel text={s.facilitator.opening} />
          <button onClick={next} className="rounded-lg bg-neutral-900 px-4 py-2 text-xs font-semibold text-white hover:bg-neutral-800">
            Begin →
          </button>
        </Card>
      )}

      {/* ── 1. Business Context ── */}
      {step === 1 && (
        <Card className="space-y-3">
          <p className="text-sm font-semibold text-neutral-900">Business context</p>
          <dl className="text-sm text-neutral-700 space-y-1.5">
            <div><dt className="inline font-medium text-neutral-500">Business name — </dt><dd className="inline">{s.businessName}</dd></div>
            <div><dt className="inline font-medium text-neutral-500">Industry / category — </dt><dd className="inline">{s.industry}</dd></div>
            <div><dt className="inline font-medium text-neutral-500">Customer type — </dt><dd className="inline">{s.customerType}</dd></div>
            <div><dt className="inline font-medium text-neutral-500">Business challenge — </dt><dd className="inline">{s.challenge}</dd></div>
            <div><dt className="inline font-medium text-neutral-500">Revenue objective — </dt><dd className="inline">{s.revenueObjective}</dd></div>
          </dl>
          <div className="rounded-md bg-neutral-50 border border-neutral-200 px-3 py-2.5">
            <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wide mb-1">Diagnosed as</p>
            <p className="text-sm font-medium text-neutral-900 capitalize">{s.businessContextDiagnosis}</p>
            <p className="text-xs text-neutral-500 mt-1">{s.businessContextNote}</p>
            <p className="text-[11px] text-neutral-400 mt-1.5 italic">Never forced — this is diagnosed from what&apos;s actually described, not selected from a template.</p>
          </div>
          <FacilitatorPanel text={s.facilitator.businessContext} />
          <div className="flex gap-2">
            <button onClick={back} className="text-xs text-neutral-500 hover:underline">Back</button>
            <button onClick={next} className="rounded-lg bg-neutral-900 px-4 py-2 text-xs font-semibold text-white hover:bg-neutral-800">Continue</button>
          </div>
        </Card>
      )}

      {/* ── 2. Growth Question ── */}
      {step === 2 && (
        <Card className="space-y-3">
          <p className="text-sm font-semibold text-neutral-900">What growth decision are you currently uncertain about?</p>
          <ul className="text-xs text-neutral-500 space-y-1 list-disc pl-4">
            <li>&ldquo;We are investing in marketing but unsure what is actually moving customers.&rdquo;</li>
            <li>&ldquo;We have enquiries but conversion is weak.&rdquo;</li>
            <li>&ldquo;We want growth but don&apos;t know which customer opportunity to prioritise.&rdquo;</li>
          </ul>
          <div className="rounded-md bg-neutral-50 border border-neutral-200 px-3 py-2.5">
            <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wide mb-1">This business said</p>
            <p className="text-sm text-neutral-800 italic">&ldquo;{s.growthQuestion}&rdquo;</p>
          </div>
          <FacilitatorPanel text={s.facilitator.growthQuestion} />
          <div className="flex gap-2">
            <button onClick={back} className="text-xs text-neutral-500 hover:underline">Back</button>
            <button onClick={next} className="rounded-lg bg-neutral-900 px-4 py-2 text-xs font-semibold text-white hover:bg-neutral-800">Continue</button>
          </div>
        </Card>
      )}

      {/* ── 3. Growth Moment Discovery ── */}
      {step === 3 && (
        <Card className="space-y-4">
          <p className="text-sm font-semibold text-neutral-900">Growth Moment discovery</p>
          <p className="text-xs text-neutral-500">A recognisable customer situation where a need becomes active and creates a commercial opportunity.</p>
          {s.growthMoments.map((m, i) => (
            <div key={i} className="rounded-lg border border-neutral-100 p-3.5 space-y-1.5">
              <p className="text-xs font-semibold text-neutral-400 uppercase tracking-wide">Moment {i + 1}</p>
              <p className="text-xs"><span className="font-medium text-neutral-500">Customer — </span>{m.customer}</p>
              <p className="text-xs"><span className="font-medium text-neutral-500">Situation — </span>{m.situation}</p>
              <p className="text-xs"><span className="font-medium text-neutral-500">Trigger — </span>{m.trigger}</p>
              <p className="text-xs"><span className="font-medium text-neutral-500">Need — </span>{m.need}</p>
              <p className="text-xs"><span className="font-medium text-neutral-500">Behaviour — </span>{m.behaviour}</p>
              <p className="text-xs"><span className="font-medium text-neutral-500">Commercial opportunity — </span>{m.commercial_response}</p>
            </div>
          ))}
          <FacilitatorPanel text={s.facilitator.growthMomentDiscovery} />
          <div className="flex gap-2">
            <button onClick={back} className="text-xs text-neutral-500 hover:underline">Back</button>
            <button onClick={next} className="rounded-lg bg-neutral-900 px-4 py-2 text-xs font-semibold text-white hover:bg-neutral-800">Continue</button>
          </div>
        </Card>
      )}

      {/* ── 4. Evidence Confidence ── */}
      {step === 4 && (
        <Card className="space-y-4">
          <p className="text-sm font-semibold text-neutral-900">Evidence confidence</p>
          <p className="text-xs text-neutral-600 italic">&ldquo;We separate what we know from what we believe.&rdquo;</p>
          <div className="grid grid-cols-1 gap-1.5">
            {(Object.keys(EVIDENCE_LABEL) as EvidenceConfidence[]).map((k) => (
              <div key={k} className={`flex items-center gap-2 rounded-md border px-2.5 py-1.5 ${EVIDENCE_TONE[k]}`}>
                <span className="text-xs font-semibold">{k}</span>
                <span className="text-xs">= {EVIDENCE_LABEL[k]}</span>
              </div>
            ))}
          </div>
          <div className="space-y-2 pt-1">
            {s.growthMoments.map((m, i) => (
              <div key={i} className="flex items-start gap-2 border-t border-neutral-100 pt-2">
                <span className={`shrink-0 px-2 py-0.5 rounded-full text-[11px] font-medium border ${EVIDENCE_TONE[m.confidence]}`}>{m.confidence}</span>
                <div>
                  <p className="text-xs text-neutral-700">{m.customer}</p>
                  <p className="text-[11px] text-neutral-400">{m.evidenceNote}</p>
                </div>
              </div>
            ))}
          </div>
          <FacilitatorPanel text={s.facilitator.evidenceConfidence} />
          <div className="flex gap-2">
            <button onClick={back} className="text-xs text-neutral-500 hover:underline">Back</button>
            <button onClick={next} className="rounded-lg bg-neutral-900 px-4 py-2 text-xs font-semibold text-white hover:bg-neutral-800">Continue</button>
          </div>
        </Card>
      )}

      {/* ── 5. AI Diagnosis Reveal ── */}
      {step === 5 && (
        <Card className="space-y-4">
          <p className="text-sm font-semibold text-neutral-900">Diagnosis</p>
          <p className="text-sm text-neutral-800 leading-relaxed">
            &ldquo;Based on the evidence captured, the strongest growth opportunity appears to be
            {" "}<span className="font-semibold">{s.growthMoments[s.priorityMomentIndex].situation}</span>.&rdquo;
          </p>
          <div>
            <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wide mb-1">Why this matters</p>
            <p className="text-sm text-neutral-700">{s.businessSituation}</p>
          </div>
          {s.opportunities.map((o) => (
            <div key={o.rank} className={`rounded-lg border p-3 ${o.momentIndex === s.priorityMomentIndex ? "border-neutral-900 bg-neutral-50" : "border-neutral-200"}`}>
              <p className="text-xs font-semibold text-neutral-900">#{o.rank} — {s.growthMoments[o.momentIndex].customer}</p>
              <p className="text-xs text-neutral-600 mt-1">{o.rationale}</p>
              <div className="mt-2 grid grid-cols-1 gap-1">
                <p className="text-[11px] text-emerald-700"><span className="font-semibold">Supporting evidence — </span>{o.supporting_evidence.join("; ")}</p>
                <p className="text-[11px] text-amber-700"><span className="font-semibold">Unknown / evidence gaps — </span>{o.missing_evidence.join("; ")}</p>
              </div>
            </div>
          ))}
          <FacilitatorPanel text={s.facilitator.diagnosisReveal} />
          <div className="flex gap-2">
            <button onClick={back} className="text-xs text-neutral-500 hover:underline">Back</button>
            <button onClick={next} className="rounded-lg bg-neutral-900 px-4 py-2 text-xs font-semibold text-white hover:bg-neutral-800">Continue</button>
          </div>
        </Card>
      )}

      {/* ── 6. Recommendation ── */}
      {step === 6 && (
        <Card className="space-y-4">
          <p className="text-sm font-semibold text-neutral-900">Recommendation</p>
          <div>
            <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wide mb-1">Growth hypothesis</p>
            <p className="text-sm text-neutral-700">{s.growthHypothesis}</p>
          </div>
          <div className="space-y-1.5">
            <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wide">30-day test</p>
            <p className="text-sm"><span className="font-semibold text-neutral-900">Test — </span>{s.thirtyDayTest}</p>
            <p className="text-sm"><span className="font-semibold text-neutral-900">Target customer — </span>{s.targetAudience}</p>
            <p className="text-sm"><span className="font-semibold text-neutral-900">Intervention — </span>{s.offerIntervention}</p>
            <p className="text-sm"><span className="font-semibold text-neutral-900">Conversion path — </span>{s.conversionPath}</p>
          </div>
          <div>
            <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wide mb-1">Evidence signals</p>
            <ul className="text-xs text-neutral-600 list-disc pl-4 space-y-0.5">
              {s.evidenceSignals.map((sig, i) => <li key={i}>{sig}</li>)}
            </ul>
          </div>
          <FacilitatorPanel text={s.facilitator.recommendation} />
          <div className="flex gap-2">
            <button onClick={back} className="text-xs text-neutral-500 hover:underline">Back</button>
            <button onClick={next} className="rounded-lg bg-neutral-900 px-4 py-2 text-xs font-semibold text-white hover:bg-neutral-800">Continue</button>
          </div>
        </Card>
      )}

      {/* ── 7. Decision Rules (hero) ── */}
      {step === 7 && (
        <Card className="space-y-4">
          <p className="text-xs font-semibold text-indigo-600 uppercase tracking-widest">The hero moment</p>
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
            <p className="text-xs font-semibold text-amber-700 uppercase tracking-wide mb-1">Current state</p>
            <p className="text-2xl font-bold text-amber-900">{s.decisionOutcome}</p>
            <p className="text-sm text-amber-800 mt-2">Because: &ldquo;{s.decisionRationale}&rdquo;</p>
          </div>
          <div>
            <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wide mb-1">Gate condition</p>
            <p className="text-sm text-neutral-700">{s.decisionRule}</p>
          </div>
          <div className="space-y-2">
            {s.decisionBranches.map((b) => (
              <div key={b.label} className={`rounded-md border p-3 ${DECISION_TONE[b.label]}`}>
                <p className="text-xs font-bold uppercase tracking-wide">{b.label}</p>
                <p className="text-sm mt-0.5">{b.condition}</p>
              </div>
            ))}
          </div>
          <FacilitatorPanel text={s.facilitator.decisionRules} />
          <div className="flex gap-2">
            <button onClick={back} className="text-xs text-neutral-500 hover:underline">Back</button>
            <button onClick={next} className="rounded-lg bg-neutral-900 px-4 py-2 text-xs font-semibold text-white hover:bg-neutral-800">Continue</button>
          </div>
        </Card>
      )}

      {/* ── 8. Client Reflection ── */}
      {step === 8 && (
        <Card className="space-y-4">
          <p className="text-sm font-semibold text-neutral-900">Client reflection</p>
          <div>
            <p className="text-xs font-medium text-neutral-500 mb-1">Before this session: &ldquo;What decision were you considering?&rdquo;</p>
            <textarea
              rows={2}
              value={beforeAnswer}
              onChange={(e) => setBeforeAnswer(e.target.value)}
              placeholder="Capture what they say, in their words"
              className="w-full text-sm border border-neutral-200 rounded-md px-3 py-2"
            />
          </div>
          <div>
            <p className="text-xs font-medium text-neutral-500 mb-1">After this session: &ldquo;What would you do differently?&rdquo;</p>
            <textarea
              rows={2}
              value={afterAnswer}
              onChange={(e) => setAfterAnswer(e.target.value)}
              placeholder="Capture what they say, in their words"
              className="w-full text-sm border border-neutral-200 rounded-md px-3 py-2"
            />
          </div>
          <div className="space-y-2.5 pt-1">
            <div className="flex items-center justify-between">
              <p className="text-xs text-neutral-700">Did this change your priority?</p>
              <YesNo value={changedPriority} onChange={setChangedPriority} />
            </div>
            <div className="flex items-center justify-between">
              <p className="text-xs text-neutral-700">Did this reveal a missed opportunity?</p>
              <YesNo value={missedOpportunity} onChange={setMissedOpportunity} />
            </div>
            <div className="flex items-center justify-between">
              <p className="text-xs text-neutral-700">Would you run this test?</p>
              <YesNo value={wouldRunTest} onChange={setWouldRunTest} />
            </div>
          </div>
          <FacilitatorPanel text={s.facilitator.reflection} />
          <div className="flex gap-2 items-center">
            <button onClick={back} className="text-xs text-neutral-500 hover:underline">Back</button>
            <button onClick={next} className="rounded-lg bg-neutral-900 px-4 py-2 text-xs font-semibold text-white hover:bg-neutral-800">
              View Growth Decision Pack →
            </button>
            <button onClick={copySummary} className="text-xs text-neutral-500 hover:underline ml-auto">
              {copied ? "Copied ✓" : "Copy reflection notes"}
            </button>
          </div>
          <p className="text-[11px] text-neutral-400">Not saved anywhere — copy the notes above if you want a record.</p>
        </Card>
      )}

      {/* ── 9. Growth Decision Pack ── */}
      {step === 9 && (
        <div className="space-y-5">
          <div className="print:hidden flex items-center justify-between">
            <button onClick={back} className="text-xs text-neutral-500 hover:underline">← Back</button>
            <div className="flex items-center gap-2">
              <button onClick={() => window.print()} className="rounded-lg border border-neutral-300 px-3 py-1.5 text-xs font-semibold text-neutral-700 hover:bg-neutral-50">
                Print / Save as PDF
              </button>
              <button onClick={restart} className="rounded-lg bg-neutral-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-neutral-800">
                Run again with next client
              </button>
            </div>
          </div>
          <Card className="space-y-5">
            <div>
              <p className="text-xs font-semibold text-neutral-400 uppercase tracking-widest">Growth Decision Pack</p>
              <h2 className="text-lg font-bold text-neutral-900 mt-1">{s.businessName}</h2>
            </div>

            <div>
              <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wide mb-1">Opportunity</p>
              <p className="text-sm text-neutral-700">{s.businessSituation}</p>
            </div>

            <div>
              <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wide mb-1">Growth moment</p>
              <p className="text-sm text-neutral-700">
                {s.growthMoments[s.priorityMomentIndex].customer} — {s.growthMoments[s.priorityMomentIndex].situation}.{" "}
                {s.growthMoments[s.priorityMomentIndex].trigger}
              </p>
            </div>

            <div>
              <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wide mb-1">Evidence</p>
              <p className="text-sm text-neutral-700">
                <span className={`inline-block px-2 py-0.5 rounded-full text-[11px] font-medium border mr-2 ${EVIDENCE_TONE[s.growthMoments[s.priorityMomentIndex].confidence]}`}>
                  {s.growthMoments[s.priorityMomentIndex].confidence}
                </span>
                {s.growthMoments[s.priorityMomentIndex].evidenceNote}
              </p>
            </div>

            <div>
              <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wide mb-1">Hypothesis</p>
              <p className="text-sm text-neutral-700">{s.growthHypothesis}</p>
            </div>

            <div>
              <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wide mb-1">30-day test</p>
              <p className="text-sm text-neutral-700">{s.thirtyDayTest}</p>
            </div>

            <div>
              <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wide mb-1">Decision rules</p>
              <p className="text-sm text-neutral-700 mb-2">Current state: <span className="font-semibold">{s.decisionOutcome}</span> — {s.decisionRationale}</p>
              <div className="space-y-1.5">
                {s.decisionBranches.map((b) => (
                  <p key={b.label} className="text-xs text-neutral-600"><span className="font-semibold text-neutral-900">{b.label} — </span>{b.condition}</p>
                ))}
              </div>
            </div>

            <p className="text-[11px] text-neutral-400 text-center pt-2 border-t border-neutral-100">
              ShiftImpact OS · Growth Sprint Experience — pilot demo
            </p>
          </Card>
        </div>
      )}
    </div>
  );
}
