"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

export function HeaderNav() {
  const pathname = usePathname();
  const router = useRouter();
  const isAuthPage = pathname === "/login";

  if (isAuthPage) return null;

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.replace("/login");
    router.refresh();
  }

  return (
    <nav className="flex items-center gap-2">
      <Link href="/" className="btn-ghost">Каталог</Link>
      <Link href="/upload" className="btn-primary">
        <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
          <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z" />
        </svg>
        Добавить
      </Link>
      <button
        onClick={handleLogout}
        className="btn-ghost"
        title="Выйти"
        aria-label="Выйти"
      >
        <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
          <path d="M17 7l-1.41 1.41L18.17 11H8v2h10.17l-2.58 2.58L17 17l5-5zM4 5h8V3H4c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h8v-2H4V5z" />
        </svg>
      </button>
    </nav>
  );
}
