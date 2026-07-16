// app/(os)/page.tsx
// Home page — redirects to /clients.
// async + force-dynamic ensures Next.js generates all expected build manifests.

import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  redirect("/clients");
}
