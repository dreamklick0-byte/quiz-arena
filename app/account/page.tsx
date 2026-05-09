"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getSupabaseClient } from "@/lib/supabase";

type StreakRow = {
  current_streak: number;
  longest_streak: number;
  last_activity_date: string;
};

export default function AccountPage() {
  const router = useRouter();
  const [email, setEmail] = useState<string | null>(null);
  const [streak, setStreak] = useState<StreakRow | null>(null);
  const [profileName, setProfileName] = useState<string>("");
  const [isEditingName, setIsEditingName] = useState(false);
  const [newName, setNewName] = useState("");
  const [loading, setLoading] = useState(true);
  const [matchHistory, setMatchHistory] = useState<any[]>([]);

  const fetchMatchHistory = async (userId: string) => {
    const supabase = getSupabaseClient();
    const { data } = await supabase
      .from("room_players")
      .select("*, battle_rooms(subject, stake_amount, room_code, created_at)")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(5);
    setMatchHistory(data || []);
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const supabase = getSupabaseClient();
      const { data: sessionData } = await supabase.auth.getSession();
      const user = sessionData.session?.user;
      if (!user) {
        router.replace("/auth");
        return;
      }
      if (cancelled) return;
      setEmail(user.email ?? null);

      const { data: profile } = await supabase
        .from("profiles")
        .select("display_name")
        .eq("id", user.id)
        .maybeSingle();
      if (profile?.display_name) {
        setProfileName(profile.display_name);
        setNewName(profile.display_name);
      }

      fetchMatchHistory(user.id);

      const { data: s } = await supabase
        .from("user_streaks")
        .select("current_streak, longest_streak, last_activity_date")
        .eq("user_id", user.id)
        .maybeSingle();

      if (!cancelled) {
        setStreak((s as StreakRow) ?? null);
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [router]);

  const updateName = async () => {
    if (!newName.trim()) return;
    const supabase = getSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase
      .from("profiles")
      .upsert({ id: user.id, display_name: newName.trim() });

    if (!error) {
      setProfileName(newName.trim());
      setIsEditingName(false);
    }
  };

  const signOut = async () => {
    const supabase = getSupabaseClient();
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0f0f1a] px-4 py-16 text-center text-sm text-zinc-400">
        Loading account…
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0f0f1a] px-4 py-10 text-zinc-100">
      <div className="mx-auto max-w-lg space-y-6">
        <div className="rounded-3xl border border-white/10 bg-[#161627]/90 p-6">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h1 className="text-2xl font-extrabold text-white">Your progress</h1>
              {isEditingName ? (
                <div className="mt-2 flex gap-2">
                  <input
                    type="text"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    className="flex-1 rounded-lg border border-white/10 bg-black/40 px-3 py-1 text-sm outline-none focus:border-[#7c3aed]"
                    autoFocus
                  />
                  <button onClick={updateName} className="text-xs font-bold text-[#7c3aed]">Save</button>
                  <button onClick={() => setIsEditingName(false)} className="text-xs font-bold text-zinc-500">Cancel</button>
                </div>
              ) : (
                <div className="mt-1 flex items-center gap-2">
                  <p className="text-sm text-zinc-400">
                    {profileName || "Student"} · {email}
                  </p>
                  <button onClick={() => setIsEditingName(true)} className="text-[10px] text-[#7c3aed] hover:underline">Edit</button>
                </div>
              )}
            </div>
          </div>

          <div className="mt-6 grid grid-cols-2 gap-3">
            <div className="rounded-2xl border border-[#f59e0b]/30 bg-[#f59e0b]/10 p-4 text-center">
              <p className="text-xs font-semibold uppercase tracking-wide text-[#f59e0b]">
                Streak
              </p>
              <p className="mt-2 text-3xl font-black tabular-nums text-white">
                {streak?.current_streak ?? 0}
              </p>
              <p className="mt-1 text-[11px] text-zinc-400">days in a row</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-[#0f0f1a]/60 p-4 text-center">
              <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                Best streak
              </p>
              <p className="mt-2 text-3xl font-black tabular-nums text-white">
                {streak?.longest_streak ?? 0}
              </p>
              <p className="mt-1 text-[11px] text-zinc-400">personal record</p>
            </div>
          </div>

          {streak?.last_activity_date && (
            <p className="mt-4 text-center text-xs text-zinc-500">
              Last activity (UTC): {streak.last_activity_date}
            </p>
          )}
        </div>

        {/* Match History */}
        <div className="rounded-3xl border border-white/10 bg-[#161627]/90 p-6">
          <h2 className="text-lg font-bold text-white">Recent Battles</h2>
          <div className="mt-4 space-y-3">
            {matchHistory.length === 0 ? (
              <p className="text-xs text-zinc-500">No recent battles found. Go play some!</p>
            ) : (
              matchHistory.map((match, i) => (
                <div key={i} className="flex items-center justify-between rounded-xl border border-white/5 bg-white/[0.02] p-3">
                  <div>
                    <p className="text-sm font-bold text-white uppercase tracking-tight">
                      {match.battle_rooms?.subject?.replace('_', ' ') || "Battle"}
                    </p>
                    <p className="text-[10px] text-zinc-500">
                      ₦{match.battle_rooms?.stake_amount || 0} Stake · {new Date(match.battle_rooms?.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className={`text-sm font-black ${match.score > 0 ? 'text-emerald-400' : 'text-zinc-500'}`}>
                      {match.score} Pts
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row">
          <Link
            href="/leaderboard"
            className="flex-1 rounded-xl border border-white/10 bg-[#7c3aed]/20 py-3 text-center text-sm font-semibold text-white transition hover:bg-[#7c3aed]/30"
          >
            View leaderboards
          </Link>
          <button
            type="button"
            onClick={signOut}
            className="flex-1 rounded-xl border border-white/15 py-3 text-sm font-semibold text-zinc-300 transition hover:border-red-500/40 hover:text-red-200"
          >
            Sign out
          </button>
        </div>

        <p className="text-center text-xs text-zinc-500">
          <Link href="/" className="underline hover:text-white">
            Home
          </Link>
        </p>
      </div>
    </div>
  );
}
