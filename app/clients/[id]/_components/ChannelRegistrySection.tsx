import { createClientChannel, deleteClientChannel } from "@/lib/actions";
import { Card, SectionTitle, buttonClass, inputClass, labelClass } from "@/app/_components/ui";
import type { ClientChannel } from "@/lib/types";

const CATEGORY_OPTIONS = ["Radio", "KOL", "Retail", "Digital", "PR", "CRM", "Custom"] as const;

export function ChannelRegistrySection({
  clientId,
  channels,
}: {
  clientId: string;
  channels: ClientChannel[];
}) {
  const createAction = createClientChannel.bind(null, clientId);

  return (
    <Card>
      <SectionTitle id="channels">Channel Registry</SectionTitle>
      <p className="text-xs text-neutral-400 mb-3">
        All touchpoints this client can execute through. These appear as options when generating Idea Extension briefs for any campaign.
      </p>

      <div className="space-y-1 mb-4">
        {channels.map((ch) => {
          const deleteAction = deleteClientChannel.bind(null, ch.id, clientId);
          return (
            <div key={ch.id} className="flex items-start justify-between border border-neutral-100 rounded px-3 py-2 text-sm">
              <div>
                <span className="font-medium text-neutral-800">{ch.channel_name}</span>
                <span className="ml-2 text-xs text-neutral-400">{ch.channel_category}</span>
                {ch.translation_hint && (
                  <p className="text-xs text-neutral-500 mt-0.5">{ch.translation_hint}</p>
                )}
              </div>
              <form action={deleteAction}>
                <button type="submit" className="text-xs text-neutral-400 hover:text-red-600 ml-3 shrink-0">remove</button>
              </form>
            </div>
          );
        })}
        {channels.length === 0 && (
          <p className="text-sm text-neutral-500">No channels configured. Add below.</p>
        )}
      </div>

      <form action={createAction} className="border-t border-neutral-100 pt-3 space-y-2">
        <p className="text-xs font-medium text-neutral-500">Add Channel</p>
        <div className="grid sm:grid-cols-2 gap-2">
          <div>
            <label className={labelClass}>Channel Name</label>
            <input className={inputClass} name="channel_name" placeholder="e.g. WhatsApp Broadcast" required />
          </div>
          <div>
            <label className={labelClass}>Category</label>
            <select className={inputClass} name="channel_category" defaultValue="Custom">
              {CATEGORY_OPTIONS.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
        </div>
        <div>
          <label className={labelClass}>Translation Hint <span className="font-normal text-neutral-400">(optional — what makes this channel unique?)</span></label>
          <input className={inputClass} name="translation_hint" placeholder="e.g. High intimacy, personal trigger, reward signal required" />
        </div>
        <button type="submit" className={buttonClass}>Add Channel</button>
      </form>
    </Card>
  );
}
