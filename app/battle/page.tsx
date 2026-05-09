"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { getSupabaseClient } from "@/lib/supabase";
import {
  getSubjectMeta,
  SUBJECTS,
} from "@/app/data/practiceQuestions";
import { normalizeRoomCode } from "@/app/battle/battleUtils";
import { createBattleRoom } from "@/lib/battleRoom";
import { insertRoomPlayer } from "@/lib/battleRoomPlayer";
import { getWalletBalance, processTransaction } from "@/lib/wallet";

type Mode = "create" | "join" | "league" | "quick";

// Battle Lobby Page - Using battle_rooms table
export default function BattleLobbyPage() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("create");
  const [playerName, setPlayerName] = useState<string>("");
  const [subject, setSubject] = useState<string>(SUBJECTS[0]?.slug ?? "maths");
  const [joinCode, setJoinCode] = useState<string>("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Private Room Setup
  const [maxPlayers, setMaxPlayers] = useState<number>(2);
  const [stakeAmount, setStakeAmount] = useState<number>(0);
  const STAKE_OPTIONS = [0, 100, 200, 300, 500, 1000, 2000];

  const [joinPreview, setJoinPreview] = useState<{
    subject: string;
    status: string;
    stake_amount: number;
    max_players: number;
    current_players: number;
  } | null>(null);
  const [joinPreviewLoading, setJoinPreviewLoading] = useState(false);

  const prizeBreakdown = useMemo(() => {
    const totalPool = stakeAmount * maxPlayers;
    const platformCut = totalPool * 0.20;
    const prizePool = totalPool - platformCut;
    
    let first = 0, second = 0, third = 0;
    if (maxPlayers === 2) {
      first = prizePool;
    } else if (maxPlayers === 3) {
      first = prizePool * 0.60;
      second = prizePool * 0.40;
    } else if (maxPlayers === 4) {
      first = prizePool * 0.50;
      second = prizePool * 0.30;
      third = prizePool * 0.20;
    }

    return { totalPool, platformCut, prizePool, first, second, third };
  }, [stakeAmount, maxPlayers]);

  const canSubmit = useMemo(() => {
    if (!playerName.trim()) return false;
    if (mode === "create") return Boolean(subject);
    if (mode === "join") return normalizeRoomCode(joinCode).length === 6;
    return true;
  }, [playerName, mode, subject, joinCode]);

  const persistIdentity = (id: string) => {
    localStorage.setItem("playerId", id);
    localStorage.setItem("playerName", playerName.trim());
  };

  const createRoom = async () => {
    setBusy(true);
    setError(null);
    try {
      const supabase = getSupabaseClient();
      const { data: { user } } = await supabase.auth.getUser();
      
      if (stakeAmount > 0) {
        if (!user) throw new Error("Please sign in to play for money.");
        const balance = await getWalletBalance(user.id);
        if (balance < stakeAmount) {
          throw new Error(`Insufficient balance. You need ₦${stakeAmount}. Current balance: ₦${balance}.`);
        }
      }

      const { roomCode, playerId, roomId } = await createBattleRoom(
        subject,
        playerName,
        stakeAmount,
        maxPlayers
      );

      if (stakeAmount > 0 && user) {
        await processTransaction(
          user.id,
          'stake',
          stakeAmount,
          `room-${roomCode}`,
          `Staked ₦${stakeAmount} for room ${roomCode}`
        );
      }

      persistIdentity(playerId);
      localStorage.setItem("createdRoomCode", roomCode);
      router.push(`/battle/${roomCode}`);
    } catch (e: unknown) {
      setError((e as Error)?.message ?? "Failed to create room.");
    } finally {
      setBusy(false);
    }
  };

  const joinRoom = async () => {
    setBusy(true);
    setError(null);
    try {
      const supabase = getSupabaseClient();
      const code = normalizeRoomCode(joinCode);
      const { data: room, error: roomErr } = await supabase
        .from("battle_rooms")
        .select("id, room_code, status, stake_amount, max_players")
        .eq("room_code", code)
        .single();
      if (roomErr) throw roomErr;
      
      if (room.status !== "waiting") {
        throw new Error("That room is not accepting new players.");
      }

      // Check player count
      const { count } = await supabase
        .from("room_players")
        .select("*", { count: 'exact', head: true })
        .eq("room_id", room.id);
      
      if (count && count >= room.max_players) {
        throw new Error("This room is full.");
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (room.stake_amount > 0) {
        if (!user) throw new Error("Please sign in to join a paid room.");
        const balance = await getWalletBalance(user.id);
        if (balance < room.stake_amount) {
          throw new Error(`You need ₦${room.stake_amount} to join. Your balance: ₦${balance}.`);
        }
        
        await processTransaction(
          user.id,
          'stake',
          room.stake_amount,
          `join-${code}`,
          `Joined room ${code} with ₦${room.stake_amount} stake`
        );
      }

      const player = await insertRoomPlayer(room.id, playerName);
      persistIdentity(player.id);
      router.push(`/battle/${room.room_code}`);
    } catch (e: unknown) {
      setError((e as Error)?.message ?? "Failed to join room.");
    } finally {
      setBusy(false);
    }
  };

  const handleQuickMatch = async () => {
    if (!playerName.trim()) {
      setError("Please enter your name first.");
      return;
    }
    setBusy(true);
    setError(null);
    setMode("quick");
    
    try {
      const supabase = getSupabaseClient();
      const { data: { user } } = await supabase.auth.getUser();
      
      // 1. Check if there's an existing waiting room for this subject
      const { data: rooms } = await supabase
        .from("battle_rooms")
        .select("id, room_code, max_players")
        .eq("subject", subject)
        .eq("status", "waiting")
        .eq("stake_amount", 0) // Quick match is free for now
        .order("created_at", { ascending: false });

      if (rooms && rooms.length > 0) {
        for (const room of rooms) {
          const { count } = await supabase
            .from("room_players")
            .select("*", { count: 'exact', head: true })
            .eq("room_id", room.id);
          
          if (count && count < room.max_players) {
            const player = await insertRoomPlayer(room.id, playerName);
            persistIdentity(player.id);
            router.push(`/battle/${room.room_code}`);
            return;
          }
        }
      }

      // 2. If no room found, create one
      const { roomCode, playerId } = await createBattleRoom(subject, playerName, 0, 2);
      persistIdentity(playerId);
      router.push(`/battle/${roomCode}`);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit || busy) return;
    if (mode === "create") await createRoom();
    else await joinRoom();
  };

  const avatarLetter = (playerName.trim()[0] ?? "?").toUpperCase();
  const selectedSubject = SUBJECTS.find((s) => s.slug === subject) ?? SUBJECTS[0];
  const joinNormalized = normalizeRoomCode(joinCode);

  useEffect(() => {
    if (mode !== "join" || joinNormalized.length !== 6) {
      return;
    }
    let cancelled = false;
    const loadingTimeout = setTimeout(() => setJoinPreviewLoading(true), 0);
    const timer = window.setTimeout(async () => {
      try {
        const supabase = getSupabaseClient();
        const { data } = await supabase
          .from("battle_rooms")
          .select("subject, status, stake_amount, max_players")
          .eq("room_code", joinNormalized)
          .maybeSingle();
        if (cancelled) return;
        if (data?.subject != null && data.status) {
          // Get current players count by joining with battle_rooms to get room_id
          const { data: roomData } = await supabase
            .from("battle_rooms")
            .select("id")
            .eq("room_code", joinNormalized)
            .single();

          let count = 0;
          if (roomData) {
            const { count: playerCount } = await supabase
              .from("room_players")
              .select("*", { count: 'exact', head: true })
              .eq("room_id", roomData.id);
            count = playerCount || 0;
          }

          setJoinPreview({
            subject: data.subject as string,
            status: data.status as string,
            stake_amount: data.stake_amount as number,
            max_players: data.max_players as number,
            current_players: count
          });
        } else {
          setJoinPreview(null);
        }
      } finally {
        if (!cancelled) setJoinPreviewLoading(false);
      }
    }, 400);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
      window.clearTimeout(loadingTimeout);
    };
  }, [mode, joinNormalized]);

  const handleModeAction = async (nextMode: Mode) => {
    setError(null);
    if (busy) return;
    if (mode !== nextMode) {
      setMode(nextMode);
      return;
    }
    if (!canSubmit) return;
    if (nextMode === "create") await createRoom();
    else await joinRoom();
  };

  return (
    <div
      className="min-h-screen bg-[#0f0f1a] text-white"
      style={{
        minHeight: "100vh",
        backgroundImage:
          "linear-gradient(to bottom right, #4a00e0, #8e2de2)",
        backgroundSize: "cover",
        backgroundPosition: "center",
      }}
    >
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -left-36 top-16 h-80 w-80 rounded-full bg-[#7c3aed]/20 blur-3xl" />
        <div className="absolute -right-24 bottom-24 h-80 w-80 rounded-full bg-[#f59e0b]/10 blur-3xl" />
      </div>

      <div className="relative mx-auto max-w-2xl px-4 pb-16 pt-6 sm:pt-10">
        <div className="flex items-center justify-between">
          <p className="text-[11px] font-semibold uppercase tracking-[0.38em] text-[#7c3aed]">
            QUIZ ARENA
          </p>
          <Link
            href="/"
            className="text-xs font-medium text-[#888888] transition hover:text-[#7c3aed]"
          >
            Back to Home
          </Link>
        </div>

        <div className="mt-6 grid grid-cols-3 gap-2 rounded-xl border border-white/10 p-1">
          <button
            type="button"
            className={`rounded-lg px-2 py-2 text-[10px] font-bold uppercase tracking-wider transition ${mode === "create" ? "bg-[#7c3aed] text-white" : "text-zinc-400"}`}
            onClick={() => setMode("create")}
          >
            🔐 Private
          </button>
          <button
            type="button"
            className={`rounded-lg px-2 py-2 text-[10px] font-bold uppercase tracking-wider transition ${mode === "join" ? "bg-[#7c3aed] text-white" : "text-zinc-400"}`}
            onClick={() => setMode("join")}
          >
            🔗 Join
          </button>
          <button
            type="button"
            className={`rounded-lg px-2 py-2 text-[10px] font-bold uppercase tracking-wider transition ${mode === "quick" ? "bg-[#7c3aed] text-white" : "text-zinc-400"}`}
            onClick={handleQuickMatch}
          >
            ⚡ Quick
          </button>
          <button
            type="button"
            className={`rounded-lg px-2 py-2 text-[10px] font-bold uppercase tracking-wider transition ${mode === "league" ? "bg-[#7c3aed] text-white" : "text-zinc-400"}`}
            onClick={() => router.push("/league")}
          >
            🏆 League
          </button>
        </div>

        <div className="mt-8 rounded-3xl border border-white/10 bg-[#1a1a2e]/85 p-5 shadow-[0_30px_110px_-70px_rgba(0,0,0,0.95)] backdrop-blur sm:p-7">
          <form onSubmit={onSubmit} className="space-y-5">
            <div>
              <label className="text-xs font-semibold uppercase tracking-[0.22em] text-[#f59e0b]">
                Player name
              </label>
              <div className="mt-2 flex items-center gap-3 rounded-2xl border border-white/10 bg-[#0f0f1a]/60 px-3 py-2.5 focus-within:border-[#7c3aed]/60">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#0f0f1a] ring-1 ring-white/10">
                  <span className="text-sm font-extrabold text-white">
                    {avatarLetter}
                  </span>
                </div>
                <input
                  value={playerName}
                  onChange={(e) => setPlayerName(e.target.value)}
                  placeholder="e.g. Ada"
                  className="w-full bg-transparent text-sm text-white outline-none placeholder:text-[#888888]"
                />
              </div>
            </div>

            {mode === "create" && (
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="text-xs font-semibold uppercase tracking-[0.22em] text-[#f59e0b]">
                    Subject
                  </label>
                  <div className="mt-2 rounded-2xl border border-white/10 bg-[#0f0f1a]/60 px-3 py-2.5 focus-within:border-[#7c3aed]/60">
                    <select
                      value={subject}
                      onChange={(e) => setSubject(e.target.value)}
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

                <div>
                  <label className="text-xs font-semibold uppercase tracking-[0.22em] text-[#f59e0b]">
                    Players
                  </label>
                  <div className="mt-2 grid grid-cols-3 gap-2">
                    {[2, 3, 4].map((n) => (
                      <button
                        key={n}
                        type="button"
                        onClick={() => setMaxPlayers(n)}
                        className={`rounded-xl border py-2 text-sm font-bold transition ${maxPlayers === n ? "border-[#7c3aed] bg-[#7c3aed]/20 text-white" : "border-white/10 bg-black/20 text-zinc-500"}`}
                      >
                        {n}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="sm:col-span-2">
                  <label className="text-xs font-semibold uppercase tracking-[0.22em] text-[#f59e0b]">
                    Stake Amount
                  </label>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {STAKE_OPTIONS.map((amt) => (
                      <button
                        key={amt}
                        type="button"
                        onClick={() => setStakeAmount(amt)}
                        className={`rounded-xl border px-3 py-2 text-xs font-bold transition ${stakeAmount === amt ? "border-[#7c3aed] bg-[#7c3aed]/20 text-white" : "border-white/10 bg-black/20 text-zinc-500"}`}
                      >
                        {amt === 0 ? "Free" : `₦${amt}`}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="sm:col-span-2 rounded-2xl border border-dashed border-white/20 bg-black/30 p-4">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 text-center">
                    ━━━━━━━━━━━━━━━━━━━━━━
                    <br />
                    PRIZE BREAKDOWN
                    <br />
                    ━━━━━━━━━━━━━━━━━━━━━━
                  </p>
                  <div className="mt-3 space-y-1 text-xs font-mono">
                    <div className="flex justify-between">
                      <span className="text-zinc-400">Entry per player:</span>
                      <span className="text-white">₦{stakeAmount}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-zinc-400">Total Pool:</span>
                      <span className="text-white">₦{prizeBreakdown.totalPool}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-zinc-400">Platform (20%):</span>
                      <span className="text-white">₦{prizeBreakdown.platformCut}</span>
                    </div>
                    <div className="flex justify-between border-t border-white/10 pt-1 font-bold">
                      <span className="text-[#f59e0b]">Prize Pool (80%):</span>
                      <span className="text-[#f59e0b]">₦{prizeBreakdown.prizePool}</span>
                    </div>
                  </div>
                  <p className="mt-3 text-[10px] font-bold uppercase tracking-widest text-zinc-500 text-center">
                    ━━━━━━━━━━━━━━━━━━━━━━
                  </p>
                  <div className="mt-2 space-y-1 text-xs font-bold text-center">
                    <p className="text-emerald-400">🥇 1st: ₦{Math.floor(prizeBreakdown.first)}</p>
                    {maxPlayers >= 3 && <p className="text-blue-400">🥈 2nd: ₦{Math.floor(prizeBreakdown.second)}</p>}
                    {maxPlayers >= 4 && <p className="text-purple-400">🥉 3rd: ₦{Math.floor(prizeBreakdown.third)}</p>}
                  </div>
                  <p className="mt-2 text-[10px] font-bold uppercase tracking-widest text-zinc-500 text-center">
                    ━━━━━━━━━━━━━━━━━━━━━━
                  </p>
                </div>
              </div>
            )}

            {mode === "join" && (
              <div>
                <label className="text-xs font-semibold uppercase tracking-[0.22em] text-[#f59e0b]">
                  Room code
                </label>
                <input
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value)}
                  placeholder="XXXXXX"
                  className="mt-2 w-full rounded-2xl border border-white/10 bg-[#0f0f1a]/70 px-4 py-3.5 text-center font-mono text-lg tracking-[0.35em] text-white outline-none focus:border-[#7c3aed]"
                />
                
                {joinNormalized.length === 6 && (
                  <div className="mt-4 rounded-2xl border border-white/10 bg-black/40 p-4">
                    {joinPreviewLoading ? (
                      <p className="text-center text-xs text-zinc-500">Looking up room...</p>
                    ) : joinPreview ? (
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-zinc-400">Subject:</span>
                          <span className="font-bold text-white">{getSubjectMeta(joinPreview.subject)?.title}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-zinc-400">Stake:</span>
                          <span className="font-bold text-[#f59e0b]">{joinPreview.stake_amount === 0 ? "Free" : `₦${joinPreview.stake_amount}`}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-zinc-400">Players:</span>
                          <span className="text-white">{joinPreview.current_players} / {joinPreview.max_players}</span>
                        </div>
                      </div>
                    ) : (
                      <p className="text-center text-xs text-red-400">Room not found or expired.</p>
                    )}
                  </div>
                )}
              </div>
            )}

            {error && (
              <div className="rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={!canSubmit || busy}
              className="w-full rounded-2xl bg-[#7c3aed] py-4 text-sm font-extrabold tracking-widest text-white shadow-lg shadow-[#7c3aed]/20 transition hover:bg-[#6d28d9] disabled:opacity-50"
            >
              {busy ? "Processing..." : mode === "create" ? "CREATE PRIVATE ROOM" : "JOIN BATTLE"}
            </button>

            <p className="text-center text-[10px] text-zinc-500 uppercase tracking-widest">
              ⚡ Quick Match auto-connects you with online opponents
            </p>

            {/* keep existing submit behavior for Enter key */}
            <button type="submit" className="sr-only" aria-hidden tabIndex={-1}>
              Submit
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

