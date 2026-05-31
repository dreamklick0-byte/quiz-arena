"use client"; 
 
 import { useState } from "react"; 
 import { useRouter } from "next/navigation"; 
 import Link from "next/link"; 
 import { getSupabaseClient } from "@/lib/supabase"; 
 
 export default function SchoolLoginPage() { 
   const router = useRouter(); 
   const [tab, setTab] = useState<"signin" | "signup">("signin"); 
   const [email, setEmail] = useState(""); 
   const [password, setPassword] = useState(""); 
   const [schoolName, setSchoolName] = useState(""); 
   const [fullName, setFullName] = useState(""); 
   const [state, setState] = useState(""); 
   const [city, setCity] = useState(""); 
   const [phone, setPhone] = useState(""); 
   const [busy, setBusy] = useState(false); 
   const [message, setMessage] = useState<{ type: "error" | "success"; text: string } | null>(null); 
 
   const STATES = ["Abia","Adamawa","Akwa Ibom","Anambra","Bauchi","Bayelsa","Benue","Borno","Cross River","Delta","Ebonyi","Edo","Ekiti","Enugu","FCT","Gombe","Imo","Jigawa","Kaduna","Kano","Katsina","Kebbi","Kogi","Kwara","Lagos","Nasarawa","Niger","Ogun","Ondo","Osun","Oyo","Plateau","Rivers","Sokoto","Taraba","Yobe","Zamfara"]; 
 
   const generateSchoolCode = (name: string) => { 
     const words = name.toUpperCase().split(" ").filter(Boolean); 
     const prefix = words.map(w => w[0]).join("").slice(0, 4); 
     const num = Math.floor(1000 + Math.random() * 9000); 
     return `${prefix}${num}`; 
   }; 
 
   const handleSignup = async () => { 
     if (!schoolName || !email || !password || !fullName || !state) { 
       setMessage({ type: "error", text: "School name, your name, email, password and state are required." }); 
       return; 
     } 
     setBusy(true); 
     setMessage(null); 
     const supabase = getSupabaseClient(); 
 
     // Create Supabase Auth account 
     const { data, error: signUpError } = await supabase.auth.signUp({ email: email.trim(), password }); 
     if (signUpError) { 
       setMessage({ type: "error", text: signUpError.message }); 
       setBusy(false); 
       return; 
     } 
 
     const user = data.user; 
     if (!user) { 
       setMessage({ type: "error", text: "Failed to create account. Try again." }); 
       setBusy(false); 
       return; 
     } 
 
     // Generate school code and register school 
     const code = generateSchoolCode(schoolName); 
     const { data: school, error: schoolError } = await supabase 
       .from("schools") 
       .insert({ name: schoolName, email: email.trim(), phone, state, city, school_code: code }) 
       .select("id, name, school_code") 
       .single(); 
 
     if (schoolError) { 
       setMessage({ type: "error", text: schoolError.message.includes("unique") ? "A school with this email already exists." : schoolError.message }); 
       setBusy(false); 
       return; 
     } 
 
     // Create school admin profile 
     await supabase.from("school_admin_profiles").upsert({ 
       id: user.id, 
       email: email.trim(), 
       full_name: fullName, 
       school_id: school.id, 
     }, { onConflict: "id" }); 
 
     // Set role flag on profiles table 
     await supabase.from("profiles").upsert({ 
       id: user.id, 
       display_name: fullName, 
       role: "school_admin", 
       school_id: school.id, 
       school_code: school.school_code, 
     }, { onConflict: "id" }); 
 
     // Sign in immediately 
     const { error: signInError } = await supabase.auth.signInWithPassword({ email: email.trim(), password }); 
     if (signInError) { 
       setMessage({ type: "error", text: "Account created! Please sign in." }); 
       setTab("signin"); 
       setBusy(false); 
       return; 
     } 
 
     // Set school session cookie 
     document.cookie = `school_session=${user.id}; path=/; max-age=604800`; 
 
     setMessage({ type: "success", text: `School registered! Your code is: ${code}` }); 
     setTimeout(() => router.push("/school/dashboard"), 1500); 
     setBusy(false); 
   }; 
 
   const handleSignin = async () => { 
     if (!email || !password) { 
       setMessage({ type: "error", text: "Email and password are required." }); 
       return; 
     } 
     setBusy(true); 
     setMessage(null); 
     const supabase = getSupabaseClient(); 
 
     const { data, error } = await supabase.auth.signInWithPassword({ email: email.trim(), password }); 
     if (error) { 
       setMessage({ type: "error", text: "Incorrect email or password." }); 
       setBusy(false); 
       return; 
     } 
 
     // Check if this user is a school admin 
     const { data: profile } = await supabase 
       .from("profiles") 
       .select("role, school_id") 
       .eq("id", data.user.id) 
       .maybeSingle(); 
 
     if (profile?.role !== "school_admin") { 
       await supabase.auth.signOut(); 
       setMessage({ type: "error", text: "This account is not registered as a school admin. Please use the student login." }); 
       setBusy(false); 
       return; 
     } 
 
     // Set school session cookie 
     document.cookie = `school_session=${data.user.id}; path=/; max-age=604800`; 
     router.push("/school/dashboard"); 
     setBusy(false); 
   }; 
 
   return ( 
     <div className="min-h-screen bg-[#0f0f1a] px-4 py-10 text-zinc-100 flex items-center justify-center"> 
       <div className="w-full max-w-md"> 
         <div className="text-center mb-8"> 
           <h1 className="text-3xl font-black text-white">🏫 School Admin Portal</h1> 
           <p className="text-zinc-400 text-sm mt-2">Manage your school and monitor student performance</p> 
         </div> 
 
         <div className="rounded-3xl border border-white/10 bg-[#161627]/90 p-8 shadow-xl"> 
           {/* Tabs */} 
           <div className="grid grid-cols-2 gap-2 rounded-xl border border-white/10 p-1 mb-6"> 
             <button onClick={() => { setTab("signin"); setMessage(null); }} 
               className={`rounded-lg px-3 py-2 text-sm font-semibold transition ${tab === "signin" ? "bg-[#7c3aed] text-white" : "text-zinc-400"}`}> 
               Sign In 
             </button> 
             <button onClick={() => { setTab("signup"); setMessage(null); }} 
               className={`rounded-lg px-3 py-2 text-sm font-semibold transition ${tab === "signup" ? "bg-[#7c3aed] text-white" : "text-zinc-400"}`}> 
               Register School 
             </button> 
           </div> 
 
           {message && ( 
             <div className={`mb-4 rounded-xl px-4 py-3 text-sm font-medium ${message.type === "success" ? "bg-emerald-500/15 border border-emerald-500/30 text-emerald-400" : "bg-red-500/15 border border-red-500/30 text-red-400"}`}> 
               {message.text} 
             </div> 
           )} 
 
           <div className="space-y-4"> 
             {tab === "signup" && ( 
               <> 
                 <div> 
                   <label className="text-xs font-semibold uppercase tracking-wide text-[#f59e0b]">School Name *</label> 
                   <input value={schoolName} onChange={e => setSchoolName(e.target.value)} placeholder="e.g. Government College Lagos" 
                     className="mt-2 w-full rounded-xl border border-white/10 bg-[#0f0f1a] px-4 py-3 text-sm text-white outline-none focus:border-[#7c3aed]/55" /> 
                 </div> 
                 <div> 
                   <label className="text-xs font-semibold uppercase tracking-wide text-[#f59e0b]">Your Full Name *</label> 
                   <input value={fullName} onChange={e => setFullName(e.target.value)} placeholder="Administrator's name" 
                     className="mt-2 w-full rounded-xl border border-white/10 bg-[#0f0f1a] px-4 py-3 text-sm text-white outline-none focus:border-[#7c3aed]/55" /> 
                 </div> 
                 <div> 
                   <label className="text-xs font-semibold uppercase tracking-wide text-[#f59e0b]">State *</label> 
                   <select value={state} onChange={e => setState(e.target.value)} 
                     style={{ background: '#0f0f1a', color: '#ffffff' }} 
                     className="mt-2 w-full rounded-xl border border-white/10 px-4 py-3 text-sm outline-none focus:border-[#7c3aed]/55"> 
                     <option value="">-- Select State --</option> 
                     {STATES.map(s => <option key={s} value={s}>{s}</option>)} 
                   </select> 
                 </div> 
                 <div> 
                   <label className="text-xs font-semibold uppercase tracking-wide text-[#f59e0b]">City</label> 
                   <input value={city} onChange={e => setCity(e.target.value)} placeholder="e.g. Abuja" 
                     className="mt-2 w-full rounded-xl border border-white/10 bg-[#0f0f1a] px-4 py-3 text-sm text-white outline-none focus:border-[#7c3aed]/55" /> 
                 </div> 
                 <div> 
                   <label className="text-xs font-semibold uppercase tracking-wide text-[#f59e0b]">Phone</label> 
                   <input value={phone} onChange={e => setPhone(e.target.value)} placeholder="+234..." 
                     className="mt-2 w-full rounded-xl border border-white/10 bg-[#0f0f1a] px-4 py-3 text-sm text-white outline-none focus:border-[#7c3aed]/55" /> 
                 </div> 
               </> 
             )} 
 
             <div> 
               <label className="text-xs font-semibold uppercase tracking-wide text-[#f59e0b]">Email *</label> 
               <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="school@email.com" 
                 className="mt-2 w-full rounded-xl border border-white/10 bg-[#0f0f1a] px-4 py-3 text-sm text-white outline-none focus:border-[#7c3aed]/55" /> 
             </div> 
             <div> 
               <label className="text-xs font-semibold uppercase tracking-wide text-[#f59e0b]">Password *</label> 
               <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" minLength={6} 
                 className="mt-2 w-full rounded-xl border border-white/10 bg-[#0f0f1a] px-4 py-3 text-sm text-white outline-none focus:border-[#7c3aed]/55" /> 
             </div> 
 
             <button 
               onClick={tab === "signup" ? handleSignup : handleSignin} 
               disabled={busy} 
               className="w-full rounded-xl bg-[#7c3aed] py-3.5 text-sm font-extrabold text-white shadow-lg transition hover:bg-[#6d28d9] disabled:opacity-60 mt-2"> 
               {busy ? "Please wait..." : tab === "signup" ? "🏫 Register School & Create Account" : "Sign In to Dashboard"} 
             </button> 
           </div> 
 
           <div className="mt-6 text-center space-y-2"> 
             <p className="text-xs text-zinc-500">Are you a student? <Link href="/auth" className="text-purple-400 hover:text-purple-300">Student login →</Link></p> 
             <Link href="/school" className="text-xs text-zinc-500 hover:text-white block">← Back to School Leaderboard</Link> 
           </div> 
         </div> 
       </div> 
     </div> 
   ); 
 } 
