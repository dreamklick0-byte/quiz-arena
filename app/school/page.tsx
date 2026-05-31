"use client"; 
 
 import { useEffect, useState, useCallback } from "react"; 
 import Link from "next/link"; 
 import { getSupabaseClient } from "@/lib/supabase"; 
 
 type School = { 
   school_id: string; 
   school_name: string; 
   state: string; 
   city: string; 
   school_code: string; 
   total_students: number; 
   total_xp: number; 
   total_wins: number; 
 }; 
 
 type MySchool = { 
   id: string; 
   name: string; 
   school_code: string; 
   state: string; 
   city: string; 
 }; 
 
 export default function SchoolPage() { 
   const [tab, setTab] = useState<"leaderboard" | "register" | "join">("leaderboard"); 
   const [schools, setSchools] = useState<School[]>([]); 
   const [mySchool, setMySchool] = useState<MySchool | null>(null); 
   const [loading, setLoading] = useState(true); 
   const [userId, setUserId] = useState<string | null>(null); 
   const [filterState, setFilterState] = useState(""); 
   const [busy, setBusy] = useState(false); 
   const [msg, setMsg] = useState<{ type: "success" | "error"; text: string } | null>(null); 
 
   // Register form 
   const [regName, setRegName] = useState(""); 
   const [regEmail, setRegEmail] = useState(""); 
   const [regPhone, setRegPhone] = useState(""); 
   const [regState, setRegState] = useState(""); 
   const [regCity, setRegCity] = useState(""); 
   const [regAddress, setRegAddress] = useState(""); 
 
   // Join form 
   const [joinCode, setJoinCode] = useState(""); 
 
   const STATES = ["Abia","Adamawa","Akwa Ibom","Anambra","Bauchi","Bayelsa","Benue","Borno","Cross River","Delta","Ebonyi","Edo","Ekiti","Enugu","FCT","Gombe","Imo","Jigawa","Kaduna","Kano","Katsina","Kebbi","Kogi","Kwara","Lagos","Nasarawa","Niger","Ogun","Ondo","Osun","Oyo","Plateau","Rivers","Sokoto","Taraba","Yobe","Zamfara"]; 
 
   const generateSchoolCode = (name: string) => { 
     const words = name.toUpperCase().split(" ").filter(Boolean); 
     const prefix = words.map(w => w[0]).join("").slice(0, 4); 
     const num = Math.floor(1000 + Math.random() * 9000); 
     return `${prefix}${num}`; 
   }; 
 
   const fetchData = useCallback(async () => { 
     const supabase = getSupabaseClient(); 
     const { data: { user } } = await supabase.auth.getUser(); 
     if (user) { 
       setUserId(user.id); 
       const { data: profile } = await supabase 
         .from("profiles") 
         .select("school_id, school_code") 
         .eq("id", user.id) 
         .maybeSingle(); 
       if (profile?.school_id) { 
         const { data: school } = await supabase 
           .from("schools") 
           .select("id, name, school_code, state, city") 
           .eq("id", profile.school_id) 
           .maybeSingle(); 
         if (school) setMySchool(school); 
       } 
     } 
 
     const { data } = await supabase 
       .from("school_leaderboard") 
       .select("*") 
       .order("total_wins", { ascending: false }) 
       .limit(50); 
 
     setSchools((data as School[]) || []); 
     setLoading(false); 
   }, []); 
 
   useEffect(() => { fetchData(); }, [fetchData]); 
 
   const handleRegister = async () => { 
     if (!regName || !regEmail || !regState) { 
       setMsg({ type: "error", text: "School name, email and state are required." }); 
       return; 
     } 
     setBusy(true); 
     setMsg(null); 
     const supabase = getSupabaseClient(); 
     const code = generateSchoolCode(regName); 
     const { data: school, error } = await supabase 
       .from("schools") 
       .insert({ name: regName, email: regEmail, phone: regPhone, state: regState, city: regCity, address: regAddress, school_code: code }) 
       .select("id, name, school_code, state, city") 
       .single(); 
 
     if (error) { 
       setMsg({ type: "error", text: error.message.includes("unique") ? "This email is already registered." : error.message }); 
       setBusy(false); 
       return; 
     } 
 
     if (userId && school) { 
       await supabase.from("profiles").update({ school_id: school.id, school_code: school.school_code }).eq("id", userId); 
       setMySchool(school); 
       setMsg({ type: "success", text: `School registered! Your school code is: ${code}` }); 
       setTab("leaderboard"); 
       fetchData(); 
     } 
     setBusy(false); 
   }; 
 
   const handleJoin = async () => { 
     if (!joinCode.trim()) { setMsg({ type: "error", text: "Enter a school code." }); return; } 
     setBusy(true); 
     setMsg(null); 
     const supabase = getSupabaseClient(); 
     const { data: school, error } = await supabase 
       .from("schools") 
       .select("id, name, school_code, state, city") 
       .eq("school_code", joinCode.toUpperCase().trim()) 
       .maybeSingle(); 
 
     if (error || !school) { 
       setMsg({ type: "error", text: "School not found. Check the code and try again." }); 
       setBusy(false); 
       return; 
     } 
 
     if (userId) { 
       await supabase.from("profiles").update({ school_id: school.id, school_code: school.school_code }).eq("id", userId); 
       setMySchool(school); 
       setMsg({ type: "success", text: `You joined ${school.name}! 🎉` }); 
       setTab("leaderboard"); 
     } 
     setBusy(false); 
   }; 
 
   const filtered = filterState ? schools.filter(s => s.state === filterState) : schools; 
 
   return ( 
     <div className="min-h-screen bg-[#0f0f1a] text-zinc-100"> 
       {/* Header */} 
       <div className="py-14 text-center relative overflow-hidden" 
         style={{ background: "linear-gradient(135deg, #0a1a2e, #1a0a2e)" }}> 
         <div className="relative z-10 px-4"> 
           <h1 className="text-4xl font-black text-white">🏫 School Arena</h1> 
           <p className="text-zinc-300 mt-2 text-sm">Register your school and compete on the national stage</p> 
           {mySchool && ( 
             <div className="mt-4 inline-flex items-center gap-2 bg-purple-600/20 border border-purple-500/30 px-4 py-2 rounded-xl"> 
               <span className="text-purple-300 text-sm font-bold">🏫 {mySchool.name}</span> 
               <span className="text-xs text-zinc-400">Code: {mySchool.school_code}</span> 
             </div> 
           )} 
         </div> 
       </div> 
 
       <div className="mx-auto max-w-lg px-4 py-6"> 
         {/* Tabs */} 
         <div className="flex gap-2 mb-6"> 
           {[ 
             { key: "leaderboard", label: "🏆 Leaderboard" }, 
             { key: "register", label: "🏫 Register School" }, 
             { key: "join", label: "🔗 Join School" }, 
           ].map(t => ( 
             <button key={t.key} onClick={() => { setTab(t.key as any); setMsg(null); }} 
               className={`flex-1 rounded-xl py-2 text-xs font-bold transition ${tab === t.key ? "bg-purple-600 text-white" : "bg-white/5 text-zinc-400 hover:bg-white/10"}`}> 
               {t.label} 
             </button> 
           ))} 
         </div> 
 
         {msg && ( 
           <div className={`mb-4 rounded-xl px-4 py-3 text-sm font-medium ${msg.type === "success" ? "bg-emerald-500/15 border border-emerald-500/30 text-emerald-400" : "bg-red-500/15 border border-red-500/30 text-red-400"}`}> 
             {msg.text} 
           </div> 
         )} 
 
         {/* Leaderboard Tab */} 
         {tab === "leaderboard" && ( 
           <div className="space-y-4"> 
             <div> 
               <label className="text-xs font-bold text-zinc-400 uppercase tracking-wide">Filter by State</label> 
               <select value={filterState} onChange={e => setFilterState(e.target.value)} 
                 style={{ background: '#1a1a2e', color: '#ffffff' }} 
                 className="mt-1 w-full rounded-xl border border-white/10 px-4 py-3 text-sm outline-none"> 
                 <option value="">🌍 All States (National)</option> 
                 {STATES.map(s => <option key={s} value={s}>{s}</option>)} 
               </select> 
             </div> 
 
             {loading ? ( 
               <p className="text-center text-zinc-400 animate-pulse py-8">Loading schools...</p> 
             ) : filtered.length === 0 ? ( 
               <div className="text-center py-12"> 
                 <p className="text-4xl mb-3">🏫</p> 
                 <p className="text-zinc-400 text-sm">No schools registered yet{filterState ? ` in ${filterState}` : ""}.</p> 
                 <button onClick={() => setTab("register")} className="mt-4 text-purple-400 text-sm font-bold hover:underline"> 
                   Register your school → 
                 </button> 
               </div> 
             ) : ( 
               <div className="space-y-3"> 
                 {filtered.map((school, i) => ( 
                   <div key={school.school_id} className={`rounded-2xl border p-4 ${i === 0 ? "border-yellow-500/40 bg-yellow-500/5" : i === 1 ? "border-zinc-400/30 bg-zinc-400/5" : i === 2 ? "border-orange-500/30 bg-orange-500/5" : "border-white/10 bg-[#161627]/60"}`}> 
                     <div className="flex items-center gap-3"> 
                       <span className={`flex h-9 w-9 items-center justify-center rounded-xl font-black text-sm ${i === 0 ? "bg-yellow-500 text-black" : i === 1 ? "bg-zinc-300 text-black" : i === 2 ? "bg-orange-500 text-black" : "bg-white/5 text-purple-400"}`}> 
                         {i + 1} 
                       </span> 
                       <div className="flex-1"> 
                         <p className="font-bold text-white text-sm">{school.school_name}</p> 
                         <p className="text-xs text-zinc-500">{school.city ? `${school.city}, ` : ""}{school.state}</p> 
                       </div> 
                       <div className="text-right"> 
                         <p className="text-sm font-black text-yellow-500">{school.total_wins} wins</p> 
                         <p className="text-xs text-zinc-500">{school.total_students} students</p> 
                       </div> 
                     </div> 
                   </div> 
                 ))} 
               </div> 
             )} 
           </div> 
         )} 
 
         {/* Register Tab */} 
         {tab === "register" && ( 
           <div className="space-y-4"> 
             <div className="rounded-2xl border border-white/10 bg-[#161627]/60 p-5 space-y-3"> 
               <h2 className="font-black text-white">Register Your School</h2> 
               <p className="text-xs text-zinc-400">A unique school code will be generated. Share it with students to join.</p> 
 
               {[ 
                 { label: "School Name *", value: regName, set: setRegName, placeholder: "e.g. Government College Lagos" }, 
                 { label: "School Email *", value: regEmail, set: setRegEmail, placeholder: "school@email.com" }, 
                 { label: "Phone Number", value: regPhone, set: setRegPhone, placeholder: "+234..." }, 
                 { label: "City", value: regCity, set: setRegCity, placeholder: "e.g. Lagos Island" }, 
                 { label: "Address", value: regAddress, set: setRegAddress, placeholder: "Full school address" }, 
               ].map(f => ( 
                 <div key={f.label}> 
                   <label className="text-xs text-zinc-400 font-medium">{f.label}</label> 
                   <input value={f.value} onChange={e => f.set(e.target.value)} placeholder={f.placeholder} 
                     className="mt-1 w-full rounded-xl bg-white/5 border border-white/10 px-4 py-2.5 text-sm text-white placeholder-zinc-600 outline-none focus:border-purple-500/50" /> 
                 </div> 
               ))} 
 
               <div> 
                 <label className="text-xs text-zinc-400 font-medium">State *</label> 
                 <select value={regState} onChange={e => setRegState(e.target.value)} 
                   style={{ background: '#1a1a2e', color: '#ffffff' }} 
                   className="mt-1 w-full rounded-xl border border-white/10 px-4 py-2.5 text-sm outline-none"> 
                   <option value="">-- Select State --</option> 
                   {STATES.map(s => <option key={s} value={s}>{s}</option>)} 
                 </select> 
               </div> 
 
               <button onClick={handleRegister} disabled={busy} 
                 className="w-full rounded-xl bg-purple-600 hover:bg-purple-500 py-3 text-sm font-black text-white transition disabled:opacity-60"> 
                 {busy ? "Registering..." : "🏫 Register School"} 
               </button> 
             </div> 
           </div> 
         )} 
 
         {/* Join Tab */} 
         {tab === "join" && ( 
           <div className="space-y-4"> 
             <div className="rounded-2xl border border-white/10 bg-[#161627]/60 p-5 space-y-4"> 
               <h2 className="font-black text-white">Join Your School</h2> 
               <p className="text-xs text-zinc-400">Ask your school admin for the school code and enter it below.</p> 
               <div> 
                 <label className="text-xs text-zinc-400 font-medium">School Code</label> 
                 <input value={joinCode} onChange={e => setJoinCode(e.target.value.toUpperCase())} 
                   placeholder="e.g. GCL1234" 
                   className="mt-1 w-full rounded-xl bg-white/5 border border-white/10 px-4 py-3 text-sm text-white placeholder-zinc-600 outline-none focus:border-purple-500/50 font-mono tracking-widest" /> 
               </div> 
               <button onClick={handleJoin} disabled={busy} 
                 className="w-full rounded-xl bg-purple-600 hover:bg-purple-500 py-3 text-sm font-black text-white transition disabled:opacity-60"> 
                 {busy ? "Joining..." : "🔗 Join School"} 
               </button> 
             </div> 
 
             <div className="rounded-2xl border border-yellow-500/20 bg-yellow-500/5 p-4 text-center"> 
               <p className="text-xs text-zinc-400">Don't have a code? Ask your school administrator or <button onClick={() => setTab("register")} className="text-yellow-500 font-bold hover:underline">register your school</button>.</p> 
             </div> 
           </div> 
         )} 
 
         <div className="flex justify-center gap-6 pt-8"> 
           <Link href="/leaderboard" className="text-sm font-bold text-purple-400 hover:text-purple-300">🏆 Player Rankings</Link> 
           <Link href="/battle" className="text-sm font-bold text-zinc-500 hover:text-white">⚔️ Battle</Link> 
           <Link href="/" className="text-sm font-bold text-zinc-500 hover:text-white">Home</Link> 
         </div> 
       </div> 
     </div> 
   ); 
 } 
