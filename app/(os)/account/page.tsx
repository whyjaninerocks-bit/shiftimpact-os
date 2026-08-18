import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { Card, SectionTitle, buttonSecondaryClass } from "@/app/_components/ui";

export const dynamic = "force-dynamic";

async function signOut() {
  "use server";
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

export default async function AccountPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  // Fetch org details via admin client
  const admin = createAdminClient();
  const { data: profile } = await admin
    .from("user_profiles")
    .select("org_id, org_type, role, full_name, organisations(name)")
    .eq("id", user.id)
    .single();

  const orgName =
    (profile?.organisations as { name: string } | null)?.name ?? "ShiftImpact";
  const orgType = profile?.org_type ?? "ShiftImpact";
  const role = profile?.role ?? "Admin";

  return (
    <div className="max-w-xl mx-auto px-4 py-8 space-y-6">
      <div>
        <SectionTitle>Account</SectionTitle>
        <p className="text-sm text-neutral-500">Your profile and access details.</p>
      </div>

      <Card>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
            <div>
              <p className="text-xs font-medium text-neutral-400 uppercase tracking-wide mb-0.5">Email</p>
              <p className="text-neutral-900 font-medium">{user.email}</p>
            </div>
            <div>
              <p className="text-xs font-medium text-neutral-400 uppercase tracking-wide mb-0.5">Organisation</p>
              <p className="text-neutral-900 font-medium">{orgName}</p>
            </div>
            <div>
              <p className="text-xs font-medium text-neutral-400 uppercase tracking-wide mb-0.5">Type</p>
              <p className="text-neutral-700">{orgType}</p>
            </div>
            <div>
              <p className="text-xs font-medium text-neutral-400 uppercase tracking-wide mb-0.5">Role</p>
              <p className="text-neutral-700">{role}</p>
            </div>
          </div>

          <div className="pt-3 border-t border-neutral-100">
            <form action={signOut}>
              <button type="submit" className={buttonSecondaryClass}>
                Sign out
              </button>
            </form>
          </div>
        </div>
      </Card>

      <p className="text-xs text-neutral-400">
        To add or remove team members, contact the ShiftImpact admin.
      </p>
    </div>
  );
}
