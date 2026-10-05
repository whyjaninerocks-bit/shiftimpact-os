// app/(os)/blueprints/page.tsx
// Activation Blueprint V1 — internal index (Growth Decision Sprint, Roma-ready prototype).
// Internal only (middleware gates all non-public paths).

import Link from "next/link";
import { listBlueprints } from "@/lib/growth-decision/store";
import type { BlueprintRow } from "@/lib/growth-decision/schema";

export const dynamic = "force-dynamic";

export default async function BlueprintsPage() {
  let rows: BlueprintRow[] = [];
  let dbError: string | undefined;
  try {
    rows = await listBlueprints();
  } catch (e) {
    dbError = e instanceof Error ? e.message : "Failed to load blueprints";
  }

  return (
    <div>
      <h1 className="text-xl font-semibold text-neutral-900">Activation Blueprints</h1>
      <p className="mt-1 text-sm text-neutral-500">
        Growth Decision Sprint — commercial pressure → decision → Activation Blueprint → test → outcome → next decision.
        Internal prototype. Demo rows use fictional brands and numbers.
      </p>

      {dbError && <p className="mt-4 rounded bg-rose-50 p-3 text-sm text-rose-700">{dbError}</p>}

      {!dbError && rows.length === 0 && (
        <div className="mt-6 rounded-lg border border-dashed border-neutral-300 p-6 text-sm text-neutral-600">
          <p className="font-medium text-neutral-800">No blueprints yet.</p>
          <p className="mt-1">
            Seed the two Roma examples from your machine (needs <code>.env.local</code> with the Supabase service key):
          </p>
          <pre className="mt-2 overflow-x-auto rounded bg-neutral-900 p-3 text-xs text-neutral-100">{`npx tsx --env-file=.env.local scripts/blueprint-persist.ts commerce_leakage --model "label"
npx tsx --env-file=.env.local scripts/blueprint-persist.ts growth_driver --model "label"`}</pre>
          <p className="mt-2">
            Or draft with the production model (needs <code>ANTHROPIC_API_KEY</code>):{" "}
            <code>scripts/blueprint-gate.ts &lt;example&gt; --persist</code>.
          </p>
        </div>
      )}

      <ul className="mt-6 space-y-3">
        {rows.map((r) => (
          <li key={r.id} className="rounded-lg border border-neutral-200 bg-white p-4">
            <div className="flex flex-wrap items-center gap-2 text-[11px] font-semibold uppercase tracking-wide">
              {r.is_demo && <span className="rounded bg-rose-100 px-2 py-0.5 text-rose-800">Illustrative demo</span>}
              <span className="rounded bg-neutral-100 px-2 py-0.5 text-neutral-600">{r.territory.replace(/_/g, " ")}</span>
              <span className="rounded bg-neutral-100 px-2 py-0.5 text-neutral-600">{r.market}</span>
            </div>
            <h2 className="mt-2 font-medium text-neutral-900">{r.title}</h2>
            <p className="text-xs text-neutral-500">Execution owner: {r.execution_owner_label ?? "—"}</p>
            <div className="mt-3 flex flex-wrap gap-3 text-sm">
              <Link className="text-blue-700 hover:underline" href={`/blueprints/${r.id}`}>
                Internal workspace
              </Link>
              <Link className="text-blue-700 hover:underline" href={`/blueprints/${r.id}/executor`}>
                Executor view
              </Link>
              <Link className="text-blue-700 hover:underline" href={`/blueprints/${r.id}/receipt`}>
                Decision Evidence Receipt
              </Link>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
