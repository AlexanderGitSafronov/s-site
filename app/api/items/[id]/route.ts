import { NextResponse } from "next/server";
import { del, list } from "@vercel/blob";
import { sql } from "@/lib/db";
import { isOurBlobUrl } from "@/lib/blob";
import { badRequest, isUuid, notFound, readJson, serverError } from "@/lib/http";
import { extractGameZip } from "@/lib/extract";

export const runtime = "nodejs";
export const maxDuration = 60;

type ItemRow = {
  site_url: string;
  video_url: string;
  image_url: string | null;
  play_prefix: string | null;
};

async function loadItem(id: string): Promise<ItemRow | null> {
  const rows = (await sql`
    SELECT site_url, video_url, image_url, play_prefix
    FROM items WHERE id = ${id}
  `) as ItemRow[];
  return rows[0] ?? null;
}

async function purgePlayPrefix(prefix: string) {
  let cursor: string | undefined;
  do {
    const page = await list({ prefix, cursor, limit: 1000 });
    if (page.blobs.length > 0) {
      await del(page.blobs.map((b) => b.url));
    }
    cursor = page.cursor;
  } while (cursor);
}

export async function DELETE(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id } = await ctx.params;
  if (!isUuid(id)) return badRequest("invalid id");

  let row: ItemRow | null;
  try {
    row = await loadItem(id);
  } catch (e) {
    console.error("items select failed", e);
    return serverError("could not load item");
  }
  if (!row) return notFound();

  const urls = [row.site_url, row.video_url, row.image_url].filter(
    (u): u is string => !!u,
  );
  await Promise.allSettled(urls.map((u) => del(u)));

  if (row.play_prefix) {
    try {
      await purgePlayPrefix(row.play_prefix);
    } catch (e) {
      console.error("blob cleanup failed", e);
    }
  }

  try {
    await sql`DELETE FROM items WHERE id = ${id}`;
  } catch (e) {
    console.error("items delete failed", e);
    return serverError("could not delete item");
  }

  return NextResponse.json({ ok: true });
}

type PatchBody = {
  // Replace the video file
  video_url?: unknown;
  video_filename?: unknown;
  video_size?: unknown;
  video_content_type?: unknown;
  // Replace the game zip — server re-extracts and derives play_url internally
  site_url?: unknown;
  site_filename?: unknown;
  site_size?: unknown;
};

const asStr = (v: unknown, max: number): string | null =>
  typeof v === "string" && v.length > 0 && v.length <= max ? v : null;

const asSize = (v: unknown): number => {
  const n = Number(v);
  return Number.isFinite(n) && n >= 0 && n < Number.MAX_SAFE_INTEGER ? n : 0;
};

export async function PATCH(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id } = await ctx.params;
  if (!isUuid(id)) return badRequest("invalid id");

  const body = await readJson<PatchBody>(req);
  if (!body) return badRequest("invalid JSON body");

  const replacingVideo = body.video_url !== undefined;
  const replacingSite = body.site_url !== undefined;
  if (!replacingVideo && !replacingSite) {
    return badRequest("nothing to update (provide video_url or site_url)");
  }
  if (replacingVideo && !isOurBlobUrl(body.video_url)) {
    return badRequest("video_url must be from our blob store");
  }
  if (replacingSite && !isOurBlobUrl(body.site_url)) {
    return badRequest("site_url must be from our blob store");
  }

  let existing: ItemRow | null;
  try {
    existing = await loadItem(id);
  } catch (e) {
    console.error("items select failed", e);
    return serverError("could not load item");
  }
  if (!existing) return notFound();

  // Extract BEFORE we touch the DB row, so a failed extract leaves the
  // existing row + blobs untouched.
  let extract: Awaited<ReturnType<typeof extractGameZip>> | null = null;
  if (replacingSite) {
    extract = await extractGameZip(body.site_url);
    if (!extract.ok) {
      return NextResponse.json({ error: extract.error }, { status: extract.status });
    }
  }

  try {
    if (replacingVideo) {
      const videoUrl = body.video_url as string;
      const filename = asStr(body.video_filename, 500) ?? "video.mp4";
      const size = asSize(body.video_size);
      const contentType = asStr(body.video_content_type, 200) ?? "video/mp4";
      await sql`
        UPDATE items SET
          video_url = ${videoUrl},
          video_filename = ${filename},
          video_size = ${size},
          video_content_type = ${contentType}
        WHERE id = ${id}
      `;
      if (existing.video_url && existing.video_url !== videoUrl) {
        await del(existing.video_url).catch((e) =>
          console.error("old video del failed", e),
        );
      }
    }

    if (replacingSite && extract && extract.ok) {
      const siteUrl = body.site_url as string;
      const filename = asStr(body.site_filename, 500) ?? "site.zip";
      const size = asSize(body.site_size);
      await sql`
        UPDATE items SET
          site_url = ${siteUrl},
          site_filename = ${filename},
          site_size = ${size},
          play_url = ${extract.playUrl},
          play_prefix = ${extract.playPrefix}
        WHERE id = ${id}
      `;
      if (existing.site_url && existing.site_url !== siteUrl) {
        await del(existing.site_url).catch((e) =>
          console.error("old zip del failed", e),
        );
      }
      if (existing.play_prefix && existing.play_prefix !== extract.playPrefix) {
        await purgePlayPrefix(existing.play_prefix).catch((e) =>
          console.error("old play prefix cleanup failed", e),
        );
      }
    }
  } catch (e) {
    console.error("items patch failed", e);
    return serverError("could not update item");
  }

  return NextResponse.json({ ok: true });
}
