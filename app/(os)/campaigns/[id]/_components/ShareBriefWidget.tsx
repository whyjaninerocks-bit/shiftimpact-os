// ShareBriefWidget.tsx — Sprint 13
// Shows the public /brief/[campaignId] URL with a copy-to-clipboard button.
// No auth required on /brief — campaign ID is the access key.

"use client";

import { useState, useEffect } from "react";

interface ShareBriefWidgetProps {
  campaignId: string;
}

export function ShareBriefWidget({ campaignId }: ShareBriefWidgetProps) {
  const [origin, setOrigin] = useState("https://shiftimpact-os.vercel.app");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      setOrigin(window.location.origin);
    }
  }, []);

  const briefUrl = `${origin}/brief/${campaignId}`;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(briefUrl);
    } catch {
      // Fallback for older browsers
      const input = document.createElement("input");
      input.value = briefUrl;
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
          Share Brief with Client / Agency
        </p>
        <p className="text-xs text-neutral-700 font-mono truncate select-all">{briefUrl}</p>
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
