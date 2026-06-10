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
      force: str(formData, "force"),
      role: str(formData, "role"),
      anchor: str(formData, "anchor"),
      mood: str(formData, "mood"),
      expression: str(formData, "expression"),
      clarity_statement: str(formData, "clarity_statement"),
      ics_cultural_fit: numOrNull(formData, "ics_cultural_fit") ?? 1,
      ics_business_alignment: numOrNull(formData, "ics_business_alignment") ?? 1,
      ics_audience_tension: numOrNull(formData, "ics_audience_tension") ?? 1,
      ics_executional_coherence: numOrNull(formData, "ics_executional_coherence") ?? 1,
      ics_measurability: numOrNull(formData, "ics_measurability") ?? 1,
      ics_scalability: numOrNull(formData, "ics_scalability") ?? 1,
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
