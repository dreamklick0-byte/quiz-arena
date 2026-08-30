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

// ── PDF-to-CSV converter helpers ──────────────────────────────────────────
type ParsedQuestion = {
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

function parseRawText(
  raw: string,
  subject: string,
  examType: string,
  year: string,
  duplicate: boolean
): { rows: ParsedQuestion[]; errors: number } {
  const lines = raw.split("\n").filter((l) => l.trim());
  const rows: ParsedQuestion[] = [];
  let errors = 0;

  for (const line of lines) {
    const parts = line.split("|").map((p) => p.trim());
    if (parts.length < 6) { errors++; continue; }

    const q = parts[0].replace(/^\d+[\.\)]\s*/, "").trim();
    const a = parts[1].replace(/^A[\.\)]\s*/i, "").trim();
    const b = parts[2].replace(/^B[\.\)]\s*/i, "").trim();
    const c = parts[3].replace(/^C[\.\)]\s*/i, "").trim();
    const d = parts[4].replace(/^D[\.\)]\s*/i, "").trim();
    const ansRaw = parts[5].replace(/^ANS[:\s]*/i, "").trim().toUpperCase();
    const ans = ansRaw.replace(/^([ABCD]).*/, "$1");

    if (!q || !a || !b || !c || !d || !["A","B","C","D"].includes(ans)) {
      errors++;
      continue;
    }

    const base: ParsedQuestion = {
      subject, exam_type: examType, question: q,
      option_a: a, option_b: b, option_c: c, option_d: d,
      correct_answer: ans, explanation: "", year,
    };
    rows.push(base);
    if (duplicate && examType === "WAEC") {
      rows.push({ ...base, exam_type: "NECO" });
    }
  }
  return { rows, errors };
}

function rowsToCSV(rows: ParsedQuestion[]): string {
  const headers = [
    "subject","exam_type","question","option_a","option_b",
    "option_c","option_d","correct_answer","explanation","year",
  ];
  const escape = (v: string) => `"${String(v).replace(/"/g, '""')}"`;
  const lines = [headers.join(",")];
  for (const r of rows) {
    lines.push(headers.map((h) => escape(r[h as keyof ParsedQuestion])).join(","));
  }
  return lines.join("\r\n");
}

function downloadBlob(content: string, filename: string) {
  const blob = new Blob([content], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export default function AdminImportPage() {
  const [csv, setCsv] = useState("");
  const [busy, setBusy] = useState(false);
  const [manualBusy, setManualBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [manualMsg, setManualMsg] = useState<string | null>(null);
  const [manual, setManual] = useState<ManualForm>(emptyManual);

  // PDF converter state
  const [pdfSubject, setPdfSubject] = useState("physics");
  const [pdfExamType, setPdfExamType] = useState("WAEC");
  const [pdfYear, setPdfYear] = useState("2024");
  const [pdfDuplicate, setPdfDuplicate] = useState(false);
  const [pdfRaw, setPdfRaw] = useState("");
  const [pdfMsg, setPdfMsg] = useState<{ text: string; ok: boolean } | null>(null);
  const [pdfPreview, setPdfPreview] = useState<ParsedQuestion[]>([]);

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
      if (!res.ok) { setMsg(data.error ?? "Import failed."); return; }
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
        subject: manual.subject, exam_type: manual.exam_type,
        question: manual.question, option_a: manual.option_a,
        option_b: manual.option_b, option_c: manual.option_c,
        option_d: manual.option_d, correct_answer: manual.correct_answer,
        explanation: manual.explanation,
      };
      if (yearTrim === "") {
        payload.year = null;
      } else {
        const y = parseInt(yearTrim, 10);
        if (!Number.isFinite(y)) { setManualMsg("Year must be empty or a valid number."); return; }
        payload.year = y;
      }
      const res = await fetch("/api/admin/question", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) { setManualMsg(data.error ?? "Save failed."); return; }
      setManualMsg("Question saved successfully.");
      setManual(emptyManual());
    } catch (e: unknown) {
      setManualMsg(e instanceof Error ? e.message : "Save failed.");
    } finally {
      setManualBusy(false);
    }
  };

  const handlePdfPreview = () => {
    setPdfMsg(null);
    if (!pdfRaw.trim()) { setPdfMsg({ text: "Please paste questions first.", ok: false }); return; }
    const { rows, errors } = parseRawText(pdfRaw, pdfSubject, pdfExamType, pdfYear, pdfDuplicate);
    if (rows.length === 0) { setPdfMsg({ text: "No valid questions found. Check the format.", ok: false }); return; }
    setPdfPreview(rows.slice(0, 5));
    setPdfMsg({ text: `Parsed ${rows.length} rows${errors > 0 ? ` (${errors} lines skipped)` : ""}.`, ok: errors === 0 });
  };

  const handlePdfDownload = () => {
    setPdfMsg(null);
    if (!pdfRaw.trim()) { setPdfMsg({ text: "Please paste questions first.", ok: false }); return; }
    const { rows, errors } = parseRawText(pdfRaw, pdfSubject, pdfExamType, pdfYear, pdfDuplicate);
    if (rows.length === 0) { setPdfMsg({ text: "No valid questions found.", ok: false }); return; }
    const content = rowsToCSV(rows);
    downloadBlob(content, `${pdfSubject}_${pdfExamType}_${pdfYear}.csv`);
    setPdfMsg({ text: `✓ Downloaded ${rows.length} rows! Now upload the CSV via Bulk Import above.`, ok: true });
    if (errors > 0) setPdfMsg({ text: `Downloaded ${rows.length} rows (${errors} lines skipped).`, ok: false });
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
            <p className="mt-2 text-zinc-500">Manual entry, CSV bulk import, or PDF converter.</p>
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
                  <select value={manual.subject} onChange={(e) => setManual((m) => ({ ...m, subject: e.target.value }))} className={inputClass}>
                    {SUBJECT_OPTIONS.map((o) => (<option key={o.value} value={o.value}>{o.label}</option>))}
                  </select>
                </div>
                <div>
                  <label className={labelClass}>Exam Type</label>
                  <select value={manual.exam_type} onChange={(e) => setManual((m) => ({ ...m, exam_type: e.target.value }))} className={inputClass}>
                    {EXAM_TYPE_OPTIONS.map((o) => (<option key={o} value={o}>{o}</option>))}
                  </select>
                </div>
              </div>
              <div>
                <label className={labelClass}>Question Text</label>
                <textarea required rows={3} value={manual.question} onChange={(e) => setManual((m) => ({ ...m, question: e.target.value }))} className={inputClass} placeholder="What is the capital of..." />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                {(["a", "b", "c", "d"] as const).map((key) => (
                  <div key={key}>
                    <label className={labelClass}>Option {key.toUpperCase()}</label>
                    <input required type="text" value={manual[`option_${key}`]} onChange={(e) => setManual((m) => ({ ...m, [`option_${key}`]: e.target.value }))} className={inputClass} />
                  </div>
                ))}
              </div>
              <div className="grid gap-6 sm:grid-cols-2">
                <div>
                  <label className={labelClass}>Correct Answer</label>
                  <select value={manual.correct_answer} onChange={(e) => setManual((m) => ({ ...m, correct_answer: e.target.value }))} className={inputClass}>
                    {CORRECT_OPTIONS.map((o) => (<option key={o} value={o}>Option {o}</option>))}
                  </select>
                </div>
                <div>
                  <label className={labelClass}>Year (Optional)</label>
                  <input type="text" value={manual.year} onChange={(e) => setManual((m) => ({ ...m, year: e.target.value }))} className={inputClass} placeholder="2024" />
                </div>
              </div>
              <div>
                <label className={labelClass}>Explanation (Optional)</label>
                <textarea rows={2} value={manual.explanation} onChange={(e) => setManual((m) => ({ ...m, explanation: e.target.value }))} className={inputClass} />
              </div>
              {manualMsg && (
                <p className={`text-sm font-bold ${manualMsg.includes("success") ? "text-emerald-500" : "text-rose-500"}`}>{manualMsg}</p>
              )}
              <button disabled={manualBusy} type="submit" className="rounded-2xl bg-[#7c3aed] py-4 text-sm font-black uppercase tracking-widest text-white transition hover:bg-[#6d28d9] disabled:opacity-50">
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
                <textarea rows={10} value={csv} onChange={(e) => setCsv(e.target.value)} className={`${inputClass} font-mono text-[10px]`} placeholder={`header1,header2...\nvalue1,value2...`} />
              </div>
              <div className="mt-4 rounded-xl bg-white/5 p-4">
                <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Expected Headers:</p>
                <code className="mt-1 block break-all text-[9px] text-zinc-400">{SAMPLE_HEADERS}</code>
              </div>
              {msg && (
                <p className={`mt-4 text-sm font-bold ${msg.includes("Inserted") ? "text-emerald-500" : "text-rose-500"}`}>{msg}</p>
              )}
              <button disabled={busy || !csv.trim()} onClick={runImport} className="mt-6 w-full rounded-2xl border border-[#7c3aed]/30 bg-[#7c3aed]/10 py-4 text-sm font-black uppercase tracking-widest text-[#7c3aed] transition hover:bg-[#7c3aed] hover:text-white disabled:opacity-50">
                {busy ? "Importing..." : "Run Bulk Import"}
              </button>
            </div>
          </section>
        </div>

        {/* ── PDF to CSV Converter ───────────────────────────────────────── */}
        <section className="mt-12 rounded-3xl border border-[#7c3aed]/30 bg-[#161627] p-8 shadow-xl">
          <div className="flex items-center gap-3 mb-2">
            <span className="text-2xl">📄</span>
            <h2 className="text-xl font-bold text-white">PDF → CSV Converter</h2>
            <span className="rounded-full bg-[#7c3aed]/20 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-[#7c3aed]">New</span>
          </div>
          <p className="text-sm text-zinc-500 mb-8">
            Copy questions from a PDF exam paper, paste below, download the CSV, then upload it using Bulk Import above.
          </p>

          {/* How to format */}
          <div className="mb-8 rounded-2xl bg-white/5 p-5">
            <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 mb-3">Format each question like this:</p>
            <code className="block text-[11px] text-emerald-400 break-all leading-relaxed">
              1. Question text | A. Option A | B. Option B | C. Option C | D. Option D | ANS: B
            </code>
            <p className="mt-3 text-[10px] text-zinc-600">One question per line. Use | to separate parts. ANS: must be A, B, C or D.</p>
          </div>

          {/* Settings row */}
          <div className="grid gap-4 sm:grid-cols-4 mb-6">
            <div>
              <label className={labelClass}>Subject</label>
              <select value={pdfSubject} onChange={(e) => setPdfSubject(e.target.value)} className={inputClass}>
                {SUBJECT_OPTIONS.map((o) => (<option key={o.value} value={o.value}>{o.label}</option>))}
              </select>
            </div>
            <div>
              <label className={labelClass}>Exam Type</label>
              <select value={pdfExamType} onChange={(e) => setPdfExamType(e.target.value)} className={inputClass}>
                {EXAM_TYPE_OPTIONS.map((o) => (<option key={o} value={o}>{o}</option>))}
              </select>
            </div>
            <div>
              <label className={labelClass}>Year</label>
              <input type="number" value={pdfYear} onChange={(e) => setPdfYear(e.target.value)} className={inputClass} placeholder="2024" />
            </div>
            <div className="flex flex-col justify-end">
              <label className={labelClass}>Duplicate as NECO?</label>
              <label className="mt-3 flex cursor-pointer items-center gap-2">
                <input
                  type="checkbox"
                  checked={pdfDuplicate}
                  onChange={(e) => setPdfDuplicate(e.target.checked)}
                  className="h-4 w-4 rounded accent-[#7c3aed]"
                />
                <span className="text-sm text-zinc-400">Yes, add NECO rows too</span>
              </label>
            </div>
          </div>

          {/* Paste area */}
          <div className="mb-6">
            <label className={labelClass}>Paste Questions Here</label>
            <textarea
              rows={12}
              value={pdfRaw}
              onChange={(e) => setPdfRaw(e.target.value)}
              className={`${inputClass} font-mono text-[11px] leading-relaxed`}
              placeholder={`1. The S.I unit of energy is | A. Hertz | B. Joule | C. Newton | D. Watt | ANS: B\n2. Newton's first law is about | A. Force | B. Inertia | C. Energy | D. Motion | ANS: B`}
            />
          </div>

          {/* Action buttons */}
          <div className="flex gap-4 mb-6">
            <button
              onClick={handlePdfPreview}
              className="flex-1 rounded-2xl border border-white/10 bg-white/5 py-4 text-sm font-black uppercase tracking-widest text-white transition hover:bg-white/10"
            >
              👁 Preview
            </button>
            <button
              onClick={handlePdfDownload}
              className="flex-1 rounded-2xl bg-[#7c3aed] py-4 text-sm font-black uppercase tracking-widest text-white transition hover:bg-[#6d28d9]"
            >
              ⬇ Download CSV
            </button>
          </div>

          {/* Status message */}
          {pdfMsg && (
            <p className={`mb-6 text-sm font-bold ${pdfMsg.ok ? "text-emerald-500" : "text-rose-500"}`}>
              {pdfMsg.text}
            </p>
          )}

          {/* Preview table */}
          {pdfPreview.length > 0 && (
            <div className="overflow-x-auto rounded-2xl border border-white/10">
              <table className="w-full text-[11px]">
                <thead>
                  <tr className="border-b border-white/10 bg-white/5">
                    <th className="px-3 py-2 text-left text-zinc-500">Type</th>
                    <th className="px-3 py-2 text-left text-zinc-500">Question</th>
                    <th className="px-3 py-2 text-left text-zinc-500">A</th>
                    <th className="px-3 py-2 text-left text-zinc-500">B</th>
                    <th className="px-3 py-2 text-left text-zinc-500">C</th>
                    <th className="px-3 py-2 text-left text-zinc-500">D</th>
                    <th className="px-3 py-2 text-left text-zinc-500">Ans</th>
                  </tr>
                </thead>
                <tbody>
                  {pdfPreview.map((r, i) => (
                    <tr key={i} className="border-b border-white/5 hover:bg-white/5">
                      <td className="px-3 py-2 text-zinc-400 whitespace-nowrap">{r.exam_type} {r.year}</td>
                      <td className="px-3 py-2 text-zinc-300 max-w-[200px] truncate" title={r.question}>{r.question}</td>
                      <td className="px-3 py-2 text-zinc-400 max-w-[80px] truncate">{r.option_a}</td>
                      <td className="px-3 py-2 text-zinc-400 max-w-[80px] truncate">{r.option_b}</td>
                      <td className="px-3 py-2 text-zinc-400 max-w-[80px] truncate">{r.option_c}</td>
                      <td className="px-3 py-2 text-zinc-400 max-w-[80px] truncate">{r.option_d}</td>
                      <td className="px-3 py-2 font-bold text-emerald-400">{r.correct_answer}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className="px-4 py-2 text-[10px] text-zinc-600">Showing first 5 rows of preview</p>
            </div>
          )}

          {/* Step guide */}
          <div className="mt-8 grid gap-3 sm:grid-cols-4">
            {[
              { n: "1", t: "Open PDF", d: "Open your exam PDF on screen" },
              { n: "2", t: "Paste questions", d: "Copy & paste using the pipe format" },
              { n: "3", t: "Download CSV", d: "Click Download CSV button above" },
              { n: "4", t: "Upload to admin", d: "Use Bulk CSV Import at the top" },
            ].map((s) => (
              <div key={s.n} className="rounded-2xl bg-white/5 p-4">
                <div className="mb-2 h-7 w-7 rounded-full bg-[#7c3aed]/20 flex items-center justify-center text-xs font-black text-[#7c3aed]">{s.n}</div>
                <p className="text-xs font-bold text-white">{s.t}</p>
                <p className="mt-1 text-[11px] text-zinc-500">{s.d}</p>
              </div>
            ))}
          </div>
        </section>
      </div>
    </PageShell>
  );
}
