const fs = require('fs');
const content = `"use client";

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
  const [school, setSchool] = useState<any>(null);
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
    if (!user) { router.push("/school/login"); return; }

    const { data: adminProfile } = await supabase
      .from("school_admin_profiles")
      .select("full_name, school_id")
      .eq("id", user.id)
      .maybeSingle();

    if (!adminProfile?.school_id) { router.push("/school/login"); return; }
    setAdminName(adminProfile.full_name || "Admin");

    const { data: schoolData } = await supabase
      .from("schools")
      .select("id, name, school_code, state, city")
      .eq("id", adminProfile.school_id)
      .maybeSingle();

    if (!schoolData) { router.push("/school/login"); return; }

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
        if (!subjectMap[row.subject]) subjectMap[row.subject] = { wins: 0, users: new Set<string>() };
        subjectMap[row.subject].wins += row.wins;
        subjectMap[row.subject].users.add(row.user_id);
      }
      setSubjectStats(Object.entries(subjectMap).map(([subject, d]: any) => ({
        subject, total_wins: d.wins, player_count: d.users.size,
      })).sort((a, b) => b.total_wins - a.total_wins));

      const rankMap = Object.fromEntries((rankData || []).map((r: any) => [r.user_id, r]));
      const winsMap: Record<string, number> = {};
      for (const w of winsData || []) { winsMap[w.user_id] = (winsMap[w.user_id] || 0) + w.wins; }

      studentList = (studentProfiles || []).map((p: any) => ({
        id: p.id,
        display_name: p.display_name || "Student",
        state: p.state,
        student_class: p.student_class,
        total_xp: rankMap[p.id]?.total_xp || 0,
        current_rank: rankMap[p.id]?.current_rank || "Unranked",
        total_wins: winsMap[p.id] || 0,
      })).sort((a: Student, b: Student) => b.total_wins - a.total_wins);

      totalWins = Object.values(winsMap).reduce((a, b) => a + b, 0);
    }

    setStudents(studentList);
    setSchool({ ...schoolData, total_students: studentList.length, total_wins: totalWins });
    setLoading(false);
  }, [router]);

  useEffect(() => { fetchDashboard(); }, [fetchDashboard]);

  const handleRemoveStudent = async (studentId: string) => {
    setBusy(true);
    const supabase = getSupabaseClient();
    await supabase.from("profiles").update({ school_id: null, school_code: null }).eq("id", studentId);
    setStudents(prev => prev.filter(s => s.id !== studentId));
    setRemoveConfirm(null);
    setMsg({ type: "success", text: "Student removed from school." });
    setBusy(false);
    if (school) setSchool(prev => prev ? { ...prev, total_students: (prev as any).total_students - 1 } : null);
  };

  const handleSignOut = async () => {
    const supabase = getSupabaseClient();
    await supabase.auth.signOut();
    document.cookie = "school_session=; path=/; max-age=0";
    router.push("/school/login");
  };

  const filteredStudents = students.filter(s =>
    s.display_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (s.student_class || "").toLowerCase().includes(searchQuery.toLowerCase())
  );

  const topStudents = [...students].sort((a, b) => b.total_wins - a.total_wins).slice(0, 5);
  const activeStudents = students.filter(s => s.total_wins > 0).length;
  const avgWins = students.length > 0 ? Math.round(students.reduce((a, s) => a + s.total_wins, 0) / students.length) : 0;
  const tabClass = (t: string) => ["px-4 py-2 text-sm font-bold rounded-xl transition", tab === t ? "bg-purple-600 text-white" : "text-zinc-400 hover:text-white hover:bg-white/5"].join(" ");

  if (loading) return (
    <div className="p-8 text-center text-white/80">Loading dashboard...</div>
  );

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">{(school as any)?.name}</h1>
        <p className="text-sm text-white/60">Code: {(school as any)?.school_code} - {(school as any)?.city}, {(school as any)?.state}</p>
      </div>

      <div className="flex items-center justify-between mb-6">
        <div>Admin: {adminName}</div>
        <button onClick={handleSignOut} className="text-sm text-zinc-400 hover:text-white">Sign Out</button>
      </div>

      <div className="flex gap-2 mb-6">
        <button onClick={() => setTab("overview")} className={tabClass("overview")}>Overview</button>
        <button onClick={() => setTab("students")} className={tabClass("students")}>Students {(school as any)?.total_students}</button>
        <button onClick={() => setTab("performance")} className={tabClass("performance")}>Performance</button>
        <button onClick={() => setTab("settings")} className={tabClass("settings")}>Settings</button>
      </div>

      {msg && (
        <div className="mb-4 p-3 rounded bg-white/5 text-white">{msg.text}</div>
      )}

      {tab === "overview" && (
        <div>
          <div className="grid grid-cols-4 gap-4 mb-6">
            {[
              { label: "Total Students", value: (school as any)?.total_students || 0, color: "text-purple-400" },
              { label: "Total Wins", value: (school as any)?.total_wins || 0, color: "text-yellow-500" },
              { label: "Active Players", value: activeStudents, color: "text-emerald-400" },
              { label: "Avg Wins/Student", value: avgWins, color: "text-blue-400" },
            ].map(stat => (
              <div key={stat.label} className="p-4 bg-white/3 rounded">
                <div className={`text-2xl font-bold ${stat.color}`}>{(stat as any).value}</div>
                <div className="text-sm text-white/60">{stat.label}</div>
              </div>
            ))}
          </div>

          <div className="mb-6 bg-white/5 p-4 rounded">
            <h2 className="font-bold text-white mb-2">Share Your School Code</h2>
            <p className="text-sm text-white/60">Students enter this code on their account page to join your school.</p>
            <div className="mt-3 flex gap-2 items-center">
              <div className="font-mono bg-black/30 px-3 py-2 rounded">{(school as any)?.school_code}</div>
              <button onClick={() => { navigator.clipboard.writeText((school as any)?.school_code || ""); setMsg({ type: "success", text: "School code copied!" }); }} className="text-sm font-bold text-white bg-purple-600 hover:bg-purple-500 px-4 py-3 rounded-xl transition">Copy</button>
            </div>
          </div>

          <div className="mb-6">
            <h2 className="font-bold text-white mb-2">Top Students</h2>
            {topStudents.length === 0 ? (
              <div className="text-sm text-white/60">No students yet. Share your school code to get started!</div>
            ) : (
              <div className="grid grid-cols-1 gap-2">
                {topStudents.map((s, i) => (
                  <div key={s.id} className="p-3 bg-white/3 rounded flex justify-between items-center">
                    <div>
                      <div className="text-sm font-bold">{i + 1}. {s.display_name}</div>
                      <div className="text-xs text-white/60">{s.current_rank} - {s.total_xp} XP</div>
                    </div>
                    <div className="text-sm font-bold">{s.total_wins} wins</div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {subjectStats.length > 0 && (
            <div className="mb-6">
              <h2 className="font-bold text-white mb-2">Top Subjects</h2>
              <div className="grid grid-cols-3 gap-2">
                {subjectStats.slice(0, 6).map(s => (
                  <div key={s.subject} className="p-3 bg-white/3 rounded">
                    <div className="font-bold">{s.subject}</div>
                    <div className="text-sm text-white/60">{s.total_wins} wins - {s.player_count} players</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {tab === "students" && (
        <div>
          <input value={searchQuery} onChange={(e: any) => setSearchQuery(e.target.value)} placeholder="Search students by name or class..." className="w-full rounded-xl bg-white/5 border border-white/10 px-4 py-2.5 text-sm text-white placeholder-zinc-600 outline-none focus:border-purple-500/50" />

          {filteredStudents.length === 0 ? (
            <div className="mt-4 text-sm text-white/60">{searchQuery ? "No students match your search." : "No students have joined yet."}</div>
          ) : (
            <div className="grid gap-2 mt-4">
              {filteredStudents.map((s, i) => (
                <div key={s.id} className="p-3 bg-white/3 rounded flex justify-between items-center">
                  <div>
                    <div className="text-sm font-bold">{i + 1}. {s.display_name}</div>
                    <div className="text-xs text-white/60">{s.current_rank} - {s.total_xp} XP - {s.state || "No state"}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-bold">{s.total_wins} wins</div>
                    {s.student_class && <div className="text-xs text-white/60">{s.student_class}</div>}
                    {removeConfirm === s.id ? (
                      <div className="mt-2 flex gap-2">
                        <button onClick={() => handleRemoveStudent(s.id)} disabled={busy} className="text-xs font-bold text-white bg-red-600 hover:bg-red-500 px-3 py-1.5 rounded-lg">Confirm</button>
                        <button onClick={() => setRemoveConfirm(null)} className="text-xs text-zinc-400 hover:text-white px-2 py-1.5 rounded-lg">Cancel</button>
                      </div>
                    ) : (
                      <button onClick={() => setRemoveConfirm(s.id)} className="text-xs text-zinc-600 hover:text-red-400 transition">Remove</button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === "performance" && (
        <div>
          <h2 className="font-bold text-white mb-2">Student Performance</h2>
          {students.length === 0 ? <div className="text-sm text-white/60">No students yet.</div> : (
            <div className="grid gap-2">
              {students.slice(0, 10).map(s => {
                const maxWins = Math.max(...students.map(x => x.total_wins), 1);
                const pct = Math.round((s.total_wins / maxWins) * 100);
                return (
                  <div key={s.id} className="p-3 bg-white/3 rounded flex justify-between items-center">
                    <div>
                      <div className="text-sm font-bold">{s.display_name}</div>
                      <div className="text-xs text-white/60">{s.total_wins} wins</div>
                    </div>
                    <div className="w-40 h-3 bg-white/5 rounded overflow-hidden">
                      <div style={{ width: `${pct}%` }} className="h-full bg-purple-600"></div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <h2 className="font-bold text-white my-4">Subject Breakdown</h2>
          {subjectStats.length === 0 ? <div className="text-sm text-white/60">No battle data yet.</div> : (
            <div className="grid gap-2">
              {subjectStats.map(s => {
                const maxWins = Math.max(...subjectStats.map(x => x.total_wins), 1);
                const pct = Math.round((s.total_wins / maxWins) * 100);
                return (
                  <div key={s.subject} className="p-3 bg-white/3 rounded flex justify-between items-center">
                    <div>
                      <div className="text-sm font-bold">{s.subject}</div>
                      <div className="text-xs text-white/60">{s.total_wins} wins</div>
                    </div>
                    <div className="w-40 h-3 bg-white/5 rounded overflow-hidden">
                      <div style={{ width: `${pct}%` }} className="h-full bg-yellow-400"></div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <div className="mt-6 grid grid-cols-3 gap-4">
            <div className="p-3 bg-white/3 rounded text-center">
              <div className="text-2xl font-bold">{activeStudents}</div>
              <div className="text-xs text-white/60">Active Students</div>
            </div>
            <div className="p-3 bg-white/3 rounded text-center">
              <div className="text-2xl font-bold">{students.length - activeStudents}</div>
              <div className="text-xs text-white/60">Inactive</div>
            </div>
            <div className="p-3 bg-white/3 rounded text-center">
              <div className="text-2xl font-bold">{avgWins}</div>
              <div className="text-xs text-white/60">Avg Wins</div>
            </div>
          </div>
        </div>
      )}

      {tab === "settings" && (
        <div>
          <h2 className="font-bold text-white mb-2">School Information</h2>
          <div className="grid grid-cols-2 gap-2 mb-4">
            {[
              { label: "School Name", value: (school as any)?.name },
              { label: "School Code", value: (school as any)?.school_code },
              { label: "State", value: (school as any)?.state },
              { label: "City", value: (school as any)?.city },
            ].map(f => (
              <div key={f.label} className="p-3 bg-white/3 rounded">
                <div className="text-sm text-white/60">{f.label}</div>
                <div className="text-sm font-bold">{f.value || "No data"}</div>
              </div>
            ))}
          </div>

          <div className="mb-6">
            <h3 className="font-bold text-white mb-2">Student Join Instructions</h3>
            <p className="text-sm text-white/60">Students sign up at quizarena.com.ng/auth, go to their Account page, scroll down and enter school code: {(school as any)?.school_code}, then click Join School.</p>
          </div>

          <div className="mt-4">
            <button onClick={handleSignOut} className="text-sm font-bold text-white bg-red-600 px-4 py-2 rounded">Sign Out</button>
          </div>
        </div>
      )}

    </div>
  );
}
`;

fs.writeFileSync('app/school/dashboard/page.tsx', content, 'utf8');
console.log('done');
