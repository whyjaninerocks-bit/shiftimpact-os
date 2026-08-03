"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const supabase = createClient();
    const redirectTo = `${window.location.origin}/auth/callback`;

    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: { emailRedirectTo: redirectTo, shouldCreateUser: true },
    });

    if (error) {
      setError(error.message);
      setLoading(false);
    } else {
      setSubmitted(true);
    }
  }

  return (
    <div className="min-h-screen bg-neutral-50 flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        {/* Logo mark */}
        <div className="mb-8 text-center">
          <p className="font-bold text-xl tracking-tight text-neutral-900">ShiftImpact</p>
          <p className="text-[10px] text-neutral-400 font-medium tracking-widest uppercase mt-0.5">OS</p>
        </div>

        <div className="bg-white border border-neutral-200 rounded-xl p-6 shadow-sm">
          {submitted ? (
            <div className="text-center py-4">
              <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-4">
                <svg className="w-5 h-5 text-emerald-600" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <p className="font-semibold text-neutral-900 mb-1">Check your email</p>
              <p className="text-sm text-neutral-500">
                We sent a sign-in link to <span className="font-medium text-neutral-700">{email}</span>.
                Click it to access the OS.
              </p>
              <button
                onClick={() => { setSubmitted(false); setEmail(""); }}
                className="mt-5 text-xs text-neutral-400 hover:text-neutral-600 underline underline-offset-2"
              >
                Use a different email
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <p className="text-base font-semibold text-neutral-900 mb-0.5">Sign in</p>
                <p className="text-sm text-neutral-500">Enter your email to receive a magic link.</p>
              </div>

              {error && (
                <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
                  {error}
                </div>
              )}

              <div>
                <label className="block text-xs font-medium text-neutral-500 mb-1" htmlFor="email">
                  Email address
                </label>
                <input
                  id="email"
                  type="email"
                  required
                  autoFocus
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-400"
                />
              </div>

              <button
                type="submit"
                disabled={loading || !email.trim()}
                className="w-full inline-flex items-center justify-center rounded-md bg-neutral-900 px-3 py-2 text-sm font-medium text-white hover:bg-neutral-700 disabled:opacity-50"
              >
                {loading ? "Sending…" : "Send magic link"}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
