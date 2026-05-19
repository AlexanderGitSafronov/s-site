import { NextRequest, NextResponse } from "next/server";
import { COOKIE_NAME, expectedToken, timingSafeEqual } from "@/lib/auth";

const PUBLIC_PREFIXES = ["/login", "/api/auth/"];

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (PUBLIC_PREFIXES.some((p) => pathname === p || pathname.startsWith(p))) {
    return NextResponse.next();
  }

  const cookie = req.cookies.get(COOKIE_NAME)?.value;
  if (cookie) {
    try {
      const expected = await expectedToken();
      if (timingSafeEqual(cookie, expected)) {
        return NextResponse.next();
      }
    } catch {
      // env not configured → fall through to 401/redirect
    }
  }

  if (pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const url = req.nextUrl.clone();
  url.pathname = "/login";
  url.searchParams.set("next", pathname);
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ["/((?!_next/|favicon|.*\\.).*)"],
};
