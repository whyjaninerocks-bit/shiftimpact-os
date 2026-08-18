// app/page.tsx — root page (outside (os) route group)
// Immediately redirects to /clients.
// Placed at root level (not inside route group) to avoid
// Next.js manifest generation issues.

import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function RootPage() {
  redirect("/clients");
}
