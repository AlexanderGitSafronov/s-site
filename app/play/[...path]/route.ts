import { ourBlobHost } from "@/lib/blob";
import { mimeFor } from "@/lib/mime";

export const runtime = "nodejs";

const SLUG_RE = /^[0-9a-f]{16}$/i;

export async function GET(
  req: Request,
  ctx: { params: Promise<{ path: string[] }> },
) {
  const { path } = await ctx.params;
  if (!path || path.length < 2 || !SLUG_RE.test(path[0])) {
    return new Response("not found", { status: 404 });
  }
  for (const seg of path) {
    if (!seg || seg === "." || seg === ".." || seg.includes("\\") || seg.includes("\0")) {
      return new Response("forbidden", { status: 400 });
    }
  }

  const relPath = path.join("/");
  const blobUrl = `https://${ourBlobHost()}/play/${relPath}`;

  const blobRes = await fetch(blobUrl, {
    // Forward conditional headers for client-side caching efficiency.
    headers: forwardConditional(req.headers),
  });

  if (blobRes.status === 304) {
    return new Response(null, { status: 304, headers: passThroughCacheHeaders(blobRes.headers) });
  }
  if (!blobRes.ok) {
    return new Response("not found", { status: blobRes.status });
  }

  const headers = new Headers();
  // Trust mimeFor over whatever blob set, since we derive it from extension at upload.
  const ct = blobRes.headers.get("content-type") ?? mimeFor(relPath);
  headers.set("content-type", ct);
  headers.set("content-disposition", "inline");
  headers.set("cache-control", "private, max-age=3600, must-revalidate");
  headers.set("x-content-type-options", "nosniff");
  const etag = blobRes.headers.get("etag");
  if (etag) headers.set("etag", etag);
  const lm = blobRes.headers.get("last-modified");
  if (lm) headers.set("last-modified", lm);
  const cl = blobRes.headers.get("content-length");
  if (cl) headers.set("content-length", cl);

  return new Response(blobRes.body, { status: 200, headers });
}

function forwardConditional(src: Headers): Headers {
  const out = new Headers();
  const inm = src.get("if-none-match");
  if (inm) out.set("if-none-match", inm);
  const ims = src.get("if-modified-since");
  if (ims) out.set("if-modified-since", ims);
  return out;
}

function passThroughCacheHeaders(src: Headers): Headers {
  const out = new Headers();
  out.set("cache-control", "private, max-age=3600, must-revalidate");
  const etag = src.get("etag");
  if (etag) out.set("etag", etag);
  const lm = src.get("last-modified");
  if (lm) out.set("last-modified", lm);
  return out;
}
