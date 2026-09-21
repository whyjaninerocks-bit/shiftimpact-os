// app/(os)/platform-benchmarks/page.tsx
// Platform Benchmark Reference Library v0.1 — INTERNAL ONLY.
//
// Manual reference bank for Platform Behaviour + Format Efficacy
// Intelligence (see the approved brainstorm/plan). Plain CRUD over
// platform_benchmarks (migration 0099) — no AI diagnosis, no scraping, no
// connection to Creative Format Read or any campaign. This is a
// strategist-maintained library, not campaign-scoped, so it lives as its
// own top-level (os) page (same posture as /partners, /os-rules).

import { getPlatformBenchmarks } from "@/lib/data";
import { PlatformBenchmarksClient } from "./_components/PlatformBenchmarksClient";

export const dynamic = "force-dynamic";

export default async function PlatformBenchmarksPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error: serverError } = await searchParams;

  let benchmarks: Awaited<ReturnType<typeof getPlatformBenchmarks>> = [];
  let dbError: string | undefined;
  try {
    benchmarks = await getPlatformBenchmarks();
  } catch (err) {
    dbError = err instanceof Error ? err.message : "Failed to load platform benchmarks";
  }

  return (
    <PlatformBenchmarksClient
      benchmarks={benchmarks}
      dbError={dbError}
      serverError={serverError}
    />
  );
}
