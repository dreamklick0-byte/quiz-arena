import Link from "next/link";
import { PageShell, glassCardClass } from "@/app/components/PageShell";
import { supabase } from "@/lib/supabase";

type PageProps = {
  params: Promise<{ subject: string }>;
};

function toTitle(slug: string) {
  return slug
    .split(/[-_]/g)
    .filter(Boolean)
    .map((w) => w[0]?.toUpperCase() + w.slice(1))
    .join(" ");
}

export default async function ExamTypeSelectionPage({ params }: PageProps) {
  const { subject } = await params;
  const subjectTitle = toTitle(subject);

  const isCurrentAffairs = subject.toLowerCase() === "current_affairs";

  const defaultCards = [
    {
      examType: "JAMB",
      description: "University entrance exam",
      accent: "#7c3aed",
      ring: "hover:border-[#7c3aed]/55 hover:shadow-[0_28px_90px_-45px_rgba(124,58,237,0.6)]",
      bgGlow: "bg-[#7c3aed]/20",
    },
    {
      examType: "WAEC",
      description: "West African certificate",
      accent: "#f59e0b",
      ring: "hover:border-[#f59e0b]/55 hover:shadow-[0_28px_90px_-45px_rgba(245,158,11,0.55)]",
      bgGlow: "bg-[#f59e0b]/15",
    },
    {
      examType: "NECO",
      description: "National examination",
      accent: "#10b981",
      ring: "hover:border-[#10b981]/55 hover:shadow-[0_28px_90px_-45px_rgba(16,185,129,0.55)]",
      bgGlow: "bg-[#10b981]/15",
    },
  ] as const;

  const currentAffairsCards = [
    {
      examType: "Nigeria Current Affairs",
      description: "News & events in Nigeria",
      accent: "#7c3aed",
      ring: "hover:border-[#7c3aed]/55 hover:shadow-[0_28px_90px_-45px_rgba(124,58,237,0.6)]",
      bgGlow: "bg-[#7c3aed]/20",
    },
    {
      examType: "Africa Current Affairs",
      description: "News & events across Africa",
      accent: "#f59e0b",
      ring: "hover:border-[#f59e0b]/55 hover:shadow-[0_28px_90px_-45px_rgba(245,158,11,0.55)]",
      bgGlow: "bg-[#f59e0b]/15",
    },
    {
      examType: "Global Current Affairs",
      description: "Major world news & trends",
      accent: "#10b981",
      ring: "hover:border-[#10b981]/55 hover:shadow-[0_28px_90px_-45px_rgba(16,185,129,0.55)]",
      bgGlow: "bg-[#10b981]/15",
    },
  ] as const;

  const cards = isCurrentAffairs ? currentAffairsCards : defaultCards;

  const countPromises = cards.map(async (c) => {
    const { count } = await supabase
      .from("questions")
      .select("*", { count: "exact", head: true })
      .eq("subject", subject)
      .eq("exam_type", c.examType);
    return [c.examType, count ?? 0] as const;
  });

  const countsByExamType = Object.fromEntries(
    await Promise.all(countPromises),
  ) as Record<(typeof cards)[number]["examType"], number>;

  return (
    <PageShell
      overlay="rgba(15,15,26,0.90)"
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
          <Link
            href="/"
            className="text-xs font-medium text-white/60 transition hover:text-[#7c3aed]"
          >
            Back to Home
          </Link>
        </div>

        <header className="mt-10 text-center sm:mt-14">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#f59e0b]">
            Practice Mode
          </p>
          <h1 className="mt-3 text-4xl font-extrabold tracking-tight sm:text-6xl">
            {subjectTitle}
          </h1>
          <p className="mx-auto mt-3 max-w-2xl text-sm leading-relaxed text-white/70 sm:text-base">
            Choose your {isCurrentAffairs ? "category" : "exam type"} to start a
            timed 10-question practice.
          </p>
        </header>

        <section className="mt-10 grid gap-4 sm:mt-12 sm:grid-cols-2 lg:grid-cols-3">
          {cards.map((c) => (
            <div
              key={c.examType}
              className={`group relative overflow-hidden ${glassCardClass} border-white/10 p-6 shadow-[0_18px_55px_-38px_rgba(0,0,0,0.95)] transition hover:-translate-y-0.5 ${c.ring}`}
            >
              <div className="pointer-events-none absolute inset-0 opacity-0 transition group-hover:opacity-100">
                <div
                  className={`absolute -left-24 -top-24 h-64 w-64 rounded-full blur-3xl ${c.bgGlow}`}
                />
              </div>

              <div className="relative">
                <p
                  className="text-[11px] font-semibold uppercase tracking-[0.38em]"
                  style={{ color: c.accent }}
                >
                  {c.examType}
                </p>
                <h2 className="mt-2 text-2xl font-extrabold tracking-tight">
                  {c.examType} Practice
                </h2>
                <p className="mt-2 text-sm text-white/70">{c.description}</p>
                <p className="mt-2 text-xs text-white/55">
                  {countsByExamType[c.examType]} questions available
                </p>

                <div className="mt-6">
                  <Link
                    href={`/practice/${subject}/${c.examType}`}
                    className="inline-flex w-full items-center justify-center rounded-2xl px-4 py-3 text-sm font-extrabold tracking-wide text-white ring-1 ring-white/10 transition hover:brightness-110 active:scale-[0.99]"
                    style={{
                      backgroundColor: c.accent,
                      boxShadow: `0 25px 90px -45px ${c.accent}cc`,
                    }}
                  >
                    Start Practice
                  </Link>
                </div>

                <p className="mt-3 text-center text-xs text-white/55">
                  10 questions • 30s each • Instant explanations
                </p>
              </div>
            </div>
          ))}
        </section>

        <section className="mt-10 sm:mt-12">
          <Link
            href="/battle"
            className="group relative mx-auto flex max-w-3xl items-center justify-center overflow-hidden rounded-2xl border border-white/10 bg-[#0f0f1a]/55 px-6 py-5 text-center text-base font-extrabold tracking-wide text-white shadow-[0_25px_90px_-55px_rgba(0,0,0,0.95)] backdrop-blur transition hover:border-[#7c3aed]/45 hover:bg-[#1a1a2e]/70 active:scale-[0.99]"
          >
            <span className="pointer-events-none absolute inset-0 opacity-0 transition group-hover:opacity-100">
              <span className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(124,58,237,0.22),transparent_55%)]" />
            </span>
            <span className="relative">⚔️ Go Live - Battle Mode</span>
          </Link>
        </section>
      </div>
    </PageShell>
  );
}
