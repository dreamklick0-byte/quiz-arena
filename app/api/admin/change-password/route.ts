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
    const { newPassword } = await req.json();

    if (!newPassword) {
      return NextResponse.json({ error: "Missing new password" }, { status: 400 });
    }

    const supabase = getAdminClient();

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
      .eq("id", sessionData.id);

    if (error) {
      console.error("Error changing password:", error);
      return NextResponse.json({ error: "Failed to change password" }, { status: 500 });
    }

    // Log activity
    const ip = req.headers.get("x-forwarded-for") || "unknown";
    await supabase.from("admin_logs").insert({
      admin_id: sessionData.id,
      action: "CHANGE_PASSWORD_SELF",
      details: `Admin changed their own password`,
      ip_address: ip
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Change password error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
