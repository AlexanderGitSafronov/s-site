import { NextResponse } from "next/server";
import { del, list } from "@vercel/blob";
import { sql } from "@/lib/db";
import { badRequest, isUuid, notFound, serverError } from "@/lib/http";

export const maxDuration = 60;

export async function DELETE(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id } = await ctx.params;
  if (!isUuid(id)) return badRequest("invalid id");

  let rows: {
    site_url: string;
    video_url: string;
    image_url: string | null;
    play_prefix: string | null;
  }[];
  try {
    rows = (await sql`
      SELECT site_url, video_url, image_url, play_prefix
      FROM items WHERE id = ${id}
    `) as typeof rows;
  } catch (e) {
    console.error("items select failed", e);
    return serverError("could not load item");
  }

  if (rows.length === 0) return notFound();

  const { site_url, video_url, image_url, play_prefix } = rows[0];

  const urls = [site_url, video_url, image_url].filter((u): u is string => !!u);
  await Promise.allSettled(urls.map((u) => del(u)));

  if (play_prefix) {
    try {
      let cursor: string | undefined;
      do {
        const page = await list({ prefix: play_prefix, cursor, limit: 1000 });
        if (page.blobs.length > 0) {
          await del(page.blobs.map((b) => b.url));
        }
        cursor = page.cursor;
      } while (cursor);
    } catch (e) {
      console.error("blob cleanup failed", e);
      // Best-effort: continue to delete the DB row even if blob cleanup partially failed.
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
