import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";

const geist = Geist({ subsets: ["latin"], variable: "--font-geist-sans" });

export const metadata: Metadata = {
  title: "Special Edition Book Tracker",
  description: "Track subscription box exclusives and special edition books",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${geist.variable} h-full`}>
      <body className="min-h-full bg-gray-950 text-gray-100 font-sans antialiased">
        <header className="border-b border-gray-800 px-6 py-4 flex items-center justify-between">
          <a href="/" className="text-xl font-bold tracking-tight text-white">
            📚 Edition Tracker
          </a>
          <nav className="flex gap-6 text-sm text-gray-400">
            <a href="/browse" className="hover:text-white transition-colors">Browse</a>
          </nav>
        </header>
        <main className="flex-1">{children}</main>
      </body>
    </html>
  );
}
