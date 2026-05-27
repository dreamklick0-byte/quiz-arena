"use client"; 
 import { useEffect, useState } from "react"; 
 import { useParams, useRouter } from "next/navigation"; 
 import { getSupabaseClient } from "@/lib/supabase"; 
 
 type Entry = { 
   id: string; 
   display_name: string; 
   score: number; 
   time_seconds: number; 
   user_id: string; 
 }; 
 
 export default function LeagueResultsPage() { 
   const params = useParams(); 
   const router = useRouter(); 
   const leagueId = params?.leagueId as string; 
   const [entries, setEntries] = useState<Entry[]>([]); 
   const [league, setLeague] = useState<any>(null); 
   const [loading, setLoading] = useState(true); 
 
   useEffect(() => { 
     const sb = getSupabaseClient(); 
     Promise.all([ 
       sb.from("leagues").select("*").eq("id", leagueId).single(), 
       sb.from("league_entries").select("*").eq("league_id", leagueId).order("score", { ascending: false }).order("time_seconds", { ascending: true }).limit(10) 
     ]).then(([leagueRes, entriesRes]) => { 
       setLeague(leagueRes.data); 
       setEntries(entriesRes.data || []); 
       setLoading(false); 
     }); 
   }, [leagueId]); 
 
   const medals = ["🥇", "🥈", "🥉"]; 
 
   if (loading) return <div className="min-h-screen bg-[#0f0f1a] flex items-center justify-center text-white">Loading results...</div>; 
 
   return ( 
     <div className="min-h-screen bg-[#0f0f1a] text-white px-4 py-10"> 
       <div className="max-w-2xl mx-auto"> 
         <button onClick={() => router.push("/league")} className="mb-6 text-sm text-zinc-400 hover:text-white">← Back to Leagues</button> 
         <h1 className="text-3xl font-black text-white mb-2">{league?.name}</h1> 
         <p className="text-zinc-400 mb-8">{league?.subject} · Entry ₦{league?.entry_fee} · Prize Pool ₦{league?.prize_pool}</p> 
 
         <h2 className="text-xl font-bold text-[#f59e0b] mb-4">🏆 Final Results</h2> 
 
         {entries.length === 0 ? ( 
           <p className="text-zinc-500">No results yet.</p> 
         ) : ( 
           <div className="space-y-3"> 
             {entries.slice(0, 10).map((entry, idx) => ( 
               <div key={entry.id} className={`rounded-2xl border px-5 py-4 flex items-center gap-4 ${idx === 0 ? 'border-yellow-500/50 bg-yellow-500/10' : idx === 1 ? 'border-zinc-400/40 bg-zinc-400/10' : idx === 2 ? 'border-orange-600/40 bg-orange-600/10' : 'border-white/10 bg-white/5'}`}> 
                 <span className="text-3xl">{medals[idx] || `#${idx + 1}`}</span> 
                 <div className="flex-1"> 
                   <p className="font-black text-white text-lg">{entry.display_name || "Anonymous"}</p> 
                   <p className="text-sm text-zinc-400">Score: <span className="text-white font-bold">{entry.score}/10</span> · Time: <span className="text-white font-bold">{entry.time_seconds}s</span></p> 
                 </div> 
                 {idx === 0 && <span className="text-yellow-400 font-black text-sm">1ST PLACE</span>} 
                 {idx === 1 && <span className="text-zinc-300 font-black text-sm">2ND PLACE</span>} 
                 {idx === 2 && <span className="text-orange-400 font-black text-sm">3RD PLACE</span>} 
               </div> 
             ))} 
           </div> 
         )} 
       </div> 
     </div> 
   ); 
 } 
