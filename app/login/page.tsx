"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";

/** Allow only same-origin paths to avoid open redirects. */
function safeNext(value: string | null): string {
  if (!value) return "/";
  if (!value.startsWith("/")) return "/";
  if (value.startsWith("//")) return "/";
  if (value.startsWith("/\\")) return "/";
  return value;
}

function LoginForm() {
  const params = useSearchParams();
  const nextPath = safeNext(params.get("next"));
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      if (res.ok) {
        // Hard navigation: bypasses Next router cache that may still hold the
        // pre-login 307 redirect from "/" and would loop us back to /login.
        window.location.replace(nextPath);
      } else {
        setError("Неверный логин или пароль");
        setBusy(false);
      }
    } catch {
      setError("Сетевая ошибка");
      setBusy(false);
    }
  }

  return (
    <div className="min-h-[calc(100vh-200px)] flex items-center justify-center px-6">
      <form onSubmit={handleSubmit} className="card p-8 w-full max-w-sm space-y-5">
        <div className="flex justify-center">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-violet-500 to-indigo-500 flex items-center justify-center shadow-xl shadow-violet-500/30">
            <svg viewBox="0 0 24 24" fill="white" className="w-7 h-7" aria-hidden>
              <path d="M12 17c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm6-9h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6h1.9c0-1.71 1.39-3.1 3.1-3.1s3.1 1.39 3.1 3.1v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2z" />
            </svg>
          </div>
        </div>
        <div className="text-center">
          <h1 className="text-xl font-semibold tracking-tight">Вход в HyperFrames Hub</h1>
          <p className="text-sm text-neutral-400 mt-1">Введите логин и пароль</p>
        </div>
        <div>
          <label className="block text-sm font-medium mb-2 text-neutral-200">Логин</label>
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            disabled={busy}
            autoComplete="username"
            required
            autoFocus
            className="input"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-2 text-neutral-200">Пароль</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={busy}
            autoComplete="current-password"
            required
            className="input"
          />
        </div>
        {error && (
          <div className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
            {error}
          </div>
        )}
        <button type="submit" disabled={busy} className="btn-primary w-full">
          {busy ? "Вход…" : "Войти"}
        </button>
      </form>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}
