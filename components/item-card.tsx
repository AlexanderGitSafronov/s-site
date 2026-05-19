"use client";

import { useState } from "react";
import type { Item } from "@/lib/db";

function formatBytes(bytes: number) {
  if (!bytes) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${units[i]}`;
}

export function ItemCard({ item }: { item: Item }) {
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    if (!confirm(`Удалить "${item.title}"? Файлы тоже будут стёрты.`)) return;
    setDeleting(true);
    const res = await fetch(`/api/items/${item.id}`, { method: "DELETE" });
    if (res.ok) {
      window.location.reload();
    } else {
      alert("Ошибка удаления");
      setDeleting(false);
    }
  }

  return (
    <div className="bg-neutral-900 border border-neutral-800 rounded-lg overflow-hidden flex flex-col">
      <video
        src={item.video_url}
        controls
        preload="metadata"
        className="w-full aspect-video bg-black object-cover"
      />
      <div className="p-4 flex-1 flex flex-col gap-3">
        <div>
          <h2 className="font-semibold text-lg leading-tight">{item.title}</h2>
          {item.description && (
            <p className="text-sm text-neutral-400 mt-1 line-clamp-3">{item.description}</p>
          )}
        </div>
        <div className="text-xs text-neutral-500 flex justify-between mt-auto">
          <span>Сайт: {formatBytes(item.site_size)}</span>
          <span>Видео: {formatBytes(item.video_size)}</span>
        </div>
        <div className="flex gap-2">
          <a
            href={item.site_url}
            download={item.site_filename}
            className="flex-1 text-center bg-white text-black px-3 py-2 rounded-md text-sm font-medium hover:bg-neutral-200"
          >
            Скачать сайт
          </a>
          <a
            href={item.video_url}
            download={item.video_filename}
            className="flex-1 text-center bg-neutral-800 text-white px-3 py-2 rounded-md text-sm font-medium hover:bg-neutral-700"
          >
            Скачать видео
          </a>
        </div>
        <button
          onClick={handleDelete}
          disabled={deleting}
          className="text-xs text-neutral-500 hover:text-red-400 disabled:opacity-50"
        >
          {deleting ? "Удаление…" : "Удалить"}
        </button>
      </div>
    </div>
  );
}
