import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";
import { createClient } from "@/lib/supabase-server";
import Link from "next/link";
import NavClient from "./NavClient";
import ThemeProvider from "./components/ThemeProvider";
import ThemeToggle from "./components/ThemeToggle";

const geist = Geist({ subsets: ["latin"], variable: "--font-geist-sans" });

export const metadata: Metadata = {
  title: "Edition Tracker",
  description: "Track every book you own — from subscription box exclusives to signed editions.",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  return (
    <html lang="en" className={`${geist.variable} h-full`} suppressHydrationWarning>
      <body className="min-h-full bg-gray-950 text-gray-100 font-sans antialiased">
        <ThemeProvider>
          <header className="border-b border-gray-800 px-6 py-4 flex items-center justify-between">
            <Link href="/" className="text-xl font-bold tracking-tight text-white">
              📚 Edition Tracker
            </Link>
            <div className="flex items-center gap-2">
              <ThemeToggle />
              <NavClient isLoggedIn={!!user} />
            </div>
          </header>
          <main className="flex-1">{children}</main>
        </ThemeProvider>
      </body>
    </html>
  );
}
