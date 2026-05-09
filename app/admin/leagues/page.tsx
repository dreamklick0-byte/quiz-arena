"use client";

import { useState, useEffect, useMemo } from "react";
import { getSupabaseClient } from "@/lib/supabase";
import { SUBJECTS, getQuestionsForSubject } from "@/app/data/practiceQuestions";
import { PageShell } from "@/app/components/PageShell";
import Link from "next/link";

interface League {
  id: string;
  name: string;
  subject: string;
  entry_fee: number;
  current_players: number;
  max_players: number;
  status: string;
  created_at: string;
  ends_at: string;
}

export default function AdminLeaguesPage() {
  const [leagues, setLeagues] = useState<League[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Form State
  const [name, setName] = useState("");
  const [subject, setSubject] = useState(SUBJECTS[0].slug);
  const [entryFee, setEntryFee] = useState(100);
  const maxPlayers = 5000;
  const [duration, setDuration] = useState(24);
  const [numQuestions, setNumQuestions] = useState(10);
  const [startMode, setStartMode] = useState<"now" | "later">("now");
  const [startTime, setStartTime] = useState("");

  const STAKE_OPTIONS = [100, 200, 300, 500, 1000, 2000];

  const prizePreview = useMemo(() => {
    const minPlayers = 100;
    const minPool = entryFee * minPlayers;
    const platformRevenue = minPool * 0.40;
    const prizePool = minPool * 0.60;
    
    const first = prizePool * 0.50;
    const second = prizePool * 0.20;
    const third = prizePool * 0.10;
    const fourthTenth = (prizePool * 0.20) / 7;

    return { minPool, platformRevenue, prizePool, first, second, third, fourthTenth };
  }, [entryFee]);

  const loadLeagues = async () => {
    try {
      const supabase = getSupabaseClient();
      const { data, error: fetchError } = await supabase
        .from("leagues")
        .select("*")
        .order("created_at", { ascending: false });
      if (fetchError) throw fetchError;
      if (data) setLeagues(data);
    } catch (err) {
      console.error("Failed to load leagues:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLeagues();
  }, []);

  async function createLeague(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const supabase = getSupabaseClient();
      const startsAt = startMode === "now" ? new Date().toISOString() : new Date(startTime).toISOString();
      const endsAt = new Date(new Date(startsAt).getTime() + duration * 60 * 60 * 1000).toISOString();

      // Get questions for the league
      const allQuestions = getQuestionsForSubject(subject);
      if (!allQuestions || allQuestions.length < numQuestions) {
        throw new Error(`Not enough questions available for ${subject}. Need ${numQuestions}, have ${allQuestions?.length || 0}.`);
      }
      const leagueQuestions = allQuestions
        .sort(() => 0.5 - Math.random())
        .slice(0, numQuestions);

      const { error: insertError } = await supabase.from("leagues").insert({
        name,
        subject,
        entry_fee: entryFee,
        max_players: maxPlayers,
        duration_hours: duration,
        num_questions: numQuestions,
        starts_at: startsAt,
        ends_at: endsAt,
        guaranteed_first: prizePreview.first,
        guaranteed_second: prizePreview.second,
        guaranteed_third: prizePreview.third,
        guaranteed_fourth_tenth: prizePreview.fourthTenth,
        status: startMode === "now" ? 'open' : 'scheduled',
        questions: leagueQuestions
      });

      if (insertError) throw insertError;
      
      setName("");
      loadLeagues();
      alert("League created successfully!");
    } catch (err: unknown) {
      const error = err as Error;
      setError(error.message);
    } finally {
      setBusy(false);
    }
  }

  const labelClass = "text-xs font-bold uppercase tracking-widest text-zinc-500";
  const inputClass = "mt-2 w-full rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-white outline-none focus:border-[#7c3aed]";

  return (
    <PageShell overlay="rgba(15,15,26,0.95)">
      <div className="mx-auto max-w-6xl px-4 py-16">
        <header className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3">
              <Link href="/admin" className="text-zinc-500 hover:text-white transition">← Back</Link>
              <h1 className="text-4xl font-black text-white tracking-tight">🏆 LEAGUE MANAGEMENT</h1>
            </div>
            <p className="mt-2 text-zinc-500">Create and manage multi-player prize leagues.</p>
          </div>
        </header>
        
        <div className="mt-12 grid gap-8 lg:grid-cols-[1fr_400px]">
          {/* Create League Form */}
          <div className="rounded-3xl border border-white/10 bg-[#161627] p-8 shadow-xl">
            <h2 className="text-xl font-bold text-white">Create New League</h2>
            <form onSubmit={createLeague} className="mt-8 space-y-6">
              <div className="grid gap-6 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <label className={labelClass}>League Name</label>
                  <input
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className={inputClass}
                    placeholder="e.g. Bronze Weekly Battle"
                  />
                </div>

                <div>
                  <label className={labelClass}>Subject</label>
                  <select
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    className={inputClass}
                  >
                    {SUBJECTS.map(s => <option key={s.slug} value={s.slug}>{s.emoji} {s.title}</option>)}
                  </select>
                </div>

                <div>
                  <label className={labelClass}>Entry Fee</label>
                  <select
                    value={entryFee}
                    onChange={(e) => setEntryFee(Number(e.target.value))}
                    className={inputClass}
                  >
                    {STAKE_OPTIONS.map(amt => <option key={amt} value={amt}>₦{amt}</option>)}
                  </select>
                </div>

                <div>
                  <label className={labelClass}>Duration (Hours)</label>
                  <select
                    value={duration}
                    onChange={(e) => setDuration(Number(e.target.value))}
                    className={inputClass}
                  >
                    {[6, 12, 24, 48, 72].map(h => <option key={h} value={h}>{h} Hours</option>)}
                  </select>
                </div>

                <div>
                  <label className={labelClass}>Questions</label>
                  <select
                    value={numQuestions}
                    onChange={(e) => setNumQuestions(Number(e.target.value))}
                    className={inputClass}
                  >
                    {[10, 20, 30, 40, 50].map(q => <option key={q} value={q}>{q} Questions</option>)}
                  </select>
                </div>

                <div className="sm:col-span-2">
                  <label className={labelClass}>Start Time</label>
                  <div className="mt-2 flex gap-4">
                    <label className="flex items-center gap-2 text-sm text-white">
                      <input type="radio" checked={startMode === "now"} onChange={() => setStartMode("now")} />
                      Immediately
                    </label>
                    <label className="flex items-center gap-2 text-sm text-white">
                      <input type="radio" checked={startMode === "later"} onChange={() => setStartMode("later")} />
                      Schedule
                    </label>
                  </div>
                  {startMode === "later" && (
                    <input
                      type="datetime-local"
                      required
                      value={startTime}
                      onChange={(e) => setStartTime(e.target.value)}
                      className={inputClass}
                    />
                  )}
                </div>
              </div>

              {error && <p className="text-sm text-red-400">{error}</p>}

              <button
                disabled={busy}
                className="w-full rounded-2xl bg-[#7c3aed] py-4 text-sm font-black uppercase tracking-widest text-white transition hover:bg-[#6d28d9] disabled:opacity-50"
              >
                {busy ? "Creating..." : "Create League"}
              </button>
            </form>
          </div>

          {/* Prize Preview */}
          <div className="rounded-3xl border border-white/10 bg-black/30 p-8 h-fit">
            <h2 className="text-lg font-bold text-[#f59e0b] uppercase tracking-widest">Prize Preview</h2>
            <p className="text-[10px] text-zinc-500 uppercase font-bold mt-1">Based on 100 players</p>
            
            <div className="mt-6 space-y-3 font-mono text-sm">
              <div className="flex justify-between">
                <span className="text-zinc-500">Entry Fee:</span>
                <span className="text-white">₦{entryFee}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500">Min Pool (100 players):</span>
                <span className="text-white">₦{prizePreview.minPool}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500">Platform keeps (40%):</span>
                <span className="text-white">₦{prizePreview.platformRevenue}</span>
              </div>
              <div className="flex justify-between border-t border-white/10 pt-2 font-bold">
                <span className="text-emerald-400">Prize Pool (60%):</span>
                <span className="text-emerald-400">₦{prizePreview.prizePool}</span>
              </div>
            </div>

            <div className="mt-8 space-y-2 text-xs font-bold">
              <div className="flex justify-between">
                <span className="text-zinc-400">🥇 1st (50%):</span>
                <span className="text-white">₦{Math.floor(prizePreview.first)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-400">🥈 2nd (20%):</span>
                <span className="text-white">₦{Math.floor(prizePreview.second)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-400">🥉 3rd (10%):</span>
                <span className="text-white">₦{Math.floor(prizePreview.third)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-400">4th-10th each:</span>
                <span className="text-white">₦{Math.floor(prizePreview.fourthTenth)}</span>
              </div>
            </div>

            <p className="mt-10 text-center text-[10px] font-bold uppercase tracking-widest text-zinc-500">
              Prize grows with every player!
            </p>
          </div>
        </div>

        {/* Leagues Table */}
        <div className="mt-12 overflow-hidden rounded-3xl border border-white/10 bg-[#161627]">
          <table className="w-full text-left text-sm">
            <thead className="bg-black/40 text-xs font-bold uppercase tracking-widest text-zinc-500">
              <tr>
                <th className="px-6 py-4">League</th>
                <th className="px-6 py-4">Subject</th>
                <th className="px-6 py-4">Entry</th>
                <th className="px-6 py-4">Players</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Ends</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {loading ? (
                <tr><td colSpan={7} className="px-6 py-12 text-center text-zinc-500">Loading leagues...</td></tr>
              ) : leagues.length === 0 ? (
                <tr><td colSpan={7} className="px-6 py-12 text-center text-zinc-500">No leagues found.</td></tr>
              ) : leagues.map(l => (
                <tr key={l.id} className="text-zinc-300">
                  <td className="px-6 py-4 font-bold text-white">{l.name}</td>
                  <td className="px-6 py-4 capitalize">{l.subject.replace('_', ' ')}</td>
                  <td className="px-6 py-4">₦{l.entry_fee}</td>
                  <td className="px-6 py-4">{l.current_players} / {l.max_players}</td>
                  <td className="px-6 py-4">
                    <span className={`rounded-full px-2 py-1 text-[10px] font-bold uppercase ${
                      l.status === 'open' ? 'bg-emerald-500/20 text-emerald-400' : 
                      l.status === 'scheduled' ? 'bg-amber-500/20 text-amber-400' :
                      'bg-zinc-500/20 text-zinc-400'
                    }`}>
                      {l.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-xs">{new Date(l.ends_at).toLocaleString()}</td>
                  <td className="px-6 py-4 text-right">
                    <button 
                      onClick={async () => {
                        if(!confirm("Delete this league?")) return;
                        const supabase = getSupabaseClient();
                        await supabase.from("leagues").delete().eq("id", l.id);
                        loadLeagues();
                      }}
                      className="text-xs font-bold text-red-400 hover:text-red-300 transition"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </PageShell>
  );
}
