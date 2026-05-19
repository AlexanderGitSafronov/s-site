import { NextResponse } from "next/server";
import { sql } from "@/lib/db";

export async function POST(req: Request) {
  const data = await req.json();
  const {
    title,
    description,
    site_url,
    site_filename,
    site_size,
    video_url,
    video_filename,
    video_size,
    video_content_type,
  } = data ?? {};

  if (!title || !site_url || !video_url) {
    return NextResponse.json({ error: "missing required fields" }, { status: 400 });
  }

  const rows = (await sql`
    INSERT INTO items
      (title, description, site_url, site_filename, site_size,
       video_url, video_filename, video_size, video_content_type)
    VALUES
      (${title}, ${description ?? null}, ${site_url}, ${site_filename}, ${site_size ?? 0},
       ${video_url}, ${video_filename}, ${video_size ?? 0}, ${video_content_type ?? "video/mp4"})
    RETURNING id
  `) as { id: string }[];

  return NextResponse.json({ id: rows[0].id });
}
