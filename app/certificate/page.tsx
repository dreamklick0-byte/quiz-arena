"use client";

import React, { Suspense, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
}

export function CertificateContent() {
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
  const issueDate = new Date().toLocaleDateString("en-NG", { day: "numeric", month: "long", year: "numeric" });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const W = 1122;
    const H = 794;
    canvas.width = W;
    canvas.height = H;

    const gold1 = "#8B6914";
    const gold2 = "#c9a84c";
    const gold3 = "#f0d060";
    const navy = "#0a0e27";
    const navy2 = "#0d1233";

    // Background
    const bg = ctx.createLinearGradient(0, 0, W, H);
    bg.addColorStop(0, navy);
    bg.addColorStop(0.5, navy2);
    bg.addColorStop(1, "#080b1e");
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);

    // Header
    ctx.fillStyle = gold2;
    ctx.textAlign = "center";
    ctx.font = "bold 20px Georgia, serif";
    ctx.fillText("QUIZ ARENA", W / 2, 60);
    ctx.font = "12px Georgia, serif";
    ctx.fillStyle = "#a09060";
    ctx.fillText("Nigeria's Premier Academic Gaming Platform", W / 2, 78);

    // Decorative stars
    ["★", "★", "★"].forEach((s, i) => {
      ctx.font = `${[10, 14, 10][i]}px serif`;
      ctx.fillStyle = gold2;
      ctx.globalAlpha = [0.6, 1, 0.6][i];
      ctx.fillText(s, [W / 2 - 30, W / 2, W / 2 + 30][i], 128);
      ctx.globalAlpha = 1;
    });

    // Trophy
    ctx.font = "48px serif";
    ctx.fillText("🏆", W / 2, 170);

    // Recipient
    ctx.font = "italic 15px Georgia, serif";
    ctx.fillStyle = "#a09060";
    ctx.fillText("This certificate is proudly awarded to", W / 2, 294);

    ctx.font = "bold 52px Georgia, serif";
    ctx.fillStyle = gold2;
    ctx.fillText(name.toUpperCase(), W / 2, 350);

    if (school) {
      ctx.font = "14px Georgia, serif";
      ctx.fillStyle = "#7080a0";
      ctx.fillText(school, W / 2, 382);
    }

    // Recognition text
    ctx.font = "italic 13px Georgia, serif";
    ctx.fillStyle = "#6070a0";
    const recLine1 = type === "student"
      ? "for demonstrating exceptional academic excellence, outstanding performance, remarkable consistency,"
      : "for outstanding academic performance, exceptional student participation, and remarkable excellence";
    const recLine2 = type === "student"
      ? "and superior competitive achievement on the Quiz Arena platform — Nigeria's Premier Academic Gaming Platform."
      : "in competitive learning on the Quiz Arena platform — Nigeria's Premier Academic Gaming Platform.";
    ctx.fillText(recLine1, W / 2, 404);
    ctx.fillText(recLine2, W / 2, 420);

    // Stats boxes
    const stats = type === "student"
      ? [
          { label: "MONTH", value: month },
          { label: "YEAR", value: year },
          { label: "RANK", value: rank },
          { label: "BATTLE WINS", value: wins },
          { label: "ACCURACY", value: accuracy + "%" },
        ]
      : [
          { label: "MONTH", value: month },
          { label: "YEAR", value: year },
          { label: "RANKING", value: rank },
          { label: "SCHOOL SCORE", value: wins },
        ];

    const sw = 148;
    const sh = 70;
    const sg = 18;
    const totalW = stats.length * sw + (stats.length - 1) * sg;
    const startX = W / 2 - totalW / 2;

    stats.forEach((stat, i) => {
      const sx = startX + i * (sw + sg);
      const sy = 438;
      roundRect(ctx, sx, sy, sw, sh, 8);
      ctx.fillStyle = "rgba(201,168,76,0.06)";
      ctx.fill();
      ctx.lineWidth = 0.8;
      ctx.strokeStyle = gold2;
      ctx.stroke();

      ctx.font = "bold 20px Georgia, serif";
      ctx.fillStyle = gold3;
      ctx.textAlign = "center";
      ctx.fillText(stat.value, sx + sw / 2, sy + 34);

      ctx.font = "9px Georgia, serif";
      ctx.fillStyle = "#506080";
      ctx.fillText(stat.label, sx + sw / 2, sy + 54);
    });

    // Footer
    ctx.font = "10px Georgia, serif";
    ctx.fillStyle = "#304050";
    ctx.textAlign = "center";
    ctx.fillText(`Certificate No: ${certNumber}`, W / 2, 640);
    ctx.fillText(`Issue Date: ${issueDate}  ·  Verify: quizarena.com.ng/verify`, W / 2, 656);

    setReady(true);
  }, [type, name, school, month, year, wins, accuracy, rank, certNumber, issueDate]);

  const handleDownload = () => {
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
            <button onClick={handleDownload} disabled={!ready}
              className="rounded-full bg-[#f59e0b] px-4 py-2 text-black font-bold disabled:opacity-60">Download as PNG</button>
            <button onClick={() => window.print()} className="rounded-full border border-white/10 px-4 py-2 text-sm">Print</button>
          </div>
        </div>

        <div className="rounded-xl overflow-hidden border border-white/10 bg-black/20 p-4">
          <canvas ref={canvasRef} style={{ width: '100%', height: 'auto', display: 'block' }} />
        </div>

        <p className="mt-4 text-sm text-zinc-400">Certificate No: {certNumber} · Issued by Quiz Arena Nigeria · quizarena.com.ng</p>
      </div>
    </div>
  );
}

export default function CertificatePage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center p-6">Loading certificate preview...</div>}>
      <CertificateContent />
    </Suspense>
  );
}
