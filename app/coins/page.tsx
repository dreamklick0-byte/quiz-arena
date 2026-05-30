"use client"; 
 import { useEffect, useState } from "react"; 
 import { useRouter } from "next/navigation"; 
 import { getSupabaseClient } from "@/lib/supabase"; 
 import { COIN_ECONOMY, calcBattleCoinWithdrawal, calcRewardCoinWithdrawal } from "@/lib/coinEconomy"; 
 import { SiteHeader } from "@/app/components/SiteHeader"; 
 
 export default function CoinStorePage() { 
   const router = useRouter(); 
   const [userId, setUserId] = useState<string | null>(null); 
   const [battleCoins, setBattleCoins] = useState(0); 
   const [rewardCoins, setRewardCoins] = useState(0); 
   const [nairaBalance, setNairaBalance] = useState(0); 
   const [busy, setBusy] = useState(false); 
   const [battleWithdrawAmount, setBattleWithdrawAmount] = useState(0); 
   const [rewardWithdrawAmount, setRewardWithdrawAmount] = useState(0); 
   const [error, setError] = useState<string | null>(null); 
   const [success, setSuccess] = useState<string | null>(null); 
   const [transactions, setTransactions] = useState<any[]>([]); 
   const [activeTab, setActiveTab] = useState<'buy' | 'withdraw' | 'history'>('buy'); 
 
   useEffect(() => { 
     const sb = getSupabaseClient(); 
     sb.auth.getUser().then(async ({ data: { user } }) => { 
       if (!user) { router.push('/auth'); return; } 
       setUserId(user.id); 
       const [coinsRes, walletRes, txRes] = await Promise.all([ 
         fetch(`/api/coins/balance?userId=${user.id}`), 
         sb.from('wallets').select('balance').eq('user_id', user.id).maybeSingle(), 
         sb.from('coin_transactions').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(15) 
       ]); 
       const coinsData = await coinsRes.json(); 
       setBattleCoins(coinsData.battleCoins ?? 0); 
       setRewardCoins(coinsData.rewardCoins ?? 0); 
       setNairaBalance(Number(walletRes.data?.balance ?? 0)); 
       setTransactions(txRes.data ?? []); 
     }); 
   }, [router]); 
 
   async function handlePurchase(pkgIndex: number) { 
     if (!userId) return; 
     setBusy(true); setError(null); setSuccess(null); 
     try { 
       const res = await fetch('/api/coins/purchase', { 
         method: 'POST', 
         headers: { 'Content-Type': 'application/json' }, 
         body: JSON.stringify({ userId, packageIndex: pkgIndex }) 
       }); 
       const data = await res.json(); 
       if (!data.success) throw new Error(data.error); 
       const pkg = COIN_ECONOMY.PACKAGES[pkgIndex]; 
       setSuccess(`Successfully purchased ${data.coinsAdded} Battle Coins!`); 
       setBattleCoins(prev => prev + data.coinsAdded); 
       setNairaBalance(prev => prev - pkg.naira); 
     } catch (e: any) { setError(e.message); } 
     finally { setBusy(false); } 
   } 
 
   async function handleWithdraw(coinType: 'battle' | 'reward') { 
     if (!userId) return; 
     const amount = coinType === 'battle' ? battleWithdrawAmount : rewardWithdrawAmount; 
     if (amount < COIN_ECONOMY.MIN_WITHDRAWAL_COINS) { 
       setError(`Minimum withdrawal is ${COIN_ECONOMY.MIN_WITHDRAWAL_COINS} coins`); 
       return; 
     } 
     setBusy(true); setError(null); setSuccess(null); 
     try { 
       const res = await fetch('/api/coins/withdraw', { 
         method: 'POST', 
         headers: { 'Content-Type': 'application/json' }, 
         body: JSON.stringify({ userId, coinAmount: amount, coinType }) 
       }); 
       const data = await res.json(); 
       if (!data.success) throw new Error(data.error); 
       if (coinType === 'battle') { 
         setBattleCoins(prev => prev - amount); 
         setBattleWithdrawAmount(0); 
         setSuccess(`Converted ${amount} Battle Coins → ₦${data.nairaAdded} (25% fee applied)`); 
       } else { 
         setRewardCoins(prev => prev - amount); 
         setRewardWithdrawAmount(0); 
         setSuccess(`Converted ${amount} Reward Coins → ₦${data.nairaAdded} (no fee!)`); 
       } 
       setNairaBalance(prev => prev + data.nairaAdded); 
     } catch (e: any) { setError(e.message); } 
     finally { setBusy(false); } 
   } 
 
   const battleCalc = calcBattleCoinWithdrawal(battleWithdrawAmount || 0); 
   const rewardCalc = calcRewardCoinWithdrawal(rewardWithdrawAmount || 0); 
 
   return ( 
     <div className="min-h-screen bg-[#0f0f1a] text-white"> 
       <SiteHeader /> 
       <div className="max-w-3xl mx-auto px-4 py-10"> 
 
         <h1 className="text-3xl font-black text-white mb-2 text-center">🪙 Arena Coins</h1> 
         <p className="text-zinc-400 text-center text-sm mb-8">Your battle currency. Compete, win, and cash out.</p> 
 
         {/* Balance Cards */} 
         <div className="grid grid-cols-2 gap-4 mb-8"> 
           <div className="rounded-2xl border border-yellow-500/30 bg-yellow-500/10 p-5 text-center"> 
             <p className="text-yellow-400 text-xs font-bold uppercase tracking-widest mb-2">🟡 Battle Coins</p> 
             <p className="text-4xl font-black text-white">{battleCoins.toLocaleString()}</p> 
             <p className="text-xs text-zinc-500 mt-2">For entering battles</p> 
             <p className="text-xs text-zinc-500">Withdraw with 25% fee</p> 
           </div> 
           <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-5 text-center"> 
             <p className="text-emerald-400 text-xs font-bold uppercase tracking-widest mb-2">🟢 Reward Coins</p> 
             <p className="text-4xl font-black text-white">{rewardCoins.toLocaleString()}</p> 
             <p className="text-xs text-zinc-500 mt-2">Earned by winning</p> 
             <p className="text-xs text-emerald-400">Withdraw FREE — no fee</p> 
           </div> 
         </div> 
 
         <p className="text-center text-sm text-zinc-400 mb-8"> 
           Naira wallet: <span className="text-white font-bold">₦{nairaBalance.toLocaleString()}</span> 
           <button onClick={() => router.push('/account/wallet')} className="ml-3 text-xs text-purple-400 underline">Add Money</button> 
         </p> 
 
         {error && <div className="mb-4 rounded-xl bg-red-900/40 border border-red-500/40 px-4 py-3 text-red-300 text-sm">{error}</div>} 
         {success && <div className="mb-4 rounded-xl bg-emerald-900/40 border border-emerald-500/40 px-4 py-3 text-emerald-300 text-sm">{success}</div>} 
 
         {/* Tabs */} 
         <div className="flex gap-2 mb-8"> 
           {(['buy', 'withdraw', 'history'] as const).map(tab => ( 
             <button key={tab} onClick={() => setActiveTab(tab)} 
               className={`flex-1 rounded-xl py-2 text-sm font-bold capitalize transition ${activeTab === tab ? 'bg-purple-600 text-white' : 'bg-white/10 text-zinc-400 hover:bg-white/20'}`}> 
               {tab === 'buy' ? '🟡 Buy Coins' : tab === 'withdraw' ? '💸 Withdraw' : '📋 History'} 
             </button> 
           ))} 
         </div> 
 
         {/* Buy Tab */} 
         {activeTab === 'buy' && ( 
           <div className="grid grid-cols-2 gap-4"> 
             {COIN_ECONOMY.PACKAGES.map((pkg, i) => ( 
               <div key={i} className={`relative rounded-2xl border p-5 ${pkg.popular ? 'border-yellow-500/60 bg-yellow-500/10' : 'border-white/10 bg-white/5'}`}> 
                 {pkg.popular && <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-yellow-500 text-black text-xs font-black px-3 py-1 rounded-full">POPULAR</span>} 
                 <p className="font-black text-white text-base">{pkg.label}</p> 
                 <p className="text-3xl font-black text-yellow-400 my-2">{(pkg.battleCoins + pkg.bonus).toLocaleString()}</p> 
                 <p className="text-xs text-zinc-400 mb-1">{pkg.battleCoins.toLocaleString()} + <span className="text-emerald-400 font-bold">{pkg.bonus} bonus</span></p> 
                 <p className="text-sm font-bold text-white mb-4">₦{pkg.naira.toLocaleString()}</p> 
                 <button onClick={() => handlePurchase(i)} disabled={busy || nairaBalance < pkg.naira} 
                   className="w-full rounded-xl bg-yellow-500 text-black font-black py-2 text-sm hover:bg-yellow-400 disabled:opacity-40 transition"> 
                   {nairaBalance < pkg.naira ? 'Need more ₦' : 'Buy Now'} 
                 </button> 
               </div> 
             ))} 
           </div> 
         )} 
 
         {/* Withdraw Tab */} 
         {activeTab === 'withdraw' && ( 
           <div className="space-y-6"> 
             {/* Battle Coins Withdrawal */} 
             <div className="rounded-2xl border border-yellow-500/20 bg-yellow-500/5 p-6"> 
               <h3 className="text-base font-black text-yellow-400 mb-1">🟡 Withdraw Battle Coins</h3> 
               <p className="text-xs text-zinc-400 mb-4">25% platform fee applies. Your purchased coins are returned to naira minus the fee.</p> 
               <div className="flex gap-3 items-end mb-3"> 
                 <div className="flex-1"> 
                   <label className="text-xs text-zinc-400 uppercase tracking-widest mb-2 block">Amount (max {battleCoins.toLocaleString()})</label> 
                   <input type="number" value={battleWithdrawAmount || ''} onChange={e => setBattleWithdrawAmount(Number(e.target.value))} 
                     placeholder="Enter coins" max={battleCoins} 
                     className="w-full rounded-xl bg-white/10 border border-white/20 px-4 py-3 text-white placeholder:text-zinc-500 focus:outline-none focus:border-yellow-500" /> 
                 </div> 
                 <div className="text-right min-w-[100px]"> 
                   <p className="text-xs text-red-400 mb-1">Fee: {battleCalc.fee} coins</p> 
                   <p className="text-lg font-black text-white">₦{battleCalc.naira.toLocaleString()}</p> 
                 </div> 
               </div> 
               <button onClick={() => handleWithdraw('battle')} 
                 disabled={busy || battleCoins < COIN_ECONOMY.MIN_WITHDRAWAL_COINS || battleWithdrawAmount < COIN_ECONOMY.MIN_WITHDRAWAL_COINS || battleWithdrawAmount > battleCoins} 
                 className="w-full rounded-xl bg-yellow-600 text-white font-black py-3 hover:bg-yellow-500 disabled:opacity-40 transition text-sm"> 
                 {battleCoins < COIN_ECONOMY.MIN_WITHDRAWAL_COINS ? `Need ${COIN_ECONOMY.MIN_WITHDRAWAL_COINS} Battle Coins` : 'Withdraw Battle Coins'} 
               </button> 
             </div> 
 
             {/* Reward Coins Withdrawal */} 
             <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-6"> 
               <h3 className="text-base font-black text-emerald-400 mb-1">🟢 Withdraw Reward Coins</h3> 
               <p className="text-xs text-zinc-400 mb-4">Zero fee. Your winnings are fully yours. 100 coins = ₦80.</p> 
               <div className="flex gap-3 items-end mb-3"> 
                 <div className="flex-1"> 
                   <label className="text-xs text-zinc-400 uppercase tracking-widest mb-2 block">Amount (max {rewardCoins.toLocaleString()})</label> 
                   <input type="number" value={rewardWithdrawAmount || ''} onChange={e => setRewardWithdrawAmount(Number(e.target.value))} 
                     placeholder="Enter coins" max={rewardCoins} 
                     className="w-full rounded-xl bg-white/10 border border-white/20 px-4 py-3 text-white placeholder:text-zinc-500 focus:outline-none focus:border-emerald-500" /> 
                 </div> 
                 <div className="text-right min-w-[100px]"> 
                   <p className="text-xs text-emerald-400 mb-1">Fee: 0 coins ✓</p> 
                   <p className="text-lg font-black text-white">₦{rewardCalc.naira.toLocaleString()}</p> 
                 </div> 
               </div> 
               <button onClick={() => handleWithdraw('reward')} 
                 disabled={busy || rewardCoins < COIN_ECONOMY.MIN_WITHDRAWAL_COINS || rewardWithdrawAmount < COIN_ECONOMY.MIN_WITHDRAWAL_COINS || rewardWithdrawAmount > rewardCoins} 
                 className="w-full rounded-xl bg-emerald-600 text-white font-black py-3 hover:bg-emerald-500 disabled:opacity-40 transition text-sm"> 
                 {rewardCoins < COIN_ECONOMY.MIN_WITHDRAWAL_COINS ? `Need ${COIN_ECONOMY.MIN_WITHDRAWAL_COINS} Reward Coins` : 'Withdraw Reward Coins — Free'} 
               </button> 
             </div> 
           </div> 
         )} 
 
         {/* History Tab */} 
         {activeTab === 'history' && ( 
           <div className="space-y-2"> 
             {transactions.length === 0 && <p className="text-zinc-500 text-sm text-center py-8">No coin transactions yet.</p>} 
             {transactions.map((tx: any) => ( 
               <div key={tx.id} className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 flex justify-between items-center"> 
                 <div> 
                   <p className="text-sm font-bold text-white capitalize">{tx.type.replace(/_/g, ' ')}</p> 
                   <p className="text-xs text-zinc-400">{tx.description}</p> 
                   <p className="text-xs text-zinc-600">{new Date(tx.created_at).toLocaleDateString()}</p> 
                 </div> 
                 <div className="text-right"> 
                   {tx.battle_coins_change !== 0 && ( 
                     <p className={`text-sm font-black ${tx.battle_coins_change > 0 ? 'text-yellow-400' : 'text-red-400'}`}> 
                       {tx.battle_coins_change > 0 ? '+' : ''}{tx.battle_coins_change} 🟡 
                     </p> 
                   )} 
                   {tx.reward_coins_change !== 0 && ( 
                     <p className={`text-sm font-black ${tx.reward_coins_change > 0 ? 'text-emerald-400' : 'text-red-400'}`}> 
                       {tx.reward_coins_change > 0 ? '+' : ''}{tx.reward_coins_change} 🟢 
                     </p> 
                   )} 
                 </div> 
               </div> 
             ))} 
           </div> 
         )} 
 
       </div> 
     </div> 
   ); 
 } 
