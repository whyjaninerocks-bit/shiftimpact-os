import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "ShiftImpact OS",
  description: "Idea integrity, evidence gates, and compounding briefs — from FRAME to retention.",
};

const navLinks = [
  { href: "/", label: "Campaigns" },
  { href: "/clients", label: "Clients" },
  { href: "/team", label: "Team" },
  { href: "/os-rules", label: "OS Rules" },
];

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="antialiased bg-neutral-50 text-neutral-900">
        <div className="min-h-screen flex flex-col">
          <header className="border-b border-neutral-200 bg-white">
            <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
              <Link href="/" className="font-bold tracking-tight text-lg">
                ShiftImpact <span className="text-neutral-400 font-normal">OS</span>
              </Link>
              <nav className="flex gap-1">
                {navLinks.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    className="px-3 py-1.5 rounded-md text-sm font-medium text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100"
                  >
                    {link.label}
                  </Link>
                ))}
              </nav>
            </div>
          </header>
          <main className="flex-1 max-w-6xl mx-auto w-full px-4 sm:px-6 py-6">{children}</main>
          <footer className="border-t border-neutral-200 py-4 text-center text-xs text-neutral-400">
            Is the idea still strong enough here to earn the next stage?
          </footer>
        </div>
      </body>
    </html>
  );
}
