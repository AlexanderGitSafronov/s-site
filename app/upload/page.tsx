"use client";

import { useEffect, useState } from "react";
import { upload } from "@vercel/blob/client";

type Progress = { site: number; video: number };

const ALLOWED_VIDEO = "video/mp4,video/webm,video/quicktime,video/x-matroska";
const ALLOWED_ZIP = ".zip,application/zip,application/x-zip-compressed";
const AUTHOR_KEY = "hf:author";

export default function UploadPage() {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [author, setAuthor] = useState("");
  const [siteFile, setSiteFile] = useState<File | null>(null);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [status, setStatus] = useState<string>("");
  const [progress, setProgress] = useState<Progress>({ site: 0, video: 0 });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(AUTHOR_KEY);
      if (saved) setAuthor(saved);
    } catch {}
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!title.trim() || !siteFile || !videoFile) {
      setError("Заполните название и выберите архив с игрой и видео.");
      return;
    }
    setBusy(true);
    try {
      setStatus("Загрузка архива…");
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

      setStatus("Распаковка игры…");
      const extractRes = await fetch("/api/extract", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ zipUrl: siteBlob.url }),
      });
      if (!extractRes.ok) {
        const err = await extractRes.json().catch(() => ({}));
        throw new Error(err.error || `extract failed: ${extractRes.status}`);
      }
      const { playUrl, playPrefix } = (await extractRes.json()) as {
        playUrl: string;
        playPrefix: string;
      };

      setStatus("Сохранение…");
      const trimmedAuthor = author.trim();
      try {
        if (trimmedAuthor) localStorage.setItem(AUTHOR_KEY, trimmedAuthor);
      } catch {}
      const res = await fetch("/api/items", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim() || null,
          author: trimmedAuthor || null,
          site_url: siteBlob.url,
          site_filename: siteFile.name,
          site_size: siteFile.size,
          video_url: videoBlob.url,
          video_filename: videoFile.name,
          video_size: videoFile.size,
          video_content_type: videoFile.type || "video/mp4",
          play_url: playUrl,
          play_prefix: playPrefix,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `save failed: ${res.status}`);
      }
      window.location.replace("/");
    } catch (err) {
      console.error(err);
      setError((err as Error).message);
      setBusy(false);
    }
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-semibold tracking-tight">Новая игра</h1>
        <p className="text-sm text-neutral-400 mt-1.5">
          Архив распакуется автоматически, и появится кнопка «Играть».
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6" noValidate>
        <div className="card p-6 space-y-5">
          <div>
            <label className="block text-sm font-medium mb-2 text-neutral-200">Название</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              disabled={busy}
              maxLength={200}
              required
              placeholder="Моя игра"
              className="input"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2 text-neutral-200">
              Описание <span className="text-neutral-500 font-normal">— необязательно</span>
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={busy}
              maxLength={5000}
              rows={3}
              placeholder="Жанр, управление, краткое описание…"
              className="input resize-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2 text-neutral-200">
              Автор <span className="text-neutral-500 font-normal">— ваш ник в Telegram, запомнится в браузере</span>
            </label>
            <input
              type="text"
              value={author}
              onChange={(e) => setAuthor(e.target.value)}
              disabled={busy}
              maxLength={100}
              placeholder="@username"
              className="input"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FileSlot
            label="Видео-превью"
            hint="MP4/WebM"
            accept={ALLOWED_VIDEO}
            file={videoFile}
            onChange={setVideoFile}
            disabled={busy}
            percent={progress.video}
            showProgress={busy}
            kind="video"
          />
          <FileSlot
            label="Архив игры"
            hint=".zip с index.html"
            accept={ALLOWED_ZIP}
            file={siteFile}
            onChange={setSiteFile}
            disabled={busy}
            percent={progress.site}
            showProgress={busy}
            kind="zip"
          />
        </div>

        {error && (
          <div className="text-sm text-red-300 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3">
            {error}
          </div>
        )}

        <button type="submit" disabled={busy} className="btn-primary w-full text-base py-3.5">
          {busy ? (
            <>
              <span className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
              {status || "Загрузка…"}
            </>
          ) : (
            <>
              <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5" aria-hidden>
                <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
              </svg>
              Опубликовать
            </>
          )}
        </button>
      </form>
    </div>
  );
}

function FileSlot({
  label,
  hint,
  accept,
  file,
  onChange,
  disabled,
  percent,
  showProgress,
  kind,
}: {
  label: string;
  hint: string;
  accept: string;
  file: File | null;
  onChange: (f: File | null) => void;
  disabled: boolean;
  percent: number;
  showProgress: boolean;
  kind: "video" | "zip";
}) {
  const inputId = `file-${kind}`;
  const icon = {
    video: <path d="M17 10.5V7c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c.55 0 1-.45 1-1v-3.5l4 4v-11l-4 4z" />,
    zip: <path d="M20 6h-8l-2-2H4c-1.11 0-1.99.89-1.99 2L2 18c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V8c0-1.11-.89-2-2-2z" />,
  }[kind];

  return (
    <label
      htmlFor={inputId}
      className={`card p-4 flex flex-col gap-3 cursor-pointer hover:bg-white/[0.05] transition ${
        disabled ? "opacity-60 pointer-events-none" : ""
      } ${file ? "border-violet-500/40" : ""}`}
    >
      <div className="flex items-start justify-between">
        <div>
          <div className="text-sm font-medium text-white">{label}</div>
          <div className="text-xs text-neutral-500 mt-0.5">{hint}</div>
        </div>
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${file ? "bg-violet-500/20 text-violet-300" : "bg-white/5 text-neutral-500"}`}>
          <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4" aria-hidden>
            {icon}
          </svg>
        </div>
      </div>

      {file ? (
        <div className="text-xs text-neutral-400 truncate" title={file.name}>
          {file.name}
        </div>
      ) : (
        <div className="text-xs text-neutral-600">Файл не выбран</div>
      )}

      {showProgress && file && (
        <div>
          <div className="flex justify-between text-[10px] text-neutral-500 mb-1">
            <span>{percent >= 100 ? "Готово" : "Загрузка"}</span>
            <span>{Math.round(percent)}%</span>
          </div>
          <div className="h-1 bg-white/5 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-violet-500 to-indigo-500 transition-all"
              style={{ width: `${percent}%` }}
            />
          </div>
        </div>
      )}

      <input
        id={inputId}
        type="file"
        accept={accept}
        onChange={(e) => onChange(e.target.files?.[0] ?? null)}
        disabled={disabled}
        className="sr-only"
      />
    </label>
  );
}
