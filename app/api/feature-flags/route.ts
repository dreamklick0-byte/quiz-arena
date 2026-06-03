import { NextResponse } from "next/server";
import { getAdminClient } from "@/lib/supabase";

export async function GET() {
  const supabase = getAdminClient();
  const { data } = await supabase
    .from("platform_settings")
    .select("key, value")
    .like("key", "feature_%");
  const flags: Record<string, boolean> = {};
  (data || []).forEach((row: any) => {
    flags[row.key.replace("feature_", "")] = row.value === "true";
  });
  return NextResponse.json({ flags }, {
    headers: { "Cache-Control": "no-store, max-age=0" }
  });
}
