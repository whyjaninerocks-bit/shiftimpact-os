// SignalSourcesSection.tsx — stub (Sprint 12 fix; full implementation in Sprint 13)
"use client";

interface SignalSourcesSectionProps {
  clientId: string;
}

export function SignalSourcesSection({ clientId: _clientId }: SignalSourcesSectionProps) {
  return (
    <section className="rounded-lg border border-neutral-200 bg-white p-6">
      <h2 className="font-semibold text-neutral-900 mb-2">Signal Sources</h2>
      <p className="text-sm text-neutral-500">Signal source configuration coming in Sprint 13.</p>
    </section>
  );
}
