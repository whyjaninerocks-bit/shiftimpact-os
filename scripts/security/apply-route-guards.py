#!/usr/bin/env python3
"""One-off codemod for Security remediation step 2 (8 Oct 2026).

Inserts a guard as the first statement of each exported route handler.
Idempotent: skips a handler whose body already starts with the guard.
Usage: python3 scripts/security/apply-route-guards.py
"""
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
API = ROOT / "app" / "api"
IMPORT_PATH = "@/lib/auth/require-session"

INTERNAL = """ai-brand-visibility audit-analyze audit-fetch behaviour-state brand-momentum brief-extract
campaign-digest campaign-report-generate channel-briefs/generate clarity-signal consumer-pulse/trigger
consumer-state-transition cross-channel-report cultural-signals cultural-signals/[id]/handoff dba-correlation
diagnostic-session/generate frame-prefill generate-extension intelligence-query iq-evaluate market-discover
prospect-assess prospect-enrich prospect-outreach prospect-pursue prospect-scan review-platform signal-health
signal-movement signal-report social-currency stage-brief-autodraft
prospect-companies prospect-people prospect-outreach/[id] prospect-scores prospect-signals prospect-suppression
audit-context/[id] brand-assets brand-momentum/suggest brief-save budget-movements budget-movements/[id]
campaigns/[id]/review cascade-detection client-channels/[id] cultural-signals/[id] data-preferences
diagnostic-session digest-decision digest-summary ga5-benchmarks kol-trackers kol-trackers/[id] mdh-report
prediction-accuracy prediction-accuracy/[id] prediction-reconcile prediction-snapshot review/context
signal-context/[id] signal-movement/stage-brief signal-sources/[id] stage-brief-autodraft/promote
window-alerts/[id]/dismiss""".split()

ADMIN = "os-settings upload mdh-import orchestrate decide-insights signal-sources/seed".split()

DISABLED = {
    "detect-windows-backfill": "One-time backfill, already run. Removed by Security remediation 8 Oct 2026.",
    "dsem": "dark_social_readings table does not exist in the live database. Deprecated 8 Oct 2026.",
    "growth-sprints": "Growth Sprint is dormant until a pilot requires migration 0067.",
    "growth-sprints/[id]": "Growth Sprint is dormant until a pilot requires migration 0067.",
    "growth-sprints/[id]/approve": "Growth Sprint is dormant until a pilot requires migration 0067.",
    "growth-sprints/[id]/diagnose": "Growth Sprint is dormant until a pilot requires migration 0067.",
    "growth-sprints/[id]/publish": "Growth Sprint is dormant until a pilot requires migration 0067.",
    "growth-sprints/[id]/recommend": "Growth Sprint is dormant until a pilot requires migration 0067.",
    "growth-sprints/[id]/revoke": "Growth Sprint is dormant until a pilot requires migration 0067.",
    "stripe/checkout": "No ShiftImpact product is sold through Stripe; purchases table does not exist.",
    "stripe/portal": "No ShiftImpact product is sold through Stripe; purchases table does not exist.",
}

# Only these methods get the admin guard on widget-lead (POST/PATCH stay public).
METHOD_SPECIFIC = {"widget-lead": ("ADMIN", {"GET"})}

UPGRADE = """campaign-report/[id]/publish-to-portal campaign-report/[id]/release-to-client
campaign-report/[id]/save-agency-note campaign-report/[id]/send-agency-preview client-report-recipients
client-report-recipients/[id] portal-access/[campaignId]/revoke""".split()

HANDLER = re.compile(
    r"export\s+(?:async\s+)?function\s+(GET|POST|PUT|PATCH|DELETE)\s*\((?:[^()]|\([^()]*\))*\)[^{;]*\{",
    re.S,
)


def guard_line(kind: str, reason: str | None = None) -> str:
    if kind == "INTERNAL":
        return "\n  const authError = await requireShiftImpactSession();\n  if (authError) return authError;\n"
    if kind == "ADMIN":
        return "\n  const adminError = await requireShiftImpactAdmin();\n  if (adminError) return adminError;\n"
    if kind == "DISABLED":
        return f"\n  return routeDisabled({reason!r});\n".replace("'", '"')
    raise ValueError(kind)


def ensure_import(src: str, names: list[str]) -> str:
    m = re.search(r'import\s*\{([^}]*)\}\s*from\s*"@/lib/auth/require-session";', src)
    if m:
        have = {n.strip() for n in m.group(1).split(",") if n.strip()}
        new = sorted(have | set(names))
        return src[: m.start()] + f'import {{ {", ".join(new)} }} from "{IMPORT_PATH}";' + src[m.end():]
    # insert after the last import statement
    imports = list(re.finditer(r'^import[^;]*;\s*$', src, re.M))
    line = f'import {{ {", ".join(sorted(names))} }} from "{IMPORT_PATH}";\n'
    if imports:
        end = imports[-1].end()
        return src[:end] + "\n" + line + src[end:]
    return line + src


def apply(route: str, kind: str, methods: set[str] | None = None, reason: str | None = None) -> int:
    f = API / route / "route.ts"
    src = f.read_text()
    marker = {"INTERNAL": "requireShiftImpactSession()", "ADMIN": "requireShiftImpactAdmin()", "DISABLED": "routeDisabled("}[kind]
    out, last, n = [], 0, 0
    for m in HANDLER.finditer(src):
        if methods and m.group(1) not in methods:
            continue
        nxt = src[m.end(): m.end() + 160]
        if marker in nxt:
            continue
        out.append(src[last: m.end()])
        out.append(guard_line(kind, reason))
        last = m.end()
        n += 1
    if n == 0:
        return 0
    out.append(src[last:])
    src = "".join(out)
    name = {"INTERNAL": "requireShiftImpactSession", "ADMIN": "requireShiftImpactAdmin", "DISABLED": "routeDisabled"}[kind]
    src = ensure_import(src, [name])
    f.write_text(src)
    return n


def upgrade(route: str) -> int:
    f = API / route / "route.ts"
    src = f.read_text()
    new = re.sub(r"\brequireSession\(\)", "requireShiftImpactSession()", src)
    new = re.sub(r"(import\s*\{[^}]*?)\brequireSession\b([^}]*\}\s*from\s*\"@/lib/auth/require-session\")",
                 r"\1requireShiftImpactSession\2", new)
    if new != src:
        f.write_text(new)
        return 1
    return 0


if __name__ == "__main__":
    total = {}
    for r in INTERNAL:
        total[r] = ("INTERNAL", apply(r, "INTERNAL"))
    for r in ADMIN:
        total[r] = ("ADMIN", apply(r, "ADMIN"))
    for r, (kind, methods) in METHOD_SPECIFIC.items():
        total[r + " (GET)"] = (kind, apply(r, kind, methods))
    for r, reason in DISABLED.items():
        total[r] = ("DISABLED", apply(r, "DISABLED", reason=reason))
    for r in UPGRADE:
        total[r] = ("UPGRADE", upgrade(r))
    for r, (k, n) in total.items():
        print(f"{k:9} {n:2}  {r}")
    print("routes touched:", sum(1 for k, n in total.values() if n))
