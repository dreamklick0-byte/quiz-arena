"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";

export default function LandingPage() {
  const [particles, setParticles] = useState<any[]>([]);

  useEffect(() => {
    const newParticles = Array.from({ length: 20 }).map((_, i) => ({
      id: i,
      size: Math.random() * 2 + 2, // 2-4px
      left: Math.random() * 100, // 0-100%
      delay: Math.random() * 10, // 0-10s
      duration: Math.random() * 12 + 8, // 8-20s
      color: i % 2 === 0 ? "#7c3aed" : "#f59e0b",
      opacity: Math.random() * 0.5 + 0.3, // 0.3-0.8
    }));
    setParticles(newParticles);
  }, []);

  const features = [
    { title: "Live Battle Arena", icon: "⚔️", desc: "Challenge real students in real-time. Stake money. Winner takes all.", color: "border-purple-500/30 bg-purple-500/5" },
    { title: "Daily Spin & Win", icon: "🎡", desc: "Spin every 24 hours. Win up to N110 cash daily.", color: "border-amber-500/30 bg-amber-500/5" },
    { title: "Practice Mode", icon: "📚", desc: "10,000+ JAMB WAEC NECO questions. Instant feedback.", color: "border-blue-500/30 bg-blue-500/5" },
    { title: "Referral Rewards", icon: "💰", desc: "Earn 5% on friends first deposit. 0.5% on every deposit after.", color: "border-emerald-500/30 bg-emerald-500/5" },
    { title: "League System", icon: "🏅", desc: "Climb Bronze to Platinum leagues. Bigger leagues, bigger prizes.", color: "border-pink-500/30 bg-pink-500/5" },
    { title: "Leaderboard Glory", icon: "🥇", desc: "Top 10 students get monthly cash bonuses.", color: "border-cyan-500/30 bg-cyan-500/5" },
    { title: "Wallet System", icon: "💳", desc: "Deposit via Paystack. Withdraw anytime.", color: "border-green-500/30 bg-green-500/5" },
    { title: "Players Online", icon: "🟢", desc: "See who is live. Send battle challenges instantly.", color: "border-violet-500/30 bg-violet-500/5" },
  ];

  const subjects = [
    { name: "Maths", icon: "🔢", from: "from-blue-600", to: "to-indigo-800" },
    { name: "English", icon: "📝", from: "from-purple-600", to: "to-pink-800" },
    { name: "Physics", icon: "⚡", from: "from-cyan-600", to: "to-blue-800" },
    { name: "Chemistry", icon: "🧪", from: "from-orange-600", to: "to-red-800" },
    { name: "Biology", icon: "🧬", from: "from-green-600", to: "to-emerald-800" },
    { name: "Government", icon: "⚖️", from: "from-amber-600", to: "to-yellow-800" },
    { name: "Economics", icon: "📊", from: "from-teal-600", to: "to-cyan-800" },
    { name: "Agricultural Science", icon: "🌱", from: "from-lime-600", to: "to-green-800" },
  ];

  const tickerItems = [
    "Ahmed just won N500",
    "23 battles live now",
    "Fatima won N110 on the wheel",
    "1,204 practice sessions today",
    "Kola earned N250 referral bonus",
    "Top player: 47 wins this week",
    "Physics battle starting in 30s",
    "New record: 98% in Chemistry",
  ];

  const testimonials = [
    { initials: "CA", colors: "from-purple-500 to-pink-500", quote: "I have won over N3,000 in battles this month. Best study motivation ever!", name: "Chukwuemeka A.", role: "SS3 Student Lagos" },
    { initials: "AM", colors: "from-amber-500 to-orange-500", quote: "My JAMB score jumped from 180 to 267 after 3 months on this platform.", name: "Aisha M.", role: "University Aspirant Kano" },
    { initials: "BO", colors: "from-emerald-500 to-teal-500", quote: "I referred 12 friends and now earn passive income every week from referrals.", name: "Biodun O.", role: "Graduate Ibadan" },
  ];

  return (
    <div className="min-h-screen bg-[#050508] text-white font-sans">
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes floatUp { 
          0% { transform: translateY(0) scale(1); } 
          100% { transform: translateY(-100vh) scale(0.5); opacity: 0; } 
        } 
        @keyframes scrollTicker { 
          0% { transform: translateX(0); } 
          100% { transform: translateX(-50%); } 
        } 
      `}} />

      {/* SECTION 1 — HERO */}
      <section className="min-h-screen relative overflow-hidden">
        <div 
          className="absolute inset-0 z-0"
          style={{
            background: "radial-gradient(ellipse at center, #1e0a3c 0%, #050508 100%)"
          }}
        />
        <div 
          className="absolute inset-0 z-0 opacity-20"
          style={{
            backgroundImage: `
              linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px),
              linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)
            `,
            backgroundSize: "40px 40px"
          }}
        />
        <div 
          className="absolute inset-0 z-0"
          style={{
            background: "radial-gradient(ellipse at center, rgba(124,58,237,0.2) 0%, transparent 60%)"
          }}
        />

        {/* Animated Particles */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          {particles.map((p) => (
            <div
              key={p.id}
              className="absolute"
              style={{
                width: `${p.size}px`,
                height: `${p.size}px`,
                borderRadius: "50%",
                left: `${p.left}%`,
                bottom: "-10px",
                backgroundColor: p.color,
                opacity: p.opacity,
                animation: `floatUp ${p.duration}s linear ${p.delay}s infinite`
              }}
            />
          ))}
        </div>

        <div className="absolute inset-0 flex flex-col items-center justify-center text-center z-10 px-4">
          <div className="border border-purple-500/30 bg-purple-500/10 backdrop-blur rounded-full px-4 py-2 text-purple-300 text-sm font-semibold mb-6">
            Nigeria's #1 Academic Quiz Platform
          </div>
          
          <h1 className="text-white text-6xl md:text-8xl font-black block leading-none">
            Study Smart.
          </h1>
          <h1 
            className="text-6xl md:text-8xl font-black block leading-none"
            style={{
              background: "linear-gradient(135deg,#7c3aed,#f59e0b)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent"
            }}
          >
            Compete Live.
          </h1>
          <h1 className="text-[#f59e0b] text-6xl md:text-8xl font-black block leading-none">
            Win Big.
          </h1>

          <p className="text-zinc-300 text-lg max-w-2xl mx-auto mt-4 mb-10">
            Join 50,000+ students mastering JAMB, WAEC and NECO through live battles, daily challenges, and real cash prizes.
          </p>

          <div className="flex gap-4 justify-center flex-wrap">
            <Link 
              href="/auth" 
              className="bg-[#7c3aed] hover:bg-[#6d28d9] text-white font-bold px-8 py-4 rounded-2xl text-lg transition-colors"
            >
              Start Competing Free
            </Link>
            <Link 
              href="/practice" 
              className="border border-white/20 bg-white/5 text-white font-bold px-8 py-4 rounded-2xl text-lg hover:bg-white/10 transition-colors"
            >
              Explore Subjects
            </Link>
          </div>

          <div className="flex justify-center gap-8 mt-12 flex-wrap">
            <div className="text-center">
              <div className="text-[#f59e0b] font-black text-3xl">50,000+</div>
              <div className="text-zinc-400 text-sm">Active Students</div>
            </div>
            <div className="text-center">
              <div className="text-[#f59e0b] font-black text-3xl">10,000+</div>
              <div className="text-zinc-400 text-sm">Questions</div>
            </div>
            <div className="text-center">
              <div className="text-[#f59e0b] font-black text-3xl">2M+</div>
              <div className="text-zinc-400 text-sm">Prizes Won</div>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 2 — FEATURES SCROLL */}
      <section className="bg-[#0a0a12] py-20 overflow-hidden">
        <h2 className="text-white text-4xl font-black text-center mb-2">Everything You Need to Win</h2>
        <p className="text-zinc-400 text-center mb-12">One platform. Infinite possibilities.</p>
        
        <div className="overflow-hidden">
          <div 
            className="flex w-fit" 
            style={{ animation: "scrollTicker 30s linear infinite" }}
          >
            {[...features, ...features].map((feature, i) => (
              <div 
                key={i} 
                className={`w-72 shrink-0 mx-3 rounded-2xl p-6 border ${feature.color}`}
              >
                <div className="text-4xl mb-4">{feature.icon}</div>
                <h3 className="text-white font-bold text-xl mb-2">{feature.title}</h3>
                <p className="text-zinc-400 text-sm">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* SECTION 3 — HOW IT WORKS */}
      <section className="bg-gradient-to-b from-[#0a0a12] to-[#0f0520] py-24">
        <h2 className="text-white text-4xl font-black text-center mb-2">How It Works</h2>
        <p className="text-zinc-400 text-center mb-16">Get started in under 2 minutes</p>
        
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 max-w-5xl mx-auto px-4">
          {[
            { step: "1", title: "Create Account", desc: "Sign up free in 30 seconds. No credit card needed." },
            { step: "2", title: "Add to Wallet", desc: "Deposit from N100 via Paystack. Secure and instant." },
            { step: "3", title: "Join a Battle", desc: "Pick a subject, stake your amount, find an opponent." },
            { step: "4", title: "Win and Withdraw", desc: "Winner gets the pot. Withdraw to your bank anytime." }
          ].map((item, i) => (
            <div key={i} className="text-center">
              <div 
                className="w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center font-black text-2xl text-white"
                style={{ background: "linear-gradient(135deg,#7c3aed,#f59e0b)" }}
              >
                {item.step}
              </div>
              <h3 className="text-white font-bold text-xl mb-2">{item.title}</h3>
              <p className="text-zinc-400 text-sm leading-relaxed">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* SECTION 4 — SUBJECTS */}
      <section className="bg-[#0a0a12] py-20">
        <h2 className="text-white text-4xl font-black text-center mb-2">Master Every Subject</h2>
        <p className="text-zinc-400 text-center mb-12">JAMB - WAEC - NECO all in one place</p>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-5xl mx-auto px-4">
          {subjects.map((subject, i) => (
            <Link 
              key={i} 
              href="/practice"
              className={`bg-gradient-to-br ${subject.from} ${subject.to} rounded-2xl p-6 cursor-pointer hover:scale-105 transition-transform duration-200 relative overflow-hidden`}
            >
              <div 
                className="absolute inset-0 pointer-events-none"
                style={{
                  backgroundImage: "repeating-linear-gradient(45deg, rgba(255,255,255,0.03) 0px, rgba(255,255,255,0.03) 1px, transparent 1px, transparent 10px)"
                }}
              />
              <div className="text-4xl mb-3 relative z-10">{subject.icon}</div>
              <div className="flex items-center justify-between relative z-10">
                <h3 className="text-white font-extrabold text-lg">{subject.name}</h3>
                <span className="bg-white/20 text-white text-xs px-2 py-1 rounded-full">10 Qs</span>
              </div>
              <div className="text-white/80 text-sm mt-2 relative z-10">Start</div>
            </Link>
          ))}
        </div>
      </section>

      {/* SECTION 5 — LIVE TICKER */}
      <section className="bg-[#7c3aed] py-4 overflow-hidden">
        <div 
          className="flex w-fit items-center"
          style={{ animation: "scrollTicker 20s linear infinite" }}
        >
          {[...tickerItems, ...tickerItems].map((item, i) => (
            <React.Fragment key={i}>
              <span className="text-white font-semibold text-sm whitespace-nowrap">{item}</span>
              <span className="mx-6 text-white/40 text-lg">◆</span>
            </React.Fragment>
          ))}
        </div>
      </section>

      {/* SECTION 6 — TESTIMONIALS */}
      <section className="bg-[#050508] py-24">
        <h2 className="text-white text-4xl font-black text-center mb-12">Students Love Quiz Arena</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto px-4">
          {testimonials.map((t, i) => (
            <div key={i} className="rounded-2xl bg-white/5 border border-white/10 p-6">
              <div className="text-[#f59e0b] text-lg mb-4">{"★".repeat(5)}</div>
              <p className="text-zinc-300 text-sm leading-relaxed mb-6 italic">"{t.quote}"</p>
              <div className="flex items-center gap-4">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-black text-sm bg-gradient-to-br ${t.colors}`}>
                  {t.initials}
                </div>
                <div>
                  <div className="text-white font-bold text-sm">{t.name}</div>
                  <div className="text-zinc-500 text-xs">{t.role}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* SECTION 7 — CTA */}
      <section 
        className="py-24 text-center px-4"
        style={{ background: "radial-gradient(ellipse at center, #1e0a3c 0%, #050508 100%)" }}
      >
        <h2 className="text-white text-5xl font-black mb-4">Ready to Start Winning?</h2>
        <p className="text-zinc-400 text-lg mb-10">Join 50,000+ students already competing. Your first spin is free.</p>
        <div className="flex gap-4 justify-center flex-wrap">
          <Link 
            href="/auth" 
            className="bg-[#f59e0b] text-black font-black px-10 py-4 rounded-2xl text-lg hover:bg-[#e6950a] transition-colors"
          >
            Create Free Account
          </Link>
          <Link 
            href="/practice" 
            className="border border-white/20 text-white font-bold px-10 py-4 rounded-2xl text-lg hover:bg-white/5 transition-colors"
          >
            Explore Subjects
          </Link>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="bg-[#030305] border-t border-white/5 py-10 px-4">
        <div className="max-w-5xl mx-auto">
          <div className="flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="text-white font-black text-xl">QUIZ ARENA</div>
            <div className="flex gap-6">
              {["Home", "Practice", "Battle", "Leaderboard", "Spin"].map((link) => (
                <Link 
                  key={link} 
                  href={link === "Home" ? "/" : `/${link.toLowerCase()}`} 
                  className="text-zinc-500 hover:text-white text-sm transition-colors"
                >
                  {link}
                </Link>
              ))}
            </div>
          </div>
          <div className="text-zinc-600 text-xs text-center mt-6">
            © 2026 Quiz Arena. Study Smart. Compete Live. Win Big.
          </div>
        </div>
      </footer>
    </div>
  );
}
