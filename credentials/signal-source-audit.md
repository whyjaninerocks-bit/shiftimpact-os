# Signal Source Library — Audit Report

**Version:** v1.0 — August 18 2026  
**Scope:** Confirms what is actually tracked in ShiftImpact OS (automated + manual), maps it against the Signal Gap Framework v2, and lists recommended Apify connectors to close each gap.

---

## Section 1 — What Is Actually Tracked Today

### 1A — Automated via Apify (live, on-demand)

These are active Apify actors wired into `/app/api/audit-fetch/route.ts`. They fire when a user triggers an audit session — not on a cron schedule.

| Channel | Actor | What it pulls |
|---|---|---|
| Facebook Ad Library | `apify~facebook-ads-scraper` | Active ads, ad creative text, estimated impressions |
| Instagram brand posts | `apify~instagram-profile-scraper` | Last 20 posts, captions, likes, comments |
| Instagram KOL hashtag | `apify~instagram-hashtag-scraper` | Top posts for a hashtag, owner handles, engagement |
| TikTok brand posts | `clockworks~free-tiktok-scraper` | Last 20 videos, descriptions, view counts |
| TikTok KOL hashtag | `clockworks~free-tiktok-scraper` | Hashtag videos, author metadata, play count |
| YouTube channel | `bernardo_castilho~youtube-videos-scraper` | Last 15 videos, titles, descriptions, view counts |
| Twitter/X | `apify~twitter-scraper` | Brand and campaign handle posts, likes, retweets |
| Press coverage | `apify~google-news-scraper` | News results for brand + campaign, MY locale |
| Radio/partnership | `apify~google-news-scraper` | Partnership and sponsorship mentions |
| Trade press deep | `apify~rag-web-browser` | Full article text from 14 trade publications (Marketing Interactive, Campaign Asia, The Drum, etc.) |
| Brand website | `apify~website-content-crawler` | JS-rendered brand site content |
| Article URL | `apify~website-content-crawler` | Single article deep scrape |
| Podcasts | iTunes API (free, no Apify) | Apple Podcasts search + RSS episode data |

**OIE / Prospect intelligence (separate Apify pipeline):**

| Route | Actor | What it pulls |
|---|---|---|
| `/api/prospect-scan` | Multiple (prospect discovery) | Company intelligence for OIE scoring |
| `/api/prospect-enrich` | Company enrichment actor | Firmographic + signal data per prospect |
| `/api/market-discover` | Market discovery actor | Category-level market intelligence |
| `/api/consumer-pulse` | Consumer pulse actor | Consumer sentiment triggers |
| `/api/cron/prospect-rescan` | Scheduled rescan | Weekly prospect re-scoring |

---

### 1B — Automated via Open Source (live, cron)

| Source | Method | Schedule | What it pulls |
|---|---|---|---|
| Google News RSS | Native `fetch` — 12 queries, MY/SG locale | Weekly cron — Monday 2am UTC | Consumer behaviour articles for cultural signal extraction |
| Claude Haiku (`claude-haiku-4-5-20251001`) | Auto-classify extracted signals | Runs after each cron pull | Maps signals to: behavioural / linguistic / ritual / community; assigns industry relevance |

**Layer 2 cultural scan (TikTok / Reddit via Apify):** Code comments confirm it is planned but **deferred**. Review date agreed: August 17 2026.

---

### 1C — Tracked via Manual Entry (13 seeded signal sources)

These are created automatically when a client is onboarded via the "Set up 13 standard signal sources" button in `/app/(os)/clients/[id]/_components/SignalSourcesSection.tsx`. All require a human to enter values weekly.

| Signal Source | Maps to |
|---|---|
| TikTok Save Rate | S2 Content Save Rate |
| TikTok Share Rate | S2B Share Rate |
| Google Search Intent (branded) | S1 Share of Search |
| Google Search Console (Branded) | S1 Share of Search (secondary) |
| Meta ROAS | Delivery / context only |
| TikTok Shop CTR | Commerce signal (Lag) |
| TikTok Shop CVR | Commerce signal (Lag) |
| Cart Abandonment Rate | Commerce signal (Lag) |
| Repeat Purchase Rate (60-day) | S4 Retention proxy |
| Organic UGC Volume | S3 UGC Volume |
| NPS Score | Attitude signal (supporting) |
| In-Store Footfall Lift | Retail velocity (Lag) |
| Loyalty App Opens | Retention / reactivation |

**Schema-level signals (also manual input):**

| Signal | Schema field | Type | Status |
|---|---|---|---|
| S0 MDH | `mdh_imports` table — CSV upload | Delivery | Live (manual import) |
| S1 Share of Search | `signal_1_actual_pct` | Mixed | Live (manual) |
| S2 Save Rate | `signal_2_actual_pct` | Lead | Live (manual) |
| S2B Share Rate | `signal_2b_actual_pct` | Lead | Live (manual) |
| S3 UGC Volume | `signal_3_actual_count` | Lead | Live (manual) |
| S3B Video Completion Rate | `signal_3b_actual_pct` | Lead | Optional (manual) |
| S4 Retention / GrabAds | `signal_4_actual_pct` | Lag | Schema slot exists; GrabAds API deferred |

---

## Section 2 — What Is in the Signal Gap Framework But Not Yet Tracked

Cross-referenced against Signal Gap Framework v2 (August 2026). Signals are grouped by category with their gate-eligibility classification from the framework.

### Category: Content Behaviour Signals

| Signal | Framework classification | Tracking status | Gap severity |
|---|---|---|---|
| Instagram Save Rate | Lead (gate-eligible) | **NOT TRACKED** — Instagram scraper pulls posts but not save counts (Meta does not expose this via API or scraping) | High — IG save rate is the same leading indicator as TikTok saves for the 25–44 segment |
| Instagram Story Exit Rate | Lead (gate-eligible) | **NOT TRACKED** | Medium |
| Instagram Story Reply Rate | Lead (gate-eligible) | **NOT TRACKED** | Medium |
| YouTube Watch Time / Completion | Lead (gate-eligible) | **NOT TRACKED** — actor pulls titles and view counts only, not watch time data | High — critical for long-form campaigns |
| Comment Sentiment Score | Attitude (supporting) | **NOT TRACKED** — volume only; no sentiment classification on extracted comments | Low (attitude, not gate-eligible) |
| Stitch / Duet Rate (TikTok) | Lead (gate-eligible) | **NOT TRACKED** | Medium |

**Root cause note on Instagram saves:** Meta's API does not expose save counts for third parties. The only workable method is creator-side export (the brand's own IG account analytics) — this must be manual entry, not scraped. No Apify actor can close this gap.

---

### Category: Search Signals

| Signal | Framework classification | Tracking status | Gap severity |
|---|---|---|---|
| Google Trends (Share of Search) | Mixed (gate-eligible) | **NOT AUTOMATED** — tracked manually via Google Search Console only; no automated Google Trends pull | High — S1 (SoS) is a gate signal; manual entry creates lag |
| TikTok Search Insights (in-app) | Lead (gate-eligible) | **NOT TRACKED** — TikTok does not expose search data via API or scraping | High — TikTok is the primary search engine for 16–34 MY audience |
| App Store / Play Store branded search | Lead (gate-eligible) | **NOT TRACKED** | Medium |
| YouTube search trends (branded) | Mixed | **NOT TRACKED** | Low |
| Shopee / Lazada search rank | Lead (gate-eligible) | **NOT TRACKED** | High — for FMCG campaigns with Shopee distribution |

---

### Category: Commerce Signals

| Signal | Framework classification | Tracking status | Gap severity |
|---|---|---|---|
| Shopee Wishlist Adds | Lead (gate-eligible) | **NOT TRACKED** — Shopee has no public API; Apify scraping possible for product page data but not wishlist counts | High — wishlist add is the strongest pre-purchase signal in MY e-commerce |
| Shopee Product Page CVR | Lag (supporting) | **NOT TRACKED** | Medium |
| Lazada CVR / Add-to-cart | Lag (supporting) | **NOT TRACKED** | Medium |
| GrabAds Conversion | Lag (gate-eligible) | **DEFERRED** — S4 schema slot exists; GrabAds API partnership not yet activated | High (priority at first activation) |
| POS / Retail velocity | Lag (supporting) | Partial — baseline-delta method used when data provided, but no automated connector | Medium |

---

### Category: Dark Social & Owned Channel Signals

| Signal | Framework classification | Tracking status | Gap severity |
|---|---|---|---|
| GA4 direct / none traffic spike (WA proxy) | Lead (gate-eligible) | **NOT TRACKED** in OS — the WA Echo pattern is defined but no GA4 integration exists; client must manually report | High — this is the primary S2→WA Echo confirmation trigger |
| WhatsApp Business response rate | Lead (gate-eligible) | **NOT TRACKED** | Medium |
| Email open / click rate | Attitude (supporting) | **NOT TRACKED** | Low |
| Telegram engagement | Attitude (supporting) | **NOT TRACKED** | Low |
| Branded DM volume (IG/TikTok) | Lead (supporting) | **NOT TRACKED** | Medium |

**Root cause note on GA4:** No GA4 MCP or connector exists in the OS. The WA Echo detection rule currently relies on the client observing a direct traffic spike in their own GA4 and reporting it. This is the single highest-value gap to close for the WA dark loop strategy.

---

### Category: Listening & Reputation Signals

| Signal | Framework classification | Tracking status | Gap severity |
|---|---|---|---|
| Reddit social listening (MY) | Attitude (supporting) | **PLANNED** — Layer 2 cultural scan; deferred for review post-August 17 | Medium |
| Social listening sentiment (automated) | Attitude (supporting) | **NOT TRACKED** — no sentiment pipeline on scraped content | Low |
| Google My Business reviews | Reputation (supporting) | **NOT TRACKED** | Low |
| Brand+review search volume | Mixed | **NOT TRACKED** | Low |

---

### Category: Platform-Specific Signals (Untracked Platforms)

| Platform | Signal | Gap severity |
|---|---|---|
| Xiaohongshu / RedNote | Save rate, UGC volume | High — MY Chinese community (23% of population); XHS is the primary discovery platform for this segment |
| LinkedIn | Share rate, comment depth | Medium — relevant for B2B vertical expansion |
| Threads | Engagement rate | Low (early stage in MY) |
| Pinterest | Save rate | Low (niche use case) |
| Viu / Disney+ / streaming | Content completion | Low (no current client use case) |

---

### Category: AI Discovery Signals (F23 — Not Yet Built)

| Signal | Framework classification | Tracking status | Gap severity |
|---|---|---|---|
| AI Mention Monitoring (ChatGPT, Gemini, Perplexity, Claude, Google AI Overviews, TikTok Search AI) | Lead (gate-eligible in F23) | **NOT BUILT** — F23 Sprint 5–6 | Critical (first-mover window) |
| AI Recommendation Eligibility Score | Composite | **NOT BUILT** | Critical |
| AI Trust Gap Diagnosis | Diagnostic | **NOT BUILT** | Critical |
| Social Currency Index | Composite Lead | **NOT BUILT** — proxy metrics exist (S2, S3) | High |

---

## Section 3 — Recommended Connectors by Priority

### Priority 1 — High Impact, Buildable Now

**P1-A: Google Trends Scraper → Automate S1 (Share of Search)**

- **Gap it closes:** S1 SoS is currently manual entry; a scraper would pull weekly branded search trend data automatically
- **Recommended Apify actor:** `apify~google-trends-scraper`  
- **Input:** brand name + competitor names + category keyword + market (MY)
- **Output:** relative search interest over time — feeds `signal_1_actual_pct` automatically
- **Effort:** Low — single endpoint, structured output, matches existing schema field
- **Priority rationale:** S1 is a gate signal. Manual lag breaks the Gate Convergence logic.

---

**P1-B: TikTok UGC / Hashtag Volume Scraper → Automate S3 (UGC Volume)**

- **Gap it closes:** S3 UGC is currently manually counted; automating pulls branded hashtag post counts weekly
- **Recommended Apify actor:** `clockworks~free-tiktok-scraper` (hashtag mode — **actor already integrated in audit-fetch**)
- **What to add:** A cron job or client-side trigger that runs the actor weekly against the client's primary hashtag and writes the count to `signal_3_actual_count`
- **Effort:** Low — actor is already live; needs a dedicated cron route and a hashtag field on the client record
- **Priority rationale:** S3 UGC feeds the WA dark loop confirmation and AI Eligibility Score. Full automation compounding starts from Campaign 2.

---

**P1-C: GA4 Direct Traffic Integration → WA Echo Detection**

- **Gap it closes:** The WA Echo Event detection rule (S2 save spike → direct traffic spike 48-72h later) currently has no data source; client must self-report
- **Recommended approach:** GA4 Data API (Google Analytics Data API v1 — free, no Apify needed); requires the client to grant service account access to their GA4 property
- **Output:** weekly `sessions_by_channel` pull; flag direct/none traffic anomalies; write WA Echo Event to `signal_weekly_reports`
- **Effort:** Medium — requires OAuth/service account setup per client, but the GA4 API is stable and well-documented
- **Priority rationale:** Without this, the WA Dark Loop strategy cannot generate its own evidence. This is the gap that most undermines the winning strategy's credibility.

---

### Priority 2 — High Impact, Medium Effort

**P2-A: Shopee Product Scraper → Commerce Signal Proxy**

- **Gap it closes:** Shopee Wishlist Adds and product page CVR — the strongest pre-purchase signals in MY e-commerce
- **Recommended Apify actor:** Search Apify Store for `shopee-product-scraper` or `shopee-scraper`; several community actors exist
- **What it can pull:** product page view counts, ratings, review volume, sold count (as CVR proxy) — wishlist count is NOT exposed even via scraping
- **Effort:** Medium — Shopee is aggressive about anti-bot; actor reliability may vary; sold count is the most stable proxy
- **Priority rationale:** Covers the largest commerce gap for FMCG clients with Shopee distribution; especially relevant for Spritzer and Drypers/Vinda client profiles

---

**P2-B: Xiaohongshu (RedNote) Scraper → MY Chinese Community Signals**

- **Gap it closes:** 23% of Malaysian population; XHS is the primary discovery platform for food, beauty, and lifestyle in this segment; currently zero coverage
- **Recommended Apify actor:** Search Apify Store for `xiaohongshu-scraper` or `rednote-scraper`
- **What it can pull:** post volume, save counts, comment counts for branded hashtags
- **Effort:** Medium — XHS anti-scraping measures are significant; actor quality varies
- **Priority rationale:** Untracked community = blind spot in UGC and cultural signal coverage for any FMCG client targeting the Chinese Malaysian segment

---

**P2-C: Google Maps / GMB Scraper → Brand Reputation Signal**

- **Gap it closes:** Google My Business reviews as a brand health indicator — particularly relevant for QSR and retail clients
- **Recommended Apify actor:** `apify~google-maps-scraper` or `apify~google-maps-reviews-scraper`
- **What it can pull:** star ratings over time, review volume, sentiment keywords
- **Effort:** Low-medium — actor is well-maintained, stable output
- **Priority rationale:** Low for pure FMCG; elevates to High when QSR or retail clients onboard

---

### Priority 3 — Deferred / Planned

**P3-A: Reddit MY Scraper → Cultural Signals Layer 2**

- **Status:** Already planned; deferred for review post-August 17 2026
- **Actor:** `apify~reddit-scraper` or `trudax~reddit-scraper`
- **Integration point:** `/app/api/cron/cultural-scan/route.ts` — Layer 2 block already commented in code

**P3-B: TikTok Search Intelligence**

- **Status:** TikTok does not expose search data via API or scraping. This gap cannot be closed with Apify. Must be acquired via:  
  (a) TikTok for Business Ads Manager (search intelligence reports, requires ad account)  
  (b) Third-party data vendors (SimilarWeb, Sensor Tower) — not Apify-solvable  
  (c) Manual observation by strategy lead

**P3-C: F23 AI Mention Monitoring**

- **Status:** Sprint 5–6 build. Manual sampling protocol in v1 (10–15 queries per brand per month across ChatGPT, Gemini, Perplexity, Claude, Google AI Overviews, TikTok Search AI). Automation tools (Scrapes.ai, Brandwatch AI) are emerging but not yet mature. No Apify actor recommended yet — manual protocol is the right v1 approach.

---

## Section 4 — Summary Matrix

| Tracking method | Signals covered | Gate-eligible? | Status |
|---|---|---|---|
| Apify — on-demand (audit-fetch) | Facebook ads, Instagram posts, TikTok posts, YouTube, Twitter, press, trade press, website | No (these are brand intelligence inputs, not behaviour gate signals) | Live |
| Apify — OIE pipeline | Prospect intelligence, consumer pulse, market discovery | No (prospect/commercial layer) | Live |
| Google News RSS + Claude Haiku | Cultural signals — behavioural / linguistic / ritual / community | No (GA3 creative layer) | Live (cron) |
| Manual entry — 13 sources | S1 SoS, S2 Save Rate, S2B Share Rate, S3 UGC, S3B VCR, S4 Retention proxy, commerce signals | Yes — S1, S2, S2B, S3 are gate signals | Live (manual) |
| Not yet tracked | Instagram saves, YouTube watch time, GA4 direct traffic, Shopee wishlist, XHS, TikTok Search, AI mentions, social listening | Some gate-eligible | Gap |
| Deferred / planned | GrabAds (S4), Reddit Layer 2, F23 AI Discovery | Yes (S4, F23) | Roadmap |

---

## Immediate Actions

Three gaps with the highest return on investment to close before Sprint 7:

1. **Wire TikTok hashtag count → S3 weekly cron.** Actor already exists in the codebase. Add a hashtag field to the client record and a scheduled route. One sprint, low risk.

2. **Add Google Trends cron → S1 weekly automation.** Replaces the highest-friction manual entry in the signal stack. Removes the primary source of S1 data lag.

3. **Build GA4 direct traffic connector.** Unlocks the WA Echo Event detection — the evidential backbone of the WA Dark Loop winning strategy. Without it, the compounding advantage is real but invisible to the OS.

Everything else in this audit can wait until client use cases demand it.
