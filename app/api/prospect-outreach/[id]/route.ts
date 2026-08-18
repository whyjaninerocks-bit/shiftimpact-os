import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

// ─── GET /api/prospect-outreach/[id] ─────────────────────────────────────────
// Fetch a single outreach record with person + company context.

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = createAdminClient();
  const { id } = await params;

  const { data, error } = await supabase
    .from("outreach")
    .select(`
      id, person_id, assessment_id, channel,
      message_draft, message_sent,
      status, drafted_at, approved_at, sent_at, replied_at,
      people (
        id, name, role, company_id,
        companies ( id, name, industry, market_code )
      )
    `)
    .eq("id", id)
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: error.code === "PGRST116" ? 404 : 500 });
  }

  return NextResponse.json({ outreach: data });
}

// ─── PATCH /api/prospect-outreach/[id] ───────────────────────────────────────
// Human approval gate — two discrete actions:
//
//   action: "approve"
//     Sets approved_at, updates status to "Approved"
//     Optionally accepts edited_draft (human edits before approval)
//     message_sent remains NULL — approval ≠ sending
//
//   action: "send"
//     REQUIRES approved_at to already be set (cannot send un-approved outreach)
//     Accepts message_sent (the final copy the human actually sent)
//     Sets sent_at, status: "Sent"
//     This is the only place message_sent is written — never by AI
//
//   action: "reply"
//     Mark a reply received: sets replied_at, status: "Replied"
//
//   action: "archive"
//     Hard stop — status: "Archived", no outreach should be retried
//
// Returns the updated outreach row.

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = createAdminClient();
  const { id }   = await params;

  let body: Record<string, unknown>;
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 }); }

  const { action } = body;
  if (!action || typeof action !== "string") {
    return NextResponse.json(
      { error: "action is required: 'approve' | 'send' | 'reply' | 'archive'" },
      { status: 400 }
    );
  }

  // Load existing record first — we need current state to validate transitions
  const { data: existing, error: fetchErr } = await supabase
    .from("outreach")
    .select("id, status, approved_at, message_sent, person_id")
    .eq("id", id)
    .single();

  if (fetchErr || !existing) {
    return NextResponse.json({ error: "Outreach record not found" }, { status: 404 });
  }

  // ── action: approve ─────────────────────────────────────────────────────────
  if (action === "approve") {
    if (existing.status === "Sent" || existing.status === "Archived") {
      return NextResponse.json(
        { error: `Cannot approve outreach in status: ${existing.status}` },
        { status: 409 }
      );
    }

    const updates: Record<string, unknown> = {
      status:      "Approved",
      approved_at: existing.approved_at ?? new Date().toISOString(), // idempotent
    };

    // Accept human-edited draft — replaces AI draft if human changed it before approval
    if (typeof body.edited_draft === "string" && body.edited_draft.trim().length > 0) {
      updates.message_draft = body.edited_draft.trim();
    }

    const { data: updated, error: updErr } = await supabase
      .from("outreach")
      .update(updates)
      .eq("id", id)
      .select("id, person_id, status, approved_at, message_draft, message_sent, channel")
      .single();

    if (updErr) return NextResponse.json({ error: updErr.message }, { status: 500 });

    return NextResponse.json({
      outreach:   updated,
      next_action: "Send the message yourself (LinkedIn DM, email, etc.), then call PATCH with { action: 'send', message_sent: '<exact copy you sent>' } to record it.",
    });
  }

  // ── action: send ────────────────────────────────────────────────────────────
  if (action === "send") {
    // Guard: must be approved first
    if (!existing.approved_at) {
      return NextResponse.json(
        { error: "Cannot mark as sent — outreach has not been approved yet. Call action: 'approve' first." },
        { status: 409 }
      );
    }
    if (existing.status === "Sent") {
      return NextResponse.json(
        { error: "Outreach already marked as sent", already_sent: true },
        { status: 409 }
      );
    }
    if (existing.status === "Archived") {
      return NextResponse.json(
        { error: "Cannot mark archived outreach as sent" },
        { status: 409 }
      );
    }

    // message_sent: the exact copy the human sent — required for "send" action
    // This is the ONLY path that writes message_sent. AI never populates this field.
    const message_sent = typeof body.message_sent === "string" && body.message_sent.trim().length > 0
      ? body.message_sent.trim()
      : existing.message_draft; // fallback to approved draft if human sent it verbatim

    const { data: updated, error: updErr } = await supabase
      .from("outreach")
      .update({
        status:       "Sent",
        message_sent,                             // human-confirmed final copy
        sent_at:      new Date().toISOString(),
      })
      .eq("id", id)
      .select("id, person_id, status, approved_at, sent_at, message_sent, channel")
      .single();

    if (updErr) return NextResponse.json({ error: updErr.message }, { status: 500 });

    // Update person relationship_status if they're at initial stage
    await supabase
      .from("people")
      .update({ relationship_status: "Contacted" })
      .eq("id", existing.person_id)
      .eq("relationship_status", "Cold");   // only advance from Cold → Contacted

    return NextResponse.json({
      outreach:    updated,
      next_action: "When they reply, call PATCH with { action: 'reply', replied_at: '<ISO timestamp>' }.",
    });
  }

  // ── action: reply ───────────────────────────────────────────────────────────
  if (action === "reply") {
    if (existing.status !== "Sent") {
      return NextResponse.json(
        { error: `Cannot mark reply on outreach with status: ${existing.status}` },
        { status: 409 }
      );
    }

    const replied_at = typeof body.replied_at === "string"
      ? body.replied_at
      : new Date().toISOString();

    const { data: updated, error: updErr } = await supabase
      .from("outreach")
      .update({ status: "Replied", replied_at })
      .eq("id", id)
      .select("id, person_id, status, sent_at, replied_at")
      .single();

    if (updErr) return NextResponse.json({ error: updErr.message }, { status: 500 });

    // Advance person to Warm
    await supabase
      .from("people")
      .update({ relationship_status: "Warm" })
      .eq("id", existing.person_id)
      .in("relationship_status", ["Cold", "Contacted"]);

    return NextResponse.json({ outreach: updated });
  }

  // ── action: archive ─────────────────────────────────────────────────────────
  if (action === "archive") {
    const { data: updated, error: updErr } = await supabase
      .from("outreach")
      .update({ status: "Archived" })
      .eq("id", id)
      .select("id, status")
      .single();

    if (updErr) return NextResponse.json({ error: updErr.message }, { status: 500 });

    return NextResponse.json({ outreach: updated });
  }

  return NextResponse.json(
    { error: `Unknown action: ${action}. Valid: 'approve' | 'send' | 'reply' | 'archive'` },
    { status: 400 }
  );
}
