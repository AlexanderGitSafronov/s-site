import { NextResponse } from "next/server";
import { del, list } from "@vercel/blob";
import { sql } from "@/lib/db";

export const maxDuration = 60;

export async function DELETE(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id } = await ctx.params;

  const rows = (await sql`
    SELECT site_url, video_url, image_url, play_prefix
    FROM items WHERE id = ${id}
  `) as {
    site_url: string;
    video_url: string;
    image_url: string | null;
    play_prefix: string | null;
  }[];

  if (rows.length === 0) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  const { site_url, video_url, image_url, play_prefix } = rows[0];

  const urls = [site_url, video_url, image_url].filter((u): u is string => !!u);
  await Promise.allSettled(urls.map((u) => del(u)));

  if (play_prefix) {
    let cursor: string | undefined;
    do {
      const page = await list({ prefix: play_prefix, cursor, limit: 1000 });
      if (page.blobs.length > 0) {
        await del(page.blobs.map((b) => b.url));
      }
      cursor = page.cursor;
    } while (cursor);
  }

  await sql`DELETE FROM items WHERE id = ${id}`;

  return NextResponse.json({ ok: true });
}
