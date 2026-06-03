"use client";

import { useState } from "react";
import Link from "next/link";
import { FEATURES, PREVIEW_PASSWORD } from "@/lib/featureFlags";

const ALL_FEATURES = [
  // LIVE
  { name: "Home", href: "/", wave: "LIVE", color: "emerald" },
  { name: "Practice Mode", href: "/practice", wave: "LIVE", color: "emerald" },
  { name: "Battle", href: "/battle", wave: "LIVE", color: "emerald" },
  { name: "Leaderboard", href: "/leaderboard", wave: "LIVE", color: "emerald" },
  { name: "Leagues", href: "/league", wave: "LIVE", color: "emerald" },
  { name: "Refer & Earn", href: "/referral", wave: "LIVE", color: "emerald" },
  { name: "My Rank", href: "/rank", wave: "LIVE", color: "emerald" },
  { name: "Account", href: "/account", wave: "LIVE", color: "emerald" },
  { name: "Wallet", href: "/account/wallet", wave: "LIVE", color: "emerald" },
  { name: "School Leaderboard", href: "/school", wave: "LIVE", color: "emerald" },

  // WAVE 2
  { name: "Daily Spin & Win", href: "/spin", wave: "Wave 2 — Jul 5", color: "yellow" },
  { name: "Arena Coins", href: "/coins", wave: "Wave 2 — Jul 5", color: "yellow" },
  { name: "Players Online", href: "/players", wave: "Wave 2 — Jul 5", color: "yellow" },
  { name: "Missions Board", href: "/missions", wave: "Wave 2 — Jul 5", color: "yellow" },

  // WAVE 3
  { name: "Hall of Fame", href: "/hall-of-fame", wave: "Wave 3 — Aug 2", color: "orange" },
  { name: "Certificate Generator", href: "/certificate?type=student&name=Test%20Student&school=Test%20School&month=July&year=2026&wins=25&accuracy=92&rank=1st&cert=QA-TEST-001", wave: "Wave 3 — Aug 2", color: "orange" },
  { name: "School Admin Login", href: "/school/login", wave: "Wave 3 — Aug 2", color: "orange" },
  { name: "School Dashboard", href: "/school/dashboard", wave: "Wave 3 — Aug 2", color: "orange" },

  // WAVE 4
  { name: "Streak System", href: "/account", wave: "Wave 4 — Aug 30", color: "purple" },

  // ADMIN
  { name: "Platform Admin", href: "/admin", wave: "ADMIN", color: "red" },
  { name: "Admin Users", href: "/admin/users", wave: "ADMIN", color: "red" },
  { name: "Admin Questions", href: "/admin/questions", wave: "ADMIN", color: "red" },
  { name: "Admin Leagues", href: "/admin/leagues", wave: "ADMIN", color: "red" },
  { name: "Admin Withdrawals", href: "/admin/withdrawals", wave: "ADMIN", color: "red" },
];

const WAVE_ORDER = ["LIVE", "Wave 2 — Jul 5", "Wave 3 — Aug 2", "Wave 4 — Aug 30", "Wave 5 — Sep 27", "ADMIN"];

export default function PreviewPage() {
  const [password, setPassword] = useState("");
  const [unlocked, setUnlocked] = useState(false);
  const [error, setError] = useState("");

  const handleUnlock = () => {
    if (password === PREVIEW_PASSWORD) {
      setUnlocked(true);
      setError("");
    } else {
      setError("Incorrect password");
    }
  };

  if (!unlocked) {
    return (
      <div className="min-h-screen bg-[#0f0f1a] flex items-center justify-center px-4">
        <div className="w-full max-w-sm">
          <div className="text-center mb-8">
            <p className="text-4xl mb-3">🔐</p>
            <h1 className="text-2xl font-black text-white">Admin Preview</h1>
            <p className="text-zinc-500 text-sm mt-2">Quiz Arena internal feature preview</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-[#161627] p-6 space-y-4">
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleUnlock()}
              placeholder="Enter preview password"
              className="w-full rounded-xl border border-white/10 bg-[#0f0f1a] px-4 py-3 text-sm text-white outline-none focus:border-purple-500/50"
            />
            {error && <p className="text-red-400 text-xs">{error}</p>}
            <button
              onClick={handleUnlock}
              className="w-full rounded-xl bg-purple-600 hover:bg-purple-500 py-3 text-sm font-black text-white transition"
            >
              Unlock Preview
            </button>
          </div>
        </div>
      </div>
    );
  }

  const colorMap: Record<string, string> = {
    emerald: "border-emerald-500/30 bg-emerald-500/10 text-emerald-400",
    yellow: "border-yellow-500/30 bg-yellow-500/10 text-yellow-400",
    orange: "border-orange-500/30 bg-orange-500/10 text-orange-400",
    purple: "border-purple-500/30 bg-purple-500/10 text-purple-400",
    red: "border-red-500/30 bg-red-500/10 text-red-400",
  };

  const waves = [...new Set(ALL_FEATURES.map(f => f.wave))];

  return (
    <div className="min-h-screen bg-[#0f0f1a] text-zinc-100 px-4 py-10">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-10">
          <p className="text-4xl mb-3">🚀</p>
          <h1 className="text-3xl font-black text-white">Quiz Arena Feature Preview</h1>
          <p className="text-zinc-500 text-sm mt-2">Internal admin view — all features including unreleased ones</p>
        </div>

        <div className="mb-8 rounded-2xl border border-white/10 bg-[#161627] p-5">
          <h2 className="font-black text-white mb-3 text-sm uppercase tracking-wider">Current Flag Status</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
            {Object.entries(FEATURES).map(([key, value]) => (
              <div key={key} className={"rounded-lg px-3 py-2 border " + (value ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400" : "border-white/10 bg-white/5 text-zinc-500")}>
                {value ? "✅" : "🔒"} {key}
              </div>
            ))}
          </div>
        </div>

        {waves.map(wave => (
          <div key={wave} className="mb-8">
            <h2 className="font-black text-white mb-4 text-sm uppercase tracking-wider border-b border-white/10 pb-2">
              {wave === "LIVE" ? "✅ Live at Launch" : wave === "ADMIN" ? "⚙️ Admin Only" : "🔒 " + wave}
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {ALL_FEATURES.filter(f => f.wave === wave).map(feature => (
                <Link
                  key={feature.href}
                  href={feature.href}
                  className={"rounded-xl border p-4 transition hover:opacity-80 " + colorMap[feature.color]}
                >
                  <div className="font-bold text-sm">{feature.name}</div>
                  <div className="text-xs opacity-70 mt-0.5">{feature.href}</div>
                </Link>
              ))}
            </div>
          </div>
        ))}

        <div className="mt-10 rounded-2xl border border-yellow-500/20 bg-yellow-500/5 p-5">
          <h3 className="font-black text-yellow-400 mb-2 text-sm">How to launch a new wave</h3>
          <p className="text-xs text-zinc-400 leading-relaxed">
            Open <span className="text-purple-400 font-mono">lib/featureFlags.ts</span> and change the feature flags from <span className="text-red-400">false</span> to <span className="text-emerald-400">true</span> for the wave you are launching. Then commit and deploy. The nav links will appear automatically for all users.
          </p>
        </div>
      </div>
    </div>
  );
}
