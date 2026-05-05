"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { getSupabaseClient } from "@/lib/supabase";
import {
  getQuestionsForSubject,
  getSubjectMeta,
  type Question,
} from "@/app/data/practiceQuestions";

const TIMER_SECONDS = 20;
const TOTAL_QUESTIONS = 10;

type RoomRow = {
  id: string;
  room_code: string;
  status: string;
  subject: string;
  current_question: number;
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
  const [timeLeft, setTimeLeft] = useState(TIMER_SECONDS);

  const playerId = useMemo(() => {
    return typeof window === "undefined" ? null : localStorage.getItem("playerId");
  }, []);
  const playerName = useMemo(() => {
    return typeof window === "undefined"
      ? null
      : localStorage.getItem("playerName");
  }, []);

  const q = questions[index];
  const barPct = Math.min(100, (timeLeft / TIMER_SECONDS) * 100);
  const headerProgress = ((index + 1) / TOTAL_QUESTIONS) * 100;

  useEffect(() => {
    let cancelled = false;
    setError(null);

    const load = async () => {
      const supabase = getSupabaseClient();
      const { data: roomRow, error: roomErr } = await supabase
        .from("game_rooms")
        .select("id, room_code, status, subject, current_question")
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

    load().catch((e: any) => {
      setError(e?.message ?? "Failed to load battle.");
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
      .channel(`game_rooms_play:${room.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "game_rooms", filter: `id=eq.${room.id}` },
        (payload) => setRoom(payload.new as RoomRow)
      )
      .subscribe();

    return () => {
      supabase.removeChannel(playersChannel);
      supabase.removeChannel(roomChannel);
    };
  }, [room?.id]);

  useEffect(() => {
    if (!q) return;
    if (answered) return;
    const start = Date.now();
    const id = window.setInterval(() => {
      const elapsed = (Date.now() - start) / 1000;
      const left = Math.max(0, TIMER_SECONDS - elapsed);
      setTimeLeft(left);
      if (left <= 0) {
        window.clearInterval(id);
        setAnswered(true);
        setTimedOut(true);
        setSelectedIndex(null);
      }
    }, 32);
    return () => window.clearInterval(id);
  }, [answered, index, q?.id]);

  const myPlayer = useMemo(() => {
    if (!playerId) return null;
    return players.find((p) => p.id === playerId) ?? null;
  }, [players, playerId]);

  const subjectTitle = room?.subject
    ? getSubjectMeta(room.subject)?.title ?? room.subject
    : "";

  const submitAnswer = async (answerIndex: number | null) => {
    if (!room?.id || !playerId || !q) return;
    const supabase = getSupabaseClient();
    const idx = answerIndex ?? -1;
    const isCorrect = answerIndex !== null && answerIndex === q.correctIndex;

    const { error: ansErr } = await supabase.from("player_answers").insert({
      room_id: room.id,
      player_id: playerId,
      question_index: index,
      answer_index: idx,
      is_correct: isCorrect,
    });
    if (ansErr) throw ansErr;

    if (isCorrect) {
      const current = myPlayer?.score ?? 0;
      const { error: scoreErr } = await supabase
        .from("room_players")
        .update({ score: current + 1 })
        .eq("id", playerId);
      if (scoreErr) throw scoreErr;
    }
  };

  const pickOption = async (i: number) => {
    if (answered) return;
    setSelectedIndex(i);
    setAnswered(true);
    setTimedOut(false);
    try {
      await submitAnswer(i);
    } catch (e: any) {
      setError(e?.message ?? "Failed to submit answer.");
    }
  };

  const goNext = async () => {
    if (!room?.id || !playerId) return;
    if (!answered) return;
    const supabase = getSupabaseClient();

    if (timedOut) {
      try {
        await submitAnswer(null);
      } catch (e: any) {
        setError(e?.message ?? "Failed to submit answer.");
      }
    }

    if (index >= TOTAL_QUESTIONS - 1) {
      try {
        const { error: finErr } = await supabase
          .from("room_players")
          .update({ finished: true })
          .eq("id", playerId);
        if (finErr) throw finErr;
      } catch (e: any) {
        setError(e?.message ?? "Failed to finish game.");
        return;
      }
      router.replace(`/battle/${roomCode}/results`);
      return;
    }

    setIndex((v) => v + 1);
    setAnswered(false);
    setSelectedIndex(null);
    setTimedOut(false);
    setTimeLeft(TIMER_SECONDS);
  };

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
            <span className="tabular-nums text-[#f59e0b]">
              {answered ? "—" : `${Math.ceil(timeLeft)}s`}
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

