// app/(os)/layout.tsx
// Sidebar nav layout for all internal OS pages.
// Desktop: fixed left sidebar (w-56). Mobile: top bar + hamburger drawer.
// /brief/[id] is outside this route group and gets NO nav — intentional.
// Entry flow: Clients → select client → campaigns under that client.

import { OsNav } from "@/app/_components/OsNav";

export default function OsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-neutral-50">
      <OsNav />
      {/* Desktop: push content right by sidebar width. Mobile: add top padding for the fixed header. */}
      <main className="lg:pl-56 pt-[57px] lg:pt-0">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
          {children}
        </div>
      </main>
    </div>
  );
}
