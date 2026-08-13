import { getTeamMembers } from "@/lib/data";
import { createTeamMember, updateTeamMember } from "@/lib/actions";
import { Badge, Card, ErrorBanner, SectionTitle, buttonClass, buttonSecondaryClass, inputClass, labelClass } from "@/app/_components/ui";

export default async function TeamPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const members = await getTeamMembers();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Team</h1>
        <p className="text-sm text-neutral-500 mt-1">
          Capacity tracking — Active Campaigns is a rollup; Capacity Status flags anyone over 5 active campaigns.
        </p>
      </div>

      <ErrorBanner message={error} />

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-3">
          {members.map((m) => {
            const action = updateTeamMember.bind(null, m.id);
            return (
              <Card key={m.id}>
                <form action={action} className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-3 flex-1">
                      <input className={`${inputClass} font-medium`} name="name" defaultValue={m.name} />
                      <input className={inputClass} name="role" defaultValue={m.role} />
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge tone="blue">{m.active_campaigns} active</Badge>
                      <Badge tone={m.capacity_status === "Over Capacity" ? "red" : "green"}>{m.capacity_status}</Badge>
                    </div>
                  </div>
                  <div className="flex items-end gap-2">
                    <div>
                      <label className={labelClass} htmlFor={`urgent-${m.id}`}>Urgent count</label>
                      <input className={inputClass} type="number" min="0" id={`urgent-${m.id}`} name="urgent_count" defaultValue={m.urgent_count} />
                    </div>
                    <button type="submit" className={buttonSecondaryClass}>Save</button>
                  </div>
                </form>
              </Card>
            );
          })}
          {members.length === 0 && <Card><p className="text-sm text-neutral-500">No team members yet.</p></Card>}
        </div>

        <Card>
          <SectionTitle>New Team Member</SectionTitle>
          <form action={createTeamMember} className="space-y-3">
            <div>
              <label className={labelClass} htmlFor="name">Name</label>
              <input className={inputClass} id="name" name="name" required />
            </div>
            <div>
              <label className={labelClass} htmlFor="role">Role</label>
              <input className={inputClass} id="role" name="role" placeholder="e.g. Strategy Lead" required />
            </div>
            <div>
              <label className={labelClass} htmlFor="urgent_count">Urgent Count</label>
              <input className={inputClass} type="number" min="0" id="urgent_count" name="urgent_count" defaultValue={0} />
            </div>
            <button type="submit" className={buttonClass}>Add Team Member</button>
          </form>
        </Card>
      </div>
    </div>
  );
}
