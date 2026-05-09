"use client";

import { useState, useEffect } from "react";
import { getSupabaseClient } from "@/lib/supabase";
import { PageShell } from "@/app/components/PageShell";

export default function AdminWithdrawalsPage() {
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalPending, setTotalPending] = useState(0);

  useEffect(() => {
    loadRequests();
  }, []);

  async function loadRequests() {
    const supabase = getSupabaseClient();
    const { data } = await supabase
      .from("withdrawal_requests")
      .select(`
        *,
        profiles:user_id (display_name)
      `)
      .order("created_at", { ascending: false });
    
    if (data) {
      setRequests(data);
      const pending = data
        .filter(r => r.status === 'pending')
        .reduce((sum, r) => sum + Number(r.amount), 0);
      setTotalPending(pending);
    }
    setLoading(false);
  }

  async function updateStatus(id: string, status: 'processed' | 'rejected') {
    const supabase = getSupabaseClient();
    const { error } = await supabase
      .from("withdrawal_requests")
      .update({ 
        status,
        processed_at: status === 'processed' ? new Date().toISOString() : null
      })
      .eq("id", id);

    if (error) {
      alert(error.message);
    } else {
      loadRequests();
    }
  }

  return (
    <PageShell>
      <div className="mx-auto max-w-6xl px-4 py-10">
        <header className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-black text-white">Withdrawal Requests</h1>
            <p className="mt-1 text-zinc-500 text-sm">Review and process player payouts.</p>
          </div>
          <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 px-6 py-4 text-right">
            <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-500">Total Pending</p>
            <p className="text-2xl font-black text-white">₦{totalPending.toLocaleString()}</p>
          </div>
        </header>

        <div className="mt-12 overflow-hidden rounded-3xl border border-white/10 bg-[#161627]">
          <table className="w-full text-left text-sm">
            <thead className="bg-black/40 text-[10px] font-bold uppercase tracking-widest text-zinc-500">
              <tr>
                <th className="px-6 py-4">Player</th>
                <th className="px-6 py-4">Amount</th>
                <th className="px-6 py-4">Bank Details</th>
                <th className="px-6 py-4">Requested</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {requests.map(r => (
                <tr key={r.id} className="text-zinc-300">
                  <td className="px-6 py-4">
                    <p className="font-bold text-white">{r.profiles?.display_name || "Unknown"}</p>
                    <p className="text-[10px] text-zinc-500 font-mono">{r.user_id}</p>
                  </td>
                  <td className="px-6 py-4 font-black text-white">₦{Number(r.amount).toLocaleString()}</td>
                  <td className="px-6 py-4">
                    <p className="text-white font-medium">{r.bank_name}</p>
                    <p className="text-xs text-zinc-500">{r.account_number} · {r.account_name}</p>
                  </td>
                  <td className="px-6 py-4 text-xs">
                    {new Date(r.created_at).toLocaleString()}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`rounded-full px-2 py-1 text-[9px] font-bold uppercase ${
                      r.status === 'pending' ? 'bg-[#f59e0b]/20 text-[#f59e0b]' :
                      r.status === 'processed' ? 'bg-emerald-500/20 text-emerald-400' :
                      'bg-red-500/20 text-red-400'
                    }`}>
                      {r.status}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    {r.status === 'pending' && (
                      <div className="flex gap-2">
                        <button 
                          onClick={() => updateStatus(r.id, 'processed')}
                          className="rounded-lg bg-emerald-500 px-3 py-1.5 text-[10px] font-black uppercase text-white hover:bg-emerald-600"
                        >
                          Mark Paid
                        </button>
                        <button 
                          onClick={() => updateStatus(r.id, 'rejected')}
                          className="rounded-lg bg-red-500 px-3 py-1.5 text-[10px] font-black uppercase text-white hover:bg-red-600"
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
          {requests.length === 0 && (
            <div className="p-10 text-center text-zinc-500">No withdrawal requests found.</div>
          )}
        </div>
      </div>
    </PageShell>
  );
}
