import { NextResponse } from "next/server";
import { del } from "@vercel/blob";
import { sql } from "@/lib/db";

export async function DELETE(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id } = await ctx.params;

  const rows = (await sql`
    SELECT site_url, video_url FROM items WHERE id = ${id}
  `) as { site_url: string; video_url: string }[];

  if (rows.length === 0) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  await Promise.allSettled([
    del(rows[0].site_url),
    del(rows[0].video_url),
  ]);

  await sql`DELETE FROM items WHERE id = ${id}`;

  return NextResponse.json({ ok: true });
}
