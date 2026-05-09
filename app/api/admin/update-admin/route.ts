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

    const { id, fullName, email, role } = await req.json();

    if (!id || !fullName || !role) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const supabase = getAdminClient();

    // Update admin
    const { data: updatedAdmin, error } = await supabase
      .from("admin_accounts")
      .update({
        full_name: fullName,
        email,
        role,
        updated_at: new Date().toISOString()
      })
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("Error updating admin:", error);
      return NextResponse.json({ error: "Failed to update admin account" }, { status: 500 });
    }

    // Log activity
    const ip = req.headers.get("x-forwarded-for") || "unknown";
    await supabase.from("admin_logs").insert({
      admin_id: sessionData.id,
      action: "UPDATE_ADMIN",
      details: `Updated admin: ${updatedAdmin.username}`,
      ip_address: ip
    });

    return NextResponse.json({ success: true, admin: updatedAdmin });
  } catch (err) {
    console.error("Update admin error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
