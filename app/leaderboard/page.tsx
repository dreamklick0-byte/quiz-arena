"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, useCallback } from "react";
import { SUBJECTS } from "@/app/data/practiceQuestions";
import { getSupabaseClient } from "@/lib/supabase";

type Row = {
  user_id: string;
  wins: number;
  player_label: string | null;
  subject: string;
};

export default function LeaderboardPage() {
  const [subject, setSubject] = useState(SUBJECTS[0]?.slug ?? "maths");
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const title = useMemo(
    () => SUBJECTS.find((s) => s.slug === subject)?.title ?? subject,
    [subject],
  );

  const fetchLeaderboard = useCallback(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    const supabase = getSupabaseClient();
    supabase
      .from("user_subject_wins")
      .select("user_id, wins, player_label, subject")
      .eq("subject", subject)
      .order("wins", { ascending: false })
      .limit(25)
      .then(({ data, error: err }) => {
        if (cancelled) return;
        if (err) setError(err.message);
        else setRows((data as Row[]) ?? []);
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [subject]);

  useEffect(() => {
    const fetchTimeout = setTimeout(() => fetchLeaderboard(), 0);
    return () => clearTimeout(fetchTimeout);
  }, [fetchLeaderboard]);

  return (
    <div className="min-h-screen relative bg-[#0f0f1a] text-zinc-100 overflow-x-hidden">
      {/* BACKGROUND IMAGE */}
      <img
        src="https://images.unsplash.com/photo-1567427017947-545c5f8d16ad?w=1920&q=80"
        alt=""
        className="fixed inset-0 w-full h-full object-cover pointer-events-none"
        style={{ opacity: 0.07 }}
      />
      <div className="fixed inset-0 bg-[#0f101a]/93 pointer-events-none z-0" />

      <div className="relative z-10">
        {/* HERO BANNER */}
        <div
          className="py-16 text-center relative overflow-hidden"
          style={{ background: "linear-gradient(135deg, #1a1a2e, #16213e)" }}
        >
          <img
            src="https://images.unsplash.com/photo-1574629810360-7efbbe195018?w=1920&q=80"
            className="absolute inset-0 w-full h-full object-cover"
            style={{ opacity: 0.15 }}
            alt=""
          />
          <div className="absolute inset-0 bg-[#1a1a2e]/60" />
          <div className="relative z-10 px-4">
            <h1 className="text-white text-5xl font-black">Leaderboard</h1>
            <p className="text-zinc-300 text-lg mt-2">
              Top students. Real rankings. Monthly cash prizes for the top 10.
            </p>
          </div>
        </div>

        <div className="mx-auto max-w-lg px-4 py-10">
          <div className="mt-2">
            <label className="text-xs font-semibold uppercase tracking-wide text-[#f59e0b]">
              Filter By Subject
            </label>
            <select
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="mt-2 w-full rounded-xl border border-white/10 bg-[#161627]/90 px-4 py-3 text-sm text-white outline-none focus:border-[#7c3aed]/55 backdrop-blur-sm"
            >
              {SUBJECTS.map((s) => (
                <option key={s.slug} value={s.slug}>
                  {s.emoji} {s.title}
                </option>
              ))}
            </select>
          </div>

          <div className="mt-8 rounded-3xl border border-white/10 bg-[#161627]/60 p-6 backdrop-blur-md shadow-2xl">
            <h2 className="text-xl font-black text-white flex items-center gap-2">
              <span className="text-2xl">🏆</span> {title} Rankings
            </h2>
            {loading ? (
              <p className="mt-6 text-sm text-zinc-400 animate-pulse">Loading top performers…</p>
            ) : error ? (
              <p className="mt-6 text-sm text-amber-200">
                {error}
                <span className="mt-2 block text-xs text-zinc-500">
                  Run <code className="text-zinc-300">supabase/migrations/</code>{" "}
                  SQL in Supabase if tables are missing.
                </span>
              </p>
            ) : rows.length === 0 ? (
              <p className="mt-6 text-sm text-zinc-400 italic">
                No wins logged yet — be the first to win a battle in this subject!
              </p>
            ) : (
              <ol className="mt-6 space-y-3">
                {rows.map((r, i) => (
                  <li
                    key={`${r.user_id}-${i}`}
                    className="flex items-center justify-between rounded-2xl border border-white/5 bg-[#0f0f1a]/40 px-5 py-4 transition-all hover:bg-white/5 group"
                  >
                    <div className="flex items-center gap-4">
                      <span className={`flex h-9 w-9 items-center justify-center rounded-xl font-black text-sm shadow-lg ${
                        i === 0 ? "bg-yellow-500 text-black shadow-yellow-500/20" :
                        i === 1 ? "bg-zinc-300 text-black shadow-zinc-300/20" :
                        i === 2 ? "bg-orange-500 text-black shadow-orange-500/20" :
                        "bg-white/5 text-[#7c3aed]"
                      }`}>
                        {i + 1}
                      </span>
                      <span className="text-base font-bold text-white group-hover:translate-x-1 transition-transform">
                        {r.player_label?.trim() || "Player"}
                      </span>
                    </div>
                    <div className="text-right">
                      <div className="font-mono text-lg font-black text-[#f59e0b]">
                        {r.wins}
                      </div>
                      <div className="text-[10px] uppercase tracking-tighter text-zinc-500 font-bold">
                        Wins
                      </div>
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </div>

          <div className="mt-12 flex justify-center gap-6">
            <Link href="/battle" className="text-sm font-black text-[#7c3aed] hover:scale-105 transition-transform">
              ⚔️ BATTLE ARENA
            </Link>
            <Link href="/" className="text-sm font-bold text-zinc-500 hover:text-white transition-colors">
              BACK TO HOME
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
