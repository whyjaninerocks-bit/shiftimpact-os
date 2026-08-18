"use client";

import { useState } from "react";

// Reusable collapsible section — works in both server-rendered portal pages
// (imported as a client component) and the demo client component page.

export function Collapse({
  label,
  sublabel,
  children,
  defaultOpen = false,
  variant = "card",         // "card" = full border box  |  "inline" = borderless toggle row
}: {
  label: string;
  sublabel?: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
  variant?: "card" | "inline";
}) {
  const [open, setOpen] = useState(defaultOpen);

  if (variant === "inline") {
    return (
      <div>
        <button
          onClick={() => setOpen((v) => !v)}
          className="flex items-center gap-1.5 text-xs font-semibold text-neutral-500 hover:text-neutral-800 transition-colors py-1"
        >
          <svg
            className={`w-3.5 h-3.5 transition-transform shrink-0 ${open ? "rotate-90" : ""}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
          {open ? "Hide" : label}
        </button>
        {open && <div className="mt-2">{children}</div>}
      </div>
    );
  }

  return (
    <div className="border border-neutral-200 rounded-2xl overflow-hidden">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-5 py-4 hover:bg-neutral-50 transition-colors text-left"
      >
        <div className="min-w-0">
          <p className="text-sm font-semibold text-neutral-800 leading-snug">{label}</p>
          {sublabel && <p className="text-xs text-neutral-400 mt-0.5">{sublabel}</p>}
        </div>
        <svg
          className={`w-4 h-4 text-neutral-400 transition-transform shrink-0 ml-3 ${open ? "rotate-180" : ""}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {open && (
        <div className="border-t border-neutral-200 px-5 py-5 bg-white">
          {children}
        </div>
      )}
    </div>
  );
}
