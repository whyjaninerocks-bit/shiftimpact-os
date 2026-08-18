// app/api/brief-extract/route.ts — Sprint 14
//
// Accepts a client KB document (PDF or plain text), sends to Claude,
// and returns pre-filled FRAME Brief + BIP field values as JSON.
// Called from the /brief/[id] client intake form.

import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

export const runtime = "nodejs";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });

const EXTRACTION_PROMPT = `You are a strategic planning assistant helping extract campaign brief information from a client document.

Return ONLY a valid JSON object — no prose, no markdown fences, no commentary. Every field must be a string value. Use "" for any field you cannot determine from the document.

Extract into this exact structure:

{
  "frame": {
    "force": "The commercial or category pressure making this campaign necessary — what happens if we don't act?",
    "role": "Target audience in human terms — who are they and what role does this brand play in their lives?",
    "anchor": "What is happening in their lives right now — culturally, emotionally, or practically — that creates an opening?",
    "mood": "The emotional tone of the audience — what do they want to feel that they are not currently feeling?",
    "expression": "How the brand shows up — its voice, energy, and way of communicating",
    "clarity_statement": "After the campaign, the one thing people should say, think, or feel about the brand",
    "enemy_villain": "The structural enemy — the behaviour, belief, or alternative this campaign must overcome",
    "primary_kpi": "The single most important measurable outcome for this campaign"
  },
  "bip": {
    "topline_idea": "One sentence: the hero statement — the single idea the entire campaign is built on",
    "enemy_villain": "The specific belief, behaviour, or alternative the big idea directly confronts",
    "brand_role": "The non-transferable role of this brand in the idea — if you removed the brand, the idea collapses",
    "propagation_mechanism": "The mechanism that makes this idea spread from person to person",
    "cultural_tension": "The human tension — between aspiration and reality, tradition and modernity — the idea resolves",
    "media_idea": "The channel, format, or platform this idea is most natively at home in",
    "expression_summary": "In one paragraph: how the idea manifests across all key touchpoints"
  }
}`;

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided." }, { status: 400 });
    }

    const fileName = file.name.toLowerCase();
    const isPdf  = file.type === "application/pdf" || fileName.endsWith(".pdf");
    const isText = file.type.startsWith("text/") || fileName.endsWith(".txt") || fileName.endsWith(".md");

    if (!isPdf && !isText) {
      return NextResponse.json(
        { error: "Unsupported file. Please upload a PDF or .txt file. For Word docs, export as PDF first." },
        { status: 400 }
      );
    }

    // Build Claude message content
    let content: Anthropic.MessageParam["content"];

    if (isPdf) {
      // Claude natively reads PDFs — no parsing library needed
      const buffer = Buffer.from(await file.arrayBuffer());
      const base64  = buffer.toString("base64");
      content = [
        {
          type: "document",
          source: { type: "base64", media_type: "application/pdf", data: base64 },
        } as Anthropic.DocumentBlockParam,
        { type: "text", text: EXTRACTION_PROMPT },
      ];
    } else {
      // Plain text — truncate to 12k chars to stay within limits
      const text    = await file.text();
      const excerpt = text.length > 12000 ? text.slice(0, 12000) + "\n\n[Document truncated]" : text;
      content = `${EXTRACTION_PROMPT}\n\nDocument:\n${excerpt}`;
    }

    const response = await anthropic.messages.create({
      model:      "claude-haiku-4-5-20251001",
      max_tokens: 2000,
      messages:   [{ role: "user", content }],
    });

    const rawText = response.content[0].type === "text" ? response.content[0].text.trim() : "";

    // Strip accidental markdown fences
    const cleaned = rawText
      .replace(/^```json\s*/i, "")
      .replace(/^```\s*/i, "")
      .replace(/```\s*$/i, "")
      .trim();

    let extracted: { frame?: Record<string, string>; bip?: Record<string, string> };
    try {
      extracted = JSON.parse(cleaned);
    } catch {
      return NextResponse.json(
        { error: "Could not parse extracted fields. Please fill in manually." },
        { status: 500 }
      );
    }

    return NextResponse.json(extracted);
  } catch (err) {
    console.error("[brief-extract] error:", err);
    return NextResponse.json(
      { error: "Extraction failed — please try again or fill in manually." },
      { status: 500 }
    );
  }
}
