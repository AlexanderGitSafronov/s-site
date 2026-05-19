"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { upload } from "@vercel/blob/client";

export default function UploadPage() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [siteFile, setSiteFile] = useState<File | null>(null);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [status, setStatus] = useState<string>("");
  const [progress, setProgress] = useState<{ site: number; video: number }>({ site: 0, video: 0 });
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title || !siteFile || !videoFile) {
      alert("Заполните название, выберите архив сайта и видео.");
      return;
    }
    setBusy(true);
    setStatus("Загрузка архива сайта…");
    try {
      const siteBlob = await upload(siteFile.name, siteFile, {
        access: "public",
        handleUploadUrl: "/api/upload",
        onUploadProgress: (e) => setProgress((p) => ({ ...p, site: e.percentage })),
      });

      setStatus("Загрузка видео…");
      const videoBlob = await upload(videoFile.name, videoFile, {
        access: "public",
        handleUploadUrl: "/api/upload",
        onUploadProgress: (e) => setProgress((p) => ({ ...p, video: e.percentage })),
      });

      setStatus("Сохранение записи…");
      const res = await fetch("/api/items", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          description,
          site_url: siteBlob.url,
          site_filename: siteFile.name,
          site_size: siteFile.size,
          video_url: videoBlob.url,
          video_filename: videoFile.name,
          video_size: videoFile.size,
          video_content_type: videoFile.type || "video/mp4",
        }),
      });
      if (!res.ok) throw new Error(`save failed: ${res.status}`);
      router.push("/");
    } catch (err) {
      console.error(err);
      alert("Ошибка загрузки: " + (err as Error).message);
      setBusy(false);
    }
  }

  return (
    <div className="max-w-xl mx-auto">
      <h1 className="text-2xl font-semibold mb-6">Новая запись</h1>
      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label className="block text-sm mb-1 text-neutral-300">Название *</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            disabled={busy}
            required
            className="w-full bg-neutral-900 border border-neutral-800 rounded-md px-3 py-2 focus:outline-none focus:border-neutral-500"
          />
        </div>
        <div>
          <label className="block text-sm mb-1 text-neutral-300">Описание</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            disabled={busy}
            rows={3}
            className="w-full bg-neutral-900 border border-neutral-800 rounded-md px-3 py-2 focus:outline-none focus:border-neutral-500"
          />
        </div>
        <div>
          <label className="block text-sm mb-1 text-neutral-300">Архив сайта (.zip) *</label>
          <input
            type="file"
            accept=".zip,application/zip,application/x-zip-compressed"
            onChange={(e) => setSiteFile(e.target.files?.[0] ?? null)}
            disabled={busy}
            required
            className="block w-full text-sm text-neutral-400 file:mr-3 file:py-2 file:px-3 file:rounded-md file:border-0 file:bg-neutral-800 file:text-white hover:file:bg-neutral-700"
          />
          {busy && siteFile && (
            <ProgressBar percent={progress.site} label="Сайт" />
          )}
        </div>
        <div>
          <label className="block text-sm mb-1 text-neutral-300">Видео-превью *</label>
          <input
            type="file"
            accept="video/*"
            onChange={(e) => setVideoFile(e.target.files?.[0] ?? null)}
            disabled={busy}
            required
            className="block w-full text-sm text-neutral-400 file:mr-3 file:py-2 file:px-3 file:rounded-md file:border-0 file:bg-neutral-800 file:text-white hover:file:bg-neutral-700"
          />
          {busy && videoFile && (
            <ProgressBar percent={progress.video} label="Видео" />
          )}
        </div>
        <button
          type="submit"
          disabled={busy}
          className="w-full bg-white text-black px-4 py-2.5 rounded-md font-medium hover:bg-neutral-200 disabled:opacity-60"
        >
          {busy ? status || "Загрузка…" : "Загрузить"}
        </button>
      </form>
    </div>
  );
}

function ProgressBar({ percent, label }: { percent: number; label: string }) {
  return (
    <div className="mt-2">
      <div className="flex justify-between text-xs text-neutral-500 mb-1">
        <span>{label}</span>
        <span>{Math.round(percent)}%</span>
      </div>
      <div className="h-1.5 bg-neutral-800 rounded-full overflow-hidden">
        <div className="h-full bg-white transition-all" style={{ width: `${percent}%` }} />
      </div>
    </div>
  );
}
