"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { getSupabaseClient } from "@/lib/supabase";

export function SiteHeader() {
  const [email, setEmail] = useState<string | null>(null);
  const [streak, setStreak] = useState<number | null>(null);

  useEffect(() => {
    const supabase = getSupabaseClient();
    supabase.auth.getSession().then(({ data }) => {
      setEmail(data.session?.user.email ?? null);
      const uid = data.session?.user.id;
      if (uid) {
        void (async () => {
          try {
            const { data: row } = await supabase
              .from("user_streaks")
              .select("current_streak")
              .eq("user_id", uid)
              .maybeSingle();
            const n = row?.current_streak;
            setStreak(typeof n === "number" ? n : 0);
          } catch {
            setStreak(null);
          }
        })();
      } else {
        setStreak(null);
      }
    });
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_evt, session) => {
      setEmail(session?.user.email ?? null);
      const uid = session?.user.id;
      if (!uid) {
        setStreak(null);
        return;
      }
      void (async () => {
        try {
          const { data: row } = await supabase
            .from("user_streaks")
            .select("current_streak")
            .eq("user_id", uid)
            .maybeSingle();
          const n = row?.current_streak;
          setStreak(typeof n === "number" ? n : 0);
        } catch {
          setStreak(null);
        }
      })();
    });
    return () => subscription.unsubscribe();
  }, []);

  return (
    <header className="sticky top-0 z-40 border-b border-white/10 bg-[#0f0f1a]/90 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 text-xs font-medium">
        <nav className="flex flex-wrap items-center gap-3 text-zinc-400">
          <Link href="/" className="transition hover:text-white">
            Home
          </Link>
          <Link href="/practice/maths" className="transition hover:text-white">
            Practice
          </Link>
          <Link href="/battle" className="transition hover:text-[#f59e0b]">
            Battle
          </Link>
          <Link href="/leaderboard" className="transition hover:text-[#f59e0b]">
            Leaderboard
          </Link>
          <Link href="/admin" className="transition hover:text-zinc-300">
            Admin
          </Link>
        </nav>
        <div className="flex shrink-0 items-center gap-2">
          {typeof streak === "number" && streak > 0 && (
            <Link
              href="/account"
              title="Study streak"
              className="hidden rounded-full border border-[#f59e0b]/40 bg-[#f59e0b]/15 px-2.5 py-1 text-[11px] font-bold text-[#f59e0b] sm:inline"
            >
              🔥 {streak}
            </Link>
          )}
          {email ? (
            <>
              <span className="hidden max-w-[140px] truncate text-zinc-500 sm:inline">
                {email}
              </span>
              <Link
                href="/account"
                className="rounded-lg border border-white/15 px-3 py-1.5 text-[11px] font-semibold text-white transition hover:border-[#7c3aed]/50"
              >
                Account
              </Link>
            </>
          ) : (
            <Link
              href="/auth"
              className="rounded-lg bg-[#7c3aed] px-3 py-1.5 text-[11px] font-semibold text-white shadow-sm transition hover:bg-[#6d28d9]"
            >
              Sign in
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
