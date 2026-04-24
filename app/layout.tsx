import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { createClient } from "@/lib/supabase-server";
import Link from "next/link";
import NavClient from "./NavClient";

const geist = Geist({ subsets: ["latin"], variable: "--font-geist-sans" });
const geistMono = Geist_Mono({ subsets: ["latin"], variable: "--font-geist-mono" });

export const metadata: Metadata = {
  title: "Shelfworth",
  description: "Track every book you own — from subscription box exclusives to signed editions. See what your collection is worth.",
  openGraph: {
    title: "Shelfworth",
    description: "The modern companion for book collectors. Organize your library, track special edition values, and discover what collectors are buying.",
    siteName: "Shelfworth",
    type: "website",
    images: [{ url: "/og-default.png", width: 1200, height: 630, alt: "Shelfworth" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Shelfworth",
    description: "Track every book you own — from subscription box exclusives to signed editions.",
    images: ["/og-default.png"],
  },
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  return (
    <html lang="en" className={`${geist.variable} ${geistMono.variable} h-full dark`} suppressHydrationWarning>
      <head>
        <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200" rel="stylesheet" />
        <style>{`.material-symbols-outlined { font-variation-settings: 'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24; }`}</style>
      </head>
      <body className="min-h-full bg-[#0e131f] text-gray-100 font-sans antialiased">
        <header className="bg-slate-950/70 backdrop-blur-md sticky top-0 z-50 border-b border-slate-800/50">
          <nav className="flex justify-between items-center w-full px-6 py-4 max-w-7xl mx-auto">
            <Link href="/" className="text-xl font-bold tracking-tighter text-white">
              Shelfworth
            </Link>
            <NavClient isLoggedIn={!!user} />
          </nav>
        </header>
        <main className="flex-1">{children}</main>
        <footer className="bg-slate-950 border-t border-slate-800/50 py-12 mt-16">
          <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row justify-between gap-10">
            <div>
              <div className="text-lg font-black tracking-tighter text-slate-300 mb-3">Shelfworth</div>
              <p className="text-sm text-slate-500 max-w-xs leading-relaxed">For every reader, every shelf, and every story. Track your books with care.</p>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-8 text-sm">
              <div className="flex flex-col gap-3">
                <span className="text-white font-semibold">Platform</span>
                <Link href="/browse" className="text-slate-500 hover:text-violet-300 transition-colors">Browse</Link>
                <Link href="/shelves" className="text-slate-500 hover:text-violet-300 transition-colors">My Shelves</Link>
                <Link href="/collection" className="text-slate-500 hover:text-violet-300 transition-colors">Collection Value</Link>
              </div>
              <div className="flex flex-col gap-3">
                <span className="text-white font-semibold">Account</span>
                <Link href="/auth/signup" className="text-slate-500 hover:text-violet-300 transition-colors">Sign Up</Link>
                <Link href="/auth/login" className="text-slate-500 hover:text-violet-300 transition-colors">Sign In</Link>
                <Link href="/upgrade" className="text-slate-500 hover:text-violet-300 transition-colors">Pro</Link>
              </div>
              <div className="flex flex-col gap-3">
                <span className="text-white font-semibold">More</span>
                <Link href="/submit" className="text-slate-500 hover:text-violet-300 transition-colors">Submit Edition</Link>
              </div>
            </div>
          </div>
          <div className="max-w-7xl mx-auto px-6 mt-10 pt-6 border-t border-slate-800/50">
            <p className="text-xs text-slate-600">© 2025 Shelfworth. All rights reserved.</p>
          </div>
        </footer>
      </body>
    </html>
  );
}
