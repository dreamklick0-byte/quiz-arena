"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { getSupabaseClient } from "../../lib/supabase";
import { PageShell } from "../components/PageShell";
import { useGamificationStore } from "../../lib/gamificationStore";
import confetti from "canvas-confetti";
import { motion, AnimatePresence } from "framer-motion";

interface Segment {
  label: string;
  type: "cash" | "xp" | "none";
  amount: number;
  weight: number;
  color: string;
}

function easeOutQuart(t: number): number {
  return 1 - Math.pow(1 - t, 4);
}

function drawWheel(
  canvas: HTMLCanvasElement,
  segments: Segment[],
  rotationRadians: number
) {
  const ctx = canvas.getContext('2d')!;
  const cx = canvas.width / 2;
  const cy = canvas.height / 2;
  const radius = cx - 10;
  const segAngle = (2 * Math.PI) / segments.length;

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  segments.forEach((seg, i) => {
    // Start drawing from the top (-Math.PI/2) and apply rotation
    const start = rotationRadians - Math.PI / 2 + i * segAngle;
    const end = start + segAngle;

    // Segment
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, radius, start, end);
    ctx.closePath();
    ctx.fillStyle = seg.color;
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.12)';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Label
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(start + segAngle / 2);
    ctx.textAlign = 'right';
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 13px DM Sans, sans-serif';
    ctx.shadowColor = 'rgba(0,0,0,0.5)';
    ctx.shadowBlur = 4;
    ctx.fillText(seg.label, radius - 14, 5);
    ctx.restore();
  });


  // Center circle
  ctx.beginPath();
  ctx.arc(cx, cy, 28, 0, 2 * Math.PI);
  ctx.fillStyle = '#080818';
  ctx.fill();
  ctx.strokeStyle = '#F5A623';
  ctx.lineWidth = 3;
  ctx.stroke();

  // Center logo or "SPIN" text
  ctx.fillStyle = '#F5A623';
  ctx.font = 'bold 10px DM Sans, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('SPIN', cx, cy);
}

function getTargetRotation(
  segmentIndex: number,
  totalSegments: number,
  currentRotationRad: number
): number {
  const degreesPerSegment = 360 / totalSegments;
  
  // Each segment i occupies degrees from (i * degreesPerSegment) to ((i+1) * degreesPerSegment)
  // We want the wheel to stop with segment [segmentIndex] at the top (pointer position)
  // The target rotation is calculated to align the center of the segment with the pointer
  const targetDegree = 360 - (segmentIndex * degreesPerSegment) - (degreesPerSegment / 2);
  
  // Add multiple full rotations for visual effect (5 full spins minimum)
  const totalRotationDegrees = 360 * 5 + targetDegree;
  
  // Convert to radians
  return (totalRotationDegrees * Math.PI) / 180;
}


function getSegmentUnderPointer(finalRotationRad: number, totalSegments: number, segments: Segment[], backendIndex: number): number {
  const segmentAngle = (2 * Math.PI) / totalSegments;
  const pointerAngle = -Math.PI / 2;
  // Normalize pointer angle relative to wheel rotation
  let relativeAngle = ((pointerAngle - finalRotationRad) % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI);
  const index = Math.floor(relativeAngle / segmentAngle) % totalSegments;
  
  console.log('=== SPIN DEBUG ===');
  console.log('Backend segmentIndex:', backendIndex);
  console.log('Final rotation (rad):', finalRotationRad);
  console.log('Final rotation (deg):', (finalRotationRad * 180 / Math.PI) % 360);
  console.log('Visual segment index under pointer:', index);
  console.log('Visual segment label:', segments[index]?.label);
  console.log('Backend segment label:', segments[backendIndex]?.label);
  console.log('Offset (visual - backend):', index - backendIndex);
  console.log('Segment 0 start angle in drawWheel: rotationRadians + i * segAngle');
  console.log('==================');
  
  return index;
}

export default function SpinPage() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [segments, setSegments] = useState<Segment[]>([]);
  const [spinning, setSpinning] = useState(false);
  const [eligible, setEligible] = useState<boolean | null>(null);
  const [nextSpinAt, setNextSpinAt] = useState<string | null>(null);
  const [countdown, setCountdown] = useState("");
  const [currentRotation, setCurrentRotation] = useState(0);
  const [showRewardPopup, setShowRewardPopup] = useState(false);
  const [reward, setReward] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const { addCoins, addXP, coins: currentCoins } = useGamificationStore();

  const fetchSegments = useCallback(async () => {
    const res = await fetch('/api/spin-wheel/segments');
    const data = await res.json();
    if (data.segments) setSegments(data.segments);
  }, []);

  const checkEligibility = useCallback(async () => {
    const supabase = getSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      setLoading(false);
      return;
    }

    const res = await fetch('/api/spin-wheel', { method: 'GET' });
    const data = await res.json();
    
    if (data.error === 'Unauthorized') {
       setEligible(null);
    } else if (data.eligible === false) {
      setEligible(false);
      setNextSpinAt(data.nextSpinAt);
    } else {
      setEligible(true);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchSegments();
    checkEligibility();
  }, [fetchSegments, checkEligibility]);

  useEffect(() => {
    if (segments.length > 0 && canvasRef.current) {
      drawWheel(canvasRef.current, segments, currentRotation);
    }
  }, [segments, currentRotation]);

  useEffect(() => {
    if (!nextSpinAt) return;
    const interval = setInterval(() => {
      const diff = new Date(nextSpinAt).getTime() - Date.now();
      if (diff <= 0) {
        setEligible(true);
        setNextSpinAt(null);
        setCountdown("");
        clearInterval(interval);
      } else {
        const h = Math.floor(diff / 3600000);
        const m = Math.floor((diff % 3600000) / 60000);
        const s = Math.floor((diff % 60000) / 1000);
        setCountdown(`${h}h ${m}m ${s}s`);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [nextSpinAt]);

  const animateSpin = (
    canvas: HTMLCanvasElement,
    segments: Segment[],
    startRotationRad: number,
    targetRotationRad: number,
    durationMs: number,
    onComplete: () => void
  ) => {
    const startTime = performance.now();

    function frame(now: number) {
      const elapsed = now - startTime;
      const t = Math.min(elapsed / durationMs, 1);
      const eased = easeOutQuart(t);
      const currentRad = startRotationRad + (targetRotationRad - startRotationRad) * eased;
      drawWheel(canvas, segments, currentRad);

      if (t < 1) {
        requestAnimationFrame(frame);
      } else {
        drawWheel(canvas, segments, targetRotationRad);
        onComplete();
      }
    }
    requestAnimationFrame(frame);
  };

  const handleSpin = async () => {
    if (spinning || !eligible) return;

    setSpinning(true);
    // Reset rotation before spinning
    setCurrentRotation(0);
    
    try {
      const res = await fetch('/api/spin-wheel', { method: 'POST' });
      const data = await res.json();

      if (!data.eligible) {
        setEligible(false);
        setNextSpinAt(data.nextSpinAt);
        setSpinning(false);
        return;
      }

      const target = getTargetRotation(data.segmentIndex, segments.length, 0);

      animateSpin(canvasRef.current!, segments, 0, target, 4500, async () => {
        const finalRotation = target;
        setCurrentRotation(finalRotation);
        
        // Debug log
        getSegmentUnderPointer(finalRotation, segments.length, segments, data.segmentIndex);

        // Wallet was already updated on backend in the POST handler
        // Update local state to reflect the win
        if (data.prize.type === 'cash') {
          addCoins(data.prize.amount);
        } else if (data.prize.type === 'xp') {
          addXP(data.prize.amount);
        }
        
        setReward({
          ...data.prize,
          oldBalance: currentCoins,
          newBalance: data.prize.type === 'cash' ? currentCoins + data.prize.amount : currentCoins
        });
        
        setShowRewardPopup(true);
        setEligible(false);
        
        // Set next spin at tomorrow midnight UTC
        const tomorrow = new Date();
        tomorrow.setUTCHours(24, 0, 0, 0);
        setNextSpinAt(tomorrow.toISOString());
        
        setSpinning(false);
      });
    } catch (err) {
      console.error("Spin error:", err);
      setSpinning(false);
    }
  };


  const handleCollect = () => {
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 }
    });
    setShowRewardPopup(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#080818] flex items-center justify-center">
        <div className="text-white font-orbitron text-xl animate-pulse">LOADING ARENA...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#080818] text-white relative overflow-x-hidden">
      <PageShell overlay="transparent">
        {/* Header Section */}
        <div className="relative py-16 text-center overflow-hidden">
          <div className="absolute inset-0 z-0">
             <img
              src="https://images.unsplash.com/photo-1627384113743-6bd5a479fffd?w=1920&q=80"
              className="w-full h-full object-cover opacity-10"
              alt=""
            />
            <div className="absolute inset-0 bg-gradient-to-b from-transparent to-[#080818]" />
          </div>
          
          <motion.h1 
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="text-5xl md:text-6xl font-black font-orbitron text-[#F5A623] relative z-10"
            style={{ textShadow: '0 0 20px rgba(245,166,35,0.5)' }}
          >
            Daily Spin
          </motion.h1>
          <motion.p 
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="text-white/60 mt-4 relative z-10 font-medium"
          >
            Test your luck and win daily prizes!
          </motion.p>
        </div>

        {/* Wheel Container */}
        <div className="flex flex-col items-center justify-center pb-20">
          <div style={{ position: 'relative', display: 'inline-block' }}>
            {/* Pointer — centered at top, pointing DOWN into the wheel */}
            <div style={{
              position: 'absolute',
              top: -18,                    // sits just above the wheel edge
              left: '50%',
              transform: 'translateX(-50%)',
              width: 0,
              height: 0,
              borderLeft: '12px solid transparent',
              borderRight: '12px solid transparent',
              borderTop: '22px solid #F5A623',  // points DOWNWARD
              filter: 'drop-shadow(0 2px 8px rgba(245,166,35,0.9))',
              zIndex: 20,
            }} />

            {/* Canvas */}
            <div className={`relative ${!eligible && !spinning ? 'opacity-40 grayscale' : ''} transition-all duration-700`}>
              <canvas
                ref={canvasRef}
                width={360}
                height={360}
                className="rounded-full shadow-[0_0_60px_rgba(245,166,35,0.15)]"
              />
            </div>
          </div>

          {/* Action Button / Countdown */}
          <div className="mt-12 text-center">
            {eligible ? (
              <button
                onClick={handleSpin}
                disabled={spinning}
                className="group relative px-12 py-4 bg-[#F5A623] rounded-2xl overflow-hidden transition-all hover:scale-105 active:scale-95 disabled:opacity-50"
              >
                <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform" />
                <span className="relative text-[#080818] font-black text-xl font-orbitron">
                  {spinning ? 'SPINNING...' : 'SPIN NOW'}
                </span>
              </button>
            ) : (
              <div className="bg-[#12122A] px-8 py-4 rounded-2xl border border-white/5">
                <p className="text-white/40 text-sm font-bold uppercase tracking-widest">Next spin in</p>
                <p className="text-3xl font-black text-[#F5A623] font-orbitron mt-1">{countdown || '--:--:--'}</p>
              </div>
            )}
          </div>
        </div>
      </PageShell>

      {/* Reward Popup */}
      <AnimatePresence>
        {showRewardPopup && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center px-6">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            />
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              transition={{ type: "spring", damping: 20, stiffness: 300 }}
              className="relative bg-[#1A1A35] border border-white/10 rounded-3xl p-8 max-w-sm w-full text-center shadow-2xl"
            >
              <div className="text-6xl mb-4">
                {reward?.type === 'cash' ? '💰' : reward?.type === 'xp' ? '⭐' : '😅'}
              </div>
              <h2 className="text-2xl font-black text-white font-orbitron mb-2">
                {reward?.type === 'none' ? 'TRY AGAIN' : 'CONGRATULATIONS!'}
              </h2>
              <p className="text-white/60 mb-6">
                {reward?.type === 'none' 
                  ? "Better luck tomorrow! Keep practicing to win big." 
                  : `You won ${reward?.label}!`}
              </p>

              {reward?.type === 'cash' && (
                <div className="bg-black/20 rounded-2xl p-4 mb-6 border border-white/5">
                   <p className="text-xs text-white/40 uppercase font-bold mb-1">Wallet Balance</p>
                   <div className="flex items-center justify-center gap-3">
                      <span className="text-white/30 line-through">₦{reward.oldBalance}</span>
                      <span className="text-2xl font-black text-green-400">₦{reward.newBalance}</span>
                   </div>
                </div>
              )}

              <button
                onClick={handleCollect}
                className="w-full py-4 bg-[#F5A623] text-[#080818] font-black rounded-2xl font-orbitron hover:bg-[#FFD166] transition-colors"
              >
                COLLECT
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
