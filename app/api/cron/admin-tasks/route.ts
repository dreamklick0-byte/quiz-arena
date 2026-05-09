import { NextResponse } from "next/server";
import { getSupabaseClient } from "@/lib/supabase";
import { processTransaction } from "@/lib/wallet";

export async function GET(req: Request) {
  // Check for authorization header if needed (e.g., Vercel Cron Secret)
  const authHeader = req.headers.get('authorization');
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = getSupabaseClient();
  const results = {
    startedLeagues: 0,
    distributedLeagues: 0,
    errors: [] as string[]
  };

  try {
    // 1. Start scheduled leagues
    const { data: started, error: startErr } = await supabase
      .from("leagues")
      .update({ status: 'open' })
      .lte("starts_at", new Date().toISOString())
      .eq("status", "scheduled")
      .select();

    if (startErr) results.errors.push(`Start Error: ${startErr.message}`);
    else results.startedLeagues = started?.length || 0;

    // 2. Distribute prizes for expired leagues
    const { data: expiredLeagues, error: fetchErr } = await supabase
      .from("leagues")
      .select("*")
      .lte("ends_at", new Date().toISOString())
      .eq("status", "open")
      .eq("prizes_paid", false);

    if (fetchErr) {
      results.errors.push(`Fetch Expired Error: ${fetchErr.message}`);
    } else {
      for (const league of (expiredLeagues || [])) {
        try {
          const totalPool = Number(league.entry_fee) * Number(league.current_players);
          const prizePool = totalPool * 0.60;
          const platformRevenue = totalPool * 0.40;

          // Get top 10 entries
          const { data: entries, error: entriesErr } = await supabase
            .from("league_entries")
            .select("*")
            .eq("league_id", league.id)
            .order("score", { ascending: false })
            .order("time_seconds", { ascending: true })
            .limit(10);

          if (entriesErr) throw entriesErr;

          // Prize distribution logic
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

          // Mark league as completed
          await supabase
            .from("leagues")
            .update({
              status: 'completed',
              prizes_paid: true,
              platform_revenue: platformRevenue,
              prize_pool: prizePool
            })
            .eq("id", league.id);
          
          results.distributedLeagues++;
        } catch (leErr: any) {
          results.errors.push(`League ${league.id} Error: ${leErr.message}`);
        }
      }
    }

    return NextResponse.json(results);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

function getOrdinal(n: number) {
  const s = ["th", "st", "nd", "rd"],
    v = n % 100;
  return s[(v - 20) % 10] || s[v] || s[0];
}
