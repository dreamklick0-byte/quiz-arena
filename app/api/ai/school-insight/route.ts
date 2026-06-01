import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { schoolName, avgAccuracy, totalBattles, activeWeek, topStudent, strongAreas, weakAreas } = body;

    const prompt = `You are an expert educational analytics consultant for Nigerian secondary schools. You are analyzing performance data from Quiz Arena, a competitive quiz platform used by students.

School: ${schoolName}
Performance Summary:
- Overall class accuracy: ${avgAccuracy}%
- Total battle matches played: ${totalBattles}
- Students active this week: ${activeWeek}
- Top performing student: ${topStudent}
- Strong subjects (above 70% accuracy): ${strongAreas || "None recorded yet"}
- Weak subjects (below 50% accuracy): ${weakAreas || "None recorded yet"}

Write a detailed, professional performance report for the school admin or teacher. Include:

1. OVERALL ASSESSMENT — A 2-3 sentence summary of where the school stands academically based on the data.

2. SUBJECT ANALYSIS — For each weak subject, explain what the low accuracy likely means and what specific classroom interventions could help.

3. TOP STUDENT SPOTLIGHT — Highlight the top student and suggest how the school can use their performance to motivate others.

4. ENGAGEMENT ANALYSIS — Comment on student activity levels and what the battle count suggests about student engagement.

5. ACTION PLAN — Give 3 specific, numbered steps the teacher should take in the next 2 weeks to improve performance.

6. ENCOURAGEMENT — End with one motivating sentence for the school.

Write in a professional but warm tone. Be specific to Nigerian secondary school context. Total length: 250-350 words.`;

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      console.error("ANTHROPIC_API_KEY is not set");
      return NextResponse.json({ error: "API key not configured" }, { status: 500 });
    }

    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 1024,
        messages: [{ role: "user", content: prompt }],
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      console.error("Anthropic API error status:", res.status, "body:", err);
      return NextResponse.json({ error: "AI service error: " + res.status }, { status: 500 });
    }

    const data = await res.json();
    const text = data.content?.map((c: any) => c.text || "").join("") || "No insight generated.";
    return NextResponse.json({ insight: text });
  } catch (e) {
    console.error("School insight error:", e);
    return NextResponse.json({ error: "Internal server error: " + (e as Error).message }, { status: 500 });
  }
}
