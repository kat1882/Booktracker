import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";
import { createClient } from "@/lib/supabase-server";
import Link from "next/link";

const geist = Geist({ subsets: ["latin"], variable: "--font-geist-sans" });

export const metadata: Metadata = {
  title: "Edition Tracker",
  description: "Track every book you own — from subscription box exclusives to signed editions.",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  return (
    <html lang="en" className={`${geist.variable} h-full`}>
      <body className="min-h-full bg-gray-950 text-gray-100 font-sans antialiased">
        <header className="border-b border-gray-800 px-6 py-4 flex items-center justify-between">
          <Link href="/" className="text-xl font-bold tracking-tight text-white">
            📚 Edition Tracker
          </Link>
          <nav className="flex gap-5 items-center text-sm text-gray-400">
            <Link href="/search" className="hover:text-white transition-colors">Search</Link>
            <Link href="/browse" className="hover:text-white transition-colors">Browse</Link>
            <Link href="/trending" className="hover:text-white transition-colors">Trending</Link>
            <Link href="/marketplace" className="hover:text-white transition-colors">Marketplace</Link>
            <Link href="/submit" className="hover:text-white transition-colors">Submit</Link>
            {user ? (
              <>
                <Link href="/shelves" className="hover:text-white transition-colors">My Shelves</Link>
                <Link href="/wishlist" className="hover:text-white transition-colors">Wish List</Link>
                <form action="/auth/signout" method="POST">
                  <button className="hover:text-white transition-colors">Sign out</button>
                </form>
              </>
            ) : (
              <>
                <Link href="/auth/login" className="hover:text-white transition-colors">Sign in</Link>
                <Link href="/auth/signup" className="bg-violet-600 hover:bg-violet-500 text-white px-3 py-1.5 rounded-lg transition-colors">
                  Sign up
                </Link>
              </>
            )}
          </nav>
        </header>
        <main className="flex-1">{children}</main>
      </body>
    </html>
  );
}
