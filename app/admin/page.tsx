"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { PageShell } from "@/app/components/PageShell";

export default function AdminDashboard() {
  const router = useRouter();

  const [adminRole, setAdminRole] = useState<string | null>(null);

  useEffect(() => {
    const fetchMe = async () => {
      try {
        const res = await fetch("/api/admin/me");
        const data = await res.json();
        if (data.success) {
          setAdminRole(data.admin.role);
        }
      } catch (err) {
        console.error("Failed to fetch admin info:", err);
      }
    };
    fetchMe();
  }, []);

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
    { title: "Import Questions", href: "/admin/import", icon: "📥", desc: "Upload JSON questions to subjects" },
    { title: "Leagues", href: "/admin/leagues", icon: "🏆", desc: "Manage multi-player prize leagues" },
    { title: "Withdrawals", href: "/admin/withdrawals", icon: "🏦", desc: "Process player payout requests" },
    ...(adminRole === "super_admin" ? [
      { title: "Manage Admins", href: "/admin/manage-admins", icon: "👥", desc: "Manage admin accounts and roles" }
    ] : []),
  ];

  return (
    <PageShell overlay="rgba(15,15,26,0.85)">
      <div className="mx-auto max-w-4xl px-4 py-16">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-black text-white tracking-tight">Admin Control Panel</h1>
            <p className="mt-2 text-zinc-500">Manage Quiz Arena game systems and finances.</p>
          </div>
          <button
            onClick={handleLogout}
            className="rounded-2xl border border-white/10 bg-white/5 px-6 py-3 text-xs font-black uppercase tracking-widest text-white transition hover:bg-red-500/10 hover:text-red-400 hover:border-red-500/20"
          >
            🚪 Logout
          </button>
        </div>

        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {links.map(link => (
            <Link 
              key={link.href} 
              href={link.href}
              className="group rounded-3xl border border-white/10 bg-[#161627]/80 p-6 transition hover:border-[#7c3aed]/50 hover:bg-[#1c1c30]"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#7c3aed]/10 text-2xl transition group-hover:scale-110 group-hover:bg-[#7c3aed]/20">
                {link.icon}
              </div>
              <h2 className="mt-4 text-lg font-bold text-white">{link.title}</h2>
              <p className="mt-1 text-sm text-zinc-500 leading-relaxed">{link.desc}</p>
            </Link>
          ))}
        </div>
      </div>
    </PageShell>
  );
}
