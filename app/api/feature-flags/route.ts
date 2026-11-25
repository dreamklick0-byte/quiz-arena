import { NextResponse } from "next/server";
import { getAdminClient } from "@/lib/supabase";

export async function GET() {
  const supabase = getAdminClient();
  const { data } = await supabase
    .from("platform_settings")
    .select("key, value");
  const flags: Record<string, string | boolean> = {};
  (data || []).forEach((row: any) => {
    const cleanKey = row.key.startsWith("feature_") ? row.key.replace("feature_", "") : row.key;
    flags[cleanKey] = row.value === "true" || row.value === "false" ? row.value === "true" : row.value;
  });
  return NextResponse.json({ flags }, {
    headers: { "Cache-Control": "no-store, max-age=0" }
  });
}
