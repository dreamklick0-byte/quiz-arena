import Link from "next/link";
import { SUBJECTS } from "@/app/data/practiceQuestions";

export default function Home() {
  return (
    <div className="min-h-screen bg-[#0f0f1a] text-zinc-100">
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -left-32 top-20 h-72 w-72 rounded-full bg-[#7c3aed]/20 blur-3xl" />
        <div className="absolute -right-24 bottom-32 h-80 w-80 rounded-full bg-[#f59e0b]/10 blur-3xl" />
      </div>

      <div className="relative mx-auto max-w-5xl px-4 py-10 pb-16 sm:py-14">
        <header className="text-center sm:text-left">
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-[#7c3aed]">
            Quiz Arena
          </p>
          <h1 className="mt-3 bg-gradient-to-r from-white via-zinc-100 to-zinc-400 bg-clip-text text-3xl font-bold tracking-tight text-transparent sm:text-4xl">
            Practice Zone
          </h1>
          <p className="mx-auto mt-3 max-w-xl text-sm leading-relaxed text-zinc-400 sm:mx-0 sm:text-base">
            Pick a subject and answer 10 timed questions. Beat the clock, learn
            from explanations, and see how you stack up.
          </p>
        </header>

        <section className="mt-10">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-[#f59e0b]/90">
            Subjects
          </h2>
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {SUBJECTS.map((s) => (
              <li key={s.slug}>
                <Link
                  href={`/practice/${s.slug}`}
                  className="group flex h-full flex-col rounded-2xl border border-white/10 bg-[#161627]/90 p-4 shadow-lg shadow-black/30 transition hover:border-[#7c3aed]/50 hover:bg-[#1a1a2e] hover:shadow-[#7c3aed]/10 active:scale-[0.98]"
                >
                  <span
                    className="text-2xl transition group-hover:scale-110"
                    aria-hidden
                  >
                    {s.emoji}
                  </span>
                  <span className="mt-3 text-sm font-semibold text-white sm:text-base">
                    {s.title}
                  </span>
                  <span className="mt-1 text-xs text-zinc-500">
                    10 questions · 30s each
                  </span>
                  <span className="mt-3 text-xs font-medium text-[#7c3aed] opacity-90 group-hover:opacity-100">
                    Start →
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>

        <footer className="mt-14 border-t border-white/10 pt-8 text-center text-xs text-zinc-600 sm:text-left">
          Quiz Arena — practice mode. Live competitions coming soon.
        </footer>
      </div>
    </div>
  );
}
