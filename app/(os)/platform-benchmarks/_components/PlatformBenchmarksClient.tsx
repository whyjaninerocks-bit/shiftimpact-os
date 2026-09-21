"use client";

import { useMemo, useState } from "react";
import {
  Badge,
  Card,
  ErrorBanner,
  SectionTitle,
  buttonClass,
  buttonSecondaryClass,
  inputClass,
  labelClass,
} from "@/app/_components/ui";
import {
  createPlatformBenchmark,
  updatePlatformBenchmark,
  togglePlatformBenchmarkActive,
  deletePlatformBenchmark,
} from "@/lib/actions";
import {
  MARKET_APPLICABILITY_OPTIONS,
  SOURCE_TYPE_OPTIONS,
  CONFIDENCE_LEVEL_OPTIONS,
  RISK_TAG_OPTIONS,
  displayMarketApplicability,
  displaySourceType,
  isBenchmarkStale,
  daysOverdue,
} from "@/lib/platform-benchmarks";
import { MARKET_CODE_OPTIONS } from "@/lib/cultural-signal-picker";
import type { PlatformBenchmark } from "@/lib/types";

// ─── Display helpers ─────────────────────────────────────────────────────────

function marketApplicabilityTone(v: string): "green" | "blue" | "neutral" | "amber" {
  if (v === "country_specific") return "green";
  if (v === "sea_regional") return "blue";
  if (v === "global") return "neutral";
  return "amber"; // proxy_needs_validation
}

function sourceTypeTone(v: string): "green" | "purple" | "blue" | "neutral" {
  if (v === "campaign_actual") return "green";
  if (v === "mccann_client_benchmark") return "purple";
  if (v === "platform_published_metric" || v === "platform_creative_guidance") return "blue";
  return "neutral"; // industry_benchmark, strategist_observation
}

function confidenceTone(v: string): "green" | "amber" | "red" {
  if (v === "high") return "green";
  if (v === "medium") return "amber";
  return "red";
}

// ─── Shared form fields ────────────────────────────────────────────────────────

function BenchmarkFields({ benchmark }: { benchmark?: PlatformBenchmark }) {
  const selectedRiskTags = new Set(benchmark?.risk_tags ?? []);

  return (
    <>
      <div className="grid grid-cols-3 gap-3">
        <div>
          <label className={labelClass}>Platform</label>
          <input name="platform" required className={inputClass}
            defaultValue={benchmark?.platform} placeholder="e.g. TikTok" />
        </div>
        <div>
          <label className={labelClass}>Format</label>
          <input name="format" required className={inputClass}
            defaultValue={benchmark?.format} placeholder="e.g. In-feed video" />
        </div>
        <div>
          <label className={labelClass}>Asset Type</label>
          <input name="asset_type" required className={inputClass}
            defaultValue={benchmark?.asset_type} placeholder="e.g. Final cut, UGC-style" />
        </div>
      </div>

      <div>
        <label className={labelClass}>Campaign Objective (optional)</label>
        <input name="campaign_objective" className={inputClass}
          defaultValue={benchmark?.campaign_objective ?? ""}
          placeholder="Only if it changes which guidance applies" />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelClass}>Market</label>
          <select name="market_code" className={inputClass} defaultValue={benchmark?.market_code ?? ""}>
            <option value="">— Not market-specific —</option>
            {MARKET_CODE_OPTIONS.map((m) => (
              <option key={m.code} value={m.code}>{m.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelClass}>Market Applicability</label>
          <select name="market_applicability" required className={inputClass}
            defaultValue={benchmark?.market_applicability ?? "proxy_needs_validation"}>
            {MARKET_APPLICABILITY_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelClass}>Source Type</label>
          <select name="source_type" required className={inputClass}
            defaultValue={benchmark?.source_type ?? "platform_creative_guidance"}>
            {SOURCE_TYPE_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelClass}>Confidence Level</label>
          <select name="confidence_level" required className={inputClass}
            defaultValue={benchmark?.confidence_level ?? "medium"}>
            {CONFIDENCE_LEVEL_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelClass}>Source Title</label>
          <input name="source_title" required className={inputClass}
            defaultValue={benchmark?.source_title} placeholder="e.g. TikTok For Business — Creative Best Practices" />
        </div>
        <div>
          <label className={labelClass}>Source URL (optional)</label>
          <input name="source_url" type="url" className={inputClass}
            defaultValue={benchmark?.source_url ?? ""} placeholder="https://..." />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelClass}>Captured On</label>
          <input name="captured_on" type="date" required className={inputClass}
            defaultValue={benchmark?.captured_on?.slice(0, 10)} />
        </div>
        <div>
          <label className={labelClass}>Staleness Window (days, optional)</label>
          <input name="staleness_window_days" type="number" min={1} className={inputClass}
            defaultValue={benchmark?.staleness_window_days ?? ""}
            placeholder="e.g. 180" />
        </div>
      </div>

      <div>
        <label className={labelClass}>Guidance / Benchmark</label>
        <textarea name="guidance_or_benchmark" required rows={3} className={inputClass}
          defaultValue={benchmark?.guidance_or_benchmark ?? ""}
          placeholder="What the source actually says — the guidance or number itself" />
      </div>

      <div>
        <label className={labelClass}>Strategic Implication</label>
        <textarea name="strategic_implication" required rows={3} className={inputClass}
          defaultValue={benchmark?.strategic_implication ?? ""}
          placeholder="What this means for a strategist diagnosing an asset — never a performance promise" />
      </div>

      <div>
        <label className={labelClass}>Risk Tags</label>
        <div className="grid grid-cols-2 gap-1.5 border border-neutral-200 rounded-lg p-3">
          {RISK_TAG_OPTIONS.map((tag) => (
            <label key={tag.value} className="flex items-center gap-2 text-xs text-neutral-600">
              <input type="checkbox" name="risk_tags" value={tag.value}
                defaultChecked={selectedRiskTags.has(tag.value)} />
              {tag.label}
            </label>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelClass}>What to check in the asset (optional)</label>
          <textarea name="what_to_check_in_asset" rows={2} className={inputClass}
            defaultValue={benchmark?.what_to_check_in_asset ?? ""} />
        </div>
        <div>
          <label className={labelClass}>What not to claim (optional)</label>
          <textarea name="what_not_to_claim" rows={2} className={inputClass}
            defaultValue={benchmark?.what_not_to_claim ?? ""} />
        </div>
      </div>
    </>
  );
}

// ─── Create form ──────────────────────────────────────────────────────────────

function CreateBenchmarkForm({ onClose }: { onClose: () => void }) {
  return (
    <Card>
      <p className="text-xs font-bold text-neutral-500 uppercase tracking-widest mb-3">New Benchmark Entry</p>
      <form action={createPlatformBenchmark} className="space-y-3">
        <BenchmarkFields />
        <div className="flex gap-2">
          <button type="submit" className={buttonClass}>Add Entry</button>
          <button type="button" onClick={onClose} className={buttonSecondaryClass}>Cancel</button>
        </div>
      </form>
    </Card>
  );
}

// ─── Row card ─────────────────────────────────────────────────────────────────

function BenchmarkCard({ benchmark: b }: { benchmark: PlatformBenchmark }) {
  const [editing, setEditing] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const toggleAction = togglePlatformBenchmarkActive.bind(null, b.id, !b.is_active);
  const updateAction = updatePlatformBenchmark.bind(null, b.id);
  const deleteAction = deletePlatformBenchmark.bind(null, b.id);

  const stale = isBenchmarkStale(b.captured_on, b.staleness_window_days);
  const overdue = daysOverdue(b.captured_on, b.staleness_window_days);

  return (
    <Card className={b.is_active ? "" : "opacity-50"}>
      {!editing ? (
        <>
          <div className="flex items-start justify-between gap-3 mb-2">
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="font-semibold text-neutral-900">{b.platform} · {b.format}</h2>
                <Badge tone={sourceTypeTone(b.source_type)}>{displaySourceType(b.source_type)}</Badge>
                <Badge tone={marketApplicabilityTone(b.market_applicability)}>
                  {displayMarketApplicability(b.market_applicability)}
                  {b.market_code ? ` — ${b.market_code}` : ""}
                </Badge>
                <Badge tone={confidenceTone(b.confidence_level)}>{b.confidence_level} confidence</Badge>
                {!b.is_active && <Badge tone="neutral">Archived</Badge>}
                {stale && b.is_active && (
                  <Badge tone="red">Stale — {overdue}d overdue</Badge>
                )}
              </div>
              <p className="text-xs text-neutral-400 mt-1">
                {b.asset_type}
                {b.campaign_objective ? ` · ${b.campaign_objective}` : ""}
                {" · captured "}{b.captured_on?.slice(0, 10)}
                {b.staleness_window_days ? ` · reviewed every ${b.staleness_window_days}d` : ""}
              </p>
            </div>

            <div className="flex items-center gap-2 shrink-0 flex-wrap justify-end">
              <button onClick={() => setEditing(true)}
                className="text-xs text-neutral-400 hover:text-neutral-700 px-2 py-1">
                Edit
              </button>
              <form action={toggleAction}>
                <button type="submit" className={buttonSecondaryClass}>
                  {b.is_active ? "Archive" : "Restore"}
                </button>
              </form>
              <form action={deleteAction}
                onSubmit={(e) => { if (!confirm(`Delete this entry ("${b.source_title}")? This can't be undone.`)) e.preventDefault(); }}>
                <button type="submit" className="text-xs text-red-500 hover:text-red-700 px-2 py-1">
                  Delete
                </button>
              </form>
            </div>
          </div>

          <p className="text-xs text-neutral-500 mb-1">
            <span className="font-medium text-neutral-600">Source:</span>{" "}
            {b.source_url ? (
              <a href={b.source_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                {b.source_title}
              </a>
            ) : b.source_title}
          </p>

          <button onClick={() => setExpanded((v) => !v)} className="text-xs text-neutral-400 hover:text-neutral-700 mb-2">
            {expanded ? "Hide detail ▲" : "Show detail ▼"}
          </button>

          {expanded && (
            <div className="space-y-2 border-t border-neutral-100 pt-2">
              <div>
                <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest mb-1">Guidance / Benchmark</p>
                <p className="text-sm text-neutral-600 leading-relaxed">{b.guidance_or_benchmark}</p>
              </div>
              <div>
                <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest mb-1">Strategic Implication</p>
                <p className="text-sm text-neutral-600 leading-relaxed">{b.strategic_implication}</p>
              </div>
              {b.risk_tags.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {b.risk_tags.map((t) => (
                    <Badge key={t} tone="amber">{RISK_TAG_OPTIONS.find((o) => o.value === t)?.label ?? t}</Badge>
                  ))}
                </div>
              )}
              {b.what_to_check_in_asset && (
                <div className="rounded-lg bg-blue-50 border border-blue-100 px-3 py-2.5">
                  <p className="text-[10px] font-bold text-blue-600 uppercase tracking-widest mb-1">What to check in the asset</p>
                  <p className="text-xs text-blue-800 leading-relaxed">{b.what_to_check_in_asset}</p>
                </div>
              )}
              {b.what_not_to_claim && (
                <div className="rounded-lg bg-amber-50 border border-amber-100 px-3 py-2.5">
                  <p className="text-[10px] font-bold text-amber-600 uppercase tracking-widest mb-1">What not to claim</p>
                  <p className="text-xs text-amber-800 leading-relaxed">{b.what_not_to_claim}</p>
                </div>
              )}
            </div>
          )}
        </>
      ) : (
        <form action={updateAction} className="space-y-3">
          <BenchmarkFields benchmark={b} />
          <div className="flex gap-2">
            <button type="submit" className={buttonClass}>Save</button>
            <button type="button" onClick={() => setEditing(false)} className={buttonSecondaryClass}>Cancel</button>
          </div>
        </form>
      )}
    </Card>
  );
}

// ─── Filters ──────────────────────────────────────────────────────────────────

type StatusFilter = "active" | "archived" | "all";

function uniqueSorted(values: (string | null)[]): string[] {
  return Array.from(new Set(values.filter((v): v is string => !!v))).sort();
}

// ─── Main export ──────────────────────────────────────────────────────────────

export function PlatformBenchmarksClient({
  benchmarks,
  dbError,
  serverError,
}: {
  benchmarks: PlatformBenchmark[];
  dbError?: string;
  serverError?: string;
}) {
  const [showCreate, setShowCreate] = useState(false);
  const [search, setSearch] = useState("");
  const [filterPlatform, setFilterPlatform] = useState("");
  const [filterFormat, setFilterFormat] = useState("");
  const [filterMarket, setFilterMarket] = useState("");
  const [filterSourceType, setFilterSourceType] = useState("");
  const [filterApplicability, setFilterApplicability] = useState("");
  const [filterStatus, setFilterStatus] = useState<StatusFilter>("active");

  const platformOptions = useMemo(() => uniqueSorted(benchmarks.map((b) => b.platform)), [benchmarks]);
  const formatOptions = useMemo(() => uniqueSorted(benchmarks.map((b) => b.format)), [benchmarks]);
  const marketOptions = useMemo(() => uniqueSorted(benchmarks.map((b) => b.market_code)), [benchmarks]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return benchmarks.filter((b) => {
      if (filterStatus === "active" && !b.is_active) return false;
      if (filterStatus === "archived" && b.is_active) return false;
      if (filterPlatform && b.platform !== filterPlatform) return false;
      if (filterFormat && b.format !== filterFormat) return false;
      if (filterMarket && b.market_code !== filterMarket) return false;
      if (filterSourceType && b.source_type !== filterSourceType) return false;
      if (filterApplicability && b.market_applicability !== filterApplicability) return false;
      if (q) {
        const haystack = [
          b.platform, b.format, b.asset_type, b.campaign_objective,
          b.source_title, b.guidance_or_benchmark, b.strategic_implication,
        ].filter(Boolean).join(" ").toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });
  }, [benchmarks, search, filterPlatform, filterFormat, filterMarket, filterSourceType, filterApplicability, filterStatus]);

  const staleActiveCount = benchmarks.filter((b) => b.is_active && isBenchmarkStale(b.captured_on, b.staleness_window_days)).length;

  return (
    <div className="max-w-3xl space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest mb-1">Reference Library</p>
          <h1 className="text-2xl font-bold tracking-tight text-neutral-900">Platform Benchmarks</h1>
          <p className="text-sm text-neutral-500 mt-1 max-w-xl">
            Manual, dated reference bank of platform / format / market guidance and benchmarks.
            Internal only. No AI diagnosis reads this yet — that connection is future work.
          </p>
        </div>
        <button onClick={() => setShowCreate((v) => !v)} className={buttonClass}>
          + New Entry
        </button>
      </div>

      <ErrorBanner message={serverError ?? dbError} />

      {staleActiveCount > 0 && (
        <div className="rounded-lg bg-red-50 border border-red-100 px-3 py-2.5">
          <p className="text-xs text-red-700">
            {staleActiveCount} active {staleActiveCount === 1 ? "entry is" : "entries are"} past its staleness window.
            Review and update or archive.
          </p>
        </div>
      )}

      {showCreate && <CreateBenchmarkForm onClose={() => setShowCreate(false)} />}

      {/* Filters */}
      <Card>
        <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest mb-3">Filters</p>
        <div className="space-y-2">
          <input
            className={inputClass}
            placeholder="Search platform, format, source, guidance..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <div className="grid grid-cols-3 gap-2">
            <select className={inputClass} value={filterPlatform} onChange={(e) => setFilterPlatform(e.target.value)}>
              <option value="">All platforms</option>
              {platformOptions.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
            <select className={inputClass} value={filterFormat} onChange={(e) => setFilterFormat(e.target.value)}>
              <option value="">All formats</option>
              {formatOptions.map((f) => <option key={f} value={f}>{f}</option>)}
            </select>
            <select className={inputClass} value={filterMarket} onChange={(e) => setFilterMarket(e.target.value)}>
              <option value="">All markets</option>
              {marketOptions.map((m) => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <select className={inputClass} value={filterSourceType} onChange={(e) => setFilterSourceType(e.target.value)}>
              <option value="">All source types</option>
              {SOURCE_TYPE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
            <select className={inputClass} value={filterApplicability} onChange={(e) => setFilterApplicability(e.target.value)}>
              <option value="">All applicability</option>
              {MARKET_APPLICABILITY_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
            <select className={inputClass} value={filterStatus} onChange={(e) => setFilterStatus(e.target.value as StatusFilter)}>
              <option value="active">Active only</option>
              <option value="archived">Archived only</option>
              <option value="all">All</option>
            </select>
          </div>
        </div>
      </Card>

      <div className="space-y-3">
        <SectionTitle>
          {filterStatus === "active" ? "Active Entries" : filterStatus === "archived" ? "Archived Entries" : "All Entries"} ({filtered.length})
        </SectionTitle>

        {filtered.length === 0 && !dbError && (
          <Card>
            <p className="text-sm text-neutral-500">
              {benchmarks.length === 0
                ? "No entries yet. Add a real, source-and-date-verified entry above — this library only ever holds real, curated sources, never placeholder data."
                : "No entries match the current filters."}
            </p>
          </Card>
        )}

        {filtered.map((b) => <BenchmarkCard key={b.id} benchmark={b} />)}
      </div>
    </div>
  );
}
