import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function GET() {
  try {
    const cookieStore = await cookies();
    const adminSessionCookie = cookieStore.get("admin_session")?.value;
    if (!adminSessionCookie) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const sessionData = JSON.parse(adminSessionCookie);
    return NextResponse.json({ success: true, admin: sessionData });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
