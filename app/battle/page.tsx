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

type Mode = "create" | "join";

export default function BattleLobbyPage() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("create");
  const [playerName, setPlayerName] = useState<string>("");
  const [subject, setSubject] = useState<string>(SUBJECTS[0]?.slug ?? "maths");
  const [joinCode, setJoinCode] = useState<string>("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [joinPreview, setJoinPreview] = useState<{
    subject: string;
    status: string;
  } | null>(null);
  const [joinPreviewLoading, setJoinPreviewLoading] = useState(false);

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
      const { roomCode, playerId } = await createBattleRoom(
        subject,
        playerName,
      );

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
        .select("id, room_code, status")
        .eq("room_code", code)
        .single();
      if (roomErr) throw roomErr;
      if (room.status !== "waiting") {
        throw new Error("That room is not accepting new players.");
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
          .select("subject, status")
          .eq("room_code", joinNormalized)
          .maybeSingle();
        if (cancelled) return;
        if (data?.subject != null && data.status) {
          setJoinPreview({
            subject: data.subject as string,
            status: data.status as string,
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

        <header className="mt-10 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-white/10 bg-[#1a1a2e] shadow-[0_25px_80px_-45px_rgba(124,58,237,0.8)]">
            <span className="text-2xl" aria-hidden>
              ⚔️
            </span>
          </div>
          <h1 className="mt-4 text-4xl font-extrabold tracking-tight sm:text-5xl">
            <span className="bg-gradient-to-r from-white via-white to-[#888888] bg-clip-text text-transparent">
              Battle Arena
            </span>
          </h1>
          <p className="mx-auto mt-3 max-w-xl text-sm leading-relaxed text-[#888888] sm:text-base">
            Challenge anyone. Prove your knowledge.
          </p>
        </header>

        <div className="mt-10 rounded-3xl border border-white/10 bg-[#1a1a2e]/85 p-5 shadow-[0_30px_110px_-70px_rgba(0,0,0,0.95)] backdrop-blur sm:p-7">
          <form onSubmit={onSubmit} className="space-y-5">
            <div className="grid gap-4 sm:grid-cols-[1fr_140px] sm:items-end">
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

              <div className="rounded-2xl border border-white/10 bg-[#0f0f1a]/55 px-4 py-3">
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#888888]">
                  Preview
                </p>
                <p className="mt-1 truncate text-sm font-semibold text-white">
                  {playerName.trim() || "Player"}
                </p>
              </div>
            </div>

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
                <p className="mt-2 text-xs text-[#888888]">
                  Selected:{" "}
                  <span className="font-semibold text-white">
                    {selectedSubject?.title ?? "—"}
                  </span>
                </p>
                <p className="mt-2 text-[11px] leading-relaxed text-[#888888]/90">
                  Everyone who joins this room plays this topic.
                </p>
              </div>

              <div>
                <label className="text-xs font-semibold uppercase tracking-[0.22em] text-[#f59e0b]">
                  Room code
                </label>
                <input
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value)}
                  placeholder="XXXXXX"
                  inputMode="text"
                  className={`mt-2 w-full rounded-2xl border px-4 py-3.5 text-center font-mono text-lg tracking-[0.35em] outline-none transition ${
                    mode === "join"
                      ? "border-[#7c3aed]/50 bg-[#0f0f1a]/70 text-white focus:border-[#7c3aed]"
                      : "border-white/10 bg-[#0f0f1a]/35 text-white/50"
                  }`}
                />
                <p className="mt-2 text-xs text-[#888888]">
                  {mode === "join"
                    ? `Enter 6 characters (${joinNormalized.length}/6).`
                    : "Only required when joining a room."}
                </p>
                {mode === "join" && joinNormalized.length === 6 && (
                  <div className="mt-3 rounded-2xl border border-white/10 bg-[#0f0f1a]/55 px-3 py-3">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#888888]">
                      Room preview
                    </p>
                    {joinPreviewLoading ? (
                      <p className="mt-1 text-xs text-[#888888]">
                        Looking up room…
                      </p>
                    ) : joinPreview ? (
                      <>
                        <p className="mt-2 text-sm text-white">
                          Subject:{" "}
                          <span className="font-semibold">
                            {getSubjectMeta(joinPreview.subject)?.emoji}{" "}
                            {getSubjectMeta(joinPreview.subject)?.title ??
                              joinPreview.subject}
                          </span>
                        </p>
                        <p className="mt-1 text-xs text-[#888888]">
                          Status:{" "}
                          <span className="font-medium text-[#f59e0b]">
                            {joinPreview.status === "waiting"
                              ? "Waiting for players"
                              : joinPreview.status}
                          </span>
                        </p>
                      </>
                    ) : (
                      <p className="mt-1 text-xs text-amber-200/85">
                        No waiting room matches this code.
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>

            {error && (
              <div className="rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                {error}
              </div>
            )}

            <div className="grid gap-3 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => handleModeAction("create")}
                disabled={busy}
                className="w-full rounded-2xl bg-[#7c3aed] px-5 py-4 text-center text-sm font-extrabold tracking-wide text-white shadow-[0_25px_90px_-45px_rgba(124,58,237,0.85)] transition hover:bg-[#6d28d9] disabled:opacity-60"
              >
                {busy && mode === "create" ? "Creating…" : "Create Room"}
              </button>
              <button
                type="button"
                onClick={() => handleModeAction("join")}
                disabled={busy}
                className="w-full rounded-2xl border border-white/15 bg-[#0f0f1a]/55 px-5 py-4 text-center text-sm font-extrabold tracking-wide text-white transition hover:border-[#7c3aed]/45 disabled:opacity-60"
              >
                {busy && mode === "join" ? "Joining…" : "Join Room"}
              </button>
            </div>

            <p className="text-center text-xs text-[#888888]">
              Tip: Create a room to get a shareable code. Join to enter instantly.
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

