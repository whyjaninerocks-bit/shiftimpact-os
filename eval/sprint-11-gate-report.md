# ShiftImpact OS — Sprint 11 Gate Report
Generated: 2026-08-05T08:40:32.522Z

## Layer 1 — Technical  |  15 PASS  0 FIXED  1 FAIL  3 NOTE
✔ [T1] INTERNAL ONLY: app/api/signal-report/route.ts: Marker present.
✔ [T1] INTERNAL ONLY: app/api/cross-channel-report/route.ts: Marker present.
✔ [T1] INTERNAL ONLY: app/api/behaviour-state/route.ts: Marker present.
✔ [T1] INTERNAL ONLY: app/api/brand-momentum/route.ts: Marker present.
◐ [T2] Admin client: app/api/signal-report/route.ts: Uses inline getSupabase() with SUPABASE_SERVICE_ROLE_KEY. Functionally correct. Standardise to createAdminClient() in Sprint 5 cleanup.
◐ [T2] Admin client: app/api/cross-channel-report/route.ts: Uses inline getSupabase() with SUPABASE_SERVICE_ROLE_KEY. Functionally correct. Standardise to createAdminClient() in Sprint 5 cleanup.
◐ [T2] Admin client: app/api/behaviour-state/route.ts: Uses inline getSupabase() with SUPABASE_SERVICE_ROLE_KEY. Functionally correct. Standardise to createAdminClient() in Sprint 5 cleanup.
✔ [T2] Admin client: app/api/brand-momentum/route.ts: Uses createAdminClient() wrapper.
✔ [T3] Portal boundary: app/api/signal-report/route.ts: No /portal/* imports.
✔ [T3] Portal boundary: app/api/cross-channel-report/route.ts: No /portal/* imports.
✔ [T3] Portal boundary: app/api/behaviour-state/route.ts: No /portal/* imports.
✔ [T3] Portal boundary: app/api/brand-momentum/route.ts: No /portal/* imports.
✔ [T4] Threshold leak: app/(os)/clients/[id]/_components/BrandMomentumSection.tsx: No internal scoring patterns in client component.
✘ [T4] Threshold leak: app/(os)/campaigns/[id]/_components/SignalIntelligenceSection.tsx: Pattern '_threshold_' found in client component — internal scoring data exposed.
   → REMEDY: Remove or move to server-side. Client components must never reference internal scoring constants.
✔ [T4] Threshold leak: app/(os)/campaigns/[id]/_components/ConsumerBehaviourSection.tsx: No internal scoring patterns in client component.
✔ [T4] Threshold leak: app/(os)/campaigns/[id]/_components/CrossChannelSection.tsx: No internal scoring patterns in client component.
✔ [T5] BMS: ai_read client exposure: ai_read correctly scoped to internal result card.
✔ [T5b] BMS: dimension_conflict_flag client exposure: dimension_conflict_flag not exposed in client component.
✔ [T6] BMS action: no redirect(): saveBrandMomentumInputs correctly uses revalidatePath() only.


## GATE STATUS: ✘ BLOCKED — resolve FAILs before closing sprint