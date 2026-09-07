import { SectionHeading } from "./reportUi";

// ─── Coming soon — client-facing teaser cards ────────────────────────────────
// Social Currency Index and AI Brand Visibility already have schema + internal
// fetchers (see lib/data.ts getSocialCurrencyScore / getAiBrandVisibilityScore)
// but need a manual weekly strategist-input UI before they're worth surfacing
// — see the "Backlog: Social Currency Index + AI Brand Visibility" memory.
// Rather than build nothing until that ships, this borrows the sales demo's
// locked "Requires: X" teaser pattern: sets expectation honestly (this is
// real, coming, not fabricated) without pretending it's live today. Each
// card is individually hidden once its score actually starts flowing for
// this campaign — see `show` props below — so this section quietly
// disappears item-by-item rather than needing manual cleanup later.

function TeaserCard({
  title,
  description,
  requires,
}: {
  title: string;
  description: string;
  requires: string;
}) {
  return (
    <div className="rounded-2xl border border-dashed border-neutral-300 bg-neutral-50/60 p-4">
      <div className="flex items-center gap-2 mb-1.5">
        <span className="text-neutral-300 text-sm">🔒</span>
        <p className="text-sm font-semibold text-neutral-500">{title}</p>
      </div>
      <p className="text-xs text-neutral-400 leading-relaxed mb-2">{description}</p>
      <p className="text-[10px] font-semibold text-neutral-400 uppercase tracking-wide">
        Requires: {requires}
      </p>
    </div>
  );
}

export function ComingSoonSection({
  showSocialCurrency,
  showAiVisibility,
}: {
  showSocialCurrency: boolean;
  showAiVisibility: boolean;
}) {
  if (!showSocialCurrency && !showAiVisibility) return null;

  return (
    <section id="coming-soon" className="space-y-3 scroll-mt-20">
      <SectionHeading title="What's coming next" subtitle="Already on the roadmap for this campaign" />
      <div className="grid sm:grid-cols-2 gap-3">
        {showSocialCurrency && (
          <TeaserCard
            title="Social Currency Index"
            description="How much your audience is talking about you unprompted, tracked weekly."
            requires="weekly strategist input"
          />
        )}
        {showAiVisibility && (
          <TeaserCard
            title="AI Brand Visibility"
            description="Whether AI assistants (ChatGPT, Gemini, etc.) mention your brand when people ask about your category."
            requires="weekly strategist input"
          />
        )}
      </div>
    </section>
  );
}
