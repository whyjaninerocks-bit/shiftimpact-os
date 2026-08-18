"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function AuthCallbackPage() {
  const router = useRouter();

  useEffect(() => {
    const supabase = createClient();

    // With implicit flow, the access_token is in the URL hash.
    // @supabase/ssr's createBrowserClient automatically exchanges the hash
    // token for a session on initialisation — we just need to wait for it.
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (event === "SIGNED_IN" && session) {
          // Get the intended destination from the query string, default to /clients
          const params = new URLSearchParams(window.location.search);
          const next = params.get("next") ?? "/clients";
          router.replace(next.startsWith("/") ? next : "/clients");
        }
        if (event === "SIGNED_OUT" || (!session && event !== "INITIAL_SESSION")) {
          router.replace("/login?error=auth_failed");
        }
      }
    );

    // Also handle the case where session is already set (e.g. page reload)
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        const params = new URLSearchParams(window.location.search);
        const next = params.get("next") ?? "/clients";
        router.replace(next.startsWith("/") ? next : "/clients");
      }
    });

    return () => subscription.unsubscribe();
  }, [router]);

  return (
    <div className="min-h-screen bg-neutral-50 flex items-center justify-center">
      <div className="text-center">
        <div className="w-8 h-8 border-2 border-neutral-300 border-t-neutral-700 rounded-full animate-spin mx-auto mb-3" />
        <p className="text-sm text-neutral-500">Signing you in…</p>
      </div>
    </div>
  );
}
