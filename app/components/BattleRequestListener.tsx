"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { getSupabaseClient } from "@/lib/supabase";
import { getWalletBalance, processTransaction } from "@/lib/wallet";
import { createBattleRoom } from "@/lib/battleRoom";
import { insertRoomPlayer } from "@/lib/battleRoomPlayer";

type BattleRequest = {
  id: string;
  challenger_id: string;
  challenger_name: string;
  subject: string;
  stake_amount: number;
};

export default function BattleRequestListener() {
  const router = useRouter();
  const supabase = getSupabaseClient();

  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [currentUserName, setCurrentUserName] = useState<string>("");
  const [incomingRequest, setIncomingRequest] = useState<BattleRequest | null>(null);
  const [busy, setBusy] = useState(false);
  const [responseMsg, setResponseMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // ── Get current user on mount ────────────────────────────────────────────────
  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      setCurrentUserId(user.id);

      const { data: profile } = await supabase
        .from("profiles")
        .select("display_name")
        .eq("id", user.id)
        .single();

      setCurrentUserName(
        profile?.display_name || user.email?.split("@")[0] || "Player"
      );
    };
    getUser();
  }, []);

  // ── Poll for pending challenge requests every 5 seconds ─────────────────────
  const checkPendingRequests = useCallback(async () => {
    if (!currentUserId) return;

    const { data } = await supabase
      .from("battle_requests")
      .select("id, challenger_id, challenger_name, subject, stake_amount")
      .eq("opponent_id", currentUserId)
      .eq("status", "pending")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (data) setIncomingRequest(data);
  }, [currentUserId]);

  // ── Realtime listener + polling ──────────────────────────────────────────────
  useEffect(() => {
    if (!currentUserId) return;

    checkPendingRequests();
    const interval = setInterval(checkPendingRequests, 5000);

    const channel = supabase
      .channel(`battle-requests-${currentUserId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "battle_requests",
          filter: `opponent_id=eq.${currentUserId}`,
        },
        (payload) => {
          setIncomingRequest(payload.new as BattleRequest);
        }
      )
      .subscribe();

    return () => {
      clearInterval(interval);
      supabase.removeChannel(channel);
    };
  }, [currentUserId, checkPendingRequests]);

  // ── Helper: get room ID from room code ───────────────────────────────────────
  const getRoomIdFromCode = async (roomCode: string): Promise<string> => {
    const { data } = await supabase
      .from("battle_rooms")
      .select("id")
      .eq("room_code", roomCode)
      .single();
    if (!data) throw new Error("Room not found after creation.");
    return data.id;
  };

  // ── Accept challenge ─────────────────────────────────────────────────────────
  const handleAccept = async () => {
    if (!incomingRequest || !currentUserId) return;
    setBusy(true);
    setError(null);

    try {
      const { stake_amount, challenger_id, challenger_name, subject, id } = incomingRequest;

      // Check both wallets have enough
      const [challengerBalance, myBalance] = await Promise.all([
        getWalletBalance(challenger_id),
        getWalletBalance(currentUserId),
      ]);

      if (challengerBalance < stake_amount) {
        await supabase
          .from("battle_requests")
          .update({ status: "cancelled" })
          .eq("id", id);
        setIncomingRequest(null);
        setResponseMsg("Challenge cancelled — challenger no longer has enough balance.");
        setTimeout(() => setResponseMsg(null), 5000);
        return;
      }

      if (myBalance < stake_amount) {
        setError(
          `You need ₦${stake_amount} to accept this challenge. Your balance: ₦${myBalance}.`
        );
        setBusy(false);
        return;
      }

      // Create the battle room (challenger is player 1)
      const { data: sessionData } = await supabase.auth.getSession(); 
      const userId = sessionData?.session?.user?.id; 
      if (!userId) throw new Error("Not logged in"); 

      const { generateRoomCode } = await import("@/app/battle/battleUtils"); 
      const roomCode = generateRoomCode(6); 

      const room = await createBattleRoom(
        roomCode, 
        subject,
        userId,
        stake_amount
      );

      // Add myself (opponent) as player 2
      const roomId = await getRoomIdFromCode(roomCode);
      await insertRoomPlayer(roomId, currentUserName);

      // Deduct stakes from both wallets simultaneously
      await Promise.all([
        processTransaction(
          challenger_id,
          "stake",
          stake_amount,
          `challenge-${id}`,
          `Staked ₦${stake_amount} for challenge vs ${currentUserName}`
        ),
        processTransaction(
          currentUserId,
          "stake",
          stake_amount,
          `challenge-accept-${id}`,
          `Staked ₦${stake_amount} for challenge vs ${challenger_name}`
        ),
      ]);

      // Mark request as accepted and save room code
      await supabase
        .from("battle_requests")
        .update({ status: "accepted", room_code: roomCode })
        .eq("id", id);

      // Link guest_id and activate room
      const { data: guestSession } = await supabase.auth.getSession(); 
      const guestId = guestSession?.session?.user?.id; 

      await supabase
        .from("battle_rooms")
        .update({ guest_id: guestId, status: "active" })
        .eq("id", roomId);

      // Save player identity and redirect to battle room
      localStorage.setItem("playerName", currentUserName);

      setIncomingRequest(null);
      router.push(`/battle/${roomCode}`);
    } catch (e: unknown) {
      setError((e as Error)?.message ?? "Something went wrong. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  // ── Decline challenge ────────────────────────────────────────────────────────
  const handleDecline = async () => {
    if (!incomingRequest) return;
    await supabase
      .from("battle_requests")
      .update({ status: "declined" })
      .eq("id", incomingRequest.id);

    setIncomingRequest(null);
    setResponseMsg("Challenge declined.");
    setTimeout(() => setResponseMsg(null), 3000);
  };

  // ── Format subject label ─────────────────────────────────────────────────────
  const subjectLabel = incomingRequest?.subject
    ? incomingRequest.subject.charAt(0).toUpperCase() + incomingRequest.subject.slice(1)
    : "";

  // ── Don't render anything if nothing to show ─────────────────────────────────
  if (!incomingRequest && !responseMsg) return null;

  return (
    <div className="fixed bottom-6 right-4 z-[100] w-full max-w-sm px-2">

      {/* Simple toast for decline / cancel messages */}
      {responseMsg && !incomingRequest && (
        <div className="mb-3 rounded-2xl border border-white/10 bg-[#1a1a2e] px-4 py-3 text-sm text-zinc-300 shadow-2xl">
          {responseMsg}
        </div>
      )}

      {/* Incoming challenge popup card */}
      {incomingRequest && (
        <div className="rounded-3xl border border-[#7c3aed]/40 bg-[#1a1a2e] p-5 shadow-2xl shadow-black/60">

          {/* Challenger info */}
          <div className="flex items-center gap-3 mb-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#7c3aed]/30 ring-1 ring-[#7c3aed]/50">
              <span className="text-xl font-extrabold text-white">
                {incomingRequest.challenger_name[0]?.toUpperCase() ?? "?"}
              </span>
            </div>
            <div>
              <p className="font-extrabold text-white text-sm leading-tight">
                ⚔️ Challenge Incoming!
              </p>
              <p className="text-xs text-zinc-400 mt-0.5">
                <span className="text-[#f59e0b] font-bold">
                  {incomingRequest.challenger_name}
                </span>{" "}
                wants to battle you
              </p>
            </div>
          </div>

          {/* Battle details */}
          <div className="rounded-xl bg-black/30 px-3 py-2.5 mb-4 space-y-1.5">
            <div className="flex justify-between text-xs">
              <span className="text-zinc-400">Subject:</span>
              <span className="text-white font-bold">{subjectLabel}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-zinc-400">Stake:</span>
              <span className="text-[#f59e0b] font-bold">
                ₦{incomingRequest.stake_amount}
              </span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-zinc-400">Prize Pool:</span>
              <span className="text-green-400 font-bold">
                ₦{Math.floor(incomingRequest.stake_amount * 2 * 0.8)}
              </span>
            </div>
          </div>

          {/* Error message */}
          {error && (
            <div className="mb-3 rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-300">
              {error}
            </div>
          )}

          {/* request fields: {JSON.stringify(Object.keys(incomingRequest))} */}
          {/* Accept / Decline buttons */}
          <div className="flex gap-2">
            <button
              onClick={handleDecline}
              disabled={busy}
              className="flex-1 rounded-xl border border-white/10 py-2.5 text-xs font-bold text-zinc-400 hover:text-white hover:border-white/30 transition disabled:opacity-50"
            >
              ✕ Decline
            </button>
            <button
              onClick={async () => { 
                try { 
                  const supabase = (await import("@/lib/supabase")).getSupabaseClient(); 
                  const { data: sessionData } = await supabase.auth.getSession(); 
                  const userId = sessionData?.session?.user?.id; 
                  if (!userId) { alert("Not logged in"); return; } 
                  
                  const roomCode = incomingRequest.room_code || (incomingRequest as any).roomCode; 
                  
                  // Step 1: update battle_rooms with guest_id 
                  const { error: updateError } = await supabase 
                    .from("battle_rooms") 
                    .update({ guest_id: userId, status: "active" }) 
                    .eq("room_code", roomCode); 
                  if (updateError) { alert("Room update error: " + updateError.message); return; } 
                  
                  // Step 2: get the room id 
                  const { data: room, error: roomError } = await supabase 
                    .from("battle_rooms") 
                    .select("id") 
                    .eq("room_code", roomCode) 
                    .single(); 
                  if (roomError || !room) { alert("Could not find room"); return; } 
                  
                  // Step 3: insert guest into room_players 
                  const { error: playerError } = await supabase 
                    .from("room_players") 
                    .insert({ 
                      room_id: room.id, 
                      player_name: sessionData.session?.user?.email?.split("@")[0] || "Player", 
                      score: 0, 
                      finished: false, 
                      user_id: userId, 
                    }); 
                  if (playerError) console.error("room_players error:", playerError.message); 
                  
                  // Step 4: mark request as accepted 
                  await supabase 
                    .from("battle_requests") 
                    .update({ status: "accepted" }) 
                    .eq("id", incomingRequest.id); 
                  
                  // Step 5: redirect to battle 
                  window.location.href = "/battle?room=" + roomCode; 
                } catch (err) { 
                  alert("Failed: " + String(err)); 
                } 
              }} 
              disabled={busy}
              className="flex-1 rounded-xl bg-[#7c3aed] py-2.5 text-xs font-extrabold text-white hover:bg-[#6d28d9] disabled:opacity-50 transition"
            >
              {busy ? "Setting up…" : "✓ Accept ⚔️"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}