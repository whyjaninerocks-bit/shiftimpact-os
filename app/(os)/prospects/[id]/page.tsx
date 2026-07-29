// app/(os)/prospects/[id]/page.tsx — Company detail: signals, assessment, people, outreach

import Link from "next/link";
import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { Badge, Card, SectionTitle, buttonClass } from "@/app/_components/ui";
import { ProspectActions } from "./ProspectActions";
import { StatusUpdatePanel } from "./StatusUpdatePanel";

export const dynamic = "force-dynamic";

function tierTone(tier: string | null): "red" | "amber" | "neutral" {
  if (tier === "Tier 1 Hot")  return "red";
  if (tier === "Tier 2 Warm") return "amber";
  return "neutral";
}

function recTone(rec: string | null): "green" | "amber" | "red" {
  if (rec === "Pursue") return "green";
  if (rec === "Watch")  return "amber";
  return "red";
}

function categoryTone(cat: string): "blue" | "green" | "purple" | "amber" | "neutral" {
  switch (cat) {
    case "Growth":      return "blue";
    case "Recognition": return "green";
    case "Leadership":  return "purple";
    case "Activation":  return "amber";
    default:            return "neutral";
  }
}

function confidenceTone(c: string): "green" | "amber" | "red" {
  if (c === "High")   return "green";
  if (c === "Medium") return "amber";
  return "red";
}

function statusTone(s: string): "green" | "amber" | "neutral" {
  if (s === "Sent" || s === "Replied") return "green";
  if (s === "Approved")                return "amber";
  return "neutral";
}

function relTone(r: string): "green" | "blue" | "neutral" {
  if (r === "Warm" || r === "Partner") return "green";
  if (r === "Contacted")               return "blue";
  return "neutral";
}

function daysSince(date: string | null): string {
  if (!date) return "never";
  const days = Math.floor((Date.now() - new Date(date).getTime()) / 86_400_000);
  if (days === 0) return "today";
  if (days === 1) return "yesterday";
  return `${days}d ago`;
}

function freshnessBar(score: number): string {
  if (score >= 0.7) return "bg-emerald-400";
  if (score >= 0.4) return "bg-amber-400";
  return "bg-red-300";
}

export default async function ProspectDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = createAdminClient();

  // Fetch company
  const { data: company, error } = await supabase
    .from("companies")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !company) notFound();

  // Fetch signals — source_confidence lives on evidence_sources, not business_signals
  const { data: signals, error: signalErr } = await supabase
    .from("business_signals")
    .select(`
      id, signal_category, signal_type, signal_text,
      signal_freshness_score, detected_at, source_url,
      evidence_sources ( id, url, headline, published_at, source_confidence )
    `)
    .eq("company_id", id)
    .is("duplicate_of_id", null)
    .order("detected_at", { ascending: false })
    .limit(20);

  if (signalErr) console.error("[prospects/detail] signal query error:", signalErr.message);

  // Fetch latest assessment + scores (scores live in prospect_scores, not prospect_assessments)
  const { data: assessment } = await supabase
    .from("prospect_assessments")
    .select(`
      id, business_moment_summary, shiftimpact_entry_point,
      recommended_approach, recommended_offer, offer_rationale,
      status, generated_at,
      prospect_scores ( opportunity_score, pursuit_score, opportunity_rationale, pursuit_rationale, surfaced_at )
    `)
    .eq("company_id", id)
    .order("generated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  // Fetch people
  const { data: people } = await supabase
    .from("people")
    .select("id, name, role, relationship_status, warm_intro_possible, warm_intro_via, is_suppressed")
    .eq("company_id", id)
    .eq("is_suppressed", false)
    .order("created_at", { ascending: true });

  // Fetch outreach
  const { data: outreachList } = await supabase
    .from("outreach")
    .select(`
      id, channel, status, drafted_at, approved_at, sent_at, replied_at,
      people ( name, role )
    `)
    .in(
      "person_id",
      (people ?? []).map(p => p.id)
    )
    .order("drafted_at", { ascending: false })
    .limit(10);

  // Score history (last 5) — column is surfaced_at not scored_at
  const { data: scores } = await supabase
    .from("prospect_scores")
    .select("opportunity_score, pursuit_score, composite_score, surfaced_at")
    .eq("company_id", id)
    .order("surfaced_at", { ascending: false })
    .limit(5);

  // Fall back to scores nested on the assessment if direct query is empty
  type ScoreRow = { opportunity_score: number; pursuit_score: number; composite_score?: number | null; surfaced_at: string };
  const nestedScores = (assessment?.prospect_scores ?? []) as ScoreRow[];
  const latestScore: ScoreRow | null = (scores?.[0] as ScoreRow | undefined) ?? nestedScores[0] ?? null;

  // Fetch latest topline insight (includes new high-specificity fields from migration 0032)
  const { data: toplineInsight } = await supabase
    .from("prospect_insights")
    .select(`
      recommendation, benchmark_context, market_context, best_entry_angle,
      partner_lens, aoai_recommended_offer, aoai_entry_angle,
      decision_window_weeks, spend_signal, first_engagement_offer,
      aoai_campaign_mechanic, aoai_joint_pitch,
      created_at
    `)
    .eq("company_id", id)
    .eq("depth_level", "topline")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  // Fetch latest deep dive insight (includes meeting_objective, competitive_moat, revenue_estimate from migration 0032)
  const { data: deepInsight } = await supabase
    .from("prospect_insights")
    .select(`
      competitive_landscape, approach_sequence, signal_analysis, risk_factors, market_timing,
      recommended_person_name, recommended_person_role, recommended_person_why,
      recommended_person_signal, recommended_person_hook,
      meeting_objective, competitive_moat, revenue_estimate,
      created_at
    `)
    .eq("company_id", id)
    .eq("depth_level", "deep")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return (
    <div className="space-y-6">

      {/* ── Breadcrumb + header ──────────────────────────────────────────── */}
      <div>
        <Link href="/prospects" className="text-sm text-neutral-400 hover:text-neutral-700 underline">
          Back to Prospects
        </Link>
        <div className="mt-3 flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl font-bold text-neutral-900">{company.name}</h1>
              {company.prospect_tier && (
                <Badge tone={tierTone(company.prospect_tier)}>{company.prospect_tier}</Badge>
              )}
              <Badge tone="neutral">{company.status ?? "Watching"}</Badge>
            </div>
            <p className="text-sm text-neutral-400 mt-0.5">
              {[company.industry, company.market_code, company.website].filter(Boolean).join(" · ")}
            </p>
          </div>
          {/* Client-side actions: Scan + Assess + Add Person */}
          <ProspectActions companyId={id} companyName={company.name} />
        </div>
      </div>

      {/* ── Pipeline controls ───────────────────────────────────────────── */}
      <StatusUpdatePanel
        companyId={id}
        currentStatus={(company.status ?? "Watching") as "Watching" | "Qualified" | "Pursuing" | "Client" | "Archived"}
        currentTier={(company.prospect_tier ?? null) as "Tier 1 Hot" | "Tier 2 Warm" | "Tier 3 Watch" | null}
        currentPartner={((company as Record<string, unknown>).partner_tag ?? null) as "ShiftImpact" | "AOAI" | "Both" | null}
      />

      {/* ── Company profile (enriched fields) ──────────────────────────── */}
      {(company.company_profile_summary || company.employee_band || company.business_model || company.growth_stage) && (
        <div className="rounded-xl border border-neutral-200 bg-white px-4 py-3 space-y-3 shadow-sm">
          <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest">Company Profile</p>
          {company.company_profile_summary && (
            <p className="text-sm text-neutral-700">{company.company_profile_summary}</p>
          )}
          <div className="flex flex-wrap gap-2 text-xs">
            {company.employee_band && (
              <span className="px-2 py-1 rounded-md border border-neutral-200 bg-neutral-50 text-neutral-600">
                👥 {company.employee_band} employees
              </span>
            )}
            {company.business_model && (
              <span className="px-2 py-1 rounded-md border border-neutral-200 bg-neutral-50 text-neutral-600">
                {company.business_model}
              </span>
            )}
            {company.growth_stage && (
              <span className="px-2 py-1 rounded-md border border-neutral-200 bg-neutral-50 text-neutral-600">
                {company.growth_stage}
              </span>
            )}
            {company.linkedin_url && (
              <a
                href={company.linkedin_url}
                target="_blank"
                rel="noopener noreferrer"
                className="px-2 py-1 rounded-md border border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100 transition-colors"
              >
                LinkedIn ↗
              </a>
            )}
          </div>
        </div>
      )}

      {/* ── Score summary ────────────────────────────────────────────────── */}
      {latestScore && (
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: "Opportunity", value: latestScore.opportunity_score },
            { label: "Pursuit",     value: latestScore.pursuit_score },
            { label: "Composite",   value: latestScore.composite_score ?? "—" },
          ].map(s => (
            <div key={s.label} className="bg-white border border-neutral-200 rounded-lg px-4 py-3 text-center">
              <p className="text-2xl font-bold text-neutral-900">{s.value}</p>
              <p className="text-xs text-neutral-400 mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>
      )}

      {/* ── Topline intelligence ─────────────────────────────────────────── */}
      {toplineInsight && (
        <div className="space-y-2">
          <SectionTitle>Intelligence Read</SectionTitle>
          <Card>
            <div className="space-y-4">

              {/* ── Row: Recommendation + Decision Window + Spend Signal ── */}
              <div className="flex items-center gap-3 flex-wrap">
                <Badge tone={recTone(toplineInsight.recommendation)}>{toplineInsight.recommendation ?? "—"}</Badge>
                {(toplineInsight as Record<string,unknown>).decision_window_weeks && (
                  <span className="px-2 py-0.5 rounded-md border border-neutral-200 bg-neutral-50 text-xs font-medium text-neutral-600">
                    ⏱ {(toplineInsight as Record<string,unknown>).decision_window_weeks as number}w window
                  </span>
                )}
                {(toplineInsight as Record<string,unknown>).spend_signal && (
                  <span className={`px-2 py-0.5 rounded-md border text-xs font-medium ${
                    (toplineInsight as Record<string,unknown>).spend_signal === "Budget likely available"
                      ? "bg-green-50 border-green-200 text-green-700"
                      : (toplineInsight as Record<string,unknown>).spend_signal === "Budget possibly frozen"
                      ? "bg-red-50 border-red-200 text-red-700"
                      : "bg-neutral-50 border-neutral-200 text-neutral-600"
                  }`}>
                    {(toplineInsight as Record<string,unknown>).spend_signal as string}
                  </span>
                )}
              </div>

              {/* ── Benchmark ── */}
              {toplineInsight.benchmark_context && (
                <div>
                  <p className="text-xs font-medium text-neutral-400 uppercase tracking-wider mb-1">Benchmark</p>
                  <p className="text-sm text-neutral-700">{toplineInsight.benchmark_context}</p>
                </div>
              )}

              {/* ── Market context ── */}
              {toplineInsight.market_context && (
                <div>
                  <p className="text-xs font-medium text-neutral-400 uppercase tracking-wider mb-1">Market &amp; Competitive Context</p>
                  <p className="text-sm text-neutral-700">{toplineInsight.market_context}</p>
                </div>
              )}

              {/* ── Best entry angle ── */}
              {toplineInsight.best_entry_angle && (
                <div className="bg-neutral-50 border border-neutral-200 rounded-lg px-4 py-3">
                  <p className="text-xs font-medium text-neutral-400 uppercase tracking-wider mb-1">Best Entry Angle</p>
                  <p className="text-sm font-medium text-neutral-900">{toplineInsight.best_entry_angle}</p>
                </div>
              )}

              {/* ── First Engagement Offer (pitch framing) ── */}
              {(toplineInsight as Record<string,unknown>).first_engagement_offer && (
                <div className="bg-neutral-900 rounded-lg px-4 py-3">
                  <p className="text-xs font-medium text-neutral-400 uppercase tracking-wider mb-1">First Engagement Offer</p>
                  <p className="text-sm text-white">{(toplineInsight as Record<string,unknown>).first_engagement_offer as string}</p>
                </div>
              )}

              {/* ── AOAI opportunity block ── */}
              {toplineInsight.aoai_recommended_offer && toplineInsight.aoai_recommended_offer !== "Not a fit" && (
                <div className="border border-green-200 bg-green-50 rounded-lg px-4 py-3 space-y-3">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[10px] font-bold text-green-700 uppercase tracking-widest">AOAI Opportunity</span>
                    <span className="px-2 py-0.5 rounded text-xs font-semibold bg-green-100 text-green-800">
                      {toplineInsight.aoai_recommended_offer}
                    </span>
                  </div>
                  {toplineInsight.aoai_entry_angle && (
                    <p className="text-sm text-green-900">{toplineInsight.aoai_entry_angle}</p>
                  )}
                  {(toplineInsight as Record<string,unknown>).aoai_campaign_mechanic && (
                    <div className="border-t border-green-200 pt-2">
                      <p className="text-[10px] font-bold text-green-600 uppercase tracking-widest mb-1">Campaign Mechanic</p>
                      <p className="text-sm text-green-900">{(toplineInsight as Record<string,unknown>).aoai_campaign_mechanic as string}</p>
                    </div>
                  )}
                  {(toplineInsight as Record<string,unknown>).aoai_joint_pitch && (
                    <div className="border-t border-green-200 pt-2">
                      <p className="text-[10px] font-bold text-green-600 uppercase tracking-widest mb-1">Joint Pitch (ShiftImpact + AOAI)</p>
                      <p className="text-sm text-green-900">{(toplineInsight as Record<string,unknown>).aoai_joint_pitch as string}</p>
                    </div>
                  )}
                </div>
              )}

              {/* ── Go Deep / Refresh Deep Dive ── */}
              <div className="pt-1 border-t border-neutral-100">
                <ProspectActions
                  companyId={id}
                  companyName={company.name}
                  showGoDeepOnly
                  alreadyPursuing={company.status === "Pursuing"}
                />
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* ── Deep dive ────────────────────────────────────────────────────── */}
      {deepInsight && (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <SectionTitle>Deep Dive</SectionTitle>
            <Badge tone="green">Pursuing</Badge>
          </div>
          <Card>
            <div className="space-y-4">
              {deepInsight.market_timing && (
                <div>
                  <p className="text-xs font-medium text-neutral-400 uppercase tracking-wider mb-1">Market Timing</p>
                  <p className="text-sm text-neutral-700">{deepInsight.market_timing}</p>
                </div>
              )}
              {deepInsight.competitive_landscape && (
                <div>
                  <p className="text-xs font-medium text-neutral-400 uppercase tracking-wider mb-1">Competitive Landscape</p>
                  <p className="text-sm text-neutral-700">{deepInsight.competitive_landscape}</p>
                </div>
              )}
              {deepInsight.approach_sequence && (
                <div>
                  <p className="text-xs font-medium text-neutral-400 uppercase tracking-wider mb-1">Approach Sequence</p>
                  <p className="text-sm text-neutral-700 whitespace-pre-line">{deepInsight.approach_sequence}</p>
                </div>
              )}
              {deepInsight.signal_analysis && (
                <div>
                  <p className="text-xs font-medium text-neutral-400 uppercase tracking-wider mb-1">Signal Analysis</p>
                  <p className="text-sm text-neutral-700 whitespace-pre-line">{deepInsight.signal_analysis}</p>
                </div>
              )}
              {deepInsight.risk_factors && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3">
                  <p className="text-xs font-medium text-amber-600 uppercase tracking-wider mb-1">Risk Factors</p>
                  <p className="text-sm text-neutral-700 whitespace-pre-line">{deepInsight.risk_factors}</p>
                </div>
              )}
              {/* Meeting Objective */}
              {(deepInsight as Record<string,unknown>).meeting_objective && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-3">
                  <p className="text-xs font-medium text-blue-600 uppercase tracking-wider mb-1">First Meeting Objective</p>
                  <p className="text-sm text-blue-900 font-medium">{(deepInsight as Record<string,unknown>).meeting_objective as string}</p>
                </div>
              )}
              {/* Competitive Moat */}
              {(deepInsight as Record<string,unknown>).competitive_moat && (
                <div>
                  <p className="text-xs font-medium text-neutral-400 uppercase tracking-wider mb-1">Why ShiftImpact (Not Publicis or BCG)</p>
                  <p className="text-sm text-neutral-700">{(deepInsight as Record<string,unknown>).competitive_moat as string}</p>
                </div>
              )}
              {/* Revenue Estimate */}
              {(deepInsight as Record<string,unknown>).revenue_estimate && (
                <div className="flex items-center justify-between gap-4 bg-neutral-50 border border-neutral-200 rounded-lg px-4 py-3">
                  <p className="text-xs font-medium text-neutral-400 uppercase tracking-wider">Estimated Engagement Value</p>
                  <p className="text-sm font-bold text-neutral-900">{(deepInsight as Record<string,unknown>).revenue_estimate as string}</p>
                </div>
              )}
              {/* Who to Approach */}
              {deepInsight.recommended_person_role && (
                <div className="bg-neutral-900 rounded-lg px-4 py-4 space-y-3">
                  <p className="text-xs font-medium text-neutral-400 uppercase tracking-wider">Who to Approach First</p>
                  <div>
                    <p className="text-base font-bold text-white">
                      {deepInsight.recommended_person_name && deepInsight.recommended_person_name !== "Not identified in signals"
                        ? deepInsight.recommended_person_name
                        : "Name not in signals"}
                    </p>
                    <p className="text-sm text-neutral-300 mt-0.5">{deepInsight.recommended_person_role}</p>
                  </div>
                  {deepInsight.recommended_person_why && (
                    <p className="text-sm text-neutral-300">{deepInsight.recommended_person_why}</p>
                  )}
                  {deepInsight.recommended_person_signal && (
                    <div className="border-t border-neutral-700 pt-3">
                      <p className="text-xs text-neutral-500 uppercase tracking-wider mb-1">Signal source</p>
                      <p className="text-xs text-neutral-400">{deepInsight.recommended_person_signal}</p>
                    </div>
                  )}
                  {deepInsight.recommended_person_hook && (
                    <div className="bg-neutral-800 rounded-lg px-3 py-2">
                      <p className="text-xs text-neutral-500 uppercase tracking-wider mb-1">Opening line</p>
                      <p className="text-sm text-white italic">&ldquo;{deepInsight.recommended_person_hook}&rdquo;</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </Card>
        </div>
      )}

      {/* ── Latest assessment ────────────────────────────────────────────── */}
      {assessment ? (
        <div className="space-y-2">
          <SectionTitle>Latest Assessment</SectionTitle>
          <Card>
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div className="flex items-center gap-2">
                  <Badge tone="neutral">{assessment.recommended_offer}</Badge>
                  <Badge tone={assessment.status === "ready" ? "green" : "amber"}>{assessment.status}</Badge>
                </div>
                <span className="text-xs text-neutral-400">{daysSince(assessment.generated_at)}</span>
              </div>
              <div>
                <p className="text-xs font-medium text-neutral-400 uppercase tracking-wider mb-1">Business moment</p>
                <p className="text-sm text-neutral-700">{assessment.business_moment_summary}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-neutral-400 uppercase tracking-wider mb-1">Entry point</p>
                <p className="text-sm text-neutral-700">{assessment.shiftimpact_entry_point}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-neutral-400 uppercase tracking-wider mb-1">Offer rationale</p>
                <p className="text-sm text-neutral-700">{assessment.offer_rationale}</p>
              </div>
            </div>
          </Card>
        </div>
      ) : (
        <Card>
          <p className="text-sm text-neutral-500">
            No assessment yet.{" "}
            <span className="text-neutral-700">Run a scan first, then assess.</span>
          </p>
        </Card>
      )}

      {/* ── Signals ─────────────────────────────────────────────────────── */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <SectionTitle>Signals ({signals?.length ?? 0})</SectionTitle>
          <span className="text-xs text-neutral-400">Last scan: {daysSince(company.last_signal_date)}</span>
        </div>

        {(signals?.length ?? 0) === 0 && (
          <Card><p className="text-sm text-neutral-500">No signals detected. Run a scan to discover business moments.</p></Card>
        )}

        {signals?.map(s => {
          const freshness = s.signal_freshness_score ?? 1;
          const freshnessPercent = Math.round(freshness * 100);
          return (
            <Card key={s.id} className="space-y-2">
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge tone={categoryTone(s.signal_category)}>{s.signal_category}</Badge>
                  <span className="text-xs text-neutral-500">{s.signal_type}</span>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  {(() => {
                    const conf = (s.evidence_sources as Array<{source_confidence?: string}> | null)?.[0]?.source_confidence ?? "Medium";
                    return <Badge tone={confidenceTone(conf)}>{conf}</Badge>;
                  })()}
                  <span className="text-xs text-neutral-400">{daysSince(s.detected_at)}</span>
                </div>
              </div>
              <p className="text-sm text-neutral-700">{s.signal_text}</p>
              {/* Freshness bar */}
              <div className="flex items-center gap-2">
                <div className="flex-1 h-1.5 rounded-full bg-neutral-100 overflow-hidden">
                  <div
                    className={`h-full rounded-full ${freshnessBar(freshness)}`}
                    style={{ width: `${freshnessPercent}%` }}
                  />
                </div>
                <span className="text-[10px] text-neutral-400">{freshnessPercent}% fresh</span>
              </div>
              {/* Evidence sources */}
              {Array.isArray(s.evidence_sources) && s.evidence_sources.length > 0 && (
                <div className="pt-1 border-t border-neutral-100 space-y-1">
                  {(s.evidence_sources as { id: string; url: string; headline: string }[]).map(e => (
                    <a
                      key={e.id}
                      href={e.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block text-xs text-neutral-400 hover:text-neutral-700 underline truncate"
                    >
                      {e.headline || e.url}
                    </a>
                  ))}
                </div>
              )}
            </Card>
          );
        })}
      </div>

      {/* ── People ──────────────────────────────────────────────────────── */}
      <div className="space-y-2">
        <SectionTitle>People ({people?.length ?? 0})</SectionTitle>
        {(people?.length ?? 0) === 0 && (
          <Card><p className="text-sm text-neutral-500">No people tracked yet.</p></Card>
        )}
        {people?.map(p => (
          <Card key={p.id} className="flex items-center justify-between gap-3 flex-wrap">
            <div>
              <div className="flex items-center gap-2">
                <p className="font-medium text-sm text-neutral-900">{p.name}</p>
                <Badge tone={relTone(p.relationship_status ?? "Cold")}>{p.relationship_status ?? "Cold"}</Badge>
                {p.warm_intro_possible && (
                  <Badge tone="green">Warm intro via {p.warm_intro_via}</Badge>
                )}
              </div>
              <p className="text-xs text-neutral-400 mt-0.5">{p.role}</p>
            </div>
            {assessment && (
              <Link
                href={`/prospects/${id}/outreach/new?person_id=${p.id}&assessment_id=${assessment.id}`}
                className="text-xs px-3 py-1.5 rounded-lg border border-neutral-200 bg-white hover:bg-neutral-50 text-neutral-700 font-medium transition-colors shrink-0"
              >
                Draft outreach
              </Link>
            )}
          </Card>
        ))}
      </div>

      {/* ── Outreach history ─────────────────────────────────────────────── */}
      {(outreachList?.length ?? 0) > 0 && (
        <div className="space-y-2">
          <SectionTitle>Outreach</SectionTitle>
          {outreachList?.map(o => {
            const person = o.people as { name: string; role: string } | null;
            return (
              <Link key={o.id} href={`/prospects/${id}/outreach/${o.id}`} className="block group">
                <Card className="group-hover:border-neutral-300 transition-colors">
                  <div className="flex items-center justify-between gap-3 flex-wrap">
                    <div>
                      <div className="flex items-center gap-2">
                        <Badge tone={statusTone(o.status ?? "")}>{o.status}</Badge>
                        <Badge tone="neutral">{o.channel}</Badge>
                        {person && <span className="text-sm text-neutral-700">{person.name}</span>}
                      </div>
                      <p className="text-xs text-neutral-400 mt-0.5">
                        Drafted {daysSince(o.drafted_at)}
                        {o.sent_at && ` · Sent ${daysSince(o.sent_at)}`}
                        {o.replied_at && ` · Replied ${daysSince(o.replied_at)}`}
                      </p>
                    </div>
                    <svg className="w-4 h-4 text-neutral-300 group-hover:text-neutral-500 transition-colors" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </Card>
              </Link>
            );
          })}
        </div>
      )}

    </div>
  );
}
