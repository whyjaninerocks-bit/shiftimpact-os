# ShiftImpact OS — Signal Credentials & Market Intelligence

This folder contains the evidential foundation for every signal ShiftImpact OS uses. Each document defends the signal's validity in the Malaysian market with real data sources, explains the measurement logic, and flags calibration caveats honestly.

Use these documents for: client onboarding briefings, investor/partner Q&A, methodology defense, and internal product rationale.

---

## Signal Credentials

| File | Signal | Gate Threshold | Status |
|---|---|---|---|
| [signal-S1-save-rate.md](signal-S1-save-rate.md) | Save Rate (TikTok/Instagram) | 8% save-to-impression ratio | Live |
| [signal-S2-ugc.md](signal-S2-ugc.md) | UGC Volume & Growth | 65 pieces at Day 30, growing MoM | Live |
| [signal-S3-brand-search.md](signal-S3-brand-search.md) | Brand Search Lift | 18% lift vs pre-campaign baseline | Live |
| [signal-S4-grab-ads.md](signal-S4-grab-ads.md) | GrabAds Conversion | Add-to-cart rate (TBD at activation) | Deferred |

---

## Winning Strategies (Locked)

| File | Topic |
|---|---|
| [winning-strategy-wa.md](winning-strategy-wa.md) | **WA Dark Loop** — proprietary methodology, competitive moat, client positioning, signal echo reading |
| [winning-strategy-ai-discovery.md](winning-strategy-ai-discovery.md) | **AI Brand Discovery** — first-mover ASEAN position, F23 four components, WA→UGC→AI chain |

## Operational Intelligence

| File | Topic |
|---|---|
| [dark-social-wa-strategy.md](dark-social-wa-strategy.md) | WhatsApp dark social — fuelling and reading it without vendor contracts |
| [wa-signal-ruling.md](wa-signal-ruling.md) | **Binding ruling** — WA tactic by phase, trigger condition, signal target, anti-spam guardrails |

## Signal Infrastructure

| File | Topic |
|---|---|
| [signal-source-audit.md](signal-source-audit.md) | **Audit report** — what is tracked (Apify live, open source, manual), what is missing, recommended connectors by priority (August 2026) |

---

## Signal logic at a glance

**Lead signals** (fire before purchase):
- S1 Save Rate — Week 3–5, measures deferred intent
- S4 GrabAds — Week 4–8, measures active conversion (when live)

**Lag signals** (confirm prior stage success):
- S2 UGC — Week 4+, confirms brand has achieved cultural salience
- S3 Brand Search — Week 5–6, confirms social exposure has driven active inquiry

**The cascade the OS reads:**
Save Rate ↑ (Week 3) → UGC growth (Week 4) → Brand Search ↑ (Week 5–6) → Retail velocity ↑ (Week 6–8)

If any step in the cascade fails to fire, the OS identifies which signal broke and diagnoses the likely cause (brief compliance, wrong audience, wrong format, distribution gap).

---

## Malaysian market baseline data

| Metric | Figure | Source |
|---|---|---|
| Social media users (MY) | 30.7M / 85% population | DataReportal 2025 |
| TikTok monthly active users (MY) | 18.5M | UnRavel Digital 2025 |
| TikTok monthly time per user | 38h 49m | Meltwater 2024 |
| WhatsApp monthly reach | 90.7% | Meltwater 2024 |
| Malaysians who follow food accounts | 35.2% | Meltwater 2024 |
| Malaysians who research before buying | 62.9% | Meltwater 2024 |
| Brand discovery via social media | 40.1% | Meltwater 2024 |
| SEA content commerce GMV share | 32% ($49.7B) | UnRavel Digital 2025 |
| Comments declined on TikTok (2025) | -24% | IQFluence 2026 |
| Instagram shares per reach growth | +150% (2025) | IQFluence 2026 |
| GrabAds revenue YoY growth | +60% to $176M | Grab 2024 |
| Malaysians who switched brands (2026) | 83% | Accio 2026 |

---

## Calibration status

| Signal | Calibration basis | Recalibration trigger |
|---|---|---|
| Save Rate 8% | ShiftImpact OS campaign baseline | After 3 campaigns per food category |
| UGC 65 pieces | Cooks campaign calibration | After 3 food/FMCG campaigns |
| Brand Search 18% | Derived from Google Search Console + TikTok search data | After 3 campaigns |
| GrabAds | Not yet calibrated | At first live client activation |
