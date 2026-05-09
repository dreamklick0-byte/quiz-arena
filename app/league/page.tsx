"use client";

import { useState, useEffect } from "react";
import { getSupabaseClient } from "@/lib/supabase";
import { getSubjectMeta } from "@/app/data/practiceQuestions";
import { PageShell } from "@/app/components/PageShell";
import { getWalletBalance, processTransaction } from "@/lib/wallet";

export default function LeaguePage() {
  const [leagues, setLeagues] = useState<any[]>([]);
  const [userEntries, setUserEntries] = useState<string[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    loadLeagues();
    checkUser();
  }, []);

  async function checkUser() {
    const supabase = getSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    setUser(user);
    if (user) {
      const { data } = await supabase
        .from("league_entries")
        .select("league_id")
        .eq("user_id", user.id);
      if (data) setUserEntries(data.map(e => e.league_id));
    }
  }

  async function loadLeagues() {
    const supabase = getSupabaseClient();
    const { data } = await supabase
      .from("leagues")
      .select("*")
      .neq("status", "completed")
      .order("starts_at", { ascending: true });
    if (data) setLeagues(data);
  }

  async function joinLeague(league: any) {
    if (!user) {
      alert("Please sign in to join leagues.");
      return;
    }
    setBusy(league.id);
    setError(null);
    try {
      const balance = await getWalletBalance(user.id);
      if (balance < league.entry_fee) {
        throw new Error(`Insufficient balance. You need ₦${league.entry_fee}. Your balance: ₦${balance}.`);
      }

      await processTransaction(
        user.id,
        'stake',
        league.entry_fee,
        `league-${league.id}`,
        `Joined League: ${league.name}`
      );

      const supabase = getSupabaseClient();
      const { error: joinError } = await supabase.from("league_entries").insert({
        league_id: league.id,
        user_id: user.id,
        display_name: localStorage.getItem("playerName") || "Anonymous"
      });

      if (joinError) throw joinError;

      // Increment player count
      const { data: currentLeague } = await supabase
        .from("leagues")
        .select("current_players, entry_fee")
        .eq("id", league.id)
        .single();
      
      if (currentLeague) {
        const newCount = (currentLeague.current_players || 0) + 1;
        const newPool = newCount * currentLeague.entry_fee;
        await supabase
          .from("leagues")
          .update({ 
            current_players: newCount,
            prize_pool: newPool * 0.60,
            platform_revenue: newPool * 0.40
          })
          .eq("id", league.id);
      }

      setUserEntries([...userEntries, league.id]);
      alert("Joined successfully! Good luck!");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setBusy(null);
    }
  }

  return (
    <PageShell overlay="rgba(15,15,26,0.85)">
      <div className="mx-auto max-w-4xl px-4 py-10">
        <header className="text-center">
          <h1 className="text-4xl font-black text-white tracking-tight">🏆 Quiz Leagues</h1>
          <p className="mt-3 text-zinc-400">Join thousands of players and win massive prizes.</p>
        </header>

        {error && (
          <div className="mt-8 rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200 text-center">
            {error}
          </div>
        )}

        <div className="mt-12 grid gap-6 sm:grid-cols-2">
          {leagues.map(l => {
            const isJoined = userEntries.includes(l.id);
            const meta = getSubjectMeta(l.subject);
            const timeRemaining = new Date(l.ends_at).getTime() - Date.now();
            const hoursLeft = Math.floor(timeRemaining / (1000 * 60 * 60));
            const minsLeft = Math.floor((timeRemaining % (1000 * 60 * 60)) / (1000 * 60));

            return (
              <div key={l.id} className="relative rounded-3xl border border-white/10 bg-[#161627]/80 p-6 shadow-xl backdrop-blur-sm overflow-hidden">
                <div className="flex items-center justify-between">
                  <span className="rounded-full bg-[#7c3aed]/20 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-[#7c3aed]">
                    {l.status}
                  </span>
                  <div className="flex items-center gap-1 text-[10px] font-bold text-zinc-500">
                    <span>👥</span>
                    <span>{l.current_players} / {l.max_players}</span>
                  </div>
                </div>

                <h3 className="mt-4 text-xl font-black text-white">{l.name}</h3>
                <p className="text-sm text-zinc-400">{meta?.emoji} {meta?.title} · ₦{l.entry_fee} entry</p>

                <div className="mt-6 rounded-2xl bg-black/40 p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-zinc-500 uppercase tracking-widest">💰 Prize Pool</span>
                    <span className="text-lg font-black text-[#f59e0b]">₦{l.prize_pool || (l.entry_fee * 100 * 0.6)}</span>
                  </div>
                  <div className="mt-4 grid grid-cols-2 gap-3 text-[10px] font-bold">
                    <div className="rounded-lg bg-white/5 p-2 text-center">
                      <p className="text-zinc-500 uppercase">🥇 1st Wins</p>
                      <p className="mt-1 text-white">₦{Math.floor(l.guaranteed_first)}</p>
                    </div>
                    <div className="rounded-lg bg-white/5 p-2 text-center">
                      <p className="text-zinc-500 uppercase">🥈 2nd Wins</p>
                      <p className="mt-1 text-white">₦{Math.floor(l.guaranteed_second)}</p>
                    </div>
                  </div>
                </div>

                <div className="mt-6 flex items-center justify-between text-[11px] font-bold">
                  <div className="text-zinc-500 uppercase tracking-widest">
                    ⏳ {hoursLeft}h {minsLeft}m left
                  </div>
                  <div className="text-[#f59e0b] animate-pulse">
                    🔥 Prize grows as more join!
                  </div>
                </div>

                <button
                  onClick={() => joinLeague(l)}
                  disabled={busy === l.id || isJoined}
                  className={`mt-6 w-full rounded-2xl py-4 text-sm font-black uppercase tracking-widest transition shadow-lg ${
                    isJoined 
                      ? "bg-zinc-800 text-zinc-500 cursor-default" 
                      : "bg-[#7c3aed] text-white hover:bg-[#6d28d9] shadow-[#7c3aed]/20"
                  }`}
                >
                  {isJoined ? "✓ ALREADY JOINED" : busy === l.id ? "JOINING..." : `JOIN FOR ₦${l.entry_fee}`}
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </PageShell>
  );
}
