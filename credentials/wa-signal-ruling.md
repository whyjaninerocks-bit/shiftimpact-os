# WhatsApp Signal Ruling — Deployment Playbook

**The ruling:** Every campaign managed by ShiftImpact OS deploys WhatsApp tactics in a phased sequence, each tactic timed to the campaign stage and calibrated to move a specific behaviour signal forward. WA is not a supplementary channel — it is the amplification and attribution layer that closes the loop between social exposure and purchase, in the market where 90.7% of consumers are on WhatsApp every day.

This ruling is binding across all campaigns from the brief stage. Agency receives WA brief alongside the social content brief. Failure to deploy the right WA tactic at the right phase is treated the same as a brief compliance failure on any other deliverable.

---

## The Signal Cascade (with WA as the accelerant)

```
WEEK 1–2         WEEK 3–5         WEEK 5–6         WEEK 6–8         WEEK 8+
   ↓                 ↓                ↓                ↓               ↓
[AWARENESS]    [AMPLIFICATION]  [CONSIDERATION]  [CONVERSION]    [RETENTION]
Save Rate      UGC Growth       Brand Search     Retail Velocity  Repeat Purchase
   S1               S2               S3               S4             Loop
   ↑                ↑                ↑                ↑               ↑
WA Tactic 1    WA Tactic 2      WA Tactic 3      WA Tactic 4    WA Tactic 5
```

WA tactics do not replace signal work — they amplify what is already moving and close the loop where the signal would otherwise die in dark channels.

---

## Phase 1 — Awareness (Week 1–3)
**Target signal:** S1 Save Rate  
**Gate to unlock:** 8% save-to-impression ratio  
**WA tactic deployed:** Forward-worthy content architecture

### The ruling
Before any content is published, creative must be reviewed against the WA forward test: *"Would a Malaysian woman forward this to her family WhatsApp group tonight?"* If the answer is no, the brief is not approved.

### Mandatory content design rules for WA forwardability
1. **Cultural timing trigger** — content references a meal occasion relevant to the current calendar week (weekend family cooking, upcoming festive period, school holiday). Timeless content does not get forwarded; timely content does.
2. **Shortlist format** — "3 dishes for Raya", "5 meals from one paste" — list structure is WhatsApp-native because it answers the group chat question "what should I cook."
3. **Price-value anchor** — one explicit value statement in caption or video (cost per serving, number of meals per packet). Malaysian household groups share value tips. This is not a discount signal — it is a practicality signal.
4. **No hard sell in the first 5 seconds** — WA sharing is peer endorsement. Anything that reads as advertising gets dropped from the forward. The brand appears naturally.

### How the OS reads loop close
Save rate spike (Day X) + direct/dark traffic spike (Day X+2) = WhatsApp amplification confirmed. The OS flags this as a "WA Echo Event" in the Signal Log. If save rate is healthy but the WA echo does not appear within 72 hours, the content passed the save test but failed the forward test — brief is flagged for format revision.

---

## Phase 2 — Amplification (Week 3–5)
**Target signal:** S2 UGC Volume  
**Gate to unlock:** 65 pieces at Day 30, growing week-on-week  
**WA tactic deployed:** KOL dark social drop

### The ruling
Every KOL contract includes one mandatory dark social deliverable alongside the public TikTok/Reel:
- KOL shares the recipe video to their personal family/friends WhatsApp group
- KOL screenshots group chat reaction (all names blurred)
- KOL publishes the reaction screenshot as a follow-up TikTok within 48 hours of the primary post

This creates a chain: public content → private validation → public proof of private validation. The reaction screenshot post is almost always higher-performing than the original because it shows real people responding, not a polished creator performing.

### Trigger condition
This tactic fires when S1 (save rate) has reached 50% of its gate threshold — meaning the content is proving intent but UGC has not yet ignited organically. The KOL dark social drop seeds the "permission to recreate" signal in the community that the consumer needs to see before they generate their own content.

### How the OS reads loop close
UGC count on tracking tools (Manual Log or AI scrape) grows in the week following KOL dark social drops. If UGC does not grow within 5 days of a KOL drop, the brief framing is the problem — consumers are not feeling the "I can do this too" prompt. Flag for creative recalibration.

---

## Phase 3 — Consideration (Week 5–6)
**Target signal:** S3 Brand Search Lift  
**Gate to unlock:** 18% brand search lift vs pre-campaign baseline  
**WA tactic deployed:** Recipe card community drop

### The ruling
A designed recipe card (static image, A5 or square format, Canva-ready) is produced for every campaign alongside video content. At Week 5, if brand search lift is below 12% (trending below gate), the recipe card is distributed through:
1. Brand's own WhatsApp Channel (broadcast to all subscribers)
2. KOL's WhatsApp community groups (included in KOL contract as deliverable)
3. Any relevant food community WhatsApp groups the agency has organic access to

Static images forward through WhatsApp without compression loss or autoplay interruption. They are the most frictionless sharing format in the Malaysian market for this purpose.

### Why this moves brand search
A consumer who saves a video may never revisit it. A consumer who receives a recipe card in a group chat reads it in that moment and if they want to make the dish, searches the brand name. The recipe card is a direct search trigger with the brand visually anchored.

### Trigger condition
Fires at Week 5 if S3 (brand search lift) is below 12%. If S3 is already above 15%, the card drop still happens but is framed as conversion-stage content (move to Phase 4 timing).

### How the OS reads loop close
Brand search lift in Google Search Console accelerates within 48–72 hours of a recipe card drop. Direct/dark traffic to any brand link also spikes. Both are logged as WA Echo Events confirming the card reached the target audience.

---

## Phase 4 — Conversion (Week 6–8)
**Target signal:** S4 Retail velocity / GrabMart add-to-cart  
**Gate to unlock:** Retail velocity +25% vs baseline (or GrabMart CTR above threshold when live)  
**WA tactic deployed:** WhatsApp Channel exclusive promo code

### The ruling
A unique promo code — usable only at GrabMart, the brand's e-commerce, or a retail partner — is created for every campaign and distributed exclusively through the brand's WhatsApp Channel. It is not posted on TikTok, Instagram, or any public platform. Channel exclusivity serves two functions:
1. It gives consumers a reason to subscribe to the Channel (owned audience building)
2. It creates a closed-loop attribution event: code redemption = dark social → purchase conversion, no vendor required

### Trigger condition
Fires at Week 6 when brand search confirms intent (S3 met) but retail velocity has not yet reflected the campaign uplift. The promo code is the purchase trigger that closes the intent-to-conversion gap.

### Promo code rules
- Time-limited (7 days maximum) to create urgency for forwarding
- Shareable by design — Channel subscribers are encouraged to forward to their groups (this extends reach without spending)
- Tracked via unique redemption code in retailer/GrabMart dashboard — this is the one dark social conversion event the OS can read cleanly without Meta API or GrabAds contract

### How the OS reads loop close
Promo code redemption rate added to Signal Log as a Conversion Gate proxy. If redemption rate is above 5%, conversion gate is considered met. Retail velocity in the same period is cross-referenced. If promo redemptions are high but retail velocity (broader, non-code purchases) does not move, the campaign is driving deal-seekers not brand adopters — flag for Phase 5 strategy adjustment.

---

## Phase 5 — Retention (Week 8+)
**Target signal:** Repeat purchase rate >30% in 60 days; organic UGC growing month-on-month  
**Gate to unlock:** Sustained brand posture improvement, not campaign-driven spikes  
**WA tactic deployed:** WhatsApp Channel content cadence

### The ruling
After a campaign closes, the WhatsApp Channel continues publishing at minimum once per week. The Channel is the owned retention asset — the only post-campaign signal that the brand controls and that does not require continued media spend to reach the audience.

### Channel cadence rules
- Week 1 post-campaign: Recap the campaign moment ("Here's what the community made")
- Week 2: New recipe idea using the same product (keeps meal occasion top of mind)
- Week 3: Consumer spotlight — one organic UGC piece re-shared with permission (fuels further UGC)
- Week 4: Next cultural moment teaser (seeds the next campaign's timing trigger)

This 4-week loop repeats. It requires no budget, no agency production, no platform algorithms. It operates on the only platform in Malaysia where the brand has guaranteed delivery to an opted-in audience.

### How the OS reads loop close
Channel subscriber count growth = owned retention audience expanding. If the channel loses subscribers post-campaign, the retention content is not valuable enough — brief is flagged. If UGC continues growing post-campaign with no active spend, the Channel content cadence is working as the organic amplification sustainer.

---

## The WA Echo Pattern — OS Detection Rule

The OS reads the following pattern as a confirmed WhatsApp amplification event and logs it in the Signal Log automatically:

| Day X event | Day X+2 signal | OS interpretation |
|---|---|---|
| S1 (save rate) spikes >20% above baseline | Direct/dark traffic spikes | WA forward event confirmed |
| Recipe card drop | Brand search lifts | WA → search intent confirmed |
| KOL dark social drop | UGC count increases | Community seeding worked |
| WA Channel code sent | Promo redemption uptick | Dark social → purchase close |

If the Day X event fires but the Day X+2 signal does NOT appear within the window, the OS flags a "WA loop failure" — meaning content was saved but not forwarded, which points to a forward-worthiness gap in the content design. This is a brief compliance issue in the next cycle.

---

## Phase-to-Tactic Quick Reference

| Phase | Week | Signal Targeted | WA Tactic | Trigger |
|---|---|---|---|---|
| Awareness | 1–3 | Save Rate (S1) | Forward-worthy content design | At launch — pre-condition, not reactive |
| Amplification | 3–5 | UGC Volume (S2) | KOL dark social drop | When S1 hits 50% of gate |
| Consideration | 5–6 | Brand Search (S3) | Recipe card community drop | When S3 below 12% at Week 5 |
| Conversion | 6–8 | Retail velocity (S4) | WA Channel promo code | When S3 met but S4 not moving |
| Retention | 8+ | Repeat purchase | WA Channel weekly cadence | Post-campaign, ongoing |

---

## Anti-Spam Guardrails — Mandatory

The WA ruling is powerful precisely because it is rare. The moment consumers perceive a brand's WhatsApp presence as noise, they exit the Channel and the loop breaks permanently. These guardrails are non-negotiable across every campaign.

### Frequency hard limits

| Phase | WA tactic | Maximum frequency per campaign |
|---|---|---|
| Awareness | Forward-worthy content design | 1 anchor content piece per week (not every post needs WA optimisation — only the hero piece) |
| Amplification | KOL dark social drop | 1 per KOL per campaign — never ask a KOL to drop the same brand twice in one campaign |
| Consideration | Recipe card community drop | 1 card drop per campaign. One. Not one per week. |
| Conversion | WA Channel promo code | 1 code per campaign, 7-day window. No reminders. No "last chance" messages. |
| Retention | Channel weekly cadence | 1 post per week maximum. Skipping a week is acceptable. Doubling up is not. |

**Total WA Channel pushes across an 8-week campaign: maximum 8 messages.** Roughly one per week. If the team is tempted to send more, it means the content is not good enough and the instinct is to compensate with volume. Fix the content, not the frequency.

### Quality gates before any WA send

Before any message is sent through the WA Channel or a KOL dark social drop is triggered, it must pass three checks:

1. **Utility test:** Does this give the recipient something useful — a recipe, a saving, a tip — right now? If the honest answer is "no, it's just a brand message," it does not go out.
2. **Timing test:** Is there a natural reason for this to arrive today? (Cultural moment, meal planning window, weekend ahead, festive proximity.) If it feels random, it is random. Hold it.
3. **Would-I-forward test:** Would a regular consumer voluntarily send this to their WhatsApp group? If not, it is not forward-worthy and should not be sent via WA. It can be posted on social instead.

### What is explicitly banned

- Sending more than one WA Channel message in any 7-day period during active campaign
- Reminders ("Did you see our last message?", "Offer ends soon" follow-ups)
- Any message that does not include useful content — no pure brand announcements, no campaign launch announcements without accompanying value
- Asking consumers to share or forward in the message itself — if the content is good, they will. If it needs a nudge, it is not good enough
- Cross-campaign code reuse — every promo code must be unique per campaign so consumers do not feel they are receiving the same mechanic repeatedly

### The one-campaign limit per tactic

Each WA tactic deploys once per campaign phase, not once per week. The full 5-tactic sequence across an 8-week campaign results in 5 high-value WA moments. That is the correct volume. A consumer who experiences 5 genuinely useful WA touches across 8 weeks will increase trust. A consumer who experiences 5 touches in 2 weeks will exit.

---

## What this ruling protects against

**Without this ruling, campaigns follow the standard path:** content posted → engagement metrics reported → campaign ends → no sustained signal → next campaign starts from zero. The brand never compounds.

**With this ruling:** Each WA tactic creates a signal that feeds the next stage. The Channel subscriber base grows campaign over campaign. The UGC library grows. The brand search baseline rises permanently (not just during spend). By the third campaign with the same client, the OS is reading a brand that is self-sustaining — where organic signals fire before paid media is activated because the community WhatsApp presence is doing the priming work. That is what compounding intelligence looks like in the Malaysian market.
