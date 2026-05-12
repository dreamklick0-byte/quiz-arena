"use client"; 
 import { useState, useEffect } from "react"; 
 import { useRouter } from "next/navigation"; 
 import { getSupabaseClient } from "@/lib/supabase"; 
 import Link from "next/link"; 
 
 type User = { 
   id: string; 
   display_name: string | null; 
   referral_code: string | null; 
   created_at: string; 
   wallet_balance: number; 
   last_seen: string | null; 
 }; 
 
 export default function AdminUsersPage() { 
   const router = useRouter(); 
   const supabase = getSupabaseClient(); 
   const [users, setUsers] = useState<User[]>([]); 
   const [loading, setLoading] = useState(true); 
   const [search, setSearch] = useState(""); 
   const [selectedUser, setSelectedUser] = useState<User | null>(null); 
   const [actionType, setActionType] = useState<string>(""); 
   const [actionAmount, setActionAmount] = useState(""); 
   const [actionMsg, setActionMsg] = useState(""); 
   const [busy, setBusy] = useState(false); 
   const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null); 
   const [newUser, setNewUser] = useState({ email: "", password: "", display_name: "" }); 
   const [showAddUser, setShowAddUser] = useState(false); 
 
   const showToast = (msg: string, ok: boolean) => { 
     setToast({ msg, ok }); 
     setTimeout(() => setToast(null), 3000); 
   }; 
 
   const fetchUsers = async () => { 
     setLoading(true); 
     const { data: profiles } = await supabase 
       .from("profiles") 
       .select("id, display_name, referral_code, created_at") 
       .order("created_at", { ascending: false }); 
 
     const { data: wallets } = await supabase 
       .from("wallets") 
       .select("user_id, balance"); 
 
     const { data: presence } = await supabase 
       .from("user_presence") 
       .select("user_id, last_seen"); 
 
     const walletMap = Object.fromEntries((wallets || []).map(w => [w.user_id, w.balance])); 
     const presenceMap = Object.fromEntries((presence || []).map(p => [p.user_id, p.last_seen])); 
 
     const merged = (profiles || []).map(p => ({ 
       ...p, 
       wallet_balance: walletMap[p.id] || 0, 
       last_seen: presenceMap[p.id] || null, 
     })); 
     setUsers(merged); 
     setLoading(false); 
   }; 
 
   useEffect(() => { 
     const checkAdmin = async () => { 
       const res = await fetch("/api/admin/me"); 
       const data = await res.json(); 
       if (!data.success) { router.push("/admin/login"); return; } 
       fetchUsers(); 
     }; 
     checkAdmin(); 
   }, []); 
 
   const filtered = users.filter(u => 
     (u.display_name || "").toLowerCase().includes(search.toLowerCase()) || 
     (u.referral_code || "").toLowerCase().includes(search.toLowerCase()) || 
     u.id.includes(search) 
   ); 
 
   const isOnline = (last_seen: string | null) => { 
     if (!last_seen) return false; 
     return Date.now() - new Date(last_seen).getTime() < 5 * 60 * 1000; 
   }; 
 
   const handleAction = async () => { 
     if (!selectedUser) return; 
     setBusy(true); 
     const amount = parseFloat(actionAmount); 
     const supabase = getSupabaseClient(); 
 
     try { 
       if (actionType === "add_wallet" || actionType === "remove_wallet") { 
         const { data: wallet } = await supabase 
           .from("wallets") 
           .select("balance") 
           .eq("user_id", selectedUser.id) 
           .maybeSingle(); 
         const current = wallet?.balance || 0; 
         const newBalance = actionType === "add_wallet" ? current + amount : Math.max(0, current - amount); 
         await supabase.from("wallets").upsert({ user_id: selectedUser.id, balance: newBalance }, { onConflict: "user_id" }); 
         showToast(`Wallet updated: ₦${newBalance}`, true); 
       } 
 
       if (actionType === "add_xp" || actionType === "remove_xp") { 
         const { data: xpRow } = await supabase.from("user_xp").select("xp").eq("user_id", selectedUser.id).maybeSingle(); 
         const current = xpRow?.xp || 0; 
         const newXP = actionType === "add_xp" ? current + amount : Math.max(0, current - amount); 
         await supabase.from("user_xp").upsert({ user_id: selectedUser.id, xp: newXP }, { onConflict: "user_id" }); 
         showToast(`XP updated: ${newXP}`, true); 
       } 
 
       if (actionType === "add_coins" || actionType === "remove_coins") { 
         const { data: coinRow } = await supabase.from("arena_coins").select("coins").eq("user_id", selectedUser.id).maybeSingle(); 
         const current = coinRow?.coins || 0; 
         const newCoins = actionType === "add_coins" ? current + amount : Math.max(0, current - amount); 
         await supabase.from("arena_coins").upsert({ user_id: selectedUser.id, coins: newCoins }, { onConflict: "user_id" }); 
         showToast(`Coins updated: ${newCoins}`, true); 
       } 
 
       if (actionType === "delete_user") { 
         await supabase.from("profiles").delete().eq("id", selectedUser.id); 
         setUsers(prev => prev.filter(u => u.id !== selectedUser.id)); 
         setSelectedUser(null); 
         showToast("User removed from profiles", true); 
       } 
 
       if (actionType === "reset_password") { 
         const res = await fetch("/api/admin/reset-password", { 
           method: "POST", 
           headers: { "Content-Type": "application/json" }, 
           body: JSON.stringify({ userId: selectedUser.id, newPassword: actionAmount }), 
         }); 
         const data = await res.json(); 
         showToast(data.success ? "Password reset!" : "Failed: " + data.error, data.success); 
       } 
 
       fetchUsers(); 
       setActionType(""); 
       setActionAmount(""); 
     } catch (e) { 
       showToast("Action failed", false); 
     } 
     setBusy(false); 
   }; 
 
   const handleAddUser = async () => { 
     setBusy(true); 
     const res = await fetch("/api/admin/create-user", { 
       method: "POST", 
       headers: { "Content-Type": "application/json" }, 
       body: JSON.stringify(newUser), 
     }); 
     const data = await res.json(); 
     showToast(data.success ? "User created!" : "Failed: " + data.error, data.success); 
     if (data.success) { setShowAddUser(false); setNewUser({ email: "", password: "", display_name: "" }); fetchUsers(); } 
     setBusy(false); 
   }; 
 
   return ( 
     <div className="min-h-screen bg-[#0f0f1a] text-white px-4 py-8"> 
       <div className="max-w-6xl mx-auto"> 
         {toast && ( 
           <div className={`fixed top-4 right-4 z-50 rounded-xl px-6 py-3 font-bold text-sm shadow-xl ${toast.ok ? "bg-emerald-500 text-black" : "bg-red-500 text-white"}`}> 
             {toast.msg} 
           </div> 
         )} 
 
         <div className="flex items-center justify-between mb-8"> 
           <div> 
             <Link href="/admin" className="text-zinc-500 text-sm hover:text-white">← Back to Dashboard</Link> 
             <h1 className="text-3xl font-black text-white mt-1">User Management</h1> 
             <p className="text-zinc-400 text-sm mt-1">{users.length} total users</p> 
           </div> 
           <button onClick={() => setShowAddUser(true)} className="rounded-xl bg-[#7c3aed] px-6 py-3 font-black text-white hover:bg-[#6d28d9]"> 
             + Add User 
           </button> 
         </div> 
 
         {/* Add User Modal */} 
         {showAddUser && ( 
           <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70"> 
             <div className="bg-[#1a1a2e] rounded-2xl p-8 w-full max-w-md border border-white/10"> 
               <h2 className="text-xl font-black text-white mb-6">Create New User</h2> 
               <div className="space-y-4"> 
                 <input value={newUser.email} onChange={e => setNewUser(p => ({ ...p, email: e.target.value }))} placeholder="Email address" className="w-full rounded-xl bg-white/5 border border-white/10 px-4 py-3 text-white placeholder-zinc-500 text-sm" /> 
                 <input value={newUser.display_name} onChange={e => setNewUser(p => ({ ...p, display_name: e.target.value }))} placeholder="Display name" className="w-full rounded-xl bg-white/5 border border-white/10 px-4 py-3 text-white placeholder-zinc-500 text-sm" /> 
                 <input value={newUser.password} onChange={e => setNewUser(p => ({ ...p, password: e.target.value }))} placeholder="Password" type="password" className="w-full rounded-xl bg-white/5 border border-white/10 px-4 py-3 text-white placeholder-zinc-500 text-sm" /> 
               </div> 
               <div className="flex gap-3 mt-6"> 
                 <button onClick={handleAddUser} disabled={busy} className="flex-1 rounded-xl bg-emerald-500 py-3 font-black text-black hover:bg-emerald-400 disabled:opacity-50">{busy ? "Creating..." : "Create User"}</button> 
                 <button onClick={() => setShowAddUser(false)} className="flex-1 rounded-xl bg-white/5 py-3 font-bold text-white hover:bg-white/10">Cancel</button> 
               </div> 
             </div> 
           </div> 
         )} 
 
         {/* Search */} 
         <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by name, referral code or ID..." className="w-full rounded-xl bg-white/5 border border-white/10 px-5 py-3 text-white placeholder-zinc-500 mb-6" /> 
 
         {/* Stats Row */} 
         <div className="grid grid-cols-3 gap-4 mb-6"> 
           <div className="rounded-2xl bg-violet-900/30 border border-violet-500/20 p-4 text-center"> 
             <div className="text-2xl font-black text-violet-300">{users.length}</div> 
             <div className="text-xs font-bold text-violet-400 uppercase">Total</div> 
           </div> 
           <div className="rounded-2xl bg-emerald-900/30 border border-emerald-500/20 p-4 text-center"> 
             <div className="text-2xl font-black text-emerald-300">{users.filter(u => isOnline(u.last_seen)).length}</div> 
             <div className="text-xs font-bold text-emerald-400 uppercase">Online Now</div> 
           </div> 
           <div className="rounded-2xl bg-zinc-800/50 border border-zinc-600/20 p-4 text-center"> 
             <div className="text-2xl font-black text-zinc-300">{users.filter(u => !isOnline(u.last_seen)).length}</div> 
             <div className="text-xs font-bold text-zinc-400 uppercase">Offline</div> 
           </div> 
         </div> 
 
         {/* User Table */} 
         {loading ? <div className="text-zinc-500 text-center py-20">Loading users...</div> : ( 
           <div className="space-y-3"> 
             {filtered.map(user => ( 
               <div key={user.id} className="rounded-2xl bg-white/5 border border-white/10 p-4 flex flex-col md:flex-row md:items-center justify-between gap-4"> 
                 <div className="flex items-center gap-3"> 
                   <div className={`w-3 h-3 rounded-full ${isOnline(user.last_seen) ? "bg-emerald-400" : "bg-zinc-600"}`} /> 
                   <div> 
                     <div className="font-black text-white">{user.display_name || "No name"}</div> 
                     <div className="text-xs text-zinc-500">{user.id.substring(0, 16)}... • Code: {user.referral_code || "—"}</div> 
                     <div className="text-xs text-emerald-400 font-bold">₦{user.wallet_balance.toLocaleString()} wallet</div> 
                   </div> 
                 </div> 
                 <div className="flex flex-wrap gap-2"> 
                   <button onClick={() => { setSelectedUser(user); setActionType("add_wallet"); }} className="rounded-lg bg-emerald-500/20 border border-emerald-500/30 px-3 py-1.5 text-xs font-bold text-emerald-300 hover:bg-emerald-500/30">+ Wallet</button> 
                   <button onClick={() => { setSelectedUser(user); setActionType("remove_wallet"); }} className="rounded-lg bg-red-500/20 border border-red-500/30 px-3 py-1.5 text-xs font-bold text-red-300 hover:bg-red-500/30">- Wallet</button> 
                   <button onClick={() => { setSelectedUser(user); setActionType("add_xp"); }} className="rounded-lg bg-blue-500/20 border border-blue-500/30 px-3 py-1.5 text-xs font-bold text-blue-300 hover:bg-blue-500/30">+ XP</button> 
                   <button onClick={() => { setSelectedUser(user); setActionType("add_coins"); }} className="rounded-lg bg-amber-500/20 border border-amber-500/30 px-3 py-1.5 text-xs font-bold text-amber-300 hover:bg-amber-500/30">+ Coins</button> 
                   <button onClick={() => { setSelectedUser(user); setActionType("reset_password"); }} className="rounded-lg bg-purple-500/20 border border-purple-500/30 px-3 py-1.5 text-xs font-bold text-purple-300 hover:bg-purple-500/30">Reset PW</button> 
                   <button onClick={() => { setSelectedUser(user); setActionType("delete_user"); }} className="rounded-lg bg-red-900/30 border border-red-700/30 px-3 py-1.5 text-xs font-bold text-red-400 hover:bg-red-900/50">Delete</button> 
                 </div> 
               </div> 
             ))} 
           </div> 
         )} 
 
         {/* Action Modal */} 
         {selectedUser && actionType && actionType !== "delete_user" && ( 
           <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70"> 
             <div className="bg-[#1a1a2e] rounded-2xl p-8 w-full max-w-md border border-white/10"> 
               <h2 className="text-xl font-black text-white mb-2">{actionType.replace("_", " ").toUpperCase()}</h2> 
               <p className="text-zinc-400 text-sm mb-6">User: <span className="text-white font-bold">{selectedUser.display_name || selectedUser.id}</span></p> 
               <input value={actionAmount} onChange={e => setActionAmount(e.target.value)} placeholder={actionType === "reset_password" ? "New password" : "Amount"} type={actionType === "reset_password" ? "text" : "number"} className="w-full rounded-xl bg-white/5 border border-white/10 px-4 py-3 text-white placeholder-zinc-500 text-sm mb-4" /> 
               <div className="flex gap-3"> 
                 <button onClick={handleAction} disabled={busy} className="flex-1 rounded-xl bg-[#7c3aed] py-3 font-black text-white hover:bg-[#6d28d9] disabled:opacity-50">{busy ? "Processing..." : "Confirm"}</button> 
                 <button onClick={() => { setSelectedUser(null); setActionType(""); }} className="flex-1 rounded-xl bg-white/5 py-3 font-bold text-white">Cancel</button> 
               </div> 
             </div> 
           </div> 
         )} 
 
         {/* Delete Confirm Modal */} 
         {selectedUser && actionType === "delete_user" && ( 
           <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70"> 
             <div className="bg-[#1a1a2e] rounded-2xl p-8 w-full max-w-md border border-red-500/20"> 
               <h2 className="text-xl font-black text-red-400 mb-2">Delete User?</h2> 
               <p className="text-zinc-400 text-sm mb-6">This will remove <span className="text-white font-bold">{selectedUser.display_name || selectedUser.id}</span> from profiles. This cannot be undone.</p> 
               <div className="flex gap-3"> 
                 <button onClick={handleAction} disabled={busy} className="flex-1 rounded-xl bg-red-500 py-3 font-black text-white hover:bg-red-600 disabled:opacity-50">{busy ? "Deleting..." : "Yes, Delete"}</button> 
                 <button onClick={() => { setSelectedUser(null); setActionType(""); }} className="flex-1 rounded-xl bg-white/5 py-3 font-bold text-white">Cancel</button> 
               </div> 
             </div> 
           </div> 
         )} 
       </div> 
     </div> 
   ); 
 }