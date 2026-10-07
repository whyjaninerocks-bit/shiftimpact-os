// REVIEW-ONLY: revised Growth Driver, executor view. NOT persisted.
import Link from "next/link";
import { growthDriverPreviewRow } from "@/lib/growth-decision/preview";
import { BlueprintDoc } from "../../_components/BlueprintDoc";

export const dynamic = "force-dynamic";

export default function Page() {
  const row = growthDriverPreviewRow();
  return (
    <div>
      <div className="bp-noprint mb-4 flex flex-wrap items-center gap-3 text-sm">
        <span className="rounded bg-amber-100 px-2 py-0.5 text-[11px] font-semibold uppercase text-amber-800">
          Review preview — not persisted
        </span>
        <Link href="/blueprints/preview" className="text-neutral-600 hover:underline">Internal</Link>
        <Link href="/blueprints/preview/executor" className="text-neutral-600 hover:underline">Executor view</Link>
      </div>
      <BlueprintDoc row={row} variant="executor" />
    </div>
  );
}
