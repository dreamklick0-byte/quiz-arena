"use client";
import { useEffect, useState } from "react";
import { getSupabaseClient } from "@/lib/supabase";
import { PageShell } from "@/app/components/PageShell";
import Link from "next/link";

export default function ReferralPage() {
  const [userId, setUserId] = useState<string | null>(null);
  const [code, setCode] = useState<string>("");
  const [referralCount, setReferralCount] = useState(0);
  const [referees, setReferees] = useState<{ 
    id: string; 
    referee_id: string; 
    created_at: string;
    first_deposit_bonus_paid: boolean;
    profiles: { display_name: string | null; email: string | null } | null;
  }[]>([]);
  const [totalEarned, setTotalEarned] = useState(0);
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = getSupabaseClient();
    supabase.auth.getSession().then(async ({ data }) => {
      const uid = data.session?.user?.id;
      if (!uid) { setLoading(false); return; }
      setUserId(uid);

      const { data: profile, error: profileError } = await supabase 
        .from("profiles") 
        .select("referral_code") 
        .eq("id", uid) 
        .maybeSingle(); 
      console.log("Profile fetch:", profile, "Error:", profileError); 
      if (profile?.referral_code) setCode(profile.referral_code); 

      // Fetch referrals from profiles table where referred_by matches this user's code
      if (profile?.referral_code) {
        const { count, error: countError } = await supabase
          .from("profiles")
          .select("*", { count: "exact", head: true })
          .eq("referred_by", profile.referral_code);
        
        console.log("Referral count fetch:", count, "Error:", countError);
        setReferralCount(count || 0);

        const { data: refereeList, error: listError } = await supabase
          .from("profiles")
          .select("id, display_name, email, created_at")
          .eq("referred_by", profile.referral_code)
          .order("created_at", { ascending: false });

        console.log("Referee list fetch:", refereeList, "Error:", listError);
        
        // Transform profiles data to match the expected state structure
        const transformedReferees = (refereeList || []).map(p => ({
          id: p.id,
          referee_id: p.id,
          created_at: p.created_at,
          first_deposit_bonus_paid: false, // We don't have this in profiles, defaulting to false
          profiles: {
            display_name: p.display_name,
            email: p.email
          }
        }));
        setReferees(transformedReferees);
      } else {
        setReferralCount(0);
        setReferees([]);
      }
      const { data: earnings } = await supabase
        .from("referral_earnings")
        .select("amount")
        .eq("referrer_id", uid);
      const total = (earnings || []).reduce((sum, e) => sum + (e.amount || 0), 0);
      setTotalEarned(total);
      setLoading(false);
    });
  }, []);

  const referralLink = `https://www.quizarena.com.ng/auth?ref=${code}`;

  const copyLink = () => {
    navigator.clipboard.writeText(referralLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen text-white relative bg-[#0f0f1a]">
      {/* Background Image */}
      <img
        src="https://images.unsplash.com/photo-1579621970795-87facc2f976d?w=1920&q=80"
        alt=""
        className="fixed inset-0 w-full h-full object-cover pointer-events-none"
        style={{ opacity: 0.20 }}
      />
      <div className="fixed inset-0 bg-[#022c22]/80 pointer-events-none z-0" />

      <div className="relative z-10">
        <PageShell overlay="transparent">
          {/* HERO BANNER */}
          <div
            className="py-16 text-center relative overflow-hidden"
            style={{ background: "linear-gradient(135deg, #022c22 0%, #065f46 50%, #047857 100%)" }}
          >
            <img
              src="https://images.unsplash.com/photo-1579621970563-ebec7560ff3e?w=1920&q=80"
              className="absolute inset-0 w-full h-full object-cover"
              style={{ opacity: 0.15 }}
              alt=""
            />
            <div className="absolute inset-0 bg-gradient-to-r from-[#064e3b]/90 to-[#065f46]/90" />
            
            {/* Money Rain Effect */}
            <span className="absolute top-12 left-[10%] text-3xl opacity-15">💰</span>
            <span className="absolute top-20 right-[15%] text-3xl opacity-15">💰</span>
            <span className="absolute bottom-16 left-[20%] text-3xl opacity-15">💰</span>
            <span className="absolute bottom-8 right-[25%] text-3xl opacity-15">💰</span>
            <span className="absolute top-32 left-[35%] text-3xl opacity-15">💰</span>

            <h1 className="text-white text-5xl md:text-6xl font-black relative z-10 drop-shadow-2xl" style={{ textShadow: "0 0 40px rgba(16,185,129,0.9), 0 4px 8px rgba(0,0,0,0.8)" }}>
              Refer Friends. Earn Forever.
            </h1>
            <p className="text-emerald-100 text-xl font-black mt-3 relative z-10 drop-shadow-lg">
              Get 5% on first deposits. 0.5% on every deposit after that. Forever.
            </p>
          </div>

          <div className="max-w-4xl mx-auto px-4 py-12">
            {loading ? (
              <div className="text-zinc-500 text-sm text-center py-20">Loading...</div>
            ) : !userId ? (
              <div className="rounded-3xl bg-white/5 border border-white/10 p-12 text-center backdrop-blur-md">
                <h2 className="text-2xl font-bold text-white mb-4">Ready to start earning?</h2>
                <p className="text-zinc-400 mb-8">Sign in to see your referral link and track your earnings.</p>
                <Link href="/auth" className="inline-block rounded-2xl bg-emerald-500 px-10 py-4 font-black text-black hover:bg-emerald-400 transition-colors">
                  Sign in to see your referral link
                </Link>
              </div>
            ) : (
              <div className="space-y-8">
                {/* SECTION A — Stats row */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="rounded-2xl bg-emerald-900/40 border border-emerald-400/40 p-6 text-center backdrop-blur-md shadow-xl shadow-emerald-900/30">
                    <div className="text-4xl font-black text-emerald-400">{referralCount}</div>
                    <div className="text-sm font-bold text-emerald-200 mt-1 uppercase tracking-wider">Friends Referred</div>
                  </div>
                  <div className="rounded-2xl bg-emerald-900/40 border border-emerald-400/40 p-6 text-center backdrop-blur-md shadow-xl shadow-emerald-900/30">
                    <div className="text-4xl font-black text-emerald-400">₦{totalEarned}</div>
                    <div className="text-sm font-bold text-emerald-200 mt-1 uppercase tracking-wider">Total Earned</div>
                  </div>
                  <div className="rounded-2xl bg-emerald-900/40 border border-emerald-400/40 p-6 text-center backdrop-blur-md shadow-xl shadow-emerald-900/30">
                    <div className="text-4xl font-black text-emerald-400">₦0</div>
                    <div className="text-sm font-bold text-emerald-200 mt-1 uppercase tracking-wider">Pending Bonus</div>
                  </div>
                </div>

                {/* Friends Referred List */}
                {referees.length > 0 && (
                  <div className="rounded-3xl bg-white/5 border border-white/10 p-8 backdrop-blur-md">
                    <h3 className="text-xl font-black text-white mb-6 uppercase tracking-widest text-zinc-500">Friends you've referred:</h3>
                    <div className="space-y-3">
                      {referees.map((r) => {
                        const name = r.profiles?.display_name || (r.profiles?.email ? r.profiles.email.split("@")[0] : "Anonymous");
                        const daysAgo = Math.floor((Date.now() - new Date(r.created_at).getTime()) / (1000 * 60 * 60 * 24));
                        const timeText = daysAgo === 0 ? "Joined today" : daysAgo === 1 ? "Joined 1 day ago" : `Joined ${daysAgo} days ago`;

                        return (
                          <div key={r.id} className="flex items-center justify-between rounded-xl bg-white/5 border border-white/10 px-4 py-3">
                            <div>
                              <p className="text-sm font-bold text-white">{name}</p>
                              <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider mt-0.5">{timeText}</p>
                            </div>
                            <div>
                              {r.first_deposit_bonus_paid ? (
                                <span className="rounded-full bg-emerald-500/20 px-3 py-1 text-[10px] font-black text-emerald-400 border border-emerald-500/30">
                                  Bonus Earned ✓
                                </span>
                              ) : (
                                <span className="rounded-full bg-zinc-500/20 px-3 py-1 text-[10px] font-black text-zinc-400 border border-zinc-500/30">
                                  Awaiting first deposit
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* SECTION B — Your Referral Code */}
                <div className="space-y-3">
                  <label className="text-sm font-black text-emerald-300 uppercase tracking-widest">Your Referral Code</label>
                  <div className="rounded-xl bg-emerald-900/50 border-2 border-emerald-400/60 px-5 py-6 text-center text-4xl font-black tracking-[0.2em] text-emerald-300 backdrop-blur-sm shadow-lg shadow-emerald-900/40">
                    {code || "—"}
                  </div>
                </div>

                {/* SECTION C — Your Referral Link */}
                <div className="space-y-3">
                  <label className="text-sm font-black text-emerald-300 uppercase tracking-widest">Your Referral Link</label>
                  <div className="flex flex-col md:flex-row gap-3">
                    <div className="flex-1 rounded-xl bg-emerald-900/30 border border-emerald-400/30 px-5 py-4 text-sm font-semibold text-emerald-100 truncate backdrop-blur-sm flex items-center">
                      {referralLink}
                    </div>
                    <button 
                      onClick={copyLink} 
                      className="rounded-xl bg-emerald-500 px-8 py-4 font-black text-black hover:bg-emerald-400 transition-all shrink-0 active:scale-95"
                    >
                      {copied ? "Copied!" : "Copy Link"}
                    </button>
                  </div>
                </div>

                {/* SECTION D — How It Works */}
                <div className="rounded-3xl bg-emerald-900/30 border border-emerald-400/20 p-8 backdrop-blur-sm shadow-xl">
                  <h3 className="text-2xl font-black text-white mb-6">How It Works</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="flex gap-4">
                      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold">1</div>
                      <p className="text-base font-semibold text-emerald-100">Share your referral link with friends via social media or DM.</p>
                    </div>
                    <div className="flex gap-4">
                      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold">2</div>
                      <p className="text-base font-semibold text-emerald-100">They sign up using your unique link and join the arena.</p>
                    </div>
                    <div className="flex gap-4">
                      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold">3</div>
                      <p className="text-base font-semibold text-emerald-100">They make their first deposit to start competing in battles.</p>
                    </div>
                    <div className="flex gap-4">
                      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold">4</div>
                      <p className="text-base font-semibold text-emerald-100">You earn <span className="text-emerald-400 font-bold">5%</span> of their first deposit instantly + <span className="text-emerald-400 font-bold">0.5%</span> on every future deposit forever.</p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </PageShell>
      </div>
    </div>
  );
}
