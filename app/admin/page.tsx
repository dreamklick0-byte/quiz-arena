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
  const [stats, setStats] = useState({ admins: 0, withdrawals: 0, questions: 0 });
  const [loading, setLoading] = useState(true);

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
        }

        if (statsData.success) {
          setStats(statsData.stats);
        }
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
    ...(adminData.role === "super_admin" ? [
      { 
        title: "Manage Admins", 
        href: "/admin/manage-admins", 
        icon: "👥", 
        desc: "Create and manage admin accounts" 
      }
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

  return (
    <PageShell overlay="rgba(15,15,26,0.85)">
      <div className="mx-auto max-w-5xl px-6 py-12">
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

        {/* Quick Stats */}
        <div className="mt-12 grid gap-4 sm:grid-cols-3">
          <div className="group rounded-3xl border border-white/5 bg-white/[0.02] p-6 transition hover:bg-white/[0.04] hover:border-white/10">
            <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500">System Admins</p>
            <div className="mt-2 flex items-baseline gap-2">
              <p className="text-3xl font-black text-white">{stats.admins}</p>
              <span className="text-[10px] font-bold text-zinc-600 uppercase">Accounts</span>
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
              <span className="text-[10px] font-bold text-purple-900 uppercase">Database</span>
            </div>
          </div>
        </div>

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
    </PageShell>
  );
}
