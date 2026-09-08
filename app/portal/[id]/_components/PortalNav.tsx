"use client";

import { useEffect, useState } from "react";
import type { GateSignalStatus } from "@/lib/types";
import { HealthRing, StatusPill, POSTURE_DOT } from "./reportUi";

// ─── Portal nav shell ─────────────────────────────────────────────────────────
// Desktop: a persistent dark left sidebar (logo, Brand/Agency/Partner view
// switcher, health-score ring, section jump-nav with scrollspy, report-history
// week picker) — matching the sales demo's app-shell pattern. Mobile: the
// sidebar collapses into a compact view-tab row + a sticky horizontal
// scrollable section-pill bar, mirroring how the demo adapts on small
// screens. Client component only for the interactive bits (scrollspy,
// current-view highlighting); all data is passed in from the server-rendered
// page.tsx, which already fetched everything client-safe.

type PortalView = "brand" | "agency" | "partner";

export type NavSection = { id: string; label: string; group?: string };
export type NavWeek = { week_number: number; risk_posture: string | null };

const VIEWS: { key: PortalView; label: string }[] = [
  { key: "brand", label: "Brand" },
  { key: "agency", label: "Agency" },
  { key: "partner", label: "Partner" },
];

// Buckets sections by their `group` field, preserving first-seen order —
// ungrouped sections (no `group` set) fall into their own unlabeled bucket
// rather than being dropped, so this degrades gracefully for any caller that
// doesn't pass groups (e.g. if PortalNav is ever reused elsewhere).
function groupSections(sections: NavSection[]): { group: string | null; items: NavSection[] }[] {
  const order: (string | null)[] = [];
  const buckets = new Map<string | null, NavSection[]>();
  for (const s of sections) {
    const key = s.group ?? null;
    if (!buckets.has(key)) {
      buckets.set(key, []);
      order.push(key);
    }
    buckets.get(key)!.push(s);
  }
  return order.map((group) => ({ group, items: buckets.get(group)! }));
}

function viewHref(campaignId: string, view: PortalView, portalToken?: string) {
  const params = new URLSearchParams();
  if (view !== "brand") params.set("view", view);
  if (portalToken) params.set("t", portalToken);
  const qs = params.toString();
  return `/portal/${campaignId}${qs ? `?${qs}` : ""}`;
}

export function PortalNav({
  campaignId,
  currentView,
  portalToken,
  clientName,
  campaignName,
  healthScore,
  gateSignalStatus,
  posture,
  sections,
  weeks,
}: {
  campaignId: string;
  currentView: PortalView;
  portalToken?: string;
  clientName: string;
  campaignName: string;
  healthScore: number;
  gateSignalStatus: GateSignalStatus;
  posture: string | null;
  sections: NavSection[];
  weeks: NavWeek[];
}) {
  const [activeId, setActiveId] = useState<string | null>(sections[0]?.id ?? null);

  useEffect(() => {
    const elements = sections
      .map((s) => document.getElementById(s.id))
      .filter((el): el is HTMLElement => !!el);
    if (elements.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((e) => e.isIntersecting);
        if (visible.length > 0) {
          setActiveId(visible[0].target.id);
        }
      },
      { rootMargin: "-15% 0px -70% 0px", threshold: 0 }
    );
    elements.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <>
      {/* ── Desktop sidebar ── */}
      <aside className="hidden lg:flex lg:flex-col lg:w-[470px] xl:w-[540px] lg:shrink-0 lg:sticky lg:top-0 lg:h-screen lg:overflow-y-auto bg-neutral-900 text-white">
        <div className="p-5 border-b border-white/10">
          <span className="font-bold text-sm tracking-tight">
            ShiftImpact <span className="text-neutral-500 font-normal">OS</span>
          </span>
          <p className="text-[11px] text-neutral-400 mt-3">{clientName}</p>
          <p className="text-sm font-semibold truncate">{campaignName}</p>
        </div>

        <div className="p-4 border-b border-white/10 flex gap-1">
          {VIEWS.map((v) => (
            <a
              key={v.key}
              href={viewHref(campaignId, v.key, portalToken)}
              className={`flex-1 text-center text-[11px] font-semibold px-2 py-1.5 rounded-lg transition-colors ${
                currentView === v.key
                  ? "bg-white text-neutral-900"
                  : "text-neutral-400 hover:text-white hover:bg-white/5"
              }`}
            >
              {v.label}
            </a>
          ))}
        </div>

        <div className="p-5 border-b border-white/10 flex items-center gap-3">
          <HealthRing value={healthScore} gateSignalStatus={gateSignalStatus} size={56} />
          <div className="min-w-0">
            <StatusPill status={gateSignalStatus} />
            {posture && (
              <p className="text-[11px] text-neutral-400 mt-1.5 flex items-center gap-1.5">
                <span className={`w-1.5 h-1.5 rounded-full ${POSTURE_DOT[posture] ?? "bg-neutral-500"}`} />
                {posture}
              </p>
            )}
          </div>
        </div>

        <nav className="p-3 flex-1 overflow-y-auto">
          {groupSections(sections).map(({ group, items }) => (
            <div key={group} className="mb-3 last:mb-0">
              {group && (
                <p className="px-3 pt-2 pb-1 text-[10px] font-bold uppercase tracking-widest text-neutral-600">
                  {group}
                </p>
              )}
              {items.map((s) => (
                <a
                  key={s.id}
                  href={`#${s.id}`}
                  className={`block text-sm px-3 py-2 rounded-lg transition-colors ${
                    activeId === s.id
                      ? "bg-white/10 text-white font-semibold"
                      : "text-neutral-400 hover:text-white hover:bg-white/5"
                  }`}
                >
                  {s.label}
                </a>
              ))}
            </div>
          ))}
        </nav>

        {weeks.length > 0 && (
          <div className="p-3 border-t border-white/10">
            <p className="text-[10px] font-bold uppercase tracking-widest text-neutral-500 px-3 mb-2">
              Report history
            </p>
            <div className="space-y-0.5">
              {[...weeks].reverse().map((w) => (
                <a
                  key={w.week_number}
                  href="#report-history"
                  className="flex items-center gap-2 px-3 py-1 text-xs text-neutral-400 hover:text-white transition-colors"
                >
                  <span
                    className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                      w.risk_posture ? POSTURE_DOT[w.risk_posture] ?? "bg-neutral-600" : "bg-neutral-600"
                    }`}
                  />
                  Week {w.week_number}
                </a>
              ))}
            </div>
          </div>
        )}
      </aside>

      {/* ── Mobile nav ── */}
      <div className="lg:hidden">
        <div className="flex gap-1 px-4 pt-3 pb-2 bg-white border-b border-neutral-100">
          {VIEWS.map((v) => (
            <a
              key={v.key}
              href={viewHref(campaignId, v.key, portalToken)}
              className={`flex-1 text-center text-[11px] font-semibold px-2 py-1.5 rounded-lg transition-colors ${
                currentView === v.key
                  ? "bg-neutral-900 text-white"
                  : "text-neutral-500 bg-neutral-50"
              }`}
            >
              {v.label}
            </a>
          ))}
        </div>
        <div className="sticky top-0 z-20 bg-white/95 backdrop-blur border-b border-neutral-200 overflow-x-auto">
          <div className="flex gap-1.5 px-4 py-2 whitespace-nowrap">
            {sections.map((s) => (
              <a
                key={s.id}
                href={`#${s.id}`}
                className={`shrink-0 text-[11px] font-semibold px-2.5 py-1 rounded-full border transition-colors ${
                  activeId === s.id
                    ? "bg-neutral-900 text-white border-neutral-900"
                    : "text-neutral-500 border-neutral-200"
                }`}
              >
                {s.label}
              </a>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
