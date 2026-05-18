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
  
  const [quickSubject, setQuickSubject] = useState<string>(SUBJECTS[0]?.slug ?? "maths");
  const [quickStake, setQuickStake] = useState<number>(100);
  const QUICK_STAKE_OPTIONS = [100, 200, 300, 500, 1000, 2000];
  const [searchingMsg, setSearchingMsg] = useState<string>("Searching for opponent...");

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

      // Check free daily limit for private rooms
      if (stakeAmount === 0) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        const { count, error: countError } = await supabase
          .from("battle_rooms")
          .select("*", { count: 'exact', head: true })
          .eq("host_id", userId)
          .eq("stake_amount", 0)
          .gte("created_at", today.toISOString());
        
        if (countError) throw countError;
        
        if (count && count >= 1) {
          throw new Error("You've used your free challenge for today. Come back tomorrow or stake ₦100+ to play more.");
        }
      }
      
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
        stakeAmount,
        maxPlayers
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
   if (!playerName.trim()) { setError("Please enter your name first."); return; } 
   setBusy(true); 
   setError(null); 
   setFindingOpponent(true); 
   setSearchingMsg("Searching for opponent..."); 
   const supabase = getSupabaseClient(); 
   let queueId: string | null = null; 
 
   try { 
     const { data: { user } } = await supabase.auth.getUser(); 
     const userId = user?.id; 
     if (!userId) throw new Error("Please sign in to play."); 
 
     if (quickStake > 0) { 
       const balance = await getWalletBalance(userId); 
       if (balance < quickStake) throw new Error(`Insufficient balance. Need ₦${quickStake}, have ₦${balance}.`); 
     } 
 
     // Clean up any old entries for this user 
     await supabase.from("matchmaking_queue").delete().eq("user_id", userId); 
 
     // Atomically find opponent or join queue 
     const { data: matchResult, error: matchError } = await supabase.rpc('match_quick_battle', { 
       p_user_id: userId, 
       p_stake_amount: quickStake, 
       p_subject: quickSubject 
     }); 
     if (matchError) throw matchError; 
 
     if (matchResult.matched === true) { 
       // Found a waiting player — create the room and send both players in 
       setSearchingMsg("Opponent found! Starting battle..."); 
       const { generateRoomCode } = await import("@/app/battle/battleUtils"); 
       const roomCode = generateRoomCode(6); 
 
       const room = await createBattleRoom(roomCode, quickSubject, userId, quickStake); 
       const player = await insertRoomPlayer(room.id, playerName); 
       persistIdentity(player.id); 
       localStorage.setItem("createdRoomCode", roomCode); 
 
       if (quickStake > 0) { 
         await processTransaction(userId, "stake", quickStake, `qm-${roomCode}-${userId}-${Date.now()}`, `Quick match ₦${quickStake}`); 
       } 
 
       // Tell the waiting player the room is ready 
       await supabase.from("matchmaking_queue") 
         .update({ status: "matched", room_id: room.id, room_code: roomCode }) 
         .eq("id", matchResult.opponent_queue_id); 
 
       await supabase.from("battle_rooms") 
         .update({ guest_id: matchResult.opponent_id, started_at: new Date().toISOString() }) 
         .eq("id", room.id); 
 
       // Go straight to battle — no room code shown 
       router.push(`/battle/${roomCode}/play`); 
 
     } else { 
       // No opponent yet — wait silently until one appears 
       queueId = matchResult.queue_id; 
       const startTime = Date.now(); 
       let dots = 0; 
 
       while (Date.now() - startTime < 120000) { 
         await new Promise(r => setTimeout(r, 2000)); 
         dots = (dots + 1) % 4; 
         setSearchingMsg("Finding you an opponent" + ".".repeat(dots + 1)); 
 
         const { data: myEntry } = await supabase 
           .from("matchmaking_queue") 
           .select("status, room_id, room_code") 
           .eq("id", queueId) 
           .maybeSingle(); 
 
         if (!myEntry) throw new Error("Session lost. Please try again."); 
 
         if (myEntry.status === "matched" && myEntry.room_code) { 
           setSearchingMsg("Opponent found! Joining battle..."); 
           const player = await insertRoomPlayer(myEntry.room_id, playerName); 
           persistIdentity(player.id); 
 
           if (quickStake > 0) { 
             await processTransaction(userId, "stake", quickStake, `qm-${myEntry.room_code}-${userId}-${Date.now()}`, `Quick match ₦${quickStake}`); 
           } 
 
           // Go straight to battle — no room code shown 
           router.push(`/battle/${myEntry.room_code}/play`); 
           await supabase.from("matchmaking_queue").delete().eq("id", queueId); 
           return; 
         } 
       } 
 
       await supabase.from("matchmaking_queue").delete().eq("id", queueId); 
       throw new Error("No opponent found. Try again in a moment."); 
     } 
 
   } catch (err: unknown) { 
     if (queueId) await supabase.from("matchmaking_queue").delete().eq("id", queueId); 
     setError((err as Error)?.message ?? "Matchmaking failed."); 
   } finally { 
     setBusy(false); 
     setFindingOpponent(false); 
     setSearchingMsg("Searching for opponent..."); 
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

      const stake = 100;

      // 1. Add to matchmaking queue
      const { data: queueEntry, error: queueError } = await supabase
        .from("matchmaking_queue")
        .insert({
          user_id: userId,
          stake_amount: stake,
          status: 'searching'
        })
        .select()
        .single();

      if (queueError) throw queueError;

      // 2. Look for opponent
      let matchFound = false;
      const startTime = Date.now();
      const timeout = 120000; // 2 minutes

      while (Date.now() - startTime < timeout) {
        // Check if we've been matched (status changed to 'matched' and room_id is set)
        const { data: currentEntry } = await supabase
          .from("matchmaking_queue")
          .select("status, room_id")
          .eq("id", queueEntry.id)
          .single();

        if (currentEntry?.status === 'matched' && currentEntry.room_id) {
          // We were matched by someone else
          const { data: room } = await supabase
            .from("battle_rooms")
            .select("room_code")
            .eq("id", currentEntry.room_id)
            .single();
          
          if (room) {
            persistIdentity(userId); 
            router.push(`/battle/${room.room_code}`);
            matchFound = true;
            break;
          }
        }

        // Try to find someone else waiting
        const { data: opponent } = await supabase
          .from("matchmaking_queue")
          .select("id, user_id")
          .eq("stake_amount", stake)
          .eq("status", "searching")
          .neq("user_id", userId)
          .order("created_at", { ascending: true })
          .limit(1)
          .maybeSingle();

        if (opponent) {
          // Found someone! Create room and match both
          const subjects = ["maths","english","physics","chemistry","biology","government","economics"];
          const randomSubject = subjects[Math.floor(Math.random() * subjects.length)];
          const { generateRoomCode } = await import("@/app/battle/battleUtils");
          const roomCode = generateRoomCode(6);

          const room = await createBattleRoom(
            roomCode, 
            randomSubject,
            userId,
            stake
          );

          // Update both queue entries
          await supabase
            .from("matchmaking_queue")
            .update({ status: 'matched', room_id: room.id })
            .in("id", [queueEntry.id, opponent.id]);

          // Join the room
          const player = await insertRoomPlayer(room.id, playerName);
          persistIdentity(player.id);
          localStorage.setItem("createdRoomCode", roomCode);
          router.push(`/battle/${roomCode}`);
          matchFound = true;
          break;
        }

        // Wait 3 seconds before polling again
        await new Promise(r => setTimeout(r, 3000));
      }

      if (!matchFound) {
        // Timeout: remove from queue
        await supabase
          .from("matchmaking_queue")
          .delete()
          .eq("id", queueEntry.id);
        setError("No opponent found. Try again.");
      }

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

              {mode === "quick" && ( 
                <div className="space-y-5"> 
                  <div> 
                    <label className="block text-xs font-bold text-zinc-400 uppercase tracking-widest mb-3">Choose Subject</label> 
                    <div className="grid grid-cols-3 gap-2"> 
                      {SUBJECTS.map((s) => ( 
                        <button 
                          key={s.slug} 
                          type="button" 
                          onClick={() => setQuickSubject(s.slug)} 
                          className={`rounded-xl py-2.5 px-3 text-xs font-bold transition border ${quickSubject === s.slug ? "bg-[#7c3aed] border-[#7c3aed] text-white" : "bg-white/5 border-white/10 text-zinc-400 hover:border-[#7c3aed]/50"}`} 
                        > 
                          {s.title} 
                        </button> 
                      ))} 
                    </div> 
                  </div> 
              
                  <div> 
                    <label className="block text-xs font-bold text-zinc-400 uppercase tracking-widest mb-3">Stake Amount</label> 
                    <div className="grid grid-cols-3 gap-2"> 
                      {QUICK_STAKE_OPTIONS.map((amt) => ( 
                        <button 
                          key={amt} 
                          type="button" 
                          onClick={() => setQuickStake(amt)} 
                          className={`rounded-xl py-2.5 text-xs font-black transition border ${quickStake === amt ? "bg-[#f59e0b] border-[#f59e0b] text-black" : "bg-white/5 border-white/10 text-zinc-400 hover:border-[#f59e0b]/50"}`} 
                        > 
                          ₦{amt.toLocaleString()} 
                        </button> 
                      ))} 
                    </div> 
                  </div> 
              
                  <div className="rounded-xl bg-white/5 border border-white/10 p-4 text-xs text-zinc-400 space-y-1"> 
                    <div className="flex justify-between"><span>Stake</span><span className="text-white font-bold">₦{quickStake.toLocaleString()}</span></div> 
                    <div className="flex justify-between"><span>You can win</span><span className="text-emerald-400 font-bold">₦{(quickStake * 2 * 0.8).toLocaleString()}</span></div> 
                    <div className="flex justify-between"><span>Subject</span><span className="text-[#7c3aed] font-bold capitalize">{quickSubject}</span></div> 
                  </div> 
              
                  {findingOpponent && ( 
                    <div className="rounded-xl bg-[#7c3aed]/10 border border-[#7c3aed]/30 p-4 text-center"> 
                      <div className="text-2xl mb-2 animate-spin inline-block">⚡</div> 
                      <div className="text-sm font-bold text-white">{searchingMsg}</div> 
                      <div className="text-xs text-zinc-400 mt-1">Matching you with a ₦{quickStake} opponent...</div> 
                    </div> 
                  )} 
                </div> 
              )}

              {mode === "league" && (
                <div className="py-10 text-center">
                  {findingOpponent ? (
                    <div className="space-y-4">
                      <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-[#7c3aed] border-t-transparent"></div>
                      <p className="text-sm font-bold text-zinc-400 uppercase tracking-widest">Finding opponent...</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <p className="text-sm text-zinc-400">
                        Compete in the league for a ₦100 stake.
                      </p>
                      <div className="rounded-2xl bg-white/5 p-4 border border-white/10">
                         <p className="text-[10px] font-bold text-[#f59e0b] uppercase tracking-[0.2em]">
                           ENTRY FEE: ₦100
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
                {mode === "quick" && findingOpponent
                  ? searchingMsg
                  : busy
                  ? "PROCESSING..."
                  : mode === "create"
                  ? "CREATE PRIVATE ROOM"
                  : mode === "join"
                  ? "JOIN BATTLE"
                  : mode === "quick"
                  ? "⚡ Find Quick Match"
                  : "ENTER LEAGUE"}
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



