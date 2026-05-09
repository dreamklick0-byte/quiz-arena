"use client";

import { useState } from "react";
import { PageShell } from "@/app/components/PageShell";
import Link from "next/link";

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
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ csv }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMsg(data.error ?? "Import failed.");
        return;
      }
      setMsg(`Inserted ${data.inserted} rows.`);
      setCsv("");
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
        headers: { "Content-Type": "application/json" },
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
    "mt-2 w-full rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-sm text-white outline-none placeholder:text-zinc-500 focus:border-[#7c3aed]";
  const labelClass =
    "text-xs font-bold uppercase tracking-widest text-zinc-500";

  return (
    <PageShell overlay="rgba(15,15,26,0.95)">
      <div className="mx-auto max-w-4xl px-4 py-16">
        <header className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3">
              <Link href="/admin" className="text-zinc-500 hover:text-white transition">← Back</Link>
              <h1 className="text-4xl font-black text-white tracking-tight">📥 IMPORT QUESTIONS</h1>
            </div>
            <p className="mt-2 text-zinc-500">Manual entry or CSV bulk import.</p>
          </div>
        </header>

        <div className="mt-12 grid gap-8 lg:grid-cols-[1fr_350px]">
          {/* Manual Entry */}
          <section className="rounded-3xl border border-white/10 bg-[#161627] p-8 shadow-xl">
            <h2 className="text-xl font-bold text-white">Manual Question Entry</h2>
            <form onSubmit={saveManual} className="mt-8 grid gap-6">
              <div className="grid gap-6 sm:grid-cols-2">
                <div>
                  <label className={labelClass}>Subject</label>
                  <select
                    value={manual.subject}
                    onChange={(e) => setManual((m) => ({ ...m, subject: e.target.value }))}
                    className={inputClass}
                  >
                    {SUBJECT_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={labelClass}>Exam Type</label>
                  <select
                    value={manual.exam_type}
                    onChange={(e) => setManual((m) => ({ ...m, exam_type: e.target.value }))}
                    className={inputClass}
                  >
                    {EXAM_TYPE_OPTIONS.map((o) => (
                      <option key={o} value={o}>{o}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className={labelClass}>Question Text</label>
                <textarea
                  required
                  rows={3}
                  value={manual.question}
                  onChange={(e) => setManual((m) => ({ ...m, question: e.target.value }))}
                  className={inputClass}
                  placeholder="What is the capital of..."
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                {(["a", "b", "c", "d"] as const).map((key) => (
                  <div key={key}>
                    <label className={labelClass}>Option {key.toUpperCase()}</label>
                    <input
                      required
                      type="text"
                      value={manual[`option_${key}`]}
                      onChange={(e) => setManual((m) => ({ ...m, [`option_${key}`]: e.target.value }))}
                      className={inputClass}
                    />
                  </div>
                ))}
              </div>

              <div className="grid gap-6 sm:grid-cols-2">
                <div>
                  <label className={labelClass}>Correct Answer</label>
                  <select
                    value={manual.correct_answer}
                    onChange={(e) => setManual((m) => ({ ...m, correct_answer: e.target.value }))}
                    className={inputClass}
                  >
                    {CORRECT_OPTIONS.map((o) => (
                      <option key={o} value={o}>Option {o}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={labelClass}>Year (Optional)</label>
                  <input
                    type="text"
                    value={manual.year}
                    onChange={(e) => setManual((m) => ({ ...m, year: e.target.value }))}
                    className={inputClass}
                    placeholder="2024"
                  />
                </div>
              </div>

              <div>
                <label className={labelClass}>Explanation (Optional)</label>
                <textarea
                  rows={2}
                  value={manual.explanation}
                  onChange={(e) => setManual((m) => ({ ...m, explanation: e.target.value }))}
                  className={inputClass}
                />
              </div>

              {manualMsg && (
                <p className={`text-sm font-bold ${manualMsg.includes("success") ? "text-emerald-500" : "text-rose-500"}`}>
                  {manualMsg}
                </p>
              )}

              <button
                disabled={manualBusy}
                type="submit"
                className="rounded-2xl bg-[#7c3aed] py-4 text-sm font-black uppercase tracking-widest text-white transition hover:bg-[#6d28d9] disabled:opacity-50"
              >
                {manualBusy ? "Saving..." : "Save Question"}
              </button>
            </form>
          </section>

          {/* CSV Import */}
          <section className="space-y-8">
            <div className="rounded-3xl border border-white/10 bg-[#161627] p-8 shadow-xl">
              <h2 className="text-xl font-bold text-white">Bulk CSV Import</h2>
              <div className="mt-6">
                <label className={labelClass}>CSV Content</label>
                <textarea
                  rows={10}
                  value={csv}
                  onChange={(e) => setCsv(e.target.value)}
                  className={`${inputClass} font-mono text-[10px]`}
                  placeholder={`header1,header2...\nvalue1,value2...`}
                />
              </div>
              
              <div className="mt-4 rounded-xl bg-white/5 p-4">
                <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Expected Headers:</p>
                <code className="mt-1 block break-all text-[9px] text-zinc-400">{SAMPLE_HEADERS}</code>
              </div>

              {msg && (
                <p className={`mt-4 text-sm font-bold ${msg.includes("Inserted") ? "text-emerald-500" : "text-rose-500"}`}>
                  {msg}
                </p>
              )}

              <button
                disabled={busy || !csv.trim()}
                onClick={runImport}
                className="mt-6 w-full rounded-2xl border border-[#7c3aed]/30 bg-[#7c3aed]/10 py-4 text-sm font-black uppercase tracking-widest text-[#7c3aed] transition hover:bg-[#7c3aed] hover:text-white disabled:opacity-50"
              >
                {busy ? "Importing..." : "Run Bulk Import"}
              </button>
            </div>
          </section>
        </div>
      </div>
    </PageShell>
  );
}
