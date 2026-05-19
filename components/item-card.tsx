"use client";

import { useEffect, useRef, useState } from "react";
import type { Item } from "@/lib/db";
import { formatBytes } from "@/lib/format";

export function ItemCard({ item }: { item: Item }) {
  const [deleting, setDeleting] = useState(false);
  const [showVideo, setShowVideo] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    function onDocClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setMenuOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [menuOpen]);

  async function handleDelete() {
    if (!confirm(`Удалить "${item.title}"? Все файлы будут стёрты.`)) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/items/${item.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error(`${res.status}`);
      window.location.reload();
    } catch (e) {
      alert("Ошибка удаления: " + (e as Error).message);
      setDeleting(false);
    }
  }

  return (
    <div className="card group">
      <div className="relative aspect-video bg-black overflow-hidden">
        {showVideo ? (
          <video
            src={item.video_url}
            poster={item.image_url ?? undefined}
            controls
            autoPlay
            preload="metadata"
            className="w-full h-full object-cover"
          />
        ) : (
          <button
            type="button"
            onClick={() => setShowVideo(true)}
            className="block w-full h-full relative"
            aria-label="Воспроизвести превью"
          >
            {item.image_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={item.image_url}
                alt={item.title}
                loading="lazy"
                decoding="async"
                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-neutral-800 to-neutral-900" />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
            <div className="absolute inset-0 flex items-center justify-center opacity-90 group-hover:opacity-100 transition">
              <div className="w-16 h-16 rounded-full bg-white/95 backdrop-blur flex items-center justify-center shadow-2xl shadow-violet-500/20 group-hover:scale-110 transition-transform">
                <svg viewBox="0 0 24 24" fill="black" className="w-7 h-7 ml-1" aria-hidden>
                  <path d="M8 5v14l11-7z" />
                </svg>
              </div>
            </div>
          </button>
        )}
      </div>

      <div className="p-5 flex flex-col gap-4">
        <div>
          <h2 className="font-semibold text-lg leading-snug tracking-tight">{item.title}</h2>
          {item.description && (
            <p className="text-sm text-neutral-400 mt-1.5 line-clamp-2 whitespace-pre-line">
              {item.description}
            </p>
          )}
        </div>

        <div className="flex items-center gap-2 text-[11px] text-neutral-500 uppercase tracking-wide">
          <span className="flex items-center gap-1">
            <svg viewBox="0 0 24 24" fill="currentColor" className="w-3.5 h-3.5" aria-hidden>
              <path d="M20 6h-8l-2-2H4c-1.11 0-1.99.89-1.99 2L2 18c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V8c0-1.11-.89-2-2-2z" />
            </svg>
            {formatBytes(item.site_size)}
          </span>
          <span className="text-neutral-700">•</span>
          <span className="flex items-center gap-1">
            <svg viewBox="0 0 24 24" fill="currentColor" className="w-3.5 h-3.5" aria-hidden>
              <path d="M17 10.5V7c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c.55 0 1-.45 1-1v-3.5l4 4v-11l-4 4z" />
            </svg>
            {formatBytes(item.video_size)}
          </span>
        </div>

        <div className="flex flex-col gap-2">
          {item.play_url && (
            <a
              href={item.play_url}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-primary w-full"
            >
              <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4" aria-hidden>
                <path d="M8 5v14l11-7z" />
              </svg>
              Играть
            </a>
          )}
          <div className="flex gap-2">
            <a
              href={item.site_url}
              download={item.site_filename}
              className="btn-secondary flex-1"
            >
              <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4" aria-hidden>
                <path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z" />
              </svg>
              Архив
            </a>
            <a
              href={item.video_url}
              download={item.video_filename}
              className="btn-secondary flex-1"
            >
              <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4" aria-hidden>
                <path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z" />
              </svg>
              Видео
            </a>
          </div>
        </div>

        <div ref={menuRef} className="relative pt-2 border-t border-white/5">
          <button
            type="button"
            onClick={() => setMenuOpen((v) => !v)}
            className="text-xs text-neutral-500 hover:text-white transition flex items-center gap-1"
            aria-haspopup="menu"
            aria-expanded={menuOpen}
          >
            <svg viewBox="0 0 24 24" fill="currentColor" className="w-3.5 h-3.5" aria-hidden>
              <path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z" />
            </svg>
            Действия
          </button>
          {menuOpen && (
            <div
              role="menu"
              className="absolute left-0 bottom-full mb-2 bg-neutral-900 border border-white/10 rounded-lg shadow-xl p-1 min-w-[160px] z-10"
            >
              <button
                type="button"
                onClick={handleDelete}
                disabled={deleting}
                className="w-full text-left px-3 py-2 text-sm text-red-400 hover:bg-red-500/10 rounded-md disabled:opacity-50"
                role="menuitem"
              >
                {deleting ? "Удаление…" : "Удалить"}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
