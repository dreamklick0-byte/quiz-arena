import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { schoolName, avgAccuracy, totalBattles, activeWeek, topStudent, strongAreas, weakAreas } = body;

    const prompt = `You are an educational analytics AI for a Nigerian secondary school quiz platform called Quiz Arena.

School: ${schoolName}
Class Performance Data:
- Overall accuracy: ${avgAccuracy}%
- Total battles played: ${totalBattles}
- Active students this week: ${activeWeek}
- Top student: ${topStudent}
- Strong subjects: ${strongAreas || "None yet"}
- Weak subjects: ${weakAreas || "None yet"}

Write 3 specific, actionable recommendations for the school teacher or admin. Be direct and practical. Format as a numbered list. Keep it under 150 words total.`;

    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY || "",
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 1000,
        messages: [{ role: "user", content: prompt }],
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      console.error("Anthropic API error:", err);
      return NextResponse.json({ error: "AI service error" }, { status: 500 });
    }

    const data = await res.json();
    const text = data.content?.map((c: any) => c.text || "").join("") || "No insight generated.";
    return NextResponse.json({ insight: text });
  } catch (e) {
    console.error("School insight error:", e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
