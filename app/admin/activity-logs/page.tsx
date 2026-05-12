"use client";

import { useState, useEffect } from "react";
import { PageShell } from "@/app/components/PageShell";
import Link from "next/link";

interface AdminLog {
  id: string;
  admin_id: string;
  action: string;
  details: string;
  ip_address: string;
  created_at: string;
  admin?: {
    username: string;
    full_name: string;
  };
}

export default function AdminActivityLogsPage() {
  const [logs, setLogs] = useState<AdminLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLogs = async () => {
      try {
        const res = await fetch("/api/admin/list-logs");
        const data = await res.json();
        if (data.success) {
          setLogs(data.logs);
        }
      } catch (err) {
        console.error("Failed to fetch logs:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchLogs();
  }, []);

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getActionColor = (action: string) => {
    if (action.includes("CREATE")) return "text-emerald-500";
    if (action.includes("UPDATE")) return "text-blue-500";
    if (action.includes("DEACTIVATE")) return "text-rose-500";
    if (action.includes("LOGIN")) return "text-amber-500";
    if (action.includes("RESET")) return "text-purple-500";
    return "text-zinc-400";
  };

  return (
    <PageShell overlay="rgba(15,15,26,0.95)">
      <div className="mx-auto max-w-5xl px-4 py-16">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3">
              <Link href="/admin" className="text-zinc-500 hover:text-white transition">← Back</Link>
              <h1 className="text-4xl font-black text-white tracking-tight">📜 ACTIVITY LOGS</h1>
            </div>
            <p className="mt-2 text-[#7c3aed] font-bold uppercase tracking-widest text-xs">System Audit Trail</p>
          </div>
        </div>

        <div className="mt-12 overflow-hidden rounded-3xl border border-white/10 bg-[#161627]/80 backdrop-blur-xl">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-white/5 bg-white/5">
                <th className="px-6 py-4 text-xs font-black uppercase tracking-widest text-zinc-500">Timestamp</th>
                <th className="px-6 py-4 text-xs font-black uppercase tracking-widest text-zinc-500">Admin</th>
                <th className="px-6 py-4 text-xs font-black uppercase tracking-widest text-zinc-500">Action</th>
                <th className="px-6 py-4 text-xs font-black uppercase tracking-widest text-zinc-500">Details</th>
                <th className="px-6 py-4 text-xs font-black uppercase tracking-widest text-zinc-500">IP Address</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={5} className="px-6 py-12 text-center text-zinc-500">Loading logs...</td></tr>
              ) : logs.length === 0 ? (
                <tr><td colSpan={5} className="px-6 py-12 text-center text-zinc-500">No activity logs found.</td></tr>
              ) : logs.map(log => (
                <tr key={log.id} className="border-b border-white/5 hover:bg-white/5 transition">
                  <td className="px-6 py-4 text-sm text-zinc-400">{formatDate(log.created_at)}</td>
                  <td className="px-6 py-4">
                    <p className="font-bold text-white text-sm">{log.admin?.full_name || "System"}</p>
                    <p className="text-xs text-zinc-500">@{log.admin?.username || "system"}</p>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`text-xs font-black uppercase tracking-widest ${getActionColor(log.action)}`}>
                      {log.action}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-zinc-300">{log.details}</td>
                  <td className="px-6 py-4 text-xs font-mono text-zinc-500">{log.ip_address}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </PageShell>
  );
}
