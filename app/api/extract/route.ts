import { NextResponse } from "next/server";
import { put } from "@vercel/blob";
import { unzipSync } from "fflate";
import { mimeFor } from "@/lib/mime";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: Request) {
  const { zipUrl, slug } = await req.json();
  if (!zipUrl || !slug) {
    return NextResponse.json({ error: "zipUrl and slug required" }, { status: 400 });
  }
  if (!/^[a-z0-9-]+$/i.test(slug)) {
    return NextResponse.json({ error: "invalid slug" }, { status: 400 });
  }

  const zipRes = await fetch(zipUrl);
  if (!zipRes.ok) {
    return NextResponse.json({ error: `zip fetch failed: ${zipRes.status}` }, { status: 502 });
  }
  const zipBytes = new Uint8Array(await zipRes.arrayBuffer());

  let entries: Record<string, Uint8Array>;
  try {
    entries = unzipSync(zipBytes);
  } catch (e) {
    return NextResponse.json({ error: `invalid zip: ${(e as Error).message}` }, { status: 400 });
  }

  const paths = Object.keys(entries).filter(
    (p) => !p.endsWith("/") && entries[p].length > 0 && !p.includes(".."),
  );
  if (paths.length === 0) {
    return NextResponse.json({ error: "zip is empty" }, { status: 400 });
  }

  // Strip a single common top-level directory if present (e.g. "MyGame/index.html" → "index.html").
  const firstSegments = new Set(paths.map((p) => p.split("/")[0]));
  const stripRoot =
    firstSegments.size === 1 && paths.every((p) => p.includes("/"))
      ? [...firstSegments][0] + "/"
      : "";

  const prefix = `play/${slug}/`;
  let totalBytes = 0;
  let indexUrl: string | null = null;

  await Promise.all(
    paths.map(async (raw) => {
      const rel = stripRoot ? raw.slice(stripRoot.length) : raw;
      if (!rel) return;
      const data = entries[raw];
      totalBytes += data.length;
      const pathname = prefix + rel;
      const result = await put(pathname, Buffer.from(data), {
        access: "public",
        contentType: mimeFor(rel),
        addRandomSuffix: false,
        allowOverwrite: true,
      });
      if (rel.toLowerCase() === "index.html" || rel.toLowerCase() === "index.htm") {
        indexUrl = result.url;
      }
    }),
  );

  if (!indexUrl) {
    return NextResponse.json(
      { error: "index.html not found at root of the archive" },
      { status: 400 },
    );
  }

  return NextResponse.json({
    playUrl: indexUrl,
    playPrefix: prefix,
    fileCount: paths.length,
    totalBytes,
  });
}
