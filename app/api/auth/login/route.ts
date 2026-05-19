import { NextResponse } from "next/server";
import { COOKIE_NAME, expectedToken, timingSafeEqual } from "@/lib/auth";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const { username, password } = await req.json().catch(() => ({}));
  const envUser = process.env.AUTH_USERNAME ?? "";
  const envPass = process.env.AUTH_PASSWORD ?? "";

  if (
    typeof username !== "string" ||
    typeof password !== "string" ||
    !timingSafeEqual(username, envUser) ||
    !timingSafeEqual(password, envPass)
  ) {
    return NextResponse.json({ error: "invalid credentials" }, { status: 401 });
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
