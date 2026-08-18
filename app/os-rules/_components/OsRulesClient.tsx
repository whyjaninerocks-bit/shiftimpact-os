"use client";

import { useState } from "react";
import { Badge, Card, ErrorBanner, SectionTitle, buttonClass, buttonSecondaryClass, inputClass, labelClass } from "@/app/_components/ui";
import { toggleOsRule, createOsRule, updateOsRule, deleteOsRule } from "@/lib/actions";
import type { OsRule } from "@/lib/types";

const RULE_TYPES = ["Escalation", "Scoring", "Gate Permission", "Scheduled Review", "Configuration"] as const;

const TYPE_TONE: Record<string, "red" | "purple" | "blue" | "green" | "neutral"> = {
  Escalation:         "red",
  Scoring:            "purple",
  "Gate Permission":  "blue",
  "Scheduled Review": "green",
  Configuration:      "neutral",
};

// ─── Create form ──────────────────────────────────────────────────────────────

function CreateRuleForm({ onClose }: { onClose: () => void }) {
  return (
    <Card>
      <p className="text-xs font-bold text-neutral-500 uppercase tracking-widest mb-3">New OS Rule</p>
      <form action={createOsRule} className="space-y-3">
        <div>
          <label className={labelClass}>Rule Name</label>
          <input name="rule_name" required className={inputClass} placeholder="e.g. Weekly Confidence Score Review" />
        </div>
        <div>
          <label className={labelClass}>Type</label>
          <select name="rule_type" required className={inputClass} defaultValue="">
            <option value="" disabled>— Select type —</option>
            {RULE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <div>
          <label className={labelClass}>Description</label>
          <textarea name="description" rows={4} className={inputClass}
            placeholder="What does this rule do? Claude reads this as its instruction during the weekly review." />
        </div>
        <div>
          <label className={labelClass}>Config JSON (optional)</label>
          <textarea name="config" rows={2} className={inputClass} defaultValue="{}" />
        </div>
        <div className="flex gap-2">
          <button type="submit" className={buttonClass}>Create Rule</button>
          <button type="button" onClick={onClose} className={buttonSecondaryClass}>Cancel</button>
        </div>
      </form>
    </Card>
  );
}

// ─── Edit form ────────────────────────────────────────────────────────────────

function EditRuleForm({ rule, onClose }: { rule: OsRule; onClose: () => void }) {
  const action = updateOsRule.bind(null, rule.id);
  return (
    <form action={action} className="space-y-3 mt-3">
      <div>
        <label className={labelClass}>Rule Name</label>
        <input name="rule_name" required className={inputClass} defaultValue={rule.rule_name} />
      </div>
      <div>
        <label className={labelClass}>Type</label>
        <select name="rule_type" required className={inputClass} defaultValue={rule.rule_type}>
          {RULE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
      </div>
      <div>
        <label className={labelClass}>Description</label>
        <textarea name="description" rows={4} className={inputClass} defaultValue={rule.description} />
      </div>
      <div>
        <label className={labelClass}>Config JSON</label>
        <textarea name="config" rows={2} className={inputClass}
          defaultValue={JSON.stringify(rule.config ?? {}, null, 2)} />
      </div>
      <div className="flex gap-2">
        <button type="submit" className={buttonClass}>Save</button>
        <button type="button" onClick={onClose} className={buttonSecondaryClass}>Cancel</button>
      </div>
    </form>
  );
}

// ─── Rule card ────────────────────────────────────────────────────────────────

function RuleCard({ rule }: { rule: OsRule }) {
  const [editing, setEditing] = useState(false);
  const toggleAction = toggleOsRule.bind(null, rule.id, !rule.active);
  const deleteAction = deleteOsRule.bind(null, rule.id);

  return (
    <Card>
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <h3 className="font-semibold text-neutral-900">{rule.rule_name}</h3>
            <Badge tone={TYPE_TONE[rule.rule_type]}>{rule.rule_type}</Badge>
            <Badge tone={rule.active ? "green" : "neutral"}>{rule.active ? "Active" : "Inactive"}</Badge>
          </div>
          {!editing && <p className="text-sm text-neutral-600 leading-relaxed">{rule.description}</p>}
          {!editing && Object.keys(rule.config ?? {}).length > 0 && (
            <pre className="mt-2 text-xs bg-neutral-50 border border-neutral-100 rounded p-2 overflow-x-auto text-neutral-500">
              {JSON.stringify(rule.config, null, 2)}
            </pre>
          )}
          {editing && <EditRuleForm rule={rule} onClose={() => setEditing(false)} />}
        </div>

        {!editing && (
          <div className="flex items-center gap-2 shrink-0 flex-wrap justify-end">
            <button onClick={() => setEditing(true)}
              className="text-xs text-neutral-400 hover:text-neutral-700 px-2 py-1">
              Edit
            </button>
            <form action={toggleAction}>
              <button type="submit" className={buttonSecondaryClass}>
                {rule.active ? "Deactivate" : "Activate"}
              </button>
            </form>
            <form action={deleteAction}
              onSubmit={(e) => { if (!confirm(`Delete "${rule.rule_name}"?`)) e.preventDefault(); }}>
              <button type="submit" className="text-xs text-red-500 hover:text-red-700 px-2 py-1">
                Delete
              </button>
            </form>
          </div>
        )}
      </div>
    </Card>
  );
}

// ─── Main export ──────────────────────────────────────────────────────────────

export function OsRulesClient({ rules, serverError }: { rules: OsRule[]; serverError?: string }) {
  const [showCreate, setShowCreate] = useState(false);

  const active   = rules.filter(r => r.active);
  const inactive = rules.filter(r => !r.active);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">OS Rules</h1>
          <p className="text-sm text-neutral-500 mt-1">
            The intelligence layer&apos;s brain — scoring rules, escalation rules, gate permissions,
            Claude&apos;s scheduled review instructions, and industry configuration.
          </p>
        </div>
        <button onClick={() => setShowCreate(v => !v)} className={buttonClass}>
          + New Rule
        </button>
      </div>

      <ErrorBanner message={serverError} />

      {showCreate && <CreateRuleForm onClose={() => setShowCreate(false)} />}

      {active.length > 0 && (
        <div className="space-y-3">
          <SectionTitle>Active ({active.length})</SectionTitle>
          {active.map(r => <RuleCard key={r.id} rule={r} />)}
        </div>
      )}

      {inactive.length > 0 && (
        <div className="space-y-3">
          <SectionTitle>Inactive ({inactive.length})</SectionTitle>
          {inactive.map(r => <RuleCard key={r.id} rule={r} />)}
        </div>
      )}

      {rules.length === 0 && !serverError && (
        <Card>
          <p className="text-sm text-neutral-500">
            No OS Rules configured yet. Create your first rule above.
          </p>
        </Card>
      )}
    </div>
  );
}
