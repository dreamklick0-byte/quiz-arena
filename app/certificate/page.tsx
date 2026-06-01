"use client";

import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";

export default function CertificatePage() {
  const searchParams = useSearchParams();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [ready, setReady] = useState(false);

  const type = searchParams.get("type") || "student";
  const name = searchParams.get("name") || "Student Name";
  const school = searchParams.get("school") || "";
  const month = searchParams.get("month") || "January";
  const year = searchParams.get("year") || new Date().getFullYear().toString();
  const wins = searchParams.get("wins") || "0";
  const accuracy = searchParams.get("accuracy") || "0";
  const rank = searchParams.get("rank") || "1st";
  const certNumber = searchParams.get("cert") || `QA-${Date.now().toString(36).toUpperCase()}`;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const W = 1122;
    const H = 794;
    canvas.width = W;
    canvas.height = H;

    // Background
    const g = ctx.createLinearGradient(0, 0, W, H);
    g.addColorStop(0, "#0a0e27");
    g.addColorStop(1, "#080b1e");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);

    // Title
    ctx.fillStyle = "#c9a84c";
    ctx.textAlign = "center";
    ctx.font = "bold 36px Georgia";
    ctx.fillText("QUIZ ARENA", W / 2, 120);

    ctx.font = "18px Georgia";
    ctx.fillStyle = "#e8c96d";
    ctx.fillText("Official Certificate of Achievement", W / 2, 156);

    // Recipient
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 32px Georgia";
    ctx.fillText(name, W / 2, 260);

    ctx.font = "16px Georgia";
    ctx.fillStyle = "#9fb0d0";
    ctx.fillText(`of ${school}`, W / 2, 290);

    // Details
    ctx.fillStyle = "#c9a84c";
    ctx.font = "bold 18px Georgia";
    ctx.fillText(`${type === "student" ? "Best Student" : "Best School"} — ${month} ${year}`, W / 2, 360);

    ctx.fillStyle = "#ffffff";
    ctx.font = "16px Georgia";
    ctx.fillText(`Wins: ${wins} · Accuracy: ${accuracy}% · Rank: ${rank}`, W / 2, 400);

    // Certificate number and footer
    ctx.font = "12px Georgia";
    ctx.fillStyle = "#7080a0";
    ctx.fillText(`Certificate No: ${certNumber}`, W / 2, H - 60);
    ctx.fillText(`Issued by Quiz Arena Nigeria`, W / 2, H - 40);

    setReady(true);
  }, [name, school, month, year, wins, accuracy, rank, type, certNumber]);

  const downloadPNG = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const link = document.createElement("a");
    link.download = `QuizArena-Certificate-${name.replace(/\s+/g, "-")}-${month}-${year}.png`;
    link.href = canvas.toDataURL("image/png", 1.0);
    link.click();
  };

  return (
    <div className="min-h-screen bg-[#050508] text-white flex items-center justify-center p-6">
      <div className="w-full max-w-5xl">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-black">Certificate Preview</h1>
            <p className="text-zinc-400 text-sm">Preview and download official Quiz Arena certificates.</p>
          </div>
          <div className="flex gap-2">
            <button onClick={downloadPNG} disabled={!ready}
              className="rounded-full bg-[#f59e0b] px-4 py-2 text-black font-bold disabled:opacity-60">Download as PNG</button>
            <button onClick={() => window.print()} className="rounded-full border border-white/10 px-4 py-2 text-sm">Print</button>
          </div>
        </div>

        <div className="rounded-xl overflow-hidden border border-white/10 bg-black/20 p-4">
          <canvas ref={canvasRef} style={{ width: '100%', height: 'auto', display: 'block' }} />
        </div>
      </div>
    </div>
  );
}
