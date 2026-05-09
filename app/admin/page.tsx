"use client";

import Link from "next/link";
import { PageShell } from "@/app/components/PageShell";

export default function AdminDashboard() {
  const links = [
    { title: "Import Questions", href: "/admin/import", icon: "📥", desc: "Upload JSON questions to subjects" },
    { title: "Leagues", href: "/admin/leagues", icon: "🏆", desc: "Manage multi-player prize leagues" },
    { title: "Withdrawals", href: "/admin/withdrawals", icon: "🏦", desc: "Process player payout requests" },
  ];

  return (
    <PageShell>
      <div className="mx-auto max-w-4xl px-4 py-16">
        <h1 className="text-4xl font-black text-white tracking-tight">Admin Control Panel</h1>
        <p className="mt-2 text-zinc-500">Manage Quiz Arena game systems and finances.</p>

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
