import { NextResponse } from "next/server";
import { put } from "@vercel/blob";
import { unzipSync } from "fflate";
import { mimeFor } from "@/lib/mime";
import { isOurBlobUrl } from "@/lib/blob";
import { badRequest, readJson, serverError } from "@/lib/http";

export const runtime = "nodejs";
export const maxDuration = 60;

const MAX_ZIP_BYTES = 200 * 1024 * 1024; // 200 MB
const MAX_FILES = 5000;
const MAX_UNCOMPRESSED_BYTES = 1024 * 1024 * 1024; // 1 GB (zip bomb defense)

function isUnsafePath(p: string): boolean {
  if (!p || p.startsWith("/") || p.startsWith("\\")) return true;
  if (p.includes("..")) return true;
  if (/^[a-zA-Z]:[\\/]/.test(p)) return true; // Windows drive
  if (p.includes("\0")) return true;
  return false;
}

function isJunkPath(p: string): boolean {
  // macOS resource forks, .DS_Store; Windows thumbs; common junk metadata
  if (p.startsWith("__MACOSX/") || p.includes("/__MACOSX/")) return true;
  const base = p.split("/").pop() ?? "";
  if (base === ".DS_Store" || base === "Thumbs.db") return true;
  if (base.startsWith("._")) return true;
  return false;
}

export async function POST(req: Request) {
  const body = await readJson<{ zipUrl?: unknown }>(req);
  if (!body || !isOurBlobUrl(body.zipUrl)) {
    return badRequest("zipUrl must be a URL from our blob store");
  }

  const zipUrl = body.zipUrl;

  let zipRes: Response;
  try {
    zipRes = await fetch(zipUrl);
  } catch {
    return NextResponse.json({ error: "zip fetch failed" }, { status: 502 });
  }
  if (!zipRes.ok) {
    return NextResponse.json({ error: `zip fetch failed: ${zipRes.status}` }, { status: 502 });
  }

  const lenHeader = zipRes.headers.get("content-length");
  if (lenHeader && Number(lenHeader) > MAX_ZIP_BYTES) {
    return badRequest(`zip too large (max ${MAX_ZIP_BYTES} bytes)`);
  }

  const buf = await zipRes.arrayBuffer();
  if (buf.byteLength > MAX_ZIP_BYTES) {
    return badRequest(`zip too large (max ${MAX_ZIP_BYTES} bytes)`);
  }
  const zipBytes = new Uint8Array(buf);

  let entries: Record<string, Uint8Array>;
  try {
    entries = unzipSync(zipBytes);
  } catch (e) {
    return badRequest(`invalid zip: ${(e as Error).message}`);
  }

  const paths = Object.keys(entries).filter(
    (p) =>
      !p.endsWith("/") &&
      entries[p].length > 0 &&
      !isUnsafePath(p) &&
      !isJunkPath(p),
  );
  if (paths.length === 0) return badRequest("zip is empty");
  if (paths.length > MAX_FILES) return badRequest(`too many files (max ${MAX_FILES})`);

  let totalUncompressed = 0;
  for (const p of paths) totalUncompressed += entries[p].length;
  if (totalUncompressed > MAX_UNCOMPRESSED_BYTES) {
    return badRequest("uncompressed contents too large");
  }

  // Strip a single common top-level directory if present.
  const firstSegments = new Set(paths.map((p) => p.split("/")[0]));
  const stripRoot =
    firstSegments.size === 1 && paths.every((p) => p.includes("/"))
      ? [...firstSegments][0] + "/"
      : "";

  // Server-generated slug — client cannot influence where files land.
  const slug = crypto.randomUUID().replace(/-/g, "").slice(0, 16);
  const prefix = `play/${slug}/`;
  let indexUrl: string | null = null;

  try {
    await Promise.all(
      paths.map(async (raw) => {
        const rel = stripRoot ? raw.slice(stripRoot.length) : raw;
        if (!rel || isUnsafePath(rel)) return;
        const pathname = prefix + rel;
        const result = await put(pathname, Buffer.from(entries[raw]), {
          access: "public",
          contentType: mimeFor(rel),
          // Inline so the browser renders HTML/JS/WASM/images instead of
          // forcing a download (Vercel Blob defaults to attachment).
          contentDisposition: `inline; filename="${encodeURIComponent(rel.split("/").pop() ?? "file")}"`,
          addRandomSuffix: false,
          allowOverwrite: false,
        });
        const lower = rel.toLowerCase();
        if (lower === "index.html" || lower === "index.htm") {
          indexUrl = result.url;
        }
      }),
    );
  } catch (e) {
    return serverError(`upload failed: ${(e as Error).message}`);
  }

  if (!indexUrl) {
    return badRequest("index.html not found at the root of the archive");
  }

  return NextResponse.json({
    playUrl: indexUrl,
    playPrefix: prefix,
    fileCount: paths.length,
    totalBytes: totalUncompressed,
  });
}
