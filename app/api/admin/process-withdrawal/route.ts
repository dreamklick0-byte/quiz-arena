import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getAdminClient } from "@/lib/supabase";

export async function POST(req: Request) {
  try {
    const cookieStore = await cookies();
    const adminSessionCookie = cookieStore.get("admin_session")?.value;
    if (!adminSessionCookie) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const sessionData = JSON.parse(adminSessionCookie);
    const { id, status } = await req.json();

    if (!id || !status) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const supabase = getAdminClient();

    // 1. Fetch request details for logging
    const { data: withdrawal, error: fetchError } = await supabase
      .from("withdrawal_requests")
      .select("*, profiles:user_id (display_name)")
      .eq("id", id)
      .single();

    if (fetchError || !withdrawal) {
      return NextResponse.json({ error: "Withdrawal request not found" }, { status: 404 });
    }

    // 2. Update status
    const { error: updateError } = await supabase
      .from("withdrawal_requests")
      .update({ 
        status,
        processed_at: status === 'processed' ? new Date().toISOString() : null
      })
      .eq("id", id);

    if (updateError) {
      console.error("Error updating withdrawal:", updateError);
      return NextResponse.json({ error: "Failed to update withdrawal status" }, { status: 500 });
    }

    // 3. Log activity
    const ip = req.headers.get("x-forwarded-for") || "unknown";
    await supabase.from("admin_logs").insert({
      admin_id: sessionData.id,
      action: status === 'processed' ? "APPROVE_WITHDRAWAL" : "REJECT_WITHDRAWAL",
      details: `${status === 'processed' ? 'Approved' : 'Rejected'} ₦${withdrawal.amount} for ${withdrawal.profiles?.display_name || 'Unknown'}`,
      ip_address: ip
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Process withdrawal error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
