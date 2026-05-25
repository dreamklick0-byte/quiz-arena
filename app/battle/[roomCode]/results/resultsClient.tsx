"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createBattleRoom } from "@/lib/battleRoom";
import { getSubjectMeta } from "@/app/data/practiceQuestions";
import {
  safeIncrementSubjectWin,
  safeRecordDailyActivity,
} from "@/lib/activityRpc";
import { supabase } from "@/lib/supabase";
import { useGamificationStore } from "@/lib/gamificationStore";
import VictoryScreen from "@/app/components/VictoryScreen";
import DefeatScreen from "@/app/components/DefeatScreen";
import { getRankFromXp, TIER_COLORS } from '@/lib/rankSystem';
import { getSupabaseClient } from "@/lib/supabase";

type RoomPlayer = {
  id: string;
  player_name: string | null;
  score: number | null;
  time_seconds: number | null;
};

export function ResultsClient({ roomCode }: { roomCode: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [players, setPlayers] = useState<RoomPlayer[]>([]);
  const [roomSubject, setRoomSubject] = useState<string | null>(null);
  const [rematchBusy, setRematchBusy] = useState(false);
  const [prizesPaid, setPrizesPaid] = useState(false);
  const [prizeResults, setPrizeResults] = useState<{
    user_id: string;
    prize: number;
    rank: number;
  }[]>([]);
  const [showVictory, setShowVictory] = useState(false); 
  const [victorySoundPlayed, setVictorySoundPlayed] = useState(false); 
  const [victoryProps, setVictoryProps] = useState<any>(null);
  const [showDefeat, setShowDefeat] = useState(false);
  const [defeatProps, setDefeatProps] = useState<any>(null);
  const [playerRanks, setPlayerRanks] = useState<Record<string, any>>({});
  const [myUserId, setMyUserId] = useState<string | null>(null); 
  const [opponentName, setOpponentName] = useState<string | null>(null); 
  const [rematchStatus, setRematchStatus] = useState< 
    'idle' | 'sent' | 'received' | 'accepted' | 'declined' 
  >('idle'); 
  const [rematchRoomCode, setRematchRoomCode] = useState<string | null>(null); 
  const [currentRoomData, setCurrentRoomData] = useState<any>(null); 
  
  const { 
    xp, level, xpToNextLevel, rank: currentRank, 
    addXP, addCoins, updateStreak 
  } = useGamificationStore();

  const normalizedPlayers = useMemo(() => {
    const mapped = players.map((p) => ({
      ...p,
      player_name: p.player_name?.trim() || "Player",
      score: typeof p.score === "number" ? p.score : 0,
      time_seconds: typeof p.time_seconds === "number" ? p.time_seconds : 120,
    }));

    // STEP 7 — Tiebreaker logic: 
    // Winner = higher score
    // If scores equal = faster time wins
    // If scores AND time equal = Draw
    mapped.sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return a.time_seconds - b.time_seconds; // Lower time is better (faster)
    });
    return mapped.slice(0, 2);
  }, [players]);

  const winner = useMemo(() => {
    if (normalizedPlayers.length < 2) return null;
    const [a, b] = normalizedPlayers;
    
    // If scores AND time equal = Draw
    if (a.score === b.score && a.time_seconds === b.time_seconds) {
      return { type: "draw" as const };
    }
    
    // Since we sorted mapped, a is the winner (either higher score or faster time)
    return { type: "winner" as const, id: a.id };
  }, [normalizedPlayers]);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const { data: room, error: roomErr } = await supabase
          .from("battle_rooms")
          .select("*")
          .eq("room_code", roomCode)
          .single();

        if (roomErr) throw roomErr;
        if (!cancelled) setRoomSubject(room.subject ?? null);

        const { data: roomPlayers, error: playersErr } = await supabase
          .from("room_players")
          .select("id, player_name, user_id")
          .eq("room_id", room.id)
          .order("joined_at", { ascending: true });

        if (playersErr) throw playersErr;

        const merged: RoomPlayer[] = (roomPlayers ?? []).map((p, idx) => {
          const pIdx = room.host_id === p.user_id ? 1 : 2;
          return {
            id: p.id,
            player_name: p.player_name,
            score: (room as any)[`player${pIdx}_score`],
            time_seconds: (room as any)[`player${pIdx}_time_seconds`],
          };
        });

        if (!cancelled) {
          setPlayers(merged);
          
          // Trigger prize distribution if not paid
          if (!room.prizes_paid && room.status === 'finished') {
            const res = await fetch('/api/battle/distribute-prizes', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ roomCode })
            });
            const prizeData = await res.json();
            if (prizeData.success && prizeData.results) {
              setPrizeResults(prizeData.results);
              setPrizesPaid(true);

              // QUIZ ARENA EXPANSION — START
              // Update gamification stats for the current user
              const { data: sessionData } = await supabase.auth.getSession();
              const myUserId = sessionData?.session?.user?.id;
              const myResult = prizeData.results.find((r: any) => r.user_id === myUserId);
              
              if (myResult) {
                // Participation XP
                let xpGained = 50; 
                
                // Get current user's player ID from localStorage
                const myLocalPlayerId = typeof window !== "undefined" ? localStorage.getItem("playerId") : null;
                const myPlayer = merged.find(p => p.id === myLocalPlayerId);
                const opponent = roomPlayers?.find((p: any) => p.user_id !== myUserId);

                // Win Bonus
                if (myResult.rank === 1) {
                  xpGained += 150;
                  
                  // Prepare Victory Props
                  setVictoryProps({
                    playerName: myPlayer?.player_name || "You",
                    opponentName: opponent?.player_name || "Opponent",
                    subject: room.subject || "General",
                    score: myPlayer?.score || 0,
                    totalQuestions: 10, 
                    accuracy: ((myPlayer?.score || 0) / 10) * 100,
                    coinsWon: myResult.prize || 0,
                    xpGained: xpGained,
                    oldRank: currentRank || 100,
                    newRank: Math.max(1, (currentRank || 100) - 5), 
                    currentXP: xp,
                    xpToNextLevel: xpToNextLevel,
                    level: level
                  });
                  
                  setShowVictory(true);
                  updateStreak('battle');
                } else {
                  // Loss - Prepare Defeat Props
                  setDefeatProps({
                    playerName: myPlayer?.player_name || "You",
                    opponentName: opponent?.player_name || "Opponent",
                    subject: room.subject || "General",
                    examType: "Private Battle",
                    playerScore: myPlayer?.score || 0,
                    opponentScore: (opponent as any)?.score || 0,
                    accuracy: ((myPlayer?.score || 0) / 10) * 100,
                    xpEarned: xpGained,
                  });
                  setShowDefeat(true);
                }
                
                addXP(xpGained);
                if (myResult.prize > 0) {
                  addCoins(myResult.prize);
                }
              }
              // QUIZ ARENA EXPANSION — END
            }
          } else if (room.prizes_paid) {
            setPrizesPaid(true);
            
            // If prizes were already paid, we still want to show victory if we won
            const { data: sessionData } = await supabase.auth.getSession();
            const myUserId = sessionData?.session?.user?.id;
            
            if (myUserId) {
              const { data: roomResults } = await supabase
                .from("battle_rooms")
                .select("winner_id, second_place_id, third_place_id, player1_score, player2_score, player1_time_seconds, player2_time_seconds")
                .eq("room_code", roomCode)
                .single();
              
              if (roomResults && roomResults.winner_id === myUserId) {
                // Check if we've already shown it for this room to avoid repeat on refresh
                const flagKey = `victory-shown-${roomCode}`;
                if (!cancelled && !sessionStorage.getItem(flagKey)) {
                  // Get current user's player ID from localStorage
                  const myLocalPlayerId = typeof window !== "undefined" ? localStorage.getItem("playerId") : null;
                  // Re-calculate basic props for victory
                  const myPlayer = merged.find(p => p.id === myLocalPlayerId);
                  const opponent = merged.find(p => p.id !== myLocalPlayerId);
                  
                  setVictoryProps({
                    playerName: myPlayer?.player_name || "You",
                    opponentName: opponent?.player_name || "Opponent",
                    subject: roomSubject || "General",
                    score: myPlayer?.score || 0,
                    totalQuestions: 10,
                    accuracy: ((myPlayer?.score || 0) / 10) * 100,
                    coinsWon: 0, // already paid
                    xpGained: 200,
                    oldRank: currentRank || 100,
                    newRank: Math.max(1, (currentRank || 100) - 5),
                    currentXP: xp,
                    xpToNextLevel: xpToNextLevel,
                    level: level
                  });
                  setShowVictory(true);
                  sessionStorage.setItem(flagKey, "1");
                }
              } else if (roomResults && myUserId) {
                // Loss/Draw - Check if we've already shown it
                const flagKey = `defeat-shown-${roomCode}`;
                if (!cancelled && !sessionStorage.getItem(flagKey)) {
                  const myLocalPlayerId = typeof window !== "undefined" ? localStorage.getItem("playerId") : null;
                  const myPlayer = merged.find(p => p.id === myLocalPlayerId);
                  const opponent = merged.find(p => p.id !== myLocalPlayerId);

                  setDefeatProps({
                    playerName: myPlayer?.player_name || "You",
                    opponentName: opponent?.player_name || "Opponent",
                    subject: roomSubject || "General",
                    examType: "Private Battle",
                    playerScore: myPlayer?.score || 0,
                    opponentScore: opponent?.score || 0,
                    accuracy: ((myPlayer?.score || 0) / 10) * 100,
                    xpEarned: 50,
                  });
                  setShowDefeat(true);
                  sessionStorage.setItem(flagKey, "1");
                }
              }
            }
          }
        }
      } catch (e: unknown) {
        if (!cancelled) setError((e as Error)?.message ?? "Failed to load results.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [roomCode]);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}m ${s}s`;
  };

  const winnerPlayerId =
    winner?.type === "winner" ? winner.id : null;

  useEffect(() => { 
    const fetchPlayerRanks = async () => { 
      try { 
        const supabaseClient = getSupabaseClient(); 
        const playerIds = players.map((p: any) => p.user_id).filter(Boolean); 
        if (playerIds.length === 0) return; 
  
        const { data } = await supabaseClient 
          .from('user_ranks') 
          .select('user_id, current_rank, rank_tier, total_xp') 
          .in('user_id', playerIds); 
  
        if (data) { 
          const rankMap: Record<string, any> = {}; 
          data.forEach((r: any) => { rankMap[r.user_id] = r; }); 
          setPlayerRanks(rankMap); 
        } 
      } catch (e) { 
        console.error('Fetch player ranks error:', e); 
      } 
    }; 
  
    if (players?.length > 0) fetchPlayerRanks(); 
  }, [players]);

  useEffect(() => { 
    const awardBattleXp = async () => { 
      try { 
        const supabaseClient = getSupabaseClient(); 
        const { data: { user } } = await supabaseClient.auth.getUser(); 
        if (!user) return; 
  
        const isWinner = winner?.type === 'winner' && winner.id === (typeof window !== "undefined" ? localStorage.getItem("playerId") : null); 
  
        await fetch('/api/battle/award-xp', { 
          method: 'POST', 
          headers: { 'Content-Type': 'application/json' }, 
          body: JSON.stringify({ 
            userId: user.id, 
            result: isWinner ? 'win' : 'loss', 
            subject: roomSubject || 'General', 
          }), 
        }); 
      } catch (e) { 
        console.error('XP award error:', e); 
      } 
    }; 
  
    if (winner) { 
      awardBattleXp(); 
    } 
  }, [winner, roomSubject]);

  useEffect(() => {
    if (loading || error || normalizedPlayers.length < 2 || !roomSubject) {
      return;
    }
    const flagKey = `quiz-arena-battle-result-${roomCode}`;
    if (typeof window !== "undefined") {
      if (sessionStorage.getItem(flagKey)) return;
      sessionStorage.setItem(flagKey, "1");
    }
    void (async () => {
      await safeRecordDailyActivity();
      const myId =
        typeof window !== "undefined"
          ? window.localStorage.getItem("playerId")
          : null;
      if (
        !myId ||
        !winnerPlayerId ||
        winnerPlayerId !== myId ||
        !roomSubject
      ) {
        return;
      }
      await safeIncrementSubjectWin(roomSubject);
    })();
  }, [
    loading,
    error,
    normalizedPlayers.length,
    roomSubject,
    roomCode,
    winnerPlayerId,
  ]);

  useEffect(() => { 
    const init = async () => { 
      const sb = getSupabaseClient(); 
      const { data: { user } } = await sb.auth.getUser(); 
      if (!user) return; 
      setMyUserId(user.id); 

      const { data: room } = await sb 
        .from('battle_rooms') 
        .select('*') 
        .eq('room_code', roomCode) 
        .single(); 
      if (room) setCurrentRoomData(room); 

      // Subscribe to rematch changes on this room 
      const channel = sb 
        .channel(`rematch:${roomCode}`) 
        .on('postgres_changes', { 
          event: 'UPDATE', 
          schema: 'public', 
          table: 'battle_rooms', 
          filter: `room_code=eq.${roomCode}`, 
        }, (payload) => { 
          const updated = payload.new as any; 
          // Someone requested a rematch and it's not me 
          if (updated.rematch_requested_by && 
              updated.rematch_requested_by !== user.id && 
              !updated.rematch_accepted) { 
            setRematchStatus('received'); 
          } 
          // Rematch was accepted 
          if (updated.rematch_accepted && updated.rematch_room_code) { 
            setRematchRoomCode(updated.rematch_room_code); 
            setRematchStatus('accepted'); 
            const initJoin = async () => {
              const { data: { user: currentUser } } = await sb.auth.getUser(); 
              if (currentUser) { 
                const p1name = typeof window !== 'undefined' 
                  ? window.localStorage.getItem('playerName')?.trim() || 'Player' 
                  : 'Player'; 
                const { data: newRoomRow } = await sb 
                  .from('battle_rooms') 
                  .select('id') 
                  .eq('room_code', updated.rematch_room_code) 
                  .single(); 
                if (newRoomRow) { 
                  await sb.from('room_players').insert({ 
                    room_id: newRoomRow.id, 
                    player_name: p1name, 
                    user_id: currentUser.id, 
                    score: 0, 
                    finished: false, 
                    is_ready: true, 
                  }); 
                } 
              } 
              setTimeout(() => { 
                router.push(`/battle/${updated.rematch_room_code}`); 
              }, 800); 
            };
            initJoin();
          } 
        }) 
        .subscribe(); 

      return () => { sb.removeChannel(channel); }; 
    }; 
    init(); 
  }, [roomCode, router]); 

  const subjectLabel = roomSubject
    ? getSubjectMeta(roomSubject)?.title ?? roomSubject
    : null;
  const subjectEmoji =
    roomSubject && getSubjectMeta(roomSubject)?.emoji
      ? `${getSubjectMeta(roomSubject)!.emoji} `
      : "";

  async function handleRematch() { 
    setRematchBusy(true); 
    try { 
      const sb = getSupabaseClient(); 
      const { data: { user } } = await sb.auth.getUser(); 
      if (!user) { router.push('/battle'); return; } 

      const { data: room } = await sb 
        .from('battle_rooms') 
        .select('*') 
        .eq('room_code', roomCode) 
        .single(); 

      if (!room) { router.push('/battle'); return; } 

      await sb 
        .from('battle_rooms') 
        .update({ rematch_requested_by: user.id }) 
        .eq('room_code', roomCode); 

      setRematchStatus('sent'); 
    } catch (e) { 
      console.error('handleRematch error:', e); 
    } finally { 
      setRematchBusy(false); 
    } 
  } 

  async function handleAcceptRematch() { 
    if (!myUserId || !currentRoomData) return; 
    setRematchBusy(true); 
    try { 
      const sb = getSupabaseClient(); 
      const { data: { user } } = await sb.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const name = typeof window !== 'undefined' 
        ? window.localStorage.getItem('playerName')?.trim() || 'Player' 
        : 'Player'; 
      const { generateRoomCode } = await import('@/app/battle/battleUtils'); 
      const newCode = generateRoomCode(); 
      
      const { data: newRoom, error: roomErr } = await sb 
        .from('battle_rooms') 
        .insert({ 
          room_code: newCode, 
          max_players: 2, 
          subject: currentRoomData?.subject || 'maths', 
          host_id: user.id, 
          status: 'waiting', 
          stake_amount: currentRoomData?.stake_amount || 0, 
          prize_pool: currentRoomData?.stake_amount 
            ? Math.floor(currentRoomData.stake_amount * 1.6) 
            : 0, 
        }) 
        .select('id, room_code') 
        .single(); 
 
      if (roomErr || !newRoom) throw roomErr; 
 
      await sb.from('room_players').insert({ 
        room_id: newRoom.id, 
        player_name: name, 
        user_id: user.id, 
        score: 0, 
        finished: false, 
        is_ready: true, 
      }); 

      // Signal accepted with new room code 
      await sb 
        .from('battle_rooms') 
        .update({ rematch_accepted: true, rematch_room_code: newCode }) 
        .eq('room_code', roomCode); 
      window.localStorage.setItem('createdRoomCode', newCode); 
      setRematchStatus('accepted'); 
      setTimeout(() => router.push(`/battle/${newCode}`), 500); 
    } catch { 
      setRematchBusy(false); 
    } 
  } 

  async function handleDeclineRematch() { 
    const sb = getSupabaseClient(); 
    await sb 
      .from('battle_rooms') 
      .update({ rematch_requested_by: null }) 
      .eq('room_code', roomCode); 
    setRematchStatus('idle'); 
  } 

  useEffect(() => {
    if (showVictory && !victorySoundPlayed) {
      setVictorySoundPlayed(true);
      try {
        const winAudio = new Audio("/QUIZ_ARENA_CHAMPION_SONG.mp3");
        winAudio.volume = 0.8;
        winAudio.play().catch(() => {});
      } catch (_) {}
    }
  }, [showVictory, victorySoundPlayed]);

  return (
    <>
      {showVictory && victoryProps && (
          {...victoryProps}
          onClose={() => setShowVictory(false)}
          onShare={() => {
            if (navigator.share) {
              navigator.share({
                title: 'I won a battle on Quiz Arena!',
                text: `I just defeated ${victoryProps.opponentName} in ${victoryProps.subject}!`,
                url: window.location.origin
              });
            }
          }}
          onRematch={handleRematch}
        />
      )}
      {showDefeat && defeatProps && (
        <DefeatScreen
          {...defeatProps}
          onClose={() => setShowDefeat(false)}
          onRematch={handleRematch}
          onPractice={() => router.push(`/practice/${roomSubject}`)}
        />
      )}
      <div className="min-h-screen bg-[#0f0f1a] text-zinc-100 px-4 py-10">
        <div className="pointer-events-none fixed inset-0 overflow-hidden">
          <div className="absolute -left-36 top-16 h-80 w-80 rounded-full bg-[#7c3aed]/20 blur-3xl" />
          <div className="absolute -right-24 bottom-24 h-80 w-80 rounded-full bg-[#f59e0b]/10 blur-3xl" />
        </div>

        <div className="relative mx-auto flex min-h-[calc(100vh-5rem)] max-w-lg flex-col">
          <header className="text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-[#7c3aed]">
              Quiz Arena
            </p>
            <h1 className="mt-3 bg-gradient-to-r from-white via-zinc-100 to-zinc-400 bg-clip-text text-3xl font-bold tracking-tight text-transparent">
              Results
            </h1>
            <p className="mt-2 text-xs font-medium text-zinc-500">
              Room: <span className="text-zinc-300">{roomCode}</span>
            </p>
            {subjectLabel && (
              <p className="mt-2 text-sm font-medium text-zinc-400">
                Subject:{" "}
                <span className="text-white">
                  {subjectEmoji}
                  {subjectLabel}
                </span>
              </p>
            )}
          </header>

          <main className="mt-8 flex-1">
            <div className="rounded-2xl border border-white/10 bg-[#161627]/90 p-5 shadow-xl shadow-black/40">
              {loading ? (
                <div className="text-center">
                  <p className="text-sm text-zinc-300">Loading final scores…</p>
                </div>
              ) : error ? (
                <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                  {error}
                </div>
              ) : normalizedPlayers.length < 2 ? (
                <div className="text-center">
                  <p className="text-sm font-semibold text-white">
                    Waiting for both players…
                  </p>
                  <p className="mt-2 text-xs text-zinc-400">
                    Once both scores are available, the winner will appear here.
                  </p>
                </div>
              ) : (
                <div>
                  <div className="text-center">
                    {winner?.type === "draw" ? (
                      <div className="space-y-1">
                        <p className="text-lg font-bold text-[#f59e0b]">🤝 Draw!</p>
                        <p className="text-xs text-zinc-400">Both players finished with the same score and time.</p>
                      </div>
                    ) : (
                      <div className="space-y-1">
                        {winner?.id === (typeof window !== "undefined" ? localStorage.getItem("playerId") : null) ? (
                          <>
                            <p className="text-lg font-bold text-[#f59e0b]">🏆 You win!</p>
                            {normalizedPlayers[0].score === normalizedPlayers[1].score && (
                              <p className="text-xs text-zinc-400">(faster time)</p>
                            )}
                          </>
                        ) : (
                          <p className="text-lg font-bold text-zinc-400">Better luck next time!</p>
                        )}
                        <p className="text-sm font-semibold text-white">
                          Winner:{" "}
                          {
                            normalizedPlayers.find((p) => p.id === winner?.id)
                              ?.player_name
                          }{" "}
                          🏆
                        </p>
                      </div>
                    )}
                    <p className="mt-4 text-xs text-zinc-500 uppercase tracking-wider">Final Standings</p>
                  </div>

                  <div className="mt-6 grid gap-3">
                    {normalizedPlayers.map((p, idx) => {
                      const isWinner = winner?.type === "winner" && winner.id === p.id;
                      const isMe = p.id === (typeof window !== "undefined" ? localStorage.getItem("playerId") : null);
                      return (
                        <div
                          key={p.id}
                          className={`rounded-2xl border bg-[#0f0f1a]/50 p-4 transition-all ${
                            isWinner
                              ? "border-[#f59e0b]/50 shadow-[0_0_15px_rgba(245,158,11,0.1)] bg-[#f59e0b]/5"
                              : "border-white/10"
                          }`}
                        >
                          <div className="flex items-center justify-between gap-4">
                            <div className="flex items-center gap-3">
                              <div className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold ${
                                isWinner ? "bg-[#f59e0b] text-black" : "bg-zinc-800 text-zinc-400"
                              }`}>
                                {idx + 1}
                              </div>
                              <div>
                                <p className="text-sm font-bold text-white">
                                  {isMe ? "You" : p.player_name} {isWinner ? "🏆" : ""}
                                  {(() => {
                                    const pRank = playerRanks[p.id];
                                    if (!pRank) return null;
                                    const rank = getRankFromXp(pRank.total_xp || 0);
                                    const color = TIER_COLORS[rank.tier];
                                    return (
                                      <span style={{ 
                                        marginLeft: '8px', 
                                        fontSize: '10px', 
                                        color: color, 
                                        fontWeight: 'bold', 
                                        background: `${color}22`, 
                                        padding: '1px 6px', 
                                        borderRadius: '10px', 
                                        border: `1px solid ${color}44`,
                                        verticalAlign: 'middle'
                                      }}> 
                                        {rank.emoji} {rank.name} 
                                      </span> 
                                    );
                                  })()}
                                </p>
                                <p className="text-[11px] text-zinc-500">
                                  {p.score}/10 — {formatTime(p.time_seconds || 0)}
                                </p>
                                {prizesPaid && (
                                  <p className="text-[10px] font-bold text-emerald-400 mt-1">
                                    {prizeResults.find(pr => pr.user_id === p.id)?.prize && prizeResults.find(pr => pr.user_id === p.id)!.prize > 0 
                                      ? `+₦${Math.floor(prizeResults.find(pr => pr.user_id === p.id)!.prize)}` 
                                      : "+₦0"}
                                  </p>
                                )}
                              </div>
                            </div>
                            <div className="text-right">
                              <p className={`text-xl font-black ${isWinner ? "text-[#f59e0b]" : "text-zinc-400"}`}>
                                {p.score}
                              </p>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </main>

          <footer className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
            {!loading && !error && normalizedPlayers.length >= 2 && ( 
              <> 
                {rematchStatus === 'idle' && ( 
                  <button 
                    type="button" 
                    onClick={handleRematch} 
                    disabled={rematchBusy} 
                    className="w-full rounded-xl border border-[#f59e0b]/40 bg-[#f59e0b]/15 px-5 py-3 text-center text-sm font-semibold text-[#f59e0b] transition hover:bg-[#f59e0b]/25 disabled:opacity-60 sm:col-span-2" 
                  > 
                    {rematchBusy ? 'Sending...' : '⚔️ Play Again (Rematch)'} 
                  </button> 
                )} 
                {rematchStatus === 'sent' && ( 
                  <div className="w-full rounded-xl border border-[#f59e0b]/40 bg-[#f59e0b]/10 px-5 py-3 text-center text-sm text-[#f59e0b] sm:col-span-2"> 
                    ⏳ Waiting for opponent to accept rematch... 
                  </div> 
                )} 
                {rematchStatus === 'received' && ( 
                  <div className="w-full rounded-xl border border-[#7c3aed]/60 bg-[#7c3aed]/20 px-5 py-4 sm:col-span-2"> 
                    <p className="text-center text-sm font-bold text-white mb-3"> 
                      ⚔️ Opponent wants a rematch! 
                    </p> 
                    <div className="flex gap-2"> 
                      <button 
                        onClick={handleAcceptRematch} 
                        disabled={rematchBusy} 
                        className="flex-1 rounded-xl bg-emerald-600 py-2 text-sm font-bold text-white hover:bg-emerald-500 disabled:opacity-60" 
                      > 
                        ✅ Accept 
                      </button> 
                      <button 
                        onClick={handleDeclineRematch} 
                        className="flex-1 rounded-xl bg-red-700/60 py-2 text-sm font-bold text-white hover:bg-red-600" 
                      > 
                        ❌ Decline 
                      </button> 
                    </div> 
                  </div> 
                )} 
                {rematchStatus === 'accepted' && ( 
                  <div className="w-full rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-5 py-3 text-center text-sm text-emerald-400 sm:col-span-2"> 
                    ✅ Rematch accepted! Redirecting... 
                  </div> 
                )} 
              </> 
            )} 
            <Link
              href="/battle"
              className="w-full rounded-xl bg-[#7c3aed] px-5 py-3 text-center text-sm font-semibold text-white shadow-lg shadow-[#7c3aed]/25 transition hover:bg-[#6d28d9] active:scale-[0.99]"
            >
              Play Again
            </Link>
            <Link
              href="/"
              className="w-full rounded-xl border border-white/10 bg-[#0f0f1a]/60 px-5 py-3 text-center text-sm font-semibold text-zinc-200 transition hover:border-[#7c3aed]/40 hover:text-white active:scale-[0.99]"
            >
              Back to Home
            </Link>
          </footer>
        </div>
      </div>
    </>
  );
}

