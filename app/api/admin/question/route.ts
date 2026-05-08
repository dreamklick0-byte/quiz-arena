import { createClient } from "@supabase/supabase-js";
import { NextRequest } from "next/server";

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
  const secret = req.headers.get("x-admin-secret") ?? "";

  if (
    !process.env.ADMIN_IMPORT_SECRET ||
    secret !== process.env.ADMIN_IMPORT_SECRET
  ) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const srk = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !srk) {
    return Response.json(
      {
        error:
          "Server needs NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY",
      },
      { status: 503 },
    );
  }

  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const subjectRaw = String(body.subject ?? "");
  const subject = normalizeStoredSubject(subjectRaw);
  if (!subject) {
    return Response.json({ error: "Invalid subject" }, { status: 400 });
  }

  const examType = String(body.exam_type ?? "").trim();
  if (!EXAM_TYPES.has(examType)) {
    return Response.json({ error: "Invalid exam type" }, { status: 400 });
  }

  const q = String(body.question ?? "").trim();
  const a = String(body.option_a ?? "").trim();
  const b = String(body.option_b ?? "").trim();
  const c = String(body.option_c ?? "").trim();
  const d = String(body.option_d ?? "").trim();
  if (!q || !a || !b || !c || !d) {
    return Response.json(
      { error: "Question and all options are required." },
      { status: 400 },
    );
  }

  const letter = String(body.correct_answer ?? "")
    .trim()
    .toUpperCase()
    .slice(0, 1);
  if (!["A", "B", "C", "D"].includes(letter)) {
    return Response.json({ error: "Invalid correct answer" }, { status: 400 });
  }

  const explanation =
    body.explanation != null ? String(body.explanation).trim() : "";

  let year: number | null = null;
  if (body.year !== undefined && body.year !== null && body.year !== "") {
    const n = Number(body.year);
    if (!Number.isFinite(n)) {
      return Response.json({ error: "Invalid year" }, { status: 400 });
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

  const supabase = createClient(url, srk);
  const { error } = await supabase.from("questions").insert(row);

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  return Response.json({ ok: true });
}
