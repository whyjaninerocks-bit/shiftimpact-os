import { getOsRules } from "@/lib/data";
import { toggleOsRule } from "@/lib/actions";
import { Badge, Card, ErrorBanner, buttonSecondaryClass } from "@/app/_components/ui";

const TYPE_TONE = {
  Escalation: "red",
  Scoring: "purple",
  "Gate Permission": "blue",
  "Scheduled Review": "green",
  Configuration: "neutral",
} as const;

export default async function OsRulesPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const rules = await getOsRules();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">OS Rules</h1>
        <p className="text-sm text-neutral-500 mt-1">
          The intelligence layer&apos;s brain — scoring rules, escalation rules, gate permissions,
          Claude&apos;s scheduled review instructions, and industry configuration.
        </p>
      </div>

      <ErrorBanner message={error} />

      <div className="space-y-3">
        {rules.map((rule) => {
          const action = toggleOsRule.bind(null, rule.id, !rule.active);
          return (
            <Card key={rule.id}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold">{rule.rule_name}</h3>
                    <Badge tone={TYPE_TONE[rule.rule_type]}>{rule.rule_type}</Badge>
                    <Badge tone={rule.active ? "green" : "neutral"}>{rule.active ? "Active" : "Inactive"}</Badge>
                  </div>
                  <p className="text-sm text-neutral-600">{rule.description}</p>
                  {Object.keys(rule.config).length > 0 && (
                    <pre className="mt-2 text-xs bg-neutral-50 border border-neutral-100 rounded p-2 overflow-x-auto text-neutral-500">
                      {JSON.stringify(rule.config, null, 2)}
                    </pre>
                  )}
                </div>
                <form action={action}>
                  <button type="submit" className={buttonSecondaryClass}>
                    {rule.active ? "Deactivate" : "Activate"}
                  </button>
                </form>
              </div>
            </Card>
          );
        })}
        {rules.length === 0 && <Card><p className="text-sm text-neutral-500">No OS Rules configured.</p></Card>}
      </div>
    </div>
  );
}
