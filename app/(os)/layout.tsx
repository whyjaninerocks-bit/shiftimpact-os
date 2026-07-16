// app/(os)/layout.tsx
// Nav layout for all internal OS pages.
// /brief/[id] is outside this route group and gets NO nav — intentional.
// Entry flow: Clients → select client → campaigns under that client.

import Link from "next/link";

export default function OsLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <header className="border-b border-neutral-200 bg-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
          <Link className="font-bold tracking-tight text-lg" href="/clients">
            ShiftImpact <span className="text-neutral-400 font-normal">OS</span>
          </Link>
          <nav className="flex gap-1 items-center">
            <Link
              className="px-3 py-1.5 rounded-md text-sm font-medium text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100"
              href="/clients"
            >
              Clients
            </Link>
            <Link
              className="px-3 py-1.5 rounded-md text-sm font-medium text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100"
              href="/team"
            >
              Team
            </Link>
            <Link
              className="px-3 py-1.5 rounded-md text-sm font-medium text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100"
              href="/os-rules"
            >
              OS Rules
            </Link>
          </nav>
        </div>
      </header>
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8">{children}</main>
    </>
  );
}
