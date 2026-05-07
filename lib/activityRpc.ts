import { getSupabaseClient } from "@/lib/supabase";

/** Best-effort: counts today for streak leaderboard SQL; ignores failures. */
export async function safeRecordDailyActivity(): Promise<void> {
  try {
    const supabase = getSupabaseClient();
    const { data } = await supabase.auth.getSession();
    if (!data.session?.user?.id) return;
    await supabase.rpc("record_daily_activity");
  } catch {
    /* optional DB feature */
  }
}

export async function safeIncrementSubjectWin(subjectSlug: string): Promise<void> {
  try {
    const supabase = getSupabaseClient();
    const { data } = await supabase.auth.getSession();
    if (!data.session?.user?.id) return;
    await supabase.rpc("increment_subject_win", { p_subject: subjectSlug });
  } catch {
    /* optional DB feature */
  }
}
