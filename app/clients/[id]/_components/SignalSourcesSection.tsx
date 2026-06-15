import { createClientSignalSource, deleteClientSignalSource } from "@/lib/actions";
import { Card, SectionTitle, buttonClass, inputClass, labelClass } from "@/app/_components/ui";
import type { ClientSignalSource } from "@/lib/types";

export function SignalSourcesSection({
  clientId,
  sources,
}: {
  clientId: string;
  sources: ClientSignalSource[];
}) {
  const createAction = createClientSignalSource.bind(null, clientId);

  return (
    <Card>
      <SectionTitle id="signal-sources">Signal Source Library</SectionTitle>
      <p className="text-xs text-neutral-400 mb-3">
        All data sources this client tracks. These populate the Signal Log dropdown for any campaign — add any custom source beyond the defaults.
      </p>

      <div className="overflow-x-auto mb-4">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-neutral-400 border-b border-neutral-200">
              <th className="py-1.5 pr-3">Source</th>
              <th className="py-1.5 pr-3">Type</th>
              <th className="py-1.5 pr-3">Unit</th>
              <th className="py-1.5 pr-3">Description</th>
              <th className="py-1.5"></th>
            </tr>
          </thead>
          <tbody>
            {sources.map((s) => {
              const deleteAction = deleteClientSignalSource.bind(null, s.id, clientId);
              return (
                <tr key={s.id} className="border-b border-neutral-100">
                  <td className="py-1.5 pr-3 font-medium">{s.source_name}</td>
                  <td className="py-1.5 pr-3 text-xs text-neutral-500 font-mono">{s.source_type}</td>
                  <td className="py-1.5 pr-3 text-xs text-neutral-500">{s.unit}</td>
                  <td className="py-1.5 pr-3 text-xs text-neutral-500">{s.description || "—"}</td>
                  <td className="py-1.5">
                    <form action={deleteAction}>
                      <button type="submit" className="text-xs text-neutral-400 hover:text-red-600">remove</button>
                    </form>
                  </td>
                </tr>
              );
            })}
            {sources.length === 0 && (
              <tr><td colSpan={5} className="py-2 text-neutral-500">No signal sources configured.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <form action={createAction} className="border-t border-neutral-100 pt-3 space-y-2">
        <p className="text-xs font-medium text-neutral-500">Add Signal Source</p>
        <div className="grid sm:grid-cols-2 gap-2">
          <div>
            <label className={labelClass}>Source Name</label>
            <input className={inputClass} name="source_name" placeholder="e.g. In-Store Footfall Lift" required />
          </div>
          <div>
            <label className={labelClass}>Source Type <span className="font-normal text-neutral-400">(slug)</span></label>
            <input className={inputClass} name="source_type" placeholder="e.g. footfall_lift" required />
          </div>
        </div>
        <div className="grid sm:grid-cols-3 gap-2">
          <div>
            <label className={labelClass}>Unit</label>
            <input className={inputClass} name="unit" placeholder="%" defaultValue="%" />
          </div>
          <div className="sm:col-span-2">
            <label className={labelClass}>Description</label>
            <input className={inputClass} name="description" placeholder="What this signal measures and where it comes from" />
          </div>
        </div>
        <button type="submit" className={buttonClass}>Add Source</button>
      </form>
    </Card>
  );
}
