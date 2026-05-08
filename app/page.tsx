import Link from "next/link";

import { glassCardClass, PageShell } from "@/app/components/PageShell";

const getSubjectGradient = (subjectSlug: string) => {
  const colors = [
    '#4a00e0', '#8e2de2', // Purple
    '#fc466b', '#3f5efb', // Red/Blue
    '#ee0979', '#ff6a00', // Pink/Orange
    '#00d2ff', '#3a7bd5'  // Blue/Light Blue
  ];
  const hash1 = subjectSlug.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const hash2 = subjectSlug.length * 7;

  const color1 = colors[hash1 % colors.length];
  const color2 = colors[hash2 % colors.length];

  return `linear-gradient(to bottom right, ${color1}, ${color2})`;
};
export default function Home() {
  const homeSubjects = [
    { slug: "maths", title: "Maths", emoji: "🔢" },
    { slug: "english", title: "English", emoji: "📝" },
    { slug: "physics", title: "Physics", emoji: "⚛️" },
    { slug: "chemistry", title: "Chemistry", emoji: "🧪" },
    { slug: "biology", title: "Biology", emoji: "🌿" },
    { slug: "government", title: "Government", emoji: "🏛️" },
    { slug: "economics", title: "Economics", emoji: "📊" },
    { slug: "agricultural-science", title: "Agricultural Science", emoji: "🌾" },
    { slug: "current_affairs", title: "Current Affairs", emoji: "📰" },
  ] as const;

  return (
    <PageShell
      overlay="rgba(15,15,26,0.88)"
      className="min-h-screen text-white"
    >
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -left-40 top-10 h-96 w-96 rounded-full bg-[#7c3aed]/20 blur-3xl" />
        <div className="absolute -right-44 bottom-24 h-[28rem] w-[28rem] rounded-full bg-[#f59e0b]/10 blur-3xl" />
      </div>

      <div className="relative mx-auto max-w-6xl px-4 pb-16 pt-6 sm:pt-10">
        <div className="flex items-center justify-between">
          <p className="text-[11px] font-semibold uppercase tracking-[0.38em] text-[#7c3aed]">
            QUIZ ARENA
          </p>
          <span className="hidden text-[11px] font-medium text-white/60 sm:inline">
            Study Smart • Compete Live
          </span>
        </div>

        <header className="mt-10 text-center sm:mt-14">
          <h1 className="text-5xl font-extrabold tracking-tight sm:text-7xl">
            Quiz Arena
          </h1>
          <p className="mx-auto mt-3 max-w-2xl text-sm leading-relaxed text-white/70 sm:text-base">
            Study Smart. Compete Live. Win Big.
          </p>

          <div
            className={`mx-auto mt-6 max-w-3xl px-4 py-3 text-center ${glassCardClass}`}
          >
            <p className="text-xs font-semibold tracking-wide text-white/90 sm:text-sm">
              10,000+ Questions <span className="text-white/20">|</span> Live
              Battles <span className="text-white/20">|</span> JAMB • WAEC • NECO
            </p>
          </div>
        </header>

        <section className="mt-10 sm:mt-12">
          <div className="mb-4 flex items-end justify-between gap-4">
            <h2 className="text-sm font-semibold uppercase tracking-[0.22em] text-[#f59e0b]">
              Subjects
            </h2>
            <span className="text-xs text-white/60">Pick one to start</span>
          </div>

          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {homeSubjects.map((s) => (
              <li key={s.slug}>
                <Link
                  href={`/practice/${s.slug}`}
                  className="group relative flex min-h-[140px] flex-col overflow-hidden rounded-2xl border border-white/10 shadow-[0_18px_55px_-38px_rgba(0,0,0,0.95)] transition hover:-translate-y-0.5 hover:border-[#7c3aed]/55 hover:shadow-[0_28px_90px_-45px_rgba(124,58,237,0.6)] active:translate-y-0 active:scale-[0.99]"
                >
                  <div
                    className="absolute inset-0 bg-center bg-cover transition duration-500 group-hover:scale-[1.04]"
                    style={{ backgroundImage: getSubjectGradient(s.slug) }}
                  />
                  <div className="absolute inset-0 bg-[#0f0f1a]/80" />
                  <div className="pointer-events-none absolute inset-0 opacity-0 transition group-hover:opacity-100">
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(124,58,237,0.22),transparent_55%),radial-gradient(circle_at_80%_70%,rgba(245,158,11,0.16),transparent_55%)]" />
                  </div>

                  <div className="relative flex h-full flex-col p-4">
                    <div className="flex items-start justify-between gap-3">
                      <span className="text-3xl drop-shadow" aria-hidden>
                        {s.emoji}
                      </span>
                      <span className="rounded-full border border-white/10 bg-black/25 px-2 py-1 text-[11px] font-semibold text-white/85">
                        10 Qs
                      </span>
                    </div>

                    <div className="mt-auto pt-5">
                      <p className="text-sm font-semibold text-white sm:text-base">
                        {s.title}
                      </p>
                      <p className="mt-1 text-xs text-white/65">
                        Timed practice · Instant feedback
                      </p>
                      <div className="mt-3 text-xs font-semibold text-[#7c3aed]">
                        Start →
                      </div>
                    </div>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </section>

        <section className="mt-10">
          <Link
            href="/battle"
            className="group relative mx-auto flex max-w-3xl items-center justify-center overflow-hidden rounded-2xl bg-[#7c3aed] px-6 py-5 text-center text-base font-extrabold tracking-wide text-white shadow-[0_0_30px_rgba(124,58,237,0.55),0_25px_90px_-45px_rgba(124,58,237,0.95)] ring-1 ring-white/10 transition hover:bg-[#6d28d9] hover:shadow-[0_0_40px_rgba(124,58,237,0.75),0_30px_100px_-50px_rgba(124,58,237,1)] active:scale-[0.99]"
          >
            <span className="pointer-events-none absolute inset-0 opacity-0 transition group-hover:opacity-100">
              <span className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(255,255,255,0.28),transparent_55%)]" />
            </span>
            <span className="relative">⚔️ Enter Battle Mode</span>
          </Link>
        </section>

        <footer className="mt-14 border-t border-white/10 pt-8 text-center text-xs text-white/55">
          Powered by Quiz Arena
        </footer>
      </div>
    </PageShell>
  );
}
