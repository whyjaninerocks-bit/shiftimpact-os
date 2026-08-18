// app/(os)/partners/page.tsx
import { createAdminClient } from "@/lib/supabase/admin";
import { createPartner, updatePartner, togglePartner, deletePartner } from "@/lib/actions";
import { PartnersClient } from "./_components/PartnersClient";

export const dynamic = "force-dynamic";

export type PartnerWorkspace = {
  id: string;
  partner_name: string;
  partner_slug: string;
  description: string | null;
  direction: "referral_out_only" | "referral_in_only" | "both_ways";
  contact_name: string | null;
  contact_email: string | null;
  notes: string | null;
  is_active: boolean;
  created_at: string;
};

export default async function PartnersPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error: serverError } = await searchParams;
  const supabase = createAdminClient();

  const { data: partners, error: dbError } = await supabase
    .from("partner_workspaces")
    .select("*")
    .order("created_at", { ascending: true });

  return (
    <PartnersClient
      partners={(partners ?? []) as PartnerWorkspace[]}
      dbError={dbError?.message}
      serverError={serverError}
    />
  );
}
