// app/(os)/creative-intelligence-showcase/page.tsx
// Creative Intelligence Showcase Mode — INTERNAL ONLY, UI LAYER ONLY.
//
// Renders the already-completed Creative Format Read of the Gentle Care /
// Brilliant Digestion Educator case (McCann x EssenceMediacom, Smarties
// Indonesia 2024) as a Pre-flight Creative Decision Console: a hero decision
// summary, a sticky story rail (Decision / Evidence / Confidence / Platform
// Lens / Pilot Ask / Coming Next), a HOLD / STRENGTHEN / VALIDATE / WATCH
// Decision Room as the hero section, evidence as chips + lights, a platform
// scenario lens with risk-shift badges, six Pilot Ask tiles, and a
// collapsed "Coming Next" drawer for the planned-roadmap cards.
//
// This page makes NO model call. Every word of the Gentle Care read below is
// the same, already-produced, human-reviewed analysis from this engagement —
// this file only presents it. The one live data dependency is a read-only
// fetch of the existing platform_benchmarks table (migration 0099, already
// seeded), used to show real reference-row titles under the platform
// scenario toggle. Nothing is written to the database from this page.
//
// Explicitly out of scope here, per the approved build brief: no migration,
// no new AI call, no video upload, no asset card table, no keyframe
// pipeline, no Learning Memory wiring, no portal/client exposure. The
// "Planned next" section exists to name that roadmap, not to build any of
// it — every card there is inert copy.

import { getPlatformBenchmarks } from "@/lib/data";
import { CreativeIntelligenceShowcaseClient } from "./_components/CreativeIntelligenceShowcaseClient";
import type { PlatformBenchmark } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function CreativeIntelligenceShowcasePage() {
  let benchmarks: PlatformBenchmark[] = [];
  let dbError: string | undefined;
  try {
    benchmarks = await getPlatformBenchmarks();
  } catch (err) {
    dbError = err instanceof Error ? err.message : "Failed to load platform benchmark reference rows";
  }

  return <CreativeIntelligenceShowcaseClient benchmarks={benchmarks} dbError={dbError} />;
}
