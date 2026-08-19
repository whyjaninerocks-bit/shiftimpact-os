"use client";

import { useState } from "react";
import { Card, Badge } from "@/app/_components/ui";
import { GrowthMomentEditor, momentCompleteness } from "./GrowthMomentEditor";
import { EvidenceConfidenceChip } from "./EvidenceConfidenceChip";
import { DecisionOutcomeBadge } from "./DecisionOutcomeBadge";
import type { GrowthSprint, BusinessContext } from "@/lib/growth-sprint/types";

const STEP_LABELS = [
  "Business snapshot",
  "Growth question",
  "Growth challenge",
  "Revenue pillars",
  "Growth Moments",
  "Evidence capture",
  "Diagnosis",
  "Recommendation",
];

async function patchSprint(id: string, body: Record<string, unknown>) {
  const res = await fetch(`/api/growth-sprints/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error("Save failed");
  return res.json();
}

export function GrowthSprintWorkspace({ initial }: { initial: GrowthSprint }) {
  const [sprint, setSprint] = useState<GrowthSprint>(initial);
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [priorityMomentId, setPriorityMomentId] = useState<string | null>(
    initial.diagnosis_reviewed?.recommended_priority_moment_id ?? null
  );
  const [overrideReason, setOverrideReason] = useState("");
  const [publishResult, setPublishResult] = useState<{ share_token: string; share_path: string } | null>(null);
  const [confirmIncomplete, setConfirmIncomplete] = useState(false);

  function update<K extends keyof GrowthSprint>(key: K, value: GrowthSprint[K]) {
    setSprint((s) => ({ ...s, [key]: value }));
  }

  async function saveAndAdvance(fields: Record<string, unknown>, nextStep: number) {
    setSaving(true);
    setError(null);
    try {
      const updated = await patchSprint(sprint.id, fields);
      setSprint((s) => ({ ...s, ...updated }));
      setStep(nextStep);
    } catch {
      setError("Could not save — check your connection and try again.");
    } finally {
      setSaving(false);
    }
  }

  async function runDiagnosis() {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/growth-sprints/${sprint.id}/diagnose`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Diagnosis failed");
      setSprint((s) => ({ ...s, ...data }));
      setPriorityMomentId(data.diagnosis_reviewed?.recommended_priority_moment_id ?? null);
      setStep(7);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Diagnosis failed");
    } finally {
      setSaving(false);
    }
  }

  async function runRecommendation() {
    if (!priorityMomentId) {
      setError("Choose which opportunity to act on first.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const isOverride = priorityMomentId !== sprint.diagnosis_reviewed?.recommended_priority_moment_id;
      const res = await fetch(`/api/growth-sprints/${sprint.id}/recommend`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          priority_moment_id: priorityMomentId,
          override_reason: isOverride ? overrideReason : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Recommendation failed");
      setSprint((s) => ({ ...s, ...data }));
      setStep(8);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Recommendation failed");
    } finally {
      setSaving(false);
    }
  }

  async function approve() {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/growth-sprints/${sprint.id}/approve`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Approve failed");
      setSprint((s) => ({ ...s, ...data }));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Approve failed");
    } finally {
      setSaving(false);
    }
  }

  async function publish() {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/growth-sprints/${sprint.id}/publish`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Publish failed");
      setSprint((s) => ({ ...s, status: data.status, published_at: data.published_at }));
      setPublishResult({ share_token: data.share_token, share_path: data.share_path });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Publish failed");
    } finally {
      setSaving(false);
    }
  }

  async function revoke() {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/growth-sprints/${sprint.id}/revoke`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Revoke failed");
      setSprint((s) => ({ ...s, status: data.status, revoked_at: data.revoked_at }));
      setPublishResult(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Revoke failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-neutral-900">{sprint.business_name}</h1>
          <p className="text-xs text-neutral-500 mt-0.5">Growth Sprint · Step {Math.min(step, 8)} of 8 — {STEP_LABELS[Math.min(step, 8) - 1]}</p>
        </div>
        <Badge tone="neutral">{sprint.status}</Badge>
      </div>

      {error && (
        <div className="rounded-md bg-red-50 border border-red-200 px-3 py-2 text-xs text-red-700">{error}</div>
      )}

      {/* Step 1 — Business snapshot */}
      {step === 1 && (
        <Card className="space-y-3">
          <p className="text-sm font-semibold text-neutral-900">Business snapshot</p>
          <input
            placeholder="Location"
            value={sprint.business_location ?? ""}
            onChange={(e) => update("business_location", e.target.value)}
            className="w-full text-sm border border-neutral-200 rounded-md px-3 py-2"
          />
          <div>
            <p className="text-xs text-neutral-500 mb-1">Business context (optional — helps illustrate examples, never determines the diagnosis)</p>
            <div className="flex gap-2 flex-wrap">
              {(["commerce", "experience", "service", "custom"] as BusinessContext[]).map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => update("business_context", sprint.business_context === c ? null : c)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium border capitalize ${
                    sprint.business_context === c
                      ? "bg-neutral-900 text-white border-neutral-900"
                      : "bg-white text-neutral-600 border-neutral-200 hover:border-neutral-400"
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>
          <input
            placeholder="Target customer"
            value={sprint.target_customer ?? ""}
            onChange={(e) => update("target_customer", e.target.value)}
            className="w-full text-sm border border-neutral-200 rounded-md px-3 py-2"
          />
          <button
            disabled={saving}
            onClick={() =>
              saveAndAdvance(
                { business_location: sprint.business_location, business_context: sprint.business_context, target_customer: sprint.target_customer },
                2
              )
            }
            className="rounded-lg bg-neutral-900 px-4 py-2 text-xs font-semibold text-white hover:bg-neutral-800 disabled:opacity-40"
          >
            Continue
          </button>
        </Card>
      )}

      {/* Step 2 — Growth question */}
      {step === 2 && (
        <Card className="space-y-3">
          <p className="text-sm font-semibold text-neutral-900">What growth decision are you trying to make clearer?</p>
          <textarea
            rows={3}
            placeholder="e.g. How do we increase repeat customers?"
            value={sprint.growth_question}
            onChange={(e) => update("growth_question", e.target.value)}
            className="w-full text-sm border border-neutral-200 rounded-md px-3 py-2"
          />
          <div className="flex gap-2">
            <button onClick={() => setStep(1)} className="text-xs text-neutral-500 hover:underline">Back</button>
            <button
              disabled={saving || !sprint.growth_question.trim()}
              onClick={() => saveAndAdvance({ growth_question: sprint.growth_question }, 3)}
              className="rounded-lg bg-neutral-900 px-4 py-2 text-xs font-semibold text-white hover:bg-neutral-800 disabled:opacity-40"
            >
              Continue
            </button>
          </div>
        </Card>
      )}

      {/* Step 3 — Growth challenge */}
      {step === 3 && (
        <Card className="space-y-3">
          <p className="text-sm font-semibold text-neutral-900">Current growth challenge</p>
          <input placeholder="Desired outcome" value={sprint.desired_outcome ?? ""} onChange={(e) => update("desired_outcome", e.target.value)} className="w-full text-sm border border-neutral-200 rounded-md px-3 py-2" />
          <input placeholder="Current obstacle" value={sprint.current_obstacle ?? ""} onChange={(e) => update("current_obstacle", e.target.value)} className="w-full text-sm border border-neutral-200 rounded-md px-3 py-2" />
          <input placeholder="Constraints (budget, time, team, policy — e.g. a no-discounting rule)" value={sprint.constraints_notes ?? ""} onChange={(e) => update("constraints_notes", e.target.value)} className="w-full text-sm border border-neutral-200 rounded-md px-3 py-2" />
          <div className="flex gap-2">
            <button onClick={() => setStep(2)} className="text-xs text-neutral-500 hover:underline">Back</button>
            <button
              disabled={saving}
              onClick={() => saveAndAdvance({ desired_outcome: sprint.desired_outcome, current_obstacle: sprint.current_obstacle, constraints_notes: sprint.constraints_notes }, 4)}
              className="rounded-lg bg-neutral-900 px-4 py-2 text-xs font-semibold text-white hover:bg-neutral-800 disabled:opacity-40"
            >
              Continue
            </button>
          </div>
        </Card>
      )}

      {/* Step 4 — Revenue pillars */}
      {step === 4 && (
        <Card className="space-y-3">
          <p className="text-sm font-semibold text-neutral-900">Revenue pillars</p>
          <p className="text-xs text-neutral-500">Operator-defined. Do not force categories — describe how this business actually makes money.</p>
          <textarea
            rows={3}
            placeholder={"One per line, e.g.\nPet food\nGrooming\nMembership"}
            value={sprint.revenue_pillars.join("\n")}
            onChange={(e) => update("revenue_pillars", e.target.value.split("\n"))}
            className="w-full text-sm border border-neutral-200 rounded-md px-3 py-2"
          />
          <div className="flex gap-2">
            <button onClick={() => setStep(3)} className="text-xs text-neutral-500 hover:underline">Back</button>
            <button
              disabled={saving}
              onClick={() => saveAndAdvance({ revenue_pillars: sprint.revenue_pillars.map((p) => p.trim()).filter(Boolean) }, 5)}
              className="rounded-lg bg-neutral-900 px-4 py-2 text-xs font-semibold text-white hover:bg-neutral-800 disabled:opacity-40"
            >
              Continue
            </button>
          </div>
        </Card>
      )}

      {/* Step 5 — Growth Moments */}
      {step === 5 && (
        <Card className="space-y-3">
          <p className="text-sm font-semibold text-neutral-900">Growth Moments</p>
          <p className="text-xs text-neutral-500">Recognisable customer situations where a need becomes active and creates a commercial opportunity.</p>
          <GrowthMomentEditor moments={sprint.growth_moments} onChange={(m) => update("growth_moments", m)} />
          <div className="flex gap-2 pt-2">
            <button onClick={() => setStep(4)} className="text-xs text-neutral-500 hover:underline">Back</button>
            <button
              disabled={saving || sprint.growth_moments.length === 0}
              onClick={() => saveAndAdvance({ growth_moments: sprint.growth_moments }, 6)}
              className="rounded-lg bg-neutral-900 px-4 py-2 text-xs font-semibold text-white hover:bg-neutral-800 disabled:opacity-40"
            >
              Continue
            </button>
          </div>
        </Card>
      )}

      {/* Step 6 — Evidence capture */}
      {step === 6 && (
        <Card className="space-y-4">
          <p className="text-sm font-semibold text-neutral-900">Evidence capture</p>
          <p className="text-xs text-neutral-500">Tag what you actually know for each moment. Qualitative only — no numeric scoring.</p>
          {sprint.growth_moments.map((m) => (
            <div key={m.id} className="border-t border-neutral-100 pt-3">
              <p className="text-sm text-neutral-800 mb-1.5">{m.customer} — {m.situation}</p>
              <EvidenceConfidenceChip
                value={sprint.evidence_tags[m.id]?.confidence}
                onChange={(confidence) =>
                  update("evidence_tags", { ...sprint.evidence_tags, [m.id]: { ...sprint.evidence_tags[m.id], confidence } })
                }
              />
              <input
                placeholder="One-line note (optional)"
                value={sprint.evidence_tags[m.id]?.note ?? ""}
                onChange={(e) =>
                  update("evidence_tags", {
                    ...sprint.evidence_tags,
                    [m.id]: { confidence: sprint.evidence_tags[m.id]?.confidence ?? "Missing", note: e.target.value },
                  })
                }
                className="mt-2 w-full text-xs border border-neutral-200 rounded-md px-3 py-1.5"
              />
            </div>
          ))}
          <div className="flex gap-2 pt-2">
            <button onClick={() => setStep(5)} className="text-xs text-neutral-500 hover:underline">Back</button>
            <button
              disabled={saving}
              onClick={() => saveAndAdvance({ evidence_tags: sprint.evidence_tags }, 7)}
              className="rounded-lg bg-neutral-900 px-4 py-2 text-xs font-semibold text-white hover:bg-neutral-800 disabled:opacity-40"
            >
              Continue
            </button>
          </div>
        </Card>
      )}

      {/* Step 7 — Diagnosis (AI Call 1) */}
      {step === 7 && (
        <Card className="space-y-4">
          <p className="text-sm font-semibold text-neutral-900">Diagnosis</p>
          {!sprint.diagnosis_reviewed ? (
            <>
              <p className="text-xs text-neutral-500">Runs Call 1 — business diagnosis, Growth Moments assessment, and opportunity ranking.</p>
              {(() => {
                const incomplete = sprint.growth_moments
                  .map((m) => ({ moment: m, ...momentCompleteness(m) }))
                  .filter((x) => x.missing.length > 0);
                if (incomplete.length === 0) return null;
                return (
                  <div className="rounded-md bg-amber-50 border border-amber-200 px-3 py-2.5 space-y-2">
                    <p className="text-xs font-semibold text-amber-800">
                      {incomplete.length} of {sprint.growth_moments.length} Growth Moments {incomplete.length === 1 ? "is" : "are"} missing fields
                    </p>
                    <ul className="text-xs text-amber-700 space-y-0.5 list-disc pl-4">
                      {incomplete.map((x) => (
                        <li key={x.moment.id}>
                          <span className="font-medium">{x.moment.customer || "Untitled moment"}</span> — missing {x.missing.join(", ")}
                        </li>
                      ))}
                    </ul>
                    <p className="text-xs text-amber-700">
                      The AI will treat blank fields as unknown, which weakens the diagnosis for those moments. Go back to Growth Moments to fill them in, or proceed anyway.
                    </p>
                    <label className="flex items-center gap-2 text-xs text-amber-800 pt-1">
                      <input
                        type="checkbox"
                        checked={confirmIncomplete}
                        onChange={(e) => setConfirmIncomplete(e.target.checked)}
                      />
                      Run anyway despite incomplete Growth Moments
                    </label>
                  </div>
                );
              })()}
              <div className="flex gap-2">
                <button onClick={() => setStep(6)} className="text-xs text-neutral-500 hover:underline">Back</button>
                <button
                  disabled={
                    saving ||
                    (sprint.growth_moments.some((m) => momentCompleteness(m).missing.length > 0) && !confirmIncomplete)
                  }
                  onClick={runDiagnosis}
                  className="rounded-lg bg-neutral-900 px-4 py-2 text-xs font-semibold text-white hover:bg-neutral-800 disabled:opacity-40"
                >
                  {saving ? "Diagnosing…" : "Run diagnosis"}
                </button>
              </div>
            </>
          ) : (
            <>
              <p className="text-sm text-neutral-700">{sprint.diagnosis_reviewed.business_situation}</p>
              {sprint.diagnosis_reviewed.growth_constraints.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wide mb-1">Constraints</p>
                  <ul className="text-xs text-neutral-600 list-disc pl-4 space-y-0.5">
                    {sprint.diagnosis_reviewed.growth_constraints.map((c, i) => <li key={i}>{c}</li>)}
                  </ul>
                </div>
              )}
              <div>
                <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wide mb-2">Ranked opportunities — choose which to act on</p>
                <div className="space-y-2">
                  {sprint.diagnosis_reviewed.opportunities.map((o) => {
                    const moment = sprint.growth_moments.find((m) => m.id === o.moment_id);
                    return (
                      <label
                        key={o.moment_id}
                        className={`block rounded-lg border p-3 cursor-pointer ${
                          priorityMomentId === o.moment_id ? "border-neutral-900 bg-neutral-50" : "border-neutral-200"
                        }`}
                      >
                        <div className="flex items-start gap-2">
                          <input
                            type="radio"
                            checked={priorityMomentId === o.moment_id}
                            onChange={() => setPriorityMomentId(o.moment_id)}
                            className="mt-1"
                          />
                          <div>
                            <p className="text-sm font-medium text-neutral-900">
                              #{o.rank} — {moment?.customer ?? o.moment_id} — {moment?.situation}
                            </p>
                            <p className="text-xs text-neutral-600 mt-0.5">{o.rationale}</p>
                            {o.missing_evidence.length > 0 && (
                              <p className="text-xs text-amber-700 mt-0.5">Missing: {o.missing_evidence.join("; ")}</p>
                            )}
                          </div>
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>
              {priorityMomentId && priorityMomentId !== sprint.diagnosis_reviewed.recommended_priority_moment_id && (
                <div>
                  <p className="text-xs text-amber-700 mb-1">This differs from the model's top pick — why?</p>
                  <input
                    value={overrideReason}
                    onChange={(e) => setOverrideReason(e.target.value)}
                    placeholder="Reason for overriding the recommended priority"
                    className="w-full text-xs border border-neutral-200 rounded-md px-3 py-1.5"
                  />
                </div>
              )}
              <div className="flex gap-2">
                <button onClick={() => setStep(6)} className="text-xs text-neutral-500 hover:underline">Back</button>
                <button
                  disabled={saving || !priorityMomentId}
                  onClick={runRecommendation}
                  className="rounded-lg bg-neutral-900 px-4 py-2 text-xs font-semibold text-white hover:bg-neutral-800 disabled:opacity-40"
                >
                  {saving ? "Working…" : "Continue to recommendation"}
                </button>
              </div>
            </>
          )}
        </Card>
      )}

      {/* Step 8 — Recommendation (AI Call 2) + Approve + Publish */}
      {step === 8 && sprint.recommendation_reviewed && (
        <Card className="space-y-4">
          <p className="text-sm font-semibold text-neutral-900">Recommendation</p>
          <DecisionOutcomeBadge outcome={sprint.decision_outcome} />

          <div className="space-y-4 text-sm text-neutral-700">
            {sprint.recommendation_reviewed.growth_hypothesis && (
              <div>
                <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wide mb-1">1. Growth hypothesis</p>
                <p className="text-sm text-neutral-700">{sprint.recommendation_reviewed.growth_hypothesis}</p>
              </div>
            )}

            <div>
              <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wide mb-1">2. 30-day test</p>
              <div className="space-y-1.5">
                <p><span className="font-semibold text-neutral-900">Test:</span> {sprint.recommendation_reviewed.thirty_day_test}</p>
                <p><span className="font-semibold text-neutral-900">Audience:</span> {sprint.recommendation_reviewed.target_audience}</p>
                <p><span className="font-semibold text-neutral-900">Offer/intervention:</span> {sprint.recommendation_reviewed.offer_intervention}</p>
                <p><span className="font-semibold text-neutral-900">Conversion path:</span> {sprint.recommendation_reviewed.conversion_path}</p>
                <div>
                  <p className="font-semibold text-neutral-900">Evidence signals to watch:</p>
                  <ul className="list-disc pl-4 text-xs text-neutral-600 space-y-0.5 mt-1">
                    {sprint.recommendation_reviewed.evidence_signals.map((s, i) => <li key={i}>{s}</li>)}
                  </ul>
                </div>
              </div>
            </div>

            <div>
              <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wide mb-1">3. Decision rule</p>
              {sprint.recommendation_reviewed.decision_rule && (
                <p className="text-sm text-neutral-700 mb-1.5">{sprint.recommendation_reviewed.decision_rule}</p>
              )}
              <p className="text-xs text-neutral-500 italic">
                Current state ({sprint.decision_outcome ?? "—"}): {sprint.recommendation_reviewed.decision_rationale}
              </p>
            </div>
          </div>

          {sprint.status === "recommended" && (
            <button disabled={saving} onClick={approve} className="rounded-lg bg-neutral-900 px-4 py-2 text-xs font-semibold text-white hover:bg-neutral-800 disabled:opacity-40">
              {saving ? "Approving…" : "Approve"}
            </button>
          )}

          {sprint.status === "approved" && (
            <button disabled={saving} onClick={publish} className="rounded-lg bg-emerald-700 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-800 disabled:opacity-40">
              {saving ? "Publishing…" : "Publish to client"}
            </button>
          )}

          {publishResult && (
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 space-y-1">
              <p className="text-xs font-semibold text-emerald-800">Published — copy this link now, it will not be shown again</p>
              <p className="text-xs font-mono text-emerald-900 break-all">{publishResult.share_path}</p>
            </div>
          )}

          {(sprint.status === "published" || sprint.status === "revoked") && (
            <div className="flex items-center gap-3">
              <Badge tone={sprint.status === "published" ? "green" : "neutral"}>{sprint.status}</Badge>
              {sprint.status === "published" && (
                <button disabled={saving} onClick={revoke} className="text-xs text-red-600 hover:underline">
                  Revoke share link
                </button>
              )}
            </div>
          )}
        </Card>
      )}
    </div>
  );
}
