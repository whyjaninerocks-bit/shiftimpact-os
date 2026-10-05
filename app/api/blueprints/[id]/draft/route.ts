// POST /api/blueprints/[id]/draft  { stage: 1 | 2 | 3 }
// Drafts one stage of the Activation Blueprint from stored inputs (and prior
// stages), validates + lints it, and stores it. INTERNAL ONLY — /api/ is
// exempt from middleware auth, so the session check here is the real gate.
// No auto-approval, no status engine: the strategist reads the stored draft.

import { NextRequest, NextResponse } from "next/server";
import { requireShiftImpactSession } from "@/lib/auth/require-session";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  anthropicCall,
  BLUEPRINT_MODEL,
  draftStage1,
  draftStage2,
  draftStage3,
  parseInputs,
  StageError,
} from "@/lib/growth-decision/draft";
import type { BlueprintContent, BlueprintRow } from "@/lib/growth-decision/schema";

export const maxDuration = 120;

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const authError = await requireShiftImpactSession();
  if (authError) return authError;

  const { id } = await params;
  let body: { stage?: number };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const stage = body.stage;
  if (stage !== 1 && stage !== 2 && stage !== 3) {
    return NextResponse.json({ error: "stage must be 1, 2 or 3" }, { status: 400 });
  }
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: "ANTHROPIC_API_KEY is not configured" }, { status: 500 });
  }

  const sb = createAdminClient();
  const { data, error } = await sb.from("activation_blueprints").select("*").eq("id", id).maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: "Blueprint not found" }, { status: 404 });
  const row = data as BlueprintRow;

  let inputs;
  try {
    inputs = parseInputs(row.inputs);
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 422 });
  }

  const content: BlueprintContent = { ...(row.content ?? {}) };
  try {
    let meta;
    if (stage === 1) {
      const r = await draftStage1(inputs, anthropicCall);
      content.stage1 = r.value;
      meta = r.meta;
      // Downstream stages and outcome are stale once the decision is redrafted.
      delete content.stage2;
      delete content.stage3;
    } else if (stage === 2) {
      if (!content.stage1) return NextResponse.json({ error: "Draft Stage 1 first" }, { status: 409 });
      const r = await draftStage2(inputs, content.stage1, anthropicCall);
      content.stage2 = r.value;
      meta = r.meta;
      delete content.stage3;
    } else {
      if (!content.stage1 || !content.stage2)
        return NextResponse.json({ error: "Draft Stages 1 and 2 first" }, { status: 409 });
      const r = await draftStage3(inputs, content.stage1, content.stage2, anthropicCall);
      content.stage3 = r.value;
      meta = r.meta;
    }

    // Any redraft invalidates the authored/seeded outcome (measure keys may change).
    delete content.outcome;

    const stages = { ...(row.stages ?? {}), [`stage${stage}`]: { ...meta, model: BLUEPRINT_MODEL } };
    const { error: upErr } = await sb
      .from("activation_blueprints")
      .update({ content, stages, updated_at: new Date().toISOString() })
      .eq("id", id);
    if (upErr) return NextResponse.json({ error: upErr.message }, { status: 500 });

    return NextResponse.json({ ok: true, stage, meta });
  } catch (e) {
    if (e instanceof StageError) {
      return NextResponse.json({ error: e.message, issues: e.issues }, { status: 422 });
    }
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
