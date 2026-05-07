"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
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

  useEffect(() => {
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

  return (
    <div className="min-h-screen bg-[#0f0f1a] px-4 py-10 text-zinc-100">
      <div className="mx-auto max-w-lg">
        <header className="text-center">
          <h1 className="text-3xl font-extrabold text-white">Leaderboard</h1>
          <p className="mt-2 text-sm text-zinc-400">
            Top battle wins per subject (signed-in players).
          </p>
        </header>

        <div className="mt-8">
          <label className="text-xs font-semibold uppercase tracking-wide text-[#f59e0b]">
            Subject
          </label>
          <select
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            className="mt-2 w-full rounded-xl border border-white/10 bg-[#161627] px-4 py-3 text-sm text-white outline-none focus:border-[#7c3aed]/55"
          >
            {SUBJECTS.map((s) => (
              <option key={s.slug} value={s.slug}>
                {s.emoji} {s.title}
              </option>
            ))}
          </select>
        </div>

        <div className="mt-8 rounded-2xl border border-white/10 bg-[#161627]/80 p-5">
          <h2 className="text-lg font-bold text-white">{title}</h2>
          {loading ? (
            <p className="mt-4 text-sm text-zinc-400">Loading rankings…</p>
          ) : error ? (
            <p className="mt-4 text-sm text-amber-200">
              {error}
              <span className="mt-2 block text-xs text-zinc-500">
                Run <code className="text-zinc-300">supabase/migrations/</code>{" "}
                SQL in Supabase if tables are missing.
              </span>
            </p>
          ) : rows.length === 0 ? (
            <p className="mt-4 text-sm text-zinc-400">
              No wins logged yet — win a logged-in battle to appear here.
            </p>
          ) : (
            <ol className="mt-4 space-y-2">
              {rows.map((r, i) => (
                <li
                  key={`${r.user_id}-${i}`}
                  className="flex items-center justify-between rounded-xl border border-white/10 bg-[#0f0f1a]/50 px-4 py-3"
                >
                  <div className="flex items-center gap-3">
                    <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-black/35 text-xs font-bold text-[#7c3aed]">
                      {i + 1}
                    </span>
                    <span className="text-sm font-semibold text-white">
                      {r.player_label?.trim() || "Player"}
                    </span>
                  </div>
                  <span className="font-mono text-sm font-bold text-[#f59e0b]">
                    {r.wins}{" "}
                    <span className="text-xs font-normal text-zinc-400">
                      wins
                    </span>
                  </span>
                </li>
              ))}
            </ol>
          )}
        </div>

        <p className="mt-8 text-center text-xs">
          <Link href="/battle" className="text-[#7c3aed] hover:underline">
            ⚔️ Battle Arena
          </Link>
          {" · "}
          <Link href="/" className="text-zinc-400 hover:text-white">
            Home
          </Link>
        </p>
      </div>
    </div>
  );
}
