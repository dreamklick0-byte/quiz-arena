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
    if (sessionData.role !== "super_admin") {
      return NextResponse.json({ error: "Access denied. Super Admin only." }, { status: 403 });
    }

    const { id, is_active } = await req.json();

    if (!id) {
      return NextResponse.json({ error: "Missing admin ID" }, { status: 400 });
    }

    // Cannot deactivate yourself
    if (id === sessionData.id) {
      return NextResponse.json({ error: "You cannot deactivate your own account" }, { status: 400 });
    }

    const supabase = getAdminClient();

    // Fetch the admin to check their role
    const { data: targetAdmin, error: fetchError } = await supabase
      .from("admin_accounts")
      .select("username, role")
      .eq("id", id)
      .single();

    if (fetchError || !targetAdmin) {
      return NextResponse.json({ error: "Admin not found" }, { status: 404 });
    }

    // Cannot deactivate super_admin
    if (targetAdmin.role === "super_admin" && is_active === false) {
      return NextResponse.json({ error: "Super Admin accounts cannot be deactivated" }, { status: 400 });
    }

    // Update status
    const { error } = await supabase
      .from("admin_accounts")
      .update({
        is_active,
        updated_at: new Date().toISOString()
      })
      .eq("id", id);

    if (error) {
      console.error("Error updating admin status:", error);
      return NextResponse.json({ error: "Failed to update admin status" }, { status: 500 });
    }

    // Log activity
    const ip = req.headers.get("x-forwarded-for") || "unknown";
    await supabase.from("admin_logs").insert({
      admin_id: sessionData.id,
      action: is_active ? "ACTIVATE_ADMIN" : "DEACTIVATE_ADMIN",
      details: `${is_active ? 'Activated' : 'Deactivated'} admin: ${targetAdmin.username}`,
      ip_address: ip
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Deactivate admin error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
