"use client"; 
import { useEffect, useRef, useState, useCallback } from "react"; 
import { getSupabaseClient } from "@/lib/supabase"; 
import { PageShell } from "@/app/components/PageShell"; 

const SEGMENTS = [ 
  { label: "₦20",      color: "#7c3aed", prize_amount: 20,  prize_type: "cash" }, 
  { label: "₦30",     color: "#a855f7", prize_amount: 30, prize_type: "cash" }, 
  { label: "₦50",     color: "#6d28d9", prize_amount: 50, prize_type: "cash" }, 
  { label: "30 XP",     color: "#9333ea", prize_amount: 30, prize_type: "xp" }, 
  { label: "₦80",     color: "#7c3aed", prize_amount: 80, prize_type: "cash" }, 
  { label: "100 XP",   color: "#4c1d95", prize_amount: 100, prize_type: "xp"   }, 
  { label: "50 XP",    color: "#5b21b6", prize_amount: 50,  prize_type: "xp"   }, 
  { label: "Try again",color: "#3b0764", prize_amount: 0,   prize_type: "none" }, 
]; 

export default function SpinPage() { 
  const canvasRef = useRef<HTMLCanvasElement>(null); 
  const [spinning, setSpinning] = useState(false); 
  const [result, setResult] = useState<string | null>(null); 
  const [canSpin, setCanSpin] = useState(true); 
  const [nextSpinTime, setNextSpinTime] = useState<string | null>(null); 
  const [loading, setLoading] = useState(true); 
  const rotationRef = useRef(0); 

  const drawWheel = useCallback((rotation: number) => { 
    const canvas = canvasRef.current; 
    if (!canvas) return; 
    const ctx = canvas.getContext("2d"); 
    if (!ctx) return; 

    const cx = canvas.width / 2; 
    const cy = canvas.height / 2; 
    const radius = cx - 10; 
    const numSegments = SEGMENTS.length; 
    const arc = (2 * Math.PI) / numSegments; 

    ctx.clearRect(0, 0, canvas.width, canvas.height); 

    // Draw outer ring 
    ctx.beginPath(); 
    ctx.arc(cx, cy, radius + 8, 0, 2 * Math.PI); 
    ctx.strokeStyle = "#f59e0b"; 
    ctx.lineWidth = 6; 
    ctx.stroke(); 

    SEGMENTS.forEach((seg, i) => { 
      const startAngle = rotation + i * arc; 
      const endAngle = startAngle + arc; 

      // Draw segment 
      ctx.beginPath(); 
      ctx.moveTo(cx, cy); 
      ctx.arc(cx, cy, radius, startAngle, endAngle); 
      ctx.closePath(); 
      ctx.fillStyle = seg.color; 
      ctx.fill(); 
      ctx.strokeStyle = "#1e1b4b"; 
      ctx.lineWidth = 2; 
      ctx.stroke(); 

      // Draw label 
      ctx.save(); 
      ctx.translate(cx, cy); 
      ctx.rotate(startAngle + arc / 2); 
      ctx.textAlign = "right"; 
      ctx.fillStyle = "#ffffff"; 
      ctx.font = "bold 14px Arial"; 
      ctx.fillText(seg.label, radius - 12, 5); 
      ctx.restore(); 
    }); 

    // Draw center circle 
    ctx.beginPath(); 
    ctx.arc(cx, cy, 28, 0, 2 * Math.PI); 
    ctx.fillStyle = "#1e1b4b"; 
    ctx.fill(); 
    ctx.strokeStyle = "#f59e0b"; 
    ctx.lineWidth = 3; 
    ctx.stroke(); 

    // Draw SPIN text 
    ctx.fillStyle = "#f59e0b"; 
    ctx.font = "bold 11px Arial"; 
    ctx.textAlign = "center"; 
    ctx.fillText("SPIN", cx, cy + 4); 
  }, []); 

  useEffect(() => { 
    drawWheel(rotationRef.current); 
  }, [drawWheel]); 

  useEffect(() => { 
    const checkCooldown = async () => { 
      try { 
        const supabase = getSupabaseClient(); 
        const { data: { user } } = await supabase.auth.getUser(); 
        if (!user) { setLoading(false); return; } 

        const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(); 
        const { data } = await supabase 
          .from("daily_spins") 
          .select("spun_at") 
          .eq("user_id", user.id) 
          .gte("spun_at", twentyFourHoursAgo) 
          .order("spun_at", { ascending: false }) 
          .limit(1) 
          .maybeSingle(); 

        if (data) { 
          setCanSpin(false); 
          const lastSpinTime = data?.spun_at ? new Date(data.spun_at).getTime() : Date.now(); 
          const diff = (lastSpinTime + 24 * 60 * 60 * 1000) - Date.now(); 
          const h = Math.floor(diff / 3600000); 
          const m = Math.floor((diff % 3600000) / 60000); 
          setNextSpinTime(`${h}h ${m}m`); 
        } 
      } catch (e) { 
        console.error(e); 
      } finally { 
        setLoading(false); 
      } 
    }; 
    checkCooldown(); 
  }, []); 

  const handleSpin = async () => { 
    if (spinning || !canSpin) return; 
    setSpinning(true); 
    setResult(null); 

    const winIndex = Math.floor(Math.random() * SEGMENTS.length); 
    const numSegments = SEGMENTS.length; 
    const arc = (2 * Math.PI) / numSegments; 

    // Pointer is at top = -Math.PI/2 
    // We want winIndex segment center to land at top 
    // Segment i center is at: rotation + i*arc + arc/2 
    // We want that = -Math.PI/2 (mod 2PI) 
    const spins = 2 * Math.PI * 6; // 6 full rotations 
    const targetSegmentCenter = -Math.PI / 2 - (winIndex * arc + arc / 2); 
    const totalRotation = spins + targetSegmentCenter - (rotationRef.current % (2 * Math.PI)); 
    const startRotation = rotationRef.current; 
    const finalRotation = startRotation + totalRotation; 
    const duration = 4000; 
    const startTime = performance.now(); 

    const animate = (now: number) => { 
      const elapsed = now - startTime; 
      const progress = Math.min(elapsed / duration, 1); 
      const ease = 1 - Math.pow(1 - progress, 4); 
      const current = startRotation + (finalRotation - startRotation) * ease; 
      rotationRef.current = current; 
      drawWheel(current); 
      if (progress < 1) { 
        requestAnimationFrame(animate); 
      } else { 
        rotationRef.current = finalRotation; 
        setSpinning(false); 
        const won = SEGMENTS[winIndex]; 
        setResult(won.label); 
        creditPrize(won); 
      } 
    }; 
    requestAnimationFrame(animate); 
  }; 

  const creditPrize = async (seg: typeof SEGMENTS[0]) => { 
    try { 
      const supabase = getSupabaseClient(); 
      const { data: { user } } = await supabase.auth.getUser(); 
      if (!user) return; 

      await supabase.from("daily_spins").insert({ 
        user_id: user.id, 
        prize_label: seg.label, 
        prize_amount: seg.prize_amount, 
        spun_at: new Date().toISOString(), 
      }); 

      if (seg.prize_type === "cash" && seg.prize_amount > 0) { 
        await supabase.rpc("increment_wallet_balance", { 
          p_user_id: user.id, 
          p_amount: seg.prize_amount, 
        }); 
      } 

      setCanSpin(false); 
      const diff = 24 * 60 * 60 * 1000; 
      const h = Math.floor(diff / 3600000); 
      const m = Math.floor((diff % 3600000) / 60000); 
      setNextSpinTime(`${h}h ${m}m`); 
    } catch (e) { 
      console.error("Prize credit error:", e); 
    } 
  }; 

  return ( 
    <PageShell overlay="rgba(15, 15, 26, 0.8)"> 
      <style>{` 
        @keyframes pulse { 
          0%, 100% { transform: scale(1); opacity: 0.7; } 
          50% { transform: scale(1.2); opacity: 1; } 
        } 
        @keyframes twinkle { 
          0%, 100% { opacity: 0.2; transform: scale(1); } 
          50% { opacity: 1; transform: scale(1.5); } 
        } 
      `}</style> 
      <div className="min-h-screen flex flex-col items-center justify-center py-10 px-4" 
        style={{ 
          background: "linear-gradient(135deg, #0a0015 0%, #0f0f1a 40%, #1a0a2e 70%, #0d1117 100%)", 
          position: "relative", 
          overflow: "hidden", 
        }}> 
        {/* Animated background orbs */} 
        <div style={{ 
          position: "absolute", top: "10%", left: "5%", width: "300px", height: "300px", 
          background: "radial-gradient(circle, rgba(124,58,237,0.3) 0%, transparent 70%)", 
          borderRadius: "50%", filter: "blur(40px)", animation: "pulse 4s ease-in-out infinite", 
          pointerEvents: "none", 
        }} /> 
        <div style={{ 
          position: "absolute", top: "50%", right: "5%", width: "250px", height: "250px", 
          background: "radial-gradient(circle, rgba(168,85,247,0.25) 0%, transparent 70%)", 
          borderRadius: "50%", filter: "blur(50px)", animation: "pulse 6s ease-in-out infinite reverse", 
          pointerEvents: "none", 
        }} /> 
        <div style={{ 
          position: "absolute", bottom: "10%", left: "20%", width: "200px", height: "200px", 
          background: "radial-gradient(circle, rgba(245,158,11,0.15) 0%, transparent 70%)", 
          borderRadius: "50%", filter: "blur(40px)", animation: "pulse 5s ease-in-out infinite", 
          pointerEvents: "none", 
        }} /> 

        {/* Stars */} 
        {Array.from({length: 60}).map((_, i) => ( 
          <div key={i} style={{ 
            position: "absolute", 
            width: i % 3 === 0 ? "3px" : "2px", 
            height: i % 3 === 0 ? "3px" : "2px", 
            background: i % 5 === 0 ? "#f59e0b" : "#ffffff", 
            borderRadius: "50%", 
            top: `${Math.sin(i * 137.5) * 50 + 50}%`, 
            left: `${Math.cos(i * 137.5) * 50 + 50}%`, 
            opacity: 0.4 + (i % 4) * 0.15, 
            animation: `twinkle ${2 + (i % 3)}s ease-in-out infinite`, 
            animationDelay: `${(i % 10) * 0.3}s`, 
            pointerEvents: "none", 
          }} /> 
        ))} 

        <h1 className="text-4xl font-black text-yellow-400 mb-2" style={{ position: "relative", zIndex: 10 }}>Daily Spin</h1> 
        <p className="text-gray-400 mb-8" style={{ position: "relative", zIndex: 10 }}>Test your luck and win daily prizes!</p> 

        {/* Pointer */} 
        <div className="w-0 h-0 mb-[-10px] z-10" 
          style={{ borderLeft: "12px solid transparent", borderRight: "12px solid transparent", 
            borderTop: "24px solid #f59e0b", position: "relative" }} /> 

        {/* Wheel */} 
        <div style={{ 
          position: "relative", zIndex: 10, 
          filter: "drop-shadow(0 0 30px rgba(124,58,237,0.6)) drop-shadow(0 0 60px rgba(245,158,11,0.3))", 
        }}> 
          <canvas 
            ref={canvasRef} 
            width={380} 
            height={380} 
            className="cursor-pointer rounded-full" 
            onClick={handleSpin} 
          /> 
        </div> 

        {/* Result */} 
        {result && ( 
          <div className="mt-6 text-2xl font-bold text-yellow-400 animate-bounce" style={{ position: "relative", zIndex: 10 }}> 
            🎉 You won: {result}! 
          </div> 
        )} 

        {/* Button / Cooldown */} 
        <div className="mt-6" style={{ position: "relative", zIndex: 10 }}> 
          {loading ? ( 
            <div className="text-gray-400">Loading...</div> 
          ) : canSpin ? ( 
            <button 
              onClick={handleSpin} 
              disabled={spinning} 
              className="px-10 py-4 rounded-2xl font-black text-xl text-black" 
              style={{ background: spinning ? "#6b7280" : "#f59e0b" }}> 
              {spinning ? "Spinning..." : "SPIN NOW"} 
            </button> 
          ) : ( 
            <div className="text-center p-6 rounded-2xl" 
              style={{ background: "#1e1b4b", border: "1px solid #7c3aed" }}> 
              <p className="text-gray-300 text-lg font-bold">NEXT SPIN IN</p> 
              <p className="text-yellow-400 text-3xl font-black mt-1">{nextSpinTime}</p> 
            </div> 
          )} 
        </div> 
      </div> 
    </PageShell> 
  ); 
} 
