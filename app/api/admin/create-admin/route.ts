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

    const { username, password, fullName, email, role } = await req.json();

    if (!username || !password || !fullName || !role) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const supabase = getAdminClient();

    // Check if username exists
    const { data: existingAdmin } = await supabase
      .from("admin_accounts")
      .select("id")
      .eq("username", username)
      .single();

    if (existingAdmin) {
      return NextResponse.json({ error: "Username already exists" }, { status: 400 });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    // Insert new admin
    const { data: newAdmin, error } = await supabase
      .from("admin_accounts")
      .insert({
        username,
        password_hash: passwordHash,
        full_name: fullName,
        email,
        role,
        created_by: sessionData.id,
        is_active: true
      })
      .select()
      .single();

    if (error) {
      console.error("Error creating admin:", error);
      return NextResponse.json({ error: "Failed to create admin account" }, { status: 500 });
    }

    // Log activity
    const ip = req.headers.get("x-forwarded-for") || "unknown";
    await supabase.from("admin_logs").insert({
      admin_id: sessionData.id,
      action: "CREATE_ADMIN",
      details: `Created admin: ${username} (${role})`,
      ip_address: ip
    });

    return NextResponse.json({ success: true, admin: newAdmin });
  } catch (err) {
    console.error("Create admin error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
