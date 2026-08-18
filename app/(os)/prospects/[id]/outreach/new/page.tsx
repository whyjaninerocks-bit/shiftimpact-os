// app/(os)/prospects/[id]/outreach/new/page.tsx
// Generate a new AI outreach draft for a person at this company.

"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { buttonClass, buttonSecondaryClass, Card, SectionTitle, labelClass, inputClass } from "@/app/_components/ui";

const CHANNELS = ["LinkedIn DM", "Email", "Introduction", "Event"] as const;

export default function NewOutreachPage({ params }: { params: { id: string } }) {
  const { id: companyId } = params;
  const searchParams = useSearchParams();
  const router       = useRouter();

  const defaultPersonId    = searchParams.get("person_id")    ?? "";
  const defaultAssessmentId = searchParams.get("assessment_id") ?? "";

  const [channel, setChannel]    = useState<string>("LinkedIn DM");
  const [generating, setGen]     = useState(false);
  const [error, setError]        = useState<string | null>(null);
  const [result, setResult]      = useState<{ id: string; message_draft: string; subject_line: string } | null>(null);

  async function generate() {
    setGen(true);
    setError(null);
    setResult(null);
    const res = await fetch("/api/prospect-outreach", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        person_id:     defaultPersonId,
        assessment_id: defaultAssessmentId || undefined,
        channel,
      }),
    });
    const json = await res.json();
    if (!res.ok) { setError(json.error ?? "Draft generation failed"); setGen(false); return; }
    setResult({ id: json.outreach.id, message_draft: json.outreach.message_draft, subject_line: json.subject_line });
    setGen(false);
  }

  if (result) {
    return (
      <div className="space-y-6 max-w-xl">
        <Link href={`/prospects/${companyId}`} className="text-sm text-neutral-400 hover:text-neutral-700 underline">
          Back to Company
        </Link>
        <SectionTitle>Draft Generated</SectionTitle>
        {result.subject_line && (
          <p className="text-sm font-medium text-neutral-600">Subject: {result.subject_line}</p>
        )}
        <Card>
          <p className="text-sm text-neutral-800 whitespace-pre-wrap leading-relaxed">{result.message_draft}</p>
        </Card>
        <div className="flex gap-3">
          <button
            onClick={() => router.push(`/prospects/${companyId}/outreach/${result.id}`)}
            className={buttonClass}
          >
            Review and Approve
          </button>
          <Link href={`/prospects/${companyId}`} className={buttonSecondaryClass}>
            Back
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-xl">
      <Link href={`/prospects/${companyId}`} className="text-sm text-neutral-400 hover:text-neutral-700 underline">
        Back to Company
      </Link>
      <SectionTitle>Generate Outreach Draft</SectionTitle>
      <Card>
        <div className="space-y-4">
          <div>
            <label className={labelClass}>Channel</label>
            <select
              value={channel}
              onChange={e => setChannel(e.target.value)}
              className={inputClass}
            >
              {CHANNELS.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <p className="text-xs text-neutral-400">
            The AI will draft a message in Janine&apos;s voice based on business signals and the latest assessment.
            You will review and approve before anything is sent.
          </p>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="flex gap-3">
            <button onClick={generate} disabled={generating} className={buttonClass}>
              {generating ? "Generating..." : "Generate Draft"}
            </button>
            <Link href={`/prospects/${companyId}`} className={buttonSecondaryClass}>Cancel</Link>
          </div>
        </div>
      </Card>
    </div>
  );
}
