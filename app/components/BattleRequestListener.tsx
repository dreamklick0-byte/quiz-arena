"use client"; 
 
 import { useEffect, useState } from "react"; 
 import { useRouter } from "next/navigation"; 
 import { getSupabaseClient } from "@/lib/supabase"; 
 import { getWalletBalance, processTransaction } from "@/lib/wallet"; 
 
 type BattleRequest = { 
   id: string; 
   challenger_id: string; 
   challenger_name: string; 
   opponent_id: string; 
   subject: string; 
   stake_amount: number; 
   status: string; 
   room_code?: string; 
 }; 
 
 export function BattleRequestListener() { 
   const router = useRouter(); 
   const supabase = getSupabaseClient(); 
   const [incomingRequest, setIncomingRequest] = useState<BattleRequest | null>(null); 
   const [currentUserId, setCurrentUserId] = useState<string | null>(null); 
   const [currentUserName, setCurrentUserName] = useState<string>(""); 
   const [busy, setBusy] = useState(false); 
   const [error, setError] = useState<string | null>(null); 
   const [responseMsg, setResponseMsg] = useState<string | null>(null); 
 
   useEffect(() => { 
     const init = async () => { 
       const { data: { user } } = await supabase.auth.getUser(); 
       if (!user) return; 
       setCurrentUserId(user.id); 
 
       const { data: profile } = await supabase 
         .from("profiles") 
         .select("display_name") 
         .eq("id", user.id) 
         .single(); 
       setCurrentUserName(profile?.display_name || user.email?.split("@")[0] || "Player"); 
 
       const channel = supabase 
         .channel("battle-requests-" + user.id) 
         .on("postgres_changes", { 
           event: "INSERT", 
           schema: "public", 
           table: "battle_requests", 
           filter: "opponent_id=eq." + user.id, 
         }, (payload) => { 
           const req = payload.new as BattleRequest; 
           if (req.status === "pending") setIncomingRequest(req); 
         }) 
         .subscribe(); 
 
       return () => { supabase.removeChannel(channel); }; 
     }; 
     init(); 
   }, []); 
 
   const handleAccept = async () => { 
     if (!incomingRequest || !currentUserId) return; 
     setBusy(true); 
     setError(null); 
 
     try { 
       const { stake_amount, challenger_id, challenger_name, id, room_code: roomCode } = incomingRequest; 
 
       if (!roomCode) throw new Error("No room code on this challenge."); 
 
       const [challengerBalance, myBalance] = await Promise.all([ 
         getWalletBalance(challenger_id), 
         getWalletBalance(currentUserId), 
       ]); 
 
       if (challengerBalance < stake_amount) { 
         await supabase.from("battle_requests").update({ status: "cancelled" }).eq("id", id); 
         setIncomingRequest(null); 
         setResponseMsg("Challenge cancelled — challenger no longer has enough balance."); 
         setTimeout(() => setResponseMsg(null), 5000); 
         return; 
       } 
 
       if (myBalance < stake_amount) { 
         setError(`You need ₦${stake_amount} to accept. Your balance: ₦${myBalance}.`); 
         setBusy(false); 
         return; 
       } 
 
       const { data: sessionData } = await supabase.auth.getSession(); 
       const userId = sessionData?.session?.user?.id; 
       if (!userId) throw new Error("Not logged in"); 
 
       // Find the room the challenger already created 
       const { data: roomRow } = await supabase 
         .from("battle_rooms") 
         .select("id") 
         .eq("room_code", roomCode) 
         .single(); 
       if (!roomRow) throw new Error("Battle room not found."); 
 
       // Add acceptor to room_players (with duplicate guard) 
       const { data: existingPlayer } = await supabase 
         .from("room_players") 
         .select("id") 
         .eq("room_id", roomRow.id) 
         .eq("user_id", userId) 
         .maybeSingle(); 
 
       if (!existingPlayer) { 
         await supabase.from("room_players").insert({ 
           room_id: roomRow.id, 
           player_name: currentUserName, 
           user_id: userId, 
           score: 0, 
           finished: false, 
           is_ready: true, 
         }); 
       } 
 
       // Deduct stake and update room 
       await Promise.all([ 
         processTransaction(currentUserId, "stake", stake_amount, `challenge-accept-${id}`, `Staked ₦${stake_amount} for challenge vs ${challenger_name}`), 
         supabase.from("battle_rooms").update({ guest_id: userId, status: "waiting" }).eq("room_code", roomCode), 
         supabase.from("battle_requests").update({ status: "accepted" }).eq("id", id), 
       ]); 
 
       localStorage.setItem("playerName", currentUserName); 
       setIncomingRequest(null); 
       router.push(`/battle/${roomCode}`); 
     } catch (e: unknown) { 
       setError((e as Error)?.message ?? "Something went wrong. Please try again."); 
     } finally { 
       setBusy(false); 
     } 
   }; 
 
   const handleDecline = async () => { 
     if (!incomingRequest) return; 
     await supabase.from("battle_requests").update({ status: "declined" }).eq("id", incomingRequest.id); 
     setIncomingRequest(null); 
     setResponseMsg("Challenge declined."); 
     setTimeout(() => setResponseMsg(null), 3000); 
   }; 
 
   const subjectLabel = incomingRequest?.subject 
     ? incomingRequest.subject.charAt(0).toUpperCase() + incomingRequest.subject.slice(1) 
     : ""; 
 
   if (!incomingRequest && !responseMsg) return null; 
 
   return ( 
     <div className="fixed bottom-6 right-4 z-[100] w-full max-w-sm px-2"> 
       {responseMsg && !incomingRequest && ( 
         <div className="mb-3 rounded-2xl border border-white/10 bg-[#1a1a2e] px-4 py-3 text-sm text-zinc-300 shadow-2xl"> 
           {responseMsg} 
         </div> 
       )} 
       {incomingRequest && ( 
         <div className="rounded-3xl border border-[#7c3aed]/40 bg-[#1a1a2e] p-5 shadow-2xl shadow-black/60"> 
           <div className="flex items-center gap-3 mb-4"> 
             <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#7c3aed]/30 ring-1 ring-[#7c3aed]/50"> 
               <span className="text-xl font-extrabold text-white"> 
                 {incomingRequest.challenger_name[0]?.toUpperCase() ?? "?"} 
               </span> 
             </div> 
             <div> 
               <p className="font-extrabold text-white text-sm leading-tight">⚔️ Challenge Incoming!</p> 
               <p className="text-xs text-zinc-400 mt-0.5"> 
                 <span className="text-[#f59e0b] font-bold">{incomingRequest.challenger_name}</span>{" "}wants to battle you 
               </p> 
             </div> 
           </div> 
           <div className="rounded-xl bg-black/30 px-3 py-2.5 mb-4 space-y-1.5"> 
             <div className="flex justify-between text-xs"> 
               <span className="text-zinc-400">Subject:</span> 
               <span className="text-white font-bold">{subjectLabel}</span> 
             </div> 
             <div className="flex justify-between text-xs"> 
               <span className="text-zinc-400">Stake:</span> 
               <span className="text-[#f59e0b] font-bold">₦{incomingRequest.stake_amount}</span> 
             </div> 
             <div className="flex justify-between text-xs"> 
               <span className="text-zinc-400">Prize Pool:</span> 
               <span className="text-green-400 font-bold">₦{Math.floor(incomingRequest.stake_amount * 2 * 0.8)}</span> 
             </div> 
           </div> 
           {error && ( 
             <div className="mb-3 rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-300">{error}</div> 
           )} 
           <div className="flex gap-2"> 
             <button onClick={handleDecline} disabled={busy} 
               className="flex-1 rounded-xl border border-white/10 py-2.5 text-xs font-bold text-zinc-400 hover:text-white hover:border-white/30 transition disabled:opacity-50"> 
               ✕ Decline 
             </button> 
             <button onClick={handleAccept} disabled={busy} 
               className="flex-1 rounded-xl bg-[#7c3aed] py-2.5 text-xs font-extrabold text-white hover:bg-[#6d28d9] disabled:opacity-50 transition"> 
               {busy ? "Setting up…" : "✓ Accept ⚔️"} 
             </button> 
           </div> 
         </div> 
       )} 
     </div> 
   ); 
 } 
