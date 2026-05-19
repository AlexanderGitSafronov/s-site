import type { Metadata } from "next";
import { GeistSans } from "geist/font/sans";
import Link from "next/link";
import { HeaderNav } from "@/components/header-nav";
import "./globals.css";

export const metadata: Metadata = {
  title: "HyperFrames Hub",
  description: "Каталог HTML5-игр, собранных на HyperFrames — превью и игра в браузере",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru" className={GeistSans.className}>
      <body className="min-h-screen antialiased">
        <header className="sticky top-0 z-50 backdrop-blur-xl bg-black/40 border-b border-white/5">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between gap-3">
            <Link href="/" className="flex items-center gap-2 group min-w-0">
              <div className="w-8 h-8 shrink-0 rounded-lg bg-gradient-to-br from-violet-500 to-indigo-500 flex items-center justify-center shadow-lg shadow-violet-500/30">
                <svg viewBox="0 0 24 24" fill="white" className="w-5 h-5">
                  <path d="M21 6h-7.59l3.29-3.29L16 2l-4 4-4-4-.71.71L10.59 6H3c-1.1 0-2 .89-2 2v12c0 1.1.9 2 2 2h18c1.1 0 2-.9 2-2V8c0-1.11-.9-2-2-2zm0 14H3V8h18v12zM9 10v8l7-4z" />
                </svg>
              </div>
              <span className="text-base sm:text-lg font-semibold tracking-tight truncate group-hover:text-violet-300 transition">
                HyperFrames Hub
              </span>
            </Link>
            <HeaderNav />
          </div>
        </header>
        <main className="max-w-7xl mx-auto px-6 py-10">{children}</main>
      </body>
    </html>
  );
}
