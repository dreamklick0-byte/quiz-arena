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
      .select("*") 
      .eq("id", id) 
      .single(); 

    if (fetchError || !withdrawal) { 
      console.error("Fetch error:", JSON.stringify(fetchError), "id:", id); 
      return NextResponse.json({ error: "Withdrawal request not found", detail: fetchError?.message }, { status: 404 }); 
    } 

    // Fetch profile separately 
    const { data: profile } = await supabase 
      .from("profiles") 
      .select("display_name") 
      .eq("id", withdrawal.user_id) 
      .single(); 
    
    withdrawal.profiles = profile || null; 

    // 2. Update status on withdrawal_requests 
    const { error: updateError } = await supabase 
      .from("withdrawal_requests") 
      .update({ status }) 
      .eq("id", id); 

    if (updateError) { 
      console.error("Error updating withdrawal:", updateError); 
      return NextResponse.json({ error: "Failed to update withdrawal status" }, { status: 500 }); 
    } 

    // 3. Update the matching transaction record status 
    await supabase 
      .from("transactions") 
      .update({ status: status === 'processed' ? 'completed' : 'rejected' }) 
      .eq("user_id", withdrawal.user_id) 
      .eq("type", "withdrawal") 
      .eq("status", "pending") 
      .gte("amount", withdrawal.amount) 
      .lte("amount", withdrawal.amount); 

    // 4. If rejected, refund the wallet balance 
    if (status === 'rejected') { 
      const { data: wallet } = await supabase 
        .from("wallets") 
        .select("balance") 
        .eq("user_id", withdrawal.user_id) 
        .single(); 

      if (wallet) { 
        await supabase 
          .from("wallets") 
          .update({ balance: Number(wallet.balance) + Number(withdrawal.amount) }) 
          .eq("user_id", withdrawal.user_id); 

        // Insert a refund transaction for the user to see 
        await supabase.from("transactions").insert({ 
          user_id: withdrawal.user_id, 
          type: "refund", 
          amount: withdrawal.amount, 
          reference: `REFUND-${id}`, 
          description: `Withdrawal rejected — ₦${withdrawal.amount} refunded to wallet`, 
          status: "completed" 
        }); 
      } 
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
