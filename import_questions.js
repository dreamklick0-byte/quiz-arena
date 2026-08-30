const { createClient } = require("@supabase/supabase-js");
const { parse } = require("csv-parse/sync");
const fs = require("fs");
const path = require("path");

const SUPABASE_URL = "https://viayjjutczrqxtmvbzwt.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZpYXlqanV0Y3pycXh0bXZiend0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3Nzk0ODc5OCwiZXhwIjoyMDkzNTI0Nzk4fQ.NjR6brJBUK-pOQCadDfmpvZfVqJ8mgaQNzlQUCiFcgk";
const CSV_FILE = "./physics_import_final.csv";
const TABLE_NAME = "questions";
const BATCH_SIZE = 50;

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function importQuestions() {
  console.log("Reading CSV file...");
  const csvContent = fs.readFileSync(path.resolve(CSV_FILE), "utf-8");
  const records = parse(csvContent, { columns: true, skip_empty_lines: true, trim: true });
  console.log("Parsed " + records.length + " rows");
  const rows = records.map((r) => ({
    subject: r.subject,
    exam_type: r.exam_type,
    question: r.question,
    option_a: r.option_a,
    option_b: r.option_b,
    option_c: r.option_c,
    option_d: r.option_d,
    correct_answer: r.correct_answer,
    explanation: r.explanation || null,
    year: r.year ? parseInt(r.year) : null,
  }));
  let inserted = 0;
  let failed = 0;
  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const batch = rows.slice(i, i + BATCH_SIZE);
    const { error } = await supabase.from(TABLE_NAME).insert(batch);
    if (error) {
      console.error("Batch failed: " + error.message);
      failed += batch.length;
    } else {
      inserted += batch.length;11
      console.log("Inserted rows " + (i + 1) + " to " + Math.min(i + BATCH_SIZE, rows.length));
    }
  }
  console.log("DONE! Inserted: " + inserted + " | Failed: " + failed);
}

importQuestions().catch((err) => { console.error(err); process.exit(1); });