import { NextRequest, NextResponse } from "next/server";
import { getAdminClient } from "@/lib/supabase";
import { cookies } from "next/headers";

const ALLOWED_SUBJECTS = new Set([
  "maths",
  "english",
  "physics",
  "chemistry",
  "biology",
  "government",
  "economics",
  "agricultural_science",
  "current_affairs",
]);

const EXAM_TYPES = new Set([
  "JAMB",
  "WAEC",
  "NECO",
  "Nigeria Current Affairs",
  "Africa Current Affairs",
  "Global Current Affairs",
]);

/** Stored subject slug (matches app / CSV: agricultural uses hyphen). */
function normalizeStoredSubject(formValue: string): string | null {
  const v = formValue.trim().toLowerCase();
  if (!ALLOWED_SUBJECTS.has(v)) return null;
  if (v === "agricultural_science") return "agricultural-science";
  return v;
}

export async function POST(req: NextRequest) {
  try {
    const cookieStore = await cookies();
    const adminSessionCookie = cookieStore.get("admin_session")?.value;
    if (!adminSessionCookie) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const sessionData = JSON.parse(adminSessionCookie);
    const supabase = getAdminClient();

    let body: Record<string, unknown>;
    try {
      body = (await req.json()) as Record<string, unknown>;
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const subjectRaw = String(body.subject ?? "");
    const subject = normalizeStoredSubject(subjectRaw);
    if (!subject) {
      return NextResponse.json({ error: "Invalid subject" }, { status: 400 });
    }

    const examType = String(body.exam_type ?? "").trim();
    if (!EXAM_TYPES.has(examType)) {
      return NextResponse.json({ error: "Invalid exam type" }, { status: 400 });
    }

    const q = String(body.question ?? "").trim();
    const a = String(body.option_a ?? "").trim();
    const b = String(body.option_b ?? "").trim();
    const c = String(body.option_c ?? "").trim();
    const d = String(body.option_d ?? "").trim();
    if (!q || !a || !b || !c || !d) {
      return NextResponse.json(
        { error: "Question and all options are required." },
        { status: 400 },
      );
    }

    const letter = String(body.correct_answer ?? "")
      .trim()
      .toUpperCase()
      .slice(0, 1);
    if (!["A", "B", "C", "D"].includes(letter)) {
      return NextResponse.json({ error: "Invalid correct answer" }, { status: 400 });
    }

    const explanation =
      body.explanation != null ? String(body.explanation).trim() : "";

    let year: number | null = null;
    if (body.year !== undefined && body.year !== null && body.year !== "") {
      const n = Number(body.year);
      if (!Number.isFinite(n)) {
        return NextResponse.json({ error: "Invalid year" }, { status: 400 });
      }
      year = Math.round(n);
    }

    const row = {
      subject,
      exam_type: examType,
      question: q,
      option_a: a,
      option_b: b,
      option_c: c,
      option_d: d,
      correct_answer: letter,
      explanation,
      year,
    };

    const { error } = await supabase.from("questions").insert(row);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Log activity
    const ip = req.headers.get("x-forwarded-for") || "unknown";
    await supabase.from("admin_logs").insert({
      admin_id: sessionData.id,
      action: "CREATE_QUESTION",
      details: `Created manual question for ${subject}`,
      ip_address: ip
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Question error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
