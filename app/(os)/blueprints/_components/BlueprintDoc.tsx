// app/(os)/blueprints/_components/BlueprintDoc.tsx
// One renderer, three views over the same persisted data:
//   internal  — everything incl. draft metadata, lint notes, evidence table
//   executor  — the JOB the execution owner must perform (allowlisted fields only)
//   receipt   — the Decision Evidence Receipt: why we decided, what happened, what's next
//
// Server component. No client state. The receipt reconciliation is computed at
// render from stored thresholds + readings (lib/growth-decision/reconcile.ts).

import { reconcile } from "@/lib/growth-decision/reconcile";
import type { BlueprintRow, Inputs, Measure } from "@/lib/growth-decision/schema";
import { InputsV } from "@/lib/growth-decision/schema";
import { TERRITORY_TEMPLATES, type Territory } from "@/lib/growth-decision/taxonomy";

export type Variant = "internal" | "executor" | "receipt";

const human = (s: string) => s.replace(/_/g, " ");

function Basis({ basis }: { basis: "evidenced" | "hypothesis" }) {
  return basis === "evidenced" ? (
    <span className="inline-block rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide bg-emerald-100 text-emerald-800">
      evidenced
    </span>
  ) : (
    <span className="inline-block rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide bg-amber-100 text-amber-800">
      hypothesis
    </span>
  );
}

/** Executor view: remove evidence-id references (the executor does not see the evidence table). */
function scrub<T>(v: T): T {
  if (typeof v === "string")
    return v.replace(/\s*\[[^\]]*\bev_\d+[^\]]*\]/g, "").replace(/\s*\(ev_\d+(?:\s*,\s*ev_\d+)*\)/g, "") as unknown as T;
  if (Array.isArray(v)) return v.map(scrub) as unknown as T;
  if (v && typeof v === "object")
    return Object.fromEntries(Object.entries(v as Record<string, unknown>).map(([k, x]) => [k, scrub(x)])) as T;
  return v;
}

function IdsBase({ ids }: { ids?: string[] }) {
  if (!ids || ids.length === 0) return null;
  return <span className="ml-1 text-[10px] text-neutral-400">[{ids.join(", ")}]</span>;
}

function Section({ title, children, note }: { title: string; children: React.ReactNode; note?: string }) {
  return (
    <section className="mt-6">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-neutral-500">{title}</h2>
      {note && <p className="mt-0.5 text-xs text-neutral-400">{note}</p>}
      <div className="mt-2 rounded-lg border border-neutral-200 bg-white p-4 text-sm text-neutral-800 space-y-2">
        {children}
      </div>
    </section>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-[170px_1fr] gap-1 sm:gap-3">
      <div className="text-xs font-medium text-neutral-500 pt-0.5">{label}</div>
      <div>{children}</div>
    </div>
  );
}

function List({ items }: { items: string[] }) {
  if (!items.length) return <span className="text-neutral-400">—</span>;
  return (
    <ul className="list-disc pl-5 space-y-1">
      {items.map((t, i) => (
        <li key={i}>{t}</li>
      ))}
    </ul>
  );
}

function fmtThreshold(m: Measure): string {
  if (m.unit === "pass_fail") return "must pass";
  const sym = { gte: "≥", gt: ">", lte: "≤", lt: "<" }[m.comparator];
  return m.threshold === null ? "threshold needs client input" : `${sym} ${m.threshold}`;
}

export function BlueprintDoc({ row, variant }: { row: BlueprintRow; variant: Variant }) {
  const parsed = InputsV.parse(row.inputs);
  const inputs: Inputs | null = parsed.ok ? parsed.value : null;
  const executor = variant === "executor";
  const c = executor ? scrub(row.content ?? {}) : (row.content ?? {});
  const Ids = ({ ids }: { ids?: string[] }) => (executor ? null : <IdsBase ids={ids} />);
  const s1 = c.stage1;
  const s2 = c.stage2;
  const s3 = c.stage3;
  const out = c.outcome;
  const next = c.next;
  const rec = s3 && out ? reconcile(s3, out) : null;
  const territory = inputs ? TERRITORY_TEMPLATES[inputs.territory as Territory] : null;
  const internal = variant === "internal";
  const receipt = variant === "receipt";

  const viewLabel = internal ? "Internal workspace" : executor ? "Executor view" : "Decision Evidence Receipt";

  return (
    <div className="bp-print">
      <style>{`
        @media print {
          body * { visibility: hidden; }
          .bp-print, .bp-print * { visibility: visible; }
          .bp-print { position: absolute; left: 0; top: 0; width: 100%; padding: 0; font-size: 10.5px; line-height: 1.35; }
          .bp-print section { margin-top: 12px !important; }
          .bp-print section > div { padding: 8px 10px !important; }
          .bp-print table, .bp-print .bp-card { break-inside: avoid; }
          .bp-noprint { display: none !important; }
          @page { size: A4; margin: 12mm; }
        }
      `}</style>

      <header className="border-b border-neutral-200 pb-4">
        <div className="flex flex-wrap items-center gap-2 text-[11px] font-semibold uppercase tracking-wide">
          <span className="rounded bg-neutral-900 px-2 py-0.5 text-white">{viewLabel}</span>
          {row.is_demo && (
            <span className="rounded bg-rose-100 px-2 py-0.5 text-rose-800">
              Illustrative demo — fictional brand and numbers
            </span>
          )}
          {territory && <span className="rounded bg-neutral-100 px-2 py-0.5 text-neutral-600">{territory.label}</span>}
          <span className="rounded bg-neutral-100 px-2 py-0.5 text-neutral-600">{row.market}</span>
        </div>
        <h1 className="mt-2 text-xl font-semibold text-neutral-900">{row.title}</h1>
        <p className="mt-1 text-xs text-neutral-500">
          Execution owner: <strong>{row.execution_owner_label ?? "—"}</strong>
          {row.execution_owner_type ? ` (${human(row.execution_owner_type)})` : ""}
          {" · "}
          Decision loop: Commercial pressure → Decision question → Evidence → Competing explanations → Decision →
          Activation Blueprint → Test / controlled market action → Execution → KPI / actuals → Reconciliation → Next decision
        </p>
        {executor && (
          <p className="mt-2 rounded bg-neutral-50 border border-neutral-200 p-2 text-xs text-neutral-600">
            Boundary: ShiftImpact specifies the <strong>job</strong> the execution must perform and what is held constant.
            Scripts, concepts, storyboards, casting and production belong to the execution owner.
          </p>
        )}
      </header>

      {/* 1. FRAMING */}
      {inputs && (
        <Section title="Commercial pressure & decision question">
          <Row label="Commercial pressure">{inputs.commercial_pressure}</Row>
          <Row label="Decision question">{inputs.decision_question}</Row>
          <Row label="Decision owner">{inputs.decision_owner}</Row>
          <Row label="Objective">{inputs.objective}</Row>
        </Section>
      )}

      {/* 2. EVIDENCE — receipt + internal only */}
      {(internal || receipt) && inputs && (
        <Section
          title="Evidence used"
          note="Indexed / aggregated / client-computed / public observation only. No raw row-level data."
        >
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="text-neutral-500">
                <tr>
                  <th className="py-1 pr-2">ID</th>
                  <th className="pr-2">Evidence</th>
                  <th className="pr-2">Class</th>
                  <th className="pr-2">Grade</th>
                  <th className="pr-2">Reading</th>
                  <th className="pr-2">Date</th>
                  <th>Owner</th>
                </tr>
              </thead>
              <tbody className="align-top">
                {inputs.evidence.map((e) => (
                  <tr key={e.id} className="border-t border-neutral-100">
                    <td className="py-1 pr-2 font-mono">{e.id}</td>
                    <td className="pr-2">{e.label}</td>
                    <td className="pr-2">{human(e.class)}</td>
                    <td className="pr-2">{human(e.grade)}</td>
                    <td className="pr-2">
                      {e.baseline !== null && e.current !== null
                        ? `${e.baseline} → ${e.current} (${human(e.unit)}${e.base_period ? `; ${e.base_period}` : ""})`
                        : "—"}
                    </td>
                    <td className="pr-2 whitespace-nowrap">{e.source_date}</td>
                    <td>{e.owner}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Section>
      )}

      {/* 3. EVIDENCE READ + EXPLANATIONS + DECISION */}
      {s1 && (internal || receipt) && (
        <>
          <Section title="What was known, inferred, unknown, and needs a test">
            {(["known", "inferred", "unknown", "test_required"] as const).map((k) => (
              <Row key={k} label={human(k)}>
                {s1.evidence_read[k].length === 0 ? (
                  <span className="text-neutral-400">—</span>
                ) : (
                  <ul className="list-disc pl-5 space-y-1">
                    {s1.evidence_read[k].map((x, i) => (
                      <li key={i}>
                        {x.text}
                        <Ids ids={x.evidence_ids} />
                      </li>
                    ))}
                  </ul>
                )}
              </Row>
            ))}
          </Section>

          <Section title="Competing explanations">
            {s1.explanations.map((e) => (
              <div key={e.id} className="bp-card rounded border border-neutral-100 p-3 space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono text-xs text-neutral-500">{e.id}</span>
                  {e.primary && (
                    <span className="rounded bg-neutral-900 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-white">
                      primary
                    </span>
                  )}
                  <Basis basis={e.basis} />
                </div>
                <p>{e.statement}</p>
                {e.supports.length > 0 && (
                  <p className="text-xs text-neutral-600">
                    <strong>Supported by:</strong>{" "}
                    {e.supports.map((s) => `[${s.evidence_id}] ${s.why}`).join(" · ")}
                  </p>
                )}
                {e.contradicts.length > 0 && (
                  <p className="text-xs text-neutral-600">
                    <strong>Contradicted by:</strong>{" "}
                    {e.contradicts.map((s) => `[${s.evidence_id}] ${s.why}`).join(" · ")}
                  </p>
                )}
                <p className="text-xs text-neutral-600">
                  <strong>Falsified if:</strong> {e.falsified_if}
                </p>
              </div>
            ))}
          </Section>
        </>
      )}

      {s1 && (
        <Section title="Decision">
          <Row label="Move">
            <span className="font-semibold uppercase">{s1.decision.move}</span>
            {" — "}
            {s1.decision.headline}
          </Row>
          {!executor && <Row label="Rationale">{s1.decision.rationale}</Row>}
          {!executor && <Row label="Confidence">{s1.decision.confidence}</Row>}
          <Row label="What changes">
            <List items={s1.decision.what_changes} />
          </Row>
          <Row label="What stays unchanged">
            <List items={s1.decision.what_stays} />
          </Row>
          {!executor && (
            <Row label="Cannot be concluded">
              <List items={s1.decision.cannot_conclude} />
            </Row>
          )}
        </Section>
      )}

      {/* 4. THE ACTIVATION BLUEPRINT */}
      {s2 && (
        <>
          <Section
            title="Activation Blueprint — the job"
            note={executor ? "What the execution must make happen, and why." : undefined}
          >
            <Row label="Behavioural / commercial job">
              <span className="font-semibold">{human(s2.behavioural_job.primary)}</span>
              {s2.behavioural_job.secondary.length > 0 && (
                <span className="text-neutral-500"> (also: {s2.behavioural_job.secondary.map(human).join(", ")})</span>
              )}{" "}
              <Basis basis={s2.behavioural_job.basis} />
              <Ids ids={s2.behavioural_job.evidence_ids} />
              <p className="mt-1">{s2.behavioural_job.statement}</p>
            </Row>
            <Row label="Intervention">
              {s2.intervention.statement} <Basis basis={s2.intervention.basis} />
            </Row>
            <Row label="Controlled variable">
              <strong>{s2.intervention.controlled_variable}</strong>
            </Row>
            <Row label="Preservation constraints">
              <ul className="list-disc pl-5 space-y-1">
                {s2.intervention.preservation_constraints.map((p, i) => (
                  <li key={i}>
                    <strong>{p.item}</strong> — {p.why}
                  </li>
                ))}
              </ul>
            </Row>
          </Section>

          <Section title="Content role & proof required">
            <Row label="Content role">
              <ul className="space-y-1">
                {s2.content_roles.map((r, i) => (
                  <li key={i}>
                    <strong>{human(r.role)}</strong> <Basis basis={r.basis} />
                    <Ids ids={r.evidence_ids} /> — {r.job}
                  </li>
                ))}
              </ul>
            </Row>
            <Row label="Proof required">
              <ul className="space-y-1">
                {s2.proof_required.map((p, i) => (
                  <li key={i}>
                    <strong>{human(p.proof)}</strong> <Basis basis={p.basis} />
                    <Ids ids={p.evidence_ids} /> — {p.must_show}
                  </li>
                ))}
              </ul>
            </Row>
          </Section>

          <Section title="Creator role, asset architecture & platform role">
            <Row label="Creator role">
              {s2.creator_role.applicable ? (
                <>
                  <strong>{human(s2.creator_role.role ?? "—")}</strong>
                  {s2.creator_role.not_role && (
                    <span className="text-neutral-500"> — not {human(s2.creator_role.not_role)}</span>
                  )}{" "}
                  <Basis basis={s2.creator_role.basis} />
                  <p className="mt-1">{s2.creator_role.job}</p>
                  {s2.creator_role.selection_criteria.length > 0 && (
                    <div className="mt-1 text-xs text-neutral-600">
                      <strong>Selection criteria:</strong> {s2.creator_role.selection_criteria.join("; ")}
                    </div>
                  )}
                </>
              ) : (
                <>Not applicable. {s2.creator_role.job}</>
              )}
            </Row>
            <Row label="Asset architecture">
              <ol className="list-decimal pl-5 space-y-1">
                {s2.asset_architecture.beats.map((b, i) => (
                  <li key={i}>
                    <strong>{human(b.beat)}</strong> — {b.job}
                  </li>
                ))}
              </ol>
              <p className="mt-1 text-xs text-neutral-500">{s2.asset_architecture.rationale}</p>
            </Row>
            <Row label="Platform role">
              <ul className="space-y-1">
                {s2.platform_roles.map((p, i) => (
                  <li key={i}>
                    <strong>{p.environment}</strong> · {human(p.role)} — {p.job}
                  </li>
                ))}
              </ul>
            </Row>
            {s2.commerce_roles.length > 0 && (
              <Row label="Commerce role">
                <ul className="space-y-1">
                  {s2.commerce_roles.map((p, i) => (
                    <li key={i}>
                      <strong>{human(p.role)}</strong> — {p.job}{" "}
                      <span className="text-xs text-neutral-500">(controlled by: {p.controlled_by})</span>
                    </li>
                  ))}
                </ul>
              </Row>
            )}
          </Section>

          <Section
            title="Choices already made for the execution owner"
            note="Each picks a side and names the alternative not chosen."
          >
            {s2.execution_choices.map((x, i) => (
              <div key={i} className="bp-card rounded border border-neutral-100 p-3 space-y-1">
                <p className="font-medium">{x.question}</p>
                <p>
                  <strong>Recommended:</strong> {x.recommended} <Basis basis={x.basis} />
                  <Ids ids={x.evidence_ids} />
                </p>
                <p className="text-xs text-neutral-600">
                  <strong>Not chosen:</strong> {x.alternative_not_chosen}
                </p>
                <p className="text-xs text-neutral-600">{x.why}</p>
              </div>
            ))}
          </Section>

          <Section title="What the execution owner must deliver or confirm">
            <List items={s2.execution_owner_asks} />
          </Section>
        </>
      )}

      {/* 5. TEST / CONTROLLED MARKET ACTION + MEASURES */}
      {s3 && (
        <>
          <Section title="Test / controlled market action">
            <Row label="Role · design">
              {human(s3.test.role)} · <strong>{human(s3.test.design)}</strong> · {s3.test.duration_weeks} weeks
            </Row>
            <Row label="Why this design">{s3.test.design_rationale}</Row>
            <Row label="Treatment">{s3.test.treatment}</Row>
            <Row label="Comparison">{s3.test.comparison}</Row>
            <Row label="Held constant">
              <ul className="list-disc pl-5 space-y-1">
                {s3.test.held_constant.map((h, i) => (
                  <li key={i}>
                    <strong>{h.item}</strong> — verified by: {h.how_verified}
                  </li>
                ))}
              </ul>
            </Row>
            <Row label="Calendar confounds">
              {s3.test.calendar_confounds.length === 0 ? (
                <span className="text-neutral-400">—</span>
              ) : (
                <ul className="list-disc pl-5 space-y-1">
                  {s3.test.calendar_confounds.map((h, i) => (
                    <li key={i}>
                      <strong>{h.event}</strong> — {h.risk} Mitigation: {h.mitigation}
                    </li>
                  ))}
                </ul>
              )}
            </Row>
          </Section>

          <Section
            title="KPI, guardrails & decision rule"
            note="Thresholds marked proposed are proposals to agree with the client before the test; they are not predictions."
          >
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="text-neutral-500">
                  <tr>
                    <th className="py-1 pr-2">Role</th>
                    <th className="pr-2">Measure</th>
                    <th className="pr-2">Unit</th>
                    <th className="pr-2">Passes when</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody className="align-top">
                  {s3.measures.map((m) => (
                    <tr key={m.key} className="border-t border-neutral-100">
                      <td className="py-1 pr-2 uppercase font-semibold">{m.role}</td>
                      <td className="pr-2">
                        {m.label}
                        <div className="text-neutral-500">{m.definition}</div>
                      </td>
                      <td className="pr-2">{human(m.unit)}</td>
                      <td className="pr-2 whitespace-nowrap">{fmtThreshold(m)}</td>
                      <td>{human(m.threshold_status)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Row label="Success signal">{s3.signals.success}</Row>
            <Row label="Failure signal">{s3.signals.failure}</Row>
            <Row label="Inconclusive → retest">{s3.signals.inconclusive}</Row>
            <Row label="Decision rule">
              {s3.decision_rule.statement}{" "}
              <span className="text-xs text-neutral-500">
                (pass → {s3.decision_rule.on_pass}; fail → {s3.decision_rule.on_fail}; unclean → retest)
              </span>
            </Row>
          </Section>
        </>
      )}

      {/* 6. OUTCOME + RECONCILIATION — receipt + internal */}
      {(internal || receipt) && s3 && out && rec && (
        <Section
          title="Actual result & reconciliation"
          note={out.is_illustrative ? "ILLUSTRATIVE outcome — fictional numbers, computed by the real reconciliation logic." : undefined}
        >
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="text-neutral-500">
                <tr>
                  <th className="py-1 pr-2">Role</th>
                  <th className="pr-2">Measure</th>
                  <th className="pr-2">Actual</th>
                  <th className="pr-2">Required</th>
                  <th>Result</th>
                </tr>
              </thead>
              <tbody>
                {rec.measure_results.map((m) => (
                  <tr key={m.key} className="border-t border-neutral-100">
                    <td className="py-1 pr-2 uppercase font-semibold">{m.role}</td>
                    <td className="pr-2">{m.label}</td>
                    <td className="pr-2">{m.actual === null ? "—" : String(m.actual)}</td>
                    <td className="pr-2">
                      {m.unit === "pass_fail"
                        ? "pass"
                        : `${{ gte: "≥", gt: ">", lte: "≤", lt: "<" }[m.comparator]} ${m.threshold ?? "?"}`}
                    </td>
                    <td className={m.status === "pass" ? "text-emerald-700 font-semibold" : "text-rose-700 font-semibold"}>
                      {m.status}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Row label="Treatment delivered">
            {out.treatment_delivered === null ? "unconfirmed" : out.treatment_delivered ? "yes, as specified" : "no"}
          </Row>
          <Row label="Held-constant check">
            {out.held_constant_check.map((h) => `${h.item}: ${h.status}`).join(" · ")}
          </Row>
          <Row label="Reconciliation (computed)">
            <span className="font-semibold uppercase">{human(rec.verdict)}</span> → suggested move{" "}
            <span className="font-semibold uppercase">{rec.suggested_move}</span> · evidence strength{" "}
            <span className="font-semibold">{rec.evidence_strength}</span>
            <ul className="mt-1 list-disc pl-5 text-xs text-neutral-600">
              {rec.reasons.map((r, i) => (
                <li key={i}>{r}</li>
              ))}
            </ul>
          </Row>
          <Row label="Interpretation">{out.interpretation}</Row>
          <p className="text-xs text-neutral-400">Strategist approval of the outcome is required before client release.</p>
        </Section>
      )}

      {/* 7. NEXT DECISION */}
      {(internal || receipt) && next && (
        <Section
          title="Next commercial decision"
          note={next.is_authored ? "Authored for this demo — no next-decision AI route exists yet." : undefined}
        >
          <Row label="Move">
            <span className="font-semibold uppercase">{next.move}</span> · next test role: {human(next.test_role)}
          </Row>
          <Row label="Rationale">{next.rationale}</Row>
          <Row label="Next question">{next.next_question}</Row>
        </Section>
      )}

      {/* 8. INTERNAL-ONLY DRAFT PROVENANCE */}
      {internal && (
        <Section title="Draft provenance (internal only)">
          {(["stage1", "stage2", "stage3"] as const).map((k) => {
            const m = row.stages?.[k];
            return (
              <Row key={k} label={k}>
                {m ? (
                  <>
                    {m.model} · {m.drafted_at.slice(0, 19).replace("T", " ")} · attempts: {m.attempts}
                    {m.downgraded_to_hypothesis.length > 0 &&
                      ` · downgraded to hypothesis: ${m.downgraded_to_hypothesis.length}`}
                  </>
                ) : (
                  <span className="text-neutral-400">not drafted</span>
                )}
              </Row>
            );
          })}
          <p className="text-xs text-neutral-500">
            Every AI-drafted section needs strategist review: evidence acceptance, causal-claim approval, confidence
            finalisation, intervention approval and client release are human decisions.
          </p>
        </Section>
      )}
    </div>
  );
}
