"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { getSupabaseClient } from "@/lib/supabase";
import { getSubjectMeta } from "@/app/data/practiceQuestions";

type PlayerRow = {
  id: string;
  room_id: string;
  player_name: string;
  score: number;
  finished: boolean;
  joined_at: string;
};

type RoomRow = {
  id: string;
  room_code: string;
  status: string;
  subject: string;
  current_question: number;
};

export function WaitingRoomClient({ roomCode }: { roomCode: string }) {
  const router = useRouter();
  const [room, setRoom] = useState<RoomRow | null>(null);
  const [players, setPlayers] = useState<PlayerRow[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isCreator = useMemo(() => {
    return localStorage.getItem("createdRoomCode") === roomCode;
  }, [roomCode]);

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
      setRoom(roomRow);

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
      setError(e?.message ?? "Failed to load room.");
    });

    return () => {
      cancelled = true;
    };
  }, [roomCode]);

  useEffect(() => {
    if (!room?.id) return;
    const supabase = getSupabaseClient();

    const playersChannel = supabase
      .channel(`room_players:${room.id}`)
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
      .channel(`game_rooms:${room.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "game_rooms",
          filter: `id=eq.${room.id}`,
        },
        (payload) => {
          const next = payload.new as RoomRow;
          setRoom(next);
          if (next.status === "active") {
            router.replace(`/battle/${next.room_code}/play`);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(playersChannel);
      supabase.removeChannel(roomChannel);
    };
  }, [room?.id, room?.room_code, router]);

  const startGame = async () => {
    if (!room || busy) return;
    setBusy(true);
    setError(null);
    try {
      const supabase = getSupabaseClient();
      const { error: updateErr } = await supabase
        .from("game_rooms")
        .update({ status: "active", current_question: 0 })
        .eq("id", room.id);
      if (updateErr) throw updateErr;
      router.replace(`/battle/${room.room_code}/play`);
    } catch (e: any) {
      setError(e?.message ?? "Failed to start game.");
    } finally {
      setBusy(false);
    }
  };

  const subjectTitle =
    room?.subject ? getSubjectMeta(room.subject)?.title ?? room.subject : "";

  const readyToStart = players.length >= 2 && room?.status === "waiting";

  return (
    <div className="min-h-screen bg-[#0f0f1a] text-zinc-100 px-4 py-10">
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -left-36 top-16 h-80 w-80 rounded-full bg-[#7c3aed]/20 blur-3xl" />
        <div className="absolute -right-24 bottom-24 h-80 w-80 rounded-full bg-[#f59e0b]/10 blur-3xl" />
      </div>

      <div className="relative mx-auto max-w-lg">
        <header className="text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-[#7c3aed]">
            Waiting Room
          </p>
          <h1 className="mt-3 text-2xl font-bold tracking-tight text-white">
            Room Code
          </h1>
          <div className="mt-4 rounded-2xl border border-white/10 bg-[#161627]/90 px-5 py-5 shadow-xl shadow-black/40">
            <p className="text-xs text-zinc-500">Share this code</p>
            <p className="mt-1 font-mono text-4xl font-extrabold tracking-[0.25em] text-[#f59e0b]">
              {roomCode}
            </p>
            <p className="mt-3 text-xs text-zinc-400">
              Subject:{" "}
              <span className="font-semibold text-white">
                {subjectTitle || "Loading…"}
              </span>
            </p>
          </div>
        </header>

        <section className="mt-8 rounded-2xl border border-white/10 bg-[#161627]/70 p-5">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-[#f59e0b]/90">
            Players
          </h2>
          <ul className="mt-4 space-y-2">
            {players.length === 0 ? (
              <li className="text-sm text-zinc-400">Waiting for players…</li>
            ) : (
              players.map((p, idx) => (
                <li
                  key={p.id}
                  className="flex items-center justify-between rounded-xl border border-white/10 bg-[#0f0f1a]/60 px-4 py-3"
                >
                  <div className="flex items-center gap-3">
                    <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-black/30 text-xs font-bold text-[#7c3aed]">
                      {idx + 1}
                    </span>
                    <span className="text-sm font-semibold text-white">
                      {p.player_name}
                    </span>
                  </div>
                  <span className="text-xs text-zinc-500">
                    {p.finished ? "Finished" : "Ready"}
                  </span>
                </li>
              ))
            )}
          </ul>

          {error && (
            <div className="mt-4 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
              {error}
            </div>
          )}

          <div className="mt-5">
            {readyToStart ? (
              isCreator ? (
                <button
                  type="button"
                  onClick={startGame}
                  disabled={busy}
                  className="w-full rounded-xl bg-[#7c3aed] py-3.5 text-center text-sm font-semibold text-white shadow-lg shadow-[#7c3aed]/25 transition hover:bg-[#6d28d9] disabled:opacity-50"
                >
                  {busy ? "Starting…" : "Start Game"}
                </button>
              ) : (
                <div className="rounded-xl border border-white/10 bg-[#0f0f1a]/60 px-4 py-3 text-center text-sm text-zinc-300">
                  Waiting for the creator to start the game…
                </div>
              )
            ) : (
              <div className="rounded-xl border border-white/10 bg-[#0f0f1a]/60 px-4 py-3 text-center text-sm text-zinc-300">
                Need 2 players to start.
              </div>
            )}
          </div>
        </section>

        <div className="mt-6 text-center">
          <Link
            href="/battle"
            className="text-xs font-medium text-zinc-400 transition hover:text-[#7c3aed]"
          >
            ← Back to lobby
          </Link>
        </div>
      </div>
    </div>
  );
}

