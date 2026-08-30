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

function drawWrappedText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number,
  align: CanvasTextAlign = "center"
) {
  ctx.textAlign = align;
  const words = text.split(" ");
  let line = "";
  let lineCount = 0;

  for (let n = 0; n < words.length; n += 1) {
    const testLine = line ? `${line} ${words[n]}` : words[n];
    const metrics = ctx.measureText(testLine);
    const testWidth = metrics.width;
    if (testWidth > maxWidth && n > 0) {
      ctx.fillText(line, x, y + lineCount * lineHeight);
      line = words[n];
      lineCount += 1;
    } else {
      line = testLine;
    }
  }

  if (line) {
    ctx.fillText(line, x, y + lineCount * lineHeight);
  }
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
  const wins = searchParams.get("wins") || "N/A";
  const accuracy = searchParams.get("accuracy") || "N/A";
  const rank = searchParams.get("rank") || "1st";
  const studentId = searchParams.get("id") || searchParams.get("student_id") || "N/A";
  const xp = searchParams.get("xp") || "N/A";
  const points = searchParams.get("points") || searchParams.get("team_points") || "N/A";
  const participating = searchParams.get("participating") || searchParams.get("participating_students") || "N/A";
  const tournamentPerformance = searchParams.get("score") || searchParams.get("tournament_performance") || "N/A";
  const certNumber = searchParams.get("cert") || `QA-${Date.now().toString(36).toUpperCase()}`;
  const issueDate = new Date().toLocaleDateString("en-NG", { day: "numeric", month: "long", year: "numeric" });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const W = 3508;
    const H = 2480;
    canvas.width = W;
    canvas.height = H;

    const palette = {
      background: "#f6efe3",
      marble: "rgba(223, 204, 161, 0.16)",
      text: "#2b2520",
      gold: "#b8903d",
      goldBright: "#f3d47d",
      accent: "#7a5932",
      shadow: "rgba(0, 0, 0, 0.12)",
      ink: "#231f20",
    };

    ctx.clearRect(0, 0, W, H);

    // background
    const background = ctx.createLinearGradient(0, 0, W, H);
    background.addColorStop(0, palette.background);
    background.addColorStop(1, "#f1e8dc");
    ctx.fillStyle = background;
    ctx.fillRect(0, 0, W, H);

    // subtle marble texture
    ctx.save();
    ctx.strokeStyle = "rgba(228, 196, 150, 0.18)";
    ctx.lineWidth = 26;
    ctx.shadowBlur = 0;
    ctx.beginPath();
    ctx.moveTo(W * 0.08, H * 0.15);
    ctx.bezierCurveTo(W * 0.22, H * 0.12, W * 0.30, H * 0.35, W * 0.14, H * 0.52);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(W * 0.78, H * 0.12);
    ctx.bezierCurveTo(W * 0.92, H * 0.20, W * 0.76, H * 0.44, W * 0.88, H * 0.64);
    ctx.stroke();
    ctx.restore();

    // border frame
    const borderInset = 80;
    const borderWidth = W - borderInset * 2;
    const borderHeight = H - borderInset * 2;
    ctx.save();
    ctx.lineWidth = 40;
    ctx.strokeStyle = palette.gold;
    ctx.shadowColor = "rgba(0,0,0,0.18)";
    ctx.shadowBlur = 20;
    roundRect(ctx, borderInset, borderInset, borderWidth, borderHeight, 68);
    ctx.stroke();
    ctx.restore();

    ctx.save();
    ctx.lineWidth = 5;
    ctx.strokeStyle = "rgba(255,255,255,0.85)";
    roundRect(ctx, borderInset + 40, borderInset + 40, borderWidth - 80, borderHeight - 80, 54);
    ctx.stroke();
    ctx.restore();

    // watermark
    ctx.save();
    ctx.font = "bold 220px Georgia, serif";
    ctx.fillStyle = "rgba(216, 183, 110, 0.10)";
    ctx.textAlign = "center";
    ctx.translate(W / 2, H / 2.2);
    ctx.rotate(-0.12);
    ctx.fillText("QUIZ ARENA", 0, 0);
    ctx.restore();

    // logo panel
    ctx.save();
    ctx.fillStyle = "rgba(255,255,255,0.92)";
    ctx.strokeStyle = "rgba(176, 143, 76, 0.24)";
    ctx.lineWidth = 8;
    roundRect(ctx, W * 0.08, H * 0.10, W * 0.25, 240, 32);
    ctx.fill();
    ctx.stroke();
    ctx.restore();

    ctx.save();
    ctx.fillStyle = "rgba(255,255,255,0.92)";
    ctx.strokeStyle = "rgba(176, 143, 76, 0.24)";
    ctx.lineWidth = 8;
    roundRect(ctx, W * 0.67, H * 0.10, W * 0.25, 240, 32);
    ctx.fill();
    ctx.stroke();
    ctx.restore();

    ctx.save();
    ctx.fillStyle = palette.gold;
    ctx.font = "bold 42px Georgia, serif";
    ctx.textAlign = "left";
    ctx.fillText("QUIZ ARENA", W * 0.095, H * 0.18);
    ctx.font = "18px Georgia, serif";
    ctx.fillStyle = palette.ink;
    ctx.fillText("Academic Recognition System", W * 0.095, H * 0.22);
    ctx.restore();

    ctx.save();
    ctx.fillStyle = palette.gold;
    ctx.font = "bold 42px Georgia, serif";
    ctx.textAlign = "right";
    ctx.fillText("SCHOOL LOGO", W * 0.92, H * 0.18);
    ctx.font = "18px Georgia, serif";
    ctx.fillStyle = palette.ink;
    ctx.fillText("Partner Institution", W * 0.92, H * 0.22);
    ctx.restore();

    // top center brand lockup
    ctx.save();
    ctx.fillStyle = palette.accent;
    ctx.font = "bold 78px Georgia, serif";
    ctx.textAlign = "center";
    ctx.fillText("QUIZ ARENA", W / 2, H * 0.24);
    ctx.font = "26px Georgia, serif";
    ctx.fillStyle = palette.gold;
    ctx.fillText("PREMIUM ACHIEVEMENT AWARD", W / 2, H * 0.28);
    ctx.restore();

    // tile and subtitle
    ctx.save();
    ctx.textAlign = "center";
    ctx.fillStyle = palette.ink;
    ctx.font = "bold 128px Georgia, serif";
    const awardTitle = type === "student"
      ? "CERTIFICATE OF ACADEMIC EXCELLENCE"
      : "CERTIFICATE OF INSTITUTIONAL EXCELLENCE";
    ctx.fillText(awardTitle, W / 2, H * 0.40);
    ctx.font = "bold 48px Georgia, serif";
    ctx.fillStyle = palette.gold;
    const subtitle = type === "student"
      ? "BEST STUDENT OF THE MONTH"
      : "BEST SCHOOL OF THE MONTH";
    ctx.fillText(subtitle, W / 2, H * 0.455);
    ctx.restore();

    ctx.save();
    ctx.strokeStyle = palette.gold;
    ctx.lineWidth = 7;
    ctx.beginPath();
    ctx.moveTo(W * 0.18, H * 0.48);
    ctx.lineTo(W * 0.82, H * 0.48);
    ctx.stroke();
    ctx.restore();

    // recipient and body text
    ctx.save();
    ctx.fillStyle = palette.ink;
    ctx.textAlign = "center";
    ctx.font = "italic 42px Georgia, serif";
    ctx.fillText("This certificate is proudly awarded to", W / 2, H * 0.53);
    ctx.font = "bold 96px Georgia, serif";
    ctx.fillStyle = palette.gold;
    ctx.fillText(name.toUpperCase(), W / 2, H * 0.595);
    ctx.restore();

    if (school && type === "student") {
      ctx.save();
      ctx.fillStyle = palette.accent;
      ctx.font = "italic 34px Georgia, serif";
      ctx.fillText(school, W / 2, H * 0.635);
      ctx.restore();
    }

    const recognitionText = type === "student"
      ? `for demonstrating exceptional academic excellence, outstanding performance, remarkable consistency, and superior competitive achievement on the Quiz Arena platform.`
      : `for outstanding academic performance, exceptional student participation, and remarkable excellence in competitive learning on the Quiz Arena platform.`;
    ctx.save();
    ctx.fillStyle = palette.ink;
    ctx.font = "26px Georgia, serif";
    drawWrappedText(ctx, recognitionText, W / 2, H * 0.68, W * 0.64, 42);
    ctx.restore();

    // information modules
    const detailBoxes = type === "student"
      ? [
          { label: "Month", value: month },
          { label: "Year", value: year },
          { label: "Rank Achieved", value: rank },
          { label: "Total XP", value: xp },
          { label: "Battle Wins", value: wins },
          { label: "Accuracy", value: `${accuracy}%` },
          { label: "Student ID", value: studentId },
        ]
      : [
          { label: "Month", value: month },
          { label: "Year", value: year },
          { label: "School Ranking", value: rank },
          { label: "Total Team Points", value: points },
          { label: "Participating Students", value: participating },
          { label: "Tournament Performance", value: tournamentPerformance },
          { label: "Award Verification", value: certNumber },
        ];

    const columns = 3;
    const boxWidth = 880;
    const boxHeight = 190;
    const boxGap = 40;
    const boxesPerRow = Math.ceil(detailBoxes.length / 2);
    const totalWidth = boxesPerRow * boxWidth + (boxesPerRow - 1) * boxGap;
    let startX = W / 2 - totalWidth / 2;

    detailBoxes.forEach((box, index) => {
      const row = Math.floor(index / boxesPerRow);
      const col = index % boxesPerRow;
      const x = startX + col * (boxWidth + boxGap);
      const y = H * 0.76 + row * (boxHeight + boxGap);

      ctx.save();
      ctx.fillStyle = "rgba(255, 255, 255, 0.95)";
      roundRect(ctx, x, y, boxWidth, boxHeight, 32);
      ctx.fill();
      ctx.strokeStyle = "rgba(184, 144, 61, 0.22)";
      ctx.lineWidth = 4;
      ctx.stroke();
      ctx.restore();

      ctx.save();
      ctx.fillStyle = palette.gold;
      ctx.font = "bold 42px Georgia, serif";
      ctx.textAlign = "left";
      ctx.fillText(box.value, x + 40, y + 95);
      ctx.fillStyle = palette.accent;
      ctx.font = "24px Georgia, serif";
      ctx.fillText(box.label.toUpperCase(), x + 40, y + 145);
      ctx.restore();
    });

    // signature section
    ctx.save();
    ctx.strokeStyle = palette.gold;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(W * 0.18, H * 0.925);
    ctx.lineTo(W * 0.45, H * 0.925);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(W * 0.55, H * 0.925);
    ctx.lineTo(W * 0.82, H * 0.925);
    ctx.stroke();
    ctx.restore();

    ctx.save();
    ctx.fillStyle = palette.ink;
    ctx.font = "24px Georgia, serif";
    ctx.textAlign = "center";
    ctx.fillText("Chief Academic Officer", W * 0.315, H * 0.97);
    ctx.fillText("Director of Institutional Partnerships", W * 0.685, H * 0.97);
    ctx.restore();

    ctx.save();
    ctx.fillStyle = palette.ink;
    ctx.font = "22px Georgia, serif";
    ctx.textAlign = "center";
    ctx.fillText(`Certificate No: ${certNumber} · Issue Date: ${issueDate}`, W / 2, H * 0.81);
    ctx.restore();

    setReady(true);
  }, [type, name, school, month, year, wins, accuracy, rank, studentId, xp, points, participating, tournamentPerformance, certNumber, issueDate]);

  const handleDownload = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const link = document.createElement("a");
    link.download = `QuizArena-Certificate-${name.replace(/\s+/g, "-")}-${month}-${year}.png`;
    link.href = canvas.toDataURL("image/png", 1.0);
    link.click();
  };

  return (
    <div className="min-h-screen bg-[#0e0a05] text-white flex items-center justify-center p-6">
      <div className="w-full max-w-6xl">
        <div className="mb-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-black tracking-tight">Certificate Preview</h1>
            <p className="text-zinc-400 text-sm">Preview and download premium Quiz Arena award certificates in print-ready A4 landscape resolution.</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <button onClick={handleDownload} disabled={!ready}
              className="rounded-full bg-[#d4a72d] px-5 py-3 text-black font-semibold disabled:opacity-60">Download as PNG</button>
            <button onClick={() => window.print()} className="rounded-full border border-white/10 px-5 py-3 text-sm">Print</button>
          </div>
        </div>

        <div className="rounded-3xl overflow-hidden border border-white/10 bg-white/5 p-4 shadow-2xl shadow-black/30">
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
