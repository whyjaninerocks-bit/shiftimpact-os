// app/(os)/partners/page.tsx
// Partner Workspaces — referral relationships and partner context.
// AOAI is referral_out_only: Janine refers to AOAI, not vice versa.

import { createAdminClient } from "@/lib/supabase/admin";
import { Badge, Card, SectionTitle } from "@/app/_components/ui";

export const dynamic = "force-dynamic";

type PartnerWorkspace = {
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

function directionTone(d: string): "blue" | "green" | "purple" | "neutral" {
  if (d === "referral_out_only") return "blue";
  if (d === "referral_in_only")  return "green";
  if (d === "both_ways")         return "purple";
  return "neutral";
}

function directionLabel(d: string): string {
  if (d === "referral_out_only") return "Referral out";
  if (d === "referral_in_only")  return "Referral in";
  if (d === "both_ways")         return "Both ways";
  return d;
}

function directionDescription(d: string): string {
  if (d === "referral_out_only") return "ShiftImpact refers suitable prospects to this partner. No inbound referrals.";
  if (d === "referral_in_only")  return "This partner refers leads to ShiftImpact. No outbound referrals.";
  if (d === "both_ways")         return "Mutual referral relationship in both directions.";
  return "";
}

export default async function PartnersPage() {
  const supabase = createAdminClient();

  const { data: partners, error } = await supabase
    .from("partner_workspaces")
    .select("*")
    .order("created_at", { ascending: true });

  const active   = partners?.filter(p => p.is_active)   ?? [];
  const inactive = partners?.filter(p => !p.is_active)  ?? [];

  return (
    <div className="max-w-2xl space-y-6">

      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div>
        <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest mb-1">
          Partner Workspaces
        </p>
        <h1 className="text-2xl font-bold tracking-tight text-neutral-900">Partners</h1>
        <p className="text-sm text-neutral-500 mt-1">
          Strategic referral relationships. Direction determines who refers whom.
        </p>
      </div>

      {/* ── Direction key ───────────────────────────────────────────────── */}
      <Card>
        <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest mb-3">Direction Key</p>
        <div className="space-y-2">
          {[
            { d: "referral_out_only", label: "Referral out", desc: "ShiftImpact refers to partner. Partner is NOT a client." },
            { d: "referral_in_only",  label: "Referral in",  desc: "Partner refers leads to ShiftImpact." },
            { d: "both_ways",         label: "Both ways",    desc: "Mutual referral relationship." },
          ].map(r => (
            <div key={r.d} className="flex items-start gap-2">
              <Badge tone={directionTone(r.d)}>{r.label}</Badge>
              <p className="text-xs text-neutral-500 leading-relaxed pt-0.5">{r.desc}</p>
            </div>
          ))}
        </div>
      </Card>

      {/* ── Error ───────────────────────────────────────────────────────── */}
      {error && (
        <Card>
          <p className="text-sm text-red-600">
            Partner workspaces table not found. Run{" "}
            <a href="/api/apply-migration-0040" target="_blank" className="underline font-medium">
              /api/apply-migration-0040
            </a>{" "}
            to apply the schema, then refresh.
          </p>
        </Card>
      )}

      {/* ── Active partners ─────────────────────────────────────────────── */}
      {!error && (
        <div className="space-y-3">
          <SectionTitle>Active Partners ({active.length})</SectionTitle>

          {active.length === 0 && (
            <Card>
              <p className="text-sm text-neutral-400">No active partners.</p>
            </Card>
          )}

          {active.map(p => (
            <PartnerCard key={p.id} partner={p as PartnerWorkspace} />
          ))}
        </div>
      )}

      {/* ── Inactive partners ───────────────────────────────────────────── */}
      {!error && inactive.length > 0 && (
        <div className="space-y-3">
          <SectionTitle>Inactive ({inactive.length})</SectionTitle>
          {inactive.map(p => (
            <PartnerCard key={p.id} partner={p as PartnerWorkspace} muted />
          ))}
        </div>
      )}

    </div>
  );
}

function PartnerCard({ partner: p, muted }: { partner: PartnerWorkspace; muted?: boolean }) {
  return (
    <Card className={muted ? "opacity-50" : ""}>
      <div className="flex items-start justify-between gap-3 mb-3">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="font-semibold text-neutral-900">{p.partner_name}</h2>
            <Badge tone={directionTone(p.direction)}>{directionLabel(p.direction)}</Badge>
            {!p.is_active && <Badge tone="neutral">Inactive</Badge>}
          </div>
          <p className="text-xs text-neutral-400 mt-0.5">{directionDescription(p.direction)}</p>
        </div>
      </div>

      {p.description && (
        <p className="text-sm text-neutral-600 leading-relaxed mb-3">{p.description}</p>
      )}

      {p.notes && (
        <div className="rounded-lg bg-amber-50 border border-amber-100 px-3 py-2.5 mb-3">
          <p className="text-[10px] font-bold text-amber-600 uppercase tracking-widest mb-1">Notes</p>
          <p className="text-xs text-amber-800 leading-relaxed">{p.notes}</p>
        </div>
      )}

      {(p.contact_name || p.contact_email) && (
        <div className="border-t border-neutral-100 pt-3">
          <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest mb-1">Contact</p>
          <p className="text-sm text-neutral-600">
            {p.contact_name}
            {p.contact_email && (
              <> · <a href={`mailto:${p.contact_email}`} className="text-blue-600 hover:underline">{p.contact_email}</a></>
            )}
          </p>
        </div>
      )}
    </Card>
  );
}
