"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { PageShell } from "@/app/components/PageShell";

export default function AdminLoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [mustChangePassword, setMustChangePassword] = useState(false);
  const [newPassword, setNewPassword] = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);

    try {
      const res = await fetch("/api/admin/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      const data = await res.json();

      if (res.ok) {
        if (data.mustChangePassword) {
          setMustChangePassword(true);
          setBusy(false);
          return;
        }
        router.push("/admin");
        router.refresh();
      } else {
        setError(data.message || "Invalid credentials. Access denied.");
      }
    } catch {
      setError("An unexpected error occurred. Please try again.");
    } finally {
      if (!mustChangePassword) setBusy(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);

    try {
      const res = await fetch("/api/admin/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ newPassword }),
      });

      if (res.ok) {
        router.push("/admin");
        router.refresh();
      } else {
        const data = await res.json();
        setError(data.error || "Failed to update password.");
      }
    } catch {
      setError("An unexpected error occurred.");
    } finally {
      setBusy(false);
    }
  };

  if (mustChangePassword) {
    return (
      <PageShell overlay="#0f0f0f">
        <div className="flex min-h-screen items-center justify-center px-4 py-12">
          <div className="w-full max-w-md rounded-3xl border border-amber-500/30 bg-[#161627]/50 p-8 shadow-2xl backdrop-blur-xl">
            <div className="flex flex-col items-center text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-500/10 text-3xl">
                🔑
              </div>
              <h1 className="mt-6 text-2xl font-black text-white tracking-tight">First Login Security</h1>
              <p className="mt-2 text-sm text-zinc-500 font-medium">Please set a new permanent password</p>
            </div>

            <form onSubmit={handleChangePassword} className="mt-10 space-y-5">
              <div>
                <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">New Password</label>
                <input
                  required
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="mt-2 w-full rounded-2xl border border-white/10 bg-black/40 px-4 py-4 text-sm text-white outline-none focus:border-amber-500 transition-all"
                  placeholder="Minimum 8 characters"
                  minLength={8}
                />
              </div>

              {error && (
                <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-xs font-bold text-red-400 text-center">
                  {error}
                </div>
              )}

              <button
                disabled={busy}
                type="submit"
                className="mt-4 w-full rounded-2xl bg-amber-500 py-4 text-sm font-black uppercase tracking-widest text-white shadow-lg shadow-amber-500/20 transition hover:bg-amber-600 disabled:opacity-50"
              >
                {busy ? "Updating..." : "Update & Continue"}
              </button>
            </form>
          </div>
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell overlay="#0f0f0f">
      <div className="flex min-h-screen items-center justify-center px-4 py-12">
        <div className="w-full max-w-md rounded-3xl border border-[#7c3aed]/30 bg-[#161627]/50 p-8 shadow-2xl backdrop-blur-xl">
          <div className="flex flex-col items-center text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[#7c3aed]/10 text-3xl">
              🔐
            </div>
            <h1 className="mt-6 text-2xl font-black text-white tracking-tight">Admin Control Panel</h1>
            <p className="mt-2 text-sm text-zinc-500 font-medium">Restricted access — authorized personnel only</p>
          </div>

          <form onSubmit={handleLogin} className="mt-10 space-y-5">
            <div>
              <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">Username</label>
              <input
                required
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="mt-2 w-full rounded-2xl border border-white/10 bg-black/40 px-4 py-4 text-sm text-white outline-none focus:border-[#7c3aed] transition-all"
                placeholder="Enter admin username"
              />
            </div>

            <div>
              <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">Password</label>
              <div className="relative mt-2">
                <input
                  required
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-2xl border border-white/10 bg-black/40 px-4 py-4 text-sm text-white outline-none focus:border-[#7c3aed] transition-all"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white transition-colors"
                >
                  {showPassword ? "👁️" : "👁️‍🗨️"}
                </button>
              </div>
            </div>

            {error && (
              <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-xs font-bold text-red-400 text-center animate-shake">
                {error}
              </div>
            )}

            <button
              disabled={busy}
              type="submit"
              className="mt-4 w-full rounded-2xl bg-[#7c3aed] py-4 text-sm font-black uppercase tracking-widest text-white shadow-lg shadow-[#7c3aed]/20 transition hover:bg-[#6d28d9] disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {busy ? (
                <>
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/20 border-t-white" />
                  Checking...
                </>
              ) : (
                "Access Panel"
              )}
            </button>
          </form>
        </div>
      </div>
    </PageShell>
  );
}
