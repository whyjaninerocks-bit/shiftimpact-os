"use client";

// Creative Intelligence Showcase Mode — client UI.
//
// Every fact about the Gentle Care asset below is the same, already-produced
// Creative Format Read from this engagement (four sampled frames of the real
// Smarties Indonesia 2024 case film, MMA Smarties listing + credits page).
// Nothing here is invented for the demo, and nothing here is a live model
// call — this file is presentation only. The platform scenario cards below
// pull real row titles from the existing, live platform_benchmarks table
// (read-only, via the `benchmarks` prop) so they never go stale against the
// library's actual contents; everything else is static, reviewed copy.

import { useState } from "react";
import { Badge, Card, ErrorBanner, SectionTitle } from "@/app/_components/ui";
import type { PlatformBenchmark } from "@/lib/types";

// ─── Evidence lights ────────────────────────────────────────────────────────

type EvidenceLight = "direct" | "inference" | "missing";

function EvidenceDot({ light }: { light: EvidenceLight }) {
  const cls =
    light === "direct" ? "bg-emerald-500" : light === "inference" ? "bg-amber-400" : "bg-neutral-300";
  const title =
    light === "direct" ? "Observed / direct evidence" : light === "inference" ? "Inference, not directly observed" : "Missing / insufficient evidence";
  return <span title={title} className={`inline-block w-2.5 h-2.5 rounded-full shrink-0 ${cls}`} />;
}

function EvidenceLightsLegend() {
  return (
    <div className="flex flex-wrap items-center gap-4 text-xs text-neutral-500">
      <span className="flex items-center gap-1.5"><EvidenceDot light="direct" /> Observed / direct</span>
      <span className="flex items-center gap-1.5"><EvidenceDot light="inference" /> Inference</span>
      <span className="flex items-center gap-1.5"><EvidenceDot light="missing" /> Missing / insufficient</span>
    </div>
  );
}

// ─── Static case content — the already-produced Gentle Care read ───────────

const OBSERVED_EVIDENCE = [
  "MMA Smarties Indonesia 2024 winners listing — campaign name, client, agency pairing, market, two award categories",
  "MMA Smarties credits page — individually named McCann, Reckitt, and Mediacom staff and titles",
  "Four sampled frames from the actual, playable case film: opening domestic scene, expert / product science segment, DOKTER toy scene, closing product range shot",
];

const MISSING_EVIDENCE = [
  "Which platform or channel this asset actually ran on",
  "Full running time and complete linear sequence — only four discontinuous moments were sampled",
  "Audio, voiceover, or spoken content — nothing was heard, only seen",
  "A written brief, FRAME, or Big Idea Platform — this campaign never ran through the OS",
  "Any performance, reach, or reported result beyond the award tier itself",
];

const PROGRESS_PATH: { label: string; light: EvidenceLight; read: string }[] = [
  { label: "Asset structure", light: "direct",
    read: "Three part shape observed directly across the sampled frames: warmth first (home scene), authority second (expert + citation), retail close (product range + line)." },
  { label: "Proof timing", light: "direct",
    read: "Substantiation sits in the middle of the sequence, not at the open and not folded into the close — a placement pattern read directly from the ordered samples." },
  { label: "Brand role", light: "inference",
    read: "No Big Idea Platform exists on file for this external case, so there is no stated brand role to check against. Observationally, the brand is constant and central throughout." },
  { label: "CTA / action path", light: "direct",
    read: "On screen Indonesian text read directly: a retail availability line, no digital next step (no link, no shop now, no QR code) observed in any sampled frame." },
  { label: "Brand power risk", light: "inference",
    read: "Forward looking by nature, always capped to inference. The cited source reads as internal rather than independent, and the tonal jump between scenes is a real, unconfirmed structural choice." },
  { label: "Evidence confidence", light: "inference",
    read: "Moderate for structure and placement, thin for anything requiring literal opening seconds, audio, or exact timing — four sampled frames, not a full linear watch." },
  { label: "Platform benchmark check", light: "missing",
    read: "Not run. Platform is unconfirmed, so no Platform Benchmark row can be attached to this read with confidence — see the scenario toggle below for what would change if it were." },
];

const DECISION_BOARD: { key: "HOLD" | "STRENGTHEN" | "VALIDATE" | "WATCH"; tone: "green" | "amber" | "blue" | "red"; blurb: string; items: string[] }[] = [
  {
    key: "HOLD", tone: "green",
    blurb: "Strong enough to keep as is.",
    items: [
      "Clear three part structure — warmth, authority, retail close — not accidental.",
      "The Educator concept is dramatized (the DOKTER toy scene), not only claimed.",
      "Proof is placed deliberately mid film, not buried at the very end and not skipped.",
      "Brand presence is unmistakable throughout.",
    ],
  },
  {
    key: "STRENGTHEN", tone: "amber",
    blurb: "Specific and fixable before this runs again or gets adapted.",
    items: [
      "Cited source (MJN Patient Pathway 2020) reads internal rather than independent — worth strengthening.",
      "The domestic-to-expert-set tonal jump is unconfirmed on the actual edit — worth a quick check.",
      "Closing CTA is one generic retail line — worth asking if a sharper action would serve this asset better.",
    ],
  },
  {
    key: "VALIDATE", tone: "blue",
    blurb: "Needs data, platform confirmation, or McCann input.",
    items: [
      "Platform and distribution channel are entirely unconfirmed — the single gap limiting everything downstream.",
      "Full running time, complete sequence, and audio were never available.",
      "No brief or Brand-Commerce classification exists for this external case.",
      "The on screen expert's role (staff, seeded, or paid) is unconfirmed.",
    ],
  },
  {
    key: "WATCH", tone: "red",
    blurb: "Could create brand, commerce, proof, or platform risk if left unexamined.",
    items: [
      "Thin reading citation is a brand equity risk under scrutiny.",
      "A produced, polished, logo forward film could sit awkwardly on a platform whose native norms lean less polished.",
      "A proof to CTA gap — the mid film proof point isn't echoed back at the close.",
    ],
  },
];

type PlatformKey = "youtube" | "meta_reels" | "tiktok";

const PLATFORM_SCENARIOS: { key: PlatformKey; label: string; risk: string; match: (b: PlatformBenchmark) => boolean }[] = [
  {
    key: "youtube", label: "YouTube",
    risk: "The mildest risk lens of the three. YouTube audiences are generally accustomed to produced, brand made content, so this film's polish and its slower, warmth first open are a reasonably natural fit for the platform's own stated norms. The open question becomes whether the mid film tonal jump reads as a natural beat or a jarring cut within a longer format.",
    match: (b) => b.platform.toLowerCase().includes("youtube"),
  },
  {
    key: "meta_reels", label: "Meta Reels",
    risk: "The risk lens tightens here. Reels rewards a fast hold on attention and has its own interface safe zones that a persistent top corner logo could collide with, unconfirmed without checking the asset against the actual spec. The open question becomes whether the domestic opening scene earns attention quickly enough before a swipe past.",
    match: (b) => b.platform.toLowerCase().includes("facebook") || b.platform.toLowerCase().includes("instagram"),
  },
  {
    key: "tiktok", label: "TikTok",
    risk: "The sharpest risk lens of the three. TikTok's own published guidance leans toward native, sound on, creator led, less polished content — this asset's produced, brand film, logo forward polish sits at the widest distance from that stated norm of the three platforms. That is not a claim it would fail there, it is the single most concrete, checkable fit question if TikTok is ever the real answer.",
    match: (b) => b.platform.toLowerCase().includes("tiktok"),
  },
];

const CONFIDENCE_MAP = {
  can_say: [
    "What the asset actually does — its structure, where proof sits, how the brand shows up, what it asks the viewer to do next.",
    "Specific, concrete risks to brand equity, not vague discomfort.",
    "Exactly which parts of this read have real evidence behind them and which do not, and why.",
    "Which reference material would become usable once platform is confirmed.",
  ],
  cannot_say: [
    "How this asset performed, will perform, or would perform on any platform.",
    "Anything about how a platform's algorithm works.",
    "That the Smarties Silver Winner result is proof this asset works — an award is a jury opinion, not a performance measurement.",
    "Anything checked against a brief, since none exists for this external case.",
    "That this asset ran on YouTube, Meta Reels, or TikTok — platform is unconfirmed.",
  ],
  needs_confirm: [
    "The intended or actual distribution platform and format.",
    "Full running time, complete sequence, and audio content.",
    "The on screen expert's role — staff, seeded relationship, or paid spokesperson.",
    "A written brief, brand role, and Brand-Commerce classification for this campaign.",
  ],
};

const VALIDATION_ASK = [
  "One live Indonesia campaign, current or recent.",
  "Two to three assets from that campaign at different stages — script, storyboard, rough cut, or final.",
  "The intended platform and format, stated by McCann, not inferred.",
  "The campaign's actual objective — brand building, commerce driving, or a mix.",
  "Any platform benchmarks or client actuals McCann already holds for that market or format.",
  "The strategist's own current manual read on the same assets, for comparison.",
];

const PLANNED_NEXT: { title: string; whyItMatters: string; mccannSupplies: string; wontClaim: string }[] = [
  {
    title: "Asset Card Intake",
    whyItMatters: "Captures an asset once, structured, so it can be read against every future dimension without re-analyzing raw video each time.",
    mccannSupplies: "Asset type, maturity, objective, platform, format, transcript if available, and a short set of keyframes.",
    wontClaim: "Will not infer objective, platform, or maturity on its own — every field is supplied, never guessed.",
  },
  {
    title: "Keyframe Extraction",
    whyItMatters: "A small, targeted set of frames (five to seven) is what actually produced a useful read on Gentle Care — this would make that repeatable rather than manual.",
    mccannSupplies: "The source video file, or approval to pull opening seconds, first product appearance, first brand cue, proof moment, creator moment, and closing frame.",
    wontClaim: "Will not claim to capture the full film — a keyframe read is always a sampled read, and will say so.",
  },
  {
    title: "Transcript / OCR Support",
    whyItMatters: "Closes the audio and on screen text gap this showcase explicitly could not fill — voiceover, subtitles, claims, disclaimers, CTA language.",
    mccannSupplies: "A transcript or the source file to transcribe, and any on screen disclaimer text McCann already has on file.",
    wontClaim: "Will not translate or interpret spoken claims beyond what the transcript literally says.",
  },
  {
    title: "Platform Actuals Read",
    whyItMatters: "Grounds a read in what actually happened, when McCann has it, rather than general platform guidance alone.",
    mccannSupplies: "Completion rate, drop off, CTR, add to cart, comments, saves, or shares — whatever McCann or the client is able to share.",
    wontClaim: "Will not treat one asset's actuals as a forecast for a different asset, and will not fetch or infer this data itself.",
  },
  {
    title: "Learning Memory",
    whyItMatters: "Makes every subsequent read in the same brand, category, or market start from accumulated context instead of a cold read.",
    mccannSupplies: "Confirmation of what actually worked or didn't on delivered campaigns, in McCann's or the client's own words.",
    wontClaim: "Will not generalize one campaign's learning to a different brand or market without that being stated explicitly.",
  },
  {
    title: "Tiered Analysis",
    whyItMatters: "Keeps cost and turnaround proportional to what an asset actually needs — most assets don't need a deep video review.",
    mccannSupplies: "A sense of which assets are high stakes enough to warrant the deepest tier, campaign by campaign.",
    wontClaim: "Will not apply the deepest, most expensive tier by default — that stays a deliberate, named exception.",
  },
];

// ─── Small building blocks ───────────────────────────────────────────────────

function boardTone(tone: "green" | "amber" | "blue" | "red") {
  const map: Record<string, string> = {
    green: "border-emerald-200 bg-emerald-50",
    amber: "border-amber-200 bg-amber-50",
    blue: "border-blue-200 bg-blue-50",
    red: "border-red-200 bg-red-50",
  };
  return map[tone];
}

// ─── Main export ──────────────────────────────────────────────────────────────

export function CreativeIntelligenceShowcaseClient({
  benchmarks,
  dbError,
}: {
  benchmarks: PlatformBenchmark[];
  dbError?: string;
}) {
  const [activePlatform, setActivePlatform] = useState<PlatformKey>("youtube");
  const activeScenario = PLATFORM_SCENARIOS.find((p) => p.key === activePlatform)!;
  const matchedRows = benchmarks.filter((b) => b.is_active && activeScenario.match(b));

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest mb-1">
          Creative Intelligence — Showcase Mode
        </p>
        <h1 className="text-2xl font-bold tracking-tight text-neutral-900">
          Gentle Care — Brilliant Digestion Educator
        </h1>
        <p className="text-sm text-neutral-500 mt-1 max-w-xl">
          A walkable read of one real, publicly documented McCann Indonesia asset. Internal only.
        </p>
      </div>

      <ErrorBanner message={dbError} />

      {/* 1. Disclaimer */}
      <div className="rounded-lg bg-neutral-900 text-white px-4 py-3">
        <p className="text-xs leading-relaxed">
          <span className="font-semibold">Showcase mode:</span> one time analysis of a public asset, not a live automated video pipeline.
        </p>
      </div>

      {/* 2. Input evidence panel */}
      <Card>
        <SectionTitle>Input Evidence</SectionTitle>
        <div className="grid grid-cols-2 gap-3 text-sm mb-4">
          <div>
            <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest mb-0.5">Asset</p>
            <p className="text-neutral-800">Gentle Care — Brilliant Digestion Educator</p>
          </div>
          <div>
            <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest mb-0.5">Brand / Client</p>
            <p className="text-neutral-800">Reckitt / Mead Johnson Nutrition Indonesia — Enfagrow A+ NeuraPro GentleCare</p>
          </div>
          <div>
            <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest mb-0.5">Market</p>
            <p className="text-neutral-800">Indonesia</p>
          </div>
          <div>
            <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest mb-0.5">Asset Maturity</p>
            <p className="text-neutral-800">Final asset</p>
          </div>
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest mb-1.5">Observed Evidence</p>
            <ul className="space-y-1.5">
              {OBSERVED_EVIDENCE.map((e, i) => (
                <li key={i} className="flex items-start gap-2 text-xs text-neutral-600 leading-relaxed">
                  <EvidenceDot light="direct" /> <span>{e}</span>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest mb-1.5">Missing Evidence</p>
            <ul className="space-y-1.5">
              {MISSING_EVIDENCE.map((e, i) => (
                <li key={i} className="flex items-start gap-2 text-xs text-neutral-600 leading-relaxed">
                  <EvidenceDot light="missing" /> <span>{e}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </Card>

      {/* 3 + 4. Evidence lights + progress path */}
      <Card>
        <div className="flex items-center justify-between mb-3">
          <SectionTitle>Creative Format Read — Progress Path</SectionTitle>
        </div>
        <div className="mb-4"><EvidenceLightsLegend /></div>
        <div className="space-y-3">
          {PROGRESS_PATH.map((step, i) => (
            <div key={step.label} className="flex items-start gap-3">
              <div className="flex flex-col items-center pt-0.5">
                <EvidenceDot light={step.light} />
                {i < PROGRESS_PATH.length - 1 && <div className="w-px h-full bg-neutral-200 mt-1" />}
              </div>
              <div className="pb-3">
                <p className="text-sm font-medium text-neutral-800">{step.label}</p>
                <p className="text-xs text-neutral-500 leading-relaxed mt-0.5">{step.read}</p>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* 5. Decision board */}
      <div>
        <SectionTitle>Pre-flight Decision Room</SectionTitle>
        <div className="grid sm:grid-cols-2 gap-3">
          {DECISION_BOARD.map((col) => (
            <div key={col.key} className={`rounded-lg border p-4 ${boardTone(col.tone)}`}>
              <p className="text-xs font-bold uppercase tracking-widest text-neutral-700 mb-1">{col.key}</p>
              <p className="text-xs text-neutral-600 italic mb-2">{col.blurb}</p>
              <ul className="space-y-1.5">
                {col.items.map((it, i) => (
                  <li key={i} className="text-xs text-neutral-700 leading-relaxed">• {it}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>

      {/* 6. Platform scenario toggle */}
      <Card>
        <div className="flex items-start justify-between gap-3 mb-1">
          <SectionTitle>Same Asset, Different Platform Risk</SectionTitle>
        </div>
        <Badge tone="amber" className="mb-3">Scenario only — not confirmed distribution</Badge>

        <div className="flex gap-2 mb-4">
          {PLATFORM_SCENARIOS.map((p) => (
            <button
              key={p.key}
              onClick={() => setActivePlatform(p.key)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium border transition-colors ${
                activePlatform === p.key
                  ? "bg-neutral-900 text-white border-neutral-900"
                  : "bg-white text-neutral-600 border-neutral-300 hover:bg-neutral-50"
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>

        <p className="text-sm text-neutral-600 leading-relaxed mb-3">{activeScenario.risk}</p>

        <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest mb-1.5">
          Reference material that would become relevant if {activeScenario.label} were confirmed
        </p>
        {matchedRows.length === 0 ? (
          <p className="text-xs text-neutral-400">No matching seeded Platform Benchmark rows found.</p>
        ) : (
          <ul className="space-y-1">
            {matchedRows.map((b) => (
              <li key={b.id} className="text-xs text-neutral-600">
                {b.source_url ? (
                  <a href={b.source_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                    {b.source_title}
                  </a>
                ) : b.source_title}
                <span className="text-neutral-400"> — {b.platform}</span>
              </li>
            ))}
          </ul>
        )}
      </Card>

      {/* 7. Evidence confidence map */}
      <Card>
        <SectionTitle>Evidence Confidence Map</SectionTitle>
        <div className="grid sm:grid-cols-3 gap-4">
          <div>
            <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest mb-1.5">What the OS can say</p>
            <ul className="space-y-1.5">
              {CONFIDENCE_MAP.can_say.map((t, i) => (
                <li key={i} className="text-xs text-neutral-600 leading-relaxed">{t}</li>
              ))}
            </ul>
          </div>
          <div>
            <p className="text-[10px] font-bold text-red-500 uppercase tracking-widest mb-1.5">What the OS cannot say</p>
            <ul className="space-y-1.5">
              {CONFIDENCE_MAP.cannot_say.map((t, i) => (
                <li key={i} className="text-xs text-neutral-600 leading-relaxed">{t}</li>
              ))}
            </ul>
          </div>
          <div>
            <p className="text-[10px] font-bold text-blue-500 uppercase tracking-widest mb-1.5">What McCann needs to confirm</p>
            <ul className="space-y-1.5">
              {CONFIDENCE_MAP.needs_confirm.map((t, i) => (
                <li key={i} className="text-xs text-neutral-600 leading-relaxed">{t}</li>
              ))}
            </ul>
          </div>
        </div>
      </Card>

      {/* 8. Validation ask */}
      <Card>
        <SectionTitle>Validation Ask</SectionTitle>
        <p className="text-xs text-neutral-500 mb-2">To move from this cold sample to a real pilot, we would ask McCann for:</p>
        <ul className="space-y-1.5">
          {VALIDATION_ASK.map((t, i) => (
            <li key={i} className="text-sm text-neutral-700 leading-relaxed">{i + 1}. {t}</li>
          ))}
        </ul>
      </Card>

      {/* 9. Planned next */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <SectionTitle>Planned Next — Not Live in This Showcase</SectionTitle>
        </div>
        <p className="text-xs text-neutral-500 mb-3">
          Nothing below runs today. Every card here is copy only, named so the roadmap is visible, not built into this page.
        </p>
        <div className="grid sm:grid-cols-2 gap-3">
          {PLANNED_NEXT.map((card) => (
            <div key={card.title} className="rounded-lg border border-neutral-200 bg-neutral-50 p-4">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-semibold text-neutral-800">{card.title}</p>
                <Badge tone="neutral">Planned</Badge>
              </div>
              <p className="text-xs text-neutral-600 leading-relaxed mb-2">
                <span className="font-medium text-neutral-700">Why it matters: </span>{card.whyItMatters}
              </p>
              <p className="text-xs text-neutral-600 leading-relaxed mb-2">
                <span className="font-medium text-neutral-700">McCann would supply: </span>{card.mccannSupplies}
              </p>
              <p className="text-xs text-neutral-500 leading-relaxed">
                <span className="font-medium text-neutral-600">Will not claim: </span>{card.wontClaim}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
