"use client";
import Link from "next/link";

const subjects = [
  { name: "Maths", icon: "🔢", gradient: "from-blue-600 to-indigo-800", slug: "maths", image: "https://images.unsplash.com/photo-1635070041078-e363dbe005cb?w=400&q=80" },
  { name: "English", icon: "📝", gradient: "from-purple-600 to-pink-800", slug: "english", image: "https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?w=400&q=80" },
  { name: "Physics", icon: "⚡", gradient: "from-cyan-600 to-blue-800", slug: "physics", image: "https://images.unsplash.com/photo-1636466497217-26a8cbeaf0aa?w=400&q=80" },
  { name: "Chemistry", icon: "🧪", gradient: "from-orange-600 to-red-800", slug: "chemistry", image: "https://images.unsplash.com/photo-1532187863486-abf9dbad1b69?w=400&q=80" },
  { name: "Biology", icon: "🧬", gradient: "from-green-600 to-emerald-800", slug: "biology", image: "https://images.unsplash.com/photo-1530026405186-ed1f139313f3?w=400&q=80" },
  { name: "Government", icon: "⚖️", gradient: "from-amber-600 to-yellow-800", slug: "government", image: "https://images.unsplash.com/photo-1529107386315-e1a2ed48a620?w=400&q=80" },
  { name: "Economics", icon: "📊", gradient: "from-teal-600 to-cyan-800", slug: "economics", image: "https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=400&q=80" },
  { name: "Agricultural Science", icon: "🌱", gradient: "from-lime-600 to-green-800", slug: "agricultural-science", image: "https://images.unsplash.com/photo-1500937386664-56d1dfef3854?w=400&q=80" },
];

export default function PracticePage() {
  return (
    <div
      className="min-h-screen text-white relative"
      style={{
        backgroundImage: "url(https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?w=1920&q=80)",
        backgroundSize: "cover",
        backgroundAttachment: "fixed",
        backgroundPosition: "center"
      }}
    >
      <div className="fixed inset-0 bg-[#0a0a12]/92 pointer-events-none z-0" />

      <div className="relative z-10">
        <div
          className="relative min-h-[320px] flex items-center justify-center overflow-hidden"
        >
          <img
            src="https://images.unsplash.com/photo-1434030216411-0b793f4b4173?w=1920&q=80"
            className="absolute inset-0 w-full h-full object-cover"
            alt=""
          />
          <div className="absolute inset-0 bg-gradient-to-b from-[#0a0a12]/60 via-[#1e0a3c]/70 to-[#0a0a12]" />
          <div className="relative z-10 text-center px-4">
            <div className="bg-blue-500/20 border border-blue-500/30 text-blue-300 rounded-full px-4 py-2 text-sm font-semibold inline-block">
              📚 10,000+ Questions
            </div>
            <h1
              className="text-white text-5xl font-black mt-4"
              style={{ textShadow: "0 0 40px rgba(99,102,241,0.5)" }}
            >
              Choose Your Subject
            </h1>
            <p className="text-zinc-300 text-lg mt-3">
              JAMB • WAEC • NECO — Practice makes perfect. Start now.
            </p>
          </div>
        </div>

        <div className="max-w-5xl mx-auto px-4 py-16">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {subjects.map((s) => (
              <Link
                key={s.slug}
                href={`/practice/${s.slug}`}
                className={`bg-gradient-to-br ${s.gradient} rounded-2xl p-6 cursor-pointer hover:scale-105 transition-transform duration-200 relative overflow-hidden`}
              >
                <img
                  src={s.image}
                  className="absolute inset-0 w-full h-full object-cover opacity-20"
                  alt=""
                />
                <div className="absolute inset-0 bg-gradient-to-br from-black/40 to-black/20" />
                <div className="relative z-10">
                  <div className="text-4xl">{s.icon}</div>
                  <div className="text-white font-extrabold text-lg mt-3">{s.name}</div>
                  <div className="text-xs bg-white/20 text-white px-2 py-1 rounded-full mt-2 inline-block">10 Qs</div>
                  <div className="text-white/80 text-sm mt-2 font-semibold">Start →</div>
                </div>
              </Link>
            ))}
          </div>
        </div>

        <div
          className="py-16 text-center relative overflow-hidden"
          style={{ background: "linear-gradient(135deg, #1e0a3c, #2d1565)" }}
        >
          <img
            src="https://images.unsplash.com/photo-1542751371-adc38448a05e?w=1920&q=80"
            className="absolute inset-0 w-full h-full object-cover"
            alt=""
          />
          <div className="absolute inset-0 bg-[#0f0520]/75" />
          <div className="relative z-10 px-4">
            <h2
              className="text-white text-4xl font-black"
              style={{ textShadow: "0 0 30px rgba(124,58,237,0.6)" }}
            >
              Ready to Battle?
            </h2>
            <p className="text-zinc-300 text-lg mt-3 mb-8">
              Put your knowledge to the test. Challenge real students. Win real cash.
            </p>
            <Link
              href="/battle"
              className="bg-gradient-to-r from-[#7c3aed] to-[#f59e0b] text-white font-black text-xl px-12 py-5 rounded-2xl inline-block hover:scale-105 transition-transform duration-200"
              style={{ boxShadow: "0 0 40px rgba(124,58,237,0.5)" }}
            >
              Enter Battle Mode ⚔️
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
