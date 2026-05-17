"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { getSupabaseClient } from "@/lib/supabase";
import Link from "next/link";

type User = {
  id: string;
  display_name: string | null;
  email: string | null;
  phone: string | null;
  referral_code: string | null;
  created_at: string;
  wallet_balance: number;
  coins: number;
  last_seen: string | null;
  status: string | null;
  xp: number;
};

type UserProfile = User & {
  battles_played: number;
  battles_won: number;
  battles_lost: number;
  total_deposits: number;
  total_withdrawals: number;
  referral_count: number;
  practice_sessions: number;
};

const PAGE_SIZE = 20;

export default function AdminUsersPage() {
  const router = useRouter();
  const supabase = getSupabaseClient();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(0);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [profileData, setProfileData] = useState<UserProfile | null>(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [actionType, setActionType] = useState<string>("");
  const [actionAmount, setActionAmount] = useState("");
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);
  const [newUser, setNewUser] = useState({ email: "", password: "", display_name: "" });
  const [showAddUser, setShowAddUser] = useState(false);

  const showToast = (msg: string, ok: boolean) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3500);
  };

  const fetchUsers = async () => {
    setLoading(true);
    const { data: merged, error: profileError } = await supabase
      .from("admin_users_view")
      .select("*")
      .order("created_at", { ascending: false });

    if (profileError) {
      console.error("Fetch users error:", profileError);
      showToast("Error: " + profileError.message, false);
      setLoading(false);
      return;
    }

    setUsers(merged || []);
    setLoading(false);
  };

  const fetchUserProfile = async (user: User) => {
    setProfileLoading(true);
    setProfileData(null);

    const { data: battles } = await supabase
      .from("battle_rooms")
      .select("id, winner_id")
      .or(`host_id.eq.${user.id},guest_id.eq.${user.id}`);

    const battlesPlayed = battles?.length || 0;
    const battlesWon = battles?.filter(b => b.winner_id === user.id).length || 0;

    const { data: deposits } = await supabase
      .from("transactions")
      .select("amount")
      .eq("user_id", user.id)
      .eq("type", "deposit");

    const { data: withdrawals } = await supabase
      .from("transactions")
      .select("amount")
      .eq("user_id", user.id)
      .eq("type", "withdrawal");

    const { data: referrals } = await supabase
      .from("referrals")
      .select("id")
      .eq("referrer_id", user.id);

    const { data: practice } = await supabase
      .from("practice_sessions")
      .select("id")
      .eq("user_id", user.id);

    const totalDeposits = (deposits || []).reduce((sum, t) => sum + (t.amount || 0), 0);
    const totalWithdrawals = (withdrawals || []).reduce((sum, t) => sum + (t.amount || 0), 0);

    setProfileData({
      ...user,
      battles_played: battlesPlayed,
      battles_won: battlesWon,
      battles_lost: battlesPlayed - battlesWon,
      total_deposits: totalDeposits,
      total_withdrawals: totalWithdrawals,
      referral_count: referrals?.length || 0,
      practice_sessions: practice?.length || 0,
    });
    setProfileLoading(false);
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

  const isOnline = (last_seen: string | null) => {
    if (!last_seen) return false;
    return Date.now() - new Date(last_seen).getTime() < 5 * 60 * 1000;
  };

  const getStatusColor = (status: string | null) => {
    if (status === "suspended") return "text-yellow-400 bg-yellow-900/30 border-yellow-500/30";
    if (status === "banned") return "text-red-400 bg-red-900/30 border-red-500/30";
    return "text-emerald-400 bg-emerald-900/30 border-emerald-500/30";
  };

  const getStatusLabel = (status: string | null) => {
    if (status === "suspended") return "Suspended";
    if (status === "banned") return "Banned";
    return "Active";
  };

  const filtered = (users || []).filter(u => {
    if (!u || !u.id) return false;
    const matchSearch =
      (u.display_name || "").toLowerCase().includes(search.toLowerCase()) ||
      (u.email || "").toLowerCase().includes(search.toLowerCase()) ||
      (u.referral_code || "").toLowerCase().includes(search.toLowerCase()) ||
      String(u.id).includes(search);
    const matchStatus =
      statusFilter === "all" ||
      (statusFilter === "online" && isOnline(u.last_seen)) ||
      (statusFilter === "active" && (!u.status || u.status === "active")) ||
      (statusFilter === "suspended" && u.status === "suspended") ||
      (statusFilter === "banned" && u.status === "banned");
    return matchSearch && matchStatus;
  });

  const paginated = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);

  const handleAction = async () => {
    if (!selectedUser) return;
    setBusy(true);

    try {
      if (actionType === "reset_password") {
        const res = await fetch("/api/admin/reset-password", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId: selectedUser.id, newPassword: actionAmount }),
        });
        const data = await res.json();
        showToast(data.success ? "Password reset!" : "Failed: " + data.error, data.success);
      } else {
        const res = await fetch("/api/admin/user-action", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userId: selectedUser.id,
            actionType,
            amount: actionAmount
          }),
        });
        const data = await res.json();
        if (data.success) {
          showToast(data.message || "Action completed", true);
          if (actionType === "delete_user") {
            setUsers(prev => prev.filter(u => u.id !== selectedUser.id));
            setSelectedUser(null);
          }
        } else {
          showToast("Error: " + data.error, false);
        }
      }

      fetchUsers();
      setActionType("");
      setActionAmount("");
      setShowProfile(false);
    } catch (err) {
      console.error("Action error:", err);
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

  const openProfile = (user: User) => {
    setSelectedUser(user);
    setShowProfile(true);
    fetchUserProfile(user);
  };

  const needsAmount = ["add_wallet", "remove_wallet", "add_xp", "remove_xp", "add_coins", "remove_coins", "reset_password"].includes(actionType);
  const isDestructive = ["delete_user", "ban_user", "suspend_user"].includes(actionType);

  return (
    <div className="min-h-screen bg-[#0f0f1a] text-white px-4 py-8">
      <div className="max-w-6xl mx-auto">

        {toast && (
          <div className={`fixed top-4 right-4 z-50 rounded-xl px-6 py-3 font-bold text-sm shadow-xl transition-all ${toast.ok ? "bg-emerald-500 text-black" : "bg-red-500 text-white"}`}>
            {toast.msg}
          </div>
        )}

        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <Link href="/admin" className="text-zinc-500 text-sm hover:text-white transition-colors">← Back to Dashboard</Link>
            <h1 className="text-3xl font-black text-white mt-1">User Management</h1>
            <p className="text-zinc-400 text-sm">{users.length} total users</p>
          </div>
          <button onClick={() => setShowAddUser(true)} className="rounded-xl bg-[#7c3aed] hover:bg-[#6d28d9] px-5 py-3 font-black text-white text-sm transition-all shadow-lg shadow-purple-500/20">+ Add User</button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="rounded-2xl bg-violet-900/30 border border-violet-500/20 p-4 text-center">
            <div className="text-2xl font-black text-violet-300">{users.length}</div>
            <div className="text-xs font-bold text-violet-400 uppercase tracking-wider">Total Users</div>
          </div>
          <div className="rounded-2xl bg-emerald-900/30 border border-emerald-500/20 p-4 text-center">
            <div className="text-2xl font-black text-emerald-300">{users.filter(u => isOnline(u.last_seen)).length}</div>
            <div className="text-xs font-bold text-emerald-400 uppercase tracking-wider">Online Now</div>
          </div>
          <div className="rounded-2xl bg-yellow-900/30 border border-yellow-500/20 p-4 text-center">
            <div className="text-2xl font-black text-yellow-300">{users.filter(u => u.status === "suspended").length}</div>
            <div className="text-xs font-bold text-yellow-400 uppercase tracking-wider">Suspended</div>
          </div>
          <div className="rounded-2xl bg-red-900/30 border border-red-500/20 p-4 text-center">
            <div className="text-2xl font-black text-red-300">{users.filter(u => u.status === "banned").length}</div>
            <div className="text-xs font-bold text-red-400 uppercase tracking-wider">Banned</div>
          </div>
        </div>

        {/* Search + Filter */}
        <div className="flex flex-col md:flex-row gap-3 mb-6">
          <input
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(0); }}
            placeholder="Search by name, email, referral code or ID..."
            className="flex-1 rounded-xl bg-white/5 border border-white/10 px-5 py-3 text-white placeholder-zinc-500 text-sm focus:border-violet-500 outline-none transition-all"
          />
          <select
            value={statusFilter}
            onChange={e => { setStatusFilter(e.target.value); setPage(0); }}
            className="rounded-xl bg-white/5 border border-white/10 px-4 py-3 text-white text-sm focus:border-violet-500 outline-none cursor-pointer transition-all"
          >
            <option value="all">All Users</option>
            <option value="online">Online Now</option>
            <option value="active">Active</option>
            <option value="suspended">Suspended</option>
            <option value="banned">Banned</option>
          </select>
        </div>

        {/* User Table */}
        {loading ? (
          <div className="text-zinc-500 text-center py-20 font-bold">Loading users...</div>
        ) : (
          <>
            <div className="space-y-3">
              {paginated.map(user => (
                <div key={user.id} className="rounded-2xl bg-white/5 border border-white/10 p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:border-white/20 transition-all">
                  <div className="flex items-start gap-3">
                    <div className={`w-3 h-3 rounded-full mt-1.5 flex-shrink-0 ${isOnline(user.last_seen) ? "bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.5)]" : "bg-zinc-600"}`} />
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <div className="font-black text-white text-base">{user.display_name || "No display name"}</div>
                        <span className={`text-[10px] font-black px-2 py-0.5 rounded-full border uppercase tracking-wider ${getStatusColor(user.status)}`}>
                          {getStatusLabel(user.status)}
                        </span>
                      </div>
                      {user.email && (
                        <div className="text-xs text-blue-400 font-bold mt-0.5">{user.email}</div>
                      )}
                      <div className="text-xs text-zinc-500 mt-0.5 font-medium">
                        ID: {user.id.substring(0, 16)}... • Code: {user.referral_code || "—"}
                      </div>
                      <div className="flex gap-3 mt-1.5 flex-wrap">
                        <span className="text-xs text-emerald-400 font-black">₦{user.wallet_balance.toLocaleString()}</span>
                        <span className="text-xs text-amber-400 font-black">{user.coins.toLocaleString()} coins</span>
                        <span className="text-xs text-violet-400 font-black">{user.xp.toLocaleString()} XP</span>
                      </div>
                      {user.last_seen && (
                        <div className="text-[10px] text-zinc-600 mt-1 font-bold uppercase">
                          Last seen: {user.last_seen ? new Date(user.last_seen).toLocaleString() : 'Never'}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button onClick={() => openProfile(user)} className="rounded-lg bg-violet-500/20 border border-violet-500/30 px-3 py-1.5 text-xs font-bold text-violet-300 hover:bg-violet-500/30 transition-all">👤 Profile</button>
                    <button onClick={() => { setSelectedUser(user); setActionType("add_wallet"); }} className="rounded-lg bg-emerald-500/20 border border-emerald-500/30 px-3 py-1.5 text-xs font-bold text-emerald-300 hover:bg-emerald-500/30 transition-all">+ Wallet</button>
                    <button onClick={() => { setSelectedUser(user); setActionType("remove_wallet"); }} className="rounded-lg bg-red-500/20 border border-red-500/30 px-3 py-1.5 text-xs font-bold text-red-300 hover:bg-red-500/30 transition-all">- Wallet</button>
                    <button onClick={() => { setSelectedUser(user); setActionType("add_coins"); }} className="rounded-lg bg-amber-500/20 border border-amber-500/30 px-3 py-1.5 text-xs font-bold text-amber-300 hover:bg-amber-500/30 transition-all">+ Coins</button>
                    <button onClick={() => { setSelectedUser(user); setActionType("reset_password"); }} className="rounded-lg bg-purple-500/20 border border-purple-500/30 px-3 py-1.5 text-xs font-bold text-purple-300 hover:bg-purple-500/30 transition-all">Reset PW</button>
                    {(!user.status || user.status === "active") && (
                      <button onClick={() => { setSelectedUser(user); setActionType("suspend_user"); }} className="rounded-lg bg-yellow-900/30 border border-yellow-700/30 px-3 py-1.5 text-xs font-bold text-yellow-400 hover:bg-yellow-900/50 transition-all">Suspend</button>
                    )}
                    {user.status !== "banned" && (
                      <button onClick={() => { setSelectedUser(user); setActionType("ban_user"); }} className="rounded-lg bg-red-900/30 border border-red-700/30 px-3 py-1.5 text-xs font-bold text-red-400 hover:bg-red-900/50 transition-all">Ban</button>
                    )}
                    {(user.status === "suspended" || user.status === "banned") && (
                      <button onClick={() => { setSelectedUser(user); setActionType("activate_user"); }} className="rounded-lg bg-emerald-900/30 border border-emerald-700/30 px-3 py-1.5 text-xs font-bold text-emerald-400 hover:bg-emerald-900/50 transition-all">Activate</button>
                    )}
                    <button onClick={() => { setSelectedUser(user); setActionType("delete_user"); }} className="rounded-lg bg-red-900/30 border border-red-700/30 px-3 py-1.5 text-xs font-bold text-red-400 hover:bg-red-900/50 transition-all">Delete</button>
                  </div>
                </div>
              ))}
              {paginated.length === 0 && (
                <div className="text-zinc-500 text-center py-12 font-bold">
                  No users found. 
                  {users.length > 0 && (
                    <div className="mt-2">
                      <span className="text-zinc-400">Total users: {users.length}. </span>
                      <button 
                        onClick={() => { setSearch(""); setStatusFilter("all"); setPage(0); }}
                        className="text-violet-400 hover:underline"
                      >
                        Reset filters
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-3 mt-8">
                <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0} className="rounded-xl bg-white/5 border border-white/10 px-4 py-2 text-sm font-bold disabled:opacity-30 hover:bg-white/10 transition-all">← Prev</button>
                <span className="text-zinc-400 text-sm font-black">Page {page + 1} of {totalPages}</span>
                <button onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1} className="rounded-xl bg-white/5 border border-white/10 px-4 py-2 text-sm font-bold disabled:opacity-30 hover:bg-white/10 transition-all">Next →</button>
              </div>
            )}
          </>
        )}

        {/* Full User Profile Modal */}
        {showProfile && selectedUser && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
            <div className="bg-[#1a1a2e] rounded-2xl w-full max-w-2xl border border-white/10 max-h-[90vh] overflow-y-auto shadow-2xl">
              <div className="p-8">
                <div className="flex justify-between items-start mb-6">
                  <div>
                    <h2 className="text-2xl font-black text-white">{selectedUser.display_name || "User Profile"}</h2>
                    <p className="text-zinc-500 text-[10px] font-black uppercase tracking-widest">User ID: {selectedUser.id}</p>
                  </div>
                  <button onClick={() => setShowProfile(false)} className="text-zinc-400 hover:text-white transition-colors">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                  </button>
                </div>

                {profileLoading ? (
                  <div className="text-center py-20 text-zinc-500 font-black uppercase tracking-widest">Loading profile data...</div>
                ) : profileData ? (
                  <div className="space-y-8">
                    {/* Stats Grid */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="bg-white/5 rounded-xl p-4 border border-white/10 text-center">
                        <div className="text-[10px] font-black text-zinc-500 uppercase mb-1 tracking-wider">Battles</div>
                        <div className="text-xl font-black text-white">{profileData.battles_played}</div>
                      </div>
                      <div className="bg-emerald-500/10 rounded-xl p-4 border border-emerald-500/20 text-center">
                        <div className="text-[10px] font-black text-emerald-500 uppercase mb-1 tracking-wider">Won</div>
                        <div className="text-xl font-black text-emerald-400">{profileData.battles_won}</div>
                      </div>
                      <div className="bg-red-500/10 rounded-xl p-4 border border-red-500/20 text-center">
                        <div className="text-[10px] font-black text-red-500 uppercase mb-1 tracking-wider">Lost</div>
                        <div className="text-xl font-black text-red-400">{profileData.battles_lost}</div>
                      </div>
                      <div className="bg-blue-500/10 rounded-xl p-4 border border-blue-500/20 text-center">
                        <div className="text-[10px] font-black text-blue-500 uppercase mb-1 tracking-wider">Win Rate</div>
                        <div className="text-xl font-black text-blue-400">
                          {profileData.battles_played > 0 ? Math.round((profileData.battles_won / profileData.battles_played) * 100) : 0}%
                        </div>
                      </div>
                    </div>

                    {/* Info Sections */}
                    <div className="grid md:grid-cols-2 gap-8">
                      <div>
                        <h3 className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                          <span className="w-2 h-2 bg-violet-500 rounded-full" />
                          Financial Summary
                        </h3>
                        <div className="space-y-3">
                          <div className="flex justify-between items-center py-2 border-b border-white/5">
                            <span className="text-zinc-400 text-sm font-bold">Wallet Balance</span>
                            <span className="text-white font-black">₦{profileData.wallet_balance.toLocaleString()}</span>
                          </div>
                          <div className="flex justify-between items-center py-2 border-b border-white/5">
                            <span className="text-zinc-400 text-sm font-bold">Arena Coins</span>
                            <span className="text-amber-400 font-black">{profileData.coins.toLocaleString()}</span>
                          </div>
                          <div className="flex justify-between items-center py-2 border-b border-white/5">
                            <span className="text-zinc-400 text-sm font-bold">Total Deposits</span>
                            <span className="text-emerald-400 font-black">₦{(profileData.total_deposits || 0).toLocaleString()}</span>
                          </div>
                          <div className="flex justify-between items-center py-2 border-b border-white/5">
                            <span className="text-zinc-400 text-sm font-bold">Total Withdrawals</span>
                            <span className="text-red-400 font-black">₦{(profileData.total_withdrawals || 0).toLocaleString()}</span>
                          </div>
                        </div>
                      </div>

                      <div>
                        <h3 className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                          <span className="w-2 h-2 bg-violet-500 rounded-full" />
                          Account Details
                        </h3>
                        <div className="space-y-3">
                          <div className="flex justify-between items-center py-2 border-b border-white/5">
                            <span className="text-zinc-400 text-sm font-bold">Email</span>
                            <span className="text-white font-black">{profileData.email || "—"}</span>
                          </div>
                          <div className="flex justify-between items-center py-2 border-b border-white/5">
                            <span className="text-zinc-400 text-sm font-bold">Phone</span>
                            <span className="text-white font-black">{profileData.phone || "—"}</span>
                          </div>
                          <div className="flex justify-between items-center py-2 border-b border-white/5">
                            <span className="text-zinc-400 text-sm font-bold">Referral Code</span>
                            <span className="text-violet-400 font-black">{profileData.referral_code || "—"}</span>
                          </div>
                          <div className="flex justify-between items-center py-2 border-b border-white/5">
                            <span className="text-zinc-400 text-sm font-bold">Referrals</span>
                            <span className="text-white font-black">{profileData.referral_count} users</span>
                          </div>
                          <div className="flex justify-between items-center py-2 border-b border-white/5">
                            <span className="text-zinc-400 text-sm font-bold">Practice Sessions</span>
                            <span className="text-white font-black">{profileData.practice_sessions}</span>
                          </div>
                          <div className="flex justify-between items-center py-2 border-b border-white/5">
                            <span className="text-zinc-400 text-sm font-bold">Joined</span>
                            <span className="text-white text-sm font-black">{new Date(profileData.created_at).toLocaleDateString()}</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="pt-4 flex flex-wrap gap-3">
                      <button onClick={() => { setActionType("add_wallet"); setActionAmount(""); }} className="rounded-xl bg-emerald-500/20 border border-emerald-500/30 px-6 py-3 text-sm font-black text-emerald-400 hover:bg-emerald-500/30 transition-all">Add Funds</button>
                      <button onClick={() => { setActionType("add_coins"); setActionAmount(""); }} className="rounded-xl bg-amber-500/20 border border-amber-500/30 px-6 py-3 text-sm font-black text-amber-400 hover:bg-amber-500/30 transition-all">Add Coins</button>
                      <button onClick={() => { setActionType("reset_password"); setActionAmount(""); }} className="rounded-xl bg-purple-500/20 border border-purple-500/30 px-6 py-3 text-sm font-black text-purple-400 hover:bg-purple-500/30 transition-all">Reset Password</button>
                    </div>
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        )}

        {/* Action Modals */}
        {selectedUser && actionType && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
            <div className={`bg-[#1a1a2e] rounded-2xl p-8 w-full max-w-md border ${isDestructive ? "border-red-500/30" : "border-white/10"} shadow-2xl`}>
              <h2 className={`text-xl font-black mb-2 ${isDestructive ? "text-red-400" : "text-white"}`}>
                {actionType.split("_").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ")}
              </h2>
              <p className="text-zinc-400 text-sm mb-6 font-medium">
                {actionType === "delete_user" ? "Are you sure you want to delete " : "Perform action on "}
                <span className="text-white font-black">{selectedUser.display_name || selectedUser.id}</span>?
              </p>

              {needsAmount && (
                <input
                  autoFocus
                  value={actionAmount}
                  onChange={e => setActionAmount(e.target.value)}
                  placeholder={actionType === "reset_password" ? "Enter new password" : "Enter amount"}
                  type={actionType === "reset_password" ? "text" : "number"}
                  className="w-full rounded-xl bg-white/5 border border-white/10 px-4 py-3 text-white placeholder-zinc-500 text-sm mb-6 focus:border-violet-500 outline-none transition-all"
                />
              )}

              <div className="flex gap-3">
                <button
                  onClick={handleAction}
                  disabled={busy || (needsAmount && !actionAmount)}
                  className={`flex-1 rounded-xl py-3 font-black text-white text-sm disabled:opacity-50 transition-all ${isDestructive ? "bg-red-600 hover:bg-red-500" : "bg-violet-600 hover:bg-violet-500"}`}
                >
                  {busy ? "Processing..." : "Confirm Action"}
                </button>
                <button
                  onClick={() => { setActionType(""); setActionAmount(""); }}
                  className="flex-1 rounded-xl bg-white/5 py-3 font-black text-white text-sm hover:bg-white/10 transition-all"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Add User Modal */}
        {showAddUser && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
            <div className="bg-[#1a1a2e] rounded-2xl p-8 w-full max-w-md border border-white/10 shadow-2xl">
              <h2 className="text-xl font-black text-white mb-6">Create New User</h2>
              <div className="space-y-4">
                <div>
                  <label className="text-[10px] font-black text-zinc-500 uppercase mb-1 block ml-1 tracking-wider">Display Name</label>
                  <input value={newUser.display_name} onChange={e => setNewUser(p => ({ ...p, display_name: e.target.value }))} placeholder="John Doe" className="w-full rounded-xl bg-white/5 border border-white/10 px-4 py-3 text-white placeholder-zinc-500 text-sm focus:border-violet-500 outline-none transition-all" />
                </div>
                <div>
                  <label className="text-[10px] font-black text-zinc-500 uppercase mb-1 block ml-1 tracking-wider">Email Address</label>
                  <input value={newUser.email} onChange={e => setNewUser(p => ({ ...p, email: e.target.value }))} placeholder="user@example.com" className="w-full rounded-xl bg-white/5 border border-white/10 px-4 py-3 text-white placeholder-zinc-500 text-sm focus:border-violet-500 outline-none transition-all" />
                </div>
                <div>
                  <label className="text-[10px] font-black text-zinc-500 uppercase mb-1 block ml-1 tracking-wider">Initial Password</label>
                  <input value={newUser.password} onChange={e => setNewUser(p => ({ ...p, password: e.target.value }))} placeholder="••••••••" type="password" className="w-full rounded-xl bg-white/5 border border-white/10 px-4 py-3 text-white placeholder-zinc-500 text-sm focus:border-violet-500 outline-none transition-all" />
                </div>
              </div>
              <div className="flex gap-3 mt-8">
                <button onClick={handleAddUser} disabled={busy || !newUser.email || !newUser.password} className="flex-1 rounded-xl bg-emerald-500 py-3 font-black text-black text-sm hover:bg-emerald-400 disabled:opacity-50 transition-all">
                  {busy ? "Creating..." : "Create User"}
                </button>
                <button onClick={() => setShowAddUser(false)} className="flex-1 rounded-xl bg-white/5 py-3 font-black text-white text-sm hover:bg-white/10 transition-all">Cancel</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
