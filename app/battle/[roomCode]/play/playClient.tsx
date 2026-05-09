"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { getSupabaseClient } from "@/lib/supabase";
import {
  getQuestionsForSubject,
  getSubjectMeta,
  type Question,
} from "@/app/data/practiceQuestions";

const TIMER_SECONDS = 120; // Global 2-minute timer
const TOTAL_QUESTIONS = 10;

type RoomRow = {
  id: string;
  room_code: string;
  status: string;
  subject: string;
  current_question: number;
  player1_finished: boolean;
  player2_finished: boolean;
  player3_finished: boolean;
  player4_finished: boolean;
  player1_time_seconds: number | null;
  player2_time_seconds: number | null;
  player3_time_seconds: number | null;
  player4_time_seconds: number | null;
  player1_score: number | null;
  player2_score: number | null;
  player3_score: number | null;
  player4_score: number | null;
  started_at: string | null;
  ends_at: string | null;
};

type PlayerRow = {
  id: string;
  room_id: string;
  player_name: string;
  score: number;
  finished: boolean;
  joined_at: string;
};

export function BattlePlayClient({ roomCode }: { roomCode: string }) {
  const router = useRouter();
  const [room, setRoom] = useState<RoomRow | null>(null);
  const [players, setPlayers] = useState<PlayerRow[]>([]);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [error, setError] = useState<string | null>(null);

  const [index, setIndex] = useState(0);
  const [answered, setAnswered] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [timedOut, setTimedOut] = useState(false);
  const [globalTimeLeft, setGlobalTimeLeft] = useState(TIMER_SECONDS);
  const [playerStartedAt, setPlayerStartedAt] = useState<number | null>(null);

  const playersRef = useRef<PlayerRow[]>([]);
  useEffect(() => {
    playersRef.current = players;
  }, [players]);

  const playerId = useMemo(() => {
    return typeof window === "undefined" ? null : localStorage.getItem("playerId");
  }, []);
  const playerName = useMemo(() => {
    return typeof window === "undefined"
      ? null
      : localStorage.getItem("playerName");
  }, []);

  const q = questions[index];
  const barPct = Math.min(100, (globalTimeLeft / TIMER_SECONDS) * 100);
  const headerProgress = ((index + 1) / TOTAL_QUESTIONS) * 100;

  const myPlayer = useMemo(() => {
    if (!playerId) return null;
    return players.find((p) => p.id === playerId) ?? null;
  }, [players, playerId]);

  const subjectMeta = room?.subject ? getSubjectMeta(room.subject) : undefined;
  const subjectTitle = subjectMeta?.title ?? room?.subject ?? "";
  const subjectEmoji = subjectMeta?.emoji ? `${subjectMeta.emoji} ` : "";

  const submitAnswer = useCallback(async (answerIndex: number | null) => {
    if (!room?.id || !playerId || !q) return;
    const supabase = getSupabaseClient();
    const idx = answerIndex ?? -1;
    const isCorrect = answerIndex !== null && answerIndex === q.correctIndex;

    // Save to battle_answers
    const { error: ansErr } = await supabase.from("battle_answers").insert({
      room_code: room.room_code,
      user_id: playerId,
      question_index: index,
      is_correct: isCorrect,
    });
    if (ansErr) throw ansErr;

    // Also update room_players score for live updates
    if (isCorrect) {
      const { data: currentPlayer } = await supabase
        .from("room_players")
        .select("score")
        .eq("id", playerId)
        .single();
      
      if (currentPlayer) {
        await supabase
          .from("room_players")
          .update({ score: (currentPlayer.score ?? 0) + 1 })
          .eq("id", playerId);
      }
    }
  }, [room, playerId, q, index]);

  const pickOption = async (i: number) => {
    if (answered) return;
    setSelectedIndex(i);
    setAnswered(true);
    setTimedOut(false);
    try {
      await submitAnswer(i);
    } catch (e: unknown) {
      setError((e as Error)?.message ?? "Failed to submit answer.");
    }
  };

  const handleForceFinish = useCallback(async () => {
    const currentPlayers = playersRef.current;
    const myPlayerInRef = playerId ? currentPlayers.find(p => p.id === playerId) : null;
    
    if (!room?.id || !playerId || !myPlayerInRef || myPlayerInRef.finished) return;
    const supabase = getSupabaseClient();
    
    // Find player index (1, 2, 3, or 4)
    const myIdx = currentPlayers.findIndex(p => p.id === playerId) + 1;
    const playerKey = `player${myIdx}`;

    // 1. Calculate score from battle_answers for ALL questions
    const { data: answers } = await supabase
      .from("battle_answers")
      .select("is_correct, question_index")
      .eq("room_code", room.room_code)
      .eq("user_id", playerId);

    const finalScore = answers?.filter((a) => a.is_correct).length ?? 0;
    
    const finishedAt = Date.now();
    const timeTaken = playerStartedAt ? Math.round((finishedAt - playerStartedAt) / 1000) : 120;

    const updateData: Record<string, any> = {};
    updateData[`${playerKey}_finished`] = true;
    updateData[`${playerKey}_score`] = finalScore;
    updateData[`${playerKey}_time_seconds`] = timeTaken;

    try {
      await supabase
        .from("battle_rooms")
        .update(updateData)
        .eq("room_code", room.room_code);

      // Check if ALL players finished
      const { data: updatedRoom } = await supabase
        .from("battle_rooms")
        .select("*")
        .eq("room_code", room.room_code)
        .single();

      if (updatedRoom) {
        let allDone = true;
        for (let i = 1; i <= currentPlayers.length; i++) {
          if (!updatedRoom[`player${i}_finished`]) {
            allDone = false;
            break;
          }
        }

        if (allDone) {
          await supabase
            .from("battle_rooms")
            .update({ status: "finished", ends_at: new Date().toISOString() })
            .eq("room_code", room.room_code);
        }
      }
    } catch (e) {
      console.error("Error force finishing:", e);
    }
  }, [room, playerId, playerStartedAt]);

  const goNext = useCallback(async () => {
    if (!room?.id || !playerId) return;
    
    if (!answered) {
      setAnswered(true);
      setTimedOut(true);
      try {
        await submitAnswer(null);
      } catch (e: unknown) {
        setError((e as Error)?.message ?? "Failed to submit answer.");
      }
    }

    if (index >= TOTAL_QUESTIONS - 1) {
      const supabase = getSupabaseClient();
      const currentPlayers = playersRef.current;
      const myIdx = currentPlayers.findIndex(p => p.id === playerId) + 1;
      const playerKey = `player${myIdx}`;
      
      const { data: answers } = await supabase
        .from("battle_answers")
        .select("is_correct")
        .eq("room_code", room.room_code)
        .eq("user_id", playerId);
      
      const finalScore = answers?.filter(a => a.is_correct).length ?? 0;
      const finishedAt = Date.now();
      const timeTaken = playerStartedAt ? Math.round((finishedAt - playerStartedAt) / 1000) : 120;

      const updateData: Record<string, any> = {};
      updateData[`${playerKey}_finished`] = true;
      updateData[`${playerKey}_score`] = finalScore;
      updateData[`${playerKey}_time_seconds`] = timeTaken;

      try {
        const { error: finErr } = await supabase
          .from("battle_rooms")
          .update(updateData)
          .eq("room_code", room.room_code);
        if (finErr) throw finErr;

        const { data: updatedRoom } = await supabase
          .from("battle_rooms")
          .select("*")
          .eq("room_code", room.room_code)
          .single();

        if (updatedRoom) {
          let allDone = true;
          for (let i = 1; i <= currentPlayers.length; i++) {
            if (!updatedRoom[`player${i}_finished`]) {
              allDone = false;
              break;
            }
          }

          if (allDone) {
            await supabase
              .from("battle_rooms")
              .update({ status: "finished", ends_at: new Date().toISOString() })
              .eq("room_code", room.room_code);
          }
        }
      } catch (e: unknown) {
        setError((e as Error)?.message ?? "Failed to finish game.");
        return;
      }
      return;
    }

    setIndex((v) => v + 1);
    setAnswered(false);
    setSelectedIndex(null);
    setTimedOut(false);
  }, [room, playerId, answered, index, playerStartedAt, submitAnswer]);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      const supabase = getSupabaseClient();
      const { data: roomRow, error: roomErr } = await supabase
        .from("battle_rooms")
        .select("id, room_code, status, subject, current_question, player1_finished, player2_finished, player3_finished, player4_finished, player1_time_seconds, player2_time_seconds, player3_time_seconds, player4_time_seconds, player1_score, player2_score, player3_score, player4_score, started_at, ends_at")
        .eq("room_code", roomCode)
        .single();
      if (roomErr) throw roomErr;
      if (cancelled) return;

      if (roomRow.status !== "active") {
        router.replace(`/battle/${roomCode}`);
        return;
      }

      setRoom(roomRow);
      const list = getQuestionsForSubject(roomRow.subject);
      if (!list || list.length < TOTAL_QUESTIONS) {
        throw new Error("Question bank missing for this subject.");
      }
      setQuestions(list.slice(0, TOTAL_QUESTIONS));

      const { data: playerRows, error: playersErr } = await supabase
        .from("room_players")
        .select("id, room_id, player_name, score, finished, joined_at")
        .eq("room_id", roomRow.id)
        .order("joined_at", { ascending: true });
      if (playersErr) throw playersErr;
      if (cancelled) return;
      setPlayers((playerRows ?? []) as PlayerRow[]);
    };

    load().catch((e: unknown) => {
      setError((e as Error)?.message ?? "Failed to load battle.");
    });

    return () => {
      cancelled = true;
    };
  }, [roomCode, router]);

  useEffect(() => {
    if (!room?.id) return;
    const supabase = getSupabaseClient();

    const playersChannel = supabase
      .channel(`room_players_play:${room.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "room_players",
          filter: `room_id=eq.${room.id}`,
        },
        async () => {
          const { data } = await supabase
            .from("room_players")
            .select("id, room_id, player_name, score, finished, joined_at")
            .eq("room_id", room.id)
            .order("joined_at", { ascending: true });
          setPlayers((data ?? []) as PlayerRow[]);
        }
      )
      .subscribe();

    const roomChannel = supabase
      .channel(`battle_rooms_play:${room.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "battle_rooms", filter: `id=eq.${room.id}` },
        (payload) => {
          const newRoomData = payload.new as RoomRow;
          setRoom((prev) => {
            if (!prev) return newRoomData;
            return { ...prev, ...newRoomData };
          });
          if (newRoomData.status !== "active" || newRoomData.ends_at) {
            router.replace(`/battle/${roomCode}/results`);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(playersChannel);
      supabase.removeChannel(roomChannel);
    };
  }, [room?.id, roomCode, router]);

  useEffect(() => {
    let timerId: NodeJS.Timeout;

    const calculateTimeLeft = () => {
      if (!room?.started_at) {
        setGlobalTimeLeft(TIMER_SECONDS);
        return;
      }

      const now = new Date();
      const startedAt = new Date(room.started_at);
      const elapsedSeconds = (now.getTime() - startedAt.getTime()) / 1000;
      
      // If elapsedSeconds is NaN or invalid, fallback to TIMER_SECONDS
      if (isNaN(elapsedSeconds)) {
        setGlobalTimeLeft(TIMER_SECONDS);
        return;
      }

      const remaining = Math.max(0, TIMER_SECONDS - elapsedSeconds);

      if (remaining <= 0) {
        setGlobalTimeLeft(0);
        setTimedOut(true);
        if (room.status === "active" && myPlayer && !myPlayer.finished) {
          handleForceFinish();
        }
      } else {
        setGlobalTimeLeft(remaining);
      }
    };

    calculateTimeLeft();
    timerId = setInterval(calculateTimeLeft, 200);

    return () => clearInterval(timerId);
  }, [room?.started_at, room?.status, myPlayer?.finished, handleForceFinish]);

  useEffect(() => {
    if (room && index === 0 && !playerStartedAt) {
      // Record started_at when player loads the first question
      setPlayerStartedAt(Date.now());
    }
  }, [index, room, playerStartedAt]);

  const bothPlayers = players.slice(0, 2);
  const meLabel = myPlayer ? " (You)" : "";

  if (!room || questions.length === 0) {
    return (
      <div className="min-h-screen bg-[#0f0f1a] text-zinc-100 px-4 py-10">
        <div className="mx-auto max-w-lg">
          <p className="text-sm text-zinc-400">Loading battle…</p>
          {error && (
            <div className="mt-4 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
              {error}
            </div>
          )}
          <div className="mt-6">
            <Link
              href={`/battle/${roomCode}`}
              className="text-xs font-medium text-zinc-400 transition hover:text-[#7c3aed]"
            >
              ← Back to room
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (myPlayer?.finished && room.status === "active" && !room.ends_at) {
    return (
      <div className="min-h-screen bg-[#0f0f1a] text-zinc-100 px-4 py-10">
        <div className="mx-auto max-w-lg text-center">
          <p className="text-3xl">✅</p>
          <h2 className="mt-4 text-xl font-bold text-white">You finished!</h2>
          <p className="mt-2 text-zinc-400">Waiting for opponent... ⏳</p>
          <p className={`mt-4 text-6xl font-extrabold tabular-nums 
            ${globalTimeLeft <= 15 ? "text-red-500 animate-pulse" : globalTimeLeft <= 30 ? "text-orange-500" : "text-white"}`}
          >
            {Math.ceil(globalTimeLeft)}
          </p>
          <p className="text-zinc-500">seconds remaining</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0f0f1a] text-zinc-100">
      <div className="sticky top-0 z-10 border-b border-white/10 bg-[#0f0f1a]/95 backdrop-blur-md">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-3 px-4 py-3">
          <Link
            href={`/battle/${roomCode}`}
            className="text-xs font-medium text-zinc-400 transition hover:text-[#7c3aed]"
          >
            ← Room
          </Link>
          <div className="min-w-0 text-center">
            <p className="truncate text-sm font-semibold text-white">
              <span aria-hidden>{subjectEmoji}</span>
              {subjectTitle}
            </p>
            <p className="text-[11px] text-zinc-500 font-mono">
              {room.room_code}
            </p>
          </div>
          <span className="text-xs tabular-nums text-[#f59e0b]">
            {index + 1}/{TOTAL_QUESTIONS}
          </span>
        </div>
        <div className="h-1 w-full bg-white/5">
          <div
            className="h-full bg-[#7c3aed] transition-[width] duration-300 ease-out"
            style={{ width: `${headerProgress}%` }}
          />
        </div>
        <div className="px-4 pb-3 pt-2">
          <div className="mx-auto flex max-w-3xl items-center justify-between text-xs text-zinc-500">
            <span>Time left</span>
            <span className={`tabular-nums ${globalTimeLeft <= 15 ? "text-red-500 animate-pulse" : globalTimeLeft <= 30 ? "text-orange-500" : "text-white"}`}>
              {Math.ceil(globalTimeLeft)}s
            </span>
          </div>
          <div className="mx-auto mt-1.5 h-2 max-w-3xl overflow-hidden rounded-full bg-white/10">
            <div
              className="h-full rounded-full bg-gradient-to-r from-[#7c3aed] to-[#f59e0b] transition-[width] duration-75 ease-linear"
              style={{ width: `${barPct}%` }}
            />
          </div>
        </div>
      </div>

      <div className="mx-auto grid max-w-3xl grid-cols-1 gap-6 px-4 py-6 pb-28 lg:grid-cols-[1fr_280px]">
        <main>
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-[#7c3aed]">
            Battle question
          </p>
          <h2 className="mt-2 text-lg font-semibold leading-snug text-white sm:text-xl">
            {q.question}
          </h2>

          <ul className="mt-6 space-y-3">
            {q.options.map((opt, i) => {
              const isCorrect = i === q.correctIndex;
              const isSelected = selectedIndex === i;
              let ring =
                "border-white/10 bg-[#161627] hover:border-[#7c3aed]/40 hover:bg-[#1c1c30]";
              if (answered) {
                if (isCorrect) {
                  ring =
                    "border-emerald-500/60 bg-emerald-500/15 ring-1 ring-emerald-500/40";
                } else if (isSelected && !isCorrect) {
                  ring =
                    "border-red-500/60 bg-red-500/15 ring-1 ring-red-500/40";
                } else {
                  ring = "border-white/5 bg-[#12121f] opacity-60";
                }
              }
              return (
                <li key={i}>
                  <button
                    type="button"
                    disabled={answered}
                    onClick={() => pickOption(i)}
                    className={`flex w-full items-start gap-3 rounded-xl border px-4 py-3.5 text-left text-sm transition ${ring}`}
                  >
                    <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-black/30 text-xs font-bold text-[#f59e0b]">
                      {String.fromCharCode(65 + i)}
                    </span>
                    <span className="text-zinc-200">{opt}</span>
                  </button>
                </li>
              );
            })}
          </ul>

          {answered && (
            <div className="mt-6 rounded-xl border border-[#7c3aed]/25 bg-[#7c3aed]/10 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-[#f59e0b]">
                Explanation
              </p>
              <p className="mt-2 text-sm leading-relaxed text-zinc-300">
                {q.explanation}
              </p>
              {timedOut && (
                <p className="mt-2 text-xs text-amber-200/80">
                  Time ran out — the correct answer is highlighted above.
                </p>
              )}
              {error && (
                <p className="mt-2 text-xs text-red-200/90">{error}</p>
              )}
            </div>
          )}
        </main>

        <aside className="rounded-2xl border border-white/10 bg-[#161627]/70 p-5">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-[#f59e0b]/90">
            Live scores
          </h3>
          <p className="mt-2 text-xs text-zinc-500">
            {playerName ? (
              <>
                Playing as{" "}
                <span className="font-semibold text-white">{playerName}</span>
              </>
            ) : (
              "Playing…"
            )}
          </p>
          <ul className="mt-4 space-y-2">
            {bothPlayers.map((p) => (
              <li
                key={p.id}
                className="flex items-center justify-between rounded-xl border border-white/10 bg-[#0f0f1a]/60 px-4 py-3"
              >
                <span className="text-sm font-semibold text-white">
                  {p.player_name}
                  {p.id === playerId ? meLabel : ""}
                </span>
                <span className="font-mono text-sm font-bold text-[#f59e0b] tabular-nums">
                  {p.score}
                </span>
              </li>
            ))}
            {players.length < 2 && (
              <li className="rounded-xl border border-white/10 bg-[#0f0f1a]/60 px-4 py-3 text-sm text-zinc-400">
                Waiting for opponent…
              </li>
            )}
          </ul>
        </aside>
      </div>

      {answered && (
        <div className="fixed bottom-0 left-0 right-0 border-t border-white/10 bg-[#0f0f1a]/98 p-4 pb-[max(1rem,env(safe-area-inset-bottom))] backdrop-blur-md">
          <div className="mx-auto max-w-3xl">
            <button
              type="button"
              onClick={goNext}
              className="w-full rounded-xl bg-[#7c3aed] py-3.5 text-center text-sm font-semibold text-white shadow-lg shadow-[#7c3aed]/25 transition hover:bg-[#6d28d9] active:scale-[0.99]"
            >
              {index >= TOTAL_QUESTIONS - 1 ? "See results" : "Next question"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
