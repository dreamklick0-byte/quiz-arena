import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getAdminClient } from "@/lib/supabase";

export async function POST(req: Request) {
  try {
    const { userId, actionType, amount } = await req.json();

    if (!userId || !actionType) {
      return NextResponse.json({ error: "User ID and action type are required" }, { status: 400 });
    }

    const cookieStore = await cookies();
    const adminSessionCookie = cookieStore.get("admin_session")?.value;
    if (!adminSessionCookie) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabase = getAdminClient();

    if (actionType === "add_wallet" || actionType === "remove_wallet") {
      const numAmount = parseFloat(amount) || 0;
      const { error: walletUpdateError } = await supabase.rpc('increment_wallet_balance', {
        p_user_id: userId,
        p_amount: actionType === "add_wallet" ? numAmount : -numAmount
      });
      if (walletUpdateError) {
        return NextResponse.json({ success: false, error: walletUpdateError.message }, { status: 500 });
      }
      return NextResponse.json({ success: true, message: `Wallet updated successfully` });
    }

    if (actionType === "add_xp" || actionType === "remove_xp") {
      const { data: xpRow } = await supabase.from("user_xp").select("xp").eq("user_id", userId).maybeSingle();
      const current = xpRow?.xp || 0;
      const numAmount = parseFloat(amount) || 0;
      const newXP = actionType === "add_xp" ? current + numAmount : Math.max(0, current - numAmount);
      await supabase.from("user_xp").upsert({ user_id: userId, xp: newXP }, { onConflict: "user_id" });
      return NextResponse.json({ success: true, message: `XP updated: ${newXP}` });
    }

    if (actionType === "add_coins" || actionType === "remove_coins") {
      const { data: coinRow } = await supabase.from("arena_coins").select("coins").eq("user_id", userId).maybeSingle();
      const current = coinRow?.coins || 0;
      const numAmount = parseFloat(amount) || 0;
      const newCoins = actionType === "add_coins" ? current + numAmount : Math.max(0, current - numAmount);
      await supabase.from("arena_coins").upsert({ user_id: userId, coins: newCoins }, { onConflict: "user_id" });
      return NextResponse.json({ success: true, message: `Coins updated: ${newCoins}` });
    }

    if (actionType === "suspend_user") {
      await supabase.from("profiles").update({ status: "suspended" }).eq("id", userId);
      return NextResponse.json({ success: true, message: "User suspended" });
    }

    if (actionType === "ban_user") {
      await supabase.from("profiles").update({ status: "banned" }).eq("id", userId);
      return NextResponse.json({ success: true, message: "User banned" });
    }

    if (actionType === "activate_user") {
      await supabase.from("profiles").update({ status: "active" }).eq("id", userId);
      return NextResponse.json({ success: true, message: "User activated" });
    }

    if (actionType === "delete_user") {
      await supabase.from("profiles").delete().eq("id", userId);
      return NextResponse.json({ success: true, message: "User deleted" });
    }

    return NextResponse.json({ error: "Invalid action type" }, { status: 400 });
  } catch (err: any) {
    console.error("User action error:", err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
