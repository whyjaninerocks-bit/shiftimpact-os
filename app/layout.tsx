// app/layout.tsx — root layout (HTML shell only)
// Nav lives in app/(os)/layout.tsx so /brief/[id] stays nav-free for clients.

import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ShiftImpact OS",
  description: "Signal-led campaign intelligence.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-neutral-50 text-neutral-900 antialiased">
        {children}
      </body>
    </html>
  );
}
