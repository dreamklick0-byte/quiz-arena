import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getAdminClient } from "@/lib/supabase";
import bcrypt from "bcryptjs";

export async function POST(req: Request) {
  try {
    const { username, password } = await req.json();
    const supabase = getAdminClient();

    // 1. Fetch admin from database
    const { data: admin, error } = await supabase
      .from("admin_accounts")
      .select("*")
      .eq("username", username)
      .eq("is_active", true)
      .single();

    if (error || !admin) {
      return NextResponse.json(
        { success: false, message: "Invalid credentials or account inactive." },
        { status: 401 }
      );
    }

    // 2. Verify password with bcrypt
    const isPasswordValid = await bcrypt.compare(password, admin.password_hash);

    if (!isPasswordValid) {
      return NextResponse.json(
        { success: false, message: "Invalid credentials. Access denied." },
        { status: 401 }
      );
    }

    // 3. Prepare session data
    const sessionData = {
      id: admin.id,
      username: admin.username,
      role: admin.role, // 'super_admin' or 'admin'
      full_name: admin.full_name
    };

    // 4. Set HTTP-only cookie
    const cookieStore = await cookies();
    cookieStore.set("admin_session", JSON.stringify(sessionData), {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 8 * 60 * 60, // 8 hours
      path: "/",
    });

    // 5. Update last_login
    await supabase
      .from("admin_accounts")
      .update({ last_login: new Date().toISOString() })
      .eq("id", admin.id);

    // 6. Log the activity
    const ip = req.headers.get("x-forwarded-for") || "unknown";
    await supabase.from("admin_logs").insert({
      admin_id: admin.id,
      action: "LOGIN",
      details: `Admin logged in from IP: ${ip}`,
      ip_address: ip
    });

    return NextResponse.json({ 
      success: true, 
      role: admin.role,
      mustChangePassword: !admin.last_login 
    });
  } catch (err) {
    console.error("Auth error:", err);
    return NextResponse.json(
      { success: false, message: "Server error during authentication." },
      { status: 500 }
    );
  }
}
