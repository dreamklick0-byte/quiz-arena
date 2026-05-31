"use client"; 
 
 import { useEffect, useState, useCallback } from "react"; 
 import Link from "next/link"; 
 import { getSupabaseClient } from "@/lib/supabase"; 
 
 type Mission = { 
   id: string; 
   title: string; 
   description: string; 
   type: "daily" | "weekly"; 
   mission_key: string; 
   target_count: number; 
   coin_reward: number; 
   xp_reward: number; 
   icon: string; 
 }; 
 
 type UserMission = { 
   id: string; 
   mission_key: string; 
   current_count: number; 
   is_complete: boolean; 
   is_claimed: boolean; 
   period_start: string; 
 }; 
 
 export default function MissionsPage() { 
   const [missions, setMissions] = useState<Mission[]>([]); 
   const [userMissions, setUserMissions] = useState<Record<string, UserMission>>({}); 
   const [loading, setLoading] = useState(true); 
   const [claiming, setClaiming] = useState<string | null>(null); 
   const [userId, setUserId] = useState<string | null>(null); 
 
   const getDailyPeriodStart = () => { 
     const now = new Date(); 
     now.setHours(0, 0, 0, 0); 
     return now.toISOString(); 
   }; 
 
   const getWeeklyPeriodStart = () => { 
     const now = new Date(); 
     const day = now.getDay(); 
     const diff = now.getDate() - day + (day === 0 ? -6 : 1); 
     now.setDate(diff); 
     now.setHours(0, 0, 0, 0); 
     return now.toISOString(); 
   }; 
 
   const fetchMissions = useCallback(async () => { 
     const supabase = getSupabaseClient(); 
     const { data: { user } } = await supabase.auth.getUser(); 
     if (!user) return; 
     setUserId(user.id); 
 
     const { data: missionList } = await supabase 
       .from("missions") 
       .select("*") 
       .eq("is_active", true) 
       .order("type", { ascending: true }); 
 
     if (!missionList) { setLoading(false); return; } 
     setMissions(missionList); 
 
     const dailyStart = getDailyPeriodStart(); 
     const weeklyStart = getWeeklyPeriodStart(); 
 
     for (const m of missionList) { 
       const periodStart = m.type === "daily" ? dailyStart : weeklyStart; 
       await supabase.from("user_missions").upsert( 
         { user_id: user.id, mission_id: m.id, mission_key: m.mission_key, period_start: periodStart }, 
         { onConflict: "user_id,mission_key,period_start", ignoreDuplicates: true } 
       ); 
     } 
 
     const { data: progress } = await supabase 
       .from("user_missions") 
       .select("*") 
       .eq("user_id", user.id) 
       .in("mission_key", missionList.map(m => m.mission_key)); 
 
     if (progress) { 
       const map: Record<string, UserMission> = {}; 
       for (const p of progress) { 
         const mission = missionList.find(m => m.mission_key === p.mission_key); 
         if (!mission) continue; 
         const currentPeriod = mission.type === "daily" ? dailyStart : weeklyStart; 
         if (p.period_start.startsWith(currentPeriod.slice(0, 10))) { 
           map[p.mission_key] = p; 
         } 
       } 
       setUserMissions(map); 
     } 
     setLoading(false); 
   }, []); 
 
   useEffect(() => { fetchMissions(); }, [fetchMissions]); 
 
   const handleClaim = async (mission: Mission) => { 
     if (!userId) return; 
     const progress = userMissions[mission.mission_key]; 
     if (!progress || !progress.is_complete || progress.is_claimed) return; 
     setClaiming(mission.mission_key); 
     const supabase = getSupabaseClient(); 
     try { 
       await supabase.from("user_missions").update({ is_claimed: true }).eq("id", progress.id); 
       await supabase.rpc("increment_battle_coins", { p_user_id: userId, p_amount: mission.coin_reward }); 
       await supabase.from("coin_transactions").insert({ 
         user_id: userId, 
         type: "mission_reward", 
         battle_coins_change: mission.coin_reward, 
         reward_coins_change: 0, 
         fee_coins: 0, 
         naira_equivalent: 0, 
         reference: `mission-${mission.mission_key}-${Date.now()}`, 
         description: `Mission reward: ${mission.title}` 
       }); 
       setUserMissions(prev => ({ 
         ...prev, 
         [mission.mission_key]: { ...prev[mission.mission_key], is_claimed: true } 
       })); 
     } catch (e) { console.error("Claim error:", e); } 
     setClaiming(null); 
   }; 
 
   const dailyMissions = missions.filter(m => m.type === "daily"); 
   const weeklyMissions = missions.filter(m => m.type === "weekly"); 
 
   const renderMission = (mission: Mission) => { 
     const progress = userMissions[mission.mission_key]; 
     const current = progress?.current_count ?? 0; 
     const isComplete = progress?.is_complete ?? false; 
     const isClaimed = progress?.is_claimed ?? false; 
     const pct = Math.min(100, Math.round((current / mission.target_count) * 100)); 
 
     return ( 
       <div key={mission.id} className={`rounded-2xl border p-5 transition-all ${ 
         isClaimed ? "border-zinc-700/40 bg-zinc-900/30 opacity-60" : 
         isComplete ? "border-yellow-500/40 bg-yellow-500/5 shadow-lg shadow-yellow-500/10" : 
         "border-white/10 bg-[#161627]/60" 
       }`}> 
         <div className="flex items-start justify-between gap-3"> 
           <div className="flex items-start gap-3 flex-1"> 
             <span className="text-2xl mt-0.5">{mission.icon}</span> 
             <div className="flex-1"> 
               <p className="font-bold text-white text-sm">{mission.title}</p> 
               <p className="text-xs text-zinc-400 mt-0.5">{mission.description}</p> 
               <div className="mt-3"> 
                 <div className="flex justify-between text-xs text-zinc-500 mb-1"> 
                   <span>{current} / {mission.target_count}</span> 
                   <span>{pct}%</span> 
                 </div> 
                 <div className="h-2 rounded-full bg-white/10 overflow-hidden"> 
                   <div className={`h-full rounded-full transition-all ${isComplete ? "bg-yellow-500" : "bg-purple-600"}`} 
                     style={{ width: `${pct}%` }} /> 
                 </div> 
               </div> 
             </div> 
           </div> 
           <div className="flex flex-col items-end gap-2 shrink-0"> 
             <div className="text-right"> 
               <p className="text-xs font-bold text-yellow-500">+{mission.coin_reward} 🪙</p> 
               {mission.xp_reward > 0 && <p className="text-xs text-purple-400">+{mission.xp_reward} XP</p>} 
             </div> 
             {isClaimed ? ( 
               <span className="text-xs font-bold text-zinc-500 bg-zinc-800 px-3 py-1.5 rounded-xl">✅ Done</span> 
             ) : isComplete ? ( 
               <button onClick={() => handleClaim(mission)} disabled={claiming === mission.mission_key} 
                 className="text-xs font-black text-black bg-yellow-500 hover:bg-yellow-400 px-3 py-1.5 rounded-xl transition disabled:opacity-60"> 
                 {claiming === mission.mission_key ? "..." : "CLAIM"} 
               </button> 
             ) : ( 
               <span className="text-xs text-zinc-600 bg-white/5 px-3 py-1.5 rounded-xl">In Progress</span> 
             )} 
           </div> 
         </div> 
       </div> 
     ); 
   }; 
 
   return ( 
     <div className="min-h-screen bg-[#0f0f1a] text-zinc-100"> 
       <div className="py-14 text-center relative overflow-hidden" 
         style={{ background: "linear-gradient(135deg, #1a0a2e, #0f1a2e)" }}> 
         <div className="relative z-10 px-4"> 
           <h1 className="text-4xl font-black text-white">🎯 Missions</h1> 
           <p className="text-zinc-300 mt-2 text-sm">Complete missions to earn coins and XP</p> 
         </div> 
       </div> 
 
       <div className="mx-auto max-w-lg px-4 py-8 space-y-8"> 
         {loading ? ( 
           <p className="text-center text-zinc-400 animate-pulse">Loading missions...</p> 
         ) : ( 
           <> 
             <div> 
               <div className="flex items-center gap-2 mb-4"> 
                 <span className="text-lg">☀️</span> 
                 <h2 className="text-lg font-black text-white">Daily Missions</h2> 
                 <span className="text-xs text-zinc-500 ml-auto">Resets at midnight</span> 
               </div> 
               <div className="space-y-3">{dailyMissions.map(renderMission)}</div> 
             </div> 
 
             <div> 
               <div className="flex items-center gap-2 mb-4"> 
                 <span className="text-lg">📅</span> 
                 <h2 className="text-lg font-black text-white">Weekly Missions</h2> 
                 <span className="text-xs text-zinc-500 ml-auto">Resets Monday</span> 
               </div> 
               <div className="space-y-3">{weeklyMissions.map(renderMission)}</div> 
             </div> 
 
             <div className="rounded-2xl border border-purple-500/20 bg-purple-500/5 p-4 text-center"> 
               <p className="text-xs text-zinc-400"> 
                 💡 Progress updates automatically as you play battles and practice. Come back daily to claim rewards! 
               </p> 
             </div> 
           </> 
         )} 
 
         <div className="flex justify-center gap-6 pt-4"> 
           <Link href="/battle" className="text-sm font-black text-purple-400 hover:text-purple-300">⚔️ BATTLE</Link> 
           <Link href="/coins" className="text-sm font-bold text-yellow-500 hover:text-yellow-400">🪙 COINS</Link> 
           <Link href="/" className="text-sm font-bold text-zinc-500 hover:text-white">HOME</Link> 
         </div> 
       </div> 
     </div> 
   ); 
 } 
