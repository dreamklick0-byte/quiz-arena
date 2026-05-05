"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { Question } from "@/app/data/practiceQuestions";

const TIMER_SECONDS = 30;
const TOTAL_QUESTIONS = 10;

type Props = {
  subjectTitle: string;
  questions: Question[];
};

type Attempt = {
  question: Question;
  chosenIndex: number | null;
  timedOut: boolean;
};

export function PracticeQuizClient({ subjectTitle, questions }: Props) {
  const [phase, setPhase] = useState<"quiz" | "results">("quiz");
  const [index, setIndex] = useState(0);
  const [answered, setAnswered] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [timedOut, setTimedOut] = useState(false);
  const [timeLeft, setTimeLeft] = useState(TIMER_SECONDS);
  const [attempts, setAttempts] = useState<Attempt[]>([]);

  const q = questions[index];
  const progress = ((index + 1) / TOTAL_QUESTIONS) * 100;
  const barPct = Math.min(100, (timeLeft / TIMER_SECONDS) * 100);

  useEffect(() => {
    if (phase !== "quiz" || answered) return;
    const start = Date.now();
    const id = window.setInterval(() => {
      const elapsed = (Date.now() - start) / 1000;
      const left = Math.max(0, TIMER_SECONDS - elapsed);
      setTimeLeft(left);
      if (left <= 0) {
        window.clearInterval(id);
        setAnswered(true);
        setTimedOut(true);
        setSelectedIndex(null);
      }
    }, 32);
    return () => window.clearInterval(id);
  }, [phase, answered, index]);

  const goNext = () => {
    if (!q) return;
    if (attempts.some((a) => a.question.id === q.id)) return;
    const attempt: Attempt = {
      question: q,
      chosenIndex: timedOut ? null : selectedIndex,
      timedOut,
    };
    setAttempts((prev) => [...prev, attempt]);
    if (index >= TOTAL_QUESTIONS - 1) {
      setPhase("results");
      return;
    }
    setIndex((i) => i + 1);
    setAnswered(false);
    setSelectedIndex(null);
    setTimedOut(false);
    setTimeLeft(TIMER_SECONDS);
  };

  const pickOption = (i: number) => {
    if (answered) return;
    setSelectedIndex(i);
    setAnswered(true);
    setTimedOut(false);
  };

  if (phase === "results") {
    const resolvedCorrect = attempts.filter(
      (a) => a.chosenIndex === a.question.correctIndex
    ).length;
    const pct = Math.round((resolvedCorrect / TOTAL_QUESTIONS) * 100);

    return (
      <div className="min-h-screen bg-[#0f0f1a] text-zinc-100 px-4 py-8 pb-12">
        <div className="mx-auto max-w-lg">
          <header className="mb-8 text-center">
            <p className="text-xs font-medium uppercase tracking-[0.2em] text-[#7c3aed]/90">
              Practice complete
            </p>
            <h1 className="mt-2 font-semibold text-2xl text-white sm:text-3xl">
              {subjectTitle}
            </h1>
          </header>

          <div className="rounded-2xl border border-white/10 bg-[#161627] p-6 shadow-xl shadow-black/40">
            <div className="flex flex-col items-center gap-2 border-b border-white/10 pb-6 text-center">
              <p className="text-sm text-zinc-400">Your score</p>
              <p className="font-mono text-4xl font-bold tabular-nums text-[#f59e0b]">
                {resolvedCorrect}{" "}
                <span className="text-lg font-normal text-zinc-500">/</span>{" "}
                {TOTAL_QUESTIONS}
              </p>
              <p className="text-2xl font-semibold text-white">{pct}%</p>
            </div>

            <div className="mt-6">
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-[#7c3aed]">
                Correct answers
              </h2>
              <ul className="space-y-4">
                {questions.map((item, i) => (
                  <li
                    key={item.id}
                    className="rounded-xl border border-white/5 bg-[#0f0f1a]/80 p-4"
                  >
                    <p className="text-xs text-zinc-500">Question {i + 1}</p>
                    <p className="mt-1 text-sm font-medium text-zinc-200">
                      {item.question}
                    </p>
                    <p className="mt-2 text-sm text-emerald-400/95">
                      <span className="text-zinc-500">Answer: </span>
                      {item.options[item.correctIndex]}
                    </p>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="mt-8 flex flex-col gap-4">
            {pct >= 60 && (
              <button
                type="button"
                className="relative w-full overflow-hidden rounded-xl bg-gradient-to-r from-[#7c3aed] to-[#6d28d9] px-6 py-4 text-center text-base font-semibold text-white shadow-[0_0_24px_rgba(124,58,237,0.55),0_0_48px_rgba(245,158,11,0.2)] ring-2 ring-[#f59e0b]/40 transition hover:brightness-110 active:scale-[0.99]"
              >
                Join a Live Competition
              </button>
            )}
            {pct >= 50 && pct < 60 && (
              <div className="rounded-xl border border-[#f59e0b]/30 bg-[#f59e0b]/10 px-5 py-4 text-center">
                <p className="text-sm font-medium text-[#f59e0b]">
                  Upgrade to Premium for full access
                </p>
              </div>
            )}

            <Link
              href="/"
              className="block w-full rounded-xl border border-white/15 py-3 text-center text-sm font-medium text-zinc-300 transition hover:border-[#7c3aed]/50 hover:text-white"
            >
              Back to Practice Zone
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0f0f1a] text-zinc-100">
      <div className="sticky top-0 z-10 border-b border-white/10 bg-[#0f0f1a]/95 backdrop-blur-md">
        <div className="mx-auto flex max-w-lg items-center justify-between gap-3 px-4 py-3">
          <Link
            href="/"
            className="text-xs font-medium text-zinc-400 transition hover:text-[#7c3aed]"
          >
            ← Exit
          </Link>
          <span className="truncate text-sm font-medium text-white">
            {subjectTitle}
          </span>
          <span className="text-xs tabular-nums text-[#f59e0b]">
            {index + 1}/{TOTAL_QUESTIONS}
          </span>
        </div>
        <div className="h-1 w-full bg-white/5">
          <div
            className="h-full bg-[#7c3aed] transition-[width] duration-300 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>
        <div className="px-4 pb-3 pt-2">
          <div className="flex items-center justify-between text-xs text-zinc-500">
            <span>Time left</span>
            <span className="tabular-nums text-[#f59e0b]">
              {answered ? "—" : `${Math.ceil(timeLeft)}s`}
            </span>
          </div>
          <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-white/10">
            <div
              className="h-full rounded-full bg-gradient-to-r from-[#7c3aed] to-[#f59e0b] transition-[width] duration-75 ease-linear"
              style={{ width: `${barPct}%` }}
            />
          </div>
        </div>
      </div>

      <main className="mx-auto max-w-lg px-4 py-6 pb-28">
        <p className="text-xs font-medium uppercase tracking-wider text-[#7c3aed]">
          Multiple choice
        </p>
        <h2 className="mt-2 text-lg font-semibold leading-snug text-white sm:text-xl">
          {q.question}
        </h2>

        <ul className="mt-6 space-y-3">
          {q.options.map((opt, i) => {
            const isCorrect = i === q.correctIndex;
            const isSelected = selectedIndex === i;
            let ring =
              "border-white/10 bg-[#161627] hover:border-[#7c3aed]/40 hover:bg-[#1c1c30]";
            if (answered) {
              if (isCorrect) {
                ring =
                  "border-emerald-500/60 bg-emerald-500/15 ring-1 ring-emerald-500/40";
              } else if (isSelected && !isCorrect) {
                ring =
                  "border-red-500/60 bg-red-500/15 ring-1 ring-red-500/40";
              } else {
                ring = "border-white/5 bg-[#12121f] opacity-60";
              }
            }
            return (
              <li key={i}>
                <button
                  type="button"
                  disabled={answered}
                  onClick={() => pickOption(i)}
                  className={`flex w-full items-start gap-3 rounded-xl border px-4 py-3.5 text-left text-sm transition ${ring}`}
                >
                  <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-black/30 text-xs font-bold text-[#f59e0b]">
                    {String.fromCharCode(65 + i)}
                  </span>
                  <span className="text-zinc-200">{opt}</span>
                </button>
              </li>
            );
          })}
        </ul>

        {answered && (
          <div className="mt-6 rounded-xl border border-[#7c3aed]/25 bg-[#7c3aed]/10 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-[#f59e0b]">
              Explanation
            </p>
            <p className="mt-2 text-sm leading-relaxed text-zinc-300">
              {q.explanation}
            </p>
            {timedOut && (
              <p className="mt-2 text-xs text-amber-200/80">
                Time ran out — the correct answer is highlighted above.
              </p>
            )}
          </div>
        )}

        {answered && (
          <div className="fixed bottom-0 left-0 right-0 border-t border-white/10 bg-[#0f0f1a]/98 p-4 pb-[max(1rem,env(safe-area-inset-bottom))] backdrop-blur-md">
            <div className="mx-auto max-w-lg">
              <button
                type="button"
                onClick={goNext}
                className="w-full rounded-xl bg-[#7c3aed] py-3.5 text-center text-sm font-semibold text-white shadow-lg shadow-[#7c3aed]/25 transition hover:bg-[#6d28d9] active:scale-[0.99]"
              >
                {index >= TOTAL_QUESTIONS - 1 ? "See results" : "Next question"}
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
