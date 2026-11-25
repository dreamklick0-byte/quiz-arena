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

type StudentProgress = {
  id: string;
  user_id: string;
  display_name: string;
  email: string;
  subject: string;
  score: number;
  total_questions: number;
  percentage: number;
  played_at: string;
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
  
  // PERFORMANCE TAB STATE
  const [perfData, setPerfData] = useState<{
    display_name: string;
    email: string;
    subjects: string[];
    avg_score: number;
    total_sessions: number;
    last_active: string;
    status: "Strong" | "Average" | "Needs Help";
  }[]>([]);
  const [perfLoading, setPerfLoading] = useState(false);

  // REPORTS TAB STATE
  const [selectedStudentId, setSelectedStudentId] = useState<string>("");
  const [studentReport, setStudentReport] = useState<{
    subject: string;
    avg_score: number;
  }[]>([]);
  const [aiRecommendation, setAiRecommendation] = useState<{
    strong: string[];
    weak: string[];
    focus: string;
  } | null>(null);

  const [removeConfirm, setRemoveConfirm] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [logoUploading, setLogoUploading] = useState(false);
  const [logoMsg, setLogoMsg] = useState("");
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
      .select("id, name, school_code, state, city, logo_url")
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
    const loadPerformance = async () => {
      setPerfLoading(true);
      try {
        const supabase = getSupabaseClient();
        
        // Fetch all progress for students in this school
        // We join with profiles (for display_name) and auth.users (for email via profiles if stored or another join)
        // Since we can't join auth.users easily in client SDK, we'll assume email is in profiles or just use display_name
        
        const { data: progressData, error } = await supabase
          .from("student_progress")
          .select(`
            user_id,
            subject,
            percentage,
            played_at,
            profiles:user_id (display_name, email)
          `)
          .eq("school_id", school.id);

        if (error) throw error;

        // Group by user
        const userMap: Record<string, any> = {};
        (progressData || []).forEach((row: any) => {
          const uid = row.user_id;
          if (!userMap[uid]) {
            userMap[uid] = {
              display_name: row.profiles?.display_name || "Unknown",
              email: row.profiles?.email || "-",
              subjects: new Set(),
              total_percentage: 0,
              count: 0,
              last_active: row.played_at,
            };
          }
          userMap[uid].subjects.add(row.subject);
          userMap[uid].total_percentage += Number(row.percentage);
          userMap[uid].count += 1;
          if (new Date(row.played_at) > new Date(userMap[uid].last_active)) {
            userMap[uid].last_active = row.played_at;
          }
        });

        const formatted = Object.values(userMap).map((u: any) => {
          const avg = u.count > 0 ? Math.round(u.total_percentage / u.count) : 0;
          let status: "Strong" | "Average" | "Needs Help" = "Average";
          if (avg > 70) status = "Strong";
          else if (avg < 50) status = "Needs Help";

          return {
            display_name: u.display_name,
            email: u.email,
            subjects: Array.from(u.subjects) as string[],
            avg_score: avg,
            total_sessions: u.count,
            last_active: u.last_active,
            status,
          };
        });

        setPerfData(formatted);
      } catch (e) {
        console.error("Performance load error:", e);
      }
      setPerfLoading(false);
    };
    loadPerformance();
  }, [tab, school?.id]);

  useEffect(() => {
    if (tab !== "reports" || !selectedStudentId) return;
    const loadReport = async () => {
      try {
        const supabase = getSupabaseClient();
        const { data: progressData } = await supabase
          .from("student_progress")
          .select("subject, percentage")
          .eq("user_id", selectedStudentId);

        if (!progressData) return;

        const subMap: Record<string, { total: number; count: number }> = {};
        progressData.forEach((row: any) => {
          if (!subMap[row.subject]) subMap[row.subject] = { total: 0, count: 0 };
          subMap[row.subject].total += Number(row.percentage);
          subMap[row.subject].count += 1;
        });

        const report = Object.entries(subMap).map(([subject, d]) => ({
          subject,
          avg_score: Math.round(d.total / d.count),
        }));

        setStudentReport(report);

        // Generate recommendations
        const strong = report.filter(r => r.avg_score > 70).map(r => r.subject);
        const weak = report.filter(r => r.avg_score < 50).map(r => r.subject);
        const focus = report.length > 0 ? [...report].sort((a, b) => a.avg_score - b.avg_score)[0].subject : "None";

        setAiRecommendation({ strong, weak, focus });
      } catch (e) {
        console.error("Report load error:", e);
      }
    };
    loadReport();
  }, [tab, selectedStudentId]);

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
            <button onClick={() => setTab("overview")} className={tabClass("overview")}>Overview</button>
            <button onClick={() => setTab("students")} className={tabClass("students")}>Students ({school?.total_students})</button>
            <button onClick={() => setTab("performance")} className={tabClass("performance")}>Performance</button>
            <button onClick={() => setTab("reports")} className={tabClass("reports")}>Reports</button>
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
            <h2 className="text-2xl font-bold">Student Performance</h2>
            <div className="overflow-hidden rounded-3xl border border-white/10 bg-white/5">
              <table className="w-full text-left text-sm">
                <thead className="bg-white/10 text-xs font-black uppercase tracking-widest text-zinc-400">
                  <tr>
                    <th className="px-6 py-4">Student</th>
                    <th className="px-6 py-4">Subjects</th>
                    <th className="px-6 py-4">Avg Score</th>
                    <th className="px-6 py-4">Sessions</th>
                    <th className="px-6 py-4">Last Active</th>
                    <th className="px-6 py-4">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {perfData.map((row, i) => (
                    <tr key={i} className="hover:bg-white/5 transition">
                      <td className="px-6 py-4">
                        <div className="font-bold">{row.display_name}</div>
                        <div className="text-xs text-zinc-500">{row.email}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-wrap gap-1">
                          {row.subjects.map(s => (
                            <span key={s} className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] capitalize">{s}</span>
                          ))}
                        </div>
                      </td>
                      <td className="px-6 py-4 font-mono font-bold">{row.avg_score}%</td>
                      <td className="px-6 py-4">{row.total_sessions}</td>
                      <td className="px-6 py-4 text-xs text-zinc-400">{new Date(row.last_active).toLocaleDateString()}</td>
                      <td className="px-6 py-4">
                        <span className={`rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-wider border ${
                          row.status === "Strong" ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400" :
                          row.status === "Average" ? "bg-amber-500/10 border-amber-500/20 text-amber-400" :
                          "bg-red-500/10 border-red-500/20 text-red-400"
                        }`}>
                          {row.status === "Strong" ? "🟢 " : row.status === "Average" ? "🟡 " : "🔴 "}
                          {row.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {perfData.length === 0 && !perfLoading && (
                    <tr>
                      <td colSpan={6} className="px-6 py-12 text-center text-zinc-500">No practice data found yet.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {tab === "reports" && (
          <div className="space-y-8">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <h2 className="text-2xl font-bold">Individual Reports</h2>
              <select
                value={selectedStudentId}
                onChange={(e) => setSelectedStudentId(e.target.value)}
                className="rounded-xl bg-white/5 border border-white/10 px-4 py-2 text-sm text-white outline-none focus:border-purple-500/50"
              >
                <option value="" className="bg-[#0f0f1a]">Select a student</option>
                {students.map(s => (
                  <option key={s.id} value={s.id} className="bg-[#0f0f1a]">{s.display_name}</option>
                ))}
              </select>
            </div>

            {selectedStudentId ? (
              <div className="grid gap-6 lg:grid-cols-2">
                {/* Score Chart */}
                <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
                  <h3 className="text-sm font-black uppercase tracking-widest text-zinc-400 mb-6">Subject Accuracy</h3>
                  <div className="space-y-4">
                    {studentReport.map(r => (
                      <div key={r.subject}>
                        <div className="flex justify-between text-xs font-bold mb-1 uppercase tracking-wider">
                          <span className="capitalize">{r.subject}</span>
                          <span>{r.avg_score}%</span>
                        </div>
                        <div className="h-2 w-full rounded-full bg-white/10 overflow-hidden">
                          <div 
                            className={`h-full transition-all duration-1000 ${r.avg_score > 70 ? 'bg-emerald-500' : r.avg_score > 50 ? 'bg-amber-500' : 'bg-red-500'}`}
                            style={{ width: `${r.avg_score}%` }}
                          />
                        </div>
                      </div>
                    ))}
                    {studentReport.length === 0 && <p className="text-center py-10 text-zinc-500 italic">No data available for this student.</p>}
                  </div>
                </div>

                {/* AI Recommendation */}
                <div className="rounded-3xl border border-purple-500/20 bg-purple-500/5 p-6">
                  <h3 className="text-sm font-black uppercase tracking-widest text-purple-400 mb-6">AI Progress Recommendation</h3>
                  {aiRecommendation ? (
                    <div className="space-y-6 text-sm leading-relaxed">
                      <div>
                        <p className="font-bold text-emerald-400 mb-2">Strong in:</p>
                        <p className="text-zinc-300 capitalize">{aiRecommendation.strong.join(", ") || "No subjects yet"}</p>
                      </div>
                      <div>
                        <p className="font-bold text-red-400 mb-2">Needs improvement in:</p>
                        <p className="text-zinc-300 capitalize">{aiRecommendation.weak.join(", ") || "No subjects yet"}</p>
                      </div>
                      <div className="rounded-2xl bg-white/5 p-4 border border-white/10">
                        <p className="font-bold text-purple-300 mb-1">Recommended focus:</p>
                        <p className="text-white text-lg font-black capitalize">{aiRecommendation.focus}</p>
                      </div>
                    </div>
                  ) : (
                    <p className="text-center py-10 text-zinc-500 italic">Select a student to see recommendations.</p>
                  )}
                </div>
              </div>
            ) : (
              <div className="rounded-3xl border border-white/10 bg-white/5 p-20 text-center">
                <p className="text-4xl mb-4">👤</p>
                <p className="text-zinc-400">Please select a student from the dropdown to view their detailed performance report.</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
