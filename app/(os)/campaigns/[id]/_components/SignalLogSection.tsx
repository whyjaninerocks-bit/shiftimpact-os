import { createSignalLog, deleteSignalLog } from "@/lib/actions";
import { Badge, Card, SectionTitle, buttonClass, buttonSecondaryClass, inputClass, labelClass } from "@/app/_components/ui";
import type { GateSignalLog, PhaseGate } from "@/lib/types";

function passTone(pass: boolean | null): "green" | "red" | "neutral" {
  if (pass === true) return "green";
  if (pass === false) return "red";
  return "neutral";
}

export function SignalLogSection({
  campaignId,
  signalLogs,
  phaseGates,
}: {
  campaignId: string;
  signalLogs: GateSignalLog[];
  phaseGates: PhaseGate[];
}) {
  const createAction = createSignalLog.bind(null, campaignId);

  return (
    <Card>
      <SectionTitle id="signal-log">Gate Signal Log</SectionTitle>
      <p className="text-xs text-neutral-400 mb-3">
        Audit trail for all signal readings. Every reading logs the actual value vs the threshold —
        pass or fail is auto-calculated. This is what justifies every gate decision.
      </p>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-neutral-400 border-b border-neutral-200">
              <th className="py-1.5 pr-3">Date</th>
              <th className="py-1.5 pr-3">Signal</th>
              <th className="py-1.5 pr-3">Gate</th>
              <th className="py-1.5 pr-3 text-right">Actual</th>
              <th className="py-1.5 pr-3 text-right">Threshold</th>
              <th className="py-1.5 pr-3">Result</th>
              <th className="py-1.5 pr-3">Notes</th>
              <th className="py-1.5"></th>
            </tr>
          </thead>
          <tbody>
            {signalLogs.map((log) => {
              const deleteAction = deleteSignalLog.bind(null, log.id, campaignId);
              const gate = phaseGates.find((g) => g.id === log.gate_id);
              return (
                <tr key={log.id} className="border-b border-neutral-100 align-top">
                  <td className="py-1.5 pr-3 whitespace-nowrap text-neutral-500">{log.logged_at}</td>
                  <td className="py-1.5 pr-3">
                    <div className="font-medium">{log.signal_label}</div>
                    <div className="text-xs text-neutral-400">{log.signal_type}</div>
                  </td>
                  <td className="py-1.5 pr-3 text-xs text-neutral-500">
                    {gate ? gate.gate_type : "—"}
                  </td>
                  <td className="py-1.5 pr-3 text-right font-mono">
                    {log.actual_value != null ? `${log.actual_value}${log.unit ?? ""}` : "—"}
                  </td>
                  <td className="py-1.5 pr-3 text-right font-mono text-neutral-400">
                    {log.threshold_value != null ? `${log.threshold_value}${log.unit ?? ""}` : "—"}
                  </td>
                  <td className="py-1.5 pr-3">
                    <Badge tone={passTone(log.pass)}>
                      {log.pass === true ? "Pass" : log.pass === false ? "Fail" : "—"}
                    </Badge>
                  </td>
                  <td className="py-1.5 pr-3 text-xs text-neutral-500">{log.notes || "—"}</td>
                  <td className="py-1.5">
                    <form action={deleteAction}>
                      <button type="submit" className="text-xs text-neutral-400 hover:text-red-500">
                        ×
                      </button>
                    </form>
                  </td>
                </tr>
              );
            })}
            {signalLogs.length === 0 && (
              <tr>
                <td colSpan={8} className="py-3 text-neutral-500 text-sm">
                  No signal readings logged yet. Add the first reading below.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Add new signal reading */}
      <form action={createAction} className="mt-4 pt-4 border-t border-neutral-100 space-y-2">
        <p className="text-xs font-medium text-neutral-500">Log a Signal Reading</p>
        <div className="grid sm:grid-cols-2 gap-2">
          <div>
            <label className={labelClass} htmlFor="sl-gate_id">Gate</label>
            <select className={inputClass} id="sl-gate_id" name="gate_id">
              <option value="">— no gate —</option>
              {phaseGates.map((g) => (
                <option key={g.id} value={g.id}>{g.gate_type}</option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelClass} htmlFor="sl-logged_at">Date</label>
            <input
              className={inputClass}
              type="date"
              id="sl-logged_at"
              name="logged_at"
              defaultValue={new Date().toISOString().slice(0, 10)}
              required
            />
          </div>
        </div>
        <div className="grid sm:grid-cols-2 gap-2">
          <div>
            <label className={labelClass} htmlFor="sl-signal_label">Signal Label</label>
            <input
              className={inputClass}
              type="text"
              id="sl-signal_label"
              name="signal_label"
              placeholder="e.g. TikTok Save Rate"
              required
            />
          </div>
          <div>
            <label className={labelClass} htmlFor="sl-signal_type">Signal Type</label>
            <select className={inputClass} id="sl-signal_type" name="signal_type" required>
              <option value="">Select type…</option>
              <option value="save_rate">Save Rate</option>
              <option value="search_intent">Search Intent</option>
              <option value="retail_velocity">Retail Velocity</option>
              <option value="tiktok_shop_ctr">TikTok Shop CTR</option>
              <option value="repeat_purchase">Repeat Purchase Rate</option>
              <option value="organic_ugc">Organic UGC</option>
              <option value="nps">NPS</option>
              <option value="other">Other</option>
            </select>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-2">
          <div>
            <label className={labelClass} htmlFor="sl-actual_value">Actual</label>
            <input className={inputClass} type="number" step="0.01" id="sl-actual_value" name="actual_value" />
          </div>
          <div>
            <label className={labelClass} htmlFor="sl-threshold_value">Threshold</label>
            <input className={inputClass} type="number" step="0.01" id="sl-threshold_value" name="threshold_value" />
          </div>
          <div>
            <label className={labelClass} htmlFor="sl-unit">Unit</label>
            <select className={inputClass} id="sl-unit" name="unit">
              <option value="%">%</option>
              <option value="x">x</option>
              <option value="weeks">weeks</option>
              <option value="#">#</option>
              <option value="">none</option>
            </select>
          </div>
        </div>
        <div>
          <label className={labelClass} htmlFor="sl-notes">Notes</label>
          <textarea className={inputClass} id="sl-notes" name="notes" rows={2} placeholder="Context, source, or follow-up action" />
        </div>
        <button type="submit" className={buttonClass}>Log Signal Reading</button>
      </form>
    </Card>
  );
}
