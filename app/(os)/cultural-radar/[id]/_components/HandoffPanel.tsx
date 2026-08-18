"use client";

// Part 3: Creative handoff brief generator and display.
// ShiftImpact stays diagnostic — supplies the signal, the read, and the timing.
// The finished creative work stays with the brand's team.

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, buttonClass, buttonSecondaryClass } from "@/app/_components/ui";

type Props = {
  signalId: string;
  handoffBrief: string | null;
  generatedAt: string | null;
  brandFitStatus: string;
  communityRespectCheck: boolean;
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-MY", {
    day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
  });
}

// Very simple markdown-to-JSX: just handles ## headers and line breaks.
function renderBrief(text: string) {
  const lines = text.split("\n");
  const elements: React.ReactNode[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    if (line.startsWith("## ")) {
      elements.push(
        <h3 key={i} className="text-xs font-bold text-neutral-500 uppercase tracking-widest mt-5 mb-1.5 first:mt-0">
          {line.slice(3)}
        </h3>
      );
    } else if (line.trim() === "") {
      elements.push(<div key={i} className="h-1" />);
    } else {
      elements.push(
        <p key={i} className="text-sm text-neutral-700 leading-relaxed">
          {line}
        </p>
      );
    }
    i++;
  }
  return elements;
}

export function HandoffPanel({
  signalId,
  handoffBrief,
  generatedAt,
  brandFitStatus,
  communityRespectCheck,
}: Props) {
  const router = useRouter();
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isNotOurs = brandFitStatus === "not_ours";
  const respectFailed = !communityRespectCheck;

  async function generate() {
    setGenerating(true);
    setError(null);

    const res = await fetch(`/api/cultural-signals/${signalId}/handoff`, {
      method: "POST",
    });
    const json = await res.json();

    if (!res.ok) {
      setError(json.error ?? "Generation failed");
      setGenerating(false);
      return;
    }

    setGenerating(false);
    router.refresh();
  }

  // Blocked states
  if (isNotOurs) {
    return (
      <Card>
        <div className="text-center py-6">
          <p className="text-sm font-semibold text-red-600 mb-1">Not ours to enter</p>
          <p className="text-sm text-neutral-500">
            Brand fit verdict is "Not ours". No handoff brief will be generated.
            Update the assessment if the verdict changes.
          </p>
        </div>
      </Card>
    );
  }

  if (respectFailed) {
    return (
      <Card>
        <div className="text-center py-6">
          <p className="text-sm font-semibold text-amber-700 mb-1">Community respect check not passed</p>
          <p className="text-sm text-neutral-500">
            There must be a genuine, respectful connection to the community behind this signal before
            generating a creative handoff. Tick the respect check in Part 2 when it can be confirmed.
          </p>
        </div>
      </Card>
    );
  }

  return (
    <Card>
      {!handoffBrief ? (
        <div className="text-center py-8 space-y-4">
          <div>
            <p className="text-sm font-semibold text-neutral-900 mb-1">Ready to generate handoff brief</p>
            <p className="text-sm text-neutral-500 max-w-sm mx-auto">
              ShiftImpact supplies the signal, the cultural read, and the timing.
              The finished creative work stays with the brand and their team.
            </p>
          </div>
          {error && (
            <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>
          )}
          <button
            onClick={generate}
            disabled={generating}
            className={`${buttonClass} disabled:opacity-50`}
          >
            {generating ? (
              <span className="flex items-center gap-2">
                <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
                </svg>
                Generating brief…
              </span>
            ) : (
              "Generate creative handoff brief"
            )}
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Meta */}
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest">
                Creative Handoff Brief
              </p>
              {generatedAt && (
                <p className="text-xs text-neutral-400 mt-0.5">Generated {formatDate(generatedAt)}</p>
              )}
            </div>
            <div className="flex gap-2">
              <button
                onClick={generate}
                disabled={generating}
                className={`${buttonSecondaryClass} text-xs disabled:opacity-50`}
              >
                {generating ? "Regenerating…" : "Regenerate"}
              </button>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(handoffBrief!);
                }}
                className={`${buttonSecondaryClass} text-xs`}
              >
                Copy
              </button>
            </div>
          </div>

          {/* Divider */}
          <div className="border-t border-neutral-100" />

          {/* Brief content */}
          <div className="prose-none">
            {renderBrief(handoffBrief)}
          </div>

          {/* Constraint reminder */}
          <div className="mt-4 rounded-lg bg-neutral-50 border border-neutral-100 px-4 py-3">
            <p className="text-[11px] text-neutral-500 leading-relaxed">
              <span className="font-semibold text-neutral-700">ShiftImpact diagnostic scope:</span>{" "}
              This brief supplies the signal, the cultural read, and the timing. It is not creative direction.
              The finished work — what the brand makes and how they execute it — stays entirely with the brand and their team.
              That is also what keeps this capability diagnostic rather than turning ShiftImpact into an agency.
            </p>
          </div>

          {error && (
            <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>
          )}
        </div>
      )}
    </Card>
  );
}
