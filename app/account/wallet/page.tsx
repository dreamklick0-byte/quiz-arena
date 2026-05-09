"use client";

import { useState, useEffect } from "react";
import { getSupabaseClient } from "@/lib/supabase";
import { PageShell } from "@/app/components/PageShell";
import { getWalletBalance } from "@/lib/wallet";

export default function WalletPage() {
  const [balance, setBalance] = useState<number | null>(null);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    const supabase = getSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    setUser(user);
    if (user) {
      const b = await getWalletBalance(user.id);
      setBalance(b);

      const { data } = await supabase
        .from("transactions")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      if (data) setTransactions(data);
    }
    setLoading(false);
  }

  return (
    <PageShell>
      <div className="mx-auto max-w-4xl px-4 py-10">
        <header className="flex flex-col items-center text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[#7c3aed]/10 text-3xl">
            💳
          </div>
          <h1 className="mt-4 text-sm font-bold uppercase tracking-widest text-zinc-500">Your Wallet Balance</h1>
          <p className="mt-2 text-5xl font-black text-white">₦{balance?.toLocaleString() || "0.00"}</p>
          
          <div className="mt-8 flex gap-4">
            <button className="rounded-2xl bg-[#7c3aed] px-8 py-4 text-sm font-black uppercase tracking-widest text-white shadow-lg shadow-[#7c3aed]/20 transition hover:bg-[#6d28d9]">
              💳 Add Money
            </button>
            <button className="rounded-2xl border border-white/10 bg-white/5 px-8 py-4 text-sm font-black uppercase tracking-widest text-white transition hover:bg-white/10">
              🏦 Withdraw
            </button>
          </div>
        </header>

        <div className="mt-16">
          <h2 className="text-xs font-bold uppercase tracking-[0.2em] text-zinc-500">Transaction History</h2>
          <div className="mt-6 overflow-hidden rounded-3xl border border-white/10 bg-[#161627]/50">
            {transactions.length === 0 ? (
              <div className="p-10 text-center text-sm text-zinc-500">No transactions yet.</div>
            ) : (
              <table className="w-full text-left text-sm">
                <thead className="bg-black/40 text-[10px] font-bold uppercase tracking-widest text-zinc-500">
                  <tr>
                    <th className="px-6 py-4">Date</th>
                    <th className="px-6 py-4">Description</th>
                    <th className="px-6 py-4">Amount</th>
                    <th className="px-6 py-4">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {transactions.map(tx => (
                    <tr key={tx.id}>
                      <td className="px-6 py-4 text-xs text-zinc-500">
                        {new Date(tx.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 font-medium text-white">
                        {tx.description}
                      </td>
                      <td className={`px-6 py-4 font-bold ${
                        ['deposit', 'win', 'refund'].includes(tx.type) ? 'text-emerald-400' : 'text-red-400'
                      }`}>
                        {['deposit', 'win', 'refund'].includes(tx.type) ? '+' : '-'}₦{tx.amount}
                      </td>
                      <td className="px-6 py-4">
                        <span className="rounded-full bg-zinc-500/10 px-2 py-1 text-[9px] font-bold uppercase text-zinc-400">
                          {tx.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </PageShell>
  );
}
