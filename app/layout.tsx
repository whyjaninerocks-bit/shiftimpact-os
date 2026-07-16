import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "ShiftImpact OS",
  description: "Signal-led campaign intelligence.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-neutral-50 text-neutral-900 antialiased">
        <header className="border-b border-neutral-200 bg-white">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
            <Link className="font-bold tracking-tight text-lg" href="/">
              ShiftImpact <span className="text-neutral-400 font-normal">OS</span>
            </Link>
            <nav className="flex gap-1 items-center">
              <Link
                className="px-3 py-1.5 rounded-md text-sm font-medium text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100"
                href="/"
              >
                Campaigns
              </Link>
              <Link
                className="px-3 py-1.5 rounded-md text-sm font-medium text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100"
                href="/clients"
              >
                Clients
              </Link>
              <Link
                className="px-3 py-1.5 rounded-md text-sm font-medium text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100"
                href="/knowledge"
              >
                Knowledge
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
              <Link
                className="px-3 py-1.5 rounded-md text-sm font-medium text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100"
                href="/settings"
              >
                Settings
              </Link>
              <Link
                className="ml-2 px-3 py-1.5 rounded-md text-sm font-medium bg-neutral-900 text-white hover:bg-neutral-700 transition-colors"
                href="/audit"
              >
                Quick Audit
              </Link>
            </nav>
          </div>
        </header>
        <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8">{children}</main>
      </body>
    </html>
  );
}
