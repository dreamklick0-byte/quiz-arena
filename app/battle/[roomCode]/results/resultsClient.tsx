"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";

type RoomPlayer = {
  id: string;
  player_name: string | null;
  score: number | null;
};

export function ResultsClient({ roomCode }: { roomCode: string }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [players, setPlayers] = useState<RoomPlayer[]>([]);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const { data: room, error: roomErr } = await supabase
          .from("game_rooms")
          .select("id")
          .eq("room_code", roomCode)
          .single();

        if (roomErr) throw roomErr;

        const { data: roomPlayers, error: playersErr } = await supabase
          .from("room_players")
          .select("id, player_name, score")
          .eq("room_id", room.id);

        if (playersErr) throw playersErr;

        if (!cancelled) {
          setPlayers((roomPlayers ?? []) as RoomPlayer[]);
        }
      } catch (e: any) {
        if (!cancelled) setError(e?.message ?? "Failed to load results.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [roomCode]);

  const normalizedPlayers = useMemo(() => {
    const mapped = players.map((p) => ({
      ...p,
      player_name: p.player_name?.trim() || "Player",
      score: typeof p.score === "number" ? p.score : 0,
    }));

    mapped.sort((a, b) => b.score - a.score);
    return mapped.slice(0, 2);
  }, [players]);

  const winner = useMemo(() => {
    if (normalizedPlayers.length < 2) return null;
    const [a, b] = normalizedPlayers;
    if (a.score === b.score) return { type: "draw" as const };
    return { type: "winner" as const, id: a.score > b.score ? a.id : b.id };
  }, [normalizedPlayers]);

  return (
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
                    <p className="text-base font-semibold text-[#f59e0b]">
                      It&apos;s a Draw!
                    </p>
                  ) : (
                    <p className="text-base font-semibold text-[#f59e0b]">
                      Winner:{" "}
                      {
                        normalizedPlayers.find((p) => p.id === winner?.id)
                          ?.player_name
                      }{" "}
                      🏆
                    </p>
                  )}
                  <p className="mt-2 text-xs text-zinc-400">
                    Scores are shown out of 10
                  </p>
                </div>

                <div className="mt-6 grid gap-3">
                  {normalizedPlayers.map((p) => {
                    const isWinner = winner?.type === "winner" && winner.id === p.id;
                    return (
                      <div
                        key={p.id}
                        className={`rounded-2xl border bg-[#0f0f1a]/50 p-4 ${
                          isWinner
                            ? "border-[#f59e0b]/50 shadow-[0_0_0_1px_rgba(245,158,11,0.15)]"
                            : "border-white/10"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <p className="text-sm font-semibold text-white">
                              {p.player_name} {isWinner ? "🏆" : ""}
                            </p>
                            <p className="mt-1 text-xs text-zinc-500">
                              Final score
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-2xl font-bold text-white">
                              {p.score}
                              <span className="text-sm font-semibold text-zinc-400">
                                /10
                              </span>
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
  );
}

