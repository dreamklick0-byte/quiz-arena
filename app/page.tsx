"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";

export default function LandingPage() {
  const [particles, setParticles] = useState<any[]>([]);
  const [currentSlide, setCurrentSlide] = useState(0);

  const slides = [
    { url: "https://images.unsplash.com/photo-1613896527026-f195d5c818ed?w=800&q=80", badge: "📚 Study Mode" },
    { url: "https://images.unsplash.com/photo-1596495578065-6e0763fa1178?w=800&q=80", badge: "✍️ Exam Ready" },
    { url: "https://images.unsplash.com/photo-1580582932707-520aed937b7b?w=800&q=80", badge: "🏫 Live Classes" },
    { url: "https://images.unsplash.com/photo-1571260899304-425eee4c7efc?w=800&q=80", badge: "🏆 Champions" },
    { url: "https://images.unsplash.com/photo-1488521787991-ed7bbaae773c?w=800&q=80", badge: "🥇 Win Prizes" },
  ];

  useEffect(() => {
    const newParticles = Array.from({ length: 20 }).map((_, i) => ({
      id: i,
      size: Math.random() * 2 + 2,
      left: Math.random() * 100,
      bottom: "-10px",
      delay: Math.random() * 10,
      duration: Math.random() * 12 + 8,
      color: i % 2 === 0 ? "#7c3aed" : "#f59e0b",
      opacity: Math.random() * 0.5 + 0.3,
    }));
    setParticles(newParticles);
  }, []);

  useEffect(() => {
    const timer = setInterval(() => setCurrentSlide(prev => (prev + 1) % 5), 3000);
    return () => clearInterval(timer);
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
   { name:"Maths", icon:"🔢", gradient:"from-blue-600 to-indigo-800", slug:"maths", img:"https://images.unsplash.com/photo-1635070041078-e363dbe005cb?w=400&q=80" }, 
   { name:"English", icon:"📝", gradient:"from-purple-600 to-pink-800", slug:"english", img:"https://images.unsplash.com/photo-1455390582262-044cdead277a?w=400&q=80" }, 
   { name:"Physics", icon:"⚡", gradient:"from-cyan-600 to-blue-800", slug:"physics", img:"https://images.unsplash.com/photo-1636466497217-26a8cbeaf0aa?w=400&q=80" }, 
   { name:"Chemistry", icon:"🧪", gradient:"from-orange-600 to-red-800", slug:"chemistry", img:"https://images.unsplash.com/photo-1532187863486-abf9dbad1b69?w=400&q=80" }, 
   { name:"Biology", icon:"🧬", gradient:"from-green-600 to-emerald-800", slug:"biology", img:"https://images.unsplash.com/photo-1530026405186-ed1f139313f3?w=400&q=80" }, 
   { name:"Government", icon:"⚖️", gradient:"from-amber-600 to-yellow-800", slug:"government", img:"https://images.unsplash.com/photo-1529107386315-e1a2ed48a620?w=400&q=80" }, 
   { name:"Economics", icon:"📊", gradient:"from-teal-600 to-cyan-800", slug:"economics", img:"https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=400&q=80" }, 
   { name:"Agricultural Science", icon:"🌱", gradient:"from-lime-600 to-green-800", slug:"agricultural-science", img:"https://images.unsplash.com/photo-1500937386664-56d1dfef3854?w=400&q=80" }, 
   { name:"Current Affairs", icon:"🌍", gradient:"from-rose-600 to-red-800", slug:"current-affairs", img:"https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=400&q=80" }, 
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
        <img
          src="https://images.unsplash.com/photo-1613896527026-f195d5c818ed?w=1920&q=80"
          className="absolute inset-0 w-full h-full object-cover"
          style={{ opacity: 0.08, mixBlendMode: "overlay" }}
          alt=""
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

        <div className="absolute inset-0 flex items-center justify-center px-6 md:px-16 z-10">
          <div className="flex flex-col md:flex-row items-center gap-8 w-full max-w-7xl mx-auto">
            {/* LEFT COLUMN */}
            <div className="flex-1 text-center md:text-left">
              <div className="border border-purple-500/30 bg-purple-500/10 backdrop-blur rounded-full px-4 py-2 text-purple-300 text-sm font-semibold mb-6 inline-block">
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

              <p className="text-zinc-300 text-lg max-w-2xl mx-auto md:mx-0 mt-4 mb-10">
                Join 50,000+ students mastering JAMB, WAEC and NECO through live battles, daily challenges, and real cash prizes.
              </p>

              <div className="flex gap-4 justify-center md:justify-start flex-wrap">
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

              <div className="flex justify-center md:justify-start gap-8 mt-12 flex-wrap">
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

            {/* RIGHT COLUMN — SLIDESHOW */}
            <div className="flex-1 hidden md:flex items-center justify-center">
              <div className="relative w-full max-w-md mx-auto rounded-3xl overflow-hidden"
                style={{ aspectRatio:"4/3", boxShadow:"0 0 40px rgba(124,58,237,0.4),0 0 80px rgba(124,58,237,0.15)", border:"2px solid rgba(124,58,237,0.3)" }}> 
                {slides.map((slide, i) => ( 
                  <img key={i} src={slide.url} alt="" 
                    className="absolute inset-0 w-full h-full object-cover transition-opacity duration-700" 
                    style={{ opacity: i === currentSlide ? 1 : 0 }} /> 
                ))} 
                <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" /> 
                <div className="absolute top-4 right-4 bg-black/60 backdrop-blur-sm border border-white/20 rounded-full px-3 py-1 text-white text-xs font-bold"> 
                  {slides[currentSlide].badge} 
                </div> 
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2"> 
                  {slides.map((_, i) => ( 
                    <button key={i} onClick={() => setCurrentSlide(i)} 
                      className="rounded-full transition-all duration-300" 
                      style={{ width: i === currentSlide ? "24px" : "8px", height:"8px", backgroundColor: i === currentSlide ? "white" : "rgba(255,255,255,0.4)" }} /> 
                  ))} 
                </div> 
              </div> 
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 2 — FEATURES SCROLL */}
      <section className="relative overflow-hidden py-20">
        <img
          src="https://images.unsplash.com/photo-1518770660439-4636190af475?w=1920&q=80"
          alt=""
          className="absolute inset-0 w-full h-full object-cover"
          style={{ opacity: 0.12 }}
        />
        <div className="absolute inset-0" style={{ background: "rgba(10,10,18,0.88)" }} />
        <div className="relative z-10">
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
        </div>
      </section>

      {/* SECTION 3 — HOW IT WORKS */}
      <section className="relative overflow-hidden py-24">
        <img
          src="https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=1920&q=80"
          alt=""
          className="absolute inset-0 w-full h-full object-cover"
          style={{ opacity: 0.25 }}
        />
        <div className="absolute inset-0" style={{ background: "rgba(15,5,32,0.72)" }} />
        <div className="relative z-10">
          <h2 className="text-white text-4xl font-black text-center mb-2">How It Works</h2>
          <p className="text-zinc-400 text-center mb-16">Get started in under 2 minutes</p>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 max-w-5xl mx-auto px-4">
            {[
              { step: "1", title: "Create Account", desc: "Sign up free in 30 seconds. No credit card needed." },
              { step: "2", title: "Add to Wallet", desc: "Deposit from N100 via Paystack. Secure and instant." },
              { step: "3", title: "Join a Battle", desc: "Pick a subject, stake your amount, find an opponent." },
              { step: "4", title: "Win and Withdraw", desc: "Winner gets the pot. Withdraw to your bank anytime." }
            ].map((item, i) => (
              <div
                key={i}
                className="text-center bg-white/8 backdrop-blur-sm border border-white/15 rounded-2xl p-6"
                style={{ boxShadow: "0 4px 24px rgba(124,58,237,0.15)" }}
              >
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
        </div>
      </section>

      {/* SECTION 4 — SUBJECTS */}
      <section className="relative overflow-hidden py-20">
        <img
          src="https://images.unsplash.com/photo-1497633762265-9d179a990aa6?w=1920&q=80"
          alt=""
          className="absolute inset-0 w-full h-full object-cover"
          style={{ opacity: 0.20 }}
        />
        <div className="absolute inset-0" style={{ background: "rgba(8,8,15,0.82)" }} />
        <div className="relative z-10">
          <h2 className="text-white text-4xl font-black text-center mb-2">Master Every Subject</h2>
          <p className="text-zinc-400 text-center mb-12">JAMB - WAEC - NECO all in one place</p>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 max-w-7xl mx-auto px-4">
            {subjects.map((s) => (
              <Link key={s.slug} href="/practice" 
                className="relative rounded-2xl overflow-hidden cursor-pointer hover:scale-105 transition-transform duration-200 block" 
                style={{ minHeight:"160px" }}> 
                <img src={s.img} alt={s.name} className="absolute inset-0 w-full h-full object-cover" style={{ opacity:0.35 }} /> 
                <div className={`absolute inset-0 bg-gradient-to-br ${s.gradient}`} style={{ opacity:0.80 }} /> 
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" /> 
                <div className="relative z-10 p-5"> 
                  <div className="text-4xl">{s.icon}</div> 
                  <div className="text-white font-extrabold text-lg mt-3" style={{ textShadow:"0 2px 8px rgba(0,0,0,0.8)" }}>{s.name}</div> 
                  <div className="text-xs bg-white/20 text-white px-2 py-1 rounded-full mt-2 inline-block">10 Qs</div> 
                  <div className="text-white/90 text-sm mt-2 font-semibold">Start →</div> 
                </div> 
              </Link>
            ))}
          </div>
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
      <section className="relative overflow-hidden py-24">
        <img
          src="https://images.unsplash.com/photo-1529390079861-591de354faf5?w=1920&q=80"
          alt=""
          className="absolute inset-0 w-full h-full object-cover"
          style={{ opacity: 0.18 }}
        />
        <div className="absolute inset-0" style={{ background: "rgba(5,5,8,0.88)" }} />
        <div className="relative z-10">
          <h2 className="text-white text-4xl font-black text-center mb-12">Students Love Quiz Arena</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto px-4">
            {testimonials.map((t, i) => (
              <div
                key={i}
                className="rounded-2xl bg-white/8 backdrop-blur-md border border-white/15 p-6"
                style={{ boxShadow: "0 4px 32px rgba(0,0,0,0.3)" }}
              >
                <div className="text-[#f59e0b] text-lg mb-4">{"★".repeat(5)}</div>
                <p className="text-zinc-200 text-sm leading-relaxed mb-6 italic">"{t.quote}"</p>
                <div className="flex items-center gap-4">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-black text-sm bg-gradient-to-br ${t.colors}`}>
                    {t.initials}
                  </div>
                  <div>
                    <div className="text-white font-bold text-sm">{t.name}</div>
                    <div className="text-zinc-400 text-xs">{t.role}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* SECTION 7 — CTA */}
      <section className="relative overflow-hidden py-24 text-center px-4">
        <img src="https://images.unsplash.com/photo-1567427017947-545c5f8d16ad?w=1920&q=80" 
          className="absolute inset-0 w-full h-full object-cover" style={{ opacity:0.20 }} />
        <div
          className="absolute inset-0"
          style={{ background: "radial-gradient(ellipse at center, rgba(30,10,60,0.85) 0%, rgba(5,5,8,0.92) 70%)" }}
        />

        <div className="relative z-10">
          <h2
            className="text-white text-5xl font-black mb-4"
            style={{ textShadow:"0 0 60px rgba(124,58,237,0.5), 0 2px 8px rgba(0,0,0,0.8)" }}
          >
            Ready to Start Winning?
          </h2>
          <p className="text-zinc-400 text-lg mb-10">Join 50,000+ students already competing. Your first spin is free.</p>
          <div className="flex gap-4 justify-center flex-wrap">
            <Link
              href="/auth"
              className="bg-[#f59e0b] text-black font-black px-10 py-4 rounded-2xl text-lg hover:bg-[#e6950a] transition-colors"
              style={{ boxShadow:"0 0 30px rgba(245,158,11,0.5)" }}
            >
              Create Free Account
            </Link>
            <Link
              href="/practice"
              className="border border-white/20 bg-white/5 text-white font-bold px-10 py-4 rounded-2xl text-lg hover:bg-white/5 transition-colors"
            >
              Explore Subjects
            </Link>
          </div>
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
