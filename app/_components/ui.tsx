export function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`bg-white border border-neutral-200 rounded-lg p-4 sm:p-5 ${className}`}>
      {children}
    </div>
  );
}

export function SectionTitle({ children, id }: { children: React.ReactNode; id?: string }) {
  return (
    <h2 id={id} className="text-lg font-semibold tracking-tight scroll-mt-20 mb-3">
      {children}
    </h2>
  );
}

const toneClasses: Record<string, string> = {
  green: "bg-emerald-100 text-emerald-800",
  amber: "bg-amber-100 text-amber-800",
  red: "bg-red-100 text-red-800",
  neutral: "bg-neutral-100 text-neutral-700",
  blue: "bg-blue-100 text-blue-800",
  purple: "bg-purple-100 text-purple-800",
};

export function Badge({ tone = "neutral", children }: { tone?: keyof typeof toneClasses; children: React.ReactNode }) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${toneClasses[tone]}`}>
      {children}
    </span>
  );
}

export function ragTone(rag: string): keyof typeof toneClasses {
  if (rag === "Green") return "green";
  if (rag === "Amber") return "amber";
  if (rag === "Red") return "red";
  return "neutral";
}

export function phaseTone(phase: string): keyof typeof toneClasses {
  switch (phase) {
    case "Demand":
      return "blue";
    case "Conversion":
      return "purple";
    case "Retention":
      return "green";
    default:
      return "neutral";
  }
}

export function gateDecisionTone(decision: string): keyof typeof toneClasses {
  switch (decision) {
    case "Open":
      return "green";
    case "Hold":
      return "amber";
    case "Stop":
      return "red";
    default:
      return "neutral";
  }
}

export function icsThresholdTone(threshold: string): keyof typeof toneClasses {
  switch (threshold) {
    case "Advance":
      return "green";
    case "Conditional":
      return "amber";
    case "Fix":
      return "amber";
    case "Rework":
      return "amber";
    case "Stop":
      return "red";
    default:
      return "neutral";
  }
}

export function gateSignalTone(status: string): keyof typeof toneClasses {
  switch (status) {
    case "On Track":
      return "green";
    case "At Risk":
      return "amber";
    case "Blocked":
      return "red";
    default:
      return "neutral";
  }
}

export function ErrorBanner({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
      {message}
    </div>
  );
}

export const inputClass =
  "w-full rounded-md border border-neutral-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-400";

export const labelClass = "block text-xs font-medium text-neutral-500 mb-1";

export const buttonClass =
  "inline-flex items-center justify-center rounded-md bg-neutral-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-neutral-700 disabled:opacity-50";

export const buttonSecondaryClass =
  "inline-flex items-center justify-center rounded-md border border-neutral-300 bg-white px-3 py-1.5 text-sm font-medium text-neutral-700 hover:bg-neutral-50";
