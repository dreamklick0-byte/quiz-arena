import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getAdminClient } from "@/lib/supabase";

export async function POST(req: NextRequest) {
  try {
    const cookieStore = await cookies();
    const adminSession = cookieStore.get("admin_session")?.value;
    if (!adminSession) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { leagueId, message } = await req.json();
    if (!leagueId || !message) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }

    const supabase = getAdminClient();

    // 1. Call the RPC function
    const { error: rpcError } = await supabase.rpc("notify_students_of_tournament", {
      p_league_id: leagueId,
      p_message: message,
    });

    if (rpcError) throw rpcError;

    // 2. Log the action in admin_logs
    await supabase.from("admin_logs").insert({
      admin_id: (JSON.parse(atob(adminSession.split('.')[1]))).sub, // Basic extraction from JWT
      action: "notify_league",
      details: { league_id: leagueId, message },
    });

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("Notify error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
