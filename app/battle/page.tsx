"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { getSupabaseClient } from "@/lib/supabase";
import { SUBJECTS } from "@/app/data/practiceQuestions";
import { generateRoomCode, normalizeRoomCode } from "@/app/battle/battleUtils";

type Mode = "create" | "join";

export default function BattleLobbyPage() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("create");
  const [playerName, setPlayerName] = useState<string>("");
  const [subject, setSubject] = useState<string>(SUBJECTS[0]?.slug ?? "maths");
  const [joinCode, setJoinCode] = useState<string>("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSubmit = useMemo(() => {
    if (!playerName.trim()) return false;
    if (mode === "create") return Boolean(subject);
    return normalizeRoomCode(joinCode).length === 6;
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
      const roomCode = generateRoomCode(6);
      const { data: room, error: roomErr } = await supabase
        .from("game_rooms")
        .insert({
          room_code: roomCode,
          status: "waiting",
          subject,
          current_question: 0,
        })
        .select("id, room_code")
        .single();
      if (roomErr) throw roomErr;

      const { data: player, error: playerErr } = await supabase
        .from("room_players")
        .insert({
          room_id: room.id,
          player_name: playerName.trim(),
          score: 0,
          finished: false,
        })
        .select("id")
        .single();
      if (playerErr) throw playerErr;

      persistIdentity(player.id);
      localStorage.setItem("createdRoomCode", room.room_code);
      router.push(`/battle/${room.room_code}`);
    } catch (e: any) {
      setError(e?.message ?? "Failed to create room.");
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
        .from("game_rooms")
        .select("id, room_code, status")
        .eq("room_code", code)
        .single();
      if (roomErr) throw roomErr;
      if (room.status !== "waiting") {
        throw new Error("That room is not accepting new players.");
      }

      const { data: player, error: playerErr } = await supabase
        .from("room_players")
        .insert({
          room_id: room.id,
          player_name: playerName.trim(),
          score: 0,
          finished: false,
        })
        .select("id")
        .single();
      if (playerErr) throw playerErr;

      persistIdentity(player.id);
      router.push(`/battle/${room.room_code}`);
    } catch (e: any) {
      setError(e?.message ?? "Failed to join room.");
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

  return (
    <div className="min-h-screen bg-[#0f0f1a] text-zinc-100 px-4 py-10">
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -left-36 top-16 h-80 w-80 rounded-full bg-[#7c3aed]/20 blur-3xl" />
        <div className="absolute -right-24 bottom-24 h-80 w-80 rounded-full bg-[#f59e0b]/10 blur-3xl" />
      </div>

      <div className="relative mx-auto max-w-lg">
        <header className="text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-[#7c3aed]">
            Quiz Arena
          </p>
          <h1 className="mt-3 bg-gradient-to-r from-white via-zinc-100 to-zinc-400 bg-clip-text text-3xl font-bold tracking-tight text-transparent">
            Battle Lobby
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-zinc-400">
            Create a room or join with a code. First to the highest score wins.
          </p>
        </header>

        <div className="mt-8 rounded-2xl border border-white/10 bg-[#161627]/90 p-5 shadow-xl shadow-black/40">
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setMode("create")}
              className={`flex-1 rounded-xl px-4 py-2.5 text-sm font-semibold transition ${
                mode === "create"
                  ? "bg-[#7c3aed] text-white"
                  : "border border-white/10 bg-[#0f0f1a]/60 text-zinc-300 hover:border-[#7c3aed]/40"
              }`}
            >
              Create room
            </button>
            <button
              type="button"
              onClick={() => setMode("join")}
              className={`flex-1 rounded-xl px-4 py-2.5 text-sm font-semibold transition ${
                mode === "join"
                  ? "bg-[#7c3aed] text-white"
                  : "border border-white/10 bg-[#0f0f1a]/60 text-zinc-300 hover:border-[#7c3aed]/40"
              }`}
            >
              Join room
            </button>
          </div>

          <form onSubmit={onSubmit} className="mt-5 space-y-4">
            <div>
              <label className="text-xs font-semibold uppercase tracking-wide text-[#f59e0b]/90">
                Your name
              </label>
              <input
                value={playerName}
                onChange={(e) => setPlayerName(e.target.value)}
                placeholder="e.g. Ada"
                className="mt-2 w-full rounded-xl border border-white/10 bg-[#0f0f1a]/70 px-4 py-3 text-sm text-white outline-none transition focus:border-[#7c3aed]/60"
              />
            </div>

            {mode === "create" ? (
              <div>
                <label className="text-xs font-semibold uppercase tracking-wide text-[#f59e0b]/90">
                  Subject
                </label>
                <select
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="mt-2 w-full rounded-xl border border-white/10 bg-[#0f0f1a]/70 px-4 py-3 text-sm text-white outline-none transition focus:border-[#7c3aed]/60"
                >
                  {SUBJECTS.map((s) => (
                    <option key={s.slug} value={s.slug}>
                      {s.title}
                    </option>
                  ))}
                </select>
                <p className="mt-2 text-xs text-zinc-500">
                  You’ll get 10 questions with a 20s timer each.
                </p>
              </div>
            ) : (
              <div>
                <label className="text-xs font-semibold uppercase tracking-wide text-[#f59e0b]/90">
                  Room code
                </label>
                <input
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value)}
                  placeholder="6 characters"
                  className="mt-2 w-full rounded-xl border border-white/10 bg-[#0f0f1a]/70 px-4 py-3 text-sm text-white outline-none transition focus:border-[#7c3aed]/60"
                />
                <p className="mt-2 text-xs text-zinc-500">
                  Ask the room creator for the code.
                </p>
              </div>
            )}

            {error && (
              <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={!canSubmit || busy}
              className="w-full rounded-xl bg-[#7c3aed] py-3.5 text-center text-sm font-semibold text-white shadow-lg shadow-[#7c3aed]/25 transition hover:bg-[#6d28d9] disabled:opacity-50 disabled:hover:bg-[#7c3aed]"
            >
              {busy
                ? "Please wait…"
                : mode === "create"
                  ? "Create room"
                  : "Join room"}
            </button>
          </form>
        </div>

        <div className="mt-6 text-center">
          <Link
            href="/"
            className="text-xs font-medium text-zinc-400 transition hover:text-[#7c3aed]"
          >
            ← Back to Practice Zone
          </Link>
        </div>
      </div>
    </div>
  );
}

