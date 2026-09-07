"use client";

export function PrintButton() {
  return (
    <button
      onClick={() => window.print()}
      className="px-4 py-2 rounded-xl bg-neutral-900 text-white text-sm font-semibold hover:bg-neutral-700 transition"
    >
      Print / Save as PDF
    </button>
  );
}
