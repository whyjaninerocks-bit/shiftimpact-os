// app/settings/page.tsx
// OS Settings — operator configuration for ShiftImpact OS.
// Currently covers AI model selection per inference route.
// Add new setting categories here as the OS grows.
//
// INTERNAL ONLY. Not linked from any client-facing page.

import { AIModelSettings } from "./_components/AIModelSettings";

export default function SettingsPage() {
  return (
    <div className="space-y-8 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">OS Settings</h1>
        <p className="text-sm text-neutral-500 mt-1">
          Operator configuration for ShiftImpact OS. Changes take effect immediately — no redeploy needed.
        </p>
      </div>
      <AIModelSettings />
    </div>
  );
}
