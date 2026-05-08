import { createClient } from "@supabase/supabase-js";
import { NextRequest } from "next/server";

function parseCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i += 1) {
    const c = line[i]!;
    if (c === '"') {
      if (inQuotes && line[i + 1] === '"') {
        cur += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }
    if (!inQuotes && c === ",") {
      out.push(cur.trim());
      cur = "";
      continue;
    }
    cur += c;
  }
  out.push(cur.trim());
  return out;
}

function parseQuestionsCsv(raw: string): Record<string, string | number | null>[] {
  const lines = raw
    .replace(/^\ufeff/, "")
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);
  if (lines.length < 2) return [];

  const headers = parseCsvLine(lines[0]!).map((h) =>
    h.trim().toLowerCase().replace(/\s+/g, "_"),
  );
  const rows: Record<string, string | number | null>[] = [];

  const require = ["subject", "exam_type", "question", "option_a", "option_b", "option_c", "option_d", "correct_answer"];
  for (let i = 1; i < lines.length; i += 1) {
    const cells = parseCsvLine(lines[i]!);
    const row: Record<string, string | number | null> = {};
    headers.forEach((h, idx) => {
      row[h] = cells[idx] ?? "";
    });
    let ok = true;
    for (const k of require) {
      const v = row[k];
      if (v === undefined || String(v).trim() === "") {
        ok = false;
        break;
      }
    }
    if (!ok) continue;

    const letter = String(row.correct_answer).trim().toUpperCase().slice(0, 1);
    if (!["A", "B", "C", "D"].includes(letter)) {
      continue;
    }
    row.correct_answer = letter;

    if (row.year !== undefined && row.year !== null && row.year !== "") {
      const y = parseInt(String(row.year), 10);
      row.year = Number.isFinite(y) ? y : null;
    } else {
      row.year = null;
    }

    row.subject = String(row.subject).trim().toLowerCase();
    row.exam_type = String(row.exam_type).trim();
    row.question = String(row.question).trim();
    row.option_a = String(row.option_a).trim();
    row.option_b = String(row.option_b).trim();
    row.option_c = String(row.option_c).trim();
    row.option_d = String(row.option_d).trim();
    row.explanation = row.explanation != null ? String(row.explanation).trim() : "";

    rows.push(row);
  }

  return rows;
}

export async function POST(req: NextRequest) {
  const secret =
    req.headers.get("x-admin-secret") ??
    "";

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

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const csv = typeof body === "object" && body && "csv" in body
    ? String((body as { csv?: unknown }).csv ?? "")
    : "";

  if (!csv.trim()) {
    return Response.json({ error: "Missing csv field" }, { status: 400 });
  }

  const rows = parseQuestionsCsv(csv);
  if (rows.length === 0) {
    return Response.json(
      { error: "No valid rows (check headers & required columns)" },
      { status: 400 },
    );
  }

  const supabase = createClient(url, srk);
  let inserted = 0;
  const chunk = 120;
  for (let i = 0; i < rows.length; i += chunk) {
    const part = rows.slice(i, i + chunk);
    const { error } = await supabase.from("questions").insert(part);
    if (error) {
      return Response.json(
        {
          error: error.message,
          inserted,
          failedAtChunk: Math.floor(i / chunk),
        },
        { status: 500 },
      );
    }
    inserted += part.length;
  }

  return Response.json({ ok: true, inserted });
}
