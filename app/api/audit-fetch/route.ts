import { NextRequest, NextResponse } from "next/server";

const APIFY_TOKEN = process.env.APIFY_API_TOKEN;
const APIFY_BASE = "https://api.apify.com/v2";

// ── Apify actor runner ────────────────────────────────────────────────────────
async function runApifyActor(actorId: string, input: Record<string, unknown>, timeoutSecs = 90) {
  const url = `${APIFY_BASE}/acts/${actorId}/run-sync-get-dataset-items?token=${APIFY_TOKEN}&timeout=${timeoutSecs}&maxItems=30`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Apify actor ${actorId} — ${res.status}: ${body.slice(0, 200)}`);
  }
  return res.json();
}

// ── Facebook Ad Library ───────────────────────────────────────────────────────
async function fetchFacebookAds(brandName: string, pageUrl?: string) {
  const input = pageUrl
    ? { startUrls: [{ url: pageUrl }], adType: "ALL", maxResults: 20 }
    : { searchTerms: [brandName], adType: "ALL", maxResults: 20 };

  const items = await runApifyActor("apify~facebook-ads-scraper", input);
  if (!Array.isArray(items) || items.length === 0) return { content: "", count: 0 };

  const lines = items.slice(0, 20).map((ad: Record<string, unknown>, i) => {
    const text = (ad.adCreativeBody || ad.body || ad.message || "No ad text") as string;
    const parts = [`[Facebook Ad ${i + 1}]\n${text.slice(0, 500)}`];
    if (ad.title) parts.push(`Title: ${ad.title}`);
    if (ad.ctaText) parts.push(`CTA: ${ad.ctaText}`);
    if (ad.impressionsLowerBound) parts.push(`Est. impressions: ${ad.impressionsLowerBound}–${ad.impressionsUpperBound}`);
    return parts.join("\n");
  });

  return {
    content: `=== Facebook Ad Library — ${items.length} active ads for "${brandName}" ===\n\n` + lines.join("\n\n---\n\n"),
    count: items.length,
  };
}

// ── Instagram brand posts ─────────────────────────────────────────────────────
async function fetchInstagramPosts(handle: string) {
  const clean = handle.replace(/^@/, "").replace(/https?:\/\/(www\.)?instagram\.com\/?/, "").replace(/\/$/, "");
  const items = await runApifyActor("apify~instagram-profile-scraper", {
    usernames: [clean],
    resultsType: "posts",
    resultsLimit: 20,
  });
  if (!Array.isArray(items) || items.length === 0) return { content: "", count: 0 };

  const lines = items.slice(0, 20).map((post: Record<string, unknown>, i) => {
    const caption = (post.caption || post.accessibilityCaption || "No caption") as string;
    const parts = [`[Instagram Post ${i + 1}]\n${caption.slice(0, 400)}`];
    if (post.likesCount) parts.push(`Likes: ${post.likesCount}${post.commentsCount ? `  Comments: ${post.commentsCount}` : ""}`);
    if (post.timestamp) parts.push(`Date: ${String(post.timestamp).slice(0, 10)}`);
    return parts.join("\n");
  });

  return {
    content: `=== Instagram (@${clean}) — ${items.length} posts ===\n\n` + lines.join("\n\n---\n\n"),
    count: items.length,
  };
}

// ── TikTok brand posts ────────────────────────────────────────────────────────
async function fetchTikTokPosts(handle: string) {
  const clean = handle.replace(/^@/, "");
  const items = await runApifyActor("clockworks~free-tiktok-scraper", {
    profiles: [`https://www.tiktok.com/@${clean}`],
    resultsPerPage: 20,
    shouldDownloadVideos: false,
  });
  if (!Array.isArray(items) || items.length === 0) return { content: "", count: 0 };

  const lines = items.slice(0, 20).map((post: Record<string, unknown>, i) => {
    const desc = (post.text || post.description || "No description") as string;
    const parts = [`[TikTok Video ${i + 1}]\n${desc.slice(0, 400)}`];
    if (post.playCount) parts.push(`Views: ${post.playCount}${post.diggCount ? `  Likes: ${post.diggCount}` : ""}`);
    return parts.join("\n");
  });

  return {
    content: `=== TikTok (@${clean}) — ${items.length} videos ===\n\n` + lines.join("\n\n---\n\n"),
    count: items.length,
  };
}

// ── KOL / hashtag search (Instagram + TikTok mentions) ───────────────────────
async function fetchKolHashtag(hashtag: string, platform: "instagram" | "tiktok") {
  const clean = hashtag.replace(/^#/, "");

  if (platform === "instagram") {
    const items = await runApifyActor("apify~instagram-hashtag-scraper", {
      hashtags: [clean],
      resultsLimit: 20,
    });
    if (!Array.isArray(items) || items.length === 0) return { content: "", count: 0 };

    const lines = items.slice(0, 20).map((post: Record<string, unknown>, i) => {
      const caption = (post.caption || "") as string;
      const owner = (post.ownerUsername || post.username || "unknown") as string;
      const likes = post.likesCount ? `Likes: ${post.likesCount}` : "";
      return `[KOL Post ${i + 1} — @${owner}]\n${caption.slice(0, 400)}${likes ? `\n${likes}` : ""}`;
    });

    return {
      content: `=== Instagram KOL posts for #${clean} — ${items.length} results ===\n\n` + lines.join("\n\n---\n\n"),
      count: items.length,
    };
  } else {
    // TikTok hashtag
    const items = await runApifyActor("clockworks~free-tiktok-scraper", {
      hashtags: [clean],
      resultsPerPage: 20,
      shouldDownloadVideos: false,
    });
    if (!Array.isArray(items) || items.length === 0) return { content: "", count: 0 };

    const lines = items.slice(0, 20).map((post: Record<string, unknown>, i) => {
      const desc = (post.text || post.description || "") as string;
      const author = (post.authorMeta as Record<string, unknown>)?.nickname || post.author || "unknown";
      const views = post.playCount ? `Views: ${post.playCount}` : "";
      return `[KOL TikTok ${i + 1} — @${author}]\n${desc.slice(0, 400)}${views ? `\n${views}` : ""}`;
    });

    return {
      content: `=== TikTok KOL videos for #${clean} — ${items.length} results ===\n\n` + lines.join("\n\n---\n\n"),
      count: items.length,
    };
  }
}

// ── Press / news coverage ─────────────────────────────────────────────────────
async function fetchPressCoverage(brandName: string, campaignName?: string) {
  const query = campaignName ? `"${brandName}" "${campaignName}"` : `"${brandName}" campaign marketing`;

  const items = await runApifyActor("apify~google-news-scraper", {
    queries: [{ query, gl: "MY", hl: "en" }],
    maxResultsPerQuery: 15,
  });

  if (!Array.isArray(items) || items.length === 0) return { content: "", count: 0 };

  const lines = items.slice(0, 15).map((item: Record<string, unknown>, i) => {
    const parts = [`[Press ${i + 1}] ${item.title || "No title"}`];
    if (item.source) parts.push(`Source: ${item.source}`);
    if (item.date) parts.push(`Date: ${item.date}`);
    if (item.description) parts.push(`\n${String(item.description).slice(0, 300)}`);
    if (item.url) parts.push(`URL: ${item.url}`);
    return parts.join("\n");
  });

  return {
    content: `=== Press / News Coverage for "${brandName}" — ${items.length} results ===\n\n` + lines.join("\n\n---\n\n"),
    count: items.length,
  };
}

// ── Radio partnership signals (brand mentions via news + press) ───────────────
async function fetchRadioPartnership(brandName: string) {
  const query = `"${brandName}" radio partnership sponsorship`;

  const items = await runApifyActor("apify~google-news-scraper", {
    queries: [{ query, gl: "MY", hl: "en" }],
    maxResultsPerQuery: 10,
  });

  if (!Array.isArray(items) || items.length === 0) {
    return {
      content: `=== Radio Partnership Search for "${brandName}" ===\n\nNo radio partnership news found. Add any known radio campaign details manually in the context box.`,
      count: 0,
    };
  }

  const lines = items.slice(0, 10).map((item: Record<string, unknown>, i) => {
    return `[Partnership ${i + 1}] ${item.title || "No title"}\nSource: ${item.source || "Unknown"}  Date: ${item.date || ""}\n${item.description ? String(item.description).slice(0, 300) : ""}`;
  });

  return {
    content: `=== Radio & Partnership Signals for "${brandName}" — ${items.length} results ===\n\n` + lines.join("\n\n---\n\n"),
    count: items.length,
  };
}

// ── Brand website scraper (no Apify needed) ───────────────────────────────────
async function fetchBrandWebsite(url: string): Promise<{ content: string; count: number }> {
  if (!url.startsWith("http")) url = `https://${url}`;

  const res = await fetch(url, {
    headers: { "User-Agent": "Mozilla/5.0 (compatible; ShiftImpactOS/1.0)" },
    signal: AbortSignal.timeout(15000),
  });

  if (!res.ok) throw new Error(`Website returned ${res.status}`);

  const html = await res.text();

  // Extract readable text: strip scripts/styles/tags, collapse whitespace
  const text = html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s{2,}/g, " ")
    .trim()
    .slice(0, 4000);

  if (text.length < 50) throw new Error("Page returned no readable content.");

  return {
    content: `=== Brand Website (${url}) ===\n\n${text}`,
    count: 1,
  };
}

// ── YouTube channel ───────────────────────────────────────────────────────────
async function fetchYouTubeChannel(channelUrl: string, brandName: string): Promise<{ content: string; count: number }> {
  // Normalise: accept handle, @handle, or full URL
  let startUrl = channelUrl;
  if (!startUrl.startsWith("http")) {
    const clean = channelUrl.replace(/^@/, "");
    startUrl = `https://www.youtube.com/@${clean}`;
  }

  const items = await runApifyActor("bernardo_castilho~youtube-videos-scraper", {
    startUrls: [startUrl],
    maxResults: 15,
    proxy: { useApifyProxy: true },
  });

  if (!Array.isArray(items) || items.length === 0) {
    // Fallback: search brand name on YouTube via Google News
    return fetchPressCoverage(brandName, "YouTube video");
  }

  const lines = items.slice(0, 15).map((v: Record<string, unknown>, i) => {
    const parts = [`[YouTube Video ${i + 1}] ${v.title || "No title"}`];
    if (v.description) parts.push(String(v.description).slice(0, 300));
    if (v.viewCount) parts.push(`Views: ${v.viewCount}`);
    if (v.uploadDate) parts.push(`Date: ${v.uploadDate}`);
    return parts.join("\n");
  });

  return {
    content: `=== YouTube (${startUrl}) — ${items.length} videos ===\n\n` + lines.join("\n\n---\n\n"),
    count: items.length,
  };
}

// ── Handler ───────────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as {
      platform: string;
      handle?: string;
      brand_name?: string;
      campaign_name?: string;
      page_url?: string;
      website_url?: string;
      hashtag?: string;
      kol_platform?: "instagram" | "tiktok";
    };

    const { platform, handle, brand_name, campaign_name, page_url, website_url, hashtag, kol_platform } = body;

    // Website scraping works without Apify
    if (platform === "website") {
      if (!website_url) return NextResponse.json({ error: "Website URL required." }, { status: 400 });
      const result = await fetchBrandWebsite(website_url);
      return NextResponse.json({ content: result.content, count: result.count, platform });
    }

    if (!APIFY_TOKEN) {
      return NextResponse.json(
        {
          error:
            "Apify is not configured. Add APIFY_API_TOKEN to your Vercel environment variables to enable auto-fetching. Get a free token at apify.com.",
          setup_required: true,
        },
        { status: 400 }
      );
    }

    let result: { content: string; count: number };

    switch (platform) {
      case "facebook_ads":
        result = await fetchFacebookAds(brand_name ?? "", page_url);
        break;
      case "instagram":
        if (!handle) return NextResponse.json({ error: "Instagram handle required." }, { status: 400 });
        result = await fetchInstagramPosts(handle);
        break;
      case "tiktok":
        if (!handle) return NextResponse.json({ error: "TikTok handle required." }, { status: 400 });
        result = await fetchTikTokPosts(handle);
        break;
      case "youtube":
        if (!handle && !website_url) return NextResponse.json({ error: "YouTube channel handle or URL required." }, { status: 400 });
        result = await fetchYouTubeChannel(handle ?? website_url ?? "", brand_name ?? "");
        break;
      case "kol_hashtag":
        if (!hashtag) return NextResponse.json({ error: "Hashtag required." }, { status: 400 });
        result = await fetchKolHashtag(hashtag, kol_platform ?? "instagram");
        break;
      case "press":
        result = await fetchPressCoverage(brand_name ?? "", campaign_name);
        break;
      case "radio_partnership":
        result = await fetchRadioPartnership(brand_name ?? "");
        break;
      default:
        return NextResponse.json({ error: "Unknown platform." }, { status: 400 });
    }

    return NextResponse.json({ content: result.content, count: result.count, platform });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Fetch failed";
    console.error("[audit-fetch]", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
