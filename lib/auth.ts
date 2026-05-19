const COOKIE_NAME = "s_auth";

export { COOKIE_NAME };

export async function expectedToken(): Promise<string> {
  const user = process.env.AUTH_USERNAME;
  const pass = process.env.AUTH_PASSWORD;
  const secret = process.env.AUTH_SECRET;
  if (!user || !pass || !secret) {
    throw new Error("AUTH_USERNAME, AUTH_PASSWORD, AUTH_SECRET must be set");
  }
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(`${user}:${pass}`));
  return bytesToBase64Url(new Uint8Array(sig));
}

export function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}

function bytesToBase64Url(bytes: Uint8Array): string {
  let bin = "";
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
