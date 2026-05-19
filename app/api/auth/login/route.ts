import { NextResponse } from "next/server";
import { COOKIE_NAME, expectedToken, timingSafeEqual } from "@/lib/auth";
import { readJson, unauthorized } from "@/lib/http";

export const runtime = "nodejs";

type LoginBody = { username?: unknown; password?: unknown };

export async function POST(req: Request) {
  const body = (await readJson<LoginBody>(req)) ?? {};
  const username = typeof body.username === "string" ? body.username : "";
  const password = typeof body.password === "string" ? body.password : "";

  const envUser = process.env.AUTH_USERNAME ?? "";
  const envPass = process.env.AUTH_PASSWORD ?? "";

  // Refuse empty creds even if env vars are misconfigured (defence in depth).
  if (!envUser || !envPass || !username || !password) {
    return unauthorized("invalid credentials");
  }

  // Constant-time compare for both fields.
  const userOk = timingSafeEqual(username, envUser);
  const passOk = timingSafeEqual(password, envPass);
  if (!userOk || !passOk) {
    return unauthorized("invalid credentials");
  }

  const token = await expectedToken();
  const res = NextResponse.json({ ok: true });
  res.cookies.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
  return res;
}
