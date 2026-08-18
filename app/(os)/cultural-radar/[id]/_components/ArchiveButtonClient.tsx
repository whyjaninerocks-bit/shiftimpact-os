"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function ArchiveButtonClient({ signalId }: { signalId: string }) {
  const router = useRouter();
  const [archiving, setArchiving] = useState(false);

  async function handleArchive() {
    if (!confirm("Archive this signal? It will be removed from the active log.")) return;
    setArchiving(true);
    await fetch(`/api/cultural-signals/${signalId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "archived" }),
    });
    router.push("/cultural-radar");
  }

  return (
    <button
      onClick={handleArchive}
      disabled={archiving}
      className="text-xs text-neutral-400 hover:text-neutral-600 underline disabled:opacity-50"
    >
      {archiving ? "Archiving…" : "Archive signal"}
    </button>
  );
}
