"use client";

import { useState, useEffect } from "react";
import { PageShell } from "@/app/components/PageShell";
import Link from "next/link";
import { SUBJECTS } from "@/app/data/practiceQuestions";

interface Question {
  id: number;
  subject: string;
  exam_type: string;
  question: string;
  correct_answer: string;
  created_at: string;
}

export default function AdminQuestionsPage() {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [subject, setSubject] = useState("all");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  const fetchQuestions = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/list-questions?subject=${subject}&page=${page}`);
      const data = await res.json();
      if (data.success) {
        setQuestions(data.questions);
        setTotalPages(data.totalPages);
        setTotal(data.total);
      }
    } catch (err) {
      console.error("Failed to fetch questions:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQuestions();
  }, [subject, page]);

  const deleteQuestion = async (id: number) => {
    if (!confirm("Are you sure you want to delete this question?")) return;

    try {
      const res = await fetch("/api/admin/list-questions", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id })
      });
      const data = await res.json();
      if (data.success) {
        fetchQuestions();
      }
    } catch (err) {
      console.error("Error deleting question:", err);
    }
  };

  return (
    <PageShell overlay="rgba(15,15,26,0.95)">
      <div className="mx-auto max-w-6xl px-4 py-16">
        <header className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3">
              <Link href="/admin" className="text-zinc-500 hover:text-white transition">← Back</Link>
              <h1 className="text-4xl font-black text-white tracking-tight">📚 QUESTION BANK</h1>
            </div>
            <p className="mt-2 text-zinc-500">Manage all quiz questions in the database.</p>
          </div>
          <div className="text-right">
            <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Total Questions</p>
            <p className="text-3xl font-black text-white">{total.toLocaleString()}</p>
          </div>
        </header>

        <div className="mt-12 flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <label className="text-xs font-bold uppercase tracking-widest text-zinc-500">Filter Subject:</label>
            <select
              value={subject}
              onChange={(e) => { setSubject(e.target.value); setPage(1); }}
              className="rounded-xl border border-white/10 bg-[#161627] px-4 py-2 text-sm text-white outline-none focus:border-[#7c3aed]"
            >
              <option value="all">All Subjects</option>
              {SUBJECTS.map(s => <option key={s.slug} value={s.slug}>{s.title}</option>)}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <button
              disabled={page === 1}
              onClick={() => setPage(p => p - 1)}
              className="rounded-lg bg-white/5 px-4 py-2 text-xs font-bold text-white hover:bg-white/10 disabled:opacity-20"
            >
              Previous
            </button>
            <span className="text-xs text-zinc-500">Page {page} of {totalPages}</span>
            <button
              disabled={page === totalPages}
              onClick={() => setPage(p => p + 1)}
              className="rounded-lg bg-white/5 px-4 py-2 text-xs font-bold text-white hover:bg-white/10 disabled:opacity-20"
            >
              Next
            </button>
          </div>
        </div>

        <div className="mt-8 overflow-hidden rounded-3xl border border-white/10 bg-[#161627]/80 backdrop-blur-xl">
          <table className="w-full text-left border-collapse">
            <thead className="bg-white/5 text-[10px] font-black uppercase tracking-widest text-zinc-500">
              <tr>
                <th className="px-6 py-5">Subject/Type</th>
                <th className="px-6 py-5">Question</th>
                <th className="px-6 py-5">Correct</th>
                <th className="px-6 py-5">Date Added</th>
                <th className="px-6 py-5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {loading ? (
                <tr><td colSpan={5} className="px-6 py-12 text-center text-zinc-500">Loading questions...</td></tr>
              ) : questions.length === 0 ? (
                <tr><td colSpan={5} className="px-6 py-12 text-center text-zinc-500">No questions found.</td></tr>
              ) : questions.map(q => (
                <tr key={q.id} className="text-zinc-300 hover:bg-white/5 transition">
                  <td className="px-6 py-5">
                    <p className="font-bold text-white uppercase text-xs">{q.subject.replace('_', ' ')}</p>
                    <p className="text-[10px] text-zinc-500 uppercase tracking-widest">{q.exam_type}</p>
                  </td>
                  <td className="px-6 py-5">
                    <p className="line-clamp-2 max-w-md text-sm">{q.question}</p>
                  </td>
                  <td className="px-6 py-5">
                    <span className="rounded-lg bg-[#7c3aed]/20 px-3 py-1 text-xs font-bold text-[#7c3aed]">
                      Option {q.correct_answer}
                    </span>
                  </td>
                  <td className="px-6 py-5 text-xs text-zinc-500">
                    {new Date(q.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-5 text-right">
                    <button
                      onClick={() => deleteQuestion(q.id)}
                      className="text-xs font-bold text-rose-400 hover:text-rose-300 transition"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </PageShell>
  );
}
