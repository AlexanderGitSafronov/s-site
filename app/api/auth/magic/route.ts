import { NextResponse } from "next/server";
import { COOKIE_NAME, expectedToken, timingSafeEqual } from "@/lib/auth";

export const runtime = "nodejs";

/** Allow only same-origin paths to avoid open redirects. */
function safeNext(value: string | null): string {
  if (!value || !value.startsWith("/") || value.startsWith("//") || value.startsWith("/\\")) {
    return "/";
  }
  return value;
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const key = url.searchParams.get("key") ?? "";
  const next = safeNext(url.searchParams.get("next"));
  const expected = process.env.AUTH_MAGIC_TOKEN ?? "";

  if (!expected || !key || !timingSafeEqual(key, expected)) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  const token = await expectedToken();
  const res = NextResponse.redirect(new URL(next, req.url));
  res.cookies.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
  return res;
}
