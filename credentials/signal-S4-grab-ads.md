# Signal 4 — GrabAds: Malaysia Market Credential

**Signal definition:** Impression-to-action rates from GrabAds placements (GrabFood, GrabMart, transport screen) — specifically add-to-cart rates, restaurant/product taps, and repeat order signals attributable to campaign exposure.  
**Status in OS:** Deferred signal — architecture designed, not yet live. Priority integration earmarked once OOH partnership expands. GrabAds designated as the primary integration partner.  
**Classification (when live):** Lead signal for Conversion stage — the only signal that closes the loop between social intent and real transaction data.

---

## Why GrabAds is the right conversion-stage signal for Malaysia

### Grab's market position is unmatched for purchase-intent data

GrabAds is one of Southeast Asia's fastest-growing retail media platforms. Advertising revenue grew 60% year on year to $176M in 2024, running at an annualised $216M run-rate by Q4 2024. More importantly: over 60% of active Grab users purchase goods or services every time they open the app — across GrabFood, GrabMart, GrabFin, and transport. This is not a social engagement platform. It is a transaction platform that also carries advertising. The data it generates is first-party, purchase-verified, and near-real-time.

Source: [Grab Inside Grab — GrabAds SEA](https://www.grab.com/inside-grab/stories/grabads-advertising-southeast-asia/) · [GabGrowth GrabAds Analysis](https://gabgrowth.com/p/grabs-potential-4th-pillar-grabads)

### Kantar validation: 2 out of 3 SEA consumers prioritise on-demand access

GrabAds and Kantar joint research found that 2 out of 3 Southeast Asians surveyed prioritise on-demand access to products and services. For food brands specifically, this means the purchase moment is increasingly happening in-app — not at the supermarket shelf. A cooking ingredient brand that generates save rate and UGC lift on TikTok but does not have GrabMart availability is leaving the most measurable conversion signal inaccessible.

Source: [Grab Retail Media Networks + Kantar](https://www.grab.com/inside-grab/stories/retail-media-networks-grabads-kantar-advertising/)

### What GrabAds uniquely provides

No other signal in the stack provides what GrabAds does: the transaction close. Every other signal (save rate, UGC, brand search) measures pre-purchase intent. GrabAds measures: did the consumer, having seen a brand's content on TikTok, then add to GrabMart cart within 72 hours? That is a complete attribution arc, brand-safe, and without depending on third-party pixel data.

For the Malaysian market specifically, where F&B is among the top 3 advertising categories and GrabFood/GrabMart has penetrated urban Klang Valley daily routines, this is not a premium-only capability. It is table stakes for any FMCG client with GrabMart distribution.

Source: [MARKETECH APAC — Malaysia Digital Advertising H1 2025](https://marketech-apac.com/malaysias-digital-advertising-market-showed-strong-momentum-in-the-first-half-of-2025-report/)

### Why it's deferred (not deprioritised)

The GrabAds signal requires a data-sharing agreement between the client, Grab, and ShiftImpact OS. It cannot be self-served from platform analytics — it requires either a managed GrabAds campaign with attribution reporting, or a data partnership. Neither can be operationalised without the client's commercial relationship with Grab in place. The signal architecture is already designed in the OS schema; the activation dependency is client-side, not a product gap.

When an OOH partnership expands to include path-to-purchase attribution (device-level data from billboard exposure → GrabMart purchase), GrabAds becomes the integration node that closes the full offline-to-online loop.

---

## Interim approach (before GrabAds activation)

Until GrabAds data is available, the OS uses retail velocity (Klang Valley SKU movement, provided by client or distributor) as the Conversion gate proxy. This is the baseline-delta method: compare SKU off-take in campaign weeks vs the 4-week pre-campaign baseline. The delta measures real purchase impact without needing Grab's data.

Clients who have neither GrabMart data nor retail velocity data are flagged in onboarding as "signal-limited" and the OS adjusts the prediction confidence interval accordingly.

---

## Signal in the OS (when live)

- **Lead signal** for Conversion stage — fires at Week 4–8
- **Gate role:** GrabMart add-to-cart rate above threshold is the conversion gate signal, enabling the OS to recommend scaling spend
- **Unique value:** Only signal that closes the social → transaction loop without third-party pixel dependency
- **Feeds:** Revenue lift calculation, media ROI by channel, prediction accuracy loop
