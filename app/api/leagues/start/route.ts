import { NextResponse } from "next/server";
import { getSupabaseClient } from "@/lib/supabase";

export async function GET() {
  const supabase = getSupabaseClient();
  try {
    const { error } = await supabase
      .from("leagues")
      .update({ status: 'open' })
      .lte("starts_at", new Date().toISOString())
      .eq("status", "scheduled");

    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (err) {
    const error = err as Error;
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
