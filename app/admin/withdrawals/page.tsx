"use client";

import { useState, useEffect } from "react";
import { PageShell } from "@/app/components/PageShell";
import Link from "next/link";

interface WithdrawalRequest {
  id: string;
  user_id: string;
  amount: number;
  bank_name: string;
  account_number: string;
  account_name: string;
  status: 'pending' | 'processed' | 'rejected';
  created_at: string;
  profiles: { display_name: string } | null;
}

export default function AdminWithdrawalsPage() {
  const [requests, setRequests] = useState<WithdrawalRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalPending, setTotalPending] = useState(0);

  useEffect(() => {
    const fetchRequests = async () => {
      try {
        const res = await fetch("/api/admin/list-withdrawals");
        const data = await res.json();
        if (data.success) {
          setRequests(data.requests);
          const pending = data.requests
            .filter((r: WithdrawalRequest) => r.status === 'pending')
            .reduce((sum: number, r: WithdrawalRequest) => sum + Number(r.amount), 0);
          setTotalPending(pending);
        }
      } catch (err) {
        console.error("Failed to fetch withdrawals:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchRequests();
  }, []);

  const refreshRequests = async () => {
    try {
      const res = await fetch("/api/admin/list-withdrawals");
      const data = await res.json();
      if (data.success) {
        setRequests(data.requests);
        const pending = data.requests
          .filter((r: WithdrawalRequest) => r.status === 'pending')
          .reduce((sum: number, r: WithdrawalRequest) => sum + Number(r.amount), 0);
        setTotalPending(pending);
      }
    } catch (err) {
      console.error("Failed to fetch withdrawals:", err);
    }
  };

  const updateStatus = async (id: string, status: 'processed' | 'rejected') => {
    if (!confirm(`Are you sure you want to mark this as ${status}?`)) return;

    try {
      const res = await fetch("/api/admin/process-withdrawal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status })
      });
      const data = await res.json();
      if (data.success) {
        refreshRequests();
      } else {
        alert(data.error || "Failed to update status");
      }
    } catch (err) {
      console.error("Error updating status:", err);
    }
  };

  return (
    <PageShell overlay="rgba(15,15,26,0.95)">
      <div className="mx-auto max-w-6xl px-4 py-16">
        <header className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3">
              <Link href="/admin" className="text-zinc-500 hover:text-white transition">← Back</Link>
              <h1 className="text-4xl font-black text-white tracking-tight">💸 WITHDRAWALS</h1>
            </div>
            <p className="mt-2 text-zinc-500">Review and process player payout requests.</p>
          </div>
          <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 px-8 py-4 text-right shadow-lg shadow-emerald-500/5">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-500">Total Pending</p>
            <p className="text-3xl font-black text-white">₦{totalPending.toLocaleString()}</p>
          </div>
        </header>

        <div className="mt-12 overflow-hidden rounded-3xl border border-white/10 bg-[#161627]/80 backdrop-blur-xl">
          <table className="w-full text-left text-sm border-collapse">
            <thead className="bg-white/5 text-[10px] font-black uppercase tracking-widest text-zinc-500">
              <tr>
                <th className="px-6 py-5">Player</th>
                <th className="px-6 py-5">Amount</th>
                <th className="px-6 py-5">Bank Details</th>
                <th className="px-6 py-5">Requested</th>
                <th className="px-6 py-5">Status</th>
                <th className="px-6 py-5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {loading ? (
                <tr><td colSpan={6} className="px-6 py-12 text-center text-zinc-500">Loading requests...</td></tr>
              ) : requests.length === 0 ? (
                <tr><td colSpan={6} className="px-6 py-12 text-center text-zinc-500">No withdrawal requests found.</td></tr>
              ) : requests.map(r => (
                <tr key={r.id} className="text-zinc-300 hover:bg-white/5 transition">
                  <td className="px-6 py-5">
                    <p className="font-bold text-white">{r.profiles?.display_name || "Unknown"}</p>
                    <p className="text-[10px] text-zinc-500 font-mono">ID: {r.user_id.slice(0, 8)}...</p>
                  </td>
                  <td className="px-6 py-5 font-black text-white text-lg">₦{Number(r.amount).toLocaleString()}</td>
                  <td className="px-6 py-5">
                    <p className="text-white font-bold">{r.bank_name}</p>
                    <p className="text-xs text-zinc-500">{r.account_number} · {r.account_name}</p>
                  </td>
                  <td className="px-6 py-5 text-xs text-zinc-500">
                    {new Date(r.created_at).toLocaleString("en-GB", {
                      day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit"
                    })}
                  </td>
                  <td className="px-6 py-5">
                    <span className={`rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-wider ${
                      r.status === 'pending' ? 'bg-amber-500/10 text-amber-500 border border-amber-500/20' :
                      r.status === 'processed' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                      'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                    }`}>
                      {r.status}
                    </span>
                  </td>
                  <td className="px-6 py-5 text-right">
                    {r.status === 'pending' && (
                      <div className="flex justify-end gap-2">
                        <button 
                          onClick={() => updateStatus(r.id, 'processed')}
                          className="rounded-xl bg-emerald-500 px-4 py-2 text-[10px] font-black uppercase tracking-widest text-white hover:bg-emerald-600 transition shadow-lg shadow-emerald-500/20"
                        >
                          Approve
                        </button>
                        <button 
                          onClick={() => updateStatus(r.id, 'rejected')}
                          className="rounded-xl bg-rose-500/10 border border-rose-500/20 px-4 py-2 text-[10px] font-black uppercase tracking-widest text-rose-500 hover:bg-rose-500 hover:text-white transition"
                        >
                          Reject
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </PageShell>
  );
}
