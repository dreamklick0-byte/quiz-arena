import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getAdminClient } from "@/lib/supabase";

export async function GET(req: Request) {
  try {
    const cookieStore = await cookies();
    const adminSessionCookie = cookieStore.get("admin_session")?.value;
    if (!adminSessionCookie) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const subject = searchParams.get("subject");
    const page = parseInt(searchParams.get("page") || "1");
    const pageSize = 50;

    const supabase = getAdminClient();
    let query = supabase
      .from("questions")
      .select("*", { count: 'exact' })
      .order("created_at", { ascending: false })
      .range((page - 1) * pageSize, page * pageSize - 1);

    if (subject && subject !== 'all') {
      query = query.eq("subject", subject);
    }

    const { data, count, error } = await query;

    if (error) throw error;

    return NextResponse.json({
      success: true,
      questions: data,
      total: count,
      page,
      totalPages: Math.ceil((count || 0) / pageSize)
    });
  } catch (err) {
    console.error("List questions error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const cookieStore = await cookies();
    const adminSessionCookie = cookieStore.get("admin_session")?.value;
    if (!adminSessionCookie) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await req.json();
    const supabase = getAdminClient();
    const { error } = await supabase.from("questions").delete().eq("id", id);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Delete question error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
