"use client";

// app/campaigns/[id]/_components/ExternalReviewersSection.tsx
// External Reviewers card v0.1 — manage who outside ShiftImpact can open
// /culture-review/[campaignId] for this campaign, and at what access level.
// INTERNAL ONLY — not shown in Client Interface.
//
// v0.1 scope: existing Supabase Auth users only for granting access. The
// "Send invite email" flow (v0.1) is notification-only — it sends a Resend
// email nudging someone with no Auth account yet to sign in, and creates no
// database row. See upsertExternalReviewerGrant / sendExternalReviewerInvite
// in lib/actions.ts for the full behavior and the reasoning behind gating
// both on assertShiftImpactSession() even though the rest of this page has
// no login wall in v1.

import { useState, useTransition } from "react";
import { sendExternalReviewerInvite, upsertExternalReviewerGrant } from "@/lib/actions";
import type { ExternalReviewerAccessLevel, ExternalReviewerGrant, OrganisationOption } from "@/lib/types";
import { Card, SectionTitle, buttonClass, buttonSecondaryClass, inputClass, labelClass } from "@/app/_components/ui";

const ACCESS_LEVEL_LABELS: Record<ExternalReviewerAccessLevel, string> = {
  view: "View only",
  view_plus_assessment: "View + can save assessment",
};

const NEW_ORG_VALUE = "__new__";
const NO_ACCOUNT_ERROR_PREFIX = "No account found for";

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-MY", { day: "numeric", month: "short", year: "numeric" });
}

interface ExternalReviewersSectionProps {
  campaignId: string;
  campaignName: string;
  grants: ExternalReviewerGrant[];
  organisations: OrganisationOption[];
}

export function ExternalReviewersSection({
  campaignId,
  campaignName,
  grants,
  organisations,
}: ExternalReviewersSectionProps) {
  const [isPending, startTransition] = useTransition();
  const [isInvitePending, startInviteTransition] = useTransition();
  const [email, setEmail] = useState("");
  const [accessLevel, setAccessLevel] = useState<ExternalReviewerAccessLevel>("view");
  const [organisationId, setOrganisationId] = useState<string>(organisations[0]?.id ?? NEW_ORG_VALUE);
  const [newOrgName, setNewOrgName] = useState("");
  const [newOrgType, setNewOrgType] = useState<"Partner" | "Client">("Partner");
  const [message, setMessage] = useState<{ kind: "error" | "success"; text: string } | null>(null);
  const [noAccountEmail, setNoAccountEmail] = useState<string | null>(null);
  const [inviteMessage, setInviteMessage] = useState<{ kind: "error" | "success"; text: string } | null>(null);

  const creatingNewOrg = organisationId === NEW_ORG_VALUE;
  const effectiveOrgType: "Partner" | "Client" =
    creatingNewOrg ? newOrgType : organisations.find((o) => o.id === organisationId)?.type ?? "Partner";

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setMessage(null);
    setNoAccountEmail(null);
    setInviteMessage(null);
    const submittedEmail = email;
    startTransition(async () => {
      const result = await upsertExternalReviewerGrant({
        campaign_id: campaignId,
        email: submittedEmail,
        access_level: accessLevel,
        organisation_id: creatingNewOrg ? null : organisationId,
        new_organisation_name: creatingNewOrg ? newOrgName : null,
        new_organisation_type: creatingNewOrg ? newOrgType : null,
      });
      if (!result.ok) {
        setMessage({ kind: "error", text: result.error });
        if (result.error.startsWith(NO_ACCOUNT_ERROR_PREFIX)) {
          setNoAccountEmail(submittedEmail);
        }
        return;
      }
      setMessage({
        kind: "success",
        text: result.created ? "Reviewer added." : "Access level updated for existing reviewer.",
      });
      setEmail("");
    });
  }

  function handleSendInvite() {
    if (!noAccountEmail) return;
    setInviteMessage(null);
    startInviteTransition(async () => {
      const result = await sendExternalReviewerInvite({
        campaign_id: campaignId,
        campaign_name: campaignName,
        email: noAccountEmail,
        organisation_type: effectiveOrgType,
      });
      if (!result.ok) {
        setInviteMessage({ kind: "error", text: result.error });
        return;
      }
      setInviteMessage({ kind: "success", text: `Invite email sent to ${noAccountEmail}.` });
    });
  }

  return (
    <section id="external-reviewers">
      <SectionTitle>External Reviewers</SectionTitle>
      <Card>
        <p className="text-xs text-neutral-500 mb-4">
          People outside ShiftImpact who can open the culture review link for this campaign. Existing
          accounts only — someone must sign in once at /login before they can be added here.
        </p>

        {grants.length > 0 ? (
          <div className="mb-5 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-neutral-500 border-b border-neutral-200">
                  <th className="pb-2 pr-4 font-medium">Email</th>
                  <th className="pb-2 pr-4 font-medium">Organisation</th>
                  <th className="pb-2 pr-4 font-medium">Access</th>
                  <th className="pb-2 font-medium">Granted</th>
                </tr>
              </thead>
              <tbody>
                {grants.map((g) => (
                  <tr key={g.id} className="border-b border-neutral-100 last:border-0">
                    <td className="py-2 pr-4">{g.grantee_email ?? "—"}</td>
                    <td className="py-2 pr-4">{g.grantee_org_name}</td>
                    <td className="py-2 pr-4">{ACCESS_LEVEL_LABELS[g.access_level]}</td>
                    <td className="py-2 text-neutral-500">{fmtDate(g.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-sm text-neutral-400 mb-5">No external reviewers yet.</p>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 border-t border-neutral-100 pt-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className={labelClass}>Email</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setNoAccountEmail(null);
                  setInviteMessage(null);
                }}
                placeholder="reviewer@agency.com"
                className={inputClass}
              />
            </div>

            <div>
              <label className={labelClass}>Access level</label>
              <select
                value={accessLevel}
                onChange={(e) => setAccessLevel(e.target.value as ExternalReviewerAccessLevel)}
                className={inputClass}
              >
                <option value="view">{ACCESS_LEVEL_LABELS.view}</option>
                <option value="view_plus_assessment">{ACCESS_LEVEL_LABELS.view_plus_assessment}</option>
              </select>
            </div>

            <div>
              <label className={labelClass}>Organisation</label>
              <select
                value={organisationId}
                onChange={(e) => setOrganisationId(e.target.value)}
                className={inputClass}
              >
                {organisations.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.name} ({o.type})
                  </option>
                ))}
                <option value={NEW_ORG_VALUE}>+ Create new organisation</option>
              </select>
            </div>

            {creatingNewOrg && (
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                <div>
                  <label className={labelClass}>New organisation name</label>
                  <input
                    type="text"
                    required
                    value={newOrgName}
                    onChange={(e) => setNewOrgName(e.target.value)}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className={labelClass}>Type</label>
                  <select
                    value={newOrgType}
                    onChange={(e) => setNewOrgType(e.target.value as "Partner" | "Client")}
                    className={inputClass}
                  >
                    <option value="Partner">Partner</option>
                    <option value="Client">Client</option>
                  </select>
                </div>
              </div>
            )}
          </div>

          {message && (
            <p className={`text-sm ${message.kind === "error" ? "text-red-600" : "text-green-700"}`}>
              {message.text}
            </p>
          )}

          {noAccountEmail && (
            <div className="rounded-md bg-neutral-50 border border-neutral-200 p-3 space-y-2">
              <p className="text-xs text-neutral-500">
                Send a one-off email nudging {noAccountEmail} to sign in. This does not grant access —
                once they've signed in, submit this form again to add them.
              </p>
              <button
                type="button"
                onClick={handleSendInvite}
                disabled={isInvitePending}
                className={buttonSecondaryClass}
              >
                {isInvitePending ? "Sending…" : "Send invite email"}
              </button>
              {inviteMessage && (
                <p className={`text-sm ${inviteMessage.kind === "error" ? "text-red-600" : "text-green-700"}`}>
                  {inviteMessage.text}
                </p>
              )}
            </div>
          )}

          <button type="submit" disabled={isPending} className={buttonClass}>
            {isPending ? "Saving…" : "Add / update reviewer"}
          </button>
        </form>
      </Card>
    </section>
  );
}
