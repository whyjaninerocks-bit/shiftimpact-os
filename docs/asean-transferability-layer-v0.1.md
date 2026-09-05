# ASEAN Transferability Layer v0.1

**Status:** Analysis only. No code changes, no migrations, no `kb_grounded` change, nothing wired into IQ Evaluate. Pending Janine's explicit review before any build step.
**Source of truth:** the corrected KB bank as it stands on 5 September 2026 — 26 case studies, 12 effectiveness formulas, all `market_code = 'MY'`, all `verification_status` at best `Partially Verified` (one, Telekom Unibizity, is `Unverified Claim`), all `causal_confidence` at `Low` or `Not Claimable`. GPT's earlier unverified numbers (CelcomDigi Fibre, HOMESOY's specific screening count, SAFI's preference-rank shift, RWG CEO 2.0's booking/ROAS figures, Dapur Goodday's UGC/PR figures, Sime Darby's "homebuyer hunt" figures) remain excluded and are not reintroduced anywhere below.

---

## 1. Executive Summary

**What the corrected KB bank can support.** It can support a first-pass *structural* hypothesis layer — a set of 12 named patterns describing how Malaysian campaigns tend to be built when they work, each traceable to specific, named cases with stated confidence levels. It can support asking better diagnostic questions in FRAME/BIP (see Sections 8–9). It cannot yet support any claim that a formula "works" in a causal, provable sense, anywhere — including in Malaysia.

**What it cannot support yet.** Three structural weaknesses matter more than any individual market's cultural distance:

1. **Zero non-Malaysia evidence.** All 26 cases are Malaysian. There is no ASEAN case in this KB. Every transferability judgment below is a structural inference about a market ShiftImpact OS has not yet evidenced — not a finding.
2. **Case concentration.** 12 formulas sound like broad coverage, but several share the *same* underlying cases. HOMESOY and the Urological Cancer Trust Fund case are the entire evidence base for both FORM-003 and FORM-007. Resorts World Genting's two campaigns are the entire evidence base for FORM-005, and RWG CEO 2.0 is *also* cited under FORM-010. Wonda's "world's longest magazine" case backs both `my-formula-idea-is-the-media` and the stunt/record formula. Stripped of double-counting, roughly 9 genuinely distinct underlying cases carry 12 formulas' worth of claims.
3. **No formula has a measured business result behind it.** Every case's `causal_confidence` is `Low` or `Not Claimable`. Several formulas — FORM-008 in particular — have zero cases where `result_confidence` is anything but `Not Stated`. "AI Utility + Measurable Movement" currently has no case with a measured movement.

**Formulas that look most transferable (as structure, not as result).** FORM-001 (Culture Must Move Action), FORM-003 (Trust Gap + Proof Before Trial), FORM-007 (Purpose With Operating Proof), and `my-formula-idea-is-the-media` (The Idea Is the Media) rest on the most category-agnostic mechanics and the least Malaysia-specific reasoning chains. These are worth cautious testing first.

**Formulas that are most culturally fragile.** FORM-001 and the Mirinda/Aiken cases behind it are Chinese-Malaysian- and Raya-specific almost to the line-item level (Stephen Chow, Astro Shaw's "The Experts," CNY timing). FORM-002's strongest case (RHB's `#JomSapot BeliLokal`) is anchored to a specific Malaysian minimum-wage/SME cost shock. Both patterns may transfer as *structure* but their *proof texture* is entirely Malaysian.

**Formulas too weakly evidenced to transfer anywhere yet.** FORM-009 (Creator as Trust Bridge, 0 cases), FORM-006 (Data-as-Intervention, 1 case, mechanic itself unconfirmed), FORM-004 (Role-Changing Participation, 1 case), FORM-005 (Story Survives Checkout, 2 cases, same brand). These should stay hypothesis-only everywhere, including Malaysia.

**Which market should be studied next.** Indonesia — reasoning in Section 12 — but only for category/behaviour-chain research, not for assuming any Malaysian pattern already applies.

**What evidence is needed before transfer can become KB-grounded.** At minimum: (a) real, locally-sourced case studies from at least one other ASEAN market per formula being tested, (b) at least one case per formula with an actual measured business result (not just an award win), (c) independent (non-brand-self-reported) verification for at least a subset of cases, (d) a local proof-standard check per market (Section 3, Section 11) before any Result or Causal Confidence field is allowed to move.

---

## 2. Formula Confidence Review

| formula_id | formula_name | current_confidence_level | verification_status | case_support_count | strongest_supporting_cases | weakest_evidence_gap | transfer_readiness |
|---|---|---|---|---|---|---|---|
| FORM-001-culture-must-move-action | Culture Must Move Action | Medium | Partially Verified | 3 claimed / **2 with a full case_studies row** (Aiken CNY Glow-Up, Mirinda X The Experts); Watsons Gaya Raya Luar Biasa is referenced only in formula text, not stored as its own row | Aiken CNY Glow-Up (High evidence, real stated targets); Mirinda X The Experts (High evidence, real competitive-price context) | Neither backing case has a stated final result — Aiken's targets are "surpassed" but not requantified, Mirinda's "record-breaking purchases" is unquantified | Needs more local evidence first |
| FORM-002-category-enemy-easier-switch | Category Enemy + Easier Switch | Low | Partially Verified | 2 claimed / **1 with a full case_studies row** (`#JomSapot BeliLokal`); Wonda's International Wonda Coffee Day is referenced only in formula text, not stored as its own row | `#JomSapot BeliLokal` (High evidence, real 14% YoY new-customer figure, brand-reported) | Only one real backing row; the "easier switch" half of the pattern (friction removal) is thinly evidenced — the RHB case is closer to a value-exchange/purpose story than a classic switching-cost story | Needs more local evidence first |
| FORM-003-trust-gap-proof-before-trial | Trust Gap + Proof Before Trial | Medium | Partially Verified | 2 (HOMESOY Stop That Dot; Urological Cancer Trust Fund) | Urological Cancer Trust Fund (Medium result_confidence, real RM2mil PR figure from the award title itself) | HOMESOY's actual screening volume is unconfirmed; Urological Cancer case was only read at winner-list depth, not full case text | Ready for cautious transfer testing (merge-watch vs FORM-007 — see note below) |
| FORM-004-role-changing-participation | Role-Changing Participation | Low | Partially Verified | 1 (Goodday Charge / Team eMAS) | Goodday Charge (Medium evidence, real independently-confirmed participation numbers: 298 applicants, 10 shortlisted) | Single case; no sales/brand-lift figure at all, only participation numbers | Keep as hypothesis only |
| FORM-005-story-survives-checkout | Story Survives Checkout | Low | Partially Verified | 2, but both are the **same brand** (RWG Verified By Kids; RWG CEO 2.0 — a direct sequel) | RWG Verified By Kids (High evidence, High result_confidence, real PR-reach figure) | No independent second brand; this is one campaign's two phases, not two proof points | Needs more local evidence first |
| FORM-006-data-as-intervention | Data-as-Intervention | Low | Partially Verified | 1 (AIA #OneMoreHour) | AIA (Medium evidence for the broader tool/rewards mechanic) | The specific claimed mechanic (real-time programmatic bid-request targeting) could not be verified at all — only the general "sleep tracking in an existing app" fact is confirmed | Do not transfer yet |
| FORM-007-purpose-with-operating-proof | Purpose With Operating Proof | Medium | Partially Verified | 2 — **identical case pair to FORM-003** (HOMESOY; Urological Cancer Trust Fund) | Same as FORM-003 | This formula and FORM-003 are not yet evidenced as distinct patterns — they currently rest on the same two cases | Needs more local evidence first (merge-watch vs FORM-003 — see note below) |
| FORM-008-ai-utility-measurable-movement | AI Utility + Measurable Movement | Medium | Partially Verified | 2 (SAFI AI Dream Generator; Fly FM AI Radio DJ) | SAFI (Medium evidence, real scholarship-fund mechanic confirmed) | **Neither case has a measured result** — both are `result_confidence: Not Stated`. The formula name promises "measurable movement" that no case in the bank currently demonstrates | Keep as hypothesis only |
| FORM-009-creator-as-trust-bridge | Creator as Trust Bridge | Low | Partially Verified (no case rows) | **0** | None | No independently-confirmed case isolates a creator-as-trust-bridge mechanism distinct from testimonial (HOMESOY) or AI-personalisation (SAFI) devices | Do not transfer yet |
| FORM-010-platform-native-funnel | Platform-Native Funnel | Medium | Partially Verified | 2 (Dapur Goodday Ramadan; RWG CEO 2.0 — **RWG CEO 2.0 is now shared with FORM-005**) | Dapur Goodday (Medium evidence, confirmed real "watch today, buy tomorrow" mechanic + a real season-2 renewal) | Neither case has a quantified funnel-stage conversion number | Needs more local evidence first |
| my-formula-idea-is-the-media | The Idea Is the Media | Low | Partially Verified | 3 (Pizza Hut Genshin Impact; Heineken Heidden in Plain Sight; Wonda's World's Longest Magazine — **Wonda is shared with the stunt/record formula**) | Wonda (High evidence, High result_confidence, real RM3.5mil PR + 10% sales figure) | All three cases are brand-self-reported with `causal_confidence: Low`; no independent audit of any figure | Ready for cautious transfer testing |
| my-formula-stunt-record-earned-pr-multiplier | Stunt/Record Mechanic as Earned-PR Multiplier | Low | Partially Verified | 4 (Mountain Dew PUBG; Wonda magazine — **shared**; RWG Verified By Kids — **shared with FORM-005**; #JanganKenaScam) | #JanganKenaScam (High evidence, High result_confidence, real independently-meaningful behavioural signal — NSRC calls, BNM reports) | Mountain Dew's own title claims "record sales" with zero number attached; two of the four cases are reused from other formulas | Needs more local evidence first |

**Working distinction — FORM-003 vs FORM-007 (merge-watch).** Both formulas currently rest on the identical two-case evidence base (HOMESOY Stop That Dot; Urological Cancer Trust Fund), so they cannot yet be shown to behave as genuinely separate patterns. Until a case exists that satisfies one definition without the other, hold them apart only by this working definition, and treat both as **merge-watch**:
- **FORM-003 (Trust Gap + Proof Before Trial)** = a trust gap or fear is named and a specific friction is removed *before an individual's own trial, purchase, or screening decision* — the unit of proof is one person's action.
- **FORM-007 (Purpose With Operating Proof)** = a purpose or social-issue claim is backed by a real *operating action system* (money committed, partnerships built, infrastructure stood up) — the unit of proof is the brand's own operational commitment, independent of whether any individual trial behaviour moved as a result.
- **What would prove them distinct:** a case that satisfies FORM-003 without FORM-007 (e.g. a trust-gap/trial case with no underlying operating-commitment story) or FORM-007 without FORM-003 (e.g. a purpose campaign with real operating proof but no individual-trial mechanic at all). Neither exists in the bank yet.
- **What this means for transfer:** do not test these as two independent formulas in a new market. Treat any transfer test as testing one combined pattern until local evidence separates them.

**Reading this table honestly:** only FORM-003 and `my-formula-idea-is-the-media` clear the bar for "ready for cautious transfer testing" — and even those are structure-only, proof-standard-pending. Everything else needs more Malaysian evidence before it should even be tested abroad, let alone treated as proven.

---

## 3. Transferability Matrix

Scale definitions used throughout: `transferability_score` = High/Medium/Low/Not Tested (structural judgment about whether the *pattern shape* is likely to hold, not a finding). `market_confidence` = High/Medium/Low (how much we trust this specific judgment). `verification_status` = Source-supported/Inference/Hypothesis/Not Tested/Not Claimable. Per Janine's instruction, the KB has **zero cases outside Malaysia**, so `verification_status` is `Not Tested` for every non-Malaysia cell below without exception — the variation across rows is in the qualitative transferability judgment and market_confidence only, never in claimed evidence.

### FORM-001 — Culture Must Move Action

| Market | transferability_score | market_confidence | reason | verification_status |
|---|---|---|---|---|
| Malaysia | Medium | Medium | 2 real cases, both real business pressure, neither with a stated final result | Source-supported |
| Indonesia | Medium | Low | Ramadan/Lebaran commercial pressure is a real, comparable structure, but the specific Malaysian-Chinese cultural anchors (Stephen Chow, CNY) do not map at all — Indonesia's own festive codes must be independently researched | Not Tested |
| Thailand | Low | Low | Thai festive/cultural calendar (Songkran, royal calendar sensitivities) is structurally different; the "named competitive pressure" half of the formula is plausible but untested | Not Tested |
| Vietnam | Low | Low | Tet is a comparable commercial pressure-point structurally, but political/regulatory sensitivity around cultural messaging in Vietnam is a real, distinct risk not present in the Malaysian cases | Not Tested |
| Philippines | Medium | Low | Fiesta culture and strong Catholic-calendar commercial peaks are structurally similar to Malaysia's festive-commerce pattern; language/humour still needs independent validation | Not Tested |
| Singapore | Low | Low | Singapore's more secular, multi-racial commercial calendar and higher ad-effectiveness scrutiny make a "borrowed nostalgia" device a harder sell without a very different proof standard | Not Tested |

### FORM-002 — Category Enemy + Easier Switch

| Market | transferability_score | market_confidence | reason | verification_status |
|---|---|---|---|---|
| Malaysia | Low | Low | Only 1 real backing case; even that case is more purpose-exchange than classic switching-cost story | Source-supported |
| Indonesia | Medium | Low | Large, fragmented SME base facing real cost pressures is structurally similar to the RHB case; friction points (which "switch" is being made easier) need local financial-services research | Not Tested |
| Thailand | Low | Low | Category-enemy framing needs to be checked against Thai politeness/hierarchy norms — direct competitive naming may read as more aggressive than in Malaysia | Not Tested |
| Vietnam | Medium | Low | Fast-growing, price-sensitive SME/consumer market; structurally plausible, but no source basis yet | Not Tested |
| Philippines | Medium | Low | Similarly price-sensitive, community-oriented market; plausible but untested | Not Tested |
| Singapore | Low | Low | More mature, less price-elastic categories generally; the "category enemy" framing may need to be far more subtle | Not Tested |

### FORM-003 — Trust Gap + Proof Before Trial

| Market | transferability_score | market_confidence | reason | verification_status |
|---|---|---|---|---|
| Malaysia | Medium | Medium | 2 real cases, one with a real stated PR-value figure; genuine health-behaviour mechanic | Source-supported |
| Indonesia | Medium | Low | Health-screening stigma is a documented, real barrier in Indonesia too, but the specific partner-network/incentive structure (hospital partnerships) needs independent local mapping | Not Tested |
| Thailand | Medium | Low | Thailand has a comparable health-screening stigma literature; structurally plausible | Not Tested |
| Vietnam | Low | Low | Healthcare access/infrastructure differences make the "partner hospital network" mechanic harder to assume transfers cleanly | Not Tested |
| Philippines | Medium | Low | Community/family-oriented health decision-making is structurally comparable; plausible | Not Tested |
| Singapore | Medium | Medium | Higher healthcare-system maturity may make the "friction removal" half of the formula easier to execute, but the "fear/stigma" half may look different in a more clinical, higher-trust healthcare culture | Not Tested |

### FORM-004 — Role-Changing Participation

| Market | transferability_score | market_confidence | reason | verification_status |
|---|---|---|---|---|
| Malaysia | Low | Low | Single case; no business result | Source-supported |
| Indonesia | Low | Low | Plausible structurally (large youth/senior demographic contrast) but zero basis to judge cultural fit | Not Tested |
| Thailand | Not Tested | Low | No structural reasoning developed yet | Not Tested |
| Vietnam | Not Tested | Low | No structural reasoning developed yet | Not Tested |
| Philippines | Medium | Low | Strong community/participation culture (fiestas, barangay-level activities) is a plausible fit for a "recruit the sceptic" mechanic | Not Tested |
| Singapore | Low | Low | Smaller population, different demographic-inclusion narratives; unclear fit | Not Tested |

### FORM-005 — Story Survives Checkout

| Market | transferability_score | market_confidence | reason | verification_status |
|---|---|---|---|---|
| Malaysia | Low | Low | Only one brand (RWG) across two phases — not independently replicated even in Malaysia | Source-supported |
| Indonesia | Medium | Low | Large, OTA/marketplace-driven travel-booking behaviour (Traveloka, Tiket.com) is structurally similar to the Klook-dependency problem RWG solved | Not Tested |
| Thailand | Medium | Low | Mature OTA-driven tourism market; structurally plausible | Not Tested |
| Vietnam | Medium | Low | Fast-growing OTA/travel-app usage; plausible but untested | Not Tested |
| Philippines | Medium | Low | Comparable OTA dependency in travel/leisure booking | Not Tested |
| Singapore | Medium | Low | High OTA/app sophistication; the "story surviving checkout" test may be even more relevant given higher digital-booking maturity | Not Tested |

### FORM-006 — Data-as-Intervention

| Market | transferability_score | market_confidence | reason | verification_status |
|---|---|---|---|---|
| Malaysia | Low | Low | Single case, and its core claimed mechanic (real-time targeting) is itself unverified | Source-supported |
| Indonesia | Not Tested | Low | No structural basis to assess yet — data-privacy/programmatic-infrastructure maturity likely differs significantly | Not Tested |
| Thailand | Not Tested | Low | Same caveat | Not Tested |
| Vietnam | Not Tested | Low | Same caveat | Not Tested |
| Philippines | Not Tested | Low | Same caveat | Not Tested |
| Singapore | Low | Low | Singapore's stricter data-privacy regime (PDPA) makes any "real-time behavioural targeting" mechanic higher-risk to even attempt without independent legal/regulatory review | Not Tested |

### FORM-007 — Purpose With Operating Proof

| Market | transferability_score | market_confidence | reason | verification_status |
|---|---|---|---|---|
| Malaysia | Medium | Medium | Same 2 cases as FORM-003 — real operating commitments (money, partnerships) confirmed | Source-supported |
| Indonesia | Medium | Low | Purpose-with-real-commitment structure is category-agnostic and plausible; local CSR/regulatory norms need checking | Not Tested |
| Thailand | Medium | Low | Same reasoning | Not Tested |
| Vietnam | Medium | Low | Same reasoning, with additional political-sensitivity review needed for anything purpose/social-issue-adjacent | Not Tested |
| Philippines | Medium | Low | Strong purpose-marketing tradition (typhoon relief, community causes) suggests plausible fit | Not Tested |
| Singapore | Medium | Low | Higher scrutiny of "purpose-washing" claims may make the "operating proof" half of this formula even more necessary, not less | Not Tested |

### FORM-008 — AI Utility + Measurable Movement

| Market | transferability_score | market_confidence | reason | verification_status |
|---|---|---|---|---|
| Malaysia | Low | Low | Neither backing case has a measured result — the formula's own name is currently unproven even at home | Source-supported |
| Indonesia | Low | Low | No basis; also no Malaysian result to transfer even structurally | Not Tested |
| Thailand | Low | Low | Same | Not Tested |
| Vietnam | Low | Low | Same | Not Tested |
| Philippines | Low | Low | Same | Not Tested |
| Singapore | Low | Low | Singapore's tech-forward market may be the most plausible fit for AI-forward creative, but this formula has no measured result anywhere to justify prioritising it | Not Tested |

### FORM-009 — Creator as Trust Bridge

| Market | transferability_score | market_confidence | reason | verification_status |
|---|---|---|---|---|
| Malaysia | Not Tested | Low | Zero supporting cases even in the home market | Hypothesis |
| Indonesia | Not Tested | Low | Zero basis | Hypothesis |
| Thailand | Not Tested | Low | Zero basis | Hypothesis |
| Vietnam | Not Tested | Low | Zero basis | Hypothesis |
| Philippines | Not Tested | Low | Zero basis | Hypothesis |
| Singapore | Not Tested | Low | Zero basis | Hypothesis |

### FORM-010 — Platform-Native Funnel

| Market | transferability_score | market_confidence | reason | verification_status |
|---|---|---|---|---|
| Malaysia | Medium | Low | 2 real cases, no quantified funnel-conversion figures | Source-supported |
| Indonesia | Medium | Low | High social-commerce/livestream-shopping maturity is structurally comparable, arguably more advanced than Malaysia's | Not Tested |
| Thailand | Medium | Low | Strong TikTok-shop/livestream-commerce culture; structurally plausible | Not Tested |
| Vietnam | Medium | Low | Very high social-commerce adoption; plausible | Not Tested |
| Philippines | Medium | Low | High social-media/community engagement; plausible | Not Tested |
| Singapore | Medium | Low | High digital-platform sophistication; plausible, but consumer behaviour may skew more research-heavy/less impulse-driven than the Dapur Goodday "watch today, buy tomorrow" mechanic assumes | Not Tested |

### `my-formula-idea-is-the-media` — The Idea Is the Media

| Market | transferability_score | market_confidence | reason | verification_status |
|---|---|---|---|---|
| Malaysia | Medium | Medium | 3 real cases, all self-reported but reasonably consistent in shape | Source-supported |
| Indonesia | Medium | Low | Requires a genuinely owned physical/operational channel (a delivery fleet, a chain of stores) — many Indonesian brands have this at scale; plausible | Not Tested |
| Thailand | Medium | Low | Similarly plausible wherever a brand has real owned physical infrastructure | Not Tested |
| Vietnam | Medium | Low | Same reasoning | Not Tested |
| Philippines | Medium | Low | Same reasoning | Not Tested |
| Singapore | Low | Low | Smaller physical footprint/market size may reduce the scale of "owned channel as PR device" relative to Malaysia/Indonesia | Not Tested |

### `my-formula-stunt-record-earned-pr-multiplier` — Stunt/Record Mechanic

| Market | transferability_score | market_confidence | reason | verification_status |
|---|---|---|---|---|
| Malaysia | Medium | Medium | 4 cases, 2 reused from other formulas, but genuinely varied categories (FMCG, QSR, Govt/NGO, Hospitality) | Source-supported |
| Indonesia | Medium | Low | Guinness/record-style stunts and coalition campaigns (e.g. government/bank partnerships) are structurally common across ASEAN; plausible | Not Tested |
| Thailand | Medium | Low | Same reasoning | Not Tested |
| Vietnam | Medium | Low | Same reasoning | Not Tested |
| Philippines | Medium | Low | Same reasoning, plus a strong existing culture of viral/community stunts | Not Tested |
| Singapore | Low | Low | A "world record" stunt device may read as less credible/more gimmicky in a market with a higher effectiveness/proof bar (see Section 12) | Not Tested |

---

## 4. Formula-by-Formula Transfer Notes

Every note below should be read with the same framing: **this formula is transferable as a structure, not as a proven result.**

### FORM-001 — Culture Must Move Action
- **Current evidence status:** Medium confidence, 2 real backing rows (Aiken, Mirinda), neither with a final quantified result.
- **Core structure:** cultural moment + named commercial pressure + credible brand role + clear action path.
- **What may transfer:** the four-part structural test itself.
- **What must not be transferred blindly:** the specific cultural anchors (Stephen Chow, CNY beauty-category competitive dynamics, Raya price-war dynamics) — these are Malaysia-and-category-specific, not a template.
- **Best-fit categories:** FMCG personal care, FMCG beverages, retail — anywhere with a fixed, high-stakes seasonal commercial window.
- **Highest-risk markets:** Vietnam (political sensitivity around cultural messaging), Singapore (more secular commercial calendar, higher scrutiny of "borrowed" nostalgia).
- **Best first test markets:** Indonesia or Philippines, both of which have comparably fixed, high-stakes religious/festive commercial calendars.
- **Local evidence needed:** at least one locally-sourced case per target market showing a named competitive/commercial pressure resolved via a culturally-specific device, with a stated result.
- **Source types to check:** local effectiveness-award archives (see Section 12), local trade press covering festive-period campaigns.
- **Proof needed before business claims:** a case with an actual stated sales/share number tied to the cultural device, not just "surpassed expectations."
- **What would make transfer stronger:** a second, independent Malaysian case (not Chinese-Malaysian-specific) showing the same four-part structure in a different cultural community within Malaysia itself, before testing abroad.
- **What would make transfer unsafe:** assuming any specific festive reference, joke, or celebrity resonates the same way in another market without independent cultural review.
- **Recommended transfer label:** Needs more local evidence first.

### FORM-002 — Category Enemy + Easier Switch
- **Current evidence status:** Low confidence, 1 real backing row.
- **Core structure:** name a real category frustration, then remove a specific friction in the switching action.
- **What may transfer:** the two-part structural test.
- **What must not be transferred blindly:** the RHB case's specific "value exchange" mechanic (free media + GenAI ad for SMEs) is one specific execution of the pattern, not the pattern itself, and it is entangled with a Malaysia-specific 2023 cost-of-living shock (25% minimum-wage rise, tariff increases).
- **Best-fit categories:** financial services/B2B SME banking, telco/broadband, any category with real switching costs.
- **Highest-risk markets:** Thailand (direct competitive naming may clash with politeness/hierarchy norms).
- **Best first test markets:** Vietnam or Philippines — both have large, price-sensitive SME populations.
- **Local evidence needed:** a locally-sourced case showing a real friction point named and removed, with a customer-acquisition or switching metric attached.
- **Source types to check:** local banking-sector effectiveness case studies, local SME-support programme coverage.
- **Proof needed before business claims:** an independently-reported (not just brand-stated) acquisition or switching figure.
- **What would make transfer stronger:** a second Malaysian case in a genuinely different category (e.g. telco) to confirm this is a category-agnostic pattern and not just a banking-sector story.
- **What would make transfer unsafe:** assuming a Malaysia-specific economic shock (minimum wage, tariffs) is the "enemy" in another market without checking what the equivalent local pressure actually is.
- **Recommended transfer label:** Needs more local evidence first.

### FORM-003 — Trust Gap + Proof Before Trial
- **Current evidence status:** Medium confidence, 2 real backing rows, one with a real (if narrow) result figure.
- **Core structure:** name the real fear/stigma directly, remove a specific friction point, then ask for the conversion.
- **What may transfer:** the "name the fear, then remove a specific friction" structural sequence.
- **What must not be transferred blindly:** the specific stigma framing ("toxic masculinity," a "dot" symbol) and the specific friction removed (a free soy-milk product tied to a hospital-partner network) are local executions.
- **Best-fit categories:** healthcare, insurance, any high-stakes category with documented local stigma/fear research.
- **Highest-risk markets:** Vietnam (healthcare-access/infrastructure differences may make a "partner hospital network" mechanic hard to replicate as-is).
- **Best first test markets:** Indonesia and Thailand — both have documented, researchable health-screening stigma literature.
- **Local evidence needed:** local public-health research confirming the specific fear/stigma in-market, plus a local partner-network feasibility check.
- **Source types to check:** local health-ministry or NGO screening-awareness data, local health-brand effectiveness cases.
- **Proof needed before business claims:** an actual screening/sign-up count, not just a PR-value figure.
- **What would make transfer stronger:** confirming HOMESOY's actual screening volume in Malaysia first — the strongest current gap.
- **What would make transfer unsafe:** assuming the same stigma framing (e.g. a gendered framing) applies without local research; health-stigma framing is highly culture-specific and can misfire badly if wrong.
- **Merge-watch:** shares its entire evidence base with FORM-007 — see the working distinction in Section 2. Do not test as an independent pattern until a case separates the two.
- **Recommended transfer label:** Ready for cautious transfer testing (merge-watch alongside FORM-007).

### FORM-004 — Role-Changing Participation
- **Current evidence status:** Low confidence, 1 real backing row, no business result.
- **Core structure:** recruit the sceptical/excluded audience into real participation, validated by an independent third party.
- **What may transfer:** the "recruit, don't message" structural principle, and the emphasis on independent (not brand-claimed) validation.
- **What must not be transferred blindly:** the specific activity (esports) and the specific validator (Malaysian Book of Records) are local choices, not templates.
- **Best-fit categories:** FMCG (especially youth-coded categories seeking crossover relevance), any brand needing to reach a demographic outside its usual target.
- **Highest-risk markets:** none flagged as clearly higher-risk than others given how thin the evidence is — the honest answer is this formula is not well-enough evidenced anywhere to rank market risk meaningfully yet.
- **Best first test markets:** Philippines, given its strong community/participation culture, but only as a hypothesis test, not a commercial bet.
- **Local evidence needed:** at least one more Malaysian case (ideally a different category) before testing abroad at all.
- **Source types to check:** local esports/community-participation press, local records/recognition bodies.
- **Proof needed before business claims:** any sales or brand-lift figure at all — currently zero exists for this formula.
- **What would make transfer stronger:** a second Malaysian case with a stated commercial result.
- **What would make transfer unsafe:** treating a single, resultless case as a proven playbook for demographic role-reversal stunts.
- **Recommended transfer label:** Keep as hypothesis only.

### FORM-005 — Story Survives Checkout
- **Current evidence status:** Low confidence, 2 cases but same brand (RWG, two phases of one campaign).
- **Core structure:** check whether the brand story still makes sense at the actual transaction point; if not, embed the story directly into the booking environment.
- **What may transfer:** the diagnostic question itself ("where does the customer path break?") — this is genuinely category-agnostic and one of the more defensible structural claims in the bank.
- **What must not be transferred blindly:** the specific booking-partner integration (Klook) and the specific device (a returning child "CEO" presenter).
- **Best-fit categories:** travel & hospitality, e-commerce, anything with a third-party OTA/marketplace dependency.
- **Highest-risk markets:** none especially — this is one of the more portable diagnostic structures, but the *evidence* behind it is thin (one brand only).
- **Best first test markets:** Indonesia or Thailand, both mature OTA-dependent travel markets.
- **Local evidence needed:** a second, independent brand/case (not RWG) confirming the same "story breaks at the transaction point" diagnosis before treating this as more than a single company's fix.
- **Source types to check:** local travel/hospitality effectiveness cases, OTA-integration case studies.
- **Proof needed before business claims:** an actual booking-volume or conversion-rate figure, not just PR reach.
- **What would make transfer stronger:** a non-RWG, non-Malaysia hospitality case showing the same OTA-disconnect diagnosis independently.
- **What would make transfer unsafe:** assuming Klook specifically (or any single OTA) is the right local integration partner in another market without checking local OTA/marketplace share.
- **Recommended transfer label:** Needs more local evidence first.

### FORM-006 — Data-as-Intervention
- **Current evidence status:** Low confidence, 1 case, and even that case's specific claimed mechanic is unverified.
- **Core structure:** use behavioural data to help someone act at the right moment, not merely to target them more efficiently.
- **What may transfer:** the underlying distinction (utility vs. targeting) is a sound and category-agnostic test, even though this specific KB currently cannot prove any case actually cleared that bar.
- **What must not be transferred blindly:** nothing specific — there is no confirmed mechanic here to transfer; only the AIA Vitality sleep-tracking/rewards feature itself is confirmed, and that is a global AIA product feature, not a Malaysia-specific campaign insight.
- **Best-fit categories:** insurance, wellness, any category with an existing app/loyalty programme that can host a real feature.
- **Highest-risk markets:** Singapore (PDPA and generally stricter data-privacy enforcement make any real-time behavioural-data mechanic higher-risk to even propose without legal review).
- **Best first test markets:** none recommended yet — this formula needs a real, verified Malaysian case before it is tested anywhere.
- **Local evidence needed:** a fully-verified Malaysian (or any-market) case demonstrating the actual data mechanic and a resulting behaviour change, not just a feature description.
- **Source types to check:** AIA's own published case studies (if available), regional insurtech/martech case archives.
- **Proof needed before business claims:** confirmation the "real-time targeting" mechanic exists at all, plus a measured behaviour-change result.
- **What would make transfer stronger:** independently verifying the AIA mechanic itself before doing anything else with this formula.
- **What would make transfer unsafe:** presenting this as a proven "data-driven marketing" playbook to any client — currently it is closer to an aspiration than a formula.
- **Recommended transfer label:** Do not transfer yet.

### FORM-007 — Purpose With Operating Proof
- **Current evidence status:** Medium confidence, 2 cases — identical to FORM-003's evidence base.
- **Core structure:** back a purpose claim with a real, operational commitment (money, partnerships, access), not just a message.
- **What may transfer:** the "what is the brand actually doing, not saying" test — a strong, portable diagnostic.
- **What must not be transferred blindly:** the specific commitments (RM50,000 pledge, 20+ hospital partners) are Malaysia-specific instances of the pattern.
- **Best-fit categories:** healthcare, social-purpose-adjacent FMCG, any category where "purpose-washing" scepticism is high.
- **Highest-risk markets:** none flagged as distinctly higher-risk, though Vietnam's political-sensitivity context means any purpose/social campaign needs an added regulatory-review step regardless of formula fit.
- **Best first test markets:** Philippines, given its strong existing purpose-marketing tradition (disaster relief, community causes) as a plausible receptive environment — still hypothesis, not evidence.
- **Local evidence needed:** because this formula shares its entire evidence base with FORM-003, the more urgent local-evidence need is actually *within* Malaysia — a case that clearly demonstrates "purpose with operating proof" *without* also being a health-screening trust-gap case, to prove these are genuinely separate patterns.
- **Source types to check:** local CSR/purpose-marketing effectiveness cases outside healthcare, to test whether the pattern holds in a different category.
- **Proof needed before business claims:** a business (not just PR or participation) result tied specifically to the operating commitment.
- **What would make transfer stronger:** resolving the FORM-003/FORM-007 overlap first.
- **What would make transfer unsafe:** presenting these as two independently-proven patterns when they currently rest on one shared evidence base.
- **Merge-watch:** shares its entire evidence base with FORM-003 — see the working distinction in Section 2. Do not test as an independent pattern until a case separates the two.
- **Recommended transfer label:** Needs more local evidence first (merge-watch alongside FORM-003).

### FORM-008 — AI Utility + Measurable Movement
- **Current evidence status:** Medium confidence *label*, but **zero cases with a measured result** — this is the single largest confidence/evidence mismatch in the bank.
- **Core structure:** AI should do a real, keepable job for the person or business, tied to something real, not be included as a novelty/PR device.
- **What may transfer:** the diagnostic test itself ("what job is the AI doing, and is it tied to something real?") is sound and portable.
- **What must not be transferred blindly:** neither case (SAFI, Fly FM) can currently be cited as proof the approach "works," because neither has a stated result.
- **Best-fit categories:** FMCG personal care (where personalisation has an obvious consumer benefit), media/entertainment.
- **Highest-risk markets:** none should be prioritised for testing given the evidence gap — the risk is uniform.
- **Best first test markets:** none recommended until Malaysia produces at least one case with an actual measured result.
- **Local evidence needed:** a case — anywhere — where an AI campaign feature is tied to a stated, verifiable outcome (sign-ups, applications, sales), not just a description of the mechanic.
- **Source types to check:** SAFI's own or MBCS's published results (if any exist beyond the mechanic description already found), Fly FM/Media Prima's follow-up coverage.
- **Proof needed before business claims:** literally any stated result for either backing case.
- **What would make transfer stronger:** closing the SAFI/Fly FM results gap first — this is a research priority, not a transfer priority.
- **What would make transfer unsafe:** citing "AI Utility + Measurable Movement" in a client-facing document as if it were a proven approach; it is currently a well-articulated hypothesis with a misleadingly confident name.
- **Recommended transfer label:** Keep as hypothesis only.

### FORM-009 — Creator as Trust Bridge
- **Current evidence status:** Low confidence, **zero supporting cases**.
- **Core structure:** creators reduce audience doubt or demonstrate real use, rather than only providing reach.
- **What may transfer:** nothing yet — there is no confirmed case to derive a transferable structure from.
- **What must not be transferred blindly:** the entire formula, currently. It was explicitly flagged in the prior consolidation as unconfirmed and should not be treated as more than a name and a hypothesis.
- **Best-fit categories:** not yet determinable.
- **Highest-risk markets:** all markets are equally high-risk for this formula given zero evidence.
- **Best first test markets:** none. This formula should not be tested anywhere until it has at least one independently-confirmed Malaysian case.
- **Local evidence needed:** a genuine creator-led case (Malaysia or elsewhere) where a specific creator's specific credibility is shown to have reduced a specific, named audience doubt, with some resulting behaviour change.
- **Source types to check:** any of the cases currently miscited for this formula (SAFI, Goodday Charge, HOMESOY) should be re-examined specifically for a creator mechanic, since none currently confirm one.
- **Proof needed before business claims:** a confirmed case, full stop.
- **What would make transfer stronger:** finding or building a real case.
- **What would make transfer unsafe:** using this formula's name in any client-facing material as if it reflects a verified insight.
- **Recommended transfer label:** Do not transfer yet.

### FORM-010 — Platform-Native Funnel
- **Current evidence status:** Medium confidence, 2 cases, one (RWG CEO 2.0) shared with FORM-005.
- **Core structure:** assign each channel/platform a distinct job connected to the next real step, rather than repeating one asset everywhere.
- **What may transfer:** the "assign each channel a job tied to the next step" diagnostic is category-agnostic and one of the more defensible structural claims here.
- **What must not be transferred blindly:** the specific channel mix (TV drama → physical Ramadan bazaar; TikTok/Meta → YouTube → Klook) reflects Malaysian platform habits and a Malaysian commerce rhythm (bazaar culture), not a universal mix.
- **Best-fit categories:** FMCG/dairy, travel & hospitality, and — per Section 6 — likely also retail/e-commerce given ASEAN's strong social-commerce maturity.
- **Highest-risk markets:** none especially — the underlying test is portable, but assuming the *specific* channel mix transfers (see Section 7, Red Flag 005) is the real risk.
- **Best first test markets:** Indonesia, Thailand, or Vietnam, all of which have social-commerce/livestream-shopping cultures that may express this pattern even more strongly than Malaysia does.
- **Local evidence needed:** a locally-sourced case mapping which platform does which job in-market, with at least one funnel-stage number attached.
- **Source types to check:** local social-commerce case studies, livestream-shopping effectiveness data.
- **Proof needed before business claims:** an actual stage-by-stage conversion figure — currently absent from both backing cases.
- **What would make transfer stronger:** a Malaysian case with quantified funnel-stage data, to establish what "good" looks like before comparing to another market.
- **What would make transfer unsafe:** assuming Malaysia's TV-drama-to-bazaar mechanic (a specific, physical, Ramadan-bound commerce structure) has an equivalent anywhere else without checking.
- **Recommended transfer label:** Needs more local evidence first.

### `my-formula-idea-is-the-media` — The Idea Is the Media
- **Current evidence status:** Low confidence *label* but the most internally consistent 3-case evidence base in the bank (Pizza Hut, Heineken, Wonda).
- **Core structure:** make the brand's claim provably real through an owned, operational channel, rather than only narratively true in an ad.
- **What may transfer:** the core test - "is there an owned, controllable, physical/operational asset that can carry proof of this claim?" - is genuinely category-agnostic and one of the strongest candidates in this bank for early cross-market testing.
- **What must not be transferred blindly:** the specific channels (a delivery fleet, a chain of restaurants, a Guinness-certified physical object) are specific to what each brand happens to own — the *test* transfers, the *vehicle* does not.
- **Best-fit categories:** QSR, FMCG beverages (especially where alcohol-visibility or other regulatory constraints make paid media harder), any brand with real physical distribution infrastructure.
- **Highest-risk markets:** Singapore, where smaller physical scale may reduce how large an "owned channel as PR device" can plausibly be relative to Malaysia or Indonesia.
- **Best first test markets:** Indonesia — very large physical retail/distribution footprints for many FMCG/QSR brands make this structurally promising.
- **Local evidence needed:** a locally-sourced case where a brand turned a real owned asset into proof of a claim, with at least a directional result.
- **Source types to check:** local FMCG/QSR effectiveness case archives, local delivery/retail-network case studies.
- **Proof needed before business claims:** independent (non-brand-reported) confirmation of at least one figure, since all three current cases are self-reported.
- **What would make transfer stronger:** independent verification of even one of the three existing Malaysian cases.
- **What would make transfer unsafe:** treating "the idea is the media" as license to force a physical stunt onto a brand that has no genuinely relevant owned asset — this becomes gimmickry, not proof.
- **Recommended transfer label:** Ready for cautious transfer testing.

### `my-formula-stunt-record-earned-pr-multiplier` — Stunt/Record Mechanic
- **Current evidence status:** Low confidence, 4 cases across genuinely varied categories, though 2 are reused from other formulas.
- **Core structure:** build an externally verifiable, newsworthy claim (a record, a coalition, a genuine first) directly into the campaign mechanic, rather than relying on paid weight to carry an ordinary message.
- **What may transfer:** the "is there a genuinely externally-verifiable, newsworthy claim here?" test is portable.
- **What must not be transferred blindly:** the specific stunt vehicles (a Guinness World Record, a bank-coalition public-safety campaign, a kid-CEO device) are local executions; a forced, irrelevant stunt risks the same "Category Platitude" red flag IQ Evaluate already checks for.
- **Best-fit categories:** FMCG beverages, QSR, Government/NGO coalition work, travel & hospitality.
- **Highest-risk markets:** Singapore, where a higher general scrutiny of claims (see Section 12) may make an unverified "world record" style stunt read as gimmicky rather than credible.
- **Best first test markets:** Philippines, given a strong existing culture of viral/community stunts and record-seeking media coverage.
- **Local evidence needed:** a locally-sourced case with an independently-reported (not brand-only) PR-value or reach figure.
- **Source types to check:** local Guinness World Records press coverage, local multi-institution coalition campaigns (especially in banking/public-safety).
- **Proof needed before business claims:** at minimum, independent confirmation of the earned-PR-value figure in at least one case.
- **What would make transfer stronger:** resolving the case-reuse issue — finding at least one more case not already cited under another formula.
- **What would make transfer unsafe:** treating "record sales" claims (as in the Mountain Dew case, which states this in its own title with zero number attached) as evidence rather than as an unverified brand claim.
- **Recommended transfer label:** Needs more local evidence first.

---

## 5. Market Pack Readiness

### Indonesia
- **Likely strongest formulas to test first:** `my-formula-idea-is-the-media` (large owned-distribution footprints), FORM-003/FORM-007 (real, documented health-screening-stigma research base likely exists), FORM-010 (very high social-commerce/livestream-shopping maturity).
- **Formulas to avoid transferring too early:** FORM-001 — Indonesia's Ramadan/Lebaran commercial and religious rhythm is real but must not be assumed to mirror Malaysia's; the specific cultural anchors in the Malaysian cases (Chinese-Malaysian nostalgia, CNY) have no Indonesian equivalent at all.
- **Most culturally sensitive areas:** religious observance norms around Ramadan/Lebaran commerce timing; regional/ethnic diversity far exceeding Malaysia's, meaning no single "Indonesian culture" exists to design for.
- **Best categories to start with:** FMCG (large, mature market), QSR, travel/hospitality (OTA-dependent).
- **Source gaps:** no Indonesian effectiveness-award archive has been reviewed yet (Citra Pariwara is catalogued in `award_sources` but `is_active: false`, nothing extracted).
- **Proof gaps:** entirely absent — zero Indonesian cases exist anywhere in this KB.
- **Local adaptation risks:** assuming Malay-language wordplay or Malaysian-Islamic cultural norms map directly onto Indonesian Bahasa Indonesia and Indonesian Islamic practice, which differ in real, specific ways.
- **First research sources to inspect:** Citra Pariwara winner archives, local trade press (Marketeers, SWA, Mix Marketing Communications).
- **Recommended next action:** research-only — identify 5-8 real, independently-verifiable Indonesian effectiveness cases before testing any formula commercially.
- **Overall market confidence:** Low (highest strategic priority, per Section 12, but currently zero evidence).

### Thailand
- **Likely strongest formulas to test first:** FORM-003 (documented health-stigma literature), FORM-010 (strong TikTok-shop/livestream-commerce culture), FORM-005 (mature OTA-driven tourism economy).
- **Formulas to avoid transferring too early:** FORM-001 and FORM-002 — Thai humour, hierarchy, and politeness norms (and taboo boundaries around, e.g., royal-family-adjacent content) are a real, distinct risk category not present in the Malaysian evidence.
- **Most culturally sensitive areas:** hierarchy/politeness (kreng jai), royal-family-adjacent sensitivities, indirect communication norms that may conflict with the more direct "category enemy" naming seen in the Malaysian FORM-002 case.
- **Best categories to start with:** hospitality/leisure/wellness (Thailand's strongest sector), beauty/personal care, telco.
- **Source gaps:** no Thai effectiveness archive reviewed yet.
- **Proof gaps:** zero Thai cases in this KB.
- **Local adaptation risks:** importing Malaysian directness (e.g. RHB naming a specific competitor pressure, or Aiken directly citing Garnier's growth rate) without checking whether that level of direct competitive naming is normal in Thai advertising.
- **First research sources to inspect:** local Thai creative-effectiveness awards (e.g. Adman Awards, Thailand-specific Effie), Marketing Oops/Brand Buffet trade press.
- **Recommended next action:** research-only, focused on hospitality/beauty categories given Thailand's comparative advantage there.
- **Overall market confidence:** Low.

### Vietnam
- **Likely strongest formulas to test first:** FORM-010 (very high mobile/social-commerce adoption), FORM-002 (fast-growing, price-sensitive SME/consumer market).
- **Formulas to avoid transferring too early:** FORM-007 and any purpose/social-issue-adjacent formula — Vietnam's political-sensitivity context around social/purpose messaging is a real, structurally distinct risk not evidenced anywhere in this Malaysia-only bank.
- **Most culturally sensitive areas:** political/regulatory sensitivity around messaging generally; this is the single most distinct risk category versus Malaysia and should gate any purpose- or government-adjacent formula (FORM-007, the coalition angle of the stunt/record formula) specifically.
- **Best categories to start with:** telco/broadband, e-commerce/retail, FMCG.
- **Source gaps:** no Vietnamese effectiveness archive reviewed yet; likely the hardest of the five markets to source case studies for, per Section 12's own assessment.
- **Proof gaps:** zero Vietnamese cases in this KB.
- **Local adaptation risks:** assuming a coalition-style public-safety campaign (like `#JANGANKENASCAM`) is safe to attempt without specific regulatory/political review given Vietnam's distinct media environment.
- **First research sources to inspect:** local digital-marketing trade press (Vietnam-specific), regional agency case-study archives with a Vietnam vertical.
- **Recommended next action:** research-only, and flag any purpose/government-adjacent formula for a mandatory legal/political review step before even hypothesis-testing.
- **Overall market confidence:** Low.

### Philippines
- **Likely strongest formulas to test first:** FORM-004 (strong community/participation culture), FORM-007 (strong existing purpose-marketing tradition), `my-formula-stunt-record-earned-pr-multiplier` (existing viral/community-stunt culture).
- **Formulas to avoid transferring too early:** FORM-009 — zero evidence anywhere, and the Philippines' well-documented creator/influencer economy makes it tempting to assume a creator-trust mechanic transfers well here specifically; that temptation should be resisted until a real case exists.
- **Most culturally sensitive areas:** strong Catholic-calendar commercial rhythms distinct from Malaysia's Islamic/Chinese-Malaysian festive calendar; family/community-first decision-making norms that may change how "role-changing participation" (FORM-004) should be designed.
- **Best categories to start with:** FMCG, entertainment/media, purpose/NGO-adjacent categories.
- **Source gaps:** strong regional effectiveness-award presence (Tambuli Awards, APAC Effie) not yet reviewed at all in this KB.
- **Proof gaps:** zero Philippine cases in this KB.
- **Local adaptation risks:** assuming Malaysian-style participation mechanics (an open-call recruitment validated by a national-records body) map onto Philippine community/barangay-level structures without checking what the equivalent credible local validator would be.
- **First research sources to inspect:** Tambuli Awards archives, APAC Effie Philippine entries, AdAsia/Adobo Magazine.
- **Recommended next action:** research-only, prioritising the Tambuli archive given its direct focus on effectiveness (not just creativity).
- **Overall market confidence:** Low-Medium (best-documented regional award ecosystem of the five, per Section 12, which somewhat de-risks the *research* step even though commercial confidence remains Low).

### Singapore
- **Likely strongest formulas to test first:** FORM-005 (high OTA/digital-booking sophistication), `my-formula-idea-is-the-media` (though at a smaller physical scale than Malaysia/Indonesia).
- **Formulas to avoid transferring too early:** `my-formula-stunt-record-earned-pr-multiplier` and FORM-001 — Singapore's generally higher effectiveness/proof discipline (see Section 12) means an unverified "record" claim or a borrowed-nostalgia cultural device may be scrutinised harder and read as less credible than in Malaysia.
- **Most culturally sensitive areas:** a more secular, multi-racial, English-first commercial environment with a different emotional register than Malaysia's; stricter data-privacy enforcement (PDPA) directly affects FORM-006 specifically.
- **Best categories to start with:** B2B, financial services, tech/telco — per Singapore's role as a regional HQ market.
- **Source gaps:** Singapore Effie/regional effectiveness archives not yet reviewed.
- **Proof gaps:** zero Singaporean cases in this KB.
- **Local adaptation risks:** assuming Singapore's higher ad-effectiveness discipline means Malaysian "Partially Verified, brand-self-reported" case standards will be accepted at face value here — they likely will not.
- **First research sources to inspect:** Singapore Effie archives, MARKies (regional), Campaign Asia Singapore coverage.
- **Recommended next action:** research-only, with an explicit focus on B2B/finance/tech categories and a higher bar for what counts as acceptable proof, given the market's own stricter effectiveness culture.
- **Overall market confidence:** Low, but the highest bar for what "ready" should even mean.

---

## 6. Category Transfer Map

| category | most_relevant_formulas | markets_to_test_first | behaviour_chain_to_validate | local_adaptation_risks | proof_needed_before_claiming_business_impact | current_confidence |
|---|---|---|---|---|---|---|
| 1. FMCG — Food & Beverage | `my-formula-idea-is-the-media`, `my-formula-stunt-record-earned-pr-multiplier`, FORM-001 | Indonesia, Thailand | trial → repeat purchase, not just reach | assuming a physical-channel stunt (delivery fleet, in-store event) is equally available/credible for every brand | independent sales/share figure | Low-Medium (Malaysia-only) |
| 2. FMCG — Personal Care / Skincare | FORM-001, FORM-008, FORM-009 (hypothesis only) | Indonesia, Philippines | consideration/preference shift → purchase | nostalgia/cultural-icon devices are highly local; creator-trust mechanics unconfirmed anywhere | a real preference or sales shift, independently confirmed | Low (FORM-009 has zero cases) |
| 3. QSR / Coffee / Fast Dining | `my-formula-idea-is-the-media`, `my-formula-stunt-record-earned-pr-multiplier` | Indonesia, Vietnam | trial among a specific lapsed/sceptical segment → repeat | authenticity-objection dynamics (Malaysia's "burger joint serving kopi susu" tension) are market-specific and must be re-diagnosed locally | independent sales-lift or app-usage figure | Medium (strongest, most-replicated pattern in the MY bank) |
| 4. Hospitality / Leisure / Wellness | FORM-005, `my-formula-stunt-record-earned-pr-multiplier` | Thailand, Indonesia | content engagement → booking-platform conversion | OTA/marketplace share differs by market; "story surviving checkout" needs local OTA integration work | independent booking-volume or conversion-rate figure | Low (single-brand evidence in MY) |
| 5. Retail / Ecommerce | FORM-002, FORM-010 | Indonesia, Vietnam | attention → platform-specific funnel stage → purchase | social-commerce/livestream maturity varies significantly by market and may exceed Malaysia's | funnel-stage conversion data, not just reach | Low-Medium |
| 6. Financial Services | FORM-002, FORM-003 (as risk/trust-adjacent), FORM-007 | Vietnam, Philippines | frustration named → friction removed → acquisition | direct competitive naming may not suit every market's communication norms | independent new-customer/switching figure | Low (1 real case) |
| 7. Telco / Broadband | `my-formula-idea-is-the-media` (CelcomDigi MY5G), FORM-002 | Vietnam, Indonesia | thought-leadership/differentiation → B2B contract value | commoditised-network dynamics (Malaysia's Single Wholesale Network) are a specific regulatory condition that may not exist elsewhere | independent contract-value or PR-value confirmation | Medium (High-evidence single case) |
| 8. Property | Not strongly evidenced by any formula as-is | Not recommended yet | named-campaign urgency → booking | Sime Darby's repeated-GDV-campaign pattern is real but not yet mapped to a specific formula's behaviour chain | a formula-specific case needs to be built here before recommending transfer | Low |
| 9. Healthcare | FORM-003, FORM-007 | Indonesia, Thailand | fear/stigma reduced → friction removed → screening/trial | stigma framing is highly culture-specific; a framing that works in Malaysia (e.g. "toxic masculinity") could misfire elsewhere | an actual screening/trial count, independently reported | Medium (best-evidenced category in the bank) |
| 10. Festive / Cultural campaigns | FORM-001 | Indonesia, Philippines | cultural relevance → named commercial pressure resolved | the single highest-risk category for blind cultural copying (see Red Flag 001) | a stated sales/share result tied specifically to the cultural device | Medium evidence, High cultural risk |
| 11. B2B | `my-formula-idea-is-the-media` (CelcomDigi), FORM-002 (RHB) | Singapore, Vietnam | thought-leadership/value-exchange → acquisition or contract value | Singapore's B2B/regional-HQ market likely has a higher proof bar than Malaysia's | independent contract-value, acquisition, or ranking-movement confirmation | Medium (2 genuinely strong cases) |
| 12. Government / NGO / Purpose | FORM-007, `my-formula-stunt-record-earned-pr-multiplier` (#JanganKenaScam) | Philippines, Indonesia | awareness → real behavioural-response signal (calls, reports, sign-ups) | Vietnam specifically requires a political/regulatory review step not evidenced anywhere in this bank | an independently-reported behavioural signal, not just reach | Medium-High (best real behavioural-proxy evidence: NSRC/BNM figures) |
| 13. Entertainment / Streaming / Gaming | FORM-004, `my-formula-stunt-record-earned-pr-multiplier` (Mountain Dew) | Philippines, Vietnam | digital fandom → real-world participation/attendance | gaming/esports culture and its social acceptability vary by market and demographic | an independent attendance, participation, or engagement figure | Low-Medium |
| 14. Sustainability | Not evidenced by any current formula | Not recommended yet | Not yet mapped | no case in this bank addresses sustainability/ESG directly | a dedicated case needs to be sourced before any formula can be proposed here | Not Tested |

---

## 7. Transfer Red Flags

**RED FLAG 001** — Copying Malaysian cultural or festive codes into another ASEAN market without local validation. *Triggered by:* any brief referencing Stephen Chow, CNY-specific beauty-category dynamics, Raya-specific price-war dynamics, or "toxic masculinity" framing being proposed for a non-Malaysia market without a local cultural-review step.

**RED FLAG 002** — Treating a Malaysian award-winning case as proof that the formula works elsewhere. *Triggered by:* citing any of the 26 cases' award level (Gold/Silver/Bronze) as business-impact evidence in a non-Malaysia context. Award wins are not proof anywhere in this bank, including in Malaysia.

**RED FLAG 003** — Using unverified result numbers in transfer logic. *Triggered by:* reintroducing any of the explicitly-excluded figures (CelcomDigi Fibre's subscriber/CPL numbers, HOMESOY's screening count, SAFI's preference-rank shift, RWG CEO 2.0's booking/ROAS figures, Dapur Goodday's UGC/PR figures, Sime Darby's "homebuyer hunt" figures) anywhere in a transfer brief or client-facing document.

**RED FLAG 004** — Assuming creators play the same trust role across markets. *Triggered by:* any application of FORM-009 as if it were proven, in any market, given its zero-case evidence base; also triggered by assuming a testimonial (HOMESOY) or AI-personalisation (SAFI) mechanic is a "creator" mechanic.

**RED FLAG 005** — Assuming platform behaviour is the same across ASEAN. *Triggered by:* proposing the Malaysian TV-drama-to-bazaar channel mix (Dapur Goodday), or the specific Klook integration (RWG), as a template for another market's funnel without checking local platform share and behaviour.

**RED FLAG 006** — Using AI because another market awarded AI work, without a clear customer job. *Triggered by:* citing Fly FM's "Malaysia's First A.I Radio DJ" (a real award winner with zero measured result) as justification for an AI feature anywhere, without independently defining what job the AI does for this specific customer.

**RED FLAG 007** — Ignoring local commerce, payment, booking, marketplace or WhatsApp behaviour. *Triggered by:* assuming a Malaysian near-conversion signal (e.g. a WhatsApp enquiry, a Klook booking-page visit) means the same thing, or carries the same weight, in a market with different payment/commerce infrastructure.

**RED FLAG 008** — Importing humour, slang or social tension without cultural review. *Triggered by:* proposing Malay-language wordplay (e.g. "rugi," the "Rugi Tau?!" loss-aversion framing) or direct competitive naming (RHB's SME framing) into Thai, Vietnamese, or Singaporean contexts without a local-language and tone review.

**RED FLAG 009** — Treating engagement as business outcome. *Triggered by:* citing any case's `media_activity_metric` or `social_impact_metric` fields (social mentions, PR value, participation counts) as if they were `business_outcome` fields, when the KB's own schema explicitly separates these.

**RED FLAG 010** — Raising transferability because the idea "feels similar" without evidence. *Triggered by:* any transferability_score above "Not Tested" being justified only by qualitative resemblance rather than the structural reasoning documented in Sections 3-4 above; this red flag exists specifically to guard against this document itself being over-read as more confident than it is.

---

## 8. FRAME Transfer Rules

| rule_name | what_it_checks | why_it_matters | weak_brief_signal | stronger_brief_question |
|---|---|---|---|---|
| 1. Formula transfer ≠ cultural transfer | Whether the brief distinguishes the structural pattern from its Malaysian cultural expression | The single most common failure mode identified in this analysis - conflating a transferable test with a non-transferable execution | "This worked in Malaysia with [specific cultural reference], so let's do the same here" | "What is the structural test behind this, and what is this market's own version of the cultural anchor?" |
| 2. The target market tension must be named | Whether the brief states the actual local commercial/cultural tension, not an assumed one | Every formula in this bank depends on a *named*, specific tension (price undercut, cost shock, stigma, authenticity objection) - a generic tension breaks the formula | "People here want to feel good about the brand" | "What specific, named pressure (competitive, cultural, financial) is this brand facing in this market right now?" |
| 3. The local behaviour chain must be visible | Whether the brief specifies what behaviour actually needs to move, and through what visible steps | Several formulas here (FORM-003, FORM-005) depend on a specific friction point being named and removed - a vague "increase engagement" goal cannot use these formulas | "We want more brand love" | "What is the exact behaviour today, and what is the exact behaviour we want, step by step?" |
| 4. The local proof path must be realistic | Whether the brief identifies what evidence would actually be collectible in-market | None of the 26 Malaysian cases have independently-audited proof; a brief should not assume a higher proof standard is automatically achievable elsewhere without planning for it | "We'll know it worked if it feels bigger" | "What specific, collectible data point will tell us this moved, and who collects it?" |
| 5. Channel behaviour must be market-specific | Whether the brief's channel mix is justified by local platform data, not copied from a Malaysian case | FORM-010's evidence is built on Malaysia-specific bazaar/TV/Klook mechanics | "Let's do what Dapur Goodday did" | "What does this market's audience actually do on which platform, and does that match this mechanic?" |
| 6. Creator trust must be locally validated | Whether any creator-inclusion in the brief is backed by a real, local trust-mechanism argument, not FORM-009's currently-unproven pattern | FORM-009 has zero supporting cases anywhere | "Use local creators, they build trust" | "What specific doubt does this creator specifically reduce for this specific audience, and how do we know?" |
| 7. AI/data use must solve a local decision friction | Whether any AI or data feature in the brief is tied to a real, named job for the customer | FORM-008's own cases show AI can win an award while having zero measured result | "Let's add an AI feature, it's timely" | "What decision or friction does this AI feature actually remove for the customer, and how will we know it did?" |
| 8. Category maturity must be checked | Whether the brief accounts for how mature the category/channel infrastructure is in this specific market (OTA share, social-commerce maturity, programmatic/data infrastructure) | FORM-005 and FORM-010 both depend on infrastructure (OTA integration, social-commerce behaviour) that varies significantly across the five target markets | "This channel mix should work everywhere" | "What is this market's actual maturity level for this specific infrastructure, and does our mechanic assume more than exists?" |
| 9. Regulatory and cultural risks must be surfaced | Whether the brief flags any regulatory (Vietnam political sensitivity, Singapore PDPA, Thailand royal/hierarchy norms) or cultural risk specific to the target market | Multiple formulas here (FORM-006, FORM-007, any coalition/government-adjacent idea) carry real regulatory risk that has zero precedent in the Malaysia-only evidence base | Brief has no risk section at all | "What could this idea trigger regulatorily or culturally in this specific market, and who has reviewed that?" |
| 10. Outcome proof cannot be borrowed from another market | Whether the brief cites this market's own evidence, not Malaysia's, as proof of likely success | This is the core discipline this entire document exists to enforce | "This got RM3.5 million in PR value in Malaysia, so it will work here too" | "What evidence do we have, or plan to collect, specifically in this market?" |

---

## 9. BIP Transfer Rules

When adapting a Big Idea Platform across a market boundary, pressure-test with all eleven questions before treating the idea as market-ready:

1. **Does the idea still have the same enemy in this market?** (e.g. Mirinda's "enemy" was a specific price-undercutting competitor at a specific 12% price gap — does an equivalent competitive dynamic exist here?)
2. **Does the brand still have permission to play this role?** (Durex Academy's "educator" role depended on Malaysia's specific censorship/taboo environment — does the brand have the same credibility gap and opportunity elsewhere?)
3. **Does the cultural tension still exist?** (Aiken's Stephen Chow nostalgia tension is specific to Malaysian-Chinese CNY culture — is there an equivalent tension, not just an equivalent festival, in the target market?)
4. **Does the language still carry the same meaning?** ("Rugi Tau?!"'s loss-aversion wordplay is a Malay-language pun — does a literal or conceptual translation carry the same emotional weight?)
5. **Does the participation mechanic still feel natural?** (Goodday Charge's open-call-to-esports-team mechanic assumes a specific relationship between seniors, gaming stigma, and a national records body — does that relationship exist here?)
6. **Does the creator role still create trust?** (Given FORM-009 has zero confirmed cases even in Malaysia, this question should currently be answered "we do not know" rather than assumed yes.)
7. **Does the action path still exist?** (RWG's Klook integration assumes Klook has meaningful share in the target market — check local OTA/marketplace share before assuming an equivalent path exists.)
8. **Does the proof path still work?** (#JanganKenaScam's NSRC-call and BNM-report signals are specific to Malaysian institutions — what is the equivalent institutional reporting channel, if any, in this market?)
9. **What local behaviour would prove the idea is moving?** (Name the specific, locally-collectible behaviour before launch, not after — none of the 26 Malaysian cases have this in place retroactively, which is why so many show `result_confidence: Not Stated`.)
10. **What could offend, confuse or feel imported?** (Explicitly review humour, competitive directness, religious/festive references, and gender/stigma framing against local norms — see Red Flags 001 and 008.)
11. **What would make the idea locally ownable?** (Ask what the market-specific equivalent of "an owned physical/operational channel" — the core insight behind `my-formula-idea-is-the-media` — would be for this brand in this market, rather than importing the Malaysian vehicle directly.)

---

## 10. Weekly Pulse Transfer Rules

The core principle: **a signal's meaning is not portable by default — it must be re-established per market and per category.** None of the 26 Malaysian cases in this KB give Weekly Pulse a cross-market signal dictionary; they only establish that this discipline (separating attention/leading/near-conversion/conversion/lagging, and separating `business_outcome` from `media_activity_metric` from `social_impact_metric`) matters.

| Signal type | What it may mean | What it cannot prove | Local data needed |
|---|---|---|---|
| **Attention** (views, reach, social mentions) | Initial notice of the idea | Whether anyone intends to act, or even understood the message | Local benchmark for "normal" attention levels by category and platform, so a spike can be judged relative to a real local baseline, not a Malaysian one |
| **Leading** (search lift, content saves, creator-comment sentiment) | Growing interest or an emerging intent signal | Purchase, or even genuine intent — a "save" can mean future intent in one category and casual bookmarking in another | Local research on what "saving" or "searching" this specific category actually indicates in this market — this varies by category as much as by country |
| **Near-conversion** (WhatsApp enquiry, booking-page visit, app download, quiz/form start) | Active movement toward a decision | Completion — a WhatsApp enquiry that is high-intent in one market's commerce culture may be a low-intent, low-cost habitual action in another | Local calibration of what enquiry-to-conversion rates normally look like for this channel in this market, before treating an enquiry spike as meaningful |
| **Conversion** (voucher redemption, sign-up, booking, sale) | A completed action | Repeat behaviour, loyalty, or satisfaction — a voucher redemption proves trial, not that the trial will be repeated | Local repeat-purchase/retention baselines, since a "good" conversion number in one market's promotional culture may be an unremarkable one in another |
| **Lagging** (repeat purchase, market share shift, brand-tracker movement) | Durable behaviour change or market position shift | Causality to this specific campaign versus seasonal, competitive, or macroeconomic factors — every case in this KB has `causal_confidence: Low` or `Not Claimable` for exactly this reason | A local counterfactual or baseline (pre/post, or a control group) — none of the 26 Malaysian cases have one, so this is a gap to close locally, not import |

Specific worked examples relevant to this bank: a `#JanganKenaScam`-style NSRC-call or BNM-report signal is a strong near-conversion/behavioural proxy *in Malaysia specifically*, because those are named Malaysian institutions with a specific public trust relationship — the equivalent signal in another market must be a real local institution, not a translated version of the same one. Similarly, HOMESOY's hospital-partner screening sign-up is a conversion signal *only if* an equivalent partner-hospital network exists and is willing to report sign-up data in the target market — this cannot be assumed.

---

## 11. IQ Evaluate Transfer Guardrails

IQ Evaluate must not raise any score, dimension rating, or confidence field merely because a submitted idea resembles a Malaysia-supported formula. Before any positive read is allowed to influence scoring, it should be able to answer:

- Is the formula relevant to this market, structurally? (Not: does it superficially resemble a Malaysian case?)
- Is the local tension actually supported by something named in the brief, or only assumed?
- Is the behaviour chain realistic given this market's actual infrastructure (payment, booking, platform, institutional-reporting)?
- Is a real proof path available in this market, or would proving this claim require infrastructure that does not yet exist here?
- Is the brand role ownable in this market specifically — does the brand have the same permission/credibility gap the Malaysian case exploited?
- Is the idea culturally specific to this market, or is it an imported Malaysian reference dressed in local language?
- Is business impact actually claimable given what evidence exists, or is this still, honestly, a hypothesis?

**Guardrails, restated as hard rules, consistent with the confidence-model discipline already built into IQ Evaluate:**

- `kb_grounded` remains `false` until a verified retrieval layer actually exists — this document does not change that, and nothing here should be read as grounds to flip it.
- **Result Confidence cannot rise from formula similarity alone.** A brief that "matches" FORM-003's structure is not evidence the result will be Medium or High — every one of FORM-003's own backing cases still carries `result_confidence: Not Stated` or `Medium` at best.
- **Causal Confidence cannot rise without outcome evidence and attribution logic.** Every single case in this 26-case bank carries `causal_confidence: Low` or `Not Claimable` — there is no basis anywhere in this KB for IQ Evaluate to ever output a higher causal confidence purely from formula-matching.
- **Transferability Score should remain Not Tested** for any market where the KB has no local case, which today means every market except Malaysia, for every formula.
- **Market Confidence should remain Low or Medium** until enough local cases exist to justify more — per Section 3, this document keeps almost every non-Malaysia cell at Low deliberately.
- **Creative strength cannot inflate proof confidence.** This mirrors the exact discipline already validated in the three ZestBowl IQ Evaluate calibration tests (33 → 58 → 63): a stronger, more structurally sound idea can and should still carry `Not Stated`/`Not Claimable`/`Not Tested` on the proof-facing fields, because creative quality and business-impact proof are different questions, and this transfer layer does not change that separation — if anything, it adds a second independent reason (market-transfer uncertainty) why those fields must stay conservative for any ASEAN market work.

---

## 12. Recommended Market Learning Sequence

| Market | Market size | Cultural richness/complexity | Creative/effectiveness award availability | Commerce & creator relevance | Likely source complexity |
|---|---|---|---|---|---|
| **Indonesia** | Largest ASEAN economy and population by far | Very high — many distinct regional/ethnic/religious cultures under one national umbrella | Citra Pariwara catalogued in `award_sources` but not yet extracted; likely a rich, real archive | Very high social-commerce and creator-economy maturity | Medium — real archives likely exist but require dedicated extraction |
| **Thailand** | Large, mature market | High creative reputation regionally; hierarchy/politeness/royal-sensitivity norms add real complexity | Strong regional creative-award presence (not yet catalogued in `award_sources` at all) | Very strong TikTok-shop/livestream-commerce culture | Medium |
| **Vietnam** | Fast-growing, mid-sized market | Political-sensitivity considerations are real and distinct from any market already in this KB | Not catalogued in `award_sources` at all; likely genuinely harder to source | Very high mobile/social-commerce adoption | High — the biggest source-access unknown of the five |
| **Philippines** | Large population, strong English-language media environment | Strong community/purpose/entertainment culture; distinct Catholic-calendar commercial rhythm | Tambuli Awards (explicitly effectiveness-focused) + APAC Effie entries — a genuinely promising, not-yet-catalogued archive | Strong creator/influencer economy, strong community-participation culture | Low-Medium — best-documented regional effectiveness ecosystem of the five |
| **Singapore** | Smaller population, outsized regional-HQ commercial role | More secular/multi-racial; higher general effectiveness/proof discipline | Singapore Effie + regional MARKies presence | Strong B2B/finance/tech relevance; smaller consumer/physical-retail scale | Low-Medium — likely easiest to source cleanly, but sets a higher proof bar |

**1. Recommended next market: Indonesia.**

**2. Why:** Largest addressable market in ASEAN by a wide margin, a real (if unextracted) effectiveness-award source already catalogued, and the strongest category overlap with Malaysia's existing evidence (FMCG, QSR both have large, mature Indonesian markets). It is also, per the market pack in Section 5, the best fit for the bank's single strongest formula (`my-formula-idea-is-the-media`, given large owned-distribution footprints) and one of the two best fits for FORM-003/FORM-007 (health-screening research base).

**3. What sources to inspect first:** Citra Pariwara winner archives (already catalogued, `is_active: false`, pending extraction); Indonesian trade press (Marketeers, SWA, Mix Marketing Communications) for case-level detail; any Indonesian Effie/APAC Effie archive.

**4. What categories to focus on first:** FMCG (food & beverage and personal care), QSR, healthcare/screening-adjacent categories.

**5. What formulas to test first:** `my-formula-idea-is-the-media`, FORM-003/FORM-007 (as a pair, given they currently share one evidence base and Indonesia is a chance to test whether they are genuinely separable), FORM-010 (given Indonesia's strong social-commerce maturity).

**6. What not to transfer blindly:** FORM-001's specific cultural anchors (this is the highest-risk formula for Indonesia specifically, given Indonesia's Ramadan/Lebaran rhythm is real but entirely distinct from Malaysia's Chinese-Malaysian CNY-centric evidence); any coalition/government-adjacent formula without first confirming Indonesia's own regulatory environment for such campaigns (distinct from, but not automatically safer than, Vietnam's).

---

## 13. OS Storage Recommendation

**Do not build yet — this section is a recommendation for later, pending Janine's review.**

- **`effectiveness_formulas`** can hold transfer notes as-is, using its existing `markets_observed` (array) and `regional_or_market_specific` fields — these were designed for exactly this purpose and do not need new columns to record that a formula is "observed in MY, hypothesis for ID/TH/VN/PH/SG." What it cannot yet hold is a *per-market* confidence/verification_status pair (today confidence_level and verification are single values per formula, not per market) — this is the one place a new field would genuinely help, not before.
- **`case_studies`** already supports `market_code` per row and should simply gain real rows as ASEAN cases are found — no schema change needed, only real data.
- **`market_parameters`** and **`category_attributes`** already exist for country/category-specific configuration (used by FRAME/BIP category recalibration per the memory record on B2B/vertical expansion) — these are the right home for any market-specific behaviour-chain or proof-standard defaults that come out of future research, not a new table.
- **`source_registry`** is already the right home for cataloguing ASEAN award/effectiveness sources as they are identified (Citra Pariwara is already there for Indonesia) — recommend adding rows for Thailand, Vietnam, Philippines, and Singapore's own award bodies as a first, low-risk research step, before any case extraction.
- **`os_integration_rules`** — per its own table comment, this is "empty by design at Stage 2" and defines how FRAME/BIP/IQ_Evaluate/Weekly_Pulse would draw on the KB once curated, with no route reading it yet. This is the right eventual home for the FRAME/BIP/Weekly-Pulse/IQ-Evaluate rules in Sections 8-11 above, once they are ready to be operationalised — but populating it now, before any non-Malaysia case exists, would risk exactly the premature-confidence problem this whole document warns against.
- **`behaviour_signals`** (currently empty, 0 rows) is the right eventual home for the market-specific signal-meaning calibrations described in Section 10, once real local data exists to populate it — not before.
- **What should remain manual:** every judgment in Sections 3-6 of this document (transferability scores, market confidence, red-flag triggering) should stay a human/analyst judgment call, reviewed case-by-case, until there is enough real ASEAN evidence for a systematic scoring rule to be trustworthy. Automating a "transferability score" calculation today would be automating a guess.
- **What should wait until corpus extraction:** any `os_integration_rules` population, any `behaviour_signals` population, and any per-market field added to `effectiveness_formulas` — all of these should wait until at least Indonesia has real, extracted case data, per Section 12's recommendation.
- **What should never be automated without human review:** flipping `kb_grounded`, adjusting IQ Evaluate's confidence-model defaults, or treating any transferability_score in this document as a scoring input — all three should always require an explicit human decision, not a scheduled job or an automatic threshold.
