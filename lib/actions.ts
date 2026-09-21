"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendBriefNotification } from "@/lib/email";
import { assertInternalSession, assertShiftImpactSession } from "@/lib/auth/require-session";
import { computeConfidenceLabel, validateSignalMapKeys } from "@/lib/signal-maps";
import { isValidMarketCode } from "@/lib/cultural-signal-picker";
import {
  isValidMarketApplicability,
  isValidSourceType,
  isValidConfidenceLevel,
  sanitizeRiskTags,
} from "@/lib/platform-benchmarks";
import type {
  CategoryAttribute,
  CampaignPhase,
  MapStatus,
  BrandCommerceClassification,
  StrategicBasisTargetType,
  StrategicBasisSourceType,
  StrategicBasisSource,
  SynthesisRoute,
  SynthesisReviewStatus,
  ExternalReviewerAccessLevel,
} from "@/lib/types";

const BRAND_COMMERCE_CLASSIFICATION_VALUES: BrandCommerceClassification[] = [
  "not_classified",
  "brand_builder",
  "commerce_mover",
  "promo_extractor",
  "brand_risk",
  "inefficient_activity",
  "conversion_blocked",
];
import type { ComplianceStatus } from "@/lib/data";

function str(formData: FormData, key: string): string {
  return (formData.get(key) as string | null) ?? "";
}

function numOrNull(formData: FormData, key: string): number | null {
  const v = formData.get(key) as string | null;
  if (v === null || v.trim() === "") return null;
  const n = Number(v);
  return Number.isNaN(n) ? null : n;
}

function dateOrNull(formData: FormData, key: string): string | null {
  const v = formData.get(key) as string | null;
  return v && v.trim() !== "" ? v : null;
}

// ───────────────────────────────────────────────────────────────────────
// Clients
// ───────────────────────────────────────────────────────────────────────

// Default channels seeded for every new client
const DEFAULT_CHANNELS = [
  { channel_name: "Digital / Social", channel_category: "DIGITAL", translation_hint: "Platform-native brand mechanics." },
  { channel_name: "KOL / Influencer",  channel_category: "KOL",     translation_hint: "Creator-native storytelling." },
  { channel_name: "PR / Earned Media", channel_category: "PR",      translation_hint: "Journalist angle, not brand angle." },
  { channel_name: "Radio",             channel_category: "RADIO",   translation_hint: "Audio-only hook. Human tension in 15 seconds." },
  { channel_name: "Retail / In-Store", channel_category: "RETAIL",  translation_hint: "Last-mile conversion trigger." },
];

// Default signal sources seeded for every new client
const DEFAULT_SIGNAL_SOURCES = [
  { source_name: "TikTok Save Rate",                   source_type: "social",        unit: "%",     description: "Hero content saves as % of views — primary Demand signal" },
  { source_name: "TikTok Share Rate",                  source_type: "social",        unit: "%",     description: "Shares as % of views — secondary virality signal" },
  { source_name: "Google Search Intent",               source_type: "behavioral",    unit: "%",     description: "Search volume lift vs baseline for category/brand terms" },
  { source_name: "Google Search Console (Branded)",    source_type: "behavioral",    unit: "%",     description: "Branded search volume movement from Google Search Console" },
  { source_name: "Meta ROAS",                          source_type: "quantitative",  unit: "x",     description: "Return on ad spend from Meta campaigns" },
  { source_name: "TikTok Shop CTR",                    source_type: "quantitative",  unit: "%",     description: "Click-through rate on TikTok Shop product links" },
  { source_name: "TikTok Shop CVR",                    source_type: "quantitative",  unit: "%",     description: "Conversion rate on TikTok Shop (clicks to purchase)" },
  { source_name: "Cart Abandonment Rate",              source_type: "quantitative",  unit: "%",     description: "Shopping cart abandonment rate — lower is better" },
  { source_name: "Repeat Purchase Rate (60-day)",      source_type: "quantitative",  unit: "%",     description: "Customers who repurchased within 60 days" },
  { source_name: "Organic UGC Volume",                 source_type: "social",        unit: "#",     description: "Volume of organic user-generated content mentioning brand" },
  { source_name: "NPS Score",                          source_type: "qualitative",   unit: "score", description: "Net Promoter Score from post-purchase survey" },
  { source_name: "In-Store Footfall Lift",             source_type: "behavioral",    unit: "%",     description: "Store footfall lift vs baseline period" },
  { source_name: "Loyalty App Opens",                  source_type: "behavioral",    unit: "%",     description: "Loyalty app open rate during campaign period" },
];

export async function createClient(formData: FormData) {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("clients")
    .insert({
      name: str(formData, "name"),
      industry_profile: str(formData, "industry_profile"),
      business_outcome_label: str(formData, "business_outcome_label") || "Business Outcome",
      retention_metric_label: str(formData, "retention_metric_label") || "Retention Metric",
      contact_name: str(formData, "contact_name") || null,
      contact_email: str(formData, "contact_email") || null,
      client_type: str(formData, "client_type") || "brand",
    })
    .select("id")
    .single();

  if (error) {
    redirect(`/clients?error=${encodeURIComponent(error.message)}`);
  }

  const clientId = data.id;

  // Auto-seed standard channels
  await supabase.from("client_channels").insert(
    DEFAULT_CHANNELS.map(ch => ({ client_id: clientId, ...ch }))
  );

  // Auto-seed signal sources
  await supabase.from("client_signal_sources").insert(
    DEFAULT_SIGNAL_SOURCES.map(src => ({ client_id: clientId, ...src }))
  );

  revalidatePath("/clients");
  redirect(`/clients/${clientId}`);
}

export async function updateClient(clientId: string, formData: FormData) {
  const supabase = createAdminClient();
  const { error } = await supabase
    .from("clients")
    .update({
      name: str(formData, "name"),
      industry_profile: str(formData, "industry_profile"),
      business_outcome_label: str(formData, "business_outcome_label") || "Business Outcome",
      retention_metric_label: str(formData, "retention_metric_label") || "Retention Metric",
      contact_name: str(formData, "contact_name") || null,
      contact_email: str(formData, "contact_email") || null,
      // Signal automation config (Migration 0066)
      primary_hashtag:   str(formData, "primary_hashtag")   || null,
      brand_search_term: str(formData, "brand_search_term") || null,
      tiktok_handle:     str(formData, "tiktok_handle")     || null,
      ga4_property_id:   str(formData, "ga4_property_id")   || null,
    })
    .eq("id", clientId);

  if (error) {
    redirect(`/clients/${clientId}?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath(`/clients/${clientId}`);
  revalidatePath("/clients");
  redirect(`/clients/${clientId}`);
}

export async function deleteClient(clientId: string) {
  const supabase = createAdminClient();
  await supabase.from("clients").delete().eq("id", clientId);
  revalidatePath("/clients");
  redirect("/clients");
}

// ───────────────────────────────────────────────────────────────────────
// Campaigns
// ───────────────────────────────────────────────────────────────────────

export async function createCampaign(formData: FormData) {
  const supabase = createAdminClient();
  const clientId = str(formData, "client_id");

  const { data: campaign, error } = await supabase
    .from("campaigns")
    .insert({
      client_id: clientId,
      team_member_id: str(formData, "team_member_id") || null,
      name: str(formData, "name"),
    })
    .select("id")
    .single();

  if (error) {
    redirect(`/clients/${clientId}?error=${encodeURIComponent(error.message)}`);
  }

  // One FRAME Brief per campaign (Draft, defaults)
  const { error: frameError } = await supabase
    .from("frame_briefs")
    .insert({ campaign_id: campaign.id });

  if (frameError) {
    redirect(`/campaigns/${campaign.id}?error=${encodeURIComponent(frameError.message)}`);
  }

  // One Big Idea Platform per campaign (Draft, defaults) — FIXED 4 Sept 2026: this insert
  // was missing entirely, so every campaign created since migration 0005's one-time backfill
  // had no big_idea_platforms row. The campaign page only renders BigIdeaPlatformSection and
  // IqEvaluateSection when `bip` is non-null (`{bip && <BigIdeaPlatformSection .../>}`), so for
  // every affected campaign those two sections silently never appeared — no error, just an
  // invisible "Big Idea Platform" nav link that scrolled to nothing. Mirrors the frame_briefs
  // insert above.
  const { error: bipError } = await supabase
    .from("big_idea_platforms")
    .insert({ campaign_id: campaign.id });

  if (bipError) {
    redirect(`/campaigns/${campaign.id}?error=${encodeURIComponent(bipError.message)}`);
  }

  // Instantiate the Phase Gates from Gate Templates (5 as of 4 Sept 2026 — Nurture added)
  const { data: templates, error: templatesError } = await supabase
    .from("gate_templates")
    .select("id, gate_type, sequence_order, required_signal_template")
    .order("sequence_order");

  if (templatesError) {
    redirect(`/campaigns/${campaign.id}?error=${encodeURIComponent(templatesError.message)}`);
  }

  const gateRows = (templates ?? []).map((t) => ({
    campaign_id: campaign.id,
    gate_template_id: t.id,
    gate_type: t.gate_type,
    sequence_order: t.sequence_order,
    required_signal: t.required_signal_template,
  }));

  if (gateRows.length > 0) {
    const { error: gatesError } = await supabase.from("phase_gates").insert(gateRows);
    if (gatesError) {
      redirect(`/campaigns/${campaign.id}?error=${encodeURIComponent(gatesError.message)}`);
    }
  }

  revalidatePath(`/clients/${clientId}`);
  revalidatePath("/");
  redirect(`/campaigns/${campaign.id}`);
}

export async function updateCampaign(campaignId: string, formData: FormData) {
  const supabase = createAdminClient();

  // Stage 4A.3 — primary_market_code. Blank/not-set stays null (never
  // required, never blocks campaign setup). A non-blank value must be one
  // of the approved codes — validated against the same MARKET_CODE_OPTIONS
  // list the <select> in CampaignInfoSection.tsx renders from, since there
  // is no DB CHECK constraint on this column by design (Stage 4A.3
  // approval: app-level validation only, so a future market is a code
  // change, not a migration).
  const rawMarketCode = str(formData, "primary_market_code").trim();
  if (rawMarketCode && !isValidMarketCode(rawMarketCode)) {
    redirect(`/campaigns/${campaignId}?error=${encodeURIComponent(`Invalid market code: ${rawMarketCode}`)}`);
  }
  const primaryMarketCode = rawMarketCode || null;

  const { error } = await supabase
    .from("campaigns")
    .update({
      name: str(formData, "name"),
      team_member_id: str(formData, "team_member_id") || null,
      current_phase: str(formData, "current_phase"),
      confidence_score: numOrNull(formData, "confidence_score") ?? 0,
      gate_signal_status: str(formData, "gate_signal_status"),
      operating_notes: str(formData, "operating_notes"),
      last_review_date: dateOrNull(formData, "last_review_date"),
      business_outcome_target: numOrNull(formData, "business_outcome_target"),
      business_outcome_actual: numOrNull(formData, "business_outcome_actual"),
      retention_metric_target: numOrNull(formData, "retention_metric_target"),
      retention_metric_actual: numOrNull(formData, "retention_metric_actual"),
      status: str(formData, "status"),
      primary_market_code: primaryMarketCode,
    })
    .eq("id", campaignId);

  if (error) {
    redirect(`/campaigns/${campaignId}?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath(`/campaigns/${campaignId}`);
  revalidatePath("/");
  redirect(`/campaigns/${campaignId}`);
}

// ───────────────────────────────────────────────────────────────────────
// FRAME Briefs
// ───────────────────────────────────────────────────────────────────────

export async function updateFrameBrief(campaignId: string, frameBriefId: string, formData: FormData) {
  const supabase = createAdminClient();
  const { error } = await supabase
    .from("frame_briefs")
    .update({
      // ── Core FRAME 5 fields ──
      force: str(formData, "force"),
      role: str(formData, "role"),
      anchor: str(formData, "anchor"),
      mood: str(formData, "mood"),
      expression: str(formData, "expression"),
      clarity_statement: str(formData, "clarity_statement"),

      // ── Sprint 1 additions ──
      industry_category: str(formData, "industry_category") || "FMCG",
      campaign_pathway: str(formData, "campaign_pathway") || null,
      enemy_villain: str(formData, "enemy_villain"),
      enemy_active: formData.get("enemy_active") === "true",
      primary_kpi: str(formData, "primary_kpi"),
      primary_kpi_baseline: numOrNull(formData, "primary_kpi_baseline"),
      gate_signal_commitment: str(formData, "gate_signal_commitment"),
      elevation_mode_enabled: formData.get("elevation_mode_enabled") === "true",

      // ── ICS dimension scores (1-5) ──
      ics_cultural_fit: numOrNull(formData, "ics_cultural_fit") ?? 1,
      ics_business_alignment: numOrNull(formData, "ics_business_alignment") ?? 1,
      ics_audience_tension: numOrNull(formData, "ics_audience_tension") ?? 1,
      ics_executional_coherence: numOrNull(formData, "ics_executional_coherence") ?? 1,
      ics_measurability: numOrNull(formData, "ics_measurability") ?? 1,
      ics_scalability: numOrNull(formData, "ics_scalability") ?? 1,

      // ── Feature 15 — Cultural Intelligence & Regulatory Layer ──
      primary_cultural_context: str(formData, "primary_cultural_context") || "",
      regulatory_category: str(formData, "regulatory_category") || "",
    })
    .eq("id", frameBriefId);

  if (error) {
    redirect(`/campaigns/${campaignId}?error=${encodeURIComponent(error.message)}#frame`);
  }

  revalidatePath(`/campaigns/${campaignId}`);
  redirect(`/campaigns/${campaignId}#frame`);
}

export async function setFrameLockStatus(campaignId: string, frameBriefId: string, lock: boolean) {
  const supabase = createAdminClient();
  const { error } = await supabase
    .from("frame_briefs")
    .update({
      lock_status: lock ? "Locked" : "Draft",
      locked_at: lock ? new Date().toISOString() : null,
    })
    .eq("id", frameBriefId);

  if (error) {
    redirect(`/campaigns/${campaignId}?error=${encodeURIComponent(error.message)}#frame`);
  }

  // F32: fire brief orchestration chain when brief is locked (non-blocking)
  if (lock) {
    void fireOrchestration(campaignId, "BRIEF_SUBMITTED", { source: "frame_lock", frame_brief_id: frameBriefId });

    // Sprint 9: auto-snapshot predictions on FRAME lock (non-blocking)
    void fetch(`${process.env.NEXT_PUBLIC_APP_URL ?? "https://shiftimpact-os.vercel.app"}/api/prediction-snapshot`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ campaign_id: campaignId, frame_brief_id: frameBriefId }),
    }).catch(() => { /* non-critical */ });

    // Sprint 31: fire email notifications to team member + client contact (non-blocking)
    void (async () => {
      try {
        // FIXED 4 Sept 2026 (type-error cleanup): this query selected
        // clients(name, contact_name, contact_email) and team_members(name, email) but
        // none of those columns existed on clients/team_members — every FRAME lock has
        // been silently failing to send this notification since it shipped. Migration
        // 0079 added the missing columns; this query is back to its original intended
        // shape now that they're real.
        const [campaignRes, frameRes] = await Promise.all([
          supabase
            .from("campaigns")
            .select("name, client_id, team_member_id, clients(name, contact_name, contact_email), team_members(name, email)")
            .eq("id", campaignId)
            .single(),
          supabase
            .from("frame_briefs")
            .select("anchor")
            .eq("id", frameBriefId)
            .single(),
        ]);

        const campaign = campaignRes.data;
        const frame = frameRes.data;
        if (!campaign || !frame) return;

        const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://shiftimpact-os.vercel.app";
        const briefUrl = `${baseUrl}/brief/${campaignId}`;

        // Build recipient list — only include entries with an email address
        const recipients: { name: string; email: string; role: "agency" | "client" }[] = [];

        const tm = campaign.team_members as unknown as { name: string; email: string | null } | null;
        if (tm?.email) recipients.push({ name: tm.name, email: tm.email, role: "agency" });

        const cl = campaign.clients as unknown as { name: string; contact_name: string | null; contact_email: string | null } | null;
        if (cl?.contact_email) {
          recipients.push({
            name: cl.contact_name ?? cl.name,
            email: cl.contact_email,
            role: "client",
          });
        }

        if (recipients.length === 0) return; // no emails configured yet

        await sendBriefNotification({
          campaignName: campaign.name,
          clientName: cl?.name ?? "Client",
          frameAnchor: frame.anchor,
          briefUrl,
          recipients,
        });
      } catch (e) {
        console.error("[setFrameLockStatus] email notification failed:", e);
      }
    })();
  }

  revalidatePath(`/campaigns/${campaignId}`);
  redirect(`/campaigns/${campaignId}#frame`);
}

// ───────────────────────────────────────────────────────────────────────
// Kill Switches
// ───────────────────────────────────────────────────────────────────────

export async function createKillSwitch(campaignId: string, frameBriefId: string, formData: FormData) {
  const supabase = createAdminClient();
  const metricType = str(formData, "metric_type");
  const { error } = await supabase.from("kill_switches").insert({
    frame_brief_id: frameBriefId,
    condition: str(formData, "condition"),
    trigger_status: str(formData, "trigger_status") || "Inactive",
    priority: str(formData, "priority") || "Medium",
    // Structured auto-evaluation fields — all left null/default unless a
    // metric_type is actually chosen, so a switch stays manual by default.
    metric_type: metricType || null,
    comparator: metricType ? (str(formData, "comparator") || "below") : null,
    threshold_value: metricType ? numOrNull(formData, "threshold_value") : null,
    consecutive_periods: metricType ? (numOrNull(formData, "consecutive_periods") ?? 1) : 1,
    auto_enabled: true,
  });

  if (error) {
    redirect(`/campaigns/${campaignId}?error=${encodeURIComponent(error.message)}#kill-switches`);
  }

  revalidatePath(`/campaigns/${campaignId}`);
  redirect(`/campaigns/${campaignId}#kill-switches`);
}

export async function updateKillSwitch(campaignId: string, killSwitchId: string, formData: FormData) {
  const supabase = createAdminClient();
  const newStatus   = str(formData, "trigger_status");
  const condition   = str(formData, "condition");
  const priority    = str(formData, "priority");
  const metricType  = str(formData, "metric_type");
  const autoEnabled = formData.get("auto_enabled") !== null; // checkbox present = checked

  const { error } = await supabase
    .from("kill_switches")
    .update({
      condition,
      trigger_status: newStatus,
      priority,
      metric_type: metricType || null,
      comparator: metricType ? (str(formData, "comparator") || "below") : null,
      threshold_value: metricType ? numOrNull(formData, "threshold_value") : null,
      consecutive_periods: metricType ? (numOrNull(formData, "consecutive_periods") ?? 1) : 1,
      auto_enabled: metricType ? autoEnabled : true,
    })
    .eq("id", killSwitchId);

  if (error) {
    redirect(`/campaigns/${campaignId}?error=${encodeURIComponent(error.message)}#kill-switches`);
  }

  // ── Auto Decision Snapshot when a kill switch is Triggered ────────────────
  if (newStatus === "Triggered") {
    const weekOf = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
    const snapshotLine = `[KILL SWITCH TRIGGERED — ${priority} priority] ${condition}`;

    // Check for an existing dashboard entry this week
    const { data: existing } = await supabase
      .from("campaign_dashboards")
      .select("id, decision_snapshot")
      .eq("campaign_id", campaignId)
      .eq("week_of", weekOf)
      .maybeSingle();

    if (existing) {
      // Prepend to existing decision_snapshot
      const updated = `${snapshotLine}\n\n${existing.decision_snapshot ?? ""}`.trim();
      await supabase.from("campaign_dashboards").update({ decision_snapshot: updated }).eq("id", existing.id);
    } else {
      // Create a minimal dashboard entry seeded with the kill switch note
      await supabase.from("campaign_dashboards").insert({
        campaign_id:              campaignId,
        week_of:                  weekOf,
        decision_snapshot:        snapshotLine,
        funnel_health_demand:     "Red",
        funnel_health_conversion: "Amber",
        funnel_health_retention:  "Amber",
        ssic:                     "Kill switch triggered — review immediately.",
        triggers:                 condition,
        idea_integrity_observation: "",
      });
    }
  }
  // ──────────────────────────────────────────────────────────────────────────

  revalidatePath(`/campaigns/${campaignId}`);
  redirect(`/campaigns/${campaignId}#kill-switches`);
}

export async function deleteKillSwitch(campaignId: string, killSwitchId: string) {
  const supabase = createAdminClient();
  const { error } = await supabase.from("kill_switches").delete().eq("id", killSwitchId);

  if (error) {
    redirect(`/campaigns/${campaignId}?error=${encodeURIComponent(error.message)}#kill-switches`);
  }

  revalidatePath(`/campaigns/${campaignId}`);
  redirect(`/campaigns/${campaignId}#kill-switches`);
}

// ───────────────────────────────────────────────────────────────────────
// STAGE Briefs
// ───────────────────────────────────────────────────────────────────────

export async function createStageBrief(campaignId: string, formData: FormData) {
  const supabase = createAdminClient();

  // Server-side FRAME lock guard — FRAME must be locked before any Stage Brief can be created
  const { data: frameBrief } = await supabase
    .from("frame_briefs")
    .select("lock_status")
    .eq("campaign_id", campaignId)
    .single();

  if (!frameBrief || frameBrief.lock_status !== "Locked") {
    redirect(`/campaigns/${campaignId}?error=${encodeURIComponent("Lock the FRAME Brief before creating Stage Briefs.")}#stage-briefs`);
  }

  const { error } = await supabase.from("stage_briefs").insert({
    campaign_id: campaignId,
    stage: str(formData, "stage"),
    channel: str(formData, "channel"),
    department: str(formData, "department") || null,
    brief_body: str(formData, "brief_body"),
    propagation_mechanism: str(formData, "propagation_mechanism"),
    idea_led_vs_spend_led: str(formData, "idea_led_vs_spend_led") || null,
    status: str(formData, "status") || "Draft",
  });

  if (error) {
    redirect(`/campaigns/${campaignId}?error=${encodeURIComponent(error.message)}#stage-briefs`);
  }

  revalidatePath(`/campaigns/${campaignId}`);
  redirect(`/campaigns/${campaignId}#stage-briefs`);
}

export async function updateStageBrief(campaignId: string, stageBriefId: string, formData: FormData) {
  const supabase = createAdminClient();
  const newStatus = str(formData, "status");

  // Server-side gate guard: "Live" requires the matching phase gate to be Open
  if (newStatus === "Live") {
    const { data: brief } = await supabase
      .from("stage_briefs")
      .select("stage")
      .eq("id", stageBriefId)
      .single();

    if (brief?.stage) {
      const { data: gate } = await supabase
        .from("phase_gates")
        .select("gate_decision")
        .eq("campaign_id", campaignId)
        .eq("gate_type", brief.stage)
        .single();

      if (!gate || gate.gate_decision !== "Open") {
        redirect(
          `/campaigns/${campaignId}?error=${encodeURIComponent(
            `The ${brief.stage} gate must be Open before setting this brief to Live.`
          )}#stage-briefs`
        );
      }
    }
  }

  const { error } = await supabase
    .from("stage_briefs")
    .update({
      channel: str(formData, "channel"),
      department: str(formData, "department") || null,
      brief_body: str(formData, "brief_body"),
      propagation_mechanism: str(formData, "propagation_mechanism"),
      idea_led_vs_spend_led: str(formData, "idea_led_vs_spend_led") || null,
      status: newStatus,
    })
    .eq("id", stageBriefId);

  if (error) {
    redirect(`/campaigns/${campaignId}?error=${encodeURIComponent(error.message)}#stage-briefs`);
  }

  revalidatePath(`/campaigns/${campaignId}`);
  redirect(`/campaigns/${campaignId}#stage-briefs`);
}

// ───────────────────────────────────────────────────────────────────────
// Phase Gates
// ───────────────────────────────────────────────────────────────────────

export async function updatePhaseGate(campaignId: string, gateId: string, formData: FormData) {
  const supabase = createAdminClient();
  const decision = str(formData, "gate_decision");
  const wasUndecided = str(formData, "_prev_decision") === "Pending";

  const { error } = await supabase
    .from("phase_gates")
    .update({
      required_signal: str(formData, "required_signal"),
      actual_signal_data: str(formData, "actual_signal_data"),
      gate_decision: decision,
      pre_mortem: str(formData, "pre_mortem"),
      idea_led_vs_spend_led: str(formData, "idea_led_vs_spend_led") || null,
      decided_at:
        decision !== "Pending" && wasUndecided ? new Date().toISOString() : undefined,
    })
    .eq("id", gateId);

  if (error) {
    redirect(`/campaigns/${campaignId}?error=${encodeURIComponent(error.message)}#phase-gates`);
  }

  revalidatePath(`/campaigns/${campaignId}`);
  redirect(`/campaigns/${campaignId}#phase-gates`);
}

// ───────────────────────────────────────────────────────────────────────
// Campaign Command Dashboard
// ───────────────────────────────────────────────────────────────────────

export async function createDashboardEntry(campaignId: string, formData: FormData) {
  const supabase = createAdminClient();
  const { error } = await supabase.from("campaign_dashboards").insert({
    campaign_id: campaignId,
    week_of: str(formData, "week_of"),
    decision_snapshot: str(formData, "decision_snapshot"),
    funnel_health_demand: str(formData, "funnel_health_demand") || "Green",
    funnel_health_conversion: str(formData, "funnel_health_conversion") || "Green",
    funnel_health_retention: str(formData, "funnel_health_retention") || "Green",
    business_impact_actual: numOrNull(formData, "business_impact_actual"),
    business_impact_target: numOrNull(formData, "business_impact_target"),
    ssic: str(formData, "ssic"),
    triggers: str(formData, "triggers"),
    idea_integrity_observation: str(formData, "idea_integrity_observation"),
  });

  if (error) {
    redirect(`/campaigns/${campaignId}?error=${encodeURIComponent(error.message)}#dashboard`);
  }

  revalidatePath(`/campaigns/${campaignId}`);
  redirect(`/campaigns/${campaignId}#dashboard`);
}

// ───────────────────────────────────────────────────────────────────────
// Business Outcomes Log
// ───────────────────────────────────────────────────────────────────────

export async function createBusinessOutcome(campaignId: string, formData: FormData) {
  const supabase = createAdminClient();
  const { error } = await supabase.from("business_outcomes").insert({
    campaign_id: campaignId,
    week_of: str(formData, "week_of"),
    metric_label: str(formData, "metric_label"),
    target_value: numOrNull(formData, "target_value"),
    actual_value: numOrNull(formData, "actual_value"),
    notes: str(formData, "notes"),
  });

  if (error) {
    redirect(`/campaigns/${campaignId}?error=${encodeURIComponent(error.message)}#business-outcomes`);
  }

  revalidatePath(`/campaigns/${campaignId}`);
  redirect(`/campaigns/${campaignId}#business-outcomes`);
}

// ───────────────────────────────────────────────────────────────────────
// Team
// ───────────────────────────────────────────────────────────────────────

export async function createTeamMember(formData: FormData) {
  const supabase = createAdminClient();
  const { error } = await supabase.from("team_members").insert({
    name: str(formData, "name"),
    role: str(formData, "role"),
    email: str(formData, "email") || null,
    urgent_count: numOrNull(formData, "urgent_count") ?? 0,
  });

  if (error) {
    redirect(`/team?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/team");
  redirect("/team");
}

export async function updateTeamMember(memberId: string, formData: FormData) {
  const supabase = createAdminClient();
  const { error } = await supabase
    .from("team_members")
    .update({
      name: str(formData, "name"),
      role: str(formData, "role"),
      email: str(formData, "email") || null,
      urgent_count: numOrNull(formData, "urgent_count") ?? 0,
    })
    .eq("id", memberId);

  if (error) {
    redirect(`/team?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/team");
  redirect("/team");
}

// ───────────────────────────────────────────────────────────────────────
// OS Rules
// ───────────────────────────────────────────────────────────────────────

export async function toggleOsRule(ruleId: string, active: boolean) {
  const supabase = createAdminClient();
  const { error } = await supabase.from("os_rules").update({ active }).eq("id", ruleId);
  if (error) redirect(`/os-rules?error=${encodeURIComponent(error.message)}`);
  revalidatePath("/os-rules");
  redirect("/os-rules");
}

export async function createOsRule(formData: FormData) {
  const supabase = createAdminClient();
  const configRaw = (formData.get("config") as string) || "{}";
  let config: Record<string, unknown> = {};
  try { config = JSON.parse(configRaw); } catch { config = {}; }

  const { error } = await supabase.from("os_rules").insert({
    rule_name:   formData.get("rule_name") as string,
    rule_type:   formData.get("rule_type") as string,
    description: formData.get("description") as string,
    config,
    active: true,
  });
  if (error) redirect(`/os-rules?error=${encodeURIComponent(error.message)}`);
  revalidatePath("/os-rules");
  redirect("/os-rules");
}

export async function updateOsRule(ruleId: string, formData: FormData) {
  const supabase = createAdminClient();
  const configRaw = (formData.get("config") as string) || "{}";
  let config: Record<string, unknown> = {};
  try { config = JSON.parse(configRaw); } catch { config = {}; }

  const { error } = await supabase.from("os_rules").update({
    rule_name:   formData.get("rule_name") as string,
    rule_type:   formData.get("rule_type") as string,
    description: formData.get("description") as string,
    config,
  }).eq("id", ruleId);
  if (error) redirect(`/os-rules?error=${encodeURIComponent(error.message)}`);
  revalidatePath("/os-rules");
  redirect("/os-rules");
}

export async function deleteOsRule(ruleId: string) {
  const supabase = createAdminClient();
  const { error } = await supabase.from("os_rules").delete().eq("id", ruleId);
  if (error) redirect(`/os-rules?error=${encodeURIComponent(error.message)}`);
  revalidatePath("/os-rules");
  redirect("/os-rules");
}

// ───────────────────────────────────────────────────────────────────────
// Partner Workspaces
// ───────────────────────────────────────────────────────────────────────

export async function createPartner(formData: FormData) {
  const supabase = createAdminClient();
  const { error } = await supabase.from("partner_workspaces").insert({
    partner_name:  str(formData, "partner_name"),
    partner_slug:  str(formData, "partner_slug"),
    description:   str(formData, "description") || null,
    direction:     str(formData, "direction") || "referral_out_only",
    contact_name:  str(formData, "contact_name") || null,
    contact_email: str(formData, "contact_email") || null,
    notes:         str(formData, "notes") || null,
    is_active:     true,
  });
  if (error) redirect(`/partners?error=${encodeURIComponent(error.message)}`);
  revalidatePath("/partners");
  redirect("/partners");
}

export async function updatePartner(partnerId: string, formData: FormData) {
  const supabase = createAdminClient();
  const { error } = await supabase.from("partner_workspaces").update({
    partner_name:  str(formData, "partner_name"),
    partner_slug:  str(formData, "partner_slug"),
    description:   str(formData, "description") || null,
    direction:     str(formData, "direction"),
    contact_name:  str(formData, "contact_name") || null,
    contact_email: str(formData, "contact_email") || null,
    notes:         str(formData, "notes") || null,
  }).eq("id", partnerId);
  if (error) redirect(`/partners?error=${encodeURIComponent(error.message)}`);
  revalidatePath("/partners");
  redirect("/partners");
}

export async function togglePartner(partnerId: string, active: boolean) {
  const supabase = createAdminClient();
  const { error } = await supabase.from("partner_workspaces")
    .update({ is_active: active })
    .eq("id", partnerId);
  if (error) redirect(`/partners?error=${encodeURIComponent(error.message)}`);
  revalidatePath("/partners");
  redirect("/partners");
}

export async function deletePartner(partnerId: string) {
  const supabase = createAdminClient();
  const { error } = await supabase.from("partner_workspaces").delete().eq("id", partnerId);
  if (error) redirect(`/partners?error=${encodeURIComponent(error.message)}`);
  revalidatePath("/partners");
  redirect("/partners");
}

// ───────────────────────────────────────────────────────────────────────
// Gate Signal Log
// ───────────────────────────────────────────────────────────────────────

export async function createSignalLog(campaignId: string, formData: FormData) {
  const supabase = createAdminClient();
  const { error } = await supabase.from("gate_signal_log").insert({
    campaign_id: campaignId,
    gate_id: str(formData, "gate_id") || null,
    logged_at: str(formData, "logged_at") || new Date().toISOString().slice(0, 10),
    signal_type: str(formData, "signal_type"),
    signal_label: str(formData, "signal_label"),
    actual_value: numOrNull(formData, "actual_value"),
    threshold_value: numOrNull(formData, "threshold_value"),
    unit: str(formData, "unit") || null,
    notes: str(formData, "notes") || null,
  });

  if (error) {
    redirect(`/campaigns/${campaignId}?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath(`/campaigns/${campaignId}`);
  redirect(`/campaigns/${campaignId}#signal-log`);
}

// logSignalFromReport — same insert as createSignalLog but returns a result
// instead of redirecting, so client components can show inline confirmation.
export async function logSignalFromReport(
  campaignId: string,
  formData: FormData
): Promise<{ success: boolean; error?: string }> {
  const supabase = createAdminClient();
  const { error } = await supabase.from("gate_signal_log").insert({
    campaign_id: campaignId,
    gate_id: null,
    logged_at: new Date().toISOString().slice(0, 10),
    signal_type: str(formData, "signal_type"),
    signal_label: str(formData, "signal_label"),
    actual_value: numOrNull(formData, "actual_value"),
    threshold_value: numOrNull(formData, "threshold_value"),
    unit: str(formData, "unit") || null,
    notes: str(formData, "notes") || null,
  });
  if (error) return { success: false, error: error.message };
  revalidatePath(`/campaigns/${campaignId}`);
  return { success: true };
}

export async function deleteSignalLog(logId: string, campaignId: string) {
  const supabase = createAdminClient();
  const { error } = await supabase.from("gate_signal_log").delete().eq("id", logId);

  if (error) {
    redirect(`/campaigns/${campaignId}?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath(`/campaigns/${campaignId}`);
  redirect(`/campaigns/${campaignId}#signal-log`);
}

// ───────────────────────────────────────────────────────────────────────
// Client Channel Registry
// ───────────────────────────────────────────────────────────────────────

export async function createClientChannel(clientId: string, formData: FormData) {
  const supabase = createAdminClient();
  const { error } = await supabase.from("client_channels").insert({
    client_id: clientId,
    channel_name: str(formData, "channel_name"),
    channel_category: str(formData, "channel_category") || "Custom",
    translation_hint: str(formData, "translation_hint") || "",
  });
  if (error) redirect(`/clients/${clientId}?error=${encodeURIComponent(error.message)}`);
  revalidatePath(`/clients/${clientId}`);
  redirect(`/clients/${clientId}#channels`);
}

export async function deleteClientChannel(channelId: string, clientId: string) {
  const supabase = createAdminClient();
  await supabase.from("client_channels").update({ active: false }).eq("id", channelId);
  revalidatePath(`/clients/${clientId}`);
  redirect(`/clients/${clientId}#channels`);
}

// ───────────────────────────────────────────────────────────────────────
// Client Signal Source Library
// ───────────────────────────────────────────────────────────────────────

export async function createClientSignalSource(clientId: string, formData: FormData) {
  const supabase = createAdminClient();
  const { error } = await supabase.from("client_signal_sources").insert({
    client_id: clientId,
    source_name: str(formData, "source_name"),
    source_type: str(formData, "source_type"),
    unit: str(formData, "unit") || "%",
    description: str(formData, "description") || "",
  });
  if (error) redirect(`/clients/${clientId}?error=${encodeURIComponent(error.message)}`);
  revalidatePath(`/clients/${clientId}`);
  redirect(`/clients/${clientId}#signal-sources`);
}

export async function deleteClientSignalSource(sourceId: string, clientId: string) {
  const supabase = createAdminClient();
  await supabase.from("client_signal_sources").update({ active: false }).eq("id", sourceId);
  revalidatePath(`/clients/${clientId}`);
  redirect(`/clients/${clientId}#signal-sources`);
}

// ───────────────────────────────────────────────────────────────────────
// Idea Extensions
// ───────────────────────────────────────────────────────────────────────

export async function createIdeaExtension(campaignId: string, formData: FormData) {
  const supabase = createAdminClient();
  const channelRole = str(formData, "channel_role") || null;
  const { error } = await supabase.from("idea_extensions").insert({
    campaign_id: campaignId,
    channel_name: str(formData, "channel_name"),
    channel_category: str(formData, "channel_category") || "Custom",
    expression_name: str(formData, "expression_name") || "",
    channel_role: channelRole,
    brief_body: str(formData, "brief_body") || "",
    frame_anchor: str(formData, "frame_anchor") || "",
    mood_register: str(formData, "mood_register") || "",
    clarity_statement: str(formData, "clarity_statement") || "",
    propagation_mechanism: str(formData, "propagation_mechanism") || "",
    ai_generated: false,
  });
  if (error) redirect(`/campaigns/${campaignId}?error=${encodeURIComponent(error.message)}`);
  revalidatePath(`/campaigns/${campaignId}`);
  redirect(`/campaigns/${campaignId}#idea-extensions`);
}

export async function updateIdeaExtension(extensionId: string, campaignId: string, formData: FormData) {
  const supabase = createAdminClient();
  const channelRole = str(formData, "channel_role") || null;

  // Detect brief format — v2 uses structured JSON fields; v1 uses raw brief_body textarea
  const isV2 = str(formData, "__brief_version") === "2";
  let brief_body: string;
  let propagation_mechanism: string;

  if (isV2) {
    // Build v2 JSON from all structured form fields
    const v2 = {
      __v: 2,
      idea_spine: str(formData, "idea_spine") || "",
      concept_rationale: str(formData, "concept_rationale") || "",
      win_conditions: str(formData, "win_conditions") || "",
      propagation_mechanism: str(formData, "propagation_mechanism") || "",
      strategic_recommendation: str(formData, "strategic_recommendation") || "",
      anchor_integrity_check: str(formData, "anchor_integrity_check") || "",
      do_not: str(formData, "do_not") || "",
      client_notes: str(formData, "client_notes") || "",
    };
    brief_body = JSON.stringify(v2);
    propagation_mechanism = v2.propagation_mechanism;
  } else {
    // v1 — single textarea
    brief_body = str(formData, "brief_body") || "";
    propagation_mechanism = str(formData, "propagation_mechanism") || "";
  }

  const { error } = await supabase.from("idea_extensions").update({
    expression_name: str(formData, "expression_name") || "",
    channel_role: channelRole,
    brief_body,
    propagation_mechanism,
    status: str(formData, "status") || "Draft",
  }).eq("id", extensionId);

  if (error) redirect(`/campaigns/${campaignId}?error=${encodeURIComponent(error.message)}`);
  revalidatePath(`/campaigns/${campaignId}`);
  redirect(`/campaigns/${campaignId}#idea-extensions`);
}

export async function deleteIdeaExtension(extensionId: string, campaignId: string) {
  const supabase = createAdminClient();
  await supabase.from("idea_extensions").delete().eq("id", extensionId);
  revalidatePath(`/campaigns/${campaignId}`);
  redirect(`/campaigns/${campaignId}#idea-extensions`);
}

// ───────────────────────────────────────────────────────────────────────
// Big Idea Platform (BIP) — Sprint 1
// One BIP per campaign. Accessible only after Gate 1 passes.
// IQ Evaluate API reads this in Sprint 2-3.
// ───────────────────────────────────────────────────────────────────────

// Save all 7 BIP components as a draft (non-locking)
export async function saveBipDraft(campaignId: string, bipId: string, formData: FormData) {
  const supabase = createAdminClient();
  const { error } = await supabase
    .from("big_idea_platforms")
    .update({
      topline_idea: str(formData, "topline_idea"),
      enemy_villain: str(formData, "enemy_villain"),
      brand_role: str(formData, "brand_role"),
      propagation_mechanism: str(formData, "propagation_mechanism"),
      cultural_tension: str(formData, "cultural_tension"),
      media_idea: str(formData, "media_idea"),
      expression_summary: str(formData, "expression_summary"),
    })
    .eq("id", bipId);

  if (error) {
    redirect(`/campaigns/${campaignId}?error=${encodeURIComponent(error.message)}#bip`);
  }

  revalidatePath(`/campaigns/${campaignId}`);
  redirect(`/campaigns/${campaignId}#bip`);
}

// Lock the BIP — all 7 components must be non-empty. Checked server-side.
export async function setBipLockStatus(campaignId: string, bipId: string, lock: boolean) {
  const supabase = createAdminClient();

  if (lock) {
    // Server-side completeness guard before locking
    const { data: bip } = await supabase
      .from("big_idea_platforms")
      .select("topline_idea,enemy_villain,brand_role,propagation_mechanism,cultural_tension,media_idea,expression_summary")
      .eq("id", bipId)
      .single();

    if (bip) {
      const fields = [
        bip.topline_idea,
        bip.enemy_villain,
        bip.brand_role,
        bip.propagation_mechanism,
        bip.cultural_tension,
        bip.media_idea,
        bip.expression_summary,
      ];
      const incomplete = fields.some((f) => !f || f.trim().length === 0);
      if (incomplete) {
        redirect(`/campaigns/${campaignId}?error=${encodeURIComponent("All 7 BIP components must be filled before locking.")}#bip`);
      }
    }
  }

  const { error } = await supabase
    .from("big_idea_platforms")
    .update({
      lock_status: lock ? "Locked" : "Draft",
      locked_at: lock ? new Date().toISOString() : null,
    })
    .eq("id", bipId);

  if (error) {
    redirect(`/campaigns/${campaignId}?error=${encodeURIComponent(error.message)}#bip`);
  }

  revalidatePath(`/campaigns/${campaignId}`);
  redirect(`/campaigns/${campaignId}#bip`);
}

// ─── Strategic Basis Sources — Signal-to-Creative Citation v0.1 (Stage 4A) ───
// Captures the strategic basis / supporting insight sources that inform a
// FRAME Brief or Big Idea Platform. Optional, non-blocking — never gates
// Gate 1, BIP completeness, or locking. See lib/types.ts and
// supabase/migrations/0087_strategic_basis_sources.sql for the approved
// architecture (Stage 3 build plan + Stage 4A approval).
//
// target_id is polymorphic and Postgres cannot enforce a real FK on it, so
// every write here validates the target exists in the matching table AND
// belongs to the passed campaign_id before touching strategic_basis_sources.
// This app is demo-first with no per-user permission model yet (see
// CLAUDE.md — "no login wall in v1"), so "confirm user is allowed to edit
// the campaign" is implemented the same way the rest of this codebase
// implements it today: assertInternalSession() (an OS session exists) plus
// confirming the target row genuinely belongs to that campaign_id. This
// matches the one other strategist-set, never-auto-computed feature in this
// file (saveCampaignSignalMap) rather than inventing a new access model.

const STRATEGIC_BASIS_TARGET_TYPES: StrategicBasisTargetType[] = ["frame_brief", "big_idea_platform"];

const STRATEGIC_BASIS_SOURCE_TYPES: StrategicBasisSourceType[] = [
  "os_cultural_radar_signal",
  "agency_provided_insight",
  "client_provided_research",
  "platform_social_listening_insight",
  "category_market_report",
  "creative_team_observation",
  "strategist_manual_note",
  "not_applicable",
];

async function assertStrategicBasisTarget(
  supabase: ReturnType<typeof createAdminClient>,
  campaignId: string,
  targetType: StrategicBasisTargetType,
  targetId: string
) {
  const table = targetType === "frame_brief" ? "frame_briefs" : "big_idea_platforms";
  const { data, error } = await supabase.from(table).select("id, campaign_id").eq("id", targetId).maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) {
    throw new Error(`${targetType === "frame_brief" ? "FRAME Brief" : "Big Idea Platform"} not found.`);
  }
  if ((data as { campaign_id: string }).campaign_id !== campaignId) {
    throw new Error("This target does not belong to the specified campaign.");
  }
}

export type AddStrategicBasisSourceInput = {
  campaign_id: string;
  target_type: StrategicBasisTargetType;
  target_id: string;
  source_type: Exclude<StrategicBasisSourceType, "not_applicable">;
  // Required when source_type === "os_cultural_radar_signal"; ignored otherwise.
  cultural_signal_id?: string | null;
  // Required for every source_type EXCEPT os_cultural_radar_signal, where the
  // title is always re-derived server-side from the signal's current name —
  // a client-supplied title is never trusted for that type.
  source_title?: string;
  source_note?: string | null;
  source_url?: string | null;
  created_by?: string | null;
};

export async function addStrategicBasisSource(input: AddStrategicBasisSourceInput) {
  // Stage 4A.2/4C integration auth-gate patch: the internal-session gate
  // was removed here on purpose — see the matching comment on
  // removeStrategicBasisSource / markStrategicBasisNotApplicable below for
  // why. All other validation (target_type, target existence, campaign_id
  // match, source_type, cultural_signal_id requirement, server-side title
  // snapshot) is unchanged.

  if (!STRATEGIC_BASIS_TARGET_TYPES.includes(input.target_type)) {
    throw new Error(`Invalid target_type: ${input.target_type}`);
  }
  // input.source_type is typed to exclude "not_applicable" already, but this
  // is a server action — a non-TS or stale-typed caller could still pass it
  // at runtime, so the check stays. Widened to string so TS doesn't flag the
  // comparison as unreachable.
  const rawSourceType = input.source_type as string;
  if (!STRATEGIC_BASIS_SOURCE_TYPES.includes(input.source_type) || rawSourceType === "not_applicable") {
    throw new Error(`Invalid source_type: ${input.source_type}`);
  }

  const supabase = createAdminClient();
  await assertStrategicBasisTarget(supabase, input.campaign_id, input.target_type, input.target_id);

  let sourceTitle = (input.source_title ?? "").trim();
  let culturalSignalId: string | null = null;

  if (input.source_type === "os_cultural_radar_signal") {
    if (!input.cultural_signal_id) {
      throw new Error("Select a Cultural Radar signal to link.");
    }
    const { data: signal, error: signalError } = await supabase
      .from("cultural_signals")
      .select("id, signal_name")
      .eq("id", input.cultural_signal_id)
      .maybeSingle();
    if (signalError) throw new Error(signalError.message);
    if (!signal) throw new Error("Selected Cultural Radar signal not found.");
    culturalSignalId = (signal as { id: string; signal_name: string }).id;
    // Snapshot at citation time — see migration 0087 header for why this is
    // intentional (the citation is a historical record, not a live mirror).
    sourceTitle = (signal as { id: string; signal_name: string }).signal_name;
  } else if (!sourceTitle) {
    throw new Error("Source title is required.");
  }

  // Adding a real source and 'not_applicable' are mutually exclusive for the
  // same target. Clear any existing not_applicable marker before inserting —
  // this is the "remove not_applicable if a strategist later adds a real
  // source" rule from the approved architecture.
  await supabase
    .from("strategic_basis_sources")
    .delete()
    .eq("target_type", input.target_type)
    .eq("target_id", input.target_id)
    .eq("source_type", "not_applicable");

  const { data: inserted, error } = await supabase
    .from("strategic_basis_sources")
    .insert({
      campaign_id: input.campaign_id,
      target_type: input.target_type,
      target_id: input.target_id,
      source_type: input.source_type,
      cultural_signal_id: culturalSignalId,
      source_title: sourceTitle,
      source_note: input.source_note?.trim() || null,
      source_url: input.source_url?.trim() || null,
      created_by: input.created_by ?? null,
    })
    .select("*")
    .single();
  if (error) throw new Error(error.message);

  revalidatePath(`/campaigns/${input.campaign_id}`);
  return inserted as StrategicBasisSource;
}

// Removes a single row — used both for deleting a real cited source and for
// the "undo" action on a not_applicable marker (which is a row too).
export async function removeStrategicBasisSource(campaignId: string, sourceId: string) {
  // Stage 4A.2/4C integration auth-gate patch — approved. The OS v1
  // campaign working page (FRAME Brief, Big Idea Platform, Campaign Info,
  // etc.) has no login wall by design, so assertInternalSession() here
  // always threw "Unauthorized" for every real visitor, surfaced to the
  // client only as Next.js's generic redacted Server Action error text —
  // this is what caused the red "Server Components render" error in the
  // Strategic Basis Sources panel. Removed to match how every other
  // campaign-page edit action (e.g. updateCampaign) already behaves under
  // the current no-login-wall model. campaign_id / target ownership
  // validation below is unchanged and is the real access check here.
  const supabase = createAdminClient();

  const { data: existing, error: fetchError } = await supabase
    .from("strategic_basis_sources")
    .select("id, campaign_id")
    .eq("id", sourceId)
    .maybeSingle();
  if (fetchError) throw new Error(fetchError.message);
  if (!existing) throw new Error("Strategic basis source not found.");
  if ((existing as { campaign_id: string }).campaign_id !== campaignId) {
    throw new Error("This source does not belong to the specified campaign.");
  }

  const { error } = await supabase.from("strategic_basis_sources").delete().eq("id", sourceId);
  if (error) throw new Error(error.message);

  revalidatePath(`/campaigns/${campaignId}`);
}

export type MarkStrategicBasisNotApplicableInput = {
  campaign_id: string;
  target_type: StrategicBasisTargetType;
  target_id: string;
  created_by?: string | null;
};

export async function markStrategicBasisNotApplicable(input: MarkStrategicBasisNotApplicableInput) {
  // Stage 4A.2/4C integration auth-gate patch — see removeStrategicBasisSource
  // above for why this internal-session gate was removed. Target validation,
  // not_applicable exclusivity logic, and all DB constraints below are
  // unchanged.

  if (!STRATEGIC_BASIS_TARGET_TYPES.includes(input.target_type)) {
    throw new Error(`Invalid target_type: ${input.target_type}`);
  }

  const supabase = createAdminClient();
  await assertStrategicBasisTarget(supabase, input.campaign_id, input.target_type, input.target_id);

  // Conservative direction: don't silently wipe out real citations to mark
  // a target not-applicable. In the UI this action only ever appears in the
  // empty state (zero rows), so this guard should never actually trigger —
  // it exists as a server-side backstop against a stale/racing client.
  const { data: realSources, error: realError } = await supabase
    .from("strategic_basis_sources")
    .select("id")
    .eq("target_type", input.target_type)
    .eq("target_id", input.target_id)
    .neq("source_type", "not_applicable");
  if (realError) throw new Error(realError.message);
  if (realSources && realSources.length > 0) {
    throw new Error(
      "Remove the existing strategic basis sources for this target before marking it not applicable."
    );
  }

  const { data: inserted, error } = await supabase
    .from("strategic_basis_sources")
    .insert({
      campaign_id: input.campaign_id,
      target_type: input.target_type,
      target_id: input.target_id,
      source_type: "not_applicable",
      source_title: "Not applicable for this campaign",
      created_by: input.created_by ?? null,
    })
    .select("*")
    .single();
  if (error) throw new Error(error.message);

  revalidatePath(`/campaigns/${input.campaign_id}`);
  return inserted as StrategicBasisSource;
}

// ─── Strategic Synthesis — v0.1 (Stage 4C.2) ─────────────────────────────
// Optional, user-triggered, strategist-reviewed assistive drafting. These
// three actions are pure bookkeeping on an already-generated run — they
// never write to frame_briefs or big_idea_platforms and never regenerate
// content. Actual field pre-fill happens client-side in
// StrategicSynthesisPanel.tsx; "apply" here only records that the
// strategist applied a given step so the run's history is accurate. The
// strategist still has to use the existing FRAME/BIP Save action for
// anything to persist to the brief itself.

export async function reviewStrategicSynthesisRun(runId: string) {
  // Auth-gate patch — same reasoning as addStrategicBasisSource /
  // removeStrategicBasisSource above: the OS v1 campaign working page has
  // no login wall, so this always threw "Unauthorized" for every real
  // visitor, surfacing only as Next.js's generic redacted Server Action
  // error. Removed to match the current no-login-wall model. Run existence
  // check and review_status bookkeeping below are unchanged.
  const supabase = createAdminClient();

  const { data: run, error: fetchError } = await supabase
    .from("strategic_synthesis_runs")
    .select("id, campaign_id, review_status")
    .eq("id", runId)
    .maybeSingle();
  if (fetchError) throw new Error(fetchError.message);
  if (!run) throw new Error("Strategic synthesis run not found.");
  const typedRun = run as { id: string; campaign_id: string; review_status: SynthesisReviewStatus };

  // Reviewing is a soft acknowledgement — don't downgrade a run that's
  // already been applied or rejected back to merely "reviewed".
  if (typedRun.review_status === "applied" || typedRun.review_status === "rejected") {
    return;
  }

  const { error } = await supabase
    .from("strategic_synthesis_runs")
    .update({ review_status: "reviewed", reviewed_at: new Date().toISOString() })
    .eq("id", runId);
  if (error) throw new Error(error.message);

  revalidatePath(`/campaigns/${typedRun.campaign_id}`);
}

// Records that a strategist applied one step's draft into the live FRAME/BIP
// form. Bookkeeping only — see header above. Throws if the run was rejected
// (a rejected run's drafts should not be applied) or the step key doesn't
// exist on any route in this run.
export async function applyStrategicSynthesisStep(runId: string, stepKey: string) {
  // Auth-gate patch — see reviewStrategicSynthesisRun above. Run existence
  // check, rejected-run guard, step lookup, and applied_at bookkeeping
  // below are unchanged. This still never writes to frame_briefs or
  // big_idea_platforms directly — only to strategic_synthesis_runs.
  const supabase = createAdminClient();

  const { data: run, error: fetchError } = await supabase
    .from("strategic_synthesis_runs")
    .select("id, campaign_id, routes, review_status")
    .eq("id", runId)
    .maybeSingle();
  if (fetchError) throw new Error(fetchError.message);
  if (!run) throw new Error("Strategic synthesis run not found.");
  const typedRun = run as {
    id: string;
    campaign_id: string;
    routes: SynthesisRoute[];
    review_status: SynthesisReviewStatus;
  };

  if (typedRun.review_status === "rejected") {
    throw new Error("This run was rejected — its drafts cannot be applied.");
  }

  let found = false;
  const updatedRoutes = typedRun.routes.map((route) => ({
    ...route,
    steps: route.steps.map((step) => {
      if (step.key !== stepKey) return step;
      found = true;
      if (!step.applicable || !step.target_field) {
        throw new Error(`Step "${step.label}" is read-only and cannot be applied.`);
      }
      return { ...step, applied: true };
    }),
  }));
  if (!found) throw new Error(`Step "${stepKey}" not found on this run.`);

  const { error } = await supabase
    .from("strategic_synthesis_runs")
    .update({
      routes: updatedRoutes,
      review_status: "applied",
      applied_at: new Date().toISOString(),
    })
    .eq("id", runId);
  if (error) throw new Error(error.message);

  revalidatePath(`/campaigns/${typedRun.campaign_id}`);
}

export async function rejectStrategicSynthesisRun(runId: string, note?: string) {
  // Auth-gate patch — see reviewStrategicSynthesisRun above. Run existence
  // check, review_status update, rejected_at / rejection_note handling
  // below are unchanged.
  const supabase = createAdminClient();

  const { data: run, error: fetchError } = await supabase
    .from("strategic_synthesis_runs")
    .select("id, campaign_id")
    .eq("id", runId)
    .maybeSingle();
  if (fetchError) throw new Error(fetchError.message);
  if (!run) throw new Error("Strategic synthesis run not found.");
  const typedRun = run as { id: string; campaign_id: string };

  const { error } = await supabase
    .from("strategic_synthesis_runs")
    .update({
      review_status: "rejected",
      rejected_at: new Date().toISOString(),
      rejection_note: note?.trim() || null,
    })
    .eq("id", runId);
  if (error) throw new Error(error.message);

  revalidatePath(`/campaigns/${typedRun.campaign_id}`);
}

// ───────────────────────────────────────────────────────────────────────
// Quick Audit — creates client + campaign + frame brief in one shot
// ───────────────────────────────────────────────────────────────────────

export async function createQuickAudit(formData: FormData) {
  const supabase = createAdminClient();

  // 1. Create client
  const { data: client, error: clientError } = await supabase
    .from("clients")
    .insert({
      name: str(formData, "brand_name"),
      industry_profile: (str(formData, "industry_profile") || "Other") as "QSR" | "B2B" | "Retail" | "Other",
      business_outcome_label: str(formData, "business_outcome_label") || "Business Outcome",
      retention_metric_label: "Retention Metric",
    })
    .select("id")
    .single();

  if (clientError) redirect(`/audit?error=${encodeURIComponent(clientError.message)}`);

  // 2. Create campaign
  const { data: campaign, error: campaignError } = await supabase
    .from("campaigns")
    .insert({
      client_id: client.id,
      name: str(formData, "campaign_name") || "Campaign Audit",
      current_phase: (str(formData, "current_phase") || "Demand") as CampaignPhase,
    })
    .select("id")
    .single();

  if (campaignError) redirect(`/audit?error=${encodeURIComponent(campaignError.message)}`);

  // 3. Create frame brief with ICS scores
  const { error: frameError } = await supabase
    .from("frame_briefs")
    .insert({
      campaign_id: campaign.id,
      force: str(formData, "context_notes") || "[Quick Audit]",
      anchor: `[Quick Audit] ${str(formData, "brand_name")} — ${str(formData, "campaign_name") || "Campaign Audit"}`,
      ics_cultural_fit: numOrNull(formData, "ics_cultural_fit") ?? 3,
      ics_business_alignment: numOrNull(formData, "ics_business_alignment") ?? 3,
      ics_audience_tension: numOrNull(formData, "ics_audience_tension") ?? 3,
      ics_executional_coherence: numOrNull(formData, "ics_executional_coherence") ?? 3,
      ics_measurability: numOrNull(formData, "ics_measurability") ?? 3,
      ics_scalability: numOrNull(formData, "ics_scalability") ?? 3,
    });

  if (frameError) redirect(`/audit?error=${encodeURIComponent(frameError.message)}`);

  // 3b. Create Big Idea Platform row — FIXED 4 Sept 2026 (same missing-insert bug as
  // createCampaign(); see that function's comment for why this matters).
  const { error: bipError } = await supabase
    .from("big_idea_platforms")
    .insert({ campaign_id: campaign.id });

  if (bipError) redirect(`/audit?error=${encodeURIComponent(bipError.message)}`);

  // 4. Seed phase gates from templates
  const { data: templates } = await supabase
    .from("gate_templates")
    .select("id, gate_type, sequence_order, required_signal_template")
    .order("sequence_order");

  const gateRows = (templates ?? []).map((t) => ({
    campaign_id: campaign.id,
    gate_template_id: t.id,
    gate_type: t.gate_type,
    sequence_order: t.sequence_order,
    required_signal: t.required_signal_template,
  }));

  if (gateRows.length > 0) {
    await supabase.from("phase_gates").insert(gateRows);
  }

  // 5. Seed standard client channels
  const standardChannels = [
    { channel_name: "Digital / Social", channel_category: "Digital" as const, translation_hint: "Platform-native brand mechanics. Idea drives format, not the reverse." },
    { channel_name: "KOL / Influencer", channel_category: "KOL" as const, translation_hint: "Creator-native storytelling. Must feel earned, not scripted." },
    { channel_name: "PR / Earned Media", channel_category: "PR" as const, translation_hint: "Journalist angle, not brand angle. What makes this worth covering?" },
    { channel_name: "Radio", channel_category: "Radio" as const, translation_hint: "Audio-only hook. Human tension in 15 seconds." },
    { channel_name: "Retail / In-Store", channel_category: "Retail" as const, translation_hint: "Last-mile conversion trigger. Same cultural tension, different format." },
  ];
  await supabase.from("client_channels").insert(
    standardChannels.map((ch) => ({ client_id: client.id, ...ch }))
  );

  revalidatePath("/audit");
  revalidatePath("/clients");
  revalidatePath("/");
  redirect(`/campaigns/${campaign.id}#diagnostics`);
}

// ───────────────────────────────────────────────────────────────────────
// Knowledge Base (Feature 15 — Cultural Intelligence & Regulatory Layer)
// Internal only — Janine access. Not shown to clients.
// ───────────────────────────────────────────────────────────────────────

export async function createKnowledgeDoc(formData: FormData) {
  const supabase = createAdminClient();

  // F24: resolve scope fields (added migration 0013)
  const kbScope = str(formData, "kb_scope") || "Global";
  const campaignId = str(formData, "campaign_id") || null;
  const clientId = str(formData, "client_id") || null;

  const { error } = await supabase.from("knowledge_docs").insert({
    doc_type: str(formData, "doc_type") || "Custom",
    market: str(formData, "market") || "Malaysia",
    title: str(formData, "title"),
    description: str(formData, "description") || "",
    // file_path: set to Supabase Storage path by /api/upload before form submit
    file_path: str(formData, "file_path") || null,
    source_url: str(formData, "source_url") || null,
    tags: str(formData, "tags") || "",
    // KB scope hierarchy (migration 0013)
    kb_scope: kbScope,
    campaign_id: campaignId || null,
    client_id: clientId || null,
  });
  if (error) redirect(`/knowledge?error=${encodeURIComponent(error.message)}`);

  // Revalidate both /knowledge (global) and the campaign page if campaign-scoped
  revalidatePath("/knowledge");
  if (campaignId) revalidatePath(`/campaigns/${campaignId}`);
  redirect("/knowledge");
}

export async function updateKnowledgeDoc(docId: string, formData: FormData) {
  const supabase = createAdminClient();
  const { error } = await supabase
    .from("knowledge_docs")
    .update({
      doc_type: str(formData, "doc_type") || "Custom",
      market: str(formData, "market") || "Malaysia",
      title: str(formData, "title"),
      description: str(formData, "description") || "",
      source_url: str(formData, "source_url") || null,
      tags: str(formData, "tags") || "",
    })
    .eq("id", docId);
  if (error) redirect(`/knowledge?error=${encodeURIComponent(error.message)}`);
  revalidatePath("/knowledge");
  redirect("/knowledge");
}

export async function deleteKnowledgeDoc(docId: string) {
  const supabase = createAdminClient();
  await supabase.from("knowledge_docs").update({ active: false }).eq("id", docId);
  revalidatePath("/knowledge");
  redirect("/knowledge");
}

// ───────────────────────────────────────────────────────────────────────
// Signal Intelligence — Feature 12 (Sprint 2)
// Internal only. Not shown to clients.
// Signal thresholds are committed before campaign launch and locked.
// signal_weekly_reports are generated via /api/signal-report (Claude Haiku).
// ───────────────────────────────────────────────────────────────────────

// Create or upsert a campaign's signal thresholds (must be done before launch)
export async function upsertSignalThresholds(
  campaignId: string,
  formData: FormData
) {
  const supabase = createAdminClient();

  const payload = {
    campaign_id: campaignId,
    campaign_duration_weeks: Number(str(formData, "campaign_duration_weeks")) || 12,
    signal_1_label: str(formData, "signal_1_label") || "Branded Search Lift",
    signal_1_threshold_pct: Number(str(formData, "s1_green_pct")) || 20,
    signal_1_amber_pct: Number(str(formData, "signal_1_amber_pct")) || 10,
    signal_1_red_pct: Number(str(formData, "signal_1_red_pct")) || 0,
    signal_2_label: str(formData, "signal_2_label") || "Content Save Rate",
    signal_2_threshold_pct: Number(str(formData, "s2_green_pct")) || 8,
    signal_2_amber_pct: Number(str(formData, "signal_2_amber_pct")) || 4,
    signal_2_red_pct: Number(str(formData, "signal_2_red_pct")) || 2,
    signal_2b_label: str(formData, "signal_2b_label") || "TikTok share rate",
    signal_2b_target_pct: Number(str(formData, "signal_2b_target_pct")) || 5,
    signal_2b_amber_pct: Number(str(formData, "signal_2b_amber_pct")) || 3,
    signal_2b_red_pct: Number(str(formData, "signal_2b_red_pct")) || 1,
    signal_3_label: str(formData, "signal_3_label") || "UGC Volume (Apify)",
    signal_3_threshold_count: Number(str(formData, "s3_green_count")) || 100,
    signal_3_amber_count: Number(str(formData, "signal_3_amber_count")) || 50,
    signal_3_red_count: Number(str(formData, "signal_3_red_count")) || 20,
    // Signal 3B — Video Completion Rate (Sprint 25)
    signal_3b_label: str(formData, "signal_3b_label") || "Video completion rate",
    signal_3b_target_pct: Number(str(formData, "signal_3b_target_pct")) || 70,
    signal_3b_amber_pct: Number(str(formData, "signal_3b_amber_pct")) || 50,
    signal_3b_red_pct: Number(str(formData, "signal_3b_red_pct")) || 30,
    // Signal 4 — Retention (Sprint 25)
    signal_4_label: str(formData, "signal_4_label") || "Retention / repeat visit rate",
    signal_4_target_pct: Number(str(formData, "signal_4_target_pct")) || 15,
    signal_4_amber_pct: Number(str(formData, "signal_4_amber_pct")) || 8,
    signal_4_red_pct: Number(str(formData, "signal_4_red_pct")) || 3,
    // Market code (Sprint 25)
    market_code: str(formData, "market_code") || "MY",
  };

  const { error } = await supabase
    .from("signal_thresholds")
    .upsert(payload, { onConflict: "campaign_id" });

  if (error) {
    redirect(
      `/campaigns/${campaignId}?error=${encodeURIComponent(error.message)}#signal-intelligence`
    );
  }

  revalidatePath(`/campaigns/${campaignId}`);
  redirect(`/campaigns/${campaignId}#signal-intelligence`);
}

// Lock signal thresholds — prevents post-hoc changes after campaign launch
export async function lockSignalThresholds(
  thresholdId: string,
  campaignId: string
) {
  const supabase = createAdminClient();

  // Verify not already locked
  const { data: existing } = await supabase
    .from("signal_thresholds")
    .select("locked")
    .eq("id", thresholdId)
    .single();

  if (existing?.locked) {
    redirect(
      `/campaigns/${campaignId}?error=${encodeURIComponent("Thresholds are already locked.")}#signal-intelligence`
    );
  }

  const { error } = await supabase
    .from("signal_thresholds")
    .update({ locked: true, locked_at: new Date().toISOString() })
    .eq("id", thresholdId);

  if (error) {
    redirect(
      `/campaigns/${campaignId}?error=${encodeURIComponent(error.message)}#signal-intelligence`
    );
  }

  revalidatePath(`/campaigns/${campaignId}`);
  redirect(`/campaigns/${campaignId}#signal-intelligence`);
}

// Save raw weekly signal inputs — triggers /api/signal-report for AI inference
// The actual AI call happens client-side via the SignalIntelligenceSection component
// after this action saves the inputs to Supabase.
export async function saveWeeklySignalInputs(
  campaignId: string,
  formData: FormData
) {
  const supabase = createAdminClient();

  // Get threshold record for this campaign
  const { data: threshold, error: tErr } = await supabase
    .from("signal_thresholds")
    .select("id, locked, campaign_duration_weeks")
    .eq("campaign_id", campaignId)
    .single();

  if (tErr || !threshold) {
    redirect(
      `/campaigns/${campaignId}?error=${encodeURIComponent("Set and lock signal thresholds before logging weekly data.")}#signal-intelligence`
    );
  }

  if (!threshold.locked) {
    redirect(
      `/campaigns/${campaignId}?error=${encodeURIComponent("Lock signal thresholds before logging weekly data.")}#signal-intelligence`
    );
  }

  const weekNumber = Number(str(formData, "week_number")) || 1;
  const durationWeeks = threshold.campaign_duration_weeks;
  const pct = weekNumber / durationWeeks;
  const phase =
    pct <= 0.25 ? 1 : pct <= 0.60 ? 2 : pct <= 0.80 ? 3 : 4;

  const { error } = await supabase.from("signal_weekly_reports").upsert(
    {
      campaign_id: campaignId,
      threshold_id: threshold.id,
      week_number: weekNumber,
      week_of: str(formData, "week_of") || new Date().toISOString().slice(0, 10),
      signal_1_actual_pct: numOrNull(formData, "signal_1_actual_pct"),
      signal_2_actual_pct: numOrNull(formData, "signal_2_actual_pct"),
      signal_2b_actual_pct: numOrNull(formData, "signal_2b_actual_pct"),
      signal_2b_label: str(formData, "signal_2b_label") || null,
      signal_3_actual_count: numOrNull(formData, "signal_3_actual_count"),
      // Signal 3B — VCR (Sprint 25, optional)
      signal_3b_actual_pct: numOrNull(formData, "signal_3b_actual_pct"),
      signal_3b_label: str(formData, "signal_3b_label") || null,
      // Signal 4 — Retention (Sprint 25, optional)
      signal_4_actual_pct: numOrNull(formData, "signal_4_actual_pct"),
      signal_4_label: str(formData, "signal_4_label") || null,
      campaign_phase: phase,
      flags_suppressed: phase === 1,
      // Health and AI narrative are populated by /api/signal-report
      // Stored as Green defaults here; component calls /api/signal-report after save
      demand_health: "Green",
      nurture_health: "Green",
      signal_2b_health: "Green",
      conversion_health: "Green",
    },
    { onConflict: "campaign_id,week_number" }
  );

  if (error) {
    redirect(
      `/campaigns/${campaignId}?error=${encodeURIComponent(error.message)}#signal-intelligence`
    );
  }

  revalidatePath(`/campaigns/${campaignId}`);

  // F32: fire orchestration chain (non-blocking — chain runs in background)
  // Does not await — returns immediately to the user while chain processes
  void fireOrchestration(campaignId, "SIGNAL_ENTERED", { week_number: weekNumber });
  // Return without redirect — component handles /api/signal-report call next
}

// ───────────────────────────────────────────────────────────────────────
// Open Architecture Foundations — F17D / F17E / F17F (Sprint 3)
// Read-only getters for system reference tables.
// These are lookup tables — create/update via Supabase admin or migration only.
// All three tables: internal access only. Never surfaced to clients.
// ───────────────────────────────────────────────────────────────────────

// F17D — Channel Profiles
// Returns all active channel profiles ordered by primary_funnel_stage then channel_name.
// Used by: F13 (Cross-Channel Hub), F16B (Signal Health), F18A (Consumer State Diagnostic)

export async function getChannelProfiles() {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("channel_profiles")
    .select("*")
    .eq("active", true)
    .order("primary_funnel_stage")
    .order("channel_name");

  if (error) throw new Error(error.message);
  return data;
}

export async function getChannelProfileBySlug(slug: string) {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("channel_profiles")
    .select("*")
    .eq("channel_slug", slug)
    .single();

  if (error) throw new Error(error.message);
  return data;
}

// F17E — Category Attributes
// Returns all active category attribute records ordered by industry_vertical then category_name.
// Used by: ICS weighting, signal threshold calibration, benchmark library filtering

export async function getCategoryAttributes() {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("category_attributes")
    .select("*")
    .eq("active", true)
    .order("industry_vertical")
    .order("category_name");

  if (error) throw new Error(error.message);
  return data;
}

export async function getCategoryAttributeBySlug(slug: string) {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("category_attributes")
    .select("*")
    .eq("category_slug", slug)
    .single();

  if (error) throw new Error(error.message);
  return data;
}

// F17F — Market Parameters
// Returns all active market records ordered by confidence_weight DESC (primary market first).
// Used by: Benchmark Library cross-market weighting, Consumer State Diagnostic

export async function getMarketParameters() {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("market_parameters")
    .select("*")
    .eq("active", true)
    .order("confidence_weight", { ascending: false });

  if (error) throw new Error(error.message);
  return data;
}

export async function getMarketParameterByCode(code: string) {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("market_parameters")
    .select("*")
    .eq("market_code", code.toUpperCase())
    .single();

  if (error) throw new Error(error.message);
  return data;
}

export async function getPrimaryMarket() {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("market_parameters")
    .select("*")
    .eq("is_primary_market", true)
    .single();

  if (error) throw new Error(error.message);
  return data;
}

// ───────────────────────────────────────────────────────────────────────
// Cross-Channel Campaign Intelligence Hub — Feature 13 (Sprint 3)
// channel mutations only — reads are in data.ts.
// Internal access only. Never surfaced to clients.
// ───────────────────────────────────────────────────────────────────────

// Seed campaign channels in bulk from FRAME Brief active_channels list.
// Matches channel names (case-insensitive) against channel_profiles and inserts
// one row per match. Skips profiles already assigned to the campaign.
export async function seedCampaignChannelsFromFrame(
  campaignId: string,
  seeds: { channel_profile_id: string; channel_role: string }[]
): Promise<{ seeded: number; error?: string }> {
  if (seeds.length === 0) return { seeded: 0 };
  const supabase = createAdminClient();

  // Check which profiles are already assigned
  const { data: existing } = await supabase
    .from("campaign_channels")
    .select("channel_profile_id")
    .eq("campaign_id", campaignId);
  const existingIds = new Set((existing ?? []).map((r) => r.channel_profile_id));

  const toInsert = seeds
    .filter((s) => !existingIds.has(s.channel_profile_id))
    .map((s) => ({
      campaign_id: campaignId,
      channel_profile_id: s.channel_profile_id,
      channel_role: s.channel_role,
      is_primary: false,
    }));

  if (toInsert.length === 0) return { seeded: 0 };

  const { error } = await supabase.from("campaign_channels").insert(toInsert);
  if (error) return { seeded: 0, error: error.message };

  revalidatePath(`/campaigns/${campaignId}`);
  return { seeded: toInsert.length };
}

// Assign a channel_profile to a campaign
export async function addCampaignChannel(campaignId: string, formData: FormData) {
  const supabase = createAdminClient();
  const { error } = await supabase.from("campaign_channels").insert({
    campaign_id: campaignId,
    channel_profile_id: str(formData, "channel_profile_id"),
    channel_role: str(formData, "channel_role"),
    budget_allocation_pct: numOrNull(formData, "budget_allocation_pct"),
    start_week: numOrNull(formData, "start_week"),
    end_week: numOrNull(formData, "end_week"),
    is_primary: formData.get("is_primary") === "true",
    signal_proxy_label: str(formData, "signal_proxy_label"),
    notes: str(formData, "notes"),
  });

  if (error) {
    redirect(`/campaigns/${campaignId}?error=${encodeURIComponent(error.message)}#cross-channel`);
  }
  revalidatePath(`/campaigns/${campaignId}`);
}

// Update a channel assignment (role, budget, signal proxy label, primary flag)
export async function updateCampaignChannel(
  channelId: string,
  campaignId: string,
  formData: FormData
) {
  const supabase = createAdminClient();
  const { error } = await supabase
    .from("campaign_channels")
    .update({
      channel_role: str(formData, "channel_role"),
      budget_allocation_pct: numOrNull(formData, "budget_allocation_pct"),
      start_week: numOrNull(formData, "start_week"),
      end_week: numOrNull(formData, "end_week"),
      is_primary: formData.get("is_primary") === "true",
      signal_proxy_label: str(formData, "signal_proxy_label"),
      notes: str(formData, "notes"),
    })
    .eq("id", channelId);

  if (error) {
    redirect(`/campaigns/${campaignId}?error=${encodeURIComponent(error.message)}#cross-channel`);
  }
  revalidatePath(`/campaigns/${campaignId}`);
}

// Deactivate a channel assignment (soft delete — sets active = false)
export async function removeCampaignChannel(channelId: string, campaignId: string) {
  const supabase = createAdminClient();
  const { error } = await supabase
    .from("campaign_channels")
    .update({ active: false })
    .eq("id", channelId);

  if (error) {
    redirect(`/campaigns/${campaignId}?error=${encodeURIComponent(error.message)}#cross-channel`);
  }
  revalidatePath(`/campaigns/${campaignId}`);
}

// Upsert weekly metrics for a single channel.
// Called once per channel from the WeeklyHub form (multiple submissions per week).
export async function upsertChannelWeeklyMetric(
  campaignId: string,
  campaignChannelId: string,
  formData: FormData
) {
  const supabase = createAdminClient();
  const weekNumber = Number(str(formData, "week_number"));

  const { error } = await supabase.from("channel_weekly_metrics").upsert(
    {
      campaign_id: campaignId,
      campaign_channel_id: campaignChannelId,
      week_number: weekNumber,
      week_of: str(formData, "week_of") || new Date().toISOString().slice(0, 10),
      impressions: numOrNull(formData, "impressions"),
      reach: numOrNull(formData, "reach"),
      engagement_rate_pct: numOrNull(formData, "engagement_rate_pct"),
      click_rate_pct: numOrNull(formData, "click_rate_pct"),
      signal_proxy_value: numOrNull(formData, "signal_proxy_value"),
      signal_proxy_label: str(formData, "signal_proxy_label"),
      channel_health: str(formData, "channel_health") || "Green",
      notes: str(formData, "notes"),
    },
    { onConflict: "campaign_channel_id,week_number" }
  );

  if (error) {
    redirect(`/campaigns/${campaignId}?error=${encodeURIComponent(error.message)}#cross-channel`);
  }
  revalidatePath(`/campaigns/${campaignId}`);
}

// ─── Signal Market Context (Feature 16C — Sprint 4) ──────────────────────────
// Upserts the external market variable context for a campaign week.
// Saved before running /api/signal-report so the AI prompt includes market context.
// All fields optional — graceful degradation if any are left blank.
export async function saveSignalMarketContext(
  campaignId: string,
  weekNumber: number,
  formData: FormData
) {
  const supabase = createAdminClient();
  const { error } = await supabase
    .from("signal_market_contexts")
    .upsert(
      {
        campaign_id: campaignId,
        week_number: weekNumber,
        category_search_trend:   str(formData, "category_search_trend")   || null,
        category_search_note:    str(formData, "category_search_note"),
        competitive_sov_change:  str(formData, "competitive_sov_change")  || null,
        competitive_sov_note:    str(formData, "competitive_sov_note"),
        cultural_moment_flag:    formData.get("cultural_moment_flag") === "true",
        cultural_moment_note:    str(formData, "cultural_moment_note"),
        platform_algorithm_flag: formData.get("platform_algorithm_flag") === "true",
        platform_algorithm_note: str(formData, "platform_algorithm_note"),
        macro_context_note:      str(formData, "macro_context_note"),
        weather_seasonality_note: str(formData, "weather_seasonality_note"),
      },
      { onConflict: "campaign_id,week_number" }
    );
  if (error) {
    redirect(`/campaigns/${campaignId}?error=${encodeURIComponent(error.message)}#market-context`);
  }
  revalidatePath(`/campaigns/${campaignId}`);
}

// ─── Attribution Records (Feature 14B — Sprint 4) ─────────────────────────────
// Insert a new attribution record for a campaign week + channel.
// Strategy lead adds one record per channel per week.
// No delete from client side — use deleteAttributionRecord for corrections.
export async function addAttributionRecord(
  campaignId: string,
  formData: FormData
) {
  const supabase = createAdminClient();
  const { error } = await supabase.from("attribution_records").insert({
    campaign_id:          campaignId,
    week_number:          Number(str(formData, "week_number")),
    week_of:              str(formData, "week_of") || new Date().toISOString().slice(0, 10),
    channel_name:         str(formData, "channel_name"),
    spend_rm:             numOrNull(formData, "spend_rm"),
    sales_units:          numOrNull(formData, "sales_units"),
    sales_rm:             numOrNull(formData, "sales_rm"),
    incremental_lift_pct: numOrNull(formData, "incremental_lift_pct"),
    test_type:            str(formData, "test_type") || "MMM",
    notes:                str(formData, "notes"),
  });
  if (error) {
    redirect(`/campaigns/${campaignId}?error=${encodeURIComponent(error.message)}#attribution`);
  }
  revalidatePath(`/campaigns/${campaignId}`);
}

// Remove an attribution record (correction flow).
export async function deleteAttributionRecord(
  recordId: string,
  campaignId: string
) {
  const supabase = createAdminClient();
  const { error } = await supabase
    .from("attribution_records")
    .delete()
    .eq("id", recordId);
  if (error) {
    redirect(`/campaigns/${campaignId}?error=${encodeURIComponent(error.message)}#attribution`);
  }
  revalidatePath(`/campaigns/${campaignId}`);
}

// ─── Brand Momentum Score (Feature 19 — Sprint 4) ────────────────────────────
// Save the 6 dimension inputs for a BMS period.
// /api/brand-momentum is called separately to compute the AI composite.
export async function saveBrandMomentumInputs(
  clientId: string,
  formData: FormData
) {
  const supabase = createAdminClient();
  const periodStart = str(formData, "period_start");
  if (!periodStart) {
    throw new Error("Period start date is required");
  }
  const { error } = await supabase.from("brand_momentum_scores").insert({
    client_id:           clientId,
    period_label:        str(formData, "period_label"),
    period_start:        periodStart,
    period_end:          str(formData, "period_end") || null,
    sos_trajectory:      str(formData, "sos_trajectory")      || null,
    sos_magnitude:       str(formData, "sos_magnitude")       || null,
    sos_note:            str(formData, "sos_note"),
    save_rate_trend:     str(formData, "save_rate_trend")     || null,
    save_rate_note:      str(formData, "save_rate_note"),
    ugc_trend:           str(formData, "ugc_trend")           || null,
    ugc_note:            str(formData, "ugc_note"),
    sov_som_ratio:       str(formData, "sov_som_ratio")       || null,
    sov_som_note:        str(formData, "sov_som_note"),
    cep_coverage:        str(formData, "cep_coverage")        || null,
    cep_note:            str(formData, "cep_note"),
    competitive_context: str(formData, "competitive_context") || null,
    competitive_note:    str(formData, "competitive_note"),
  });
  if (error) {
    throw new Error(error.message);
  }
  revalidatePath(`/clients/${clientId}`);
  // No redirect — component calls /api/brand-momentum next (same pattern as saveWeeklySignalInputs)
}

// ─── Consumer Behaviour State (Feature 18A — Sprint 3) ───────────────────────
// Saves the human-entered observation for a behaviour state week.
// Called BEFORE /api/behaviour-state — creates the row that the API then updates.
// AI fields (diagnosed_state, state_name, etc.) are populated by the API route,
// not here. Internal only — never shown to clients.
export async function saveConsumerBehaviourObservation(
  campaignId: string,
  weekNumber: number,
  formData: FormData
) {
  const supabase = createAdminClient();

  const weekOf = str(formData, "week_of") || new Date().toISOString().slice(0, 10);
  const strategyNotes = str(formData, "strategy_notes");

  const { error } = await supabase
    .from("consumer_behaviour_states")
    .upsert(
      {
        campaign_id: campaignId,
        week_number: weekNumber,
        week_of: weekOf,
        strategy_notes: strategyNotes,
        // AI fields left at defaults — populated by /api/behaviour-state
      },
      { onConflict: "campaign_id,week_number" }
    );

  if (error) {
    redirect(
      `/campaigns/${campaignId}?error=${encodeURIComponent(error.message)}#behaviour-state`
    );
  }
  revalidatePath(`/campaigns/${campaignId}`);
}

// Upsert the cross-channel report skeleton (human fields — AI fields populated by API)
export async function upsertCrossChannelReport(
  campaignId: string,
  weekNumber: number,
  formData: FormData
) {
  const supabase = createAdminClient();
  const { error } = await supabase.from("cross_channel_reports").upsert(
    {
      campaign_id: campaignId,
      week_number: weekNumber,
      week_of: str(formData, "week_of") || new Date().toISOString().slice(0, 10),
      idea_integrity_note: str(formData, "idea_integrity_note"),
      budget_allocated: numOrNull(formData, "budget_allocated"),
      budget_deployed: numOrNull(formData, "budget_deployed"),
      // AI fields (ai_narrative, ai_recommended_actions, idea_integrity_score,
      // dominant_funnel_gap) are populated by /api/cross-channel-report — not here
    },
    { onConflict: "campaign_id,week_number" }
  );

  if (error) {
    redirect(`/campaigns/${campaignId}?error=${encodeURIComponent(error.message)}#cross-channel`);
  }
  revalidatePath(`/campaigns/${campaignId}`);
}

// ───────────────────────────────────────────────────────────────────────
// Consumer State Transition Rate — Feature F27 (Sprint 5)
// Internal only — state distribution, CSTR values, velocity_score
// are NEVER surfaced to clients.
// Client sees: ai_narrative from consumer_state_readings (plain language only).
// ───────────────────────────────────────────────────────────────────────

// Upsert a weekly Consumer State Reading for a campaign.
// CSTR computation is done by /api/behaviour-state before calling this action.
// This action stores the already-computed result.
export async function upsertConsumerStateReading(
  campaignId: string,
  weekNumber: number,
  formData: FormData
) {
  const supabase = createAdminClient();

  const { error } = await supabase.from("consumer_state_readings").upsert(
    {
      campaign_id: campaignId,
      week_number: weekNumber,
      week_of: str(formData, "week_of") || new Date().toISOString().slice(0, 10),
      // state_distribution, cstr_vs_prior, velocity_score: set by /api/behaviour-state
      // ai_narrative: set by /api/behaviour-state
      ai_narrative: str(formData, "ai_narrative") || "",
      reading_source: str(formData, "reading_source") || "behaviour-state",
    },
    { onConflict: "campaign_id,week_number" }
  );

  if (error) {
    redirect(
      `/campaigns/${campaignId}?error=${encodeURIComponent(error.message)}#behaviour-state`
    );
  }
  revalidatePath(`/campaigns/${campaignId}`);
}

// ───────────────────────────────────────────────────────────────────────
// Distinctive Brand Asset Registry — Feature F29 (Sprint 5)
// Internal only — consistency_score and asset_strength are INTERNAL.
// Client sees asset_name + asset_type only at onboarding orientation.
// ───────────────────────────────────────────────────────────────────────

export async function createBrandAsset(clientId: string, formData: FormData) {
  const supabase = createAdminClient();

  const { error } = await supabase.from("brand_assets").insert({
    client_id: clientId,
    asset_name: str(formData, "asset_name"),
    asset_type: str(formData, "asset_type") || "Visual",
    description: str(formData, "description") || "",
    asset_strength: str(formData, "asset_strength") || "Emerging",
    notes: str(formData, "notes") || "",
  });

  if (error) {
    redirect(
      `/clients/${clientId}?error=${encodeURIComponent(error.message)}#brand-assets`
    );
  }
  revalidatePath(`/clients/${clientId}`);
  redirect(`/clients/${clientId}#brand-assets`);
}

export async function updateBrandAsset(
  assetId: string,
  clientId: string,
  formData: FormData
) {
  const supabase = createAdminClient();

  const { error } = await supabase
    .from("brand_assets")
    .update({
      asset_name: str(formData, "asset_name"),
      asset_type: str(formData, "asset_type") || "Visual",
      description: str(formData, "description") || "",
      asset_strength: str(formData, "asset_strength") || "Emerging",
      notes: str(formData, "notes") || "",
    })
    .eq("id", assetId)
    .eq("client_id", clientId);  // double-check client ownership

  if (error) {
    redirect(
      `/clients/${clientId}?error=${encodeURIComponent(error.message)}#brand-assets`
    );
  }
  revalidatePath(`/clients/${clientId}`);
  redirect(`/clients/${clientId}#brand-assets`);
}

export async function deleteBrandAsset(assetId: string, clientId: string) {
  const supabase = createAdminClient();
  // Soft delete
  await supabase
    .from("brand_assets")
    .update({ active: false })
    .eq("id", assetId)
    .eq("client_id", clientId);
  revalidatePath(`/clients/${clientId}`);
  redirect(`/clients/${clientId}#brand-assets`);
}

// ───────────────────────────────────────────────────────────────────────
// F32 — Intelligence Orchestration Trigger (Sprint 7)
// Internal only. Fires /api/orchestrate as a background call after data changes.
// Non-blocking — failures are logged to orchestration_runs, not surfaced to user.
// ───────────────────────────────────────────────────────────────────────

type TriggerType =
  | "BRIEF_SUBMITTED"
  | "SIGNAL_ENTERED"
  | "MARKET_UPDATED"
  | "ATTRIBUTION_ENTERED";

/**
 * Fire the orchestration chain asynchronously.
 * Uses fire-and-forget pattern — does NOT await the chain result.
 * The chain writes its own run record + step outputs to the DB.
 */
async function fireOrchestration(
  campaignId: string,
  triggerType: TriggerType,
  triggerData: Record<string, unknown>
): Promise<void> {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  try {
    // Non-blocking: we kick off the chain but do not await its completion.
    // The chain is long-running (multiple Claude calls) — we return to the user
    // immediately and let the chain run in the background.
    fetch(`${baseUrl}/api/orchestrate`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-internal-chain": process.env.INTERNAL_CHAIN_SECRET ?? "",
      },
      body: JSON.stringify({
        campaign_id: campaignId,
        trigger_type: triggerType,
        trigger_data: triggerData,
      }),
    }).catch(() => {
      // Swallow errors — orchestration runs independently
    });
  } catch {
    // Non-blocking — chain failure does not affect the triggering action
  }
}

/**
 * Trigger: SIGNAL_ENTERED
 * Called from saveWeeklySignalInputs after signal data is committed.
 * Starts the primary chain: MDH → Signal → Consumer State → BMS → Risk → Activation.
 */
export async function triggerSignalOrchestration(
  campaignId: string,
  weekNumber: number
): Promise<void> {
  await fireOrchestration(campaignId, "SIGNAL_ENTERED", { week_number: weekNumber });
}

/**
 * Trigger: BRIEF_SUBMITTED
 * Called from updateFrameBrief (or lockFrameBrief) after brief is saved/locked.
 * Starts: IQ Evaluate → Media Mix → BIP Enrichment (if ICS < 70).
 */
export async function triggerBriefOrchestration(campaignId: string): Promise<void> {
  await fireOrchestration(campaignId, "BRIEF_SUBMITTED", { source: "frame_brief_update" });
}

/**
 * Trigger: MARKET_UPDATED
 * Called after signal_market_context is saved.
 * Re-evaluates: Signal context → BMS → Risk.
 */
export async function triggerMarketOrchestration(
  campaignId: string,
  weekNumber: number
): Promise<void> {
  await fireOrchestration(campaignId, "MARKET_UPDATED", { week_number: weekNumber });
}

/**
 * Trigger: ATTRIBUTION_ENTERED
 * Called after attribution_records are saved.
 * Updates: Attribution chain → BMS (attribution dimension).
 */
export async function triggerAttributionOrchestration(
  campaignId: string,
  weekNumber: number
): Promise<void> {
  await fireOrchestration(campaignId, "ATTRIBUTION_ENTERED", { week_number: weekNumber });
}

// ───────────────────────────────────────────────────────────────────────
// F32 — Orchestration run queries (read-only)
// ───────────────────────────────────────────────────────────────────────

/**
 * Get the most recent completed orchestration run for a campaign.
 * Used by F33 and F31 to retrieve the chain summary.
 */
export async function getLatestOrchestrationRun(campaignId: string) {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("orchestration_runs")
    .select("id, trigger_type, status, steps_completed, chain_summary, started_at, completed_at")
    .eq("campaign_id", campaignId)
    .in("status", ["COMPLETE", "MDH_QUARANTINE"])
    .order("started_at", { ascending: false })
    .limit(1)
    .single();

  if (error) return null;
  return data;
}

/**
 * Get all orchestration runs for a campaign (most recent first).
 * Used for internal audit and CIR generation.
 */
export async function getOrchestrationRunHistory(campaignId: string, limit = 10) {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("orchestration_runs")
    .select("id, trigger_type, status, steps_completed, steps_failed, chain_summary, started_at, completed_at")
    .eq("campaign_id", campaignId)
    .order("started_at", { ascending: false })
    .limit(limit);

  return data ?? [];
}

// ───────────────────────────────────────────────────────────────────────
// Sprint 5 — Expert Architecture Additions
// ───────────────────────────────────────────────────────────────────────

/**
 * Save Demand investment % for this campaign's FRAME brief.
 * Used by Brand Health Battery to track rolling 60:40 ratio.
 */
export async function saveDemandInvestmentPct(campaignId: string, formData: FormData) {
  const supabase = createAdminClient();
  const pct = numOrNull(formData, "demand_investment_pct");

  await supabase
    .from("frame_briefs")
    .update({ demand_investment_pct: pct })
    .eq("campaign_id", campaignId);

  revalidatePath(`/campaigns/${campaignId}`);
}

/**
 * Save / upsert Campaign Learning Record (F18C).
 * One record per campaign. Subsequent saves update the existing record.
 */
export async function saveCampaignLearning(campaignId: string, formData: FormData) {
  const supabase = createAdminClient();

  const payload = {
    campaign_id:                 campaignId,
    what_worked:                 str(formData, "what_worked"),
    what_to_change:              str(formData, "what_to_change"),
    signal_insights:             str(formData, "signal_insights"),
    anchor_recommendation:       str(formData, "anchor_recommendation"),
    kill_switch_recommendation:  str(formData, "kill_switch_recommendation"),
    channel_recommendation:      str(formData, "channel_recommendation"),
    budget_split_recommendation: str(formData, "budget_split_recommendation"),
    sov_pct:                     numOrNull(formData, "sov_pct"),
    som_pct:                     numOrNull(formData, "som_pct"),
    updated_at:                  new Date().toISOString(),
  };

  await supabase
    .from("campaign_learning_records")
    .upsert(payload, { onConflict: "campaign_id" });

  revalidatePath(`/campaigns/${campaignId}`);
}

/**
 * Save Audience Replenishment Rate entry for a week.
 * Upserts on (campaign_id, week_number).
 */
export async function saveAudienceReplenishment(campaignId: string, formData: FormData) {
  const supabase = createAdminClient();

  const week = numOrNull(formData, "week_number");
  if (week === null) return;

  const payload = {
    campaign_id:               campaignId,
    week_number:               week,
    estimated_nurture_pool:    numOrNull(formData, "estimated_nurture_pool"),
    weekly_conversion_count:   numOrNull(formData, "weekly_conversion_count"),
    demand_new_audience:       numOrNull(formData, "demand_new_audience"),
    notes:                     str(formData, "notes"),
  };

  await supabase
    .from("audience_replenishment")
    .upsert(payload, { onConflict: "campaign_id,week_number" });

  revalidatePath(`/campaigns/${campaignId}`);
}

// ───────────────────────────────────────────────────────────────────────
// Outcome-Led Signal Mapping (migration 0073/0074) — internal only.
// Reads live in lib/data.ts (getSignalVocabulary, getActiveCampaignSignalMap,
// getCampaignSignalMapHistory, getActiveSignalMapSummaries); this is the one
// mutation. Never surfaced client-facing. See project memory: Outcome-Led
// Signal Mapping — APPLIED.
// ───────────────────────────────────────────────────────────────────────

export type SaveCampaignSignalMapInput = {
  campaign_id: string;
  category_attribute_id: string;
  signal_map_profile_name: string | null;
  behaviour_chain_used: string[];
  leading_signals: string[];
  conversion_signals: string[];
  lagging_signals: string[];
  signal_weights: Record<string, string>;
  available_data: string[];
  available_data_notes: string | null;
  // Manually curated by the strategist — never auto-derived as the
  // complement of available_data. missing_data means "would improve
  // confidence for this campaign," not "everything not selected."
  missing_data: string[];
  // Brand-Commerce Intelligence Extension v0.1 — strategist-set only, never
  // auto-computed. Optional: omitted/null defaults to "not_classified" so
  // this never blocks an existing save flow.
  classification?: BrandCommerceClassification | null;
};

export async function saveCampaignSignalMap(input: SaveCampaignSignalMapInput) {
  await assertInternalSession();

  const supabase = createAdminClient();

  // 1. Validate every signal key against the live vocabulary, fetched fresh
  //    (not cached) — this is the guardrail that replaced free-text
  //    matching. Any key not in signal_vocabulary is rejected outright.
  const { data: vocabRows, error: vocabError } = await supabase
    .from("signal_vocabulary")
    .select("key");
  if (vocabError) throw new Error(vocabError.message);
  const validKeys = new Set((vocabRows as { key: string }[]).map((r) => r.key));

  const keyErrors = validateSignalMapKeys(
    {
      leading_signals: input.leading_signals,
      conversion_signals: input.conversion_signals,
      lagging_signals: input.lagging_signals,
      available_data: input.available_data,
      missing_data: input.missing_data,
    },
    validKeys
  );
  if (Object.keys(keyErrors).length > 0) {
    const detail = Object.entries(keyErrors)
      .map(([field, keys]) => `${field}: ${keys.join(", ")}`)
      .join(" | ");
    throw new Error(`Unknown signal key(s) — not in signal_vocabulary: ${detail}`);
  }

  // 1b. Brand-Commerce classification — strategist-set only. Server-side
  // check redundant with the DB CHECK constraint by design (belt-and-braces:
  // fails fast with a clear message here rather than surfacing a raw
  // Postgres constraint violation to the strategist).
  const classification = input.classification ?? "not_classified";
  if (!BRAND_COMMERCE_CLASSIFICATION_VALUES.includes(classification)) {
    throw new Error(`Invalid classification value: ${classification}`);
  }

  // 2. Look up the category (for confidence-label defaults) and the
  //    campaign's client business_outcome_label — fetched server-side as the
  //    denormalized snapshot, not trusted from the client payload.
  const { data: category, error: categoryError } = await supabase
    .from("category_attributes")
    .select("*")
    .eq("id", input.category_attribute_id)
    .single();
  if (categoryError) throw new Error(categoryError.message);

  const { data: campaignRow, error: campaignError } = await supabase
    .from("campaigns")
    .select("client_id, clients(business_outcome_label)")
    .eq("id", input.campaign_id)
    .single();
  if (campaignError) throw new Error(campaignError.message);
  const businessOutcomeLabel =
    (campaignRow as unknown as { clients: { business_outcome_label: string } | null }).clients
      ?.business_outcome_label ?? "Business Outcome";

  // 3. Deterministic confidence label — no AI, no free-text matching.
  const confidence = computeConfidenceLabel(input.available_data, category as CategoryAttribute);

  // 4. Deactivate any current active map for this campaign, then insert the
  //    new one as active. idx_campaign_signal_maps_one_active (partial
  //    unique index on campaign_id WHERE is_active) is the DB-level
  //    backstop if this sequence is ever interrupted mid-way.
  const { error: deactivateError } = await supabase
    .from("campaign_signal_maps")
    .update({ is_active: false })
    .eq("campaign_id", input.campaign_id)
    .eq("is_active", true);
  if (deactivateError) throw new Error(deactivateError.message);

  const { data: inserted, error: insertError } = await supabase
    .from("campaign_signal_maps")
    .insert({
      campaign_id: input.campaign_id,
      category_attribute_id: input.category_attribute_id,
      business_outcome_label: businessOutcomeLabel,
      signal_map_profile_name: input.signal_map_profile_name,
      behaviour_chain_used: input.behaviour_chain_used,
      leading_signals: input.leading_signals,
      conversion_signals: input.conversion_signals,
      lagging_signals: input.lagging_signals,
      signal_weights: input.signal_weights,
      available_data: input.available_data,
      available_data_notes: input.available_data_notes,
      missing_data: input.missing_data,
      confidence_label: confidence.label,
      confidence_reason: confidence.reason,
      confidence_matched_data: confidence.matched,
      map_status: "draft",
      classification,
      is_active: true,
    })
    .select()
    .single();
  if (insertError) throw new Error(insertError.message);

  revalidatePath(`/signal-maps/${input.campaign_id}`);
  revalidatePath("/signal-maps");

  return inserted;
}

export async function updateSignalMapStatus(mapId: string, campaignId: string, status: MapStatus) {
  await assertInternalSession();
  const supabase = createAdminClient();

  const { error } = await supabase
    .from("campaign_signal_maps")
    .update({ map_status: status })
    .eq("id", mapId);
  if (error) throw new Error(error.message);

  revalidatePath(`/signal-maps/${campaignId}`);
  revalidatePath("/signal-maps");
}

// ───────────────────────────────────────────────────────────────────────
// Brief / Recommendation Compliance
// ───────────────────────────────────────────────────────────────────────
// One form submits every checklist item at once (matches the "Submit
// compliance report" pattern) — fields are named `status__<itemId>` and
// `reason__<itemId>` per row, plus a single shared `submitted_by`.

export async function submitComplianceReport(campaignId: string, formData: FormData) {
  const supabase = createAdminClient();
  const submittedBy = str(formData, "submitted_by") || "ShiftImpact strategist";
  const now = new Date().toISOString();

  const itemIds = new Set<string>();
  for (const key of formData.keys()) {
    if (key.startsWith("status__")) itemIds.add(key.slice("status__".length));
  }

  for (const itemId of itemIds) {
    const status = str(formData, `status__${itemId}`) as ComplianceStatus;
    if (!status || status === "Pending") continue; // untouched row — leave as-is
    const reason = str(formData, `reason__${itemId}`) || null;

    await supabase
      .from("report_recommendation_compliance")
      .update({
        status,
        reason: status === "Done in full" ? null : reason,
        acknowledged_by: submittedBy,
        acknowledged_at: now,
      })
      .eq("id", itemId);
  }

  revalidatePath(`/portal/${campaignId}`);
  redirect(`/portal/${campaignId}?view=agency#compliance`);
}

// ─── Compliance PIC reassignment ─────────────────────────────────────────
// Not every logged recommendation is the agency's to execute — some are the
// client's own internal work (IT, ops, a specific department). This lets the
// client hand a single compliance item to the right person in charge on
// their side. See migration 0083 for the owner_scope/assigned_pic columns.
export async function reassignComplianceItem(campaignId: string, formData: FormData) {
  const supabase = createAdminClient();
  const itemId = str(formData, "item_id");
  const assignedPic = str(formData, "assigned_pic").trim();
  const reassignedBy = str(formData, "reassigned_by").trim() || "Client";
  if (!itemId || !assignedPic) return;

  await supabase
    .from("report_recommendation_compliance")
    .update({
      owner_scope: "client",
      assigned_pic: assignedPic,
      reassigned_by: reassignedBy,
      reassigned_at: new Date().toISOString(),
    })
    .eq("id", itemId);

  revalidatePath(`/portal/${campaignId}`);
  redirect(`/portal/${campaignId}#compliance`);
}

// Client-side counterpart to submitComplianceReport — same update logic
// (reused verbatim), but only ever touches items already reassigned to the
// client (owner_scope = 'client'), and redirects back to the brand view
// instead of the agency view.
export async function submitClientComplianceStatus(campaignId: string, formData: FormData) {
  const supabase = createAdminClient();
  const submittedBy = str(formData, "submitted_by") || "Client";
  const now = new Date().toISOString();

  const itemIds = new Set<string>();
  for (const key of formData.keys()) {
    if (key.startsWith("status__")) itemIds.add(key.slice("status__".length));
  }

  for (const itemId of itemIds) {
    const status = str(formData, `status__${itemId}`) as ComplianceStatus;
    if (!status || status === "Pending") continue;
    const reason = str(formData, `reason__${itemId}`) || null;

    await supabase
      .from("report_recommendation_compliance")
      .update({
        status,
        reason: status === "Done in full" ? null : reason,
        acknowledged_by: submittedBy,
        acknowledged_at: now,
      })
      .eq("id", itemId)
      .eq("owner_scope", "client"); // guard — only items actually handed to the client
  }

  revalidatePath(`/portal/${campaignId}`);
  redirect(`/portal/${campaignId}#compliance`);
}

// ─── External Reviewers card v0.1 ────────────────────────────────────────────
// Manages org_access_grants rows for resource_type "campaign" — who outside
// ShiftImpact can open /culture-review/[campaignId]. Deliberately gated on
// assertShiftImpactSession(), unlike the FRAME Brief / Strategic Basis
// Sources actions above, which had session gating removed because the
// campaign working page itself has no login wall in v1 (see the comment on
// removeStrategicBasisSource). Granting external access is a different risk
// class from editing campaign copy, so this one requires a real signed-in
// ShiftImpact OS session by design — which in practice means it will throw
// "Unauthorized" unless the person using this card is signed in via
// /login as a ShiftImpact user, since nothing else on this page currently
// requires that.
//
// Originally gated on assertInternalSession() alone, which only proves a
// session exists — a Partner/Client user (an external reviewer themselves)
// would pass that identically to a ShiftImpact strategist. Patched to
// assertShiftImpactSession(), which additionally checks
// user_profiles.org_type === "ShiftImpact", so this action is correct on
// its own and does not rely on middleware's EXTERNAL_ALLOWED_PREFIXES guard
// as the only thing standing between an external session and granting
// access to other external users.

const EXTERNAL_REVIEWER_ACCESS_LEVELS: ExternalReviewerAccessLevel[] = ["view", "view_plus_assessment"];
const EXTERNAL_REVIEWER_ORG_TYPES = ["Partner", "Client"] as const;

export type UpsertExternalReviewerGrantInput = {
  campaign_id: string;
  email: string;
  access_level: ExternalReviewerAccessLevel;
  organisation_id?: string | null;
  new_organisation_name?: string | null;
  new_organisation_type?: "Partner" | "Client" | null;
};

export type UpsertExternalReviewerGrantResult =
  | { ok: true; created: boolean }
  | { ok: false; error: string };

export async function upsertExternalReviewerGrant(
  input: UpsertExternalReviewerGrantInput,
): Promise<UpsertExternalReviewerGrantResult> {
  await assertShiftImpactSession();

  const email = input.email.trim();
  if (!email) return { ok: false, error: "Email is required." };

  if (!EXTERNAL_REVIEWER_ACCESS_LEVELS.includes(input.access_level)) {
    return { ok: false, error: "Choose a valid access level." };
  }

  const supabase = createAdminClient();

  // 1. Resolve the organisation — either an existing row, or a minimal new
  // one created inline. Every org_access_grants row requires a
  // grantee_org_id (NOT NULL), and organisations has no link back to
  // clients, so this can never be silently inferred from the campaign.
  let organisationId = input.organisation_id?.trim() || null;
  if (!organisationId) {
    const newName = input.new_organisation_name?.trim();
    const newType = input.new_organisation_type;
    if (!newName) {
      return { ok: false, error: "Choose an organisation, or enter a name to create one." };
    }
    if (!newType || !EXTERNAL_REVIEWER_ORG_TYPES.includes(newType)) {
      return { ok: false, error: "Choose whether the new organisation is a Partner or a Client." };
    }
    const { data: newOrg, error: orgError } = await supabase
      .from("organisations")
      .insert({ name: newName, type: newType })
      .select("id")
      .single();
    if (orgError) return { ok: false, error: orgError.message };
    organisationId = (newOrg as { id: string }).id;
  }

  // 2. Resolve the auth user by email — existing-user-only for v0.1, no
  // account creation here. The lookup function returns only an id (or
  // null), never other auth.users columns — see migration 0095.
  const { data: userId, error: lookupError } = await supabase.rpc("lookup_auth_user_id_by_email", {
    lookup_email: email,
  });
  if (lookupError) return { ok: false, error: lookupError.message };
  if (!userId) {
    return {
      ok: false,
      error: `No account found for ${email}. They need to sign in once at /login before you can grant access.`,
    };
  }

  // 3. Update the existing grant if this user already has one for this
  // campaign, otherwise insert. This is a read-then-write, not a database
  // upsert — targeting ON CONFLICT against a partial unique index needs
  // its WHERE clause restated at the conflict target, which supabase-js's
  // .upsert() has no way to express. Migration 0095's partial unique index
  // is still the real backstop: if a genuine race slips past this check,
  // the insert below fails with 23505 instead of silently duplicating.
  const { data: existing, error: existingError } = await supabase
    .from("org_access_grants")
    .select("id")
    .eq("resource_type", "campaign")
    .eq("resource_id", input.campaign_id)
    .eq("grantee_user_id", userId as string)
    .maybeSingle();
  if (existingError) return { ok: false, error: existingError.message };

  if (existing) {
    const { error: updateError } = await supabase
      .from("org_access_grants")
      .update({ access_level: input.access_level, grantee_org_id: organisationId })
      .eq("id", (existing as { id: string }).id);
    if (updateError) return { ok: false, error: updateError.message };
    revalidatePath(`/campaigns/${input.campaign_id}`);
    return { ok: true, created: false };
  }

  const { error: insertError } = await supabase.from("org_access_grants").insert({
    resource_type: "campaign",
    resource_id: input.campaign_id,
    grantee_user_id: userId as string,
    grantee_org_id: organisationId,
    access_level: input.access_level,
  });
  if (insertError) {
    // 23505 = unique_violation — the partial unique index catching a race
    // that slipped past the read-then-write check above.
    if ((insertError as { code?: string }).code === "23505") {
      return { ok: false, error: "This person already has a grant for this campaign. Refresh and try again." };
    }
    return { ok: false, error: insertError.message };
  }

  revalidatePath(`/campaigns/${input.campaign_id}`);
  return { ok: true, created: true };
}

// ─── External Reviewer invite email v0.1 ─────────────────────────────────────
// Notification-only nudge for the "No account found" dead end in
// upsertExternalReviewerGrant(): tells someone with no Supabase Auth account
// yet to go sign in, so a strategist can grant them access afterward. This
// action does NOT create an Auth user, does NOT touch org_access_grants, and
// writes nothing to the database — it sends one Resend email and returns.
// Access is still only ever granted through the existing upsert flow, after
// the person has actually signed in.
//
// Deliberately uses Resend (same raw-fetch pattern as
// app/api/campaign-report/[id]/send-agency-preview/route.ts), not Supabase's
// own admin.inviteUserByEmail() — that goes through the same Supabase SMTP
// quota that's currently exhausted and paused. Resend is a separate quota,
// so this can be sent without touching the thing we're protecting.
//
// Gated on assertShiftImpactSession() — same reasoning as
// upsertExternalReviewerGrant: this is still "who gets nudged toward access
// to this campaign," not a harmless read.

// No hardcoded fallback here on purpose. The earlier version defaulted to
// https://www.shift-impact.com, copied from send-agency-preview's fallback
// — but that's not this app's live domain (shiftimpact-os.vercel.app is),
// so a missing env var would have silently sent a login link to the wrong
// site. Safer to refuse to send than to send a broken link.

export type SendExternalReviewerInviteInput = {
  campaign_id: string;
  campaign_name: string;
  email: string;
  organisation_type: "Partner" | "Client";
};

export type SendExternalReviewerInviteResult = { ok: true } | { ok: false; error: string };

function buildExternalReviewerInviteEmail(params: {
  campaignName: string;
  loginUrl: string;
  isAgency: boolean;
}): { subject: string; html: string } {
  const { campaignName, loginUrl, isAgency } = params;

  const subject = isAgency
    ? `You've been invited to review — ${campaignName}`
    : `Your culture review is ready — ${campaignName}`;

  const intro = isAgency
    ? `You've been invited to review the culture intelligence behind <strong>${campaignName}</strong> so you can prep your narrative before it goes further.`
    : `You've been invited to review the culture intelligence behind <strong>${campaignName}</strong>.`;

  const cta = isAgency ? "Sign in to review →" : "Sign in to view →";

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>${subject}</title>
</head>
<body style="margin:0;padding:0;background:#f5f5f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;">
<div style="max-width:560px;margin:0 auto;padding:32px 16px;">
  <div style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 4px rgba(0,0,0,0.08);">
    <div style="background:#1e3a5f;padding:28px 32px;">
      <p style="font-size:10px;color:#93c5fd;letter-spacing:0.12em;text-transform:uppercase;margin:0 0 6px;">ShiftImpact OS — Culture Review</p>
      <p style="font-size:20px;font-weight:600;color:#ffffff;margin:0;">${campaignName}</p>
    </div>
    <div style="padding:28px 32px;">
      <p style="font-size:15px;color:#374151;line-height:1.7;margin:0 0 20px;">${intro}</p>
      <p style="font-size:13px;color:#6b7280;line-height:1.6;margin:0 0 20px;">
        You'll need to sign in once with this email address to get access. If this is your first time, that sign-in also creates your account — no separate signup needed.
      </p>
      <a href="${loginUrl}" style="display:block;text-align:center;background:#1e3a5f;color:#ffffff;font-size:15px;font-weight:600;padding:14px 24px;border-radius:8px;text-decoration:none;margin:0 0 20px;">${cta}</a>
      <hr style="border:none;border-top:1px solid #f3f4f6;margin:20px 0;" />
      <p style="font-size:12px;color:#9ca3af;line-height:1.6;margin:0;">
        If you weren't expecting this, you can ignore this email.
      </p>
    </div>
    <div style="padding:20px 32px;background:#fafafa;border-top:1px solid #f3f4f6;">
      <p style="font-size:11px;color:#9ca3af;margin:0;">ShiftImpact OS &nbsp;·&nbsp; Growth Intelligence for ${campaignName}</p>
    </div>
  </div>
</div>
</body>
</html>`;

  return { subject, html };
}

export async function sendExternalReviewerInvite(
  input: SendExternalReviewerInviteInput,
): Promise<SendExternalReviewerInviteResult> {
  await assertShiftImpactSession();

  const email = input.email.trim();
  if (!email) return { ok: false, error: "Email is required." };

  const resendKey = process.env.RESEND_API_KEY;
  const fromEmail = process.env.RESEND_FROM_EMAIL;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;
  if (!resendKey || !fromEmail || !appUrl) {
    return { ok: false, error: "Invite email sending isn't configured." };
  }

  const loginUrl = `${appUrl}/login?next=${encodeURIComponent(
    `/culture-review/${input.campaign_id}`,
  )}`;

  const { subject, html } = buildExternalReviewerInviteEmail({
    campaignName: input.campaign_name,
    loginUrl,
    isAgency: input.organisation_type === "Partner",
  });

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: fromEmail,
        to: [email],
        subject,
        html,
      }),
    });
    if (!res.ok) {
      console.error("[sendExternalReviewerInvite] Resend error:", await res.text());
      return { ok: false, error: "Couldn't send the invite email. Try again." };
    }
  } catch (err) {
    console.error("[sendExternalReviewerInvite] Email send failed:", err);
    return { ok: false, error: "Couldn't send the invite email. Try again." };
  }

  return { ok: true };
}


// ───────────────────────────────────────────────────────────────────────
// Platform Benchmark Reference Library — v0.1 (migration 0099)
// INTERNAL ONLY. Plain CRUD over platform_benchmarks — no AI, no scraping,
// no connection to Creative Format Read. Mirrors createPartner/
// updatePartner/togglePartner/deletePartner's shape exactly: gated by the
// (os) route group's own session requirement (same as every other action
// in this section), not an explicit assertInternalSession() call — this is
// ordinary internal reference data, not an access-control action.
// ───────────────────────────────────────────────────────────────────────

export async function createPlatformBenchmark(formData: FormData) {
  const supabase = createAdminClient();

  const marketApplicability = str(formData, "market_applicability");
  const sourceType = str(formData, "source_type");
  const confidenceLevel = str(formData, "confidence_level") || "medium";

  if (!isValidMarketApplicability(marketApplicability)) {
    redirect(`/platform-benchmarks?error=${encodeURIComponent("Invalid market applicability value")}`);
  }
  if (!isValidSourceType(sourceType)) {
    redirect(`/platform-benchmarks?error=${encodeURIComponent("Invalid source type value")}`);
  }
  if (!isValidConfidenceLevel(confidenceLevel)) {
    redirect(`/platform-benchmarks?error=${encodeURIComponent("Invalid confidence level value")}`);
  }

  const riskTags = sanitizeRiskTags(formData.getAll("risk_tags") as string[]);

  const { error } = await supabase.from("platform_benchmarks").insert({
    platform: str(formData, "platform"),
    format: str(formData, "format"),
    asset_type: str(formData, "asset_type"),
    campaign_objective: str(formData, "campaign_objective") || null,
    market_code: str(formData, "market_code") || null,
    market_applicability: marketApplicability,
    source_type: sourceType,
    source_title: str(formData, "source_title"),
    source_url: str(formData, "source_url") || null,
    captured_on: dateOrNull(formData, "captured_on"),
    staleness_window_days: numOrNull(formData, "staleness_window_days"),
    guidance_or_benchmark: str(formData, "guidance_or_benchmark"),
    strategic_implication: str(formData, "strategic_implication"),
    risk_tags: riskTags,
    what_to_check_in_asset: str(formData, "what_to_check_in_asset") || null,
    what_not_to_claim: str(formData, "what_not_to_claim") || null,
    confidence_level: confidenceLevel,
    is_active: true,
  });
  if (error) redirect(`/platform-benchmarks?error=${encodeURIComponent(error.message)}`);
  revalidatePath("/platform-benchmarks");
  redirect("/platform-benchmarks");
}

export async function updatePlatformBenchmark(benchmarkId: string, formData: FormData) {
  const supabase = createAdminClient();

  const marketApplicability = str(formData, "market_applicability");
  const sourceType = str(formData, "source_type");
  const confidenceLevel = str(formData, "confidence_level") || "medium";

  if (!isValidMarketApplicability(marketApplicability)) {
    redirect(`/platform-benchmarks?error=${encodeURIComponent("Invalid market applicability value")}`);
  }
  if (!isValidSourceType(sourceType)) {
    redirect(`/platform-benchmarks?error=${encodeURIComponent("Invalid source type value")}`);
  }
  if (!isValidConfidenceLevel(confidenceLevel)) {
    redirect(`/platform-benchmarks?error=${encodeURIComponent("Invalid confidence level value")}`);
  }

  const riskTags = sanitizeRiskTags(formData.getAll("risk_tags") as string[]);

  const { error } = await supabase.from("platform_benchmarks").update({
    platform: str(formData, "platform"),
    format: str(formData, "format"),
    asset_type: str(formData, "asset_type"),
    campaign_objective: str(formData, "campaign_objective") || null,
    market_code: str(formData, "market_code") || null,
    market_applicability: marketApplicability,
    source_type: sourceType,
    source_title: str(formData, "source_title"),
    source_url: str(formData, "source_url") || null,
    captured_on: dateOrNull(formData, "captured_on"),
    staleness_window_days: numOrNull(formData, "staleness_window_days"),
    guidance_or_benchmark: str(formData, "guidance_or_benchmark"),
    strategic_implication: str(formData, "strategic_implication"),
    risk_tags: riskTags,
    what_to_check_in_asset: str(formData, "what_to_check_in_asset") || null,
    what_not_to_claim: str(formData, "what_not_to_claim") || null,
    confidence_level: confidenceLevel,
  }).eq("id", benchmarkId);
  if (error) redirect(`/platform-benchmarks?error=${encodeURIComponent(error.message)}`);
  revalidatePath("/platform-benchmarks");
  redirect("/platform-benchmarks");
}

// "Archive" / "Restore" — never a hard delete of the normal kind (see
// deletePlatformBenchmark below, kept only for a true mis-entry). Archiving
// is the expected way a stale or superseded entry is retired: the row
// stays for history but getPlatformBenchmarks()'s consumers must treat
// is_active === false as not-citable. Named toggle to match togglePartner's
// bind(null, id, !current) call pattern in the client component.
export async function togglePlatformBenchmarkActive(benchmarkId: string, active: boolean) {
  const supabase = createAdminClient();
  const { error } = await supabase.from("platform_benchmarks")
    .update({ is_active: active })
    .eq("id", benchmarkId);
  if (error) redirect(`/platform-benchmarks?error=${encodeURIComponent(error.message)}`);
  revalidatePath("/platform-benchmarks");
  redirect("/platform-benchmarks");
}

// True delete — for a genuine mis-entry (wrong data entered, not a stale
// reference). Archiving (above) is the correct action for "this guidance
// is outdated"; this is only for "this row should never have existed."
export async function deletePlatformBenchmark(benchmarkId: string) {
  const supabase = createAdminClient();
  const { error } = await supabase.from("platform_benchmarks").delete().eq("id", benchmarkId);
  if (error) redirect(`/platform-benchmarks?error=${encodeURIComponent(error.message)}`);
  revalidatePath("/platform-benchmarks");
  redirect("/platform-benchmarks");
}
