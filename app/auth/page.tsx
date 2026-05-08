"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { getSupabaseClient } from "@/lib/supabase";

export default function AuthPage() {
  const router = useRouter();
  const [tab, setTab] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setMessage(null);
    try {
      const supabase = getSupabaseClient();
      if (tab === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
        });
        if (error) throw error;

        const user = data.user;
        if (!user) {
          throw new Error("User not created during signup.");
        }

        // Save the display name to profiles table
        if (displayName.trim()) {
          const { error: profileError } = await supabase.from("profiles").upsert(
            {
              id: user.id,
              display_name: displayName.trim(),
            },
            { onConflict: "id" },
          );
          if (profileError) {
            console.error("Error upserting profile:", profileError);
            // Continue signup flow even if profile upsert fails, it's optional per previous comment.
          }
        }

        // Show a brief green success message
        setMessage("Account created successfully! Signing you in...");
        // Delay for a moment to show the message, then sign in and redirect
        await new Promise((resolve) => setTimeout(resolve, 1500)); // 1.5 seconds

        // Immediately call supabase.auth.signInWithPassword()
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });
        if (signInError) throw signInError;

        // Redirect to homepage /
        router.push("/");
        router.refresh();
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });
        if (error) throw error;
        router.push("/account");
        router.refresh();
      }
    } catch (err: unknown) {
      const m = err instanceof Error ? err.message : "Something went wrong.";
      setMessage(m);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0f0f1a] px-4 py-10 text-zinc-100">
      <div className="relative mx-auto max-w-md rounded-3xl border border-white/10 bg-[#161627]/90 p-8 shadow-xl">
        <h1 className="text-center text-2xl font-extrabold tracking-tight text-white">
          Student login
        </h1>
        <p className="mt-2 text-center text-sm text-zinc-400">
          Save streaks and appear on leaderboards.
        </p>

        <div className="mt-6 grid grid-cols-2 gap-2 rounded-xl border border-white/10 p-1">
          <button
            type="button"
            className={`rounded-lg px-3 py-2 text-sm font-semibold transition ${tab === "signin" ? "bg-[#7c3aed] text-white" : "text-zinc-400"}`}
            onClick={() => setTab("signin")}
          >
            Sign in
          </button>
          <button
            type="button"
            className={`rounded-lg px-3 py-2 text-sm font-semibold transition ${tab === "signup" ? "bg-[#7c3aed] text-white" : "text-zinc-400"}`}
            onClick={() => setTab("signup")}
          >
            Register
          </button>
        </div>

        <form onSubmit={submit} className="mt-6 space-y-4">
          {tab === "signup" && (
            <div>
              <label className="text-xs font-semibold uppercase tracking-wide text-[#f59e0b]">
                Display name
              </label>
              <input
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="mt-2 w-full rounded-xl border border-white/10 bg-[#0f0f1a] px-4 py-3 text-sm outline-none ring-0 transition focus:border-[#7c3aed]/55"
                placeholder="How others see you on leaderboards"
                autoComplete="nickname"
              />
            </div>
          )}
          <div>
            <label className="text-xs font-semibold uppercase tracking-wide text-[#f59e0b]">
              Email
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-2 w-full rounded-xl border border-white/10 bg-[#0f0f1a] px-4 py-3 text-sm outline-none ring-0 transition focus:border-[#7c3aed]/55"
              placeholder="you@school.edu"
              autoComplete="email"
            />
          </div>
          <div>
            <label className="text-xs font-semibold uppercase tracking-wide text-[#f59e0b]">
              Password
            </label>
            <input
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-2 w-full rounded-xl border border-white/10 bg-[#0f0f1a] px-4 py-3 text-sm outline-none ring-0 transition focus:border-[#7c3aed]/55"
              placeholder="••••••••"
              autoComplete={
                tab === "signup" ? "new-password" : "current-password"
              }
            />
          </div>

          {message && (
            <p className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-100">
              {message}
            </p>
          )}

          <button
            type="submit"
            disabled={busy}
            className="w-full rounded-xl bg-[#7c3aed] py-3.5 text-sm font-extrabold text-white shadow-lg shadow-[#7c3aed]/25 transition hover:bg-[#6d28d9] disabled:opacity-60"
          >
            {busy ? "Working…" : tab === "signin" ? "Sign in" : "Create account"}
          </button>
        </form>

        <div className="mt-8 text-center text-xs">
          <Link href="/" className="text-zinc-400 transition hover:text-white">
            ← Back home
          </Link>
        </div>
      </div>
    </div>
  );
}
