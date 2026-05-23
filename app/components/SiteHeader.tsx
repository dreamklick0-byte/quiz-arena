"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { getSupabaseClient } from "@/lib/supabase";
import { NotificationBell, NotificationCenter } from "./NotificationSystem";
import { LevelUpBanner } from "./GamificationUI";
import { useNotificationScheduler } from "./NotificationSettings";

export function SiteHeader() {
  const pathname = usePathname();
  const [email, setEmail] = useState<string | null>(null);
  const [streak, setStreak] = useState<number | null>(null);
  const [balance, setBalance] = useState<number | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  
  const { checkActivityAndSchedule } = useNotificationScheduler();

  useEffect(() => {
    const checkMe = async () => {
      try {
        const res = await fetch("/api/admin/me");
        const data = await res.json();
        setIsAdmin(data.success === true);
      } catch {
        setIsAdmin(false);
      }
    };

    checkMe();
    
    const supabase = getSupabaseClient();
    const fetchUserData = async (uid: string) => {
      try {
        // Fetch streak
        const { data: streakRow } = await supabase
          .from("user_streaks")
          .select("current_streak")
          .eq("user_id", uid)
          .maybeSingle();
        setStreak(typeof streakRow?.current_streak === "number" ? streakRow.current_streak : 0);

        // Fetch balance
        const { data: walletRow } = await supabase
          .from("wallets")
          .select("balance")
          .eq("user_id", uid)
          .maybeSingle();
        setBalance(typeof walletRow?.balance === "number" ? walletRow.balance : 0);
      } catch (err) {
        console.error("Error fetching user header data:", err);
      }
    };

    supabase.auth.getSession().then(({ data }) => {
      const user = data.session?.user;
      setEmail(user?.email ?? null);
      if (user?.id) {
        fetchUserData(user.id);
        checkActivityAndSchedule(user.id);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_evt, session) => {
      const user = session?.user;
      setEmail(user?.email ?? null);
      if (user?.id) {
        fetchUserData(user.id);
      } else {
        setStreak(null);
        setBalance(null);
      }
    });
    
    return () => {
      subscription.unsubscribe();
    };
  }, [pathname]);

  return ( 
     <header className="sticky top-0 z-40 border-b border-white/10 bg-[#0f0f1a]/90 backdrop-blur-md"> 
       <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 text-xs font-medium"> 
         
         {/* Desktop nav */} 
         <nav className="hidden md:flex flex-wrap items-center gap-3 text-zinc-400"> 
           <Link href="/" className="transition hover:text-white">Home</Link> 
           <Link href="/practice" className="transition hover:text-white">Practice</Link> 
           <Link href="/battle" className="transition hover:text-[#f59e0b]">Battle</Link> 
           <Link href="/leaderboard" className="transition hover:text-[#f59e0b]">Leaderboard</Link> 
           <Link href="/league" className="transition hover:text-[#f59e0b]">League</Link> 
           <Link href="/players" className="transition hover:text-[#f59e0b]">Players Online</Link> 
           <Link href="/referral" className="transition hover:text-emerald-400 text-emerald-500 font-semibold">💰 Refer & Earn</Link> 
           <Link href="/spin" className="transition hover:text-[#f59e0b] text-[#f59e0b] font-semibold">🎡 Daily Spin</Link> 
           <Link href="/rank" style={{ color: '#f59e0b', fontWeight: 'bold' }}> 
             🏆 My Rank 
           </Link> 
           {isAdmin && ( 
             <Link href="/admin" className="transition hover:text-zinc-300 font-bold text-[#7c3aed]">Admin</Link> 
           )} 
         </nav> 
 
         {/* Mobile: logo/brand + hamburger */} 
         <div className="flex md:hidden items-center gap-2"> 
           <button 
             onClick={() => setMenuOpen(!menuOpen)} 
             className="flex flex-col justify-center items-center w-8 h-8 gap-1.5 text-zinc-300 hover:text-white" 
             aria-label="Toggle menu" 
           > 
             <span className={`block h-0.5 w-6 bg-current transition-all duration-300 ${menuOpen ? 'rotate-45 translate-y-2' : ''}`} /> 
             <span className={`block h-0.5 w-6 bg-current transition-all duration-300 ${menuOpen ? 'opacity-0' : ''}`} /> 
             <span className={`block h-0.5 w-6 bg-current transition-all duration-300 ${menuOpen ? '-rotate-45 -translate-y-2' : ''}`} /> 
           </button> 
           <Link href="/" className="text-sm font-bold text-white">Quiz Arena</Link> 
         </div> 
 
         {/* Right side: wallet, streak, account */} 
         <div className="flex shrink-0 items-center gap-2"> 
           {typeof balance === "number" && ( 
             <Link href="/account/wallet" className="rounded-full border border-emerald-500/40 bg-emerald-500/15 px-2.5 py-1 text-[11px] font-bold text-emerald-400 transition hover:bg-emerald-500/25"> 
               ₦{balance.toLocaleString()} 
             </Link> 
           )} 
           {typeof streak === "number" && streak > 0 && ( 
             <Link href="/account" title="Study streak" className="hidden rounded-full border border-[#f59e0b]/40 bg-[#f59e0b]/15 px-2.5 py-1 text-[11px] font-bold text-[#f59e0b] sm:inline"> 
               🔥 {streak} 
             </Link> 
           )} 
           
           <NotificationBell onClick={() => setNotifOpen(true)} />

           {email ? ( 
             <> 
               <span className="hidden max-w-[140px] truncate text-zinc-500 sm:inline">{email}</span> 
               <Link href="/account" className="rounded-lg border border-white/15 px-3 py-1.5 text-[11px] font-semibold text-white transition hover:border-[#7c3aed]/50">Account</Link> 
             </> 
           ) : ( 
             <Link href="/auth" className="rounded-lg bg-[#7c3aed] px-3 py-1.5 text-[11px] font-semibold text-white shadow-sm transition hover:bg-[#6d28d9]">Sign in</Link> 
           )} 
         </div> 
       </div> 
 
       <NotificationCenter isOpen={notifOpen} onClose={() => setNotifOpen(false)} />
       <LevelUpBanner />

       {/* Mobile dropdown menu */} 
       {menuOpen && ( 
         <div className="md:hidden border-t border-white/10 bg-[#0f0f1a]/95 px-4 py-3 flex flex-col gap-3 text-sm text-zinc-400"> 
           <Link href="/" onClick={() => setMenuOpen(false)} className="hover:text-white transition">Home</Link> 
           <Link href="/practice" onClick={() => setMenuOpen(false)} className="hover:text-white transition">Practice</Link> 
           <Link href="/battle" onClick={() => setMenuOpen(false)} className="hover:text-[#f59e0b] transition">Battle</Link> 
           <Link href="/leaderboard" onClick={() => setMenuOpen(false)} className="hover:text-[#f59e0b] transition">Leaderboard</Link> 
           <Link href="/league" onClick={() => setMenuOpen(false)} className="hover:text-[#f59e0b] transition">League</Link> 
           <hr className="border-white/10" /> 
           <Link href="/players" onClick={() => setMenuOpen(false)} className="hover:text-[#f59e0b] transition">👥 Players Online</Link> 
           <Link href="/referral" onClick={() => setMenuOpen(false)} className="text-emerald-500 font-semibold hover:text-emerald-400 transition">💰 Refer & Earn</Link> 
           <Link href="/spin" onClick={() => setMenuOpen(false)} className="text-[#f59e0b] font-semibold hover:text-yellow-300 transition">🎡 Daily Spin</Link> 
           <Link href="/rank" onClick={() => setMenuOpen(false)} style={{ color: '#f59e0b', fontWeight: 'bold' }}> 
             🏆 My Rank 
           </Link> 
           {isAdmin && ( 
             <Link href="/admin" onClick={() => setMenuOpen(false)} className="text-[#7c3aed] font-bold hover:text-zinc-300 transition">Admin</Link> 
           )} 
         </div> 
       )} 
     </header> 
   ); 

}