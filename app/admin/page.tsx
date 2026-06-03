"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { PageShell } from "@/app/components/PageShell";

export default function AdminDashboard() {
  const router = useRouter();

  const [adminData, setAdminData] = useState<{ 
    role: string | null; 
    id: string | null; 
    full_name: string | null;
    last_login: string | null;
  }>({ 
    role: null, 
    id: null, 
    full_name: null,
    last_login: null 
  });
  const [stats, setStats] = useState({ 
    admins: 0, 
    withdrawals: 0, 
    questions: 0, 
    leagues: 0,
    totalRevenue: 0,
    totalPayouts: 0,
    totalUsers: 0, 
    activeUsers: 0, 
    onlineNow: 0, 
  });
  const [loading, setLoading] = useState(true);

  const [activeTab, setActiveTab] = useState("overview");
  const [featureFlags, setFeatureFlags] = useState<Record<string, boolean>>({});
  const [flagsLoading, setFlagsLoading] = useState(false);
  const [flagSaving, setFlagSaving] = useState<string | null>(null);
  const [flagMsg, setFlagMsg] = useState<string | null>(null);

  useEffect(() => {
    const loadFlags = async () => {
      setFlagsLoading(true);
      try {
        const res = await fetch("/api/admin/feature-flags");
        const data = await res.json();
        if (data.flags) setFeatureFlags(data.flags);
      } catch (e) {
        console.error("Failed to load flags", e);
      }
      setFlagsLoading(false);
    };
    loadFlags();
  }, []);

  const toggleFlag = async (key: string, current: boolean) => {
    setFlagSaving(key);
    setFlagMsg(null);
    try {
      const res = await fetch("/api/admin/feature-flags", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key, value: !current }),
      });
      const data = await res.json();
      if (data.success) {
        setFeatureFlags(prev => ({ ...prev, [key]: !current }));
        setFlagMsg(`${key} is now ${!current ? "LIVE" : "hidden"}`);
        setTimeout(() => setFlagMsg(null), 3000);
      }
    } catch (e) {
      console.error("Failed to toggle flag", e);
    }
    setFlagSaving(null);
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [meRes, statsRes] = await Promise.all([
          fetch("/api/admin/me"),
          fetch("/api/admin/stats")
        ]);
        
        const meData = await meRes.json();
        const statsData = await statsRes.json();

        if (meData.success) {
          setAdminData({ 
            role: meData.admin.role, 
            id: meData.admin.id, 
            full_name: meData.admin.full_name,
            last_login: meData.admin.last_login
          });
        } else {
          router.push("/admin/login");
          return;
        }

        if (statsData.success) {
          setStats(statsData.stats);
        }

        const supabase = (await import("@/lib/supabase")).getSupabaseClient(); 
        
        const { count: totalUsers } = await supabase 
          .from("profiles") 
          .select("*", { count: "exact", head: true }); 
        
        const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString(); 
        const { count: onlineNow } = await supabase 
          .from("user_presence") 
          .select("*", { count: "exact", head: true }) 
          .gte("last_seen", fiveMinutesAgo); 
        
        const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(); 
        const { count: activeUsers } = await supabase 
          .from("user_presence") 
          .select("*", { count: "exact", head: true }) 
          .gte("last_seen", thirtyDaysAgo); 
        
        setStats(prev => ({ 
          ...prev, 
          totalUsers: totalUsers || 0, 
          activeUsers: activeUsers || 0, 
          onlineNow: onlineNow || 0, 
        })); 
      } catch (err) {
        console.error("Failed to fetch dashboard data:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [router]);

  const handleLogout = async () => {
    try {
      const res = await fetch("/api/admin/logout", { method: "POST" });
      if (res.ok) {
        router.push("/admin/login");
        router.refresh();
      }
    } catch (err) {
      console.error("Logout failed:", err);
    }
  };

  const links = [
    { 
      title: "Import Questions", 
      href: "/admin/import", 
      icon: "📥", 
      desc: "Upload JSON questions" 
    },
    { 
      title: "Leagues", 
      href: "/admin/leagues", 
      icon: "🏆", 
      desc: "Manage multi-player prize leagues" 
    },
    { 
      title: "Withdrawals", 
      href: "/admin/withdrawals", 
      icon: "💸", 
      desc: "Process player payout requests" 
    },
    { 
      title: "Question Bank", 
      href: "/admin/questions", 
      icon: "📚", 
      desc: "View and manage quiz questions" 
    },
    ...(adminData.role === "super_admin" ? [
      { 
        title: "Manage Admins", 
        href: "/admin/manage-admins", 
        icon: "👥", 
        desc: "Create and manage admin accounts" 
      },
      { 
        title: "Activity Logs", 
        href: "/admin/activity-logs", 
        icon: "📜", 
        desc: "View system audit trail" 
      },
      { 
        title: "User Management", 
        href: "/admin/users", 
        icon: "👥", 
        desc: "Add, edit, remove, suspend users and manage wallets" 
      }, 
      { 
        title: "Platform Settings", 
        href: "/admin/settings", 
        icon: "⚙️", 
        desc: "Edit battle stakes, referral rates, platform config" 
      }, 
    ] : []),
  ];

  if (loading) {
    return (
      <PageShell overlay="rgba(15,15,26,0.85)">
        <div className="flex min-h-screen flex-col items-center justify-center space-y-4">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-[#7c3aed] border-t-transparent"></div>
          <p className="text-sm font-bold text-zinc-500 uppercase tracking-widest">Loading Dashboard</p>
        </div>
      </PageShell>
    );
  }

  const revenueFormatted = stats.totalRevenue ? stats.totalRevenue.toLocaleString() : "0";
  const payoutsFormatted = stats.totalPayouts ? stats.totalPayouts.toLocaleString() : "0";

  return (
    <PageShell overlay="rgba(15,15,26,0.85)">
      <div className="mx-auto max-w-6xl px-6 py-12">
        {/* Header Section */}
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <h1 className="text-3xl font-black text-white tracking-tight sm:text-4xl">
              Welcome back, {adminData.full_name || 'Admin'}
            </h1>
            <div className="flex flex-wrap items-center gap-3">
              {adminData.role === "super_admin" ? (
                <span className="rounded-full bg-purple-500/10 px-3 py-1 text-[10px] font-black uppercase tracking-wider text-purple-400 border border-purple-500/20">
                  Super Admin
                </span>
              ) : (
                <span className="rounded-full bg-blue-500/10 px-3 py-1 text-[10px] font-black uppercase tracking-wider text-blue-400 border border-blue-500/20">
                  Admin
                </span>
              )}
              {adminData.last_login && (
                <span className="text-xs text-zinc-500">
                  Last login: {new Date(adminData.last_login).toLocaleString()}
                </span>
              )}
            </div>
          </div>
          
          <button
            onClick={handleLogout}
            className="group flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-5 py-2.5 text-xs font-black uppercase tracking-widest text-white transition hover:bg-red-500/10 hover:text-red-400 hover:border-red-500/20"
          >
            <span>Logout</span>
            <span className="text-lg transition-transform group-hover:translate-x-1">🚪</span>
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="mt-8 flex gap-2 border-b border-white/10 pb-4">
          <button
            onClick={() => setActiveTab("overview")}
            className={`px-4 py-2 text-sm font-bold rounded-xl transition ${activeTab === "overview" ? "bg-purple-600 text-white" : "text-zinc-400 hover:text-white"}`}
          >
            📊 Overview
          </button>
          <button
            onClick={() => setActiveTab("features")}
            className={`px-4 py-2 text-sm font-bold rounded-xl transition ${activeTab === "features" ? "bg-purple-600 text-white" : "text-zinc-400 hover:text-white"}`}
          >
            🚀 Feature Releases
          </button>
        </div>

        {/* Tab Content */}
        {activeTab === "overview" && (
          <div className="mt-8">
            {/* Quick Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6"> 
              <div className="rounded-2xl bg-gradient-to-br from-violet-600/20 to-purple-800/20 border border-violet-500/30 p-6 text-center"> 
                <div className="text-4xl font-black text-violet-300">{stats.totalUsers}</div> 
                <div className="text-sm font-bold text-violet-400 mt-1 uppercase tracking-wider">Total Registered Users</div> 
              </div> 
              <div className="rounded-2xl bg-gradient-to-br from-emerald-600/20 to-green-800/20 border border-emerald-500/30 p-6 text-center"> 
                <div className="text-4xl font-black text-emerald-300">{stats.activeUsers}</div> 
                <div className="text-sm font-bold text-emerald-400 mt-1 uppercase tracking-wider">Active Users (30 days)</div> 
              </div> 
              <div className="rounded-2xl bg-gradient-to-br from-amber-600/20 to-yellow-800/20 border border-amber-500/30 p-6 text-center"> 
                <div className="text-4xl font-black text-amber-300">{stats.onlineNow}</div> 
                <div className="text-sm font-bold text-amber-400 mt-1 uppercase tracking-wider">Online Right Now</div> 
              </div> 
            </div> 

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="group rounded-3xl border border-white/5 bg-white/[0.02] p-6 transition hover:bg-white/[0.04] hover:border-white/10">
                <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Active Leagues</p>
                <div className="mt-2 flex items-baseline gap-2">
                  <p className="text-3xl font-black text-amber-500">{stats.leagues}</p>
                  <span className="text-[10px] font-bold text-amber-900 uppercase">Live</span>
                </div>
              </div>
              <div className="group rounded-3xl border border-white/5 bg-white/[0.02] p-6 transition hover:bg-white/[0.04] hover:border-white/10">
                <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Pending Payouts</p>
                <div className="mt-2 flex items-baseline gap-2">
                  <p className="text-3xl font-black text-emerald-500">{stats.withdrawals}</p>
                  <span className="text-[10px] font-bold text-emerald-900 uppercase">Requests</span>
                </div>
              </div>
              <div className="group rounded-3xl border border-white/5 bg-white/[0.02] p-6 transition hover:bg-white/[0.04] hover:border-white/10">
                <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Active Questions</p>
                <div className="mt-2 flex items-baseline gap-2">
                  <p className="text-3xl font-black text-[#7c3aed]">{stats.questions.toLocaleString()}</p>
                  <span className="text-[10px] font-bold text-purple-900 uppercase">DB</span>
                </div>
              </div>
              <div className="group rounded-3xl border border-white/5 bg-white/[0.02] p-6 transition hover:bg-white/[0.04] hover:border-white/10">
                <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500">System Admins</p>
                <div className="mt-2 flex items-baseline gap-2">
                  <p className="text-3xl font-black text-white">{stats.admins}</p>
                  <span className="text-[10px] font-bold text-zinc-600 uppercase">Total</span>
                </div>
              </div>
            </div>

            {/* Financial Overview (Visible to Super Admin) */}
            {adminData.role === 'super_admin' && (
              <div className="mt-6 grid gap-4 sm:grid-cols-2">
                <div className="rounded-3xl border border-emerald-500/10 bg-emerald-500/[0.02] p-6">
                  <p className="text-[10px] font-black uppercase tracking-widest text-emerald-600">Total Platform Revenue</p>
                  <p className="mt-2 text-3xl font-black text-white">₦{revenueFormatted}</p>
                  <p className="mt-1 text-xs text-emerald-900">From completed leagues (40% cut)</p>
                </div>
                <div className="rounded-3xl border border-rose-500/10 bg-rose-500/[0.02] p-6">
                  <p className="text-[10px] font-black uppercase tracking-widest text-rose-600">Total Player Payouts</p>
                  <p className="mt-2 text-3xl font-black text-white">₦{payoutsFormatted}</p>
                  <p className="mt-1 text-xs text-rose-900">Successfully processed withdrawals</p>
                </div>
              </div>
            )}

            {/* Dashboard Cards */}
            <div className="mt-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {links.map((link) => (
                <Link 
                  key={link.href} 
                  href={link.href}
                  className="group relative overflow-hidden rounded-[2.5rem] border border-white/10 bg-[#161627]/80 p-8 transition-all duration-300 hover:-translate-y-1 hover:border-[#7c3aed]/50 hover:bg-[#1c1c30] hover:shadow-[0_20px_40px_-15px_rgba(0,0,0,0.5)]"
                >
                  <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-[#7c3aed]/10 text-3xl transition-all duration-300 group-hover:scale-110 group-hover:bg-[#7c3aed]/20 group-hover:shadow-[0_0_20px_rgba(124,58,237,0.3)]">
                    {link.icon}
                  </div>
                  
                  <div className="mt-8">
                    <h2 className="text-xl font-black text-white tracking-tight">{link.title}</h2>
                    <p className="mt-2 text-sm text-zinc-400 leading-relaxed font-medium">
                      {link.desc}
                    </p>
                  </div>

                  {/* Decorative background element */}
                  <div className="absolute -right-4 -bottom-4 text-8xl opacity-[0.03] grayscale transition-all duration-500 group-hover:scale-125 group-hover:opacity-[0.07] group-hover:rotate-12 pointer-events-none">
                    {link.icon}
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {activeTab === "features" && (
          <div className="space-y-6 mt-8">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-black text-white">Feature Release Control</h2>
              <p className="text-xs text-zinc-500">Toggle features on/off for all users instantly</p>
            </div>

            {flagMsg && (
              <div className="rounded-xl bg-emerald-500/15 border border-emerald-500/30 px-4 py-3 text-sm text-emerald-400 font-bold">
                ✅ {flagMsg}
              </div>
            )}

            {flagsLoading ? (
              <p className="text-zinc-500 text-sm animate-pulse">Loading feature flags...</p>
            ) : (
              <div className="space-y-8">
                {[
                  {
                    wave: "✅ Live at Launch — June 7, 2026",
                    color: "emerald",
                    features: [
                      { key: "spin", label: "Daily Spin & Win", desc: "Spin daily to earn coins — already live" },
                    ],
                  },
                  {
                    wave: "🔒 Wave 2 — July 5, 2026",
                    color: "yellow",
                    features: [
                      { key: "spin", label: "Daily Spin & Win", desc: "Spin daily to win coins and cash" },
                      { key: "coins", label: "Arena Coins Economy", desc: "Coins wallet and coin transactions" },
                      { key: "players_online", label: "Players Online + Direct Challenge", desc: "See who is online and challenge them" },
                      { key: "missions", label: "Missions Board", desc: "Daily and weekly missions with rewards" },
                    ],
                  },
                  {
                    wave: "🔒 Wave 3 — August 2, 2026",
                    color: "orange",
                    features: [
                      { key: "hall_of_fame", label: "Hall of Fame", desc: "Monthly best student and best school" },
                      { key: "certificates", label: "Monthly Certificates", desc: "Auto-generated downloadable certificates" },
                      { key: "school_dashboard", label: "School Admin Dashboard", desc: "Full school analytics and student management" },
                    ],
                  },
                  {
                    wave: "🔒 Wave 4 — August 30, 2026",
                    color: "purple",
                    features: [
                      { key: "state_leaderboards", label: "State Leaderboards", desc: "Filter leaderboard by Nigerian state" },
                      { key: "streaks", label: "Daily Streak System", desc: "Streak tracking with bonus rewards" },
                      { key: "notifications", label: "Push Notifications", desc: "In-app notification centre" },
                    ],
                  },
                  {
                    wave: "🔒 Wave 5 — September 27, 2026",
                    color: "blue",
                    features: [
                      { key: "inter_school", label: "Inter-School Competitions", desc: "Schools battle each other academically" },
                      { key: "season_pass", label: "Season Pass / Premium", desc: "Paid tier with exclusive tournaments" },
                    ],
                  },
                  {
                    wave: "🔒 Wave 6 — October 25, 2026",
                    color: "red",
                    features: [
                      { key: "national_tournament", label: "National Tournament", desc: "Nigeria-wide championship with prize pool" },
                      { key: "parent_dashboard", label: "Parent Dashboard", desc: "Read-only view of child academic progress" },
                      { key: "school_ambassador", label: "School Ambassador Program", desc: "Student reps for each school" },
                    ],
                  },
                ].map(({ wave, color, features }) => (
                  <div key={wave}>
                    <h3 className={`text-sm font-black uppercase tracking-wider mb-3 text-${color}-400`}>{wave}</h3>
                    <div className="space-y-3">
                      {features.map(({ key, label, desc }) => {
                        const isLive = featureFlags[key] === true;
                        const isSaving = flagSaving === key;
                        return (
                          <div key={key} className="rounded-2xl border border-white/10 bg-[#161627]/60 p-4 flex items-center justify-between gap-4">
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <span className={`text-xs font-black px-2 py-0.5 rounded-full border ${isLive ? "bg-emerald-500/15 border-emerald-500/30 text-emerald-400" : "bg-zinc-800 border-zinc-700 text-zinc-500"}`}>
                                  {isLive ? "LIVE" : "HIDDEN"}
                                </span>
                                <p className="font-bold text-white text-sm">{label}</p>
                              </div>
                              <p className="text-xs text-zinc-500 mt-1">{desc}</p>
                            </div>
                            <button
                              onClick={() => toggleFlag(key, isLive)}
                              disabled={isSaving}
                              className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors focus:outline-none disabled:opacity-50 ${isLive ? "bg-emerald-500" : "bg-zinc-700"}`}
                            >
                              <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${isLive ? "translate-x-6" : "translate-x-1"}`} />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </PageShell>
  );
}
