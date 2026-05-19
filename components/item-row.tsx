"use client";

import { useEffect, useRef, useState } from "react";
import { upload } from "@vercel/blob/client";
import type { Item } from "@/lib/db";
import { formatBytes } from "@/lib/format";

export function ItemRow({ item }: { item: Item }) {
  const [deleting, setDeleting] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [videoOpen, setVideoOpen] = useState(false);
  const [playOpen, setPlayOpen] = useState(false);
  const [playMode, setPlayMode] = useState<"pc" | "mobile">("pc");
  const [busyLabel, setBusyLabel] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const zipInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    function onDocClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
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

  useEffect(() => {
    if (!videoOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setVideoOpen(false);
    }
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      document.removeEventListener("keydown", onKey);
    };
  }, [videoOpen]);

  useEffect(() => {
    if (!playOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setPlayOpen(false);
    }
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      document.removeEventListener("keydown", onKey);
    };
  }, [playOpen]);

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

  async function handleReplaceVideo(file: File) {
    setMenuOpen(false);
    setBusyLabel("Замена видео…");
    try {
      const blob = await upload(file.name, file, {
        access: "public",
        handleUploadUrl: "/api/upload",
      });
      const res = await fetch(`/api/items/${item.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          video_url: blob.url,
          video_filename: file.name,
          video_size: file.size,
          video_content_type: file.type || "video/mp4",
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `${res.status}`);
      }
      window.location.reload();
    } catch (e) {
      alert("Ошибка замены видео: " + (e as Error).message);
      setBusyLabel(null);
    }
  }

  async function handleReplaceZip(file: File) {
    setMenuOpen(false);
    setBusyLabel("Замена архива…");
    try {
      const blob = await upload(file.name, file, {
        access: "public",
        handleUploadUrl: "/api/upload",
      });
      setBusyLabel("Распаковка…");
      const extractRes = await fetch("/api/extract", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ zipUrl: blob.url }),
      });
      if (!extractRes.ok) {
        const err = await extractRes.json().catch(() => ({}));
        throw new Error(err.error || `extract failed: ${extractRes.status}`);
      }
      const { playUrl, playPrefix } = (await extractRes.json()) as {
        playUrl: string;
        playPrefix: string;
      };
      setBusyLabel("Сохранение…");
      const res = await fetch(`/api/items/${item.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          site_url: blob.url,
          site_filename: file.name,
          site_size: file.size,
          play_url: playUrl,
          play_prefix: playPrefix,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `${res.status}`);
      }
      window.location.reload();
    } catch (e) {
      alert("Ошибка замены архива: " + (e as Error).message);
      setBusyLabel(null);
    }
  }

  return (
    <>
      <div
        className={`card flex flex-col md:flex-row gap-4 p-4 hover:bg-white/[0.04] transition relative ${
          menuOpen ? "z-30" : "z-0"
        }`}
      >
        {/* Thumbnail */}
        <button
          type="button"
          onClick={() => setVideoOpen(true)}
          className="group/thumb relative shrink-0 w-full md:w-56 aspect-video rounded-xl overflow-hidden bg-black"
          aria-label="Открыть видео-превью"
        >
          {item.image_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={item.image_url}
              alt={item.title}
              loading="lazy"
              decoding="async"
              className="w-full h-full object-cover transition-transform duration-500 group-hover/thumb:scale-[1.04]"
            />
          ) : (
            <video
              src={item.video_url + "#t=2"}
              preload="metadata"
              muted
              playsInline
              className="w-full h-full object-cover transition-transform duration-500 group-hover/thumb:scale-[1.04]"
            />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />
          <div className="absolute inset-0 flex items-center justify-center opacity-90 group-hover/thumb:opacity-100 transition">
            <div className="w-12 h-12 rounded-full bg-white/95 backdrop-blur flex items-center justify-center shadow-xl shadow-violet-500/20 group-hover/thumb:scale-110 transition-transform">
              <svg viewBox="0 0 24 24" fill="black" className="w-5 h-5 ml-0.5" aria-hidden>
                <path d="M8 5v14l11-7z" />
              </svg>
            </div>
          </div>
        </button>

        {/* Body */}
        <div className="flex-1 min-w-0 flex flex-col gap-2">
          <div>
            <h2 className="font-semibold text-lg leading-snug tracking-tight">{item.title}</h2>
            {item.author && (
              <div className="text-xs text-violet-300/80 mt-1 flex items-center gap-1.5">
                <svg viewBox="0 0 24 24" fill="currentColor" className="w-3.5 h-3.5" aria-hidden>
                  <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
                </svg>
                {item.author}
              </div>
            )}
            {item.description && (
              <p className="text-sm text-neutral-400 mt-1 line-clamp-2 whitespace-pre-line">
                {item.description}
              </p>
            )}
          </div>
          <div className="flex items-center gap-3 text-[11px] text-neutral-500 uppercase tracking-wide mt-auto">
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
        </div>

        {/* Actions */}
        <div className="flex flex-row md:flex-col gap-2 md:w-48 shrink-0 flex-wrap">
          {item.play_url && (
            <button
              type="button"
              onClick={() => setPlayOpen(true)}
              className="btn-primary flex-1 md:flex-none"
            >
              <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4" aria-hidden>
                <path d="M8 5v14l11-7z" />
              </svg>
              Играть
            </button>
          )}
          <button
            type="button"
            onClick={() => setVideoOpen(true)}
            className="btn-secondary flex-1 md:flex-none"
          >
            <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4" aria-hidden>
              <path d="M17 10.5V7c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c.55 0 1-.45 1-1v-3.5l4 4v-11l-4 4z" />
            </svg>
            Видео
          </button>
          <a
            href={item.site_url}
            download={item.site_filename}
            className="btn-secondary flex-1 md:flex-none"
          >
            <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4" aria-hidden>
              <path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z" />
            </svg>
            Архив
          </a>
        </div>

        {/* Action menu */}
        <div ref={menuRef} className="relative shrink-0 self-start">
          <button
            type="button"
            onClick={() => setMenuOpen((v) => !v)}
            className="w-9 h-9 rounded-lg flex items-center justify-center text-neutral-500 hover:text-white hover:bg-white/5 transition"
            aria-haspopup="menu"
            aria-expanded={menuOpen}
            aria-label="Действия"
          >
            <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4" aria-hidden>
              <path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z" />
            </svg>
          </button>
          {menuOpen && (
            <div
              role="menu"
              className="absolute right-0 top-full mt-1 bg-neutral-900 border border-white/10 rounded-lg shadow-2xl p-1 min-w-[220px] z-50"
            >
              <button
                type="button"
                onClick={() => videoInputRef.current?.click()}
                disabled={!!busyLabel}
                className="w-full text-left px-3 py-2 text-sm text-neutral-300 hover:bg-white/5 rounded-md disabled:opacity-50 flex items-center gap-2"
                role="menuitem"
              >
                <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4" aria-hidden>
                  <path d="M17 10.5V7c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c.55 0 1-.45 1-1v-3.5l4 4v-11l-4 4z" />
                </svg>
                Заменить видео
              </button>
              <button
                type="button"
                onClick={() => zipInputRef.current?.click()}
                disabled={!!busyLabel}
                className="w-full text-left px-3 py-2 text-sm text-neutral-300 hover:bg-white/5 rounded-md disabled:opacity-50 flex items-center gap-2"
                role="menuitem"
              >
                <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4" aria-hidden>
                  <path d="M20 6h-8l-2-2H4c-1.11 0-1.99.89-1.99 2L2 18c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V8c0-1.11-.89-2-2-2z" />
                </svg>
                Заменить архив игры
              </button>
              <div className="h-px bg-white/5 my-1" />
              <a
                href={item.video_url}
                download={item.video_filename}
                className="w-full text-left px-3 py-2 text-sm text-neutral-300 hover:bg-white/5 rounded-md flex items-center gap-2"
                role="menuitem"
              >
                <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4" aria-hidden>
                  <path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z" />
                </svg>
                Скачать видео
              </a>
              <div className="h-px bg-white/5 my-1" />
              <button
                type="button"
                onClick={handleDelete}
                disabled={deleting || !!busyLabel}
                className="w-full text-left px-3 py-2 text-sm text-red-400 hover:bg-red-500/10 rounded-md disabled:opacity-50 flex items-center gap-2"
                role="menuitem"
              >
                <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4" aria-hidden>
                  <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z" />
                </svg>
                {deleting ? "Удаление…" : "Удалить"}
              </button>
            </div>
          )}
        </div>

        <input
          ref={videoInputRef}
          type="file"
          accept="video/*"
          className="sr-only"
          onChange={(e) => {
            const f = e.target.files?.[0];
            e.target.value = "";
            if (f) handleReplaceVideo(f);
          }}
        />
        <input
          ref={zipInputRef}
          type="file"
          accept=".zip,application/zip,application/x-zip-compressed"
          className="sr-only"
          onChange={(e) => {
            const f = e.target.files?.[0];
            e.target.value = "";
            if (f) handleReplaceZip(f);
          }}
        />
      </div>

      {busyLabel && (
        <div className="fixed inset-0 z-[110] bg-black/70 backdrop-blur-sm flex items-center justify-center">
          <div className="card px-6 py-5 flex items-center gap-3">
            <span className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
            <span className="text-sm">{busyLabel}</span>
          </div>
        </div>
      )}

      {videoOpen && (
        <div
          className="fixed inset-0 z-[100] bg-black/85 backdrop-blur-sm flex items-center justify-center p-4 sm:p-8"
          onClick={() => setVideoOpen(false)}
        >
          <div
            className="relative w-full max-w-5xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-white font-medium truncate pr-4">{item.title}</h3>
              <button
                type="button"
                onClick={() => setVideoOpen(false)}
                className="w-9 h-9 rounded-lg bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition shrink-0"
                aria-label="Закрыть"
              >
                <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5" aria-hidden>
                  <path d="M19 6.41 17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
                </svg>
              </button>
            </div>
            <video
              src={item.video_url}
              poster={item.image_url ?? undefined}
              controls
              autoPlay
              preload="metadata"
              className="w-full max-h-[80vh] rounded-xl bg-black object-contain shadow-2xl"
            />
          </div>
        </div>
      )}

      {playOpen && item.play_url && (
        <div className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-sm flex flex-col">
          <div className="flex items-center justify-between gap-3 p-3 sm:p-4 border-b border-white/10">
            <h3 className="text-white font-medium truncate min-w-0">{item.title}</h3>
            <div className="flex items-center gap-2 shrink-0">
              <div className="bg-white/5 border border-white/10 rounded-lg p-1 flex">
                <button
                  type="button"
                  onClick={() => setPlayMode("pc")}
                  className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1 rounded-md text-xs sm:text-sm font-medium transition ${
                    playMode === "pc"
                      ? "bg-gradient-to-r from-violet-500 to-indigo-500 text-white shadow"
                      : "text-neutral-400 hover:text-white"
                  }`}
                  aria-pressed={playMode === "pc"}
                >
                  <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4" aria-hidden>
                    <path d="M20 18c1.1 0 1.99-.9 1.99-2L22 6c0-1.1-.9-2-2-2H4c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2H0v2h24v-2h-4zM4 6h16v10H4V6z" />
                  </svg>
                  ПК
                </button>
                <button
                  type="button"
                  onClick={() => setPlayMode("mobile")}
                  className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1 rounded-md text-xs sm:text-sm font-medium transition ${
                    playMode === "mobile"
                      ? "bg-gradient-to-r from-violet-500 to-indigo-500 text-white shadow"
                      : "text-neutral-400 hover:text-white"
                  }`}
                  aria-pressed={playMode === "mobile"}
                >
                  <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4" aria-hidden>
                    <path d="M17 1H7c-1.1 0-2 .9-2 2v18c0 1.1.9 2 2 2h10c1.1 0 2-.9 2-2V3c0-1.1-.9-2-2-2zm0 18H7V5h10v14z" />
                  </svg>
                  Моб
                </button>
              </div>
              <a
                href={item.play_url}
                target="_blank"
                rel="noopener noreferrer"
                className="hidden sm:flex w-9 h-9 rounded-lg bg-white/10 hover:bg-white/20 text-white items-center justify-center transition"
                title="Открыть в новой вкладке"
                aria-label="Открыть в новой вкладке"
              >
                <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4" aria-hidden>
                  <path d="M19 19H5V5h7V3H5c-1.11 0-2 .9-2 2v14c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2v-7h-2v7zM14 3v2h3.59l-9.83 9.83 1.41 1.41L19 6.41V10h2V3h-7z" />
                </svg>
              </a>
              <button
                type="button"
                onClick={() => setPlayOpen(false)}
                className="w-9 h-9 rounded-lg bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition"
                aria-label="Закрыть"
              >
                <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5" aria-hidden>
                  <path d="M19 6.41 17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
                </svg>
              </button>
            </div>
          </div>
          <div className="flex-1 min-h-0 flex items-center justify-center p-2 sm:p-4 overflow-auto">
            {playMode === "pc" ? (
              <iframe
                key="pc"
                src={item.play_url}
                title={item.title}
                allow="autoplay; fullscreen; gamepad; accelerometer; gyroscope"
                className="w-full h-full rounded-xl bg-white shadow-2xl"
              />
            ) : (
              <div className="rounded-[2rem] border-[6px] border-neutral-800 bg-neutral-900 shadow-2xl p-1 max-h-full">
                <iframe
                  key="mobile"
                  src={item.play_url}
                  title={item.title}
                  allow="autoplay; fullscreen; gamepad; accelerometer; gyroscope"
                  className="block rounded-[1.5rem] bg-white"
                  style={{
                    width: "min(390px, calc(100vw - 32px))",
                    height: "min(844px, calc(100vh - 120px))",
                  }}
                />
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
