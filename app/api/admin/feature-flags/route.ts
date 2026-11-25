import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getAdminClient } from "@/lib/supabase";

export async function GET() {
  const supabase = getAdminClient();
  const { data, error } = await supabase
    .from("platform_settings")
    .select("key, value");
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  const flags: Record<string, string | boolean> = {};
  (data || []).forEach((row: any) => {
    const cleanKey = row.key.startsWith("feature_") ? row.key.replace("feature_", "") : row.key;
    flags[cleanKey] = row.value === "true" || row.value === "false" ? row.value === "true" : row.value;
  });
  return NextResponse.json({ flags });
}

export async function POST(req: Request) {
  try {
    const cookieStore = await cookies();
    const adminSession = cookieStore.get("admin_session")?.value;
    if (!adminSession) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const supabase = getAdminClient();
    const body = await req.json();
    const { key, value } = body;
    if (!key) {
      return NextResponse.json({ error: "Invalid request - key required" }, { status: 400 });
    }
    const { error } = await supabase
      .from("platform_settings")
      .upsert(
        { key: key, value: value.toString(), updated_at: new Date().toISOString() },
        { onConflict: "key" }
      );
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ success: true, key: key, value });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Internal error" }, { status: 500 });
  }
}
