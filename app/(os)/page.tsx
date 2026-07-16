// app/(os)/page.tsx
// Home page — redirects to /clients.
// Entry point is the client list; campaigns are accessed through their client.

import { redirect } from "next/navigation";

export default function HomePage() {
  redirect("/clients");
}
