"use client";

import { deleteClient } from "@/lib/actions";

export function DeleteClientButton({ clientId, clientName }: { clientId: string; clientName: string }) {
  return (
    <form action={deleteClient.bind(null, clientId)} onSubmit={(e) => {
      if (!window.confirm(`Delete "${clientName}"? This cannot be undone.`)) {
        e.preventDefault();
      }
    }}>
      <button
        type="submit"
        title="Delete client"
        className="p-1.5 rounded-lg text-neutral-300 hover:text-red-500 hover:bg-red-50 transition-colors opacity-0 group-hover:opacity-100"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.75} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
        </svg>
      </button>
    </form>
  );
}
