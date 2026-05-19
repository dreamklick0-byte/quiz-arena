"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { getSupabaseClient } from "@/lib/supabase";
import { PageShell } from "@/app/components/PageShell";
import { getSubjectMeta } from "@/app/data/practiceQuestions";

interface Question {
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

interface League {
  id: string;
  name: string;
  subject: string;
  questions: Question[];
}

export default function LeaguePlayPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const [league, setLeague] = useState<League | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [index, setIndex] = useState(0);
  const [answered, setAnswered] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [score, setScore] = useState(0);
  const [startTime, setStartTime] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [id, setId] = useState<string | null>(null);

  useEffect(() => {
    async function load() { 
      const { id } = await params;
      setId(id);
      const supabase = getSupabaseClient(); 
      const { data: { user } } = await supabase.auth.getUser(); 
      if (!user) { router.push("/auth"); return; } 
    
      // Check entry exists 
      const { data: entry } = await supabase
        .from("league_entries")
        .select("finished, score")
        .eq("league_id", id)
        .eq("user_id", user.id)
        .maybeSingle();
    
      // Already finished — go back 
      if (entry?.finished === true) { router.push("/league"); return; } 
    
      // Fetch league and questions 
      const { data: leagueData } = await supabase 
        .from("leagues") 
        .select("id, name, subject, questions") 
        .eq("id", id) 
        .single(); 
    
      if (!leagueData) { router.push("/league"); return; } 
      if (!leagueData.questions || leagueData.questions.length === 0) { 
        alert("This league has no questions yet. Please contact admin."); 
        router.push("/league"); 
        return; 
      } 
    
      setLeague(leagueData); 
      setQuestions(leagueData.questions); 
      setLoading(false); 
      setStartTime(Date.now()); 
    } 
    load();
  }, [params, router]);

  const q = questions[index];
  const meta = league ? getSubjectMeta(league.subject) : null;

  const handleNext = useCallback(async () => {
    if (index >= questions.length - 1) {
      // Finish
      const supabase = getSupabaseClient();
      const { data: { user } } = await supabase.auth.getUser();
      const timeTaken = startTime ? Math.round((Date.now() - startTime) / 1000) : 0;

      await supabase
        .from("league_entries")
        .update({
          score,
          time_seconds: timeTaken,
          finished: true
        })
        .eq("league_id", id)
        .eq("user_id", user?.id);

      router.push("/league");
      alert(`League completed! Score: ${score}/${questions.length}`);
      return;
    }
    setIndex(i => i + 1);
    setAnswered(false);
    setSelectedIndex(null);
  }, [index, questions.length, score, startTime, id, router]);

  const pickOption = (i: number) => {
    if (answered) return;
    setSelectedIndex(i);
    setAnswered(true);
    if (i === q.correctIndex) {
      setScore(s => s + 1);
    }
  };

  if (loading) return <PageShell overlay="rgba(15,15,26,0.9)"><div className="flex h-screen items-center justify-center text-white">Loading questions...</div></PageShell>;

  return (
    <PageShell overlay="rgba(15,15,26,0.95)">
      <div className="mx-auto max-w-2xl px-4 py-10">
        <header className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-black text-white">{league?.name}</h1>
            <p className="text-xs text-zinc-500 uppercase tracking-widest">{meta?.title} · Question {index + 1}/{questions.length}</p>
          </div>
          <div className="text-right">
            <p className="text-xs font-bold text-zinc-500 uppercase">Score</p>
            <p className="text-xl font-black text-[#f59e0b]">{score}</p>
          </div>
        </header>

        <div className="mt-12">
          <h2 className="text-2xl font-bold text-white leading-snug">{q.question}</h2>
          
          <div className="mt-8 space-y-3">
            {q.options.map((opt: string, i: number) => {
              let style = "border-white/10 bg-white/5 text-zinc-300";
              if (answered) {
                if (i === q.correctIndex) style = "border-emerald-500/50 bg-emerald-500/10 text-emerald-400";
                else if (i === selectedIndex) style = "border-red-500/50 bg-red-500/10 text-red-400";
                else style = "border-white/5 bg-white/0 text-zinc-600";
              }

              return (
                <button
                  key={i}
                  disabled={answered}
                  onClick={() => pickOption(i)}
                  className={`w-full rounded-2xl border p-5 text-left text-sm font-medium transition ${style}`}
                >
                  {opt}
                </button>
              );
            })}
          </div>

          {answered && (
            <div className="mt-8">
              <div className="rounded-2xl bg-[#7c3aed]/10 p-5 border border-[#7c3aed]/20">
                <p className="text-xs font-bold uppercase tracking-widest text-[#7c3aed]">Explanation</p>
                <p className="mt-2 text-sm text-zinc-300 leading-relaxed">{q.explanation}</p>
              </div>
              <button
                onClick={handleNext}
                className="mt-6 w-full rounded-2xl bg-[#7c3aed] py-4 text-sm font-black uppercase tracking-widest text-white shadow-lg shadow-[#7c3aed]/20 transition hover:bg-[#6d28d9]"
              >
                {index === questions.length - 1 ? "Finish League" : "Next Question"}
              </button>
            </div>
          )}
        </div>
      </div>
    </PageShell>
  );
}
