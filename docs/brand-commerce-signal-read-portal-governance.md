# Brand-Commerce Signal Read — Portal Exposure Governance

**Status: Parked.** This is a governance decision only. No portal code, schema, or fetcher has been built or changed as part of this document. It exists so the exposure rules are settled and written down before anyone builds the client-facing surface, whenever that gets picked back up.

**What's live today, for context:**
- `brand_commerce_diagnostic` and `brand_commerce_diagnostic_sources` — append-only strategist diagnostics, internal only.
- `BrandCommerceDiagnosticSection.tsx` — internal authoring UI, campaign page only.
- `BrandCommerceSignalReadPreview.tsx` — internal Agency Preview (Stage A), campaign page only, smoke-tested.
- The client portal already renders a bare classification badge (`BrandCommerceBadge` in `app/portal/[id]/_components/CategorySignalSection.tsx`) sourced directly from `campaign_signal_maps.classification`, unconditionally, with no diagnostic backing it. That badge is unaffected by anything in this document and keeps working as-is.
- Nothing described below is wired into the portal. Demo Trial has one polished reviewed diagnostic, visible only in Agency Preview.

## 1. Exposure gate

All eight conditions must hold. This is AND logic, not best-effort — any single failure means nothing renders.

1. Latest reviewed diagnostic only (the newest row where `reviewed_at IS NOT NULL`, not the newest row overall — a newer unreviewed draft must never override a valid reviewed one).
2. `reviewed_at IS NOT NULL`.
3. `classification_at_diagnosis` is not null.
4. `classification_at_diagnosis` is not `not_classified`.
5. `classification_at_diagnosis` matches the current, live `campaign_signal_maps.classification`. Any mismatch (drift) suppresses the read entirely — see rule 10.
6. The diagnostic's own `evidence_confidence` is not `insufficient_evidence`.
7. At least one row exists in `brand_commerce_diagnostic_sources` for that diagnostic.
8. At least one of those source rows has `evidence_confidence` set to something other than `insufficient_evidence` or null.

A diagnostic with no sources, or sources that are all unconfirmed, is a strategist's opinion with nothing behind it. Rules 7 and 8 exist specifically to keep that out of a client's hands, not as a formality.

## 2. What portal must never show

- Draft or unreviewed diagnostics, under any condition.
- The classification drift warning. Agency Preview shows this internally on purpose; a client never sees it. Drift is handled by suppression (rule 5), not disclosure.
- Any "withheld because insufficient evidence" message, or equivalent internal-uncertainty language. If the gate fails, the read simply doesn't render. No placeholder, no explanation.
- Any status language implying a read is pending, forthcoming, or in progress.
- The authoring UI or Agency Preview themselves, in any form, on any portal route.

## 3. Client-safe display structure

When the gate passes, and only then, the following renders. Every value is either a direct field pass-through or a static lookup-table translation of one — nothing generated, summarized, or inferred at render time.

- **Headline**: "This campaign currently reads as {phrase}." — the same `CLASSIFICATION_READ_PHRASE` lookup table already written in `BrandCommerceSignalReadPreview.tsx`.
- **Classification phrase**: from that same lookup table.
- **Rationale**: `classification_rationale`, verbatim.
- **Evidence confidence line**: plain-language translation only —
  - `direct_evidence` → "Based on what we've directly observed."
  - `inference` → "Based on what the evidence suggests."
  - (`insufficient_evidence` never reaches this point — gate rule 6 already excluded it.)
- **What supports this read**: `source_title` + the same plain confidence label, one line per source. Nothing else per source.
- **What to strengthen next**: `proof_layer_notes`, `promotion_pressure_notes`, `brand_meaning_risk_notes`, verbatim, one line per non-empty field. The whole block is omitted if all three are empty — never shown as an empty section.

## 4. Explicit do-not-expose list

- Draft diagnostics
- Unreviewed diagnostics
- `source_note`
- `source_url`
- `source_type`
- Any internal row ID (diagnostic id, source id, campaign_signal_map id)
- `commerce_mechanic_description` as a raw field (it is not part of the client-safe structure in section 3 at all — not even reworded)
- `promotion_pressure_notes` as a raw field (only reaches the client inside "what to strengthen next," never displayed under its own label or elsewhere)
- `proof_layer_notes` as a raw field (same — "strengthen next" only)
- `brand_meaning_risk_notes` as a raw field (same — "strengthen next" only)
- The authoring UI
- Agency Preview

## 5. Build constraint, when this gets picked up

The fetcher must be a server-side function that applies the full section 1 gate and returns either `null` or a narrow, pre-shaped object matching section 3 exactly — headline phrase, rationale, confidence line, a list of `{title, confidence}` source pairs, and strengthen-next items. It must never return a raw diagnostic or source row to any client-rendered component, even one intended to filter fields itself. Client-side field hiding is not an acceptable substitute for a server-side shape. Model the fetcher name on the existing `getCulturalSignalReadClientSafe` convention already in `lib/data.ts` — something like `getBrandCommerceSignalReadClientSafe(campaignId)`.

No schema changes are required for this. Every field the client-safe structure needs already exists in `brand_commerce_diagnostic` and `brand_commerce_diagnostic_sources`.

## 6. Blockers before build

- `reviewed_by` is still null-only under the current no-login-wall v1 model. Before this reaches a real, paying client's portal (not Demo Trial), `reviewed_by` should be mandatory and tied to real session identity, once the "Lock it down" sprint happens. Reviewed-at-alone is acceptable for continued internal iteration, not for real client exposure.
- Only one reviewed diagnostic has ever existed at a time on Demo Trial, and only one classification value (`commerce_mover`) has been exercised. Before trusting the client-safe copy holds up across the full range of outcomes, write and Agency-Preview at least a few more reviewed diagnostics covering other classification values (`brand_builder`, `promo_extractor`, `brand_risk`, `inefficient_activity`, `conversion_blocked`) so the headline phrases and rationale tone get checked against something other than the one case built so far.
- This has only ever run against Demo Trial. No real client relationship has exercised any of this yet.

## 7. Status

Portal exposure for Brand-Commerce Signal Read is parked pending the blockers in section 6. The rules in sections 1 through 5 are the accepted governance for whenever it gets built — they do not need to be re-litigated at that point, only implemented.

Safe to mark portal exposure as parked: **yes.**
