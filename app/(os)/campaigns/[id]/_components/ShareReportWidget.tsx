// ShareReportWidget.tsx — Sprint 16
// Shows the public /report/[campaignId] URL with a copy-to-clipboard button.
// Client-facing report: curated signal summary, no internal data exposed.

"use client";

import { useState, useEffect } from "react";

interface ShareReportWidgetProps {
  campaignId: string;
}

export function ShareReportWidget({ campaignId }: ShareReportWidgetProps) {
  const [origin, setOrigin] = useState("https://shiftimpact-os.vercel.app");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      setOrigin(window.location.origin);
    }
  }, []);

  const reportUrl = `${origin}/report/${campaignId}`;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(reportUrl);
    } catch {
      const input = document.createElement("input");
      input.value = reportUrl;
      document.body.appendChild(input);
      input.select();
      document.execCommand("copy");
      document.body.removeChild(input);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex items-center gap-2 mt-2 px-3 py-2.5 rounded-lg border border-neutral-200 bg-neutral-50 max-w-2xl">
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium text-neutral-400 mb-0.5 uppercase tracking-wide">
          Share Campaign Report with Client
        </p>
        <p className="text-xs text-neutral-700 font-mono truncate select-all">{reportUrl}</p>
      </div>
      <button
        onClick={handleCopy}
        className={`shrink-0 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
          copied
            ? "bg-green-100 text-green-700 border border-green-200"
            : "bg-neutral-900 text-white hover:bg-neutral-700"
        }`}
      >
        {copied ? "Copied!" : "Copy Link"}
      </button>
    </div>
  );
}
