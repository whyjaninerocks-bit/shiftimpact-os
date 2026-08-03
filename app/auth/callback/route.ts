import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/clients";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      // Redirect to the originally-requested page or default
      const redirectTo = next.startsWith("/") ? `${origin}${next}` : `${origin}/clients`;
      return NextResponse.redirect(redirectTo);
    }
  }

  // Auth failure — back to login with error hint
  return NextResponse.redirect(`${origin}/login?error=auth`);
}
