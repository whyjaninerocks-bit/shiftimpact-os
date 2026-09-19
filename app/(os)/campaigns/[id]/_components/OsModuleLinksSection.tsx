// app/(os)/campaigns/[id]/_components/OsModuleLinksSection.tsx
// Task 5.5 — Campaign Working Page Integration Pass.
// Light connective tissue only: links out to the Signal Map (Task 1),
// Cultural-to-Commerce Signal Read (Task 5), and client-level Brand Momentum
// (Task 3) from the internal campaign working page, so a strategist doesn't
// have to rely on the global sidebar to find them. Deliberately NOT a new
// feature — no data fetching, no duplicated content, just navigation.
// INTERNAL ONLY — not shown in Client Interface.

import Link from "next/link";
import { Card } from "@/app/_components/ui";

interface OsModuleLinksSectionProps {
  campaignId: string;
  clientId: string;
}

export function OsModuleLinksSection({ campaignId, clientId }: OsModuleLinksSectionProps) {
  return (
    <Card className="space-y-4">
      <p className="text-[10px] font-bold uppercase tracking-widest text-neutral-400">OS Modules</p>

      <div className="grid gap-4 sm:grid-cols-3">
        {/* Signal Map — Task 1 */}
        <div className="space-y-1">
          <p className="text-sm font-semibold text-neutral-800">Signal Map</p>
          <p className="text-xs text-neutral-500 leading-relaxed">
            Manage the Brand-Commerce classification and category signal mapping for this campaign.
          </p>
          <Link
            href={`/signal-maps/${campaignId}`}
            className="inline-block text-xs font-medium text-blue-600 hover:text-blue-800 hover:underline"
          >
            View / edit campaign signal map →
          </Link>
        </div>

        {/* Cultural-to-Commerce Signal Read — Task 5 */}
        <div className="space-y-1">
          <p className="text-sm font-semibold text-neutral-800">Cultural-to-Commerce Signal Read</p>
          <p className="text-xs text-neutral-500 leading-relaxed">
            Indonesia category signals are available for this campaign&apos;s market/category. These signals
            connect social surface, market culture, human tension, meaning transfer, proof gaps and action paths.
          </p>
          <div className="flex flex-col gap-0.5">
            <Link
              href={`/portal/${campaignId}?view=agency#cultural-signal-read`}
              className="inline-block text-xs font-medium text-blue-600 hover:text-blue-800 hover:underline"
            >
              View client-facing read →
            </Link>
            <Link
              href="/cultural-radar"
              className="inline-block text-xs font-medium text-blue-600 hover:text-blue-800 hover:underline"
            >
              Manage cultural signals →
            </Link>
          </div>
        </div>

        {/* Brand Momentum — Task 3, client-level, not duplicated here */}
        <div className="space-y-1">
          <p className="text-sm font-semibold text-neutral-800">Brand Momentum</p>
          <p className="text-xs text-neutral-500 leading-relaxed">Brand Momentum is tracked at client level.</p>
          <Link
            href={`/clients/${clientId}`}
            className="inline-block text-xs font-medium text-blue-600 hover:text-blue-800 hover:underline"
          >
            View client Brand Momentum →
          </Link>
        </div>
      </div>
    </Card>
  );
}
