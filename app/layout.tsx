import type { Metadata } from "next";
import { GeistSans } from "geist/font/sans";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "s-site — каталог игр и сайтов",
  description: "Каталог HTML5-игр и сайтов с превью и возможностью играть в браузере",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru" className={GeistSans.className}>
      <body className="min-h-screen antialiased">
        <header className="sticky top-0 z-50 backdrop-blur-xl bg-black/40 border-b border-white/5">
          <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
            <Link href="/" className="flex items-center gap-2 group">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-indigo-500 flex items-center justify-center shadow-lg shadow-violet-500/30">
                <svg viewBox="0 0 24 24" fill="white" className="w-5 h-5">
                  <path d="M21 6h-7.59l3.29-3.29L16 2l-4 4-4-4-.71.71L10.59 6H3c-1.1 0-2 .89-2 2v12c0 1.1.9 2 2 2h18c1.1 0 2-.9 2-2V8c0-1.11-.9-2-2-2zm0 14H3V8h18v12zM9 10v8l7-4z" />
                </svg>
              </div>
              <span className="text-lg font-semibold tracking-tight group-hover:text-violet-300 transition">
                s-site
              </span>
            </Link>
            <nav className="flex items-center gap-2">
              <Link href="/" className="btn-ghost">Каталог</Link>
              <Link href="/upload" className="btn-primary">
                <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
                  <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z" />
                </svg>
                Добавить
              </Link>
            </nav>
          </div>
        </header>
        <main className="max-w-7xl mx-auto px-6 py-10">{children}</main>
      </body>
    </html>
  );
}
