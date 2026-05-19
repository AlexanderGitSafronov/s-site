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
      // env misconfigured → fall through to redirect/401
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

// Match everything except Next internals and well-known static assets.
// Note: /play/* and /icon.svg/etc are explicit excludes; everything else
// (including paths with dots like /play/abc/game.js) is gated.
export const config = {
  matcher: [
    "/((?!_next/static|_next/image|_next/data|favicon\\.ico|icon\\.svg|apple-icon\\.svg|robots\\.txt|sitemap\\.xml).*)",
  ],
};
