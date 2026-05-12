"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";

const subjects = [
  { name: "Maths", icon: "🔢", gradient: "from-blue-600 to-indigo-800", slug: "maths" },
  { name: "English", icon: "📝", gradient: "from-purple-600 to-pink-800", slug: "english" },
  { name: "Physics", icon: "⚡", gradient: "from-cyan-600 to-blue-800", slug: "physics" },
  { name: "Chemistry", icon: "🧪", gradient: "from-orange-600 to-red-800", slug: "chemistry" },
  { name: "Biology", icon: "🧬", gradient: "from-green-600 to-emerald-800", slug: "biology" },
  { name: "Government", icon: "⚖️", gradient: "from-amber-600 to-yellow-800", slug: "government" },
  { name: "Economics", icon: "📊", gradient: "from-teal-600 to-cyan-800", slug: "economics" },
  { name: "Agricultural Science", icon: "🌱", gradient: "from-lime-600 to-green-800", slug: "agricultural-science" },
];

export default function PracticePage() {
  return (
    <div className="min-h-screen bg-[#0a0a12] text-white">
      <div className="max-w-5xl mx-auto px-4 py-16">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-black text-white mb-2">Practice Mode</h1>
          <p className="text-zinc-400 text-lg">JAMB &bull; WAEC &bull; NECO &mdash; all in one place</p>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {subjects.map((s) => (
            <Link
              key={s.slug}
              href={`/practice/${s.slug}`}
              className={`bg-gradient-to-br ${s.gradient} rounded-2xl p-6 cursor-pointer hover:scale-105 transition-transform duration-200 relative overflow-hidden`}
              style={{ backgroundImage: `repeating-linear-gradient(45deg, rgba(255,255,255,0.03) 0px, rgba(255,255,255,0.03) 1px, transparent 1px, transparent 10px)` }}
            >
              <div className="text-4xl">{s.icon}</div>
              <div className="text-white font-extrabold text-lg mt-3">{s.name}</div>
              <div className="text-xs bg-white/20 text-white px-2 py-1 rounded-full mt-2 inline-block">10 Qs</div>
              <div className="text-white/80 text-sm mt-2 font-semibold">Start &rarr;</div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}