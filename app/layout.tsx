import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "s-site — каталог сайтов",
  description: "Хранилище сайтов с видео-превью",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru">
      <body className="min-h-screen">
        <header className="border-b border-neutral-800 bg-neutral-950">
          <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
            <Link href="/" className="text-lg font-semibold tracking-tight">
              s-site
            </Link>
            <nav className="flex gap-4 text-sm">
              <Link href="/" className="hover:text-white text-neutral-300">Каталог</Link>
              <Link
                href="/upload"
                className="bg-white text-black px-3 py-1.5 rounded-md font-medium hover:bg-neutral-200"
              >
                Загрузить
              </Link>
            </nav>
          </div>
        </header>
        <main className="max-w-6xl mx-auto px-6 py-8">{children}</main>
      </body>
    </html>
  );
}
