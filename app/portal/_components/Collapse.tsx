"use client";

import { useId, useState } from "react";

// Reusable collapsible section — works in both server-rendered portal pages
// (imported as a client component) and the demo client component page.
//
// Accessibility: each toggle gets a stable id (useId) wired to its content
// panel via aria-controls, aria-expanded reflects open state for screen
// readers, and both variants get a visible focus ring for keyboard users —
// none of that was here before, and the plain chevron button gave no signal
// to anything but sighted mouse users.

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
  const panelId = useId();

  if (variant === "inline") {
    return (
      <div>
        <button
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-controls={panelId}
          className="flex items-center gap-1.5 text-xs font-semibold text-neutral-500 hover:text-neutral-800 transition-colors py-1 rounded focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-1"
        >
          <svg
            className={`w-3.5 h-3.5 transition-transform shrink-0 ${open ? "rotate-90" : ""}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
            aria-hidden="true"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
          {open ? "Hide" : label}
        </button>
        {open && (
          <div id={panelId} className="mt-2">
            {children}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="border border-neutral-200 rounded-2xl overflow-hidden">
      <button
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-controls={panelId}
        className="w-full flex items-center justify-between px-5 py-4 hover:bg-neutral-50 transition-colors text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-400"
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
          aria-hidden="true"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {open && (
        <div id={panelId} className="border-t border-neutral-200 px-5 py-5 bg-white">
          {children}
        </div>
      )}
    </div>
  );
}
