import { NextRequest, NextResponse } from "next/server";
import { COOKIE_NAME, expectedToken, timingSafeEqual } from "@/lib/auth";

// Paths that bypass auth entirely.
// IMPORTANT: each entry is an EXACT match or a prefix that requires a trailing
// slash, so "/login" does NOT match "/loginanything".
// /play/* is public on purpose: the 16-hex slug (64 bits) is unguessable, and
// the sandboxed play-iframe (no allow-same-origin) doesn't send cookies on
// subresource requests — every asset would 307 to /login otherwise.
const PUBLIC_EXACT = new Set(["/login"]);
const PUBLIC_PREFIXES = ["/api/auth/", "/play/"];

function isPublic(pathname: string): boolean {
  if (PUBLIC_EXACT.has(pathname)) return true;
  return PUBLIC_PREFIXES.some((p) => pathname.startsWith(p));
}

const COOKIE_OPTS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
  maxAge: 60 * 60 * 24 * 30,
};

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Magic-link: ?key=<token> on any GET page logs the visitor in, then
  // redirects to the same URL without the key so it doesn't linger.
  // Skip for /api/auth/* so we never consume the body of a real auth POST.
  if (req.method === "GET" && !pathname.startsWith("/api/auth/")) {
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
  }

  if (isPublic(pathname)) {
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
// `_next/` covers static, image, data, and any future internal subpaths.
export const config = {
  matcher: [
    "/((?!_next/|favicon\\.ico|icon\\.svg|apple-icon\\.svg|robots\\.txt|sitemap\\.xml).*)",
  ],
};
