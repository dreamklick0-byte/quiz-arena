import { NextResponse } from "next/server";
import { getSupabaseClient } from "@/lib/supabase";
import { processTransaction } from "@/lib/wallet";

export async function GET(req: Request) {
  // Simple check for cron (you might want a secret header)
  const supabase = getSupabaseClient();

  try {
    // 1. Find expired leagues that haven't been paid
    const { data: leagues, error: leaguesErr } = await supabase
      .from("leagues")
      .select("*")
      .lte("ends_at", new Date().toISOString())
      .eq("status", "open")
      .eq("prizes_paid", false);

    if (leaguesErr) throw leaguesErr;

    for (const league of (leagues || [])) {
      const totalPool = Number(league.entry_fee) * Number(league.current_players);
      const prizePool = totalPool * 0.60;
      const platformRevenue = totalPool * 0.40;

      // 2. Get top 10 entries
      const { data: entries, error: entriesErr } = await supabase
        .from("league_entries")
        .select("*")
        .eq("league_id", league.id)
        .order("score", { ascending: false })
        .order("time_seconds", { ascending: true })
        .limit(10);

      if (entriesErr) throw entriesErr;

      // 3. Distribute prizes
      const naturalFirst = prizePool * 0.50;
      const naturalSecond = prizePool * 0.20;
      const naturalThird = prizePool * 0.10;
      const naturalFourthTenth = (prizePool * 0.20) / 7;

      const firstPrize = Math.max(naturalFirst, Number(league.guaranteed_first));
      const secondPrize = Math.max(naturalSecond, Number(league.guaranteed_second));
      const thirdPrize = Math.max(naturalThird, Number(league.guaranteed_third));
      const fourthTenthPrize = Math.max(naturalFourthTenth, Number(league.guaranteed_fourth_tenth));

      for (let i = 0; i < (entries || []).length; i++) {
        const entry = entries[i];
        let prize = 0;
        if (i === 0) prize = firstPrize;
        else if (i === 1) prize = secondPrize;
        else if (i === 2) prize = thirdPrize;
        else if (i >= 3 && i <= 9) prize = fourthTenthPrize;

        if (prize > 0 && entry.user_id) {
          await processTransaction(
            entry.user_id,
            'win',
            prize,
            `league-win-${league.id}`,
            `Won ${i + 1}${getOrdinal(i + 1)} Place in League: ${league.name}`
          );
          
          await supabase
            .from("league_entries")
            .update({ prize_won: prize })
            .eq("id", entry.id);
        }
      }

      // 4. Update league status
      await supabase
        .from("leagues")
        .update({
          status: 'completed',
          prizes_paid: true,
          platform_revenue: platformRevenue,
          prize_pool: prizePool
        })
        .eq("id", league.id);
    }

    return NextResponse.json({ success: true, processed: leagues?.length || 0 });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

function getOrdinal(n: number) {
  const s = ["th", "st", "nd", "rd"],
    v = n % 100;
  return s[(v - 20) % 10] || s[v] || s[0];
}
