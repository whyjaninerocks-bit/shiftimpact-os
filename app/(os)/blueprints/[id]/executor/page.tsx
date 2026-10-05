// app/(os)/blueprints/[id]/executor/page.tsx
// Executor View prototype — INTERNAL ONLY (middleware gates non-public paths).
import Link from "next/link";
import { notFound } from "next/navigation";
import { getBlueprint } from "@/lib/growth-decision/store";
import { BlueprintDoc } from "../../_components/BlueprintDoc";
import { PrintButton } from "../../_components/PrintButton";

export const dynamic = "force-dynamic";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const row = await getBlueprint(id);
  if (!row) notFound();
  return (
    <div>
      <div className="bp-noprint mb-4 flex flex-wrap items-center gap-3 text-sm">
        <Link href="/blueprints" className="text-blue-700 hover:underline">← All blueprints</Link>
        <Link href={`/blueprints/${id}`} className="text-neutral-600 hover:underline">Internal</Link>
        <Link href={`/blueprints/${id}/executor`} className="text-neutral-600 hover:underline">Executor view</Link>
        <Link href={`/blueprints/${id}/receipt`} className="text-neutral-600 hover:underline">Receipt</Link>
        <span className="ml-auto"><PrintButton /></span>
      </div>
      <BlueprintDoc row={row} variant="executor" />
    </div>
  );
}
