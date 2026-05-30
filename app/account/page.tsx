"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getSupabaseClient } from "@/lib/supabase";
import { getWalletBalance } from "@/lib/wallet";
import { StreakCalendar } from "@/app/components/StreakSystem";
import { NotificationPreferences } from "@/app/components/NotificationSettings";

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
  const [balance, setBalance] = useState<number>(0);
  const [selectedState, setSelectedState] = useState<string>("");

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
        .select("display_name, state")
        .eq("id", user.id)
        .maybeSingle();
      if (profile?.display_name) {
        setProfileName(profile.display_name);
        setNewName(profile.display_name);
      }
      if (profile?.state) setSelectedState(profile.state);

      fetchMatchHistory(user.id);
      const b = await getWalletBalance(user.id);
      setBalance(b);

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

  const saveState = async () => { 
    const supabase = getSupabaseClient(); 
    const { data: sessionData } = await supabase.auth.getSession(); 
    const user = sessionData.session?.user; 
    if (!user) return; 
    await supabase.from("profiles").upsert( 
      { id: user.id, state: selectedState }, 
      { onConflict: "id" } 
    ); 
    alert("State saved!"); 
  }; 

  const updateName = async () => {
    if (!newName.trim()) return;
    const supabase = getSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase
      .from("profiles")
      .upsert({ id: user.id, display_name: newName.trim(), state: selectedState });

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
      <div className="min-h-screen bg-[#0f0f1a] flex items-center justify-center text-zinc-400">
        <div className="animate-pulse flex flex-col items-center gap-3">
          <div className="w-12 h-12 rounded-full border-4 border-[#7c3aed] border-t-transparent animate-spin" />
          <p className="text-sm font-bold uppercase tracking-widest">Loading Account...</p>
        </div>
      </div>
    );
  }

  const avatarLetter = (profileName || email || "?")[0].toUpperCase();

  return (
    <div className="min-h-screen relative bg-[#0f0f1a] text-zinc-100 overflow-x-hidden">
      {/* BACKGROUND IMAGE */}
      <img
        src="https://images.unsplash.com/photo-1614850523296-d8c1af93d400?w=1920&q=80"
        alt=""
        className="fixed inset-0 w-full h-full object-cover pointer-events-none"
        style={{ opacity: 0.07 }}
      />
      <div className="fixed inset-0 bg-[#0f101a]/93 pointer-events-none z-0" />

      <div className="relative z-10">
        {/* PROFILE HERO BANNER */}
        <div
          className="py-16 text-center relative overflow-hidden"
          style={{ background: "linear-gradient(135deg, #0f0a1e, #1a0a2e)" }}
        >
          <div className="relative z-10 px-4 flex flex-col items-center">
            {/* Avatar */}
            <div className="w-24 h-24 rounded-full bg-gradient-to-br from-[#7c3aed] to-[#f59e0b] p-1 shadow-2xl mb-4">
              <div className="w-full h-full rounded-full bg-[#0f0a1e] flex items-center justify-center text-4xl font-black text-white">
                {avatarLetter}
              </div>
            </div>
            
            <h1 className="text-3xl font-black text-white">{profileName || "Arena Student"}</h1>
            <p className="text-zinc-400 text-sm mt-1">{email}</p>

            <div className="mt-6 inline-flex items-center gap-3 bg-white/5 border border-white/10 px-6 py-3 rounded-2xl backdrop-blur-md">
              <span className="text-zinc-400 text-xs font-bold uppercase tracking-widest">Wallet Balance</span>
              <span className="text-2xl font-black text-[#f59e0b]">₦{balance.toLocaleString()}</span>
            </div>
          </div>
        </div>

        <div className="mx-auto max-w-lg px-4 py-10 space-y-8">
          {/* QUIZ ARENA EXPANSION — START */}
          <StreakCalendar />
          {/* QUIZ ARENA EXPANSION — END */}

          {/* Progress Section */}
          <div className="rounded-3xl border border-white/10 bg-[#161627]/60 p-6 backdrop-blur-md shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-black text-white">Learning Stats</h2>
              <button 
                onClick={() => setIsEditingName(!isEditingName)}
                className="text-xs font-bold text-[#7c3aed] uppercase tracking-wider hover:underline"
              >
                {isEditingName ? "Cancel" : "Edit Name"}
              </button>
            </div>

            {isEditingName && (
              <div className="mb-6 flex gap-2">
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="flex-1 rounded-xl border border-white/10 bg-black/40 px-4 py-2 text-sm outline-none focus:border-[#7c3aed]"
                  placeholder="New display name"
                  autoFocus
                />
                <button 
                  onClick={updateName} 
                  className="rounded-xl bg-[#7c3aed] px-4 py-2 text-xs font-black text-white hover:bg-[#6d28d9] transition-colors"
                >
                  SAVE
                </button>
              </div>
            )}

            <div className="mt-4 mb-6"> 
              <label className="block text-sm font-medium text-zinc-400 mb-1">Your State</label> 
              <select 
                value={selectedState} 
                onChange={(e) => setSelectedState(e.target.value)} 
                style={{ background: '#1a1a2e', color: '#ffffff', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '12px', padding: '12px 16px', width: '100%', fontSize: '14px' }} 
              > 
                <option value="" style={{ background: '#1a1a2e', color: '#ffffff' }}>-- Select your state --</option> 
                {["Abia","Adamawa","Akwa Ibom","Anambra","Bauchi","Bayelsa","Benue","Borno","Cross River","Delta","Ebonyi","Edo","Ekiti","Enugu","FCT","Gombe","Imo","Jigawa","Kaduna","Kano","Katsina","Kebbi","Kogi","Kwara","Lagos","Nasarawa","Niger","Ogun","Ondo","Osun","Oyo","Plateau","Rivers","Sokoto","Taraba","Yobe","Zamfara"].map(s => ( 
                  <option key={s} value={s} style={{ background: '#1a1a2e', color: '#ffffff' }}>{s}</option> 
                ))} 
              </select> 
              <button 
                type="button" 
                onClick={saveState} 
                className="mt-3 w-full rounded-xl bg-purple-600 hover:bg-purple-500 px-4 py-2 text-sm font-bold text-white transition" 
              > 
                Save State 
              </button> 
            </div> 

            <div className="grid grid-cols-2 gap-4">
              <div className="rounded-2xl border border-[#f59e0b]/30 bg-[#f59e0b]/10 p-5 text-center">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#f59e0b]">
                  Current Streak
                </p>
                <p className="mt-2 text-4xl font-black tabular-nums text-white">
                  {streak?.current_streak ?? 0}
                </p>
                <p className="mt-1 text-[10px] font-bold text-zinc-500 uppercase">Days</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 p-5 text-center">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">
                  Best Record
                </p>
                <p className="mt-2 text-4xl font-black tabular-nums text-white">
                  {streak?.longest_streak ?? 0}
                </p>
                <p className="mt-1 text-[10px] font-bold text-zinc-500 uppercase">Days</p>
              </div>
            </div>

            {streak?.last_activity_date && (
              <p className="mt-6 text-center text-[10px] font-bold text-zinc-600 uppercase tracking-widest">
                Last Activity: {new Date(streak.last_activity_date).toLocaleDateString()}
              </p>
            )}
          </div>

          {/* Match History */}
          <div className="rounded-3xl border border-white/10 bg-[#161627]/60 p-6 backdrop-blur-md shadow-2xl">
            <h2 className="text-xl font-black text-white mb-6">Recent Battles</h2>
            <div className="space-y-3">
              {matchHistory.length === 0 ? (
                <div className="py-10 text-center">
                  <p className="text-5xl mb-4">🎮</p>
                  <p className="text-sm text-zinc-500 font-bold uppercase tracking-wider">No battles played yet</p>
                  <Link href="/battle" className="text-xs text-[#7c3aed] mt-2 inline-block font-black hover:underline">
                    START YOUR FIRST BATTLE →
                  </Link>
                </div>
              ) : (
                matchHistory.map((match, i) => (
                  <div key={i} className="flex items-center justify-between rounded-2xl border border-white/5 bg-black/30 p-4 transition-all hover:bg-black/40">
                    <div>
                      <p className="text-sm font-black text-white uppercase tracking-wider">
                        {match.battle_rooms?.subject?.replace('_', ' ') || "Arena Battle"}
                      </p>
                      <p className="text-[10px] font-bold text-zinc-500 uppercase mt-1">
                        ₦{match.battle_rooms?.stake_amount || 0} Stake · {new Date(match.battle_rooms?.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className={`text-lg font-black ${match.score > 0 ? 'text-emerald-400' : 'text-zinc-500'}`}>
                        {match.score}
                      </p>
                      <p className="text-[10px] font-bold text-zinc-600 uppercase">Points</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* QUIZ ARENA EXPANSION — START */}
          <div className="rounded-3xl border border-white/10 bg-[#161627]/60 p-6 backdrop-blur-md shadow-2xl">
            <NotificationPreferences />
          </div>
          {/* QUIZ ARENA EXPANSION — END */}

          <div className="flex flex-col gap-4">
            <Link
              href="/account/wallet"
              className="rounded-2xl bg-[#f59e0b] py-4 text-center text-sm font-black text-black shadow-xl shadow-yellow-500/10 transition hover:bg-[#d97706] active:scale-[0.98]"
            >
              MANAGE WALLET & DEPOSIT
            </Link>
            <div className="grid grid-cols-2 gap-4">
              <Link
                href="/leaderboard"
                className="rounded-2xl border border-white/10 bg-white/5 py-4 text-center text-xs font-black text-white transition hover:bg-white/10"
              >
                LEADERBOARDS
              </Link>
              <button
                type="button"
                onClick={signOut}
                className="rounded-2xl border border-red-500/20 bg-red-500/5 py-4 text-center text-xs font-black text-red-400 transition hover:bg-red-500/10"
              >
                SIGN OUT
              </button>
            </div>
          </div>

          <p className="text-center">
            <Link href="/" className="text-[10px] font-black text-zinc-600 uppercase tracking-[0.3em] hover:text-white transition-colors">
              Back to Arena Home
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
