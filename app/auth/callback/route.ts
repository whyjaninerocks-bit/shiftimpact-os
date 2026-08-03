import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const next = requestUrl.searchParams.get("next") ?? "/clients";
  const errorParam = requestUrl.searchParams.get("error");
  const errorDescription = requestUrl.searchParams.get("error_description");

  // Build the base URL — on Vercel, x-forwarded-host is more reliable than request.url
  const forwardedHost = request.headers.get("x-forwarded-host");
  const forwardedProto = request.headers.get("x-forwarded-proto") ?? "https";
  const baseUrl = forwardedHost
    ? `${forwardedProto}://${forwardedHost}`
    : requestUrl.origin;

  // Surface Supabase-level errors (e.g. expired link)
  if (errorParam) {
    const msg = encodeURIComponent(errorDescription ?? errorParam);
    return NextResponse.redirect(`${baseUrl}/login?error=${msg}`);
  }

  if (code) {
    try {
      const supabase = await createClient();
      const { error } = await supabase.auth.exchangeCodeForSession(code);
      if (!error) {
        const destination = next.startsWith("/") ? `${baseUrl}${next}` : `${baseUrl}/clients`;
        return NextResponse.redirect(destination);
      }
      // Exchange failed — redirect with debug info
      const msg = encodeURIComponent(error.message);
      return NextResponse.redirect(`${baseUrl}/login?error=${msg}`);
    } catch (e) {
      const msg = encodeURIComponent(String(e));
      return NextResponse.redirect(`${baseUrl}/login?error=${msg}`);
    }
  }

  // No code — send back to login
  return NextResponse.redirect(`${baseUrl}/login?error=no_code`);
}
