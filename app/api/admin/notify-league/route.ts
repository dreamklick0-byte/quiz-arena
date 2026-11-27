import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getAdminClient } from "@/lib/supabase";
import { sendPushToAll, sendEmailToAll, sendWhatsAppToAll } from "@/lib/notifyChannels";

export async function POST(req: NextRequest) {
  try {
    const cookieStore = await cookies();
    const adminSession = cookieStore.get("admin_session")?.value;
    if (!adminSession) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { leagueId, message } = await req.json();
    if (!leagueId || !message) {
      return NextResponse.json({ error: "Missing leagueId or message" }, { status: 400 });
    }

    const supabase = getAdminClient();

    // 1. Call the RPC function
    const { error: rpcError } = await supabase.rpc("notify_students_of_tournament", {
      p_league_id: leagueId,
      p_message: message,
    });

    if (rpcError) throw rpcError;

    // 2. Log the action in admin_logs
    let adminId: string | null = null;
    try {
      const sessionData = JSON.parse(adminSession);
      adminId = sessionData.id || null;
    } catch {
      adminId = null;
    }
    await supabase.from("admin_logs").insert({
      admin_id: adminId,
      action: "NOTIFY_LEAGUE",
      details: `Sent tournament notification for league ${leagueId}: ${message}`,
      ip_address: req.headers.get("x-forwarded-for") || "unknown",
    });

    try {
      const url = 'https://www.quizarena.com.ng/league';
      const results = await Promise.allSettled([
        sendPushToAll({ title: 'New Tournament Available! 🏆', body: message, url: '/league' }),
        sendEmailToAll({ subject: 'New Tournament Available! 🏆', message, url }),
        sendWhatsAppToAll({ message, url }),
      ]);
      console.log('Notify channels:', JSON.stringify(results.map(r => r.status === 'fulfilled' ? r.value : { error: String((r as PromiseRejectedResult).reason) })));
      
      return NextResponse.json({ 
        success: true, 
        channels: results.map(r => r.status === 'fulfilled' ? r.value : { error: String((r as PromiseRejectedResult).reason) }) 
      });
    } catch (e) {
      console.error('Extra channels error:', e);
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("Notify error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
