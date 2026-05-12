"use client";
import { useEffect, useState } from "react";
import { getSupabaseClient } from "@/lib/supabase";
import { PageShell } from "@/app/components/PageShell";

export default function ReferralPage() {
  const [userId, setUserId] = useState<string | null>(null);
  const [code, setCode] = useState<string>("");
  const [referralCount, setReferralCount] = useState(0);
  const [totalEarned, setTotalEarned] = useState(0);
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = getSupabaseClient();
    supabase.auth.getSession().then(async ({ data }) => {
      const uid = data.session?.user?.id;
      if (!uid) { setLoading(false); return; }
      setUserId(uid);

      const { data: profile } = await supabase
        .from("profiles")
        .select("referral_code")
        .eq("id", uid)
        .single();
      if (profile?.referral_code) setCode(profile.referral_code);

      const { count } = await supabase
        .from("referrals")
        .select("*", { count: "exact", head: true })
        .eq("referrer_id", uid);
      setReferralCount(count || 0);

      const { data: earnings } = await supabase
        .from("referral_earnings")
        .select("amount")
        .eq("referrer_id", uid);
      const total = (earnings || []).reduce((sum, e) => sum + (e.amount || 0), 0);
      setTotalEarned(total);
      setLoading(false);
    });
  }, []);

  const referralLink = `https://quiz-arena-three.vercel.app?ref=${code}`;

  const copyLink = () => {
    navigator.clipboard.writeText(referralLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <PageShell overlay="transparent">
      <div className="min-h-screen bg-[#0f0f1a] text-white flex flex-col items-center px-4 py-12">
        <div className="w-full max-w-lg">
          <h1 className="text-3xl font-black text-emerald-400 mb-1">💰 Refer & Earn</h1>
          <p className="text-zinc-400 text-sm mb-8">Invite friends and earn bonus cash on every deposit they make.</p>

          <div className="grid grid-cols-2 gap-4 mb-8">
            <div className="rounded-2xl bg-white/5 border border-white/10 p-5 text-center">
              <div className="text-3xl font-black text-emerald-400">{referralCount}</div>
              <div className="text-xs text-zinc-500 mt-1">Friends Referred</div>
            </div>
            <div className="rounded-2xl bg-white/5 border border-white/10 p-5 text-center">
              <div className="text-3xl font-black text-emerald-400">₦{totalEarned}</div>
              <div className="text-xs text-zinc-500 mt-1">Total Earned</div>
            </div>
          </div>

          {loading ? (
            <div className="text-zinc-500 text-sm text-center">Loading...</div>
          ) : !userId ? (
            <a href="/auth" className="block text-center rounded-xl bg-emerald-500 px-8 py-3 font-bold text-black">Sign in to refer friends</a>
          ) : (
            <>
              <div className="mb-4">
                <div className="text-xs text-zinc-500 uppercase tracking-widest mb-2">Your Referral Code</div>
                <div className="rounded-xl bg-white/5 border border-white/10 px-5 py-4 text-center text-2xl font-black tracking-widest text-emerald-400">{code || "—"}</div>
              </div>
              <div className="mb-6">
                <div className="text-xs text-zinc-500 uppercase tracking-widest mb-2">Your Referral Link</div>
                <div className="flex gap-2">
                  <div className="flex-1 rounded-xl bg-white/5 border border-white/10 px-4 py-3 text-xs text-zinc-300 truncate">{referralLink}</div>
                  <button onClick={copyLink} className="rounded-xl bg-emerald-500 px-4 py-3 text-xs font-bold text-black transition hover:bg-emerald-400">
                    {copied ? "Copied!" : "Copy"}
                  </button>
                </div>
              </div>
              <div className="rounded-2xl bg-white/5 border border-white/10 p-5">
                <div className="text-sm font-bold text-white mb-3">How it works</div>
                <div className="space-y-2 text-xs text-zinc-400">
                  <div className="flex gap-3"><span className="text-emerald-400 font-bold">1.</span> Share your referral link with friends</div>
                  <div className="flex gap-3"><span className="text-emerald-400 font-bold">2.</span> They sign up and make their first deposit</div>
                  <div className="flex gap-3"><span className="text-emerald-400 font-bold">3.</span> You earn 5% of their first deposit instantly</div>
                  <div className="flex gap-3"><span className="text-emerald-400 font-bold">4.</span> You earn 0.5% on every future deposit forever</div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </PageShell>
  );
}