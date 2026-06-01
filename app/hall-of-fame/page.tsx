"use client";

import { useEffect, useState } from "react";
import { getSupabaseClient } from "@/lib/supabase";
import { PageShell } from "@/app/components/PageShell";
import Link from "next/link";

interface HallEntry {
  id: string;
  month: string;
  year: number;
  best_school_name: string;
  best_school_logo: string | null;
  best_student_name: string;
  best_student_school: string;
  school_score: number;
  student_accuracy: number;
  student_wins: number;
}

export default function HallOfFamePage() {
  const [entries, setEntries] = useState<HallEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const sb = getSupabaseClient();
      const { data } = await sb
        .from("hall_of_fame")
        .select("*")
        .order("year", { ascending: false })
        .order("month", { ascending: false })
        .limit(12);
      setEntries(data || []);
      setLoading(false);
    };
    load();
  }, []);

  const generateCertNumber = (id: string, type: string) => {
    return `QA-${type.toUpperCase()[0]}${id.slice(0,4).toUpperCase()}-${Date.now().toString(36).slice(-4).toUpperCase()}`;
  };

  const monthNames: Record<string, string> = {
    "1":"January","2":"February","3":"March","4":"April",
    "5":"May","6":"June","7":"July","8":"August",
    "9":"September","10":"October","11":"November","12":"December"
  };

  return (
    <PageShell overlay="rgba(15,15,26,0.85)">
      <div className="mx-auto max-w-6xl px-4 py-16 text-white">
        <section className="rounded-3xl border border-white/10 bg-white/5 p-10 shadow-2xl shadow-black/20 backdrop-blur-xl">
          <div className="mb-10 flex items-start gap-4">
            <div className="text-5xl">🏆</div>
            <div>
              <h1 className="text-5xl font-black tracking-tight">Hall of Fame</h1>
              <p className="text-zinc-300 mt-3 text-lg">Nigeria's top quiz champions — celebrated every month</p>
              <p className="mt-3 text-zinc-400">Awards given on the 1st of every month</p>
            </div>
          </div>

          {loading ? (
            <div className="rounded-3xl border border-dashed border-white/10 bg-white/5 p-16 text-center text-zinc-300">
              Loading Hall of Fame...
            </div>
          ) : entries.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-white/10 bg-white/5 p-16 text-center">
              <div className="text-5xl mb-4">🌟</div>
              <h2 className="text-3xl font-bold mb-2">No Winners Yet</h2>
              <p className="text-zinc-400 mb-6">The first awards will be given at the end of this month.</p>
              <p className="text-zinc-500 mb-8">Keep competing — your school or name could be first!</p>
              <Link href="/battle" className="inline-flex rounded-full bg-[#f59e0b] px-6 py-3 font-bold text-black hover:bg-[#e6950a] transition">
                Start Competing →
              </Link>
            </div>
          ) : (
            <div className="space-y-8">
              {entries.map((entry, i) => (
                <div key={entry.id} className="rounded-3xl border border-white/10 bg-black/20 p-8 shadow-2xl shadow-black/20">
                  <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                    <div>
                      <div className="text-sm uppercase tracking-[0.35em] text-[#f59e0b] mb-2">{i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : "🏅"} Monthly Champions</div>
                      <h2 className="text-3xl font-black">{monthNames[entry.month]} {entry.year}</h2>
                    </div>
                    {i === 0 && (
                      <span className="rounded-full bg-emerald-500/15 px-4 py-2 text-sm font-semibold text-emerald-200">Latest</span>
                    )}
                  </div>

                  <div className="grid gap-6 lg:grid-cols-2">
                    <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
                      <div className="mb-4 text-sm uppercase tracking-[0.35em] text-zinc-400">🏫 Best School</div>
                      <div className="flex items-center gap-4">
                        <div className="h-16 w-16 rounded-3xl bg-white/5 flex items-center justify-center text-2xl text-zinc-300">
                          {entry.best_school_logo ? (
                            <img src={entry.best_school_logo} alt={entry.best_school_name} className="h-16 w-16 rounded-3xl object-cover" />
                          ) : (
                            <span>🏫</span>
                          )}
                        </div>
                        <div>
                          <div className="text-xl font-bold">{entry.best_school_name}</div>
                          <div className="text-zinc-400">Score: {entry.school_score.toFixed(1)}</div>
                          <div className="mt-3">
                            <Link href={`/certificate?type=school&name=${encodeURIComponent(entry.best_school_name)}&month=${encodeURIComponent(entry.month)}&year=${entry.year}&cert=${generateCertNumber(entry.id,'school')}`}
                              className="mt-3 inline-flex rounded-full bg-[#f59e0b] px-4 py-2 text-sm font-bold text-black hover:bg-[#e6950a] transition">Download Certificate</Link>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
                      <div className="mb-4 text-sm uppercase tracking-[0.35em] text-zinc-400">⭐ Best Student</div>
                      <div className="flex items-start gap-4">
                        <div className="mt-1 text-2xl">👤</div>
                        <div>
                          <div className="text-xl font-bold">{entry.best_student_name}</div>
                          <div className="text-zinc-400 mb-2">{entry.best_student_school}</div>
                          <div className="text-zinc-400 text-sm">
                            {entry.student_accuracy}% accuracy · {entry.student_wins} wins
                          </div>
                          <div className="mt-3">
                            <Link href={`/certificate?type=student&name=${encodeURIComponent(entry.best_student_name)}&school=${encodeURIComponent(entry.best_student_school)}&month=${encodeURIComponent(entry.month)}&year=${entry.year}&wins=${entry.student_wins}&accuracy=${entry.student_accuracy}&cert=${generateCertNumber(entry.id,'student')}`}
                              className="mt-3 inline-flex rounded-full bg-[#f59e0b] px-4 py-2 text-sm font-bold text-black hover:bg-[#e6950a] transition">Download Certificate</Link>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="mt-12 rounded-3xl border border-white/10 bg-white/5 p-8">
            <h3 className="text-2xl font-black mb-6">🎯 How to Win</h3>
            <div className="grid gap-6 lg:grid-cols-2">
              <div className="space-y-4">
                <div className="text-lg font-bold">🏫 Best School Criteria</div>
                {[
                  {label:"Class Accuracy", pct:"35%", desc:"Average correct answers across all subjects"},
                  {label:"Student Engagement", pct:"25%", desc:"Percentage of students active weekly"},
                  {label:"Most Improved", pct:"20%", desc:"Growth compared to previous month"},
                  {label:"Battles Per Student", pct:"20%", desc:"Effort score normalized by school size"},
                ].map(c => (
                  <div key={c.label} className="rounded-2xl border border-white/10 bg-black/10 p-4">
                    <div className="text-sm text-zinc-400">{c.pct}</div>
                    <div className="font-semibold">{c.label}</div>
                    <div className="text-zinc-500 text-sm">{c.desc}</div>
                  </div>
                ))}
              </div>

              <div className="space-y-4">
                <div className="text-lg font-bold">⭐ Best Student Criteria</div>
                {[
                  {label:"Accuracy Rate", pct:"40%", desc:"Percentage of questions answered correctly"},
                  {label:"Consistency", pct:"25%", desc:"Battle streak and regular participation"},
                  {label:"Subject Breadth", pct:"20%", desc:"Competed in 3 or more different subjects"},
                  {label:"Most Improved", pct:"15%", desc:"Growth compared to previous month"},
                ].map(c => (
                  <div key={c.label} className="rounded-2xl border border-white/10 bg-black/10 p-4">
                    <div className="text-sm text-zinc-400">{c.pct}</div>
                    <div className="font-semibold">{c.label}</div>
                    <div className="text-zinc-500 text-sm">{c.desc}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-8 rounded-3xl border border-white/10 bg-white/5 p-6 text-zinc-300">
              <p>Winners receive a downloadable certificate and are featured here for the entire month.</p>
              <p className="mt-2">Awards are calculated automatically on the 1st of every month.</p>
            </div>
          </div>
        </section>
      </div>
    </PageShell>
  );
}
