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
    const { id, fullName, email, role } = await req.json();

    if (!id || !fullName) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Security: Only super_admin can update others. Regular admins can only update themselves.
    const isSelfUpdate = sessionData.id === id;
    if (sessionData.role !== "super_admin" && !isSelfUpdate) {
      return NextResponse.json({ error: "Access denied." }, { status: 403 });
    }

    const supabase = getAdminClient();

    // Prepare update data
    const updateData: Record<string, string | null> = {
      full_name: fullName,
      email: email,
      updated_at: new Date().toISOString()
    };

    // Security: Only super_admin can change roles
    if (sessionData.role === "super_admin" && role) {
      updateData.role = role;
    }

    // Update admin
    const { data: updatedAdmin, error } = await supabase
      .from("admin_accounts")
      .update(updateData)
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
