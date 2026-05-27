"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { getSupabaseClient } from "@/lib/supabase";
import { SUBJECTS } from "@/app/data/practiceQuestions";
import { getWalletBalance } from "@/lib/wallet";

type OnlinePlayer = {
  user_id: string;
  display_name: string;
  last_seen: string;
};

type ChallengeModal = {
  opponent: OnlinePlayer;
  subject: string;
  stakeAmount: number;
};

const STAKE_OPTIONS = [100, 200, 300, 500, 1000, 2000];

export default function PlayersPage() {
  const router = useRouter();
  const supabase = getSupabaseClient();

  const [currentUser, setCurrentUser] = useState<{ id: string; display_name: string } | null>(null);
  const [onlinePlayers, setOnlinePlayers] = useState<OnlinePlayer[]>([]);
  const [challengeModal, setChallengeModal] = useState<ChallengeModal | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null); 
  const challengeChannelRef = useRef<any>(null);

  useEffect(() => {
    let heartbeatInterval: ReturnType<typeof setInterval>;

    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push("/login");
        return;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("display_name")
        .eq("id", user.id)
        .single();

      const displayName =
        profile?.display_name || user.email?.split("@")[0] || "Player";

      setCurrentUser({ id: user.id, display_name: displayName });

      await supabase.from("user_presence").upsert(
        { user_id: user.id, display_name: displayName, last_seen: new Date().toISOString() },
        { onConflict: "user_id" }
      );

      heartbeatInterval = setInterval(async () => {
        await supabase.from("user_presence").upsert(
          { user_id: user.id, display_name: displayName, last_seen: new Date().toISOString() },
          { onConflict: "user_id" }
        );
      }, 30000);
    };

    init();

    return () => {
      clearInterval(heartbeatInterval);
    };
  }, []);

  const fetchOnlinePlayers = useCallback(async () => {
    if (!currentUser) return;
    const cutoff = new Date(Date.now() - 60000).toISOString();
    const { data } = await supabase
      .from("user_presence")
      .select("user_id, display_name, last_seen")
      .gte("last_seen", cutoff)
      .neq("user_id", currentUser.id)
      .order("last_seen", { ascending: false });

    if (data) setOnlinePlayers(data);
  }, [currentUser]);

  useEffect(() => {
    if (!currentUser) return;

    fetchOnlinePlayers();
    const interval = setInterval(fetchOnlinePlayers, 10000);

    const channel = supabase
      .channel("online-players-lobby")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "user_presence" },
        () => fetchOnlinePlayers()
      )
      .subscribe();

    return () => {
      clearInterval(interval);
      supabase.removeChannel(channel);
    };
  }, [currentUser, fetchOnlinePlayers]);

  const openChallengeModal = (opponent: OnlinePlayer) => {
    setError(null);
    setChallengeModal({
      opponent,
      subject: SUBJECTS[0]?.slug ?? "maths",
      stakeAmount: 100,
    });
  };

  const sendChallenge = async () => {
    if (!challengeModal || !currentUser) return;
    setBusy(true);
    setError(null);

    try {
      const { stakeAmount, subject, opponent } = challengeModal;

      const balance = await getWalletBalance(currentUser.id);
      if (balance < stakeAmount) {
        throw new Error(
          `Insufficient balance. You need ₦${stakeAmount} but your wallet has ₦${balance}.`
        );
      }

      // Create room first so opponent can join it on accept 
      const { generateRoomCode } = await import("@/app/battle/battleUtils"); 
      const { createBattleRoom } = await import("@/lib/battleRoom"); 
      const { insertRoomPlayer } = await import("@/lib/battleRoomPlayer"); 
      const newRoomCode = generateRoomCode(6); 
      const room = await createBattleRoom(newRoomCode, subject, currentUser.id, stakeAmount); 
      await insertRoomPlayer(room.id, currentUser.display_name); 
      localStorage.setItem("playerName", currentUser.display_name); 
      localStorage.setItem("createdRoomCode", newRoomCode); 
 
      // Deduct challenger stake immediately 
      const { processTransaction } = await import("@/lib/wallet"); 
      await processTransaction( 
        currentUser.id, 
        "stake", 
        stakeAmount, 
        `challenge-send-${Date.now()}`, 
        `Staked ₦${stakeAmount} for challenge vs ${opponent.display_name}` 
      ); 
 
      const { error: insertError } = await supabase.from("battle_requests").insert({ 
        challenger_id: currentUser.id, 
        challenger_name: currentUser.display_name, 
        opponent_id: opponent.user_id, 
        subject, 
        stake_amount: stakeAmount, 
        status: "pending", 
        room_code: newRoomCode, 
      }); 
 
      if (insertError) throw insertError; 
 
      // Poll every 2 seconds to check if challenge was accepted 
      if (challengeChannelRef.current) clearInterval(challengeChannelRef.current); 
      challengeChannelRef.current = setInterval(async () => { 
        const { data } = await supabase 
          .from('battle_requests') 
          .select('status') 
          .eq('room_code', newRoomCode) 
          .maybeSingle(); 
        if (data?.status === 'accepted') { 
          clearInterval(challengeChannelRef.current); 
          window.location.href = `/battle/${newRoomCode}`; 
        } 
        if (data?.status === 'declined' || data?.status === 'cancelled') { 
          clearInterval(challengeChannelRef.current); 
          setSuccessMsg(null); 
          setError('Challenge was declined or cancelled.'); 
        } 
      }, 2000); 
 
      setChallengeModal(null); 
      setSuccessMsg( 
        `⚔️ Challenge sent to ${opponent.display_name}! Waiting for their response…` 
      ); 
      setTimeout(() => setSuccessMsg(null), 6000);
    } catch (e: unknown) {
      setError((e as Error)?.message ?? "Failed to send challenge. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      className="min-h-screen text-white relative"
      style={{
        backgroundImage: "url(https://images.unsplash.com/photo-1511512578047-dfb367046420?w=1920&q=80)",
        backgroundSize: "cover",
        backgroundAttachment: "fixed",
        backgroundPosition: "center"
      }}
    >
      <div className="fixed inset-0 bg-[#0f0f1a]/88 pointer-events-none z-0" />

      <div
        className="py-16 text-center relative overflow-hidden"
        style={{ background: "linear-gradient(135deg, #1e1b4b 0%, #2e1065 100%)" }}
      >
        <img
          src="https://images.unsplash.com/photo-1542751371-adc38448a05e?w=1920&q=80"
          className="absolute inset-0 w-full h-full object-cover"
          alt=""
        />
        <div className="absolute inset-0 bg-gradient-to-r from-[#1e1b4b]/90 to-[#2e1065]/90" />
        <div className="relative z-10 px-4">
          <div className="flex items-center justify-center mb-3">
            <span className="w-4 h-4 rounded-full bg-green-400 inline-block mr-3 animate-pulse" />
            <h1 className="text-white text-5xl font-black">Players Online</h1>
          </div>
          <p className="text-purple-200 text-lg font-semibold mt-3">
            See who is live right now. Send a direct battle challenge.
          </p>
        </div>
      </div>

      <div className="relative mx-auto max-w-2xl px-4 pb-16 pt-6 z-10">
        <div className="flex items-center justify-between mb-6">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.38em] text-[#7c3aed]">
              QUIZ ARENA
            </p>
            <h1 className="text-2xl font-extrabold text-white mt-1">
              Players Online
            </h1>
          </div>
          <button
            onClick={() => router.push("/")}
            className="text-xs font-medium text-[#888888] hover:text-[#7c3aed] transition"
          >
            ← Back to Home
          </button>
        </div>

        <div className="flex items-center gap-2 mb-6">
          <span className="inline-block h-2.5 w-2.5 rounded-full bg-green-400 animate-pulse" />
          <span className="text-sm text-zinc-300">
            <span className="font-bold text-white">{onlinePlayers.length}</span>{" "}
            player{onlinePlayers.length !== 1 ? "s" : ""} online now
          </span>
        </div>

        {successMsg && (
          <div className="mb-4 rounded-2xl border border-green-500/30 bg-green-500/10 px-4 py-3 text-sm text-green-300">
            {successMsg}
          </div>
        )}

        <div className="space-y-3">
          {onlinePlayers.length === 0 ? (
            <div className="rounded-3xl border border-white/10 bg-[#1a1a2e]/85 p-12 text-center">
              <p className="text-5xl mb-3">👀</p>
              <p className="text-zinc-300 font-bold text-sm">No other players online right now.</p>
              <p className="text-zinc-500 text-xs mt-1">Check back in a few minutes!</p>
            </div>
          ) : (
            onlinePlayers.map((player) => (
              <div
                key={player.user_id}
                className="flex items-center justify-between rounded-2xl border border-white/10 bg-[#1a1a2e]/85 px-5 py-4 backdrop-blur"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#7c3aed]/30 ring-1 ring-[#7c3aed]/50">
                    <span className="text-base font-extrabold text-white">
                      {player.display_name[0]?.toUpperCase() ?? "?"}
                    </span>
                  </div>
                  <div>
                    <p className="font-bold text-white text-sm">{player.display_name}</p>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className="inline-block h-2 w-2 rounded-full bg-green-400 animate-pulse" />
                      <span className="text-xs text-green-400">Online</span>
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => openChallengeModal(player)}
                  className="rounded-xl bg-[#7c3aed] px-4 py-2 text-xs font-extrabold tracking-widest text-white shadow-lg shadow-[#7c3aed]/20 hover:bg-[#6d28d9] transition"
                >
                  ⚔️ CHALLENGE
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      {challengeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="relative w-full max-w-sm rounded-3xl border border-white/10 bg-[#1a1a2e] p-6 shadow-2xl">

            <h2 className="text-lg font-extrabold text-white mb-1">
              ⚔️ Challenge {challengeModal.opponent.display_name}
            </h2>
            <p className="text-xs text-zinc-400 mb-5">Choose a subject and stake amount</p>

            <div className="mb-4">
              <label className="text-xs font-semibold uppercase tracking-widest text-[#f59e0b]">
                Subject
              </label>
              <div className="mt-2 rounded-2xl border border-white/10 bg-[#0f0f1a]/60 px-3 py-2.5">
                <select
                  value={challengeModal.subject}
                  onChange={(e) =>
                    setChallengeModal({ ...challengeModal, subject: e.target.value })
                  }
                  className="w-full appearance-none bg-transparent text-sm text-white outline-none"
                >
                  {SUBJECTS.map((s) => (
                    <option key={s.slug} value={s.slug}>
                      {s.emoji} {s.title}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="mb-5">
              <label className="text-xs font-semibold uppercase tracking-widest text-[#f59e0b]">
                Stake Amount
              </label>
              <div className="mt-2 flex flex-wrap gap-2">
                {STAKE_OPTIONS.map((amt) => (
                  <button
                    key={amt}
                    type="button"
                    onClick={() =>
                      setChallengeModal({ ...challengeModal, stakeAmount: amt })
                    }
                    className={`rounded-xl border px-3 py-2 text-xs font-bold transition ${
                      challengeModal.stakeAmount === amt
                        ? "border-[#7c3aed] bg-[#7c3aed]/20 text-white"
                        : "border-white/10 bg-black/20 text-zinc-500"
                    }`}
                  >
                    ₦{amt}
                  </button>
                ))}
              </div>
            </div>

            {error && (
              <div className="mb-4 rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-300">
                {error}
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => { setChallengeModal(null); setError(null); }}
                disabled={busy}
                className="flex-1 rounded-2xl border border-white/10 py-3 text-sm font-bold text-zinc-400 hover:text-white hover:border-white/30 transition disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={sendChallenge}
                disabled={busy}
                className="flex-1 rounded-2xl bg-[#7c3aed] py-3 text-sm font-extrabold text-white hover:bg-[#6d28d9] disabled:opacity-50 transition"
              >
                {busy ? "Sending…" : "Send Challenge ⚔️"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
