// app/os-rules/page.tsx — OS Rules with full CRUD (create, edit, toggle, delete)
import { getOsRules } from "@/lib/data";
import { OsRulesClient } from "./_components/OsRulesClient";

export const dynamic = "force-dynamic";

export default async function OsRulesPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const rules = await getOsRules();

  return (
    <OsRulesClient
      rules={rules}
      serverError={error}
    />
  );
}
