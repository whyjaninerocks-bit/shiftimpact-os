// app/(os)/growth-sprint/demo/page.tsx
// Growth Sprint Pilot Demo Mode — scenario picker
// INTERNAL ONLY — facilitator picks a scenario before sitting down with a client.

import Link from "next/link";
import { Card } from "@/app/_components/ui";
import { DEMO_SCENARIOS } from "@/lib/growth-sprint/demo-scenarios";

export default function GrowthSprintDemoPickerPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-10 space-y-6">
      <div>
        <p className="text-xs font-semibold text-indigo-600 uppercase tracking-wide">Pilot demo mode</p>
        <h1 className="text-xl font-bold text-neutral-900 mt-1">Growth Sprint — live client walkthrough</h1>
        <p className="text-sm text-neutral-500 mt-2 leading-relaxed">
          A 15–20 minute guided experience to run live with a business owner. Pick the scenario closest to
          who you&apos;re sitting with — each one is pre-built with real, methodology-consistent content so
          nothing depends on a live AI call during the session. Facilitator talking points are built into every step.
        </p>
      </div>

      <div className="space-y-3">
        {DEMO_SCENARIOS.map((s) => (
          <Link key={s.slug} href={`/growth-sprint/demo/${s.slug}`} className="block">
            <Card className="hover:border-neutral-300 transition-colors">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold text-neutral-900">{s.cardLabel}</p>
                  <p className="text-xs text-neutral-500 mt-0.5">{s.archetype} — {s.businessName}</p>
                  <p className="text-xs text-neutral-400 mt-1 max-w-xl">{s.challenge}</p>
                </div>
                <span className="text-xs font-medium text-indigo-600 shrink-0">Run this →</span>
              </div>
            </Card>
          </Link>
        ))}
      </div>

      <p className="text-xs text-neutral-400 pt-2">
        This mode is separate from a real Growth Sprint session — nothing here is saved. Use{" "}
        <Link href="/growth-sprint/new" className="underline hover:text-neutral-600">New Sprint</Link> for an actual paid engagement.
      </p>
    </div>
  );
}
