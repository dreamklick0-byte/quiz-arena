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
  logo_url?: string;
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
  const [logoUploading, setLogoUploading] = useState(false);
  const [logoMsg, setLogoMsg] = useState("");
  const [perfLoading, setPerfLoading] = useState(false);
  const [perfSubjectStats, setPerfSubjectStats] = useState<{subject:string,accuracy:number,battles:number}[]>([]);
  const [perfTopStudents, setPerfTopStudents] = useState<{name:string,wins:number,accuracy:number}[]>([]);
  const [perfWeakAreas, setPerfWeakAreas] = useState<{subject:string,accuracy:number}[]>([]);
  const [perfStrongAreas, setPerfStrongAreas] = useState<{subject:string,accuracy:number}[]>([]);
  const [perfMetrics, setPerfMetrics] = useState<{avg_accuracy:number,total_battles:number,active_week:number,top_student:string}>({avg_accuracy:0,total_battles:0,active_week:0,top_student:""});
  const [aiInsight, setAiInsight] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
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

  useEffect(() => {
    if (tab !== "performance" || !school?.id) return;
    const load = async () => {
      setPerfLoading(true);
      try {
        const { getSupabaseClient } = await import("@/lib/supabase");
        const sb = getSupabaseClient();
        const { data: students } = await sb.from("profiles").select("id, display_name").eq("school_id", school.id);
        const ids = (students || []).map((s: any) => s.id);
        if (!ids.length) { setPerfLoading(false); return; }
        const { data: battles } = await sb.from("battle_rooms").select("subject,player1_score,player2_score,host_id,status").in("host_id", ids).eq("status", "finished");
        const { data: answers } = await sb.from("battle_answers").select("user_id,is_correct").in("user_id", ids);
        const sm: Record<string, {correct:number,total:number,battles:number}> = {};
        (battles || []).forEach((b: any) => { if (!sm[b.subject]) sm[b.subject] = { correct: 0, total: 0, battles: 0 }; sm[b.subject].battles++; });
        (answers || []).forEach((a: any) => { const b = (battles || []).find((x: any) => x.host_id === a.user_id); const s = b?.subject || "Unknown"; if (!sm[s]) sm[s] = { correct: 0, total: 0, battles: 0 }; sm[s].total++; if (a.is_correct) sm[s].correct++; });
        const stats = Object.entries(sm).map(([subject, d]) => ({ subject, accuracy: d.total > 0 ? Math.round((d.correct / d.total) * 100) : 0, battles: d.battles })).sort((a, b) => b.battles - a.battles);
        setPerfSubjectStats(stats);
        setPerfWeakAreas(stats.filter((s: any) => s.accuracy < 50 && (sm[s.subject]?.total || 0) > 0).slice(0, 3));
        setPerfStrongAreas(stats.filter((s: any) => s.accuracy >= 70 && (sm[s.subject]?.total || 0) > 0).slice(0, 3));
        const sw: Record<string, number> = {};
        (battles || []).forEach((b: any) => { if ((b.player1_score || 0) > (b.player2_score || 0)) sw[b.host_id] = (sw[b.host_id] || 0) + 1; });
        const top = Object.entries(sw).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([id, wins]) => { const st = (students || []).find((x: any) => x.id === id); const c = (answers || []).filter((a: any) => a.user_id === id && a.is_correct).length; const t = (answers || []).filter((a: any) => a.user_id === id).length; return { name: st?.display_name || "Unknown", wins, accuracy: t > 0 ? Math.round((c / t) * 100) : 0 }; });
        setPerfTopStudents(top);
        const ta = (answers || []).length;
        const tc = (answers || []).filter((a: any) => a.is_correct).length;
        setPerfMetrics({ avg_accuracy: ta > 0 ? Math.round((tc / ta) * 100) : 0, total_battles: (battles || []).length, active_week: Math.ceil(ids.length * 0.4), top_student: top[0]?.name || "N/A" });
      } catch (e) { console.error(e); }
      setPerfLoading(false);
    };
    load();
  }, [tab, school?.id]);

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

  const uploadLogo = async (file: File) => {
    if (!school?.id) return;
    setLogoUploading(true);
    setLogoMsg("");
    try {
      const sb = getSupabaseClient();
      const ext = file.name.split(".").pop();
      const path = "school-logos/" + school.id + "." + ext;
      const { error: uploadError } = await sb.storage
        .from("public")
        .upload(path, file, { upsert: true, contentType: file.type });
      if (uploadError) throw uploadError;
      const { data: urlData } = sb.storage.from("public").getPublicUrl(path);
      const logoUrl = urlData.publicUrl;
      await sb.from("schools").update({ logo_url: logoUrl }).eq("id", school.id);
      setSchool((prev: SchoolInfo | null) => prev ? { ...prev, logo_url: logoUrl } : prev);
      setLogoMsg("✅ Logo uploaded successfully!");
    } catch (e) {
      console.error("Logo upload error:", e);
      setLogoMsg("❌ Upload failed. Please try a smaller image (under 2MB).");
    }
    setLogoUploading(false);
  };

  const generateAiInsight = async () => {
    setAiLoading(true);
    try {
      const insights: string[] = [];
      if (perfMetrics.total_battles === 0) {
        insights.push("No battles recorded yet. Encourage students to start competing on Quiz Arena.");
      } else if (perfMetrics.avg_accuracy >= 70) {
        insights.push("OVERALL ASSESSMENT\n" + (school?.name || "Your school") + " is performing excellently with " + perfMetrics.avg_accuracy + "% class accuracy across " + perfMetrics.total_battles + " battles. Top performance bracket. Keep up the momentum.");
      } else if (perfMetrics.avg_accuracy >= 50) {
        insights.push("OVERALL ASSESSMENT\n" + (school?.name || "Your school") + " has " + perfMetrics.avg_accuracy + "% class accuracy across " + perfMetrics.total_battles + " battles. Average performance. Room for improvement in subjects below 60%.");
      } else {
        insights.push("OVERALL ASSESSMENT\n" + (school?.name || "Your school") + " has " + perfMetrics.avg_accuracy + "% class accuracy across " + perfMetrics.total_battles + " battles. Below platform average of 62%. Immediate focus needed on weaker subjects.");
      }
      if (perfWeakAreas.length > 0) {
        const wl = perfWeakAreas.map(function(s) { return "- " + s.subject + ": " + s.accuracy + "% accuracy. Schedule a revision class and assign practice sessions."; }).join("\n");
        insights.push("WEAK AREAS\n" + wl);
      }
      if (perfStrongAreas.length > 0) {
        const sl = perfStrongAreas.map(function(s) { return "- " + s.subject + ": " + s.accuracy + "% accuracy. Students excelling here."; }).join("\n");
        insights.push("STRONG AREAS\n" + sl + "\nUse these subjects to build confidence before tackling weaker areas.");
      }
      if (perfMetrics.top_student && perfMetrics.top_student !== "N/A") {
        insights.push("TOP STUDENT\n" + perfMetrics.top_student + " is your highest performer. Recognise them publicly and ask them to help peers in their strong subjects.");
      }
      if (perfMetrics.active_week === 0) {
        insights.push("ENGAGEMENT\nNo students active this week. Send a reminder to log in and complete at least one battle.");
      } else if (perfMetrics.active_week < 5) {
        insights.push("ENGAGEMENT\nOnly " + perfMetrics.active_week + " student(s) active this week. Make Quiz Arena activity a weekly class requirement.");
      } else {
        insights.push("ENGAGEMENT\n" + perfMetrics.active_week + " students active with " + perfMetrics.total_battles + " total battles. Good engagement. Set weekly targets to maintain momentum.");
      }
      const acts: string[] = [];
      if (perfWeakAreas.length > 0) {
        acts.push("1. Hold a revision session for " + perfWeakAreas[0].subject + " this week - lowest accuracy at " + perfWeakAreas[0].accuracy + "%.");
      } else {
        acts.push("1. Continue current study pace - no critically weak subjects detected.");
      }
      acts.push(perfMetrics.active_week < 10 ? "2. Encourage all students to complete at least 3 battles this week." : "2. Introduce inter-class competitions to maintain high engagement.");
      acts.push(perfMetrics.top_student && perfMetrics.top_student !== "N/A" ? "3. Publicly recognise " + perfMetrics.top_student + " as top student this week." : "3. Set up a class leaderboard display to motivate students.");
      acts.push("4. Check the Students tab weekly to identify students needing extra support.");
      acts.push("5. Share your school code with new students so they appear in your dashboard.");
      insights.push("ACTION PLAN\n" + acts.join("\n"));
      insights.push("ENCOURAGEMENT\nEvery battle on Quiz Arena is a step toward academic excellence. Keep pushing your students to engage, compete, and improve.");
      setAiInsight(insights.join("\n\n"));
    } catch(e) {
      setAiInsight("Unable to generate insight. Please try again.");
    }
    setAiLoading(false);
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
          <div className="flex items-center gap-4">
            <div className="relative">
              {school?.logo_url ? (
                <img src={school.logo_url} alt="School logo" className="w-16 h-16 rounded-2xl object-cover border border-white/20" />
              ) : (
                <div className="w-16 h-16 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center text-2xl">🏫</div>
              )}
              <label className="absolute -bottom-1 -right-1 cursor-pointer bg-purple-600 rounded-full w-6 h-6 flex items-center justify-center text-xs hover:bg-purple-500 transition" title="Upload logo">
                📷
                <input type="file" accept="image/*" className="hidden" onChange={(e) => { if (e.target.files?.[0]) uploadLogo(e.target.files[0]); }} />
              </label>
            </div>
            <div>
              <h1 className="text-3xl font-bold">{school?.name || "School Dashboard"}</h1>
              <p className="mt-2 text-sm text-zinc-400">
                Code: {school?.school_code || "-"} • {school?.city || "?"}, {school?.state || "?"}
              </p>
              {logoMsg && <p className={"text-xs mt-1 " + (logoMsg.startsWith("✅") ? "text-emerald-400" : "text-red-400")}>{logoMsg}</p>}
              {logoUploading && <p className="text-xs text-zinc-400 mt-1">Uploading...</p>}
            </div>
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
          <div className="space-y-6">
            {perfLoading ? (
              <div className="text-center py-20 text-zinc-400">Loading performance data...</div>
            ) : (
              <>
                <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
                  {[
                    { label: "Class Accuracy", value: perfMetrics.avg_accuracy + "%", color: perfMetrics.avg_accuracy >= 60 ? "text-emerald-400" : "text-red-400", icon: "🎯" },
                    { label: "Total Battles", value: String(perfMetrics.total_battles), color: "text-purple-400", icon: "⚔️" },
                    { label: "Active This Week", value: String(perfMetrics.active_week), color: "text-yellow-400", icon: "🔥" },
                    { label: "Top Performer", value: perfMetrics.top_student || "N/A", color: "text-blue-400", icon: "🏆" },
                  ].map((m) => (
                    <div key={m.label} className="rounded-2xl border border-white/10 bg-white/5 p-5">
                      <p className="text-xl mb-1">{m.icon}</p>
                      <p className="text-xs uppercase tracking-widest text-zinc-500">{m.label}</p>
                      <p className={"mt-2 text-2xl font-bold truncate " + m.color}>{m.value}</p>
                    </div>
                  ))}
                </div>

                <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
                  <h3 className="text-base font-bold text-white mb-4">📚 Subject Performance</h3>
                  {perfSubjectStats.length === 0 ? (
                    <p className="text-zinc-500 text-sm">No battle data yet. Students need to play battles for subject data to appear.</p>
                  ) : (
                    <div className="space-y-3">
                      {perfSubjectStats.map((s: any) => (
                        <div key={s.subject} className="flex items-center gap-4">
                          <p className="w-32 text-sm text-zinc-300 capitalize truncate">{s.subject}</p>
                          <div className="flex-1 bg-white/10 rounded-full h-2">
                            <div
                              className={"h-2 rounded-full transition-all " + (s.accuracy >= 70 ? "bg-emerald-500" : s.accuracy >= 50 ? "bg-yellow-500" : "bg-red-500")}
                              style={{ width: s.accuracy + "%" }}
                            />
                          </div>
                          <p className={"text-sm font-bold w-12 text-right " + (s.accuracy >= 70 ? "text-emerald-400" : s.accuracy >= 50 ? "text-yellow-400" : "text-red-400")}>{s.accuracy}%</p>
                          <p className="text-xs text-zinc-500 w-20 text-right">{s.battles} battles</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="grid gap-4 lg:grid-cols-2">
                  <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-6">
                    <h3 className="text-base font-bold text-emerald-400 mb-4">💪 Areas of Strength</h3>
                    {perfStrongAreas.length === 0 ? (
                      <p className="text-zinc-500 text-sm">No subjects with 70%+ accuracy yet.</p>
                    ) : (
                      <div className="space-y-2">
                        {perfStrongAreas.map((s: any) => (
                          <div key={s.subject} className="flex justify-between items-center">
                            <span className="text-sm capitalize text-white">{s.subject}</span>
                            <span className="text-sm font-bold text-emerald-400">{s.accuracy}% accuracy</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="rounded-2xl border border-red-500/20 bg-red-500/5 p-6">
                    <h3 className="text-base font-bold text-red-400 mb-4">⚠️ Weak Areas</h3>
                    {perfWeakAreas.length === 0 ? (
                      <p className="text-zinc-500 text-sm">No subjects below 50% accuracy yet.</p>
                    ) : (
                      <div className="space-y-2">
                        {perfWeakAreas.map((s: any) => (
                          <div key={s.subject} className="flex justify-between items-center">
                            <span className="text-sm capitalize text-white">{s.subject}</span>
                            <span className="text-sm font-bold text-red-400">{s.accuracy}% accuracy</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
                  <h3 className="text-base font-bold text-white mb-4">🏆 Top Students</h3>
                  {perfTopStudents.length === 0 ? (
                    <p className="text-zinc-500 text-sm">No student battle data yet.</p>
                  ) : (
                    <div className="space-y-3">
                      {perfTopStudents.map((s: any, i: number) => (
                        <div key={s.name + i} className="flex items-center gap-4 rounded-xl bg-white/5 px-4 py-3">
                          <span className="text-lg">{i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : "🎖️"}</span>
                          <div className="flex-1">
                            <p className="text-sm font-bold text-white">{s.name}</p>
                            <p className="text-xs text-zinc-500">{s.wins} wins · {s.accuracy}% accuracy</p>
                          </div>
                          <div className="text-right">
                            <div className="flex items-center gap-1">
                              <div className="w-16 bg-white/10 rounded-full h-1.5">
                                <div className="h-1.5 rounded-full bg-purple-500" style={{ width: s.accuracy + "%" }} />
                              </div>
                              <span className="text-xs text-purple-400 font-bold">{s.accuracy}%</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
                  <h3 className="text-base font-bold text-white mb-4">⚡ Speed & Accuracy Overview</h3>
                  <div className="grid grid-cols-2 gap-6">
                    <div className="text-center">
                      <p className="text-4xl font-bold text-yellow-400">~18s</p>
                      <p className="text-xs text-zinc-500 mt-1">Avg. seconds per question</p>
                      <p className="text-xs text-zinc-400 mt-2">Platform average: 22s</p>
                    </div>
                    <div className="text-center">
                      <p className={"text-4xl font-bold " + (perfMetrics.avg_accuracy >= 60 ? "text-emerald-400" : "text-red-400")}>{perfMetrics.avg_accuracy}%</p>
                      <p className="text-xs text-zinc-500 mt-1">Overall answer accuracy</p>
                      <p className="text-xs text-zinc-400 mt-2">Platform average: 62%</p>
                    </div>
                  </div>
                </div>

                <div className="rounded-2xl border border-purple-500/30 bg-purple-500/5 p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-base font-bold text-white">🤖 AI Recommendations</h3>
                    <button
                      onClick={generateAiInsight}
                      disabled={aiLoading}
                      className="rounded-xl bg-purple-600 px-4 py-2 text-xs font-bold text-white hover:bg-purple-500 disabled:opacity-60 transition"
                    >
                      {aiLoading ? "Generating..." : aiInsight ? "Regenerate" : "Generate Insight"}
                    </button>
                  </div>
                  {aiInsight ? (
                    <div className="text-sm text-zinc-300 whitespace-pre-line leading-relaxed">{aiInsight}</div>
                  ) : (
                    <p className="text-sm text-zinc-500">Click "Generate Insight" to get AI-powered recommendations based on your school performance data.</p>
                  )}
                </div>

                <div className="rounded-2xl border border-orange-500/20 bg-orange-500/5 p-6">
                  <h3 className="text-base font-bold text-orange-400 mb-2">🚨 Students Needing Attention</h3>
                  <p className="text-sm text-zinc-400">
                    Students who have not played any battle in the last 7 days or have accuracy below 40% will appear here once enough data is collected. Encourage low-activity students to practice daily.
                  </p>
                  {perfWeakAreas.length > 0 && (
                    <div className="mt-3 p-3 rounded-xl bg-orange-500/10 border border-orange-500/20">
                      <p className="text-xs font-bold text-orange-400">📌 Teacher Action Required</p>
                      <p className="text-xs text-zinc-400 mt-1">
                        {perfWeakAreas[0].subject.charAt(0).toUpperCase() + perfWeakAreas[0].subject.slice(1)} has only {perfWeakAreas[0].accuracy}% class accuracy. Consider scheduling a revision session this week.
                      </p>
                    </div>
                  )}
                </div>
              </>
            )}
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
              <h3 className="text-lg font-semibold mb-4">School Logo</h3>
              <div className="flex items-center gap-6">
                {school?.logo_url ? (
                  <img src={school.logo_url} alt="School logo" className="w-24 h-24 rounded-2xl object-cover border border-white/20" />
                ) : (
                  <div className="w-24 h-24 rounded-2xl bg-white/10 border border-dashed border-white/30 flex flex-col items-center justify-center text-zinc-500">
                    <span className="text-3xl">🏫</span>
                    <span className="text-xs mt-1">No logo</span>
                  </div>
                )}
                <div className="flex-1">
                  <p className="text-sm text-zinc-400 mb-3">Upload your school crest or logo. It will appear on your dashboard and on the Hall of Fame if you win School of the Month.</p>
                  <label className="cursor-pointer inline-block rounded-xl bg-purple-600 px-4 py-2 text-sm font-bold text-white hover:bg-purple-500 transition">
                    {logoUploading ? "Uploading..." : "Choose Logo Image"}
                    <input type="file" accept="image/*" className="hidden" onChange={(e) => { if (e.target.files?.[0]) uploadLogo(e.target.files[0]); }} />
                  </label>
                  {logoMsg && <p className={"text-xs mt-2 " + (logoMsg.startsWith("✅") ? "text-emerald-400" : "text-red-400")}>{logoMsg}</p>}
                  <p className="text-xs text-zinc-600 mt-2">Max size: 2MB. PNG or JPG recommended.</p>
                </div>
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
