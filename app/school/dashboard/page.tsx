"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { getSupabaseClient } from "@/lib/supabase";

type Student = {
  id: string;
  display_name: string;
  state?: string;
  student_class?: string;
  total_xp: number;
  current_rank: string;
  total_wins: number;
};

type SchoolInfo = {
  id: string;
  name: string;
  school_code: string;
  state: string;
  city: string;
  total_students: number;
  total_wins: number;
};

type SubjectStat = {
  subject: string;
  total_wins: number;
  player_count: number;
};

export default function SchoolDashboard() {
  const router = useRouter();
  const [tab, setTab] = useState("overview");
  const [school, setSchool] = useState<SchoolInfo | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [subjectStats, setSubjectStats] = useState<SubjectStat[]>([]);
  const [loading, setLoading] = useState(true);
  const [adminName, setAdminName] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [removeConfirm, setRemoveConfirm] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ type: string; text: string } | null>(null);

  const fetchDashboard = useCallback(async () => {
    const supabase = getSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      router.push("/school/login");
      return;
    }

    const { data: adminProfile } = await supabase
      .from("school_admin_profiles")
      .select("full_name, school_id")
      .eq("id", user.id)
      .maybeSingle();

    if (!adminProfile?.school_id) {
      router.push("/school/login");
      return;
    }
    setAdminName(adminProfile.full_name || "Admin");

    const { data: schoolData } = await supabase
      .from("schools")
      .select("id, name, school_code, state, city")
      .eq("id", adminProfile.school_id)
      .maybeSingle();

    if (!schoolData) {
      router.push("/school/login");
      return;
    }

    const { data: studentProfiles } = await supabase
      .from("profiles")
      .select("id, display_name, state, student_class, school_code")
      .eq("school_id", adminProfile.school_id)
      .neq("role", "school_admin");

    const studentIds = (studentProfiles || []).map((s: any) => s.id);
    let studentList: Student[] = [];
    let totalWins = 0;

    if (studentIds.length > 0) {
      const { data: rankData } = await supabase.from("user_ranks").select("user_id, total_xp, current_rank").in("user_id", studentIds);
      const { data: winsData } = await supabase.from("user_subject_wins").select("user_id, wins").in("user_id", studentIds);
      const { data: subjectData } = await supabase.from("user_subject_wins").select("subject, wins, user_id").in("user_id", studentIds);

      const subjectMap: Record<string, { wins: number; users: Set<string> }> = {};
      for (const row of subjectData || []) {
        if (!subjectMap[row.subject]) subjectMap[row.subject] = { wins: 0, users: new Set() };
        subjectMap[row.subject].wins += row.wins;
        subjectMap[row.subject].users.add(row.user_id);
      }
      setSubjectStats(
        Object.entries(subjectMap)
          .map(([subject, d]) => ({
            subject,
            total_wins: d.wins,
            player_count: d.users.size,
          }))
          .sort((a, b) => b.total_wins - a.total_wins)
      );

      const rankMap = Object.fromEntries((rankData || []).map((r: any) => [r.user_id, r]));
      const winsMap: Record<string, number> = {};
      for (const w of winsData || []) {
        winsMap[w.user_id] = (winsMap[w.user_id] || 0) + w.wins;
      }

      studentList = (studentProfiles || [])
        .map((p: any) => ({
          id: p.id,
          display_name: p.display_name || "Student",
          state: p.state,
          student_class: p.student_class,
          total_xp: rankMap[p.id]?.total_xp || 0,
          current_rank: rankMap[p.id]?.current_rank || "Unranked",
          total_wins: winsMap[p.id] || 0,
        }))
        .sort((a: Student, b: Student) => b.total_wins - a.total_wins);

      totalWins = Object.values(winsMap).reduce((a, b) => a + b, 0);
    }

    setStudents(studentList);
    setSchool({ ...schoolData, total_students: studentList.length, total_wins: totalWins });
    setLoading(false);
  }, [router]);

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  const handleRemoveStudent = async (studentId: string) => {
    setBusy(true);
    const supabase = getSupabaseClient();
    await supabase.from("profiles").update({ school_id: null, school_code: null }).eq("id", studentId);
    setStudents((prev) => prev.filter((s) => s.id !== studentId));
    setRemoveConfirm(null);
    setMsg({ type: "success", text: "Student removed from school." });
    setBusy(false);
    if (school) setSchool((prev) => (prev ? { ...prev, total_students: prev.total_students - 1 } : null));
  };

  const handleSignOut = async () => {
    const supabase = getSupabaseClient();
    await supabase.auth.signOut();
    document.cookie = "school_session=; path=/; max-age=0";
    router.push("/school/login");
  };

  const filteredStudents = students.filter(
    (s) =>
      s.display_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (s.student_class || "").toLowerCase().includes(searchQuery.toLowerCase())
  );

  const topStudents = [...students].sort((a, b) => b.total_wins - a.total_wins).slice(0, 5);
  const activeStudents = students.filter((s) => s.total_wins > 0).length;
  const avgWins = students.length > 0 ? Math.round(students.reduce((a, s) => a + s.total_wins, 0) / students.length) : 0;

  const tabClass = (t: string) => {
    const base = "px-4 py-2 text-sm font-bold rounded-xl transition";
    const active = "bg-purple-600 text-white";
    const inactive = "text-zinc-400 hover:text-white hover:bg-white/5";
    return base + " " + (tab === t ? active : inactive);
  };

  if (loading)
    return (
      <div className="min-h-screen bg-[#0f0f1a] flex items-center justify-center">
        <p className="text-zinc-400 animate-pulse text-lg">Loading dashboard...</p>
      </div>
    );

  return (
    <div className="min-h-screen bg-[#0f0f1a] text-white px-4 py-6">
      <div className="mx-auto max-w-6xl space-y-6">
        <header className="flex flex-col gap-4 rounded-3xl border border-white/10 bg-white/5 p-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold">{school?.name || "School Dashboard"}</h1>
            <p className="mt-2 text-sm text-zinc-400">
              Code: {school?.school_code || "-"} • {school?.city || "?"}, {school?.state || "?"}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {(["overview", "students", "performance", "settings"] as const).map((t) => (
              <button key={t} onClick={() => setTab(t)} className={tabClass(t)}>
                {t.charAt(0).toUpperCase() + t.slice(1)}
              </button>
            ))}
            <button onClick={handleSignOut} className="rounded-xl bg-red-600 px-4 py-2 text-sm font-bold text-white transition hover:bg-red-500">
              Sign Out
            </button>
          </div>
        </header>

        {msg && (
          <div className="rounded-3xl border border-purple-500/30 bg-white/5 p-4 text-sm text-white">
            {msg.text}
          </div>
        )}

        {tab === "overview" && (
          <div className="grid gap-6 lg:grid-cols-3">
            <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
              <p className="text-sm uppercase tracking-[0.2em] text-zinc-400">Total Students</p>
              <p className="mt-4 text-3xl font-bold">{school?.total_students || 0}</p>
            </div>
            <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
              <p className="text-sm uppercase tracking-[0.2em] text-zinc-400">Total Wins</p>
              <p className="mt-4 text-3xl font-bold">{school?.total_wins || 0}</p>
            </div>
            <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
              <p className="text-sm uppercase tracking-[0.2em] text-zinc-400">Avg Wins / Student</p>
              <p className="mt-4 text-3xl font-bold">{avgWins}</p>
            </div>
          </div>
        )}

        {tab === "students" && (
          <div className="space-y-4">
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search students by name or class..."
              className="w-full rounded-xl bg-white/5 border border-white/10 px-4 py-3 text-sm text-white outline-none focus:border-purple-500/50"
            />
            {filteredStudents.length === 0 ? (
              <div className="rounded-3xl border border-white/10 bg-white/5 p-6 text-zinc-400">
                {searchQuery ? "No students match your search." : "No students have joined yet."}
              </div>
            ) : (
              <div className="space-y-4">
                {filteredStudents.map((s, i) => (
                  <div key={s.id} className="rounded-3xl border border-white/10 bg-white/5 p-5">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <p className="font-semibold">{i + 1}. {s.display_name}</p>
                        <p className="text-sm text-zinc-400">{s.current_rank} • {s.state || "No state"}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="rounded-full bg-purple-600/20 px-3 py-1 text-sm font-semibold text-purple-200">{s.total_wins} wins</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {tab === "performance" && (
          <div className="grid gap-6 lg:grid-cols-2">
            <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
              <h2 className="mb-4 text-xl font-bold">Top Students</h2>
              {topStudents.length === 0 ? (
                <p className="text-zinc-400">No students yet.</p>
              ) : (
                <div className="space-y-3">
                  {topStudents.map((s, i) => (
                    <div key={s.id} className="rounded-3xl bg-[#11121d] p-4">
                      <p className="font-semibold">{i + 1}. {s.display_name}</p>
                      <p className="text-sm text-zinc-400">{s.current_rank} • {s.total_xp} XP</p>
                      <p className="mt-3 font-bold text-purple-300">{s.total_wins} wins</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
              <h2 className="mb-4 text-xl font-bold">Subject Wins</h2>
              {subjectStats.length === 0 ? (
                <p className="text-zinc-400">No subject data yet.</p>
              ) : (
                <div className="space-y-3">
                  {subjectStats.map((s) => (
                    <div key={s.subject} className="rounded-3xl bg-[#11121d] p-4">
                      <p className="font-semibold">{s.subject}</p>
                      <p className="text-sm text-zinc-400">{s.player_count} players</p>
                      <p className="mt-2 font-bold text-purple-300">{s.total_wins} wins</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {tab === "settings" && (
          <div className="rounded-3xl border border-white/10 bg-white/5 p-6 space-y-6">
            <div>
              <h2 className="text-xl font-bold">School Information</h2>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                {[
                  { label: "School Name", value: school?.name },
                  { label: "School Code", value: school?.school_code },
                  { label: "State", value: school?.state },
                  { label: "City", value: school?.city },
                ].map((field) => (
                  <div key={field.label} className="rounded-2xl bg-[#11121d] p-4">
                    <p className="text-sm text-zinc-400">{field.label}</p>
                    <p className="mt-2 font-semibold">{field.value || "No data"}</p>
                  </div>
                ))}
              </div>
            </div>
            <div className="rounded-2xl bg-[#11121d] p-6">
              <h3 className="text-lg font-semibold">Student Join Instructions</h3>
              <p className="mt-3 text-sm text-zinc-400">
                Students sign up at quizarena.com.ng/auth, go to their Account page, scroll down and enter school code: {school?.school_code || "-"}, then click Join School.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
