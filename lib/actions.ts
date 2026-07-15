"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";

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

export async function createClient(formData: FormData) {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("clients")
    .insert({
      name: str(formData, "name"),
      industry_profile: str(formData, "industry_profile"),
      business_outcome_label: str(formData, "business_outcome_label") || "Business Outcome",
      retention_metric_label: str(formData, "retention_metric_label") || "Retention Metric",
    })
    .select("id")
    .single();

  if (error) {
    redirect(`/clients?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/clients");
  redirect(`/clients/${data.id}`);
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
    })
    .eq("id", clientId);

  if (error) {
    redirect(`/clients/${clientId}?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath(`/clients/${clientId}`);
  revalidatePath("/clients");
  redirect(`/clients/${clientId}`);
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

  // Instantiate the 4 Phase Gates from Gate Templates
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
  }

  revalidatePath(`/campaigns/${campaignId}`);
  redirect(`/campaigns/${campaignId}#frame`);
}

// ───────────────────────────────────────────────────────────────────────
// Kill Switches
// ───────────────────────────────────────────────────────────────────────

export async function createKillSwitch(campaignId: string, frameBriefId: string, formData: FormData) {
  const supabase = createAdminClient();
  const { error } = await supabase.from("kill_switches").insert({
    frame_brief_id: frameBriefId,
    condition: str(formData, "condition"),
    trigger_status: str(formData, "trigger_status") || "Inactive",
    priority: str(formData, "priority") || "Medium",
  });

  if (error) {
    redirect(`/campaigns/${campaignId}?error=${encodeURIComponent(error.message)}#kill-switches`);
  }

  revalidatePath(`/campaigns/${campaignId}`);
  redirect(`/campaigns/${campaignId}#kill-switches`);
}

export async function updateKillSwitch(campaignId: string, killSwitchId: string, formData: FormData) {
  const supabase = createAdminClient();
  const { error } = await supabase
    .from("kill_switches")
    .update({
      condition: str(formData, "condition"),
      trigger_status: str(formData, "trigger_status"),
      priority: str(formData, "priority"),
    })
    .eq("id", killSwitchId);

  if (error) {
    redirect(`/campaigns/${campaignId}?error=${encodeURIComponent(error.message)}#kill-switches`);
  }

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
  const { error } = await supabase.from("stage_briefs").insert({
    campaign_id: campaignId,
    stage: str(formData, "stage"),
    channel: str(formData, "channel"),
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
  const { error } = await supabase
    .from("stage_briefs")
    .update({
      channel: str(formData, "channel"),
      brief_body: str(formData, "brief_body"),
      propagation_mechanism: str(formData, "propagation_mechanism"),
      idea_led_vs_spend_led: str(formData, "idea_led_vs_spend_led") || null,
      status: str(formData, "status"),
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

  if (error) {
    redirect(`/os-rules?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/os-rules");
  redirect("/os-rules");
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
  const { error } = await supabase.from("idea_extensions").update({
    expression_name: str(formData, "expression_name") || "",
    channel_role: channelRole,
    brief_body: str(formData, "brief_body"),
    propagation_mechanism: str(formData, "propagation_mechanism"),
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
      current_phase: (str(formData, "current_phase") || "Demand") as "Demand" | "Conversion" | "Retention" | "Complete",
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
    signal_1_threshold_pct: Number(str(formData, "signal_1_threshold_pct")) || 20,
    signal_1_amber_pct: Number(str(formData, "signal_1_amber_pct")) || 10,
    signal_1_red_pct: Number(str(formData, "signal_1_red_pct")) || 0,
    signal_2_label: str(formData, "signal_2_label") || "Content Save Rate",
    signal_2_threshold_pct: Number(str(formData, "signal_2_threshold_pct")) || 8,
    signal_2_amber_pct: Number(str(formData, "signal_2_amber_pct")) || 4,
    signal_2_red_pct: Number(str(formData, "signal_2_red_pct")) || 2,
    signal_3_label: str(formData, "signal_3_label") || "UGC Volume (Apify)",
    signal_3_threshold_count: Number(str(formData, "signal_3_threshold_count")) || 100,
    signal_3_amber_count: Number(str(formData, "signal_3_amber_count")) || 50,
    signal_3_red_count: Number(str(formData, "signal_3_red_count")) || 20,
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
      signal_3_actual_count: numOrNull(formData, "signal_3_actual_count"),
      campaign_phase: phase,
      flags_suppressed: phase === 1,
      // Health and AI narrative are populated by /api/signal-report
      // Stored as Green defaults here; component calls /api/signal-report after save
      demand_health: "Green",
      nurture_health: "Green",
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
    redirect(`/clients/${clientId}?error=${encodeURIComponent("Period start date is required")}#brand-momentum`);
    return;
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
    redirect(`/clients/${clientId}?error=${encodeURIComponent(error.message)}#brand-momentum`);
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
