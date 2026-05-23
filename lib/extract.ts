import { put } from "@vercel/blob";
import { unzipSync } from "fflate";
import { mimeFor } from "./mime";
import { isOurBlobUrl } from "./blob";

const MAX_ZIP_BYTES = 200 * 1024 * 1024; // 200 MB
const MAX_FILES = 5000;
const MAX_UNCOMPRESSED_BYTES = 1024 * 1024 * 1024; // 1 GB (zip bomb defense)

export type ExtractOk = {
  ok: true;
  playUrl: string;
  playPrefix: string;
  slug: string;
  fileCount: number;
  totalBytes: number;
};
export type ExtractErr = { ok: false; status: number; error: string };
export type ExtractResult = ExtractOk | ExtractErr;

function isUnsafePath(p: string): boolean {
  if (!p || p.startsWith("/") || p.startsWith("\\")) return true;
  if (p.includes("..")) return true;
  if (/^[a-zA-Z]:[\\/]/.test(p)) return true;
  if (p.includes("\0")) return true;
  return false;
}

function isJunkPath(p: string): boolean {
  if (p.startsWith("__MACOSX/") || p.includes("/__MACOSX/")) return true;
  const base = p.split("/").pop() ?? "";
  if (base === ".DS_Store" || base === "Thumbs.db") return true;
  if (base.startsWith("._")) return true;
  return false;
}

const err = (status: number, error: string): ExtractErr => ({ ok: false, status, error });

/**
 * Downloads a zip from our Blob store, validates and extracts its contents
 * to `play/{server-generated-slug}/` in Blob, returns the canonical play
 * URL + prefix. The slug is created here — callers (POST /api/items, PATCH)
 * cannot influence where files land, which prevents the row-corruption /
 * blob-deletion class of bugs we'd otherwise have to defend against by
 * cross-validating client-supplied values.
 */
export async function extractGameZip(zipUrl: unknown): Promise<ExtractResult> {
  if (!isOurBlobUrl(zipUrl)) {
    return err(400, "zipUrl must be a URL from our blob store");
  }

  let zipRes: Response;
  try {
    zipRes = await fetch(zipUrl);
  } catch {
    return err(502, "zip fetch failed");
  }
  if (!zipRes.ok) return err(502, `zip fetch failed: ${zipRes.status}`);

  const len = zipRes.headers.get("content-length");
  if (len && Number(len) > MAX_ZIP_BYTES) {
    return err(400, `zip too large (max ${MAX_ZIP_BYTES} bytes)`);
  }
  const buf = await zipRes.arrayBuffer();
  if (buf.byteLength > MAX_ZIP_BYTES) {
    return err(400, `zip too large (max ${MAX_ZIP_BYTES} bytes)`);
  }
  const zipBytes = new Uint8Array(buf);

  let entries: Record<string, Uint8Array>;
  try {
    entries = unzipSync(zipBytes);
  } catch (e) {
    return err(400, `invalid zip: ${(e as Error).message}`);
  }

  const paths = Object.keys(entries).filter(
    (p) =>
      !p.endsWith("/") &&
      entries[p].length > 0 &&
      !isUnsafePath(p) &&
      !isJunkPath(p),
  );
  if (paths.length === 0) return err(400, "zip is empty");
  if (paths.length > MAX_FILES) return err(400, `too many files (max ${MAX_FILES})`);

  let totalUncompressed = 0;
  for (const p of paths) totalUncompressed += entries[p].length;
  if (totalUncompressed > MAX_UNCOMPRESSED_BYTES) {
    return err(400, "uncompressed contents too large");
  }

  // Strip a single common top-level directory if present.
  const firstSegments = new Set(paths.map((p) => p.split("/")[0]));
  const stripRoot =
    firstSegments.size === 1 && paths.every((p) => p.includes("/"))
      ? [...firstSegments][0] + "/"
      : "";

  const slug = crypto.randomUUID().replace(/-/g, "").slice(0, 16);
  const prefix = `play/${slug}/`;
  let indexFound = false;

  try {
    await Promise.all(
      paths.map(async (raw) => {
        let rel = stripRoot ? raw.slice(stripRoot.length) : raw;
        if (!rel || isUnsafePath(rel) || isJunkPath(rel)) return;
        // Normalize index.html / Index.HTML / index.htm to lowercase
        // index.html so the canonical play_url always matches what's stored.
        const lower = rel.toLowerCase();
        if (lower === "index.html" || lower === "index.htm") {
          rel = "index.html";
          indexFound = true;
        }
        await put(prefix + rel, Buffer.from(entries[raw]), {
          access: "public",
          contentType: mimeFor(rel),
          addRandomSuffix: false,
          allowOverwrite: false,
        });
      }),
    );
  } catch (e) {
    return err(500, `upload failed: ${(e as Error).message}`);
  }

  if (!indexFound) {
    return err(400, "index.html not found at the root of the archive");
  }

  return {
    ok: true,
    playUrl: `/play/${slug}/index.html`,
    playPrefix: prefix,
    slug,
    fileCount: paths.length,
    totalBytes: totalUncompressed,
  };
}
