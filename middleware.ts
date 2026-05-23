import { NextRequest, NextResponse } from "next/server";
import { COOKIE_NAME, expectedToken, timingSafeEqual } from "@/lib/auth";

// /play/* is public on purpose: the 16-hex slug (64 bits) is unguessable, so
// authenticated users can hand out direct game links AND, more importantly,
// the sandboxed play-iframe (no allow-same-origin) doesn't send cookies on
// subresource requests — every asset would 307 to /login otherwise.
const PUBLIC_PREFIXES = ["/login", "/api/auth/", "/play/"];

const COOKIE_OPTS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
  maxAge: 60 * 60 * 24 * 30,
};

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Magic-link: ?key=<token> on ANY path logs the visitor in, then
  // redirects to the same URL without the key so it doesn't linger.
  const key = req.nextUrl.searchParams.get("key");
  if (key) {
    const magic = process.env.AUTH_MAGIC_TOKEN;
    if (magic && timingSafeEqual(key, magic)) {
      const clean = req.nextUrl.clone();
      clean.searchParams.delete("key");
      try {
        const token = await expectedToken();
        const res = NextResponse.redirect(clean);
        res.cookies.set(COOKIE_NAME, token, COOKIE_OPTS);
        return res;
      } catch {
        // env misconfigured → fall through to normal handling
      }
    }
  }

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
  url.search = "";
  url.searchParams.set("next", pathname);
  return NextResponse.redirect(url);
}

// Match everything except Next internals and well-known static assets.
export const config = {
  matcher: [
    "/((?!_next/static|_next/image|_next/data|favicon\\.ico|icon\\.svg|apple-icon\\.svg|robots\\.txt|sitemap\\.xml).*)",
  ],
};
