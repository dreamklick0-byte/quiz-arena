import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getAdminClient } from "@/lib/supabase";

export async function GET() {
  const supabase = getAdminClient();
  const { data, error } = await supabase
    .from("platform_settings")
    .select("key, value")
    .like("key", "feature_%");
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  const flags: Record<string, boolean> = {};
  (data || []).forEach((row: any) => {
    flags[row.key.replace("feature_", "")] = row.value === "true";
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
    if (!key || typeof value !== "boolean") {
      return NextResponse.json({ error: "Invalid request - key and boolean value required" }, { status: 400 });
    }
    const dbKey = key.startsWith("feature_") ? key : `feature_${key}`;
    const { error } = await supabase
      .from("platform_settings")
      .upsert(
        { key: dbKey, value: value.toString(), updated_at: new Date().toISOString() },
        { onConflict: "key" }
      );
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ success: true, key: dbKey, value });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Internal error" }, { status: 500 });
  }
}
