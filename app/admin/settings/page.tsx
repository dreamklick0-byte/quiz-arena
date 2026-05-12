"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { getSupabaseClient } from "@/lib/supabase";
import Link from "next/link";

export default function AdminSettingsPage() {
  const router = useRouter();
  const supabase = getSupabaseClient();
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);
  const [activeTab, setActiveTab] = useState("general");

  // Tab 1: General
  const [platformName, setPlatformName] = useState("Quiz Arena");
  const [minWithdrawal, setMinWithdrawal] = useState("500");
  const [maxWithdrawal, setMaxWithdrawal] = useState("50000");

  // Tab 2: Battle & Spin
  const [stakeOptions, setStakeOptions] = useState("100,200,300,500,1000,2000");
  const [spinPrizes, setSpinPrizes] = useState("20,50,70,100,30,110,60");
  const [dailySpinCooldown, setDailySpinCooldown] = useState("24");

  // Tab 3: Referral
  const [referralFirst, setReferralFirst] = useState("5");
  const [referralOngoing, setReferralOngoing] = useState("0.5");

  // Tab 4: XP & Coins
  const [xpPerWin, setXpPerWin] = useState("50");
  const [xpPerBattle, setXpPerBattle] = useState("10");
  const [coinsPerWin, setCoinsPerWin] = useState("20");

  // Tab 5: Messages
  const [users, setUsers] = useState<{ id: string; display_name: string }[]>([]);
  const [msgTarget, setMsgTarget] = useState("all");
  const [msgUserId, setMsgUserId] = useState("");
  const [msgTitle, setMsgTitle] = useState("");
  const [msgBody, setMsgBody] = useState("");
  const [sentMessages, setSentMessages] = useState<any[]>([]);

  // Tab 6: Maintenance
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [maintenanceMsg, setMaintenanceMsg] = useState("We are currently performing maintenance. We'll be back shortly!");

  const showToast = (msg: string, ok: boolean) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3500);
  };

  const fetchSettings = async () => {
    setLoading(true);
    const { data: settings } = await supabase.from("platform_settings").select("*");
    if (settings) {
      settings.forEach((s: any) => {
        switch (s.key) {
          case "platform_name": setPlatformName(s.value); break;
          case "min_withdrawal": setMinWithdrawal(s.value); break;
          case "max_withdrawal": setMaxWithdrawal(s.value); break;
          case "stake_options": setStakeOptions(s.value); break;
          case "spin_prizes": setSpinPrizes(s.value); break;
          case "spin_cooldown": setDailySpinCooldown(s.value); break;
          case "referral_first": setReferralFirst(s.value); break;
          case "referral_ongoing": setReferralOngoing(s.value); break;
          case "xp_per_win": setXpPerWin(s.value); break;
          case "xp_per_battle": setXpPerBattle(s.value); break;
          case "coins_per_win": setCoinsPerWin(s.value); break;
          case "maintenance_mode": setMaintenanceMode(s.value === "true"); break;
          case "maintenance_msg": setMaintenanceMsg(s.value); break;
        }
      });
    }

    // Fetch users for message targeting
    const { data: profileList } = await supabase.from("profiles").select("id, display_name").limit(100);
    if (profileList) setUsers(profileList);

    // Fetch last 20 messages
    const { data: msgs } = await supabase
      .from("user_notifications")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(20);
    if (msgs) setSentMessages(msgs);

    setLoading(false);
  };

  useEffect(() => {
    const checkAdmin = async () => {
      const res = await fetch("/api/admin/me");
      const data = await res.json();
      if (!data.success) { router.push("/admin/login"); return; }
      fetchSettings();
    };
    checkAdmin();
  }, []);

  const saveSetting = async (key: string, value: string) => {
    setBusy(true);
    const { error } = await supabase
      .from("platform_settings")
      .upsert({ key, value, updated_at: new Date().toISOString() }, { onConflict: "key" });
    
    if (error) {
      showToast(`Failed to save ${key}`, false);
    } else {
      showToast(`${key.replace("_", " ")} saved!`, true);
    }
    setBusy(false);
  };

  const sendMessage = async () => {
    if (!msgTitle || !msgBody) return showToast("Title and Body required", false);
    setBusy(true);

    try {
      if (msgTarget === "all") {
        // In a real scenario, this would likely be an Edge Function or handled via a trigger
        // For this UI implementation, we'll fetch all IDs and insert
        const { data: allUsers } = await supabase.from("profiles").select("id");
        if (allUsers) {
          const notifications = allUsers.map(u => ({
            user_id: u.id,
            title: msgTitle,
            body: msgBody,
            read: false
          }));
          const { error } = await supabase.from("user_notifications").insert(notifications);
          if (error) throw error;
        }
      } else {
        if (!msgUserId) throw new Error("Please select a user");
        const { error } = await supabase.from("user_notifications").insert({
          user_id: msgUserId,
          title: msgTitle,
          body: msgBody,
          read: false
        });
        if (error) throw error;
      }
      showToast("Message sent successfully", true);
      setMsgTitle("");
      setMsgBody("");
      fetchSettings();
    } catch (e: any) {
      showToast(e.message || "Failed to send message", false);
    }
    setBusy(false);
  };

  if (loading) return <div className="min-h-screen bg-[#0f0f1a] flex items-center justify-center text-zinc-500">Loading settings...</div>;

  return (
    <div className="min-h-screen bg-[#0f0f1a] text-white px-4 py-8">
      <div className="max-w-4xl mx-auto">
        {toast && (
          <div className={`fixed top-4 right-4 z-50 rounded-xl px-6 py-3 font-bold text-sm shadow-xl ${toast.ok ? "bg-emerald-500 text-black" : "bg-red-500 text-white"}`}>
            {toast.msg}
          </div>
        )}

        <div className="mb-8">
          <Link href="/admin" className="text-zinc-500 text-sm hover:text-white">← Back to Dashboard</Link>
          <h1 className="text-3xl font-black text-white mt-1">Platform Settings</h1>
          <p className="text-zinc-400 text-sm mt-1">Configure global application parameters and systems.</p>
        </div>

        {/* Tabs */}
        <div className="flex flex-wrap gap-2 mb-8 bg-white/5 p-1 rounded-2xl border border-white/10">
          {["general", "battle", "referral", "xp", "messages", "maintenance"].map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-5 py-2.5 rounded-xl text-sm font-bold transition-all ${activeTab === tab ? "bg-[#7c3aed] text-white shadow-lg" : "text-zinc-400 hover:text-white hover:bg-white/5"}`}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1).replace("battle", "Battle & Spin").replace("xp", "XP & Coins")}
            </button>
          ))}
        </div>

        <div className="space-y-6">
          {/* General Tab */}
          {activeTab === "general" && (
            <div className="bg-[#1a1a2e] rounded-2xl border border-white/10 p-6 space-y-6">
              <div>
                <label className="block text-xs font-black text-zinc-500 uppercase tracking-wider mb-2">Platform Name</label>
                <div className="flex gap-3">
                  <input value={platformName} onChange={e => setPlatformName(e.target.value)} className="flex-1 rounded-xl bg-white/5 border border-white/10 px-4 py-3 text-sm" />
                  <button onClick={() => saveSetting("platform_name", platformName)} disabled={busy} className="bg-[#7c3aed] px-6 rounded-xl font-bold text-sm">Save</button>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="block text-xs font-black text-zinc-500 uppercase tracking-wider mb-2">Min Withdrawal (₦)</label>
                  <input value={minWithdrawal} onChange={e => setMinWithdrawal(e.target.value)} type="number" className="w-full rounded-xl bg-white/5 border border-white/10 px-4 py-3 text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-black text-zinc-500 uppercase tracking-wider mb-2">Max Withdrawal (₦)</label>
                  <input value={maxWithdrawal} onChange={e => setMaxWithdrawal(e.target.value)} type="number" className="w-full rounded-xl bg-white/5 border border-white/10 px-4 py-3 text-sm" />
                </div>
              </div>
              <button onClick={() => { saveSetting("min_withdrawal", minWithdrawal); saveSetting("max_withdrawal", maxWithdrawal); }} disabled={busy} className="w-full bg-[#7c3aed] py-3 rounded-xl font-bold text-sm">Save Limits</button>
            </div>
          )}

          {/* Battle & Spin Tab */}
          {activeTab === "battle" && (
            <div className="bg-[#1a1a2e] rounded-2xl border border-white/10 p-6 space-y-6">
              <div>
                <label className="block text-xs font-black text-zinc-500 uppercase tracking-wider mb-2">Battle Stake Options (Comma separated)</label>
                <input value={stakeOptions} onChange={e => setStakeOptions(e.target.value)} className="w-full rounded-xl bg-white/5 border border-white/10 px-4 py-3 text-sm mb-2" />
                <button onClick={() => saveSetting("stake_options", stakeOptions)} disabled={busy} className="bg-[#7c3aed] px-6 py-2 rounded-xl font-bold text-sm">Save Stakes</button>
              </div>
              <div>
                <label className="block text-xs font-black text-zinc-500 uppercase tracking-wider mb-2">Spin Prize Pool (Comma separated coins)</label>
                <input value={spinPrizes} onChange={e => setSpinPrizes(e.target.value)} className="w-full rounded-xl bg-white/5 border border-white/10 px-4 py-3 text-sm mb-2" />
                <button onClick={() => saveSetting("spin_prizes", spinPrizes)} disabled={busy} className="bg-[#7c3aed] px-6 py-2 rounded-xl font-bold text-sm">Save Prizes</button>
              </div>
              <div>
                <label className="block text-xs font-black text-zinc-500 uppercase tracking-wider mb-2">Daily Spin Cooldown (Hours)</label>
                <div className="flex gap-3">
                  <input value={dailySpinCooldown} onChange={e => setDailySpinCooldown(e.target.value)} type="number" className="flex-1 rounded-xl bg-white/5 border border-white/10 px-4 py-3 text-sm" />
                  <button onClick={() => saveSetting("spin_cooldown", dailySpinCooldown)} disabled={busy} className="bg-[#7c3aed] px-6 rounded-xl font-bold text-sm">Save Cooldown</button>
                </div>
              </div>
            </div>
          )}

          {/* Referral Tab */}
          {activeTab === "referral" && (
            <div className="bg-[#1a1a2e] rounded-2xl border border-white/10 p-6 space-y-6">
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="block text-xs font-black text-zinc-500 uppercase tracking-wider mb-2">First Deposit Bonus (%)</label>
                  <input value={referralFirst} onChange={e => setReferralFirst(e.target.value)} type="number" className="w-full rounded-xl bg-white/5 border border-white/10 px-4 py-3 text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-black text-zinc-500 uppercase tracking-wider mb-2">Ongoing Commission (%)</label>
                  <input value={referralOngoing} onChange={e => setReferralOngoing(e.target.value)} type="number" step="0.1" className="w-full rounded-xl bg-white/5 border border-white/10 px-4 py-3 text-sm" />
                </div>
              </div>
              <button onClick={() => { saveSetting("referral_first", referralFirst); saveSetting("referral_ongoing", referralOngoing); }} disabled={busy} className="w-full bg-[#7c3aed] py-3 rounded-xl font-bold text-sm">Save Referral Rates</button>
            </div>
          )}

          {/* XP & Coins Tab */}
          {activeTab === "xp" && (
            <div className="bg-[#1a1a2e] rounded-2xl border border-white/10 p-6 space-y-6">
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-black text-zinc-500 uppercase tracking-wider mb-2">XP Per Win</label>
                  <input value={xpPerWin} onChange={e => setXpPerWin(e.target.value)} type="number" className="w-full rounded-xl bg-white/5 border border-white/10 px-4 py-3 text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-black text-zinc-500 uppercase tracking-wider mb-2">XP Per Battle</label>
                  <input value={xpPerBattle} onChange={e => setXpPerBattle(e.target.value)} type="number" className="w-full rounded-xl bg-white/5 border border-white/10 px-4 py-3 text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-black text-zinc-500 uppercase tracking-wider mb-2">Coins Per Win</label>
                  <input value={coinsPerWin} onChange={e => setCoinsPerWin(e.target.value)} type="number" className="w-full rounded-xl bg-white/5 border border-white/10 px-4 py-3 text-sm" />
                </div>
              </div>
              <button onClick={() => { 
                saveSetting("xp_per_win", xpPerWin); 
                saveSetting("xp_per_battle", xpPerBattle); 
                saveSetting("coins_per_win", coinsPerWin); 
              }} disabled={busy} className="w-full bg-[#7c3aed] py-3 rounded-xl font-bold text-sm">Save Rewards</button>
            </div>
          )}

          {/* Messages Tab */}
          {activeTab === "messages" && (
            <div className="space-y-6">
              <div className="bg-[#1a1a2e] rounded-2xl border border-white/10 p-6 space-y-4">
                <div className="flex gap-4 mb-2">
                  <button onClick={() => setMsgTarget("all")} className={`flex-1 py-2 rounded-xl text-xs font-bold border transition-all ${msgTarget === "all" ? "bg-white/10 border-white/20 text-white" : "border-transparent text-zinc-500 hover:text-zinc-300"}`}>Broadcast to All</button>
                  <button onClick={() => setMsgTarget("user")} className={`flex-1 py-2 rounded-xl text-xs font-bold border transition-all ${msgTarget === "user" ? "bg-white/10 border-white/20 text-white" : "border-transparent text-zinc-500 hover:text-zinc-300"}`}>Target Specific User</button>
                </div>
                
                {msgTarget === "user" && (
                  <select value={msgUserId} onChange={e => setMsgUserId(e.target.value)} className="w-full rounded-xl bg-white/5 border border-white/10 px-4 py-3 text-sm text-white">
                    <option value="">Select a user...</option>
                    {users.map(u => <option key={u.id} value={u.id} className="bg-[#1a1a2e]">{u.display_name || u.id}</option>)}
                  </select>
                )}

                <input placeholder="Message Title" value={msgTitle} onChange={e => setMsgTitle(e.target.value)} className="w-full rounded-xl bg-white/5 border border-white/10 px-4 py-3 text-sm" />
                <textarea placeholder="Write your message here..." value={msgBody} onChange={e => setMsgBody(e.target.value)} rows={4} className="w-full rounded-xl bg-white/5 border border-white/10 px-4 py-3 text-sm resize-none" />
                <button onClick={sendMessage} disabled={busy} className="w-full bg-blue-500 hover:bg-blue-600 py-3 rounded-xl font-black text-sm transition-all">{busy ? "Sending..." : "Send Notification"}</button>
              </div>

              <div className="bg-[#1a1a2e] rounded-2xl border border-white/10 p-6">
                <h3 className="text-xs font-black text-zinc-500 uppercase tracking-wider mb-4">Last 20 Sent Messages</h3>
                <div className="space-y-3">
                  {sentMessages.length === 0 ? <p className="text-zinc-600 text-xs italic text-center py-4">No messages sent yet.</p> : sentMessages.map(m => (
                    <div key={m.id} className="p-3 rounded-xl bg-white/5 border border-white/5">
                      <div className="flex justify-between items-start mb-1">
                        <span className="text-sm font-bold text-white">{m.title}</span>
                        <span className="text-[10px] text-zinc-500">{new Date(m.created_at).toLocaleString()}</span>
                      </div>
                      <p className="text-xs text-zinc-400 line-clamp-1">{m.body}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Maintenance Tab */}
          {activeTab === "maintenance" && (
            <div className="space-y-6">
              <div className="bg-[#1a1a2e] rounded-2xl border border-white/10 p-6 flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-black text-white">Maintenance Mode</h3>
                  <p className="text-zinc-500 text-xs">When active, users cannot play or access the platform.</p>
                </div>
                <button 
                  onClick={() => {
                    const next = !maintenanceMode;
                    setMaintenanceMode(next);
                    saveSetting("maintenance_mode", next.toString());
                  }} 
                  className={`w-16 h-8 rounded-full p-1 transition-all ${maintenanceMode ? "bg-red-500" : "bg-zinc-700"}`}
                >
                  <div className={`w-6 h-6 rounded-full bg-white transition-all transform ${maintenanceMode ? "translate-x-8" : "translate-x-0"}`} />
                </button>
              </div>

              <div className="bg-[#1a1a2e] rounded-2xl border border-white/10 p-6 space-y-4">
                <label className="block text-xs font-black text-zinc-500 uppercase tracking-wider mb-2">Custom Maintenance Message</label>
                <textarea 
                  value={maintenanceMsg} 
                  onChange={e => setMaintenanceMsg(e.target.value)} 
                  rows={3} 
                  className="w-full rounded-xl bg-white/5 border border-white/10 px-4 py-3 text-sm resize-none" 
                />
                <button onClick={() => saveSetting("maintenance_msg", maintenanceMsg)} disabled={busy} className="bg-[#7c3aed] px-8 py-2 rounded-xl font-bold text-sm">Save Message</button>
              </div>

              <div className="bg-[#0f0f1a] rounded-2xl border-2 border-dashed border-white/10 p-12 text-center">
                <h3 className="text-xs font-black text-zinc-600 uppercase tracking-wider mb-6">User Preview</h3>
                <div className="max-w-xs mx-auto">
                  <div className="w-16 h-16 bg-red-500/20 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-red-500/30">
                    <span className="text-2xl">⚠️</span>
                  </div>
                  <h4 className="text-xl font-black text-white mb-2">Under Maintenance</h4>
                  <p className="text-sm text-zinc-400 leading-relaxed">{maintenanceMsg}</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
