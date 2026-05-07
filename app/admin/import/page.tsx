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

const SUBJECT_OPTIONS = [
  { value: "maths", label: "Maths" },
  { value: "english", label: "English" },
  { value: "physics", label: "Physics" },
  { value: "chemistry", label: "Chemistry" },
  { value: "biology", label: "Biology" },
  { value: "government", label: "Government" },
  { value: "economics", label: "Economics" },
  { value: "agricultural_science", label: "Agricultural Science" },
  { value: "current_affairs", label: "Current Affairs" },
] as const;

const EXAM_TYPE_OPTIONS = [
  "JAMB",
  "WAEC",
  "NECO",
  "Nigeria Current Affairs",
  "Africa Current Affairs",
  "Global Current Affairs",
] as const;

const CORRECT_OPTIONS = ["A", "B", "C", "D"] as const;

type ManualForm = {
  subject: string;
  exam_type: string;
  question: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  correct_answer: string;
  explanation: string;
  year: string;
};

const emptyManual = (): ManualForm => ({
  subject: "maths",
  exam_type: "JAMB",
  question: "",
  option_a: "",
  option_b: "",
  option_c: "",
  option_d: "",
  correct_answer: "A",
  explanation: "",
  year: "",
});

export default function AdminImportPage() {
  const [secret, setSecret] = useState("");
  const [csv, setCsv] = useState("");
  const [busy, setBusy] = useState(false);
  const [manualBusy, setManualBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [manualMsg, setManualMsg] = useState<string | null>(null);
  const [manual, setManual] = useState<ManualForm>(emptyManual);

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

  const saveManual = async (e: React.FormEvent) => {
    e.preventDefault();
    setManualBusy(true);
    setManualMsg(null);
    try {
      const yearTrim = manual.year.trim();
      const payload: Record<string, unknown> = {
        subject: manual.subject,
        exam_type: manual.exam_type,
        question: manual.question,
        option_a: manual.option_a,
        option_b: manual.option_b,
        option_c: manual.option_c,
        option_d: manual.option_d,
        correct_answer: manual.correct_answer,
        explanation: manual.explanation,
      };
      if (yearTrim === "") {
        payload.year = null;
      } else {
        const y = parseInt(yearTrim, 10);
        if (!Number.isFinite(y)) {
          setManualMsg("Year must be empty or a valid number.");
          return;
        }
        payload.year = y;
      }

      const res = await fetch("/api/admin/question", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-admin-secret": secret.trim(),
        },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        setManualMsg(data.error ?? "Save failed.");
        return;
      }
      setManualMsg("Question saved successfully.");
      setManual(emptyManual());
    } catch (e: unknown) {
      setManualMsg(e instanceof Error ? e.message : "Save failed.");
    } finally {
      setManualBusy(false);
    }
  };

  const inputClass =
    "mt-2 w-full rounded-xl border border-white/10 bg-[#161627] px-4 py-3 text-sm text-white outline-none placeholder:text-zinc-500 focus:border-[#7c3aed]/55";
  const labelClass =
    "text-xs font-semibold uppercase tracking-wide text-[#f59e0b]";

  return (
    <div className="min-h-screen bg-[#0f0f1a] px-4 py-10 text-zinc-100">
      <div className="mx-auto max-w-3xl space-y-12">
        <header>
          <h1 className="text-3xl font-extrabold text-white">
            Admin · Questions
          </h1>
          <p className="mt-2 text-sm text-zinc-400">
            Manual entry or CSV bulk import. Requires{" "}
            <code className="text-[#f59e0b]">ADMIN_IMPORT_SECRET</code> and{" "}
            <code className="text-zinc-300">SUPABASE_SERVICE_ROLE_KEY</code> on
            the server.
          </p>
        </header>

        <div>
          <label className={labelClass}>Admin secret</label>
          <input
            type="password"
            autoComplete="off"
            value={secret}
            onChange={(e) => setSecret(e.target.value)}
            className={inputClass}
            placeholder="Same value as ADMIN_IMPORT_SECRET env"
          />
        </div>

        <section className="rounded-3xl border border-white/10 bg-[#161627]/40 p-6 shadow-xl">
          <h2 className="text-lg font-extrabold text-white">
            Enter question manually
          </h2>
          <p className="mt-1 text-sm text-zinc-500">
            Saves one row to the{" "}
            <code className="text-zinc-400">questions</code> table.
          </p>

          <form onSubmit={saveManual} className="mt-6 grid gap-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className={labelClass}>Subject</label>
                <select
                  value={manual.subject}
                  onChange={(e) =>
                    setManual((m) => ({ ...m, subject: e.target.value }))
                  }
                  className={inputClass}
                >
                  {SUBJECT_OPTIONS.map((s) => (
                    <option key={s.value} value={s.value}>
                      {s.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className={labelClass}>Exam Type</label>
                <select
                  value={manual.exam_type}
                  onChange={(e) =>
                    setManual((m) => ({ ...m, exam_type: e.target.value }))
                  }
                  className={inputClass}
                >
                  {EXAM_TYPE_OPTIONS.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className={labelClass}>Question</label>
              <textarea
                required
                value={manual.question}
                onChange={(e) =>
                  setManual((m) => ({ ...m, question: e.target.value }))
                }
                rows={4}
                className={inputClass}
                placeholder="Question text…"
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              {(
                ["option_a", "option_b", "option_c", "option_d"] as const
              ).map((key, i) => (
                <div key={key}>
                  <label className={labelClass}>Option {String.fromCharCode(65 + i)}</label>
                  <input
                    required
                    value={manual[key]}
                    onChange={(e) =>
                      setManual((m) => ({ ...m, [key]: e.target.value }))
                    }
                    className={inputClass}
                  />
                </div>
              ))}
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className={labelClass}>Correct Answer</label>
                <select
                  value={manual.correct_answer}
                  onChange={(e) =>
                    setManual((m) => ({
                      ...m,
                      correct_answer: e.target.value,
                    }))
                  }
                  className={inputClass}
                >
                  {CORRECT_OPTIONS.map((l) => (
                    <option key={l} value={l}>
                      {l}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className={labelClass}>Year</label>
                <input
                  type="number"
                  value={manual.year}
                  onChange={(e) =>
                    setManual((m) => ({ ...m, year: e.target.value }))
                  }
                  className={inputClass}
                  placeholder="Optional (e.g. 2024)"
                  min={1990}
                  max={2100}
                />
              </div>
            </div>

            <div>
              <label className={labelClass}>Explanation</label>
              <textarea
                value={manual.explanation}
                onChange={(e) =>
                  setManual((m) => ({ ...m, explanation: e.target.value }))
                }
                rows={3}
                className={inputClass}
                placeholder="Optional explanation…"
              />
            </div>

            {manualMsg && (
              <p
                className={`rounded-xl border px-4 py-3 text-sm ${
                  manualMsg.startsWith("Question saved")
                    ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-100"
                    : "border-red-500/35 bg-red-500/10 text-red-100"
                }`}
              >
                {manualMsg}
              </p>
            )}

            <button
              type="submit"
              disabled={manualBusy || !secret.trim()}
              className="rounded-xl bg-[#7c3aed] py-3.5 text-sm font-extrabold text-white shadow-lg shadow-[#7c3aed]/25 transition hover:bg-[#6d28d9] disabled:opacity-50"
            >
              {manualBusy ? "Saving…" : "Save Question"}
            </button>
          </form>
        </section>

        <section className="rounded-3xl border border-white/10 bg-[#161627]/40 p-6 shadow-xl">
          <h2 className="text-lg font-extrabold text-white">
            Bulk import (CSV)
          </h2>
          <p className="mt-1 text-sm text-zinc-500">
            Paste CSV with header row.
          </p>

          <div className="mt-6 space-y-4">
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
        </section>

        <p className="text-center text-xs text-zinc-500">
          <Link href="/" className="hover:text-white">
            Home
          </Link>
        </p>
      </div>
    </div>
  );
}
