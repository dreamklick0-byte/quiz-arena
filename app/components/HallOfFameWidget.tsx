"use client";

import { useEffect, useState } from "react";
import { getSupabaseClient } from "@/lib/supabase";
import Link from "next/link";

interface HallEntry {
  month: string;
  year: number;
  best_school_name: string;
  best_school_logo: string | null;
  best_student_name: string;
  best_student_school: string;
  student_accuracy: number;
  student_wins: number;
}

export default function HallOfFameWidget() {
  const [latest, setLatest] = useState<HallEntry | null>(null);

  useEffect(() => {
    const load = async () => {
      const sb = getSupabaseClient();
      const { data } = await sb
        .from("hall_of_fame")
        .select("*")
        .order("year", { ascending: false })
        .order("month", { ascending: false })
        .limit(1)
        .single();
      if (data) setLatest(data);
    };
    load();
  }, []);

  const monthNames: Record<string, string> = {
    "1":"January","2":"February","3":"March","4":"April",
    "5":"May","6":"June","7":"July","8":"August",
    "9":"September","10":"October","11":"November","12":"December"
  };

  return (
    <section className="relative overflow-hidden rounded-3xl border border-white/10 bg-white/5 px-6 py-10 shadow-2xl shadow-black/20 text-white mx-auto max-w-6xl my-16">
      <div className="grid gap-10 lg:grid-cols-[1.1fr_auto] items-center">
        <div>
          <div className="inline-flex items-center gap-3 rounded-full bg-[#f59e0b]/10 px-4 py-2 text-sm font-semibold text-[#f59e0b]">
            🏆 Hall of Fame
          </div>
          <h2 className="mt-4 text-4xl font-black tracking-tight">Nigeria's top quiz champions — awarded every month</h2>
          <p className="mt-4 max-w-2xl text-zinc-300">Check the latest Hall of Fame winners, then compete to see your school or name featured next month.</p>
        </div>

        <div className="rounded-3xl border border-white/10 bg-black/20 p-6 text-center">
          {latest ? (
            <>
              <div className="text-sm uppercase tracking-[0.35em] text-zinc-400 mb-2">{monthNames[latest.month]} {latest.year} Champions</div>
              <div className="text-2xl font-black">{latest.best_school_name}</div>
              <div className="mt-4 rounded-3xl bg-white/5 p-4">
                <div className="text-sm text-zinc-400">🏫 Best School</div>
                <div className="mt-2 text-lg font-semibold">{latest.best_school_name}</div>
              </div>
              <div className="mt-4 rounded-3xl bg-white/5 p-4">
                <div className="text-sm text-zinc-400">⭐ Best Student</div>
                <div className="mt-2 text-lg font-semibold">{latest.best_student_name}</div>
                <div className="text-zinc-400 mt-1 text-sm">{latest.best_student_school}</div>
                <div className="text-zinc-300 mt-2 text-sm">
                  {latest.student_accuracy}% accuracy · {latest.student_wins} wins
                </div>
              </div>
            </>
          ) : (
            <div className="space-y-4 py-12">
              <div className="text-5xl">🌟</div>
              <div className="text-2xl font-black">First awards coming soon!</div>
              <p className="text-zinc-400">Compete now to be among the first champions.</p>
            </div>
          )}

          <Link
            href="/hall-of-fame"
            className="mt-6 inline-flex rounded-full bg-[#f59e0b] px-6 py-3 text-sm font-bold text-black hover:bg-[#e6950a] transition"
          >
            View Full Hall of Fame →
          </Link>
        </div>
      </div>
    </section>
  );
}
