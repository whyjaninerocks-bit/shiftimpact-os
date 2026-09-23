import { Badge, Card } from "@/app/_components/ui";
import type { BrandCommerceSignalReadAgencySafe } from "@/lib/data";
import type { CreativeFormatReadRun } from "@/lib/types";

// ─── Module status — v0.1 display states only ───────────────────────────────
// This is a DISPLAY status shown to the agency user. It is not entitlement
// or access control, not a subscription tier, and not real gating of any
// kind — every module on this page is reachable by anyone who can reach
// this route today (no login wall in v1, consistent with every other
// internal OS page). Replace later with a real campaign/client module
// entitlement model when one exists.
export type ModuleStatus =
  | "active"
  | "agency_preview"
  | "available_add_on"
  | "requires_client_data"
  | "pilot_simulation";

const STATUS_LABEL: Record<ModuleStatus, string> = {
  active: "Active",
  agency_preview: "Agency Preview",
  available_add_on: "Available Add-On",
  requires_client_data: "Requires Client Data",
  pilot_simulation: "Pilot Simulation",
};

const STATUS_TONE: Record<ModuleStatus, "green" | "blue" | "neutral" | "amber" | "purple"> = {
  active: "green",
  agency_preview: "blue",
  available_add_on: "neutral",
  requires_client_data: "amber",
  pilot_simulation: "purple",
};

export function ModuleStatusBadge({ status }: { status: ModuleStatus }) {
  return <Badge tone={STATUS_TONE[status]}>{STATUS_LABEL[status]}</Badge>;
}

// ─── Module status summary (top-of-page activation strip) ───────────────────

export type ModuleSummaryRow = { label: string; status: ModuleStatus; href: string };

export function ModuleStatusSummary({ rows }: { rows: ModuleSummaryRow[] }) {
  return (
    <Card>
      <div className="text-xs font-medium text-neutral-500 uppercase tracking-wide mb-3">
        Module Status
      </div>
      <div className="flex flex-wrap gap-2">
        {rows.map((row) => (
          <a
            key={row.label}
            href={row.href}
            className="inline-flex items-center gap-2 rounded-md border border-neutral-200 px-2.5 py-1.5 text-sm hover:bg-neutral-50"
          >
            <span className="text-neutral-800">{row.label}</span>
            <ModuleStatusBadge status={row.status} />
          </a>
        ))}
      </div>
      <p className="mt-3 text-xs text-neutral-400">
        Status reflects what this campaign currently has attached — not a subscription or entitlement system.
      </p>
    </Card>
  );
}

// ─── Creative Intelligence Summary Card ──────────────────────────────────────

export function CreativeIntelligenceCard({
  reads,
  hasCulturalRadar,
  hasBrandCommerce,
}: {
  reads: CreativeFormatReadRun[];
  hasCulturalRadar: boolean;
  hasBrandCommerce: boolean;
}) {
  const latest = reads[0] ?? null;
  const status: ModuleStatus = latest ? "agency_preview" : "available_add_on";

  return (
    <Card id="creative-intelligence">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-base font-semibold">Creative Intelligence</h3>
        <ModuleStatusBadge status={status} />
      </div>
      <p className="text-sm text-neutral-600 mb-3">
        Does this asset do what the strategy needs it to do?
      </p>

      {!latest ? (
        <div className="rounded-md bg-neutral-50 border border-neutral-200 p-3 text-sm text-neutral-600">
          No Creative Format Read has been run for this campaign yet. Creative Intelligence diagnoses
          a specific asset or proposed format against the campaign&apos;s own stated strategy and craft
          principles &mdash; it is not a score, a prediction, or an automated video analysis. Run a read
          from the campaign workspace to see it appear here.
        </div>
      ) : (
        <div className="space-y-3">
          <div className="text-sm text-neutral-800">
            <span className="font-medium">Asset:</span> {latest.asset_description}
          </div>
          {latest.strategist_summary && (
            <p className="text-sm text-neutral-700">{latest.strategist_summary}</p>
          )}
          <div className="text-xs text-neutral-500">
            {latest.output_dimensions.length} dimension{latest.output_dimensions.length === 1 ? "" : "s"} diagnosed. Not auto-scored.
          </div>
        </div>
      )}

      <div className="mt-3 pt-3 border-t border-neutral-100 space-y-1 text-xs text-neutral-500">
        {!hasCulturalRadar && <div>Cultural evidence not included in this read.</div>}
        {!hasBrandCommerce && <div>No Brand-Commerce context attached to this read.</div>}
      </div>
    </Card>
  );
}

// ─── Brand-Commerce Signal Read Module ───────────────────────────────────────

const CLASSIFICATION_READ_PHRASE: Record<string, string> = {
  brand_builder: "building brand meaning",
  commerce_mover: "moving commerce",
  promo_extractor: "leaning on promotion",
  brand_risk: "creating brand risk",
  conversion_blocked: "facing conversion blockage",
  inefficient_activity: "creating activity without clear brand or commerce movement",
};

const EVIDENCE_BADGE_LABEL: Record<string, string> = {
  direct_evidence: "Directly observed",
  inference: "Evidence suggests",
  insufficient_evidence: "Insufficient evidence",
};

export function BrandCommerceModuleCard({
  read,
}: {
  read: BrandCommerceSignalReadAgencySafe;
}) {
  const status: ModuleStatus = read ? "agency_preview" : "available_add_on";

  return (
    <Card id="brand-commerce">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-base font-semibold">Brand-Commerce Signal Read</h3>
        <ModuleStatusBadge status={status} />
      </div>

      {!read ? (
        <p className="text-sm text-neutral-600">
          No reviewed Brand-Commerce diagnostic exists for this campaign yet. This module reads whether
          a campaign is building brand meaning or moving commerce &mdash; it is a strategist-set
          classification, never auto-scored.
        </p>
      ) : (
        <div className="space-y-3">
          <div className="text-sm text-neutral-800">
            This campaign reads as{" "}
            <span className="font-semibold">
              {read.classification ? CLASSIFICATION_READ_PHRASE[read.classification] ?? read.classification : "not yet classified"}
            </span>
            .
          </div>
          {read.evidence_confidence && (
            <Badge tone="neutral">{EVIDENCE_BADGE_LABEL[read.evidence_confidence] ?? read.evidence_confidence}</Badge>
          )}
          <p className="text-sm text-neutral-700">{read.classification_rationale}</p>

          {read.strengthen_next.length > 0 && (
            <div>
              <div className="text-xs font-medium text-neutral-500 uppercase tracking-wide mb-1">
                Would Strengthen Next
              </div>
              <ul className="list-disc list-inside text-sm text-neutral-700 space-y-0.5">
                {read.strengthen_next.map((note, i) => (
                  <li key={i}>{note}</li>
                ))}
              </ul>
            </div>
          )}

          {read.sources.length > 0 && (
            <div>
              <div className="text-xs font-medium text-neutral-500 uppercase tracking-wide mb-1">Sources</div>
              <div className="flex flex-wrap gap-1.5">
                {read.sources.map((s, i) => (
                  <Badge key={i} tone="neutral">
                    {s.title}
                    {s.evidence_confidence ? ` — ${EVIDENCE_BADGE_LABEL[s.evidence_confidence] ?? s.evidence_confidence}` : ""}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          <p className="text-xs text-neutral-400">Not auto-scored. Strategist classification, evidence-informed.</p>
        </div>
      )}
    </Card>
  );
}

// ─── Cultural Radar Module ────────────────────────────────────────────────────

export function CulturalRadarModuleCard({ hasData }: { hasData: boolean }) {
  const status: ModuleStatus = hasData ? "active" : "available_add_on";
  return (
    <Card id="cultural-radar">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-base font-semibold">Cultural Radar</h3>
        <ModuleStatusBadge status={status} />
      </div>
      {!hasData ? (
        <p className="text-sm text-neutral-600">
          No cultural signal assessment is attached to this campaign yet. Cultural evidence not included
          in any read on this page until one is added.
        </p>
      ) : (
        <p className="text-sm text-neutral-600">
          Cultural signal evidence is attached to this campaign. See the full read on the campaign
          workspace or agency portal.
        </p>
      )}
    </Card>
  );
}

// ─── Platform Evidence (support line only) ───────────────────────────────────

export function PlatformEvidenceCard({ hasBenchmarks }: { hasBenchmarks: boolean }) {
  return (
    <Card id="platform-evidence">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-base font-semibold">Platform Evidence</h3>
        <ModuleStatusBadge status="available_add_on" />
      </div>
      <p className="text-sm text-neutral-600">
        {hasBenchmarks
          ? "Platform benchmark references exist in the internal library and can support reads on this page as supporting citations, not standalone scores."
          : "Platform benchmark references are a supporting citation layer, not a standalone score or dashboard. None are currently cited on this campaign."}
      </p>
    </Card>
  );
}

// ─── Learning Memory (support line only) ─────────────────────────────────────

export function LearningMemoryCard({ hasRecord }: { hasRecord: boolean }) {
  return (
    <Card id="learning-memory">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-base font-semibold">Learning Memory</h3>
        <ModuleStatusBadge status={hasRecord ? "agency_preview" : "available_add_on"} />
      </div>
      <p className="text-sm text-neutral-600">
        {hasRecord
          ? "Informed by past learning captured for this campaign. This is an end-of-campaign snapshot for this one campaign, not yet a browsable cross-campaign learning library."
          : "No prior reviewed learning attached yet."}
      </p>
    </Card>
  );
}

// ─── Pilot Simulation cards — Brand Power Threshold & Promotion Dependency ───
// Static, next-layer placeholder content only. No backend, no scoring logic.

export type PilotSimulationCopy = {
  title: string;
  question: string;
  currentRead: string;
  dataNeeded: string;
  pilotWouldDefine: string;
  doNotClaim: string;
  honestyLine: string;
};

export function PilotSimulationCard({ copy }: { copy: PilotSimulationCopy }) {
  return (
    <Card id={copy.title.toLowerCase().replace(/\s+/g, "-")}>
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-base font-semibold">{copy.title}</h3>
        <ModuleStatusBadge status="pilot_simulation" />
      </div>
      <div className="space-y-2.5 text-sm">
        <div>
          <div className="text-xs font-medium text-neutral-500 uppercase tracking-wide">Question</div>
          <p className="text-neutral-700">{copy.question}</p>
        </div>
        <div>
          <div className="text-xs font-medium text-neutral-500 uppercase tracking-wide">Current Live Read</div>
          <p className="text-neutral-700">{copy.currentRead}</p>
        </div>
        <div>
          <div className="text-xs font-medium text-neutral-500 uppercase tracking-wide">Data Needed</div>
          <p className="text-neutral-700">{copy.dataNeeded}</p>
        </div>
        <div>
          <div className="text-xs font-medium text-neutral-500 uppercase tracking-wide">A Pilot Would Define</div>
          <p className="text-neutral-700">{copy.pilotWouldDefine}</p>
        </div>
        <div className="pt-2 border-t border-neutral-100">
          <div className="text-xs font-medium text-red-500 uppercase tracking-wide">Do Not Claim</div>
          <p className="text-neutral-600">{copy.doNotClaim}</p>
        </div>
        <p className="text-xs text-neutral-400 italic">{copy.honestyLine}</p>
      </div>
    </Card>
  );
}

// ─── Future Integration Note ─────────────────────────────────────────────────

export function FutureIntegrationNote() {
  return (
    <div className="text-xs text-neutral-400 border-t border-neutral-100 pt-4 mt-2">
      This view is the standalone Agency Intelligence mode. It is designed to later sit alongside a
      Marketing Effectiveness mode and a Client Release mode inside a single Agency Workspace shell
      &mdash; that shell does not exist yet and is not built here. No tab switcher, entitlement model,
      or navigation between modes has been added by this build.
    </div>
  );
}
