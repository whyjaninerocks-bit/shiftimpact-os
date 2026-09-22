"use client";

// Creative Intelligence Showcase Mode — client UI.
//
// Pre-flight Creative Decision Console. Every fact about the Gentle Care
// asset below is the same, already-produced Creative Format Read from this
// engagement (four sampled frames of the real Smarties Indonesia 2024 case
// film, MMA Smarties listing + credits page). Nothing here is invented for
// the demo, and nothing here is a live model call — this file is
// presentation only. The platform scenario cards below pull real row titles
// from the existing, live platform_benchmarks table (read-only, via the
// `benchmarks` prop) so they never go stale against the library's actual
// contents; everything else is static, reviewed copy.
//
// This is a visual restructure only — every underlying fact, evidence-light
// value, decision-bucket item, platform-match rule, and benchmark query is
// byte-for-byte the same content that shipped in the first version of this
// page. What changed is default visibility (collapsed behind "View
// reasoning" / drawers / chips) and layout (sticky story rail, hero decision
// summary, larger Decision Room cards), never the words themselves — nothing
// here is paraphrased into a shorter claim; short labels are additive
// (chips carry a `detail` alongside the original sentence, revealed on
// demand), and compliance-sensitive text (the Confidence Map's can/cannot
// say lines) is never shortened, only shown collapsed by default.

import { useEffect, useState } from "react";
import { Badge, Card, ErrorBanner } from "@/app/_components/ui";
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
    <div className="flex flex-wrap items-center gap-3 text-[11px] text-neutral-500">
      <span className="flex items-center gap-1.5"><EvidenceDot light="direct" /> Observed</span>
      <span className="flex items-center gap-1.5"><EvidenceDot light="inference" /> Inferred</span>
      <span className="flex items-center gap-1.5"><EvidenceDot light="missing" /> Insufficient</span>
    </div>
  );
}

// ─── Small reusable building blocks ─────────────────────────────────────────

/** Collapses arbitrary content behind a click — never rewrites the content, only its default visibility. */
function Reveal({
  label,
  hideLabel = "Show less",
  children,
}: {
  label: string;
  hideLabel?: string;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="text-[11px] font-semibold text-neutral-500 hover:text-neutral-800 underline underline-offset-2"
      >
        {open ? hideLabel : label}
      </button>
      {open && <div className="mt-2">{children}</div>}
    </div>
  );
}

function RiskBadge({ level }: { level: "Low" | "Medium" | "Higher" }) {
  const tone = level === "Low" ? "green" : level === "Medium" ? "amber" : "red";
  return <Badge tone={tone}>{level} risk shift</Badge>;
}

function CountChip({ label, n, tone }: { label: string; n: number; tone: "green" | "amber" | "blue" | "red" }) {
  const dot: Record<string, string> = { green: "bg-emerald-500", amber: "bg-amber-500", blue: "bg-blue-500", red: "bg-red-500" };
  return (
    <a
      href="#decision"
      className="inline-flex items-center gap-1.5 rounded-full border border-neutral-200 bg-white px-3 py-1 text-xs font-semibold text-neutral-700 hover:border-neutral-400 transition-colors"
    >
      <span className={`w-2 h-2 rounded-full ${dot[tone]}`} /> {label} <span className="text-neutral-400 font-normal">{n}</span>
    </a>
  );
}

// ─── Static case content — the already-produced Gentle Care read ───────────
// (unchanged from the original build — see file header)

const OBSERVED_EVIDENCE: { label: string; detail: string }[] = [
  { label: "Smarties 2024 winners listing", detail: "MMA Smarties Indonesia 2024 winners listing — campaign name, client, agency pairing, market, two award categories" },
  { label: "Smarties credits page", detail: "MMA Smarties credits page — individually named McCann, Reckitt, and Mediacom staff and titles" },
  { label: "4 sampled case-film frames", detail: "Four sampled frames from the actual, playable case film: opening domestic scene, expert / product science segment, DOKTER toy scene, closing product range shot" },
];

const MISSING_EVIDENCE: { label: string; detail: string }[] = [
  { label: "Platform / channel unconfirmed", detail: "Which platform or channel this asset actually ran on" },
  { label: "Only 4 moments sampled", detail: "Full running time and complete linear sequence — only four discontinuous moments were sampled" },
  { label: "No audio reviewed", detail: "Audio, voiceover, or spoken content — nothing was heard, only seen" },
  { label: "No brief on file", detail: "A written brief, FRAME, or Big Idea Platform — this campaign never ran through the OS" },
  { label: "No performance data", detail: "Any performance, reach, or reported result beyond the award tier itself" },
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
    read: "Not run. Platform is unconfirmed, so no Platform Benchmark row can be attached to this read with confidence — see the Platform Lens for what would change if it were." },
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

const BOARD_ICON: Record<string, string> = { HOLD: "✓", STRENGTHEN: "↑", VALIDATE: "?", WATCH: "!" };
const BOARD_ACCENT: Record<string, string> = {
  green: "border-emerald-300 bg-emerald-50",
  amber: "border-amber-300 bg-amber-50",
  blue: "border-blue-300 bg-blue-50",
  red: "border-red-300 bg-red-50",
};
const BOARD_ICON_BG: Record<string, string> = {
  green: "bg-emerald-600",
  amber: "bg-amber-500",
  blue: "bg-blue-600",
  red: "bg-red-600",
};

type PlatformKey = "youtube" | "meta_reels" | "tiktok";

const PLATFORM_SCENARIOS: {
  key: PlatformKey;
  label: string;
  riskLevel: "Low" | "Medium" | "Higher";
  mainQuestion: string;
  context: string;
  match: (b: PlatformBenchmark) => boolean;
}[] = [
  {
    key: "youtube", label: "YouTube", riskLevel: "Low",
    mainQuestion: "Does the mid-film tonal jump read as a natural beat, or a jarring cut, within a longer format?",
    context: "The mildest risk lens of the three. YouTube audiences are generally accustomed to produced, brand made content, so this film's polish and its slower, warmth first open are a reasonably natural fit for the platform's own stated norms. The open question becomes whether the mid film tonal jump reads as a natural beat or a jarring cut within a longer format.",
    match: (b) => b.platform.toLowerCase().includes("youtube"),
  },
  {
    key: "meta_reels", label: "Meta Reels", riskLevel: "Medium",
    mainQuestion: "Does the domestic opening earn attention before a swipe, and does the logo collide with Reels' safe zones?",
    context: "The risk lens tightens here. Reels rewards a fast hold on attention and has its own interface safe zones that a persistent top corner logo could collide with, unconfirmed without checking the asset against the actual spec. The open question becomes whether the domestic opening scene earns attention quickly enough before a swipe past.",
    match: (b) => b.platform.toLowerCase().includes("facebook") || b.platform.toLowerCase().includes("instagram"),
  },
  {
    key: "tiktok", label: "TikTok", riskLevel: "Higher",
    mainQuestion: "Does a produced, logo-forward film sit believably in a feed built for native, creator-led content?",
    context: "The sharpest risk lens of the three. TikTok's own published guidance leans toward native, sound on, creator led, less polished content — this asset's produced, brand film, logo forward polish sits at the widest distance from that stated norm of the three platforms. That is not a claim it would fail there, it is the single most concrete, checkable fit question if TikTok is ever the real answer.",
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

const VALIDATION_ASK: { title: string; detail: string }[] = [
  { title: "Live Indonesia campaign", detail: "One live Indonesia campaign, current or recent." },
  { title: "2–3 assets", detail: "Two to three assets from that campaign at different stages — script, storyboard, rough cut, or final." },
  { title: "Intended platform / format", detail: "The intended platform and format, stated by McCann, not inferred." },
  { title: "Campaign objective", detail: "The campaign's actual objective — brand building, commerce driving, or a mix." },
  { title: "Benchmarks or actuals", detail: "Any platform benchmarks or client actuals McCann already holds for that market or format." },
  { title: "Current manual read", detail: "The strategist's own current manual read on the same assets, for comparison." },
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

const RAIL_SECTIONS: { id: string; label: string }[] = [
  { id: "decision", label: "Decision" },
  { id: "evidence", label: "Evidence" },
  { id: "confidence", label: "Confidence" },
  { id: "platform", label: "Platform Lens" },
  { id: "pilot", label: "Pilot Ask" },
  { id: "coming-next", label: "Coming Next" },
];

// ─── Story rail (sticky nav with scroll-spy) ─────────────────────────────────

function StoryRail({ active }: { active: string }) {
  return (
    <nav className="hidden md:block sticky top-6 self-start w-36 shrink-0">
      <ul className="space-y-0.5 border-l border-neutral-200">
        {RAIL_SECTIONS.map((s) => (
          <li key={s.id}>
            <a
              href={`#${s.id}`}
              className={`block pl-3 py-1.5 text-xs -ml-px border-l-2 transition-colors ${
                active === s.id ? "border-neutral-900 text-neutral-900 font-semibold" : "border-transparent text-neutral-400 hover:text-neutral-600"
              }`}
            >
              {s.label}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}

function MobileRail({ active }: { active: string }) {
  return (
    <nav className="md:hidden sticky top-0 z-10 bg-neutral-50/95 backdrop-blur border-b border-neutral-200 py-2 -mt-2 mb-2 overflow-x-auto">
      <ul className="flex gap-1.5 w-max px-0.5">
        {RAIL_SECTIONS.map((s) => (
          <li key={s.id}>
            <a
              href={`#${s.id}`}
              className={`inline-block whitespace-nowrap rounded-full px-2.5 py-1 text-[11px] font-medium border transition-colors ${
                active === s.id ? "bg-neutral-900 text-white border-neutral-900" : "bg-white text-neutral-600 border-neutral-300"
              }`}
            >
              {s.label}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
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
  const [active, setActive] = useState<string>("decision");
  const [comingNextOpen, setComingNextOpen] = useState(false);

  const activeScenario = PLATFORM_SCENARIOS.find((p) => p.key === activePlatform)!;
  const matchedRows = benchmarks.filter((b) => b.is_active && activeScenario.match(b));

  const counts = Object.fromEntries(DECISION_BOARD.map((c) => [c.key, c.items.length])) as Record<string, number>;

  // Scroll-spy: highlights the rail entry for whichever section is nearest
  // the top of the viewport. Presentation only — no data dependency.
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) {
          const id = visible[0].target.getAttribute("id");
          if (id) setActive(id);
        }
      },
      { rootMargin: "-88px 0px -70% 0px", threshold: 0 },
    );
    RAIL_SECTIONS.forEach((s) => {
      const el = document.getElementById(s.id);
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, []);

  return (
    <div className="max-w-5xl space-y-5">
      <ErrorBanner message={dbError} />

      {/* Hero decision summary */}
      <div className="rounded-2xl border border-neutral-200 bg-white p-6 sm:p-7">
        <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest mb-1">
          Creative Intelligence — Showcase Mode
        </p>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-neutral-900 mb-3">
          Gentle Care — Brilliant Digestion Educator
        </h1>

        <div className="flex flex-wrap gap-2 mb-4">
          <Badge tone="neutral">Market: Indonesia</Badge>
          <Badge tone="neutral">Asset maturity: Final asset</Badge>
        </div>

        <div className="rounded-lg bg-neutral-900 text-white px-4 py-2.5 mb-4">
          <p className="text-xs leading-relaxed">
            <span className="font-semibold">Showcase mode:</span> one-time read of a public asset, not a live pipeline.
          </p>
        </div>

        <div className="rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 mb-4">
          <p className="text-[10px] font-bold text-amber-700 uppercase tracking-widest mb-1">
            Is this creative ready to move toward spend?
          </p>
          <p className="text-sm sm:text-base font-semibold text-neutral-900">
            Proceed with caution — key platform and brief inputs missing.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <CountChip label="HOLD" n={counts.HOLD} tone="green" />
          <CountChip label="STRENGTHEN" n={counts.STRENGTHEN} tone="amber" />
          <CountChip label="VALIDATE" n={counts.VALIDATE} tone="blue" />
          <CountChip label="WATCH" n={counts.WATCH} tone="red" />
        </div>
      </div>

      <MobileRail active={active} />

      <div className="flex gap-8 items-start">
        <StoryRail active={active} />

        <div className="flex-1 min-w-0 space-y-8">
          {/* Decision Room — the emotional centre */}
          <section id="decision" className="scroll-mt-20">
            <h2 className="text-xl font-bold tracking-tight text-neutral-900 mb-1">Pre-flight Decision Room</h2>
            <p className="text-xs text-neutral-500 mb-4">
              Four buckets, one question each: what do we hold, strengthen, validate, and watch before this moves toward spend?
            </p>
            <div className="grid sm:grid-cols-2 gap-4">
              {DECISION_BOARD.map((col) => {
                const visible = col.items.slice(0, 3);
                const rest = col.items.slice(3);
                return (
                  <div key={col.key} className={`rounded-xl border-2 p-5 ${BOARD_ACCENT[col.tone]}`}>
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className={`w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0 ${BOARD_ICON_BG[col.tone]}`}>
                        {BOARD_ICON[col.key]}
                      </span>
                      <p className="text-sm font-bold uppercase tracking-widest text-neutral-800">{col.key}</p>
                      <span className="ml-auto text-xs font-semibold text-neutral-500">{col.items.length}</span>
                    </div>
                    <p className="text-xs text-neutral-600 italic mb-3">{col.blurb}</p>
                    <ul className="space-y-1.5">
                      {visible.map((it, i) => (
                        <li key={i} className="text-xs text-neutral-700 leading-relaxed flex gap-1.5">
                          <span className="text-neutral-400 shrink-0">•</span><span>{it}</span>
                        </li>
                      ))}
                    </ul>
                    {rest.length > 0 && (
                      <div className="mt-2">
                        <Reveal label={`View reasoning (+${rest.length} more)`}>
                          <ul className="space-y-1.5">
                            {rest.map((it, i) => (
                              <li key={i} className="text-xs text-neutral-700 leading-relaxed flex gap-1.5">
                                <span className="text-neutral-400 shrink-0">•</span><span>{it}</span>
                              </li>
                            ))}
                          </ul>
                        </Reveal>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </section>

          {/* Evidence — chips, not paragraphs */}
          <section id="evidence" className="scroll-mt-20 space-y-4">
            <h2 className="text-xl font-bold tracking-tight text-neutral-900">Evidence</h2>

            <Card>
              <div className="grid sm:grid-cols-2 gap-5">
                <div>
                  <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest mb-2">Available Evidence</p>
                  <div className="flex flex-wrap gap-1.5">
                    {OBSERVED_EVIDENCE.map((e, i) => (
                      <span
                        key={i}
                        title={e.detail}
                        className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[11px] font-medium text-emerald-800"
                      >
                        <EvidenceDot light="direct" /> {e.label}
                      </span>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest mb-2">Missing Evidence</p>
                  <div className="flex flex-wrap gap-1.5">
                    {MISSING_EVIDENCE.map((e, i) => (
                      <span
                        key={i}
                        title={e.detail}
                        className="inline-flex items-center gap-1.5 rounded-full border border-neutral-200 bg-neutral-50 px-2.5 py-1 text-[11px] font-medium text-neutral-600"
                      >
                        <EvidenceDot light="missing" /> {e.label}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </Card>

            <Card>
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-semibold text-neutral-800">Creative Format Read — evidence lights</p>
                <EvidenceLightsLegend />
              </div>
              <ul className="divide-y divide-neutral-100">
                {PROGRESS_PATH.map((step) => (
                  <li key={step.label} className="py-2.5 first:pt-0 last:pb-0">
                    <div className="flex items-center gap-2">
                      <EvidenceDot light={step.light} />
                      <p className="text-sm font-medium text-neutral-800">{step.label}</p>
                    </div>
                    <div className="pl-[18px] mt-1">
                      <Reveal label="View reasoning">
                        <p className="text-xs text-neutral-500 leading-relaxed">{step.read}</p>
                      </Reveal>
                    </div>
                  </li>
                ))}
              </ul>
            </Card>
          </section>

          {/* Confidence — collapsed by default, exact wording when opened */}
          <section id="confidence" className="scroll-mt-20">
            <h2 className="text-xl font-bold tracking-tight text-neutral-900 mb-3">Confidence</h2>
            <Card>
              <p className="text-xs text-neutral-500 mb-1">
                What the OS can say, cannot say, and what McCann needs to confirm — exact wording, not paraphrased.
              </p>
              <Reveal label="View confidence map" hideLabel="Hide confidence map">
                <div className="grid sm:grid-cols-3 gap-4 mt-3">
                  <div>
                    <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest mb-1.5">Can say</p>
                    <ul className="space-y-1.5">
                      {CONFIDENCE_MAP.can_say.map((t, i) => (
                        <li key={i} className="text-xs text-neutral-600 leading-relaxed">{t}</li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-red-500 uppercase tracking-widest mb-1.5">Cannot say</p>
                    <ul className="space-y-1.5">
                      {CONFIDENCE_MAP.cannot_say.map((t, i) => (
                        <li key={i} className="text-xs text-neutral-600 leading-relaxed">{t}</li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-blue-500 uppercase tracking-widest mb-1.5">Needs confirm</p>
                    <ul className="space-y-1.5">
                      {CONFIDENCE_MAP.needs_confirm.map((t, i) => (
                        <li key={i} className="text-xs text-neutral-600 leading-relaxed">{t}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </Reveal>
            </Card>
          </section>

          {/* Platform Lens — the aha moment */}
          <section id="platform" className="scroll-mt-20">
            <h2 className="text-xl font-bold tracking-tight text-neutral-900 mb-1">Platform Lens</h2>
            <p className="text-xs text-neutral-500 mb-3">Same asset, different platform — what tightens if distribution were confirmed.</p>
            <Card>
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

              <div className="mb-2"><RiskBadge level={activeScenario.riskLevel} /></div>
              <p className="text-sm font-medium text-neutral-800 mb-2">{activeScenario.mainQuestion}</p>
              <Reveal label="More context">
                <p className="text-xs text-neutral-500 leading-relaxed">{activeScenario.context}</p>
              </Reveal>

              <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest mb-1.5 mt-4">
                Reference material if {activeScenario.label} were confirmed
              </p>
              {matchedRows.length === 0 ? (
                <p className="text-xs text-neutral-400">No matching seeded Platform Benchmark rows found.</p>
              ) : (
                <div className="flex flex-wrap gap-1.5">
                  {matchedRows.map((b) =>
                    b.source_url ? (
                      <a
                        key={b.id}
                        href={b.source_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center rounded-full border border-blue-200 bg-blue-50 px-2.5 py-1 text-[11px] font-medium text-blue-700 hover:bg-blue-100"
                      >
                        {b.source_title}
                      </a>
                    ) : (
                      <span
                        key={b.id}
                        className="inline-flex items-center rounded-full border border-neutral-200 bg-neutral-50 px-2.5 py-1 text-[11px] font-medium text-neutral-600"
                      >
                        {b.source_title}
                      </span>
                    ),
                  )}
                </div>
              )}
            </Card>
          </section>

          {/* Pilot Ask — six tiles */}
          <section id="pilot" className="scroll-mt-20">
            <h2 className="text-xl font-bold tracking-tight text-neutral-900 mb-1">Pilot Ask</h2>
            <p className="text-xs text-neutral-500 mb-3">To move from this cold sample to a real pilot, we'd ask McCann for:</p>
            <div className="grid sm:grid-cols-3 gap-3">
              {VALIDATION_ASK.map((ask, i) => (
                <div key={ask.title} className="rounded-lg border border-neutral-200 bg-white p-4">
                  <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest mb-1">{i + 1}</p>
                  <p className="text-sm font-semibold text-neutral-800 mb-1">{ask.title}</p>
                  <p className="text-xs text-neutral-500 leading-relaxed">{ask.detail}</p>
                </div>
              ))}
            </div>
          </section>

          {/* Coming Next — collapsed drawer */}
          <section id="coming-next" className="scroll-mt-20">
            <button
              type="button"
              onClick={() => setComingNextOpen((o) => !o)}
              className="w-full flex items-center justify-between rounded-xl border border-neutral-200 bg-white px-5 py-4 text-left hover:bg-neutral-50 transition-colors"
            >
              <div>
                <h2 className="text-base font-bold tracking-tight text-neutral-900">Coming Next</h2>
                <p className="text-xs text-neutral-500 mt-0.5">What this becomes if McCann moves forward</p>
              </div>
              <span className="text-neutral-400 text-sm shrink-0 ml-3">{comingNextOpen ? "Hide ▾" : "Show ▸"}</span>
            </button>
            {comingNextOpen && (
              <div className="mt-3">
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
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
