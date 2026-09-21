import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";

// Paths accessible without authentication
const PUBLIC_PREFIXES = ["/login", "/auth/callback", "/portal", "/s/", "/api/", "/decide", "/growth-sprint/share"];

// External users (org_type Partner/Client on user_profiles) are confined to
// this narrow set of authenticated paths, on top of the always-public
// prefixes above. Firewall prototype — smallest safe guard: a Supabase
// session alone used to be enough to reach every internal OS page, since
// those pages use the admin client with no row scoping. This closes that
// gap without touching internal access or building a dashboard.
const EXTERNAL_ALLOWED_PREFIXES = ["/culture-review", "/account"];

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  // Always allow public paths (including /api/ — routes use admin client for security)
  if (PUBLIC_PREFIXES.some((p) => pathname.startsWith(p))) {
    return NextResponse.next({ request });
  }

  let supabaseResponse = NextResponse.next({ request });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    return supabaseResponse;
  }

  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
        cookiesToSet.forEach(({ name, value }: { name: string; value: string }) =>
          request.cookies.set(name, value),
        );
        supabaseResponse = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }: { name: string; value: string; options: CookieOptions }) =>
          supabaseResponse.cookies.set(name, value, options),
        );
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    // If there's an auth code on the URL, route it to the callback handler
    // instead of losing it by redirecting to /login. The normal case (see
    // app/login/page.tsx) is the code already landing on /auth/callback
    // with its own next param attached — that value must be preserved,
    // not overwritten with the current pathname (which in that case is
    // just "/auth/callback" itself, a useless self-referential value that
    // would strand every login, culture-review invites included, back on
    // the callback screen). Only synthesize next from the current pathname
    // when rescuing a code that landed somewhere else entirely, or when
    // whatever next is already present isn't a safe internal path — same
    // internal-relative-path rule /login and /auth/callback already apply.
    const code = request.nextUrl.searchParams.get("code");
    if (code) {
      const callbackUrl = request.nextUrl.clone();
      const existingNext = callbackUrl.searchParams.get("next");
      const existingNextIsSafe =
        !!existingNext && existingNext.startsWith("/") && !existingNext.startsWith("//");
      callbackUrl.pathname = "/auth/callback";
      if (!existingNextIsSafe) {
        callbackUrl.searchParams.set("next", pathname);
      }
      return NextResponse.redirect(callbackUrl);
    }

    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/login";
    loginUrl.searchParams.delete("code");
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // External-user guard. Fails closed: a user with no user_profiles row,
  // or any org_type other than 'ShiftImpact', is treated as external, not
  // internal. Only checked for paths outside the always-allowed set above,
  // so this costs one extra query per request on internal OS pages —
  // negligible today, worth revisiting if that ever matters.
  if (!EXTERNAL_ALLOWED_PREFIXES.some((p) => pathname.startsWith(p))) {
    const { data: profile } = await supabase
      .from("user_profiles")
      .select("org_type")
      .eq("id", user.id)
      .maybeSingle();

    const isInternal = profile?.org_type === "ShiftImpact";

    if (!isInternal) {
      return new NextResponse(
        "Access restricted. Use the culture review link you were given, or contact ShiftImpact.",
        { status: 403 },
      );
    }
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|api/|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
