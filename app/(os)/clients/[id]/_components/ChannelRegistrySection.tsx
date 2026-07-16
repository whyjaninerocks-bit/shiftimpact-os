// ChannelRegistrySection.tsx — stub (Sprint 12 fix; full implementation in Sprint 13)
"use client";

interface ChannelRegistrySectionProps {
  clientId: string;
}

export function ChannelRegistrySection({ clientId: _clientId }: ChannelRegistrySectionProps) {
  return (
    <section className="rounded-lg border border-neutral-200 bg-white p-6">
      <h2 className="font-semibold text-neutral-900 mb-2">Channel Registry</h2>
      <p className="text-sm text-neutral-500">Channel registry configuration coming in Sprint 13.</p>
    </section>
  );
}
