// lib/window-alerts.ts
// Signal-to-opportunity-window matching engine.
//
// Each scan produces new business_signals. This module maps those signals
// to opportunity_windows and upserts window_alerts — one per company per window.
// Called after every scan (cron or manual). Non-fatal: errors are logged, not thrown.

import { createAdminClient } from "@/lib/supabase/admin";

type Signal = {
  id: string;
  signal_category: string;
  signal_type: string;
  signal_text: string;
};

type OpportunityWindow = {
  id: string;
  window_type: string;
  label: string;
};

// ─── Signal → window_type mapping ────────────────────────────────────────────
// Priority order matters: more specific checks come first.
// Returns the first match only.

function matchWindowType(signal: Signal): string | null {
  const cat  = signal.signal_category.toLowerCase();
  const type = signal.signal_type.toLowerCase();
  const text = signal.signal_text.toLowerCase();
  const full = `${type} ${text}`;

  // Leadership change — any Leadership category signal
  if (cat === "leadership") return "leadership_change";

  // Funding event — Growth + funding keywords
  if (
    (cat === "growth" || cat === "milestone") &&
    /\bfund(ing|ed)?\b|rais(ed|ing)\b|series [a-e]\b|invest(ment|or|ed)?\b|venture capital\b|vc \b|capital raise\b/.test(full)
  ) return "funding_event";

  // RFP / agency review — procurement or agency-selection signals
  if (/\brfp\b|tender\b|procure(ment)?\b|agency review\b|vendor select|pitch (for|to)\b|marketing ops\b/.test(full))
    return "rfp_cycle";

  // Contract renewal — vendor, retainer, contract keywords
  if (/\bcontract\b|renewal\b|renew(ed|ing)\b|retainer\b|service agreement\b/.test(full))
    return "renewal_season";

  // Strategic move — MOU, signed partnership/agreement, market expansion, joint venture.
  // These are active strategic commitments that create a narrative gap: the external
  // story rarely keeps pace with the move itself. That gap is the entry point.
  // Note: pure award wins are conversation starters (handled below), not opportunity windows.
  if (
    (cat === "growth" || cat === "milestone" || cat === "recognition") &&
    /\bmou\b|memorandum of understanding\b|strategic (partnership|alliance|agreement|collaboration)\b|joint venture\b|distribution (partner|agreement|deal)\b|(signed|signing|announced?)\b.{0,50}\b(agreement|deal|partnership|alliance|collaboration|mou)\b|(agreement|deal|partnership|alliance)\b.{0,30}\b(signed|announced)\b|market expansion\b|expand(ed|ing) (into|to)\b|\bnew market\b|entered\b.{0,25}\bmarket\b/.test(full)
  ) return "strategic_move";

  // Conference / active event participation — speaking, keynoting, sponsoring, exhibiting.
  // Does NOT include pure award wins — those are relationship openers shown in the signals
  // log, not opportunity windows. An award win with a conference context (e.g. "won at
  // Cannes Lions") correctly fires here because the conference keyword is present.
  if (
    (cat === "recognition" || cat === "milestone" || cat === "activation") &&
    /\bspeak(er|ing|s)\b|keynote\b|conference\b|summit\b|forum\b|sponsor(ship|ing|s|ed)?\b|exhibitor?\b|panel(list|led)?\b/.test(full)
  ) return "conference_calendar";

  // Award-only signals (Recognition + award keyword, no event context) are intentionally
  // not matched here. They remain in business_signals as conversation-starter evidence
  // and surface in the prospect signals log, but do not generate window_alerts.
  // Use them as warm openers, not urgency signals.

  // Fiscal cycle — explicit budget or annual planning cycle signals only.
  // Does NOT fire on broad strategy/expansion language — a multi-year plan
  // announcement is not evidence of an active budget cycle.
  if (
    cat === "growth" &&
    /\bfiscal (year|cycle|quarter)\b|annual (budget|plan|planning|media plan)\b|budget (review|allocation|planning|cycle|approved|finalise|finalize)\b|media plan(ning)?\b|q[1-4] planning\b|next year.{0,30}(budget|plan|spend)\b|(budget|spend).{0,30}next year\b/.test(full)
  ) return "fiscal_cycle";

  // Campaign season (B2C) — Activation category = campaign in market
  if (cat === "activation") return "campaign_season";

  // Product launch (B2C) — Growth with launch / new product keywords
  if (
    cat === "growth" &&
    /\blaunch(ed|ing)?\b|new product\b|rebrand(ing)?\b|new range\b|introduc(ed|ing|tion)\b|unveil\b/.test(full)
  ) return "product_launch";

  return null;
}

// ─── Main export ──────────────────────────────────────────────────────────────

export async function detectWindowAlerts(
  supabase: ReturnType<typeof createAdminClient>,
  companyId: string,
  signals: Signal[],
  engagementModel: string   // "B2C" | "B2B" | "B2B2C"
): Promise<number> {
  if (signals.length === 0) return 0;

  // B2B2C companies use B2B opportunity windows
  const model = engagementModel === "B2B2C" ? "B2B" : engagementModel;

  // Load available windows for this model
  const { data: windows, error: winErr } = await supabase
    .from("opportunity_windows")
    .select("id, window_type, label")
    .eq("engagement_model", model)
    .eq("is_active", true);

  if (winErr || !windows || windows.length === 0) return 0;

  const windowsByType = new Map<string, OpportunityWindow>();
  for (const w of windows) windowsByType.set(w.window_type, w);

  let alertsCreated = 0;

  for (const signal of signals) {
    const windowType = matchWindowType(signal);
    if (!windowType) continue;

    const win = windowsByType.get(windowType);
    if (!win) continue;  // this window type doesn't exist for this model

    const triggerReason = `${signal.signal_category}: ${signal.signal_type}`;

    // Upsert — one alert per company per window; update if already exists
    const { error } = await supabase
      .from("window_alerts")
      .upsert(
        {
          company_id:        companyId,
          window_id:         win.id,
          trigger_signal_id: signal.id,
          trigger_reason:    triggerReason,
          detected_at:       new Date().toISOString(),
          is_open:           true,
        },
        { onConflict: "company_id,window_id" }
      );

    if (error) {
      console.error(`[window-alerts] upsert failed for company ${companyId}, window ${win.window_type}:`, error.message);
    } else {
      alertsCreated++;
    }
  }

  return alertsCreated;
}

// ─── Dismiss a window alert (call when window closes or opportunity passes) ──

export async function dismissWindowAlert(
  supabase: ReturnType<typeof createAdminClient>,
  alertId: string
): Promise<void> {
  await supabase
    .from("window_alerts")
    .update({ is_open: false, dismissed_at: new Date().toISOString() })
    .eq("id", alertId);
}
