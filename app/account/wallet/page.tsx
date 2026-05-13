"use client";

import { useState, useEffect } from "react";
import { getSupabaseClient } from "@/lib/supabase";
import { PageShell } from "@/app/components/PageShell";
import { getWalletBalance } from "@/lib/wallet";

import type { User } from "@supabase/supabase-js";

interface Transaction {
  id: string;
  type: string;
  amount: number;
  description: string;
  created_at: string;
  status: string;
}

export default function WalletPage() {
  const [balance, setBalance] = useState<number | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [user, setUser] = useState<User | null>(null);

  // Deposit Modal State
  const [showDeposit, setShowDeposit] = useState(false);
  const [depositAmount, setDepositAmount] = useState<number>(500);
  const [customAmount, setCustomAmount] = useState("");
  const [busy, setBusy] = useState(false);

  // Withdrawal Modal State
  const [showWithdraw, setShowWithdraw] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [bankName, setBankName] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [accountName, setAccountName] = useState("");

  const NIGERIAN_BANKS = [
    "Access Bank", "Zenith Bank", "GTBank", "First Bank", "UBA", "Kuda Bank", "Opay", "Palmpay", "Stanbic IBTC", "Fidelity Bank"
  ];

  useEffect(() => {
    const loadData = async () => {
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
    };
    loadData();
  }, []);

  const refreshData = async () => {
    if (user) {
      const b = await getWalletBalance(user.id);
      setBalance(b);
      const supabase = getSupabaseClient();
      const { data } = await supabase
        .from("transactions")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      if (data) setTransactions(data);
    }
  };

  const handleDeposit = async () => {
    if (!user?.email) {
      alert("User not found. Please log in.");
      return;
    }
    setBusy(true);
    const amount = depositAmount === -1 ? Number(customAmount) : depositAmount;
    
    if (isNaN(amount) || amount < 100) {
      alert("Minimum deposit is ₦100");
      setBusy(false);
      return;
    }

    try {
      const res = await fetch("/api/payment/initialize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: user.email,
          amount,
          userId: user.id
        })
      });
      const data = await res.json();
      
      if (data.status) {
        const PaystackPop = (await import("@paystack/inline-js")).default;
        const paystack = new PaystackPop();
        paystack.newTransaction({
          key: process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY || "",
          email: user.email,
          amount: amount * 100,
          ref: data.data.reference,
          onSuccess: async (transaction: { reference: string }) => { 
            try { 
              const verifyRes = await fetch(`/api/payment/verify?reference=${transaction.reference}&userId=${user?.id}`); 
              if (verifyRes.ok || verifyRes.redirected) { 
                alert('Payment successful! Your wallet has been updated.'); 
                await refreshData();
                setShowDeposit(false);
              } else { 
                const text = await verifyRes.text(); 
                alert('Payment verify failed: ' + verifyRes.status + ' ' + text.substring(0, 100)); 
              } 
            } catch (err) { 
              alert('Error: ' + err); 
            } 
          },
          onCancel: () => {
            setBusy(false);
          }
        });
      }
    } catch (err) {
      console.error(err);
      alert("Failed to initialize payment.");
    } finally {
      setBusy(false);
    }
  };

  const handleWithdraw = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      alert("User not found. Please log in.");
      return;
    }
    const amount = Number(withdrawAmount);
    if (amount < 500) {
      alert("Minimum withdrawal is ₦500");
      return;
    }
    if (balance && amount > balance) {
      alert("Insufficient balance");
      return;
    }

    setBusy(true);
    try {
      const supabase = getSupabaseClient();
      
      // 1. Create withdrawal request
      const { error: reqError } = await supabase.from("withdrawal_requests").insert({
        user_id: user.id,
        amount,
        bank_name: bankName,
        account_number: accountNumber,
        account_name: accountName,
        status: 'pending'
      });

      if (reqError) throw reqError;

      // 2. Deduct from wallet immediately (as pending withdrawal)
      const { error: txError } = await supabase.from("transactions").insert({
        user_id: user.id,
        type: 'withdrawal',
        amount,
        reference: `WD-${Date.now()}`,
        description: `Withdrawal to ${bankName} (${accountNumber})`,
        status: 'pending'
      });

      if (txError) throw txError;

      // Update wallet balance
      const { error: walletError } = await supabase
        .from("wallets")
        .update({ balance: (balance || 0) - amount })
        .eq("user_id", user.id);

      if (walletError) throw walletError;

      setShowWithdraw(false);
      setWithdrawAmount("");
      refreshData();
      alert("Withdrawal request submitted successfully!");
    } catch (err: unknown) {
      const error = err as Error;
      alert(error.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <PageShell overlay="rgba(15,15,26,0.85)">
      <div className="mx-auto max-w-4xl px-4 py-10">
        <header className="flex flex-col items-center text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[#7c3aed]/10 text-3xl">
            💳
          </div>
          <h1 className="mt-4 text-sm font-bold uppercase tracking-widest text-zinc-500">Your Wallet Balance</h1>
          <p className="mt-2 text-5xl font-black text-white">₦{balance?.toLocaleString() || "0.00"}</p>
          
          <div className="mt-8 flex gap-4">
            <button 
              onClick={() => setShowDeposit(true)}
              className="rounded-2xl bg-[#7c3aed] px-8 py-4 text-sm font-black uppercase tracking-widest text-white shadow-lg shadow-[#7c3aed]/20 transition hover:bg-[#6d28d9]"
            >
              💳 Add Money
            </button>
            <button 
              onClick={() => setShowWithdraw(true)}
              className="rounded-2xl border border-white/10 bg-white/5 px-8 py-4 text-sm font-black uppercase tracking-widest text-white transition hover:bg-white/10"
            >
              🏦 Withdraw
            </button>
          </div>
        </header>

        {/* Deposit Modal */}
        {showDeposit && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
            <div className="w-full max-w-md rounded-3xl border border-white/10 bg-[#161627] p-8">
              <h2 className="text-xl font-bold text-white">Deposit Funds</h2>
              <p className="mt-1 text-sm text-zinc-500">Add money to your wallet via Paystack.</p>
              
              <div className="mt-8 grid grid-cols-2 gap-3">
                {[500, 1000, 2000, 5000].map(amt => (
                  <button
                    key={amt}
                    onClick={() => { setDepositAmount(amt); setCustomAmount(""); }}
                    className={`rounded-2xl border py-4 text-sm font-bold transition ${depositAmount === amt ? 'border-[#7c3aed] bg-[#7c3aed]/10 text-white' : 'border-white/10 bg-black/20 text-zinc-400'}`}
                  >
                    ₦{amt.toLocaleString()}
                  </button>
                ))}
              </div>
              
              <div className="mt-4">
                <input
                  type="number"
                  placeholder="Custom amount (min ₦100)"
                  value={customAmount}
                  onChange={(e) => { setCustomAmount(e.target.value); setDepositAmount(-1); }}
                  className="w-full rounded-2xl border border-white/10 bg-black/40 px-4 py-4 text-sm text-white outline-none focus:border-[#7c3aed]"
                />
              </div>

              <div className="mt-8 flex gap-3">
                <button 
                  onClick={() => setShowDeposit(false)}
                  className="flex-1 rounded-2xl border border-white/10 bg-white/5 py-4 text-xs font-bold uppercase tracking-widest text-zinc-400 transition hover:bg-white/10"
                >
                  Cancel
                </button>
                <button 
                  disabled={busy}
                  onClick={handleDeposit}
                  className="flex-1 rounded-2xl bg-[#7c3aed] py-4 text-xs font-bold uppercase tracking-widest text-white transition hover:bg-[#6d28d9] disabled:opacity-50"
                >
                  {busy ? "Processing..." : "Continue"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Withdraw Modal */}
        {showWithdraw && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
            <div className="w-full max-w-md rounded-3xl border border-white/10 bg-[#161627] p-8">
              <h2 className="text-xl font-bold text-white">Withdraw Funds</h2>
              <p className="mt-1 text-sm text-zinc-500">Withdraw to your Nigerian bank account.</p>
              
              <form onSubmit={handleWithdraw} className="mt-8 space-y-4">
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">Amount (min ₦500)</label>
                  <input
                    required
                    type="number"
                    value={withdrawAmount}
                    onChange={(e) => setWithdrawAmount(e.target.value)}
                    className="mt-2 w-full rounded-2xl border border-white/10 bg-black/40 px-4 py-3.5 text-sm text-white outline-none focus:border-[#7c3aed]"
                    placeholder="e.g. 1000"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">Bank Name</label>
                  <select
                    required
                    value={bankName}
                    onChange={(e) => setBankName(e.target.value)}
                    className="mt-2 w-full appearance-none rounded-2xl border border-white/10 bg-black/40 px-4 py-3.5 text-sm text-white outline-none focus:border-[#7c3aed]"
                  >
                    <option value="">Select Bank</option>
                    {NIGERIAN_BANKS.map(b => <option key={b} value={b}>{b}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">Account Number</label>
                  <input
                    required
                    maxLength={10}
                    value={accountNumber}
                    onChange={(e) => setAccountNumber(e.target.value)}
                    className="mt-2 w-full rounded-2xl border border-white/10 bg-black/40 px-4 py-3.5 text-sm text-white outline-none focus:border-[#7c3aed]"
                    placeholder="10-digit number"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">Account Name</label>
                  <input
                    required
                    value={accountName}
                    onChange={(e) => setAccountName(e.target.value)}
                    className="mt-2 w-full rounded-2xl border border-white/10 bg-black/40 px-4 py-3.5 text-sm text-white outline-none focus:border-[#7c3aed]"
                    placeholder="Name on bank account"
                  />
                </div>

                <div className="mt-8 flex gap-3 pt-4">
                  <button 
                    type="button"
                    onClick={() => setShowWithdraw(false)}
                    className="flex-1 rounded-2xl border border-white/10 bg-white/5 py-4 text-xs font-bold uppercase tracking-widest text-zinc-400 transition hover:bg-white/10"
                  >
                    Cancel
                  </button>
                  <button 
                    disabled={busy}
                    type="submit"
                    className="flex-1 rounded-2xl bg-[#7c3aed] py-4 text-xs font-bold uppercase tracking-widest text-white transition hover:bg-[#6d28d9] disabled:opacity-50"
                  >
                    {busy ? "Processing..." : "Withdraw"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

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
