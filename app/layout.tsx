import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { SiteHeader } from "@/app/components/SiteHeader";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://quiz-arena.vercel.app"),
  title: "Quiz Arena — Study Smart • Compete Live • Win Big",
  description:
    "Competitive real-time multiplayer quiz platform. Practice JAMB, WAEC, NECO subjects and win prizes in live leagues.",
  keywords: ["quiz", "competition", "JAMB", "WAEC", "NECO", "study", "prizes", "multiplayer"],
  authors: [{ name: "Quiz Arena Team" }],
  openGraph: {
    title: "Quiz Arena — Study Smart • Compete Live • Win Big",
    description: "Practice subjects and compete in live prize leagues. Join the arena now!",
    url: "https://quiz-arena.vercel.app",
    siteName: "Quiz Arena",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Quiz Arena Preview",
      },
    ],
    locale: "en_NG",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Quiz Arena — Study Smart • Compete Live • Win Big",
    description: "Practice subjects and compete in live prize leagues. Join the arena now!",
    images: ["/og-image.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col bg-[#0f0f1a] text-zinc-100">
        <SiteHeader />
        {children}
      </body>
    </html>
  );
}
