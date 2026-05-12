"use client";

import { useEffect, useRef, useState } from "react";
import { getSupabaseClient } from "@/lib/supabase";
import { PageShell } from "@/app/components/PageShell";

const PRIZES = [
  { label: "₦20", amount: 20, type: "cash", color: "#10b981", text: "#fff" },
  { label: "₦50", amount: 50, type: "cash", color: "#f59e0b", text: "#000" },
  { label: "₦70", amount: 70, type: "cash", color: "#6366f1", text: "#fff" },
  { label: "₦100", amount: 100, type: "cash", color: "#ec4899", text: "#fff" },
  { label: "Free Battle", amount: 0, type: "free_battle", color: "#3b82f6", text: "#fff" },
  { label: "2× XP", amount: 0, type: "xp", color: "#8b5cf6", text: "#fff" },
  { label: "Try Again", amount: 0, type: "nothing", color: "#374151", text: "#9ca3af" },
  { label: "₦110", amount: 110, type: "cash", color: "#ef4444", text: "#fff" },
];

const SLICE = (2 * Math.PI) / PRIZES.length;

function drawWheel(canvas: HTMLCanvasElement, rotation: number) {
  const ctx = canvas.getContext("2d")!;
  const cx = canvas.width / 2;
  const cy = canvas.height / 2;
  const r = cx - 8;

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  const glow = ctx.createRadialGradient(cx, cy, r - 10, cx, cy, r + 8);
  glow.addColorStop(0, "rgba(245,158,11,0.4)");
  glow.addColorStop(1, "rgba(245,158,11,0)");
  ctx.beginPath();
  ctx.arc(cx, cy, r + 8, 0, 2 * Math.PI);
  ctx.fillStyle = glow;
  ctx.fill();

  PRIZES.forEach((prize, i) => {
    const start = rotation + i * SLICE;
    const end = start + SLICE;

    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, r, start, end);
    ctx.closePath();
    ctx.fillStyle = prize.color;
    ctx.fill();
    ctx.strokeStyle = "#0f0f1a";
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(start + SLICE / 2);
    ctx.textAlign = "right";
    ctx.fillStyle = prize.text;
    ctx.font = "bold 13px 'Segoe UI', sans-serif";
    ctx.shadowColor = "rgba(0,0,0,0.6)";
    ctx.shadowBlur = 4;
    ctx.fillText(prize.label, r - 14, 5);
    ctx.restore();
  });

  const centerGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, 28);
  centerGrad.addColorStop(0, "#1e1b4b");
  centerGrad.addColorStop(1, "#0f0f1a");
  ctx.beginPath();
  ctx.arc(cx, cy, 28, 0, 2 * Math.PI);
  ctx.fillStyle = centerGrad;
  ctx.fill();
  ctx.strokeStyle = "#f59e0b";
  ctx.lineWidth = 3;
  ctx.stroke();

  ctx.fillStyle = "#f59e0b";
  ctx.font = "bold 10px 'Segoe UI', sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("SPIN", cx, cy + 4);
}

export default function SpinPage() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);
  const [spinning, setSpinning] = useState(false);
  const [result, setResult] = useState<(typeof PRIZES)[0] | null>(null);
  const [canSpin, setCanSpin] = useState(false);
  const [nextSpinAt, setNextSpinAt] = useState<Date | null>(null);
  const [countdown, setCountdown] = useState("");
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const rotationRef = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas) drawWheel(canvas, rotationRef.current);
  }, []);

  useEffect(() => {
    const supabase = getSupabaseClient();
    supabase.auth.getSession().then(async ({ data }) => {
      const uid = data.session?.user?.id;
      if (!uid) {
        setLoading(false);
        return;
      }
      setUserId(uid);
      const res = await fetch(`/api/spin?userId=${uid}`);
      const json = await res.json();
      setCanSpin(json.canSpin);
      if (!json.canSpin && json.nextSpinAt) setNextSpinAt(new Date(json.nextSpinAt));
      setLoading(false);
    });
  }, []);

  useEffect(() => {
    if (!nextSpinAt) return;
    const tick = () => {
      const diff = nextSpinAt.getTime() - Date.now();
      if (diff <= 0) {
        setCanSpin(true);
        setNextSpinAt(null);
        setCountdown("");
        return;
      }
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setCountdown(`${h.toString().padStart(2,"0")}:${m.toString().padStart(2,"0")}:${s.toString().padStart(2,"0")}`);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [nextSpinAt]);

  const handleSpin = async () => {
    if (!canSpin || spinning || !userId) return;
    setSpinning(true);
    setResult(null);

    const res = await fetch("/api/spin", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId }),
    });
    const json = await res.json();

    if (!json.success) {
      setSpinning(false);
      if (json.nextSpinAt) {
        setCanSpin(false);
        setNextSpinAt(new Date(json.nextSpinAt));
      }
      return;
    }

    const prizeIndex = PRIZES.findIndex(p => p.label === json.prize.label);
    const targetAngle = -(prizeIndex * SLICE + SLICE / 2);
    const fullSpins = (5 + Math.floor(Math.random() * 4)) * 2 * Math.PI;
    const finalRotation = targetAngle - (rotationRef.current % (2 * Math.PI)) + fullSpins;
    const startRotation = rotationRef.current;

    const duration = 4500;
    const startTime = performance.now();
    const canvas = canvasRef.current!;

    const animate = (now: number) => {
      const elapsed = now - startTime;
      const t = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - t, 3);
      rotationRef.current = startRotation + finalRotation * eased;
      drawWheel(canvas, rotationRef.current);

      if (t < 1) {
        animRef.current = requestAnimationFrame(animate);
      } else {
        setSpinning(false);
        setResult(json.prize);
        setCanSpin(false);
        setNextSpinAt(new Date(Date.now() + 24 * 60 * 60 * 1000));
      }
    };
    animRef.current = requestAnimationFrame(animate);
  };

  return (
    <PageShell>
      <div className="min-h-screen bg-[#0f0f1a] text-white flex flex-col items-center px-4 py-10">
        <div className="mb-2 text-center">
          <h1 className="text-3xl font-black tracking-tight text-[#f59e0b]">🎡 Daily Spin & Win</h1>
          <p className="mt-1 text-sm text-zinc-400">One free spin every 24 hours. Win cash, XP, and more!</p>
        </div>

        <div className="relative mt-6 flex flex-col items-center">
          <div className="relative z-10 mb-[-12px]">
            <div style={{
              width:0, height:0,
              borderLeft:"14px solid transparent",
              borderRight:"14px solid transparent",
              borderTop:"28px solid #f59e0b",
              filter:"drop-shadow(0 2px 6px rgba(245,158,11,0.8))"
            }} />
          </div>
          <canvas
            ref={canvasRef}
            width={320}
            height={320}
            className="rounded-full"
            style={{ boxShadow:"0 0 40px rgba(245,158,11,0.25), 0 0 80px rgba(99,102,241,0.15)" }}
          />
        </div>

        <div className="mt-8 text-center">
          {loading ? (
            <div className="text-zinc-500 text-sm">Loading...</div>
          ) : !userId ? (
            <a href="/auth" className="rounded-xl bg-[#7c3aed] px-8 py-3 text-sm font-bold text-white shadow-lg transition hover:bg-[#6d28d9]">Sign in to Spin</a>
          ) : canSpin ? (
            <button
              onClick={handleSpin}
              disabled={spinning}
              className="rounded-xl bg-[#f59e0b] px-10 py-3 text-sm font-black text-black shadow-lg transition hover:bg-[#d97706] disabled:opacity-60 disabled:cursor-not-allowed"
              style={{ boxShadow:"0 0 24px rgba(245,158,11,0.5)" }}
            >
              {spinning ? "Spinning..." : "🎰 SPIN NOW"}
            </button>
          ) : (
            <div className="flex flex-col items-center gap-2">
              <div className="rounded-xl border border-white/10 bg-white/5 px-8 py-3 text-sm font-bold text-zinc-400">Already spun today</div>
              {countdown && <div className="text-xs text-zinc-500">Next spin in <span className="font-mono text-[#f59e0b] font-bold">{countdown}</span></div>}
            </div>
          )}
        </div>

        {result && (
          <div className="mt-8 w-full max-w-sm rounded-2xl border px-6 py-5 text-center" style={{ borderColor:result.color, backgroundColor:result.color+"22", boxShadow:`0 0 30px ${result.color}44` }}>
            {result.type === "nothing" ? (
              <><div className="text-3xl mb-1">😅</div><div className="text-lg font-black text-zinc-300">Better luck tomorrow!</div><div className="text-xs text-zinc-500 mt-1">Come back in 24 hours</div></>
            ) : result.type === "cash" ? (
              <><div className="text-3xl mb-1">🎉</div><div className="text-2xl font-black" style={{ color:result.color }}>{result.label} Won!</div><div className="text-xs text-zinc-400 mt-1">Credited to your wallet instantly</div></>
            ) : result.type === "free_battle" ? (
              <><div className="text-3xl mb-1">⚔️</div><div className="text-xl font-black text-[#3b82f6]">Free Battle Entry!</div><div className="text-xs text-zinc-400 mt-1">Head to Battle to use it</div></>
            ) : (
              <><div className="text-3xl mb-1">⚡</div><div className="text-xl font-black text-[#8b5cf6]">2× XP Boost!</div><div className="text-xs text-zinc-400 mt-1">Active for your next battle</div></>
            )}
          </div>
        )}

        <div className="mt-10 w-full max-w-sm">
          <div className="text-xs font-semibold text-zinc-500 uppercase tracking-widest mb-3 text-center">Prize Pool</div>
          <div className="grid grid-cols-2 gap-2">
            {PRIZES.map((prize) => (
              <div key={prize.label} className="flex items-center gap-2 rounded-lg border border-white/5 bg-white/5 px-3 py-2">
                <div className="h-3 w-3 rounded-full shrink-0" style={{ backgroundColor:prize.color }} />
                <span className="text-xs text-zinc-300 font-medium">{prize.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </PageShell>
  );
}
