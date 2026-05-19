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
    image_url,
    image_filename,
    image_size,
    image_content_type,
    play_url,
    play_prefix,
  } = data ?? {};

  if (!title || !site_url || !video_url || !image_url) {
    return NextResponse.json({ error: "missing required fields" }, { status: 400 });
  }

  const rows = (await sql`
    INSERT INTO items
      (title, description, site_url, site_filename, site_size,
       video_url, video_filename, video_size, video_content_type,
       image_url, image_filename, image_size, image_content_type,
       play_url, play_prefix)
    VALUES
      (${title}, ${description ?? null}, ${site_url}, ${site_filename}, ${site_size ?? 0},
       ${video_url}, ${video_filename}, ${video_size ?? 0}, ${video_content_type ?? "video/mp4"},
       ${image_url}, ${image_filename}, ${image_size ?? 0}, ${image_content_type ?? "image/jpeg"},
       ${play_url ?? null}, ${play_prefix ?? null})
    RETURNING id
  `) as { id: string }[];

  return NextResponse.json({ id: rows[0].id });
}
