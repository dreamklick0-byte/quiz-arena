"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { getSupabaseClient } from "@/lib/supabase";

type Student = {
  id: string;
  display_name: string;
  email?: string;
  state?: string;
  student_class?: string;
  total_xp: number;
  current_rank: string;
  total_wins: number;
  school_code?: string;
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
  const [school, setSchool] = useState(null);
  const [students, setStudents] = useState([]);
  const [subjectStats, setSubjectStats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [adminName, setAdminName] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [removeConfirm, setRemoveConfirm] = useState(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);

  const fetchDashboard = useCallback(async () => {
    const supabase = getSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push("/school/login"); return; }

    // Get admin profile
    const { data: adminProfile } = await supabase
      .from("school_admin_profiles")
      .select("full_name, school_id")
      .eq("id", user.id)
      .maybeSingle();

    if (!adminProfile?.school_id) { router.push("/school/login"); return; }
    setAdminName(adminProfile.full_name || "Admin");

    // Get school info
    const { data: schoolData } = await supabase
      .from("schools")
      .select("id, name, school_code, state, city")
      .eq("id", adminProfile.school_id)
      .maybeSingle();

    if (!schoolData) { router.push("/school/login"); return; }

    // Get students linked to this school
    const { data: studentProfiles } = await supabase
      .from("profiles")
      .select("id, display_name, state, student_class, school_code")
      .eq("school_id", adminProfile.school_id)
      .neq("role", "school_admin");

    const studentIds = (studentProfiles || []).map(s => s.id);

    let studentList: Student[] = [];
    let totalWins = 0;

    if (studentIds.length > 0) {
      // Get ranks
      const { data: rankData } = await supabase
        .from("user_ranks")
        .select("user_id, total_xp, current_rank")
        .in("user_id", studentIds);

      // Get wins
      const { data: winsData } = await supabase
        .from("user_subject_wins")
        .select("user_id, wins")
        .in("user_id", studentIds);

      // Get subject stats
      const { data: subjectData } = await supabase
        .from("user_subject_wins")
        .select("subject, wins, user_id")
        .in("user_id", studentIds);

      // Aggregate subject stats
      const subjectMap: Record<string, { wins: number; users: Set<string> }> = {};
      for (const row of subjectData || []) {
        if (!subjectMap[row.subject]) subjectMap[row.subject] = { wins: 0, users: new Set() };
        subjectMap[row.subject].wins += row.wins;
        subjectMap[row.subject].users.add(row.user_id);
      }
      setSubjectStats(Object.entries(subjectMap).map(([subject, d]) => ({
        subject,
        total_wins: d.wins,
        player_count: d.users.size,
      })).sort((a, b) => b.total_wins - a.total_wins));

      const rankMap = Object.fromEntries((rankData || []).map(r => [r.user_id, r]));
      const winsMap: Record = {};
      for (const w of winsData || []) {
        winsMap[w.user_id] = (winsMap[w.user_id] || 0) + w.wins;
      }

      studentList = (studentProfiles || []).map(p => ({
        id: p.id,
        display_name: p.display_name || "Student",
        state: p.state,
        student_class: p.student_class,
        school_code: p.school_code,
        total_xp: rankMap[p.id]?.total_xp || 0,
        current_rank: rankMap[p.id]?.current_rank || "Unranked",
        total_wins: winsMap[p.id] || 0,
      })).sort((a, b) => b.total_wins - a.total_wins);

      totalWins = Object.values(winsMap).reduce((a, b) => a + b, 0);
    }

    setStudents(studentList);
    setSchool({
      ...schoolData,
      total_students: studentList.length,
      total_wins: totalWins,
    });
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
    if (school) setSchool(prev => prev ? { ...prev, total_students: prev.total_students - 1 } : null);
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

  const tabClass = (t: string) => `px-4 py-2 text-sm font-bold rounded-xl transition ${tab === t ? "bg-purple-600 text-white" : "text-zinc-400 hover:text-white hover:bg-white/5"}`;

  if (loading) return (
    <div className="min-h-screen bg-[#0f0f1a] flex items-center justify-center">
      <p className="text-zinc-400 animate-pulse text-lg">Loading dashboard...</p>
    </div>
  );

  return (
    
      {/* Top Bar */}
      
        
          🏫
          
            {school?.name}
            Code: {school?.school_code} · {school?.city}, {school?.state}

          

        

        
          👤 {adminName}
          
            Sign Out
          
        

      

      {/* Nav Tabs */}
      
         setTab("overview")} className={tabClass("overview")}>📊 Overview
         setTab("students")} className={tabClass("students")}>👥 Students ({school?.total_students})
         setTab("performance")} className={tabClass("performance")}>📈 Performance
         setTab("settings")} className={tabClass("settings")}>⚙️ Settings
      

      
        {msg && (
          
            {msg.text}
          
        )}

        {/* OVERVIEW TAB */}
        {tab === "overview" && (
          
            {/* Stats Cards */}
            
              {[
                { label: "Total Students", value: school?.total_students || 0, icon: "👥", color: "text-purple-400" },
                { label: "Total Wins", value: school?.total_wins || 0, icon: "🏆", color: "text-yellow-500" },
                { label: "Active Players", value: activeStudents, icon: "⚡", color: "text-emerald-400" },
                { label: "Avg Wins/Student", value: avgWins, icon: "📊", color: "text-blue-400" },
              ].map(stat => (
                
                  {stat.icon}

                  {stat.value}

                  {stat.label}

                
              ))}
            

            {/* School Code Share Box */}
            
              📢 Share Your School Code
              Students enter this code on their account page to join your school.

              
                {school?.school_code}
              
             { navigator.clipboard.writeText(school?.school_code || ""); setMsg({ type: "success", text: "School code copied!" }); }}
                  className="text-sm font-bold text-white bg-purple-600 hover:bg-purple-500 px-4 py-3 rounded-xl transition">
                  Copy
                

            

            {/* Top Students */}
            
              🏆 Top Students
              {topStudents.length === 0 ? (
                
                  👥

                  No students yet. Share your school code to get started!

                

              ) : (
                
                  {topStudents.map((s, i) => (
                    
                      
                        {i + 1}
                      
                      
                        {s.display_name}

                        {s.current_rank} · {s.total_xp} XP

                      

                      {s.total_wins} wins

                    

                  ))}
                

              )}
            

            {/* Subject Breakdown */}
            {subjectStats.length > 0 && (
              
                📚 Top Subjects
                
                  {subjectStats.slice(0, 6).map(s => (
                    
                      {s.subject}

                      {s.total_wins}

                      wins · {s.player_count} players

                    
                  ))}
                

              

            )}
          

        )}

        {/* STUDENTS TAB */}
        {tab === "students" && (
          
            
               setSearchQuery(e.target.value)}
                placeholder="Search students by name or class..."
                className="flex-1 rounded-xl bg-white/5 border border-white/10 px-4 py-2.5 text-sm text-white placeholder-zinc-600 outline-none focus:border-purple-500/50" />
            

            {filteredStudents.length === 0 ? (
              
                👥

                {searchQuery ? "No students match your search." : "No students have joined yet."}

                Share code {school?.school_code} with your students

              

            ) : (
              
                {filteredStudents.map((s, i) => (
                  
                    
                      {i + 1}
                    
                    
                      {s.display_name}

                      {s.current_rank} · {s.total_xp} XP · {s.state || "No state"}

                    

                    
                      {s.total_wins} wins

                      {s.student_class && {s.student_class}

}
                    

                    {removeConfirm === s.id ? (
                      
                           handleRemoveStudent(s.id)} disabled={busy}
                            className="text-xs font-bold text-white bg-red-600 hover:bg-red-500 px-3 py-1.5 rounded-lg transition">
                            Confirm
                          
                           setRemoveConfirm(null)}
                            className="text-xs text-zinc-400 hover:text-white px-2 py-1.5 rounded-lg">
                            Cancel
                          
                        

                    ) : (
                       setRemoveConfirm(s.id)}
                          className="text-xs text-zinc-600 hover:text-red-400 transition">
                          Remove
                        
                    )}
                  

                ))}
              

            )}
          

        )}

        {/* PERFORMANCE TAB */}
        {tab === "performance" && (
          
            
              
                📊 Student Performance
                {students.length === 0 ? (
                  No students yet.

                ) : (
                  
                    {students.slice(0, 10).map(s => {
                      const maxWins = Math.max(...students.map(x => x.total_wins), 1);
                      const pct = Math.round((s.total_wins / maxWins) * 100);
                      return (
                        
                          
                            {s.display_name}
                            {s.total_wins} wins
                          

                          
                            
                          

                        
                      );
                    })}
                  

                )}
              

              
                📚 Subject Breakdown
                {subjectStats.length === 0 ? (
                  No battle data yet.

                ) : (
                  
                    {subjectStats.map(s => {
                      const maxWins = Math.max(...subjectStats.map(x => x.total_wins), 1);
                      const pct = Math.round((s.total_wins / maxWins) * 100);
                      return (
                        
                          
                            {s.subject}
                            {s.total_wins} wins
                          

                          
                            
                          

                        
                      );
                    })}
                  

                )}
              

            

            {/* Activity Summary */}
            
              ⚡ Activity Summary
              
                
                  {activeStudents}

                  Active Students

                

                
                  {students.length - activeStudents}

                  Inactive Students

                

                
                  {avgWins}

                  Avg Wins/Student

                

              

            

          

        )}

        {/* SETTINGS TAB */}
        {tab === "settings" && (
          
            
              🏫 School Information
              
                {[
                  { label: "School Name", value: school?.name },
                  { label: "School Code", value: school?.school_code },
                  { label: "State", value: school?.state },
                  { label: "City", value: school?.city },
                ].map(f => (
                  
                    {f.label}

                    {f.value || "—"}

                  

                ))}
              

            

            
              📢 Student Join Instructions
              
                To add students to your school:
                

                1. Students sign up at quizarena.com.ng/auth
                

                2. They go to their Account page
                

                3. They scroll down and enter school code: {school?.school_code}
                

                4. They click Join School
                

                Their stats will immediately appear in your dashboard.
              

            

            
              ⚠️ Sign Out
              You will be returned to the school login page.

              
                Sign Out
               
            

          

        )}
      

    

  );
}
