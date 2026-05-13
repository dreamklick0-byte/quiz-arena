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
  const [findingOpponent, setFindingOpponent] = useState(false);
  
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

  // Load saved name
  useEffect(() => {
    const saved = localStorage.getItem("playerName");
    if (saved) setPlayerName(saved);
  }, []);

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
    if (mode === "quick" || mode === "league") return true;
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
      const userId = user?.id; 
      if (!userId) throw new Error("Please sign in to play."); 
      
      if (stakeAmount > 0) {
        const balance = await getWalletBalance(userId);
        if (balance < stakeAmount) {
          throw new Error(`Insufficient balance. You need ₦${stakeAmount}. Current balance: ₦${balance}.`);
        }
      }

      const { generateRoomCode } = await import("@/app/battle/battleUtils"); 
      const roomCode = generateRoomCode(6); 

      const room = await createBattleRoom(
        roomCode, 
        subject,
        userId,
        stakeAmount
      );

      const player = await insertRoomPlayer(room.id, playerName); 
      const playerId = player.id; 

      if (stakeAmount > 0) {
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
    setFindingOpponent(true);
    
    try {
      const supabase = getSupabaseClient();
      const { data: { user } } = await supabase.auth.getUser();
      const userId = user?.id;
      if (!userId) throw new Error("Please sign in to play.");

      const subjects = ["maths","english","physics","chemistry","biology","government","economics"];
      const randomSubject = subjects[Math.floor(Math.random() * subjects.length)];
      
      const { generateRoomCode } = await import("@/app/battle/battleUtils");
      const roomCode = generateRoomCode(6);

      const room = await createBattleRoom(
        roomCode, 
        randomSubject,
        userId,
        0 // Quick match is free
      );

      const player = await insertRoomPlayer(room.id, playerName);
      persistIdentity(player.id);
      localStorage.setItem("createdRoomCode", roomCode);
      router.push(`/battle/${roomCode}`);
    } catch (err: unknown) {
      const error = err as Error;
      setError(error.message);
    } finally {
      setBusy(false);
      setFindingOpponent(false);
    }
  };

  const handleLeagueMatch = async () => {
    if (!playerName.trim()) {
      setError("Please enter your name first.");
      return;
    }
    setBusy(true);
    setError(null);
    setFindingOpponent(true);
    
    try {
      const supabase = getSupabaseClient();
      const { data: { user } } = await supabase.auth.getUser();
      const userId = user?.id;
      if (!userId) throw new Error("Please sign in to play.");

      const subjects = ["maths","english","physics","chemistry","biology","government","economics"];
      const randomSubject = subjects[Math.floor(Math.random() * subjects.length)];
      
      const { generateRoomCode } = await import("@/app/battle/battleUtils");
      const roomCode = generateRoomCode(6);

      const room = await createBattleRoom(
        roomCode, 
        randomSubject,
        userId,
        100 // League stake
      );

      const player = await insertRoomPlayer(room.id, playerName);
      persistIdentity(player.id);
      localStorage.setItem("createdRoomCode", roomCode);
      router.push(`/battle/${roomCode}`);
    } catch (err: unknown) {
      const error = err as Error;
      setError(error.message);
    } finally {
      setBusy(false);
      setFindingOpponent(false);
    }
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit || busy) return;
    if (mode === "create") await createRoom();
    else if (mode === "join") await joinRoom();
    else if (mode === "quick") await handleQuickMatch();
    else if (mode === "league") await handleLeagueMatch();
  };

  const avatarLetter = (playerName.trim()[0] ?? "?").toUpperCase();
  const joinNormalized = normalizeRoomCode(joinCode);

  const [autoJoining, setAutoJoining] = useState(false);

  // Auto-join from URL param
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const roomFromUrl = urlParams.get("room");
    if (roomFromUrl && roomFromUrl.length === 6 && !joinCode) {
      setJoinCode(roomFromUrl);
      setMode("join");
      setAutoJoining(true);
    }
  }, []);

  // Trigger auto-join when name and code are ready
  useEffect(() => {
    if (autoJoining && playerName && joinCode.length === 6 && mode === "join" && !busy) {
      setAutoJoining(false);
      joinRoom();
    }
  }, [autoJoining, playerName, joinCode, mode, busy]);

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

  return (
    <div className="min-h-screen bg-[#0f0f1a] text-zinc-200 relative overflow-x-hidden">
      {/* BACKGROUND IMAGE */}
      <img
        src="https://images.unsplash.com/photo-1542751371-adc38448a05e?w=1920&q=80"
        alt=""
        className="fixed inset-0 w-full h-full object-cover pointer-events-none"
        style={{ opacity: 0.10 }}
      />
      <div className="fixed inset-0 bg-[#0a0a12]/90 pointer-events-none z-0" />

      <div className="relative z-10">
        {/* HERO BANNER */}
        <div
          className="py-16 text-center relative overflow-hidden"
          style={{ background: "linear-gradient(135deg, #0f0a1e, #1a0a2e)" }}
        >
          <img
            src="https://images.unsplash.com/photo-1511512578047-dfb367046420?w=1920&q=80"
            className="absolute inset-0 w-full h-full object-cover"
            style={{ opacity: 0.12 }}
            alt=""
          />
          <div className="absolute inset-0 bg-[#0f0a1e]/60" />
          <div className="relative z-10 px-4">
            <h1 className="text-white text-5xl font-black">Battle Arena</h1>
            <p className="text-zinc-300 text-lg mt-2">
              Challenge real students. Stake your amount. Winner takes all.
            </p>
          </div>
        </div>

        <div className="relative mx-auto max-w-2xl px-4 pb-16 pt-6 sm:pt-10">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-semibold uppercase tracking-[0.38em] text-[#7c3aed]">
              QUIZ ARENA
            </p>
            <Link
              href="/"
              className="text-xs font-medium text-zinc-400 transition hover:text-[#7c3aed]"
            >
              Back to Home
            </Link>
          </div>

          <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-2 rounded-xl border border-white/10 p-1 bg-white/5 backdrop-blur-sm">
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
              onClick={() => setMode("quick")}
            >
              ⚡ Quick
            </button>
            <button
              type="button"
              className={`rounded-lg px-2 py-2 text-[10px] font-bold uppercase tracking-wider transition ${mode === "league" ? "bg-[#7c3aed] text-white" : "text-zinc-400"}`}
              onClick={() => setMode("league")}
            >
              🏆 League
            </button>
          </div>

          <div className="mt-8 rounded-3xl border border-white/10 bg-white/5 p-5 shadow-2xl backdrop-blur sm:p-7">
            <form onSubmit={onSubmit} className="space-y-6">
              <div>
                <label className="text-xs font-semibold uppercase tracking-[0.22em] text-[#f59e0b]">
                  Player name
                </label>
                <div className="mt-2 flex items-center gap-3 rounded-2xl border border-white/10 bg-black/40 px-3 py-2.5 focus-within:border-[#7c3aed]/60">
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
                <div className="grid gap-6 sm:grid-cols-2">
                  <div>
                    <label className="text-xs font-semibold uppercase tracking-[0.22em] text-[#f59e0b]">
                      Subject
                    </label>
                    <div className="mt-2 rounded-2xl border border-white/10 bg-black/40 px-3 py-2.5 focus-within:border-[#7c3aed]/60">
                      <select
                        value={subject}
                        onChange={(e) => setSubject(e.target.value)}
                        className="w-full appearance-none bg-transparent text-sm text-white outline-none"
                      >
                        {SUBJECTS.map((s) => (
                          <option key={s.slug} value={s.slug} className="bg-[#1a1a2e]">
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
                        <span className="text-zinc-200">₦{stakeAmount}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-zinc-400">Total Pool:</span>
                        <span className="text-zinc-200">₦{prizeBreakdown.totalPool}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-zinc-400">Platform (20%):</span>
                        <span className="text-zinc-200">₦{prizeBreakdown.platformCut}</span>
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
                <div className="space-y-4">
                  <div>
                    <label className="text-xs font-semibold uppercase tracking-[0.22em] text-[#f59e0b]">
                      Room code
                    </label>
                    <input
                      value={joinCode}
                      onChange={(e) => setJoinCode(e.target.value)}
                      placeholder="XXXXXX"
                      className="mt-2 w-full rounded-2xl border border-white/10 bg-black/40 px-4 py-4 text-center font-mono text-xl tracking-[0.35em] text-white outline-none focus:border-[#7c3aed]"
                    />
                  </div>
                  
                  {joinNormalized.length === 6 && (
                    <div className="rounded-2xl border border-white/10 bg-black/60 p-5 backdrop-blur-sm">
                      {joinPreviewLoading ? (
                        <p className="text-center text-xs text-zinc-500 animate-pulse">Looking up room...</p>
                      ) : joinPreview ? (
                        <div className="space-y-3 text-sm">
                          <div className="flex justify-between">
                            <span className="text-zinc-400">Subject:</span>
                            <span className="font-bold text-white uppercase tracking-wider">{getSubjectMeta(joinPreview.subject)?.title}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-zinc-400">Stake:</span>
                            <span className="font-bold text-[#f59e0b]">{joinPreview.stake_amount === 0 ? "Free" : `₦${joinPreview.stake_amount}`}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-zinc-400">Players:</span>
                            <span className="text-white font-bold">{joinPreview.current_players} / {joinPreview.max_players}</span>
                          </div>
                        </div>
                      ) : (
                        <p className="text-center text-xs text-red-400 font-bold">Room not found or expired.</p>
                      )}
                    </div>
                  )}
                </div>
              )}

              {(mode === "quick" || mode === "league") && (
                <div className="py-10 text-center">
                  {findingOpponent ? (
                    <div className="space-y-4">
                      <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-[#7c3aed] border-t-transparent"></div>
                      <p className="text-sm font-bold text-zinc-400 uppercase tracking-widest">Finding opponent...</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <p className="text-sm text-zinc-400">
                        {mode === "quick" 
                          ? "Jump into a fast 1v1 battle with a random subject." 
                          : "Compete in the league for a ₦100 stake."}
                      </p>
                      <div className="rounded-2xl bg-white/5 p-4 border border-white/10">
                         <p className="text-[10px] font-bold text-[#f59e0b] uppercase tracking-[0.2em]">
                           {mode === "quick" ? "FREE ENTRY" : "ENTRY FEE: ₦100"}
                         </p>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {error && (
                <div className="rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200 font-medium">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={!canSubmit || busy}
                className="w-full rounded-2xl bg-[#7c3aed] py-5 text-sm font-black tracking-[0.15em] text-white shadow-2xl shadow-[#7c3aed]/30 transition hover:bg-[#6d28d9] active:scale-[0.98] disabled:opacity-50"
              >
                {busy ? "PROCESSING..." : mode === "create" ? "CREATE PRIVATE ROOM" : mode === "join" ? "JOIN BATTLE" : mode === "quick" ? "START QUICK MATCH" : "ENTER LEAGUE"}
              </button>

              <p className="text-center text-[10px] text-zinc-500 uppercase tracking-[0.2em] font-bold">
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
    </div>
  );
}
