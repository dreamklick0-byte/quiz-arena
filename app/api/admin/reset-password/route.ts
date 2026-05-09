import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getAdminClient } from "@/lib/supabase";
import bcrypt from "bcryptjs";

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

    const { id, newPassword } = await req.json();

    if (!id || !newPassword) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const supabase = getAdminClient();

    // Fetch target admin username for logging
    const { data: targetAdmin } = await supabase
      .from("admin_accounts")
      .select("username")
      .eq("id", id)
      .single();

    if (!targetAdmin) {
      return NextResponse.json({ error: "Admin not found" }, { status: 404 });
    }

    // Hash new password
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(newPassword, salt);

    // Update password
    const { error } = await supabase
      .from("admin_accounts")
      .update({
        password_hash: passwordHash,
        updated_at: new Date().toISOString()
      })
      .eq("id", id);

    if (error) {
      console.error("Error resetting password:", error);
      return NextResponse.json({ error: "Failed to reset password" }, { status: 500 });
    }

    // Log activity
    const ip = req.headers.get("x-forwarded-for") || "unknown";
    await supabase.from("admin_logs").insert({
      admin_id: sessionData.id,
      action: "RESET_PASSWORD",
      details: `Reset password for admin: ${targetAdmin.username}`,
      ip_address: ip
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Reset password error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
