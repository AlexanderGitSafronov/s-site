let cachedHost: string | null = null;

/**
 * Returns the hostname of our Vercel Blob store, derived from the rw token.
 * Used to validate that user-supplied URLs point to OUR store and not somewhere else
 * (defends against SSRF in /api/extract and against malicious play_url overrides).
 */
export function ourBlobHost(): string {
  if (cachedHost) return cachedHost;
  const token = process.env.BLOB_READ_WRITE_TOKEN;
  if (!token) throw new Error("BLOB_READ_WRITE_TOKEN is not set");
  const m = token.match(/^vercel_blob_rw_([^_]+)_/);
  if (!m) throw new Error("BLOB_READ_WRITE_TOKEN has unexpected format");
  cachedHost = `${m[1].toLowerCase()}.public.blob.vercel-storage.com`;
  return cachedHost;
}

export function isOurBlobUrl(url: unknown): url is string {
  if (typeof url !== "string") return false;
  try {
    const u = new URL(url);
    return u.protocol === "https:" && u.hostname === ourBlobHost();
  } catch {
    return false;
  }
}
