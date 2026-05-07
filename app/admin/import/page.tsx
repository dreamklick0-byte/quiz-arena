"use client";

import Link from "next/link";
import { useState } from "react";

const SAMPLE_HEADERS = [
  "subject",
  "exam_type",
  "question",
  "option_a",
  "option_b",
  "option_c",
  "option_d",
  "correct_answer",
  "explanation",
  "year",
].join(",");

export default function AdminImportPage() {
  const [secret, setSecret] = useState("");
  const [csv, setCsv] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const runImport = async () => {
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch("/api/admin/import", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-admin-secret": secret.trim(),
        },
        body: JSON.stringify({ csv }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMsg(data.error ?? "Import failed.");
        return;
      }
      setMsg(`Inserted ${data.inserted} rows.`);
    } catch (e: unknown) {
      setMsg(e instanceof Error ? e.message : "Import failed.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0f0f1a] px-4 py-10 text-zinc-100">
      <div className="mx-auto max-w-3xl">
        <header>
          <h1 className="text-3xl font-extrabold text-white">
            Admin · Question import
          </h1>
          <p className="mt-2 text-sm text-zinc-400">
            Paste CSV (including header row). Requires{" "}
            <code className="text-[#f59e0b]">ADMIN_IMPORT_SECRET</code> and a
            service role key server-side (
            <code className="text-zinc-300">SUPABASE_SERVICE_ROLE_KEY</code>).
          </p>
        </header>

        <div className="mt-8 space-y-4">
          <div>
            <label className="text-xs font-semibold uppercase tracking-wide text-[#f59e0b]">
              Admin secret
            </label>
            <input
              type="password"
              autoComplete="off"
              value={secret}
              onChange={(e) => setSecret(e.target.value)}
              className="mt-2 w-full rounded-xl border border-white/10 bg-[#161627] px-4 py-3 text-sm outline-none focus:border-[#7c3aed]/55"
              placeholder="Same value as ADMIN_IMPORT_SECRET env"
            />
          </div>

          <div>
            <button
              type="button"
              onClick={() =>
                setCsv(
                  SAMPLE_HEADERS +
                    "\nmaths,JAMB,Sample?,1,2,3,4,B,Because.,2024",
                )
              }
              className="text-xs font-semibold text-[#7c3aed] underline"
            >
              Load sample header row
            </button>
            <textarea
              value={csv}
              onChange={(e) => setCsv(e.target.value)}
              rows={14}
              className="mt-2 w-full rounded-xl border border-white/10 bg-[#0f0f1a]/80 px-4 py-3 font-mono text-xs leading-relaxed text-zinc-200 outline-none focus:border-[#7c3aed]/55"
              spellCheck={false}
            />
          </div>

          {msg && (
            <p className="rounded-xl border border-white/10 bg-[#161627]/80 px-4 py-3 text-sm">
              {msg}
            </p>
          )}

          <button
            type="button"
            disabled={busy || !secret.trim() || !csv.trim()}
            onClick={runImport}
            className="w-full rounded-xl bg-[#f59e0b] py-3.5 text-sm font-extrabold text-[#1a1033] shadow-lg shadow-[#f59e0b]/20 transition hover:brightness-105 disabled:opacity-50"
          >
            {busy ? "Importing…" : "Upload to Supabase"}
          </button>
        </div>

        <p className="mt-10 text-center text-xs text-zinc-500">
          <Link href="/" className="hover:text-white">
            Home
          </Link>
        </p>
      </div>
    </div>
  );
}
