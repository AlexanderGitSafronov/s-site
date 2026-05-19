import { NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { isOurBlobUrl } from "@/lib/blob";
import { badRequest, readJson, serverError } from "@/lib/http";

const MAX_TITLE = 200;
const MAX_DESCRIPTION = 5000;

type Body = {
  title?: unknown;
  description?: unknown;
  site_url?: unknown;
  site_filename?: unknown;
  site_size?: unknown;
  video_url?: unknown;
  video_filename?: unknown;
  video_size?: unknown;
  video_content_type?: unknown;
  image_url?: unknown;
  image_filename?: unknown;
  image_size?: unknown;
  image_content_type?: unknown;
  play_url?: unknown;
  play_prefix?: unknown;
};

const asStr = (v: unknown, max: number): string | null =>
  typeof v === "string" && v.length > 0 && v.length <= max ? v : null;

const asSize = (v: unknown): number => {
  const n = Number(v);
  return Number.isFinite(n) && n >= 0 && n < Number.MAX_SAFE_INTEGER ? n : 0;
};

export async function POST(req: Request) {
  const body = await readJson<Body>(req);
  if (!body) return badRequest("invalid JSON body");

  const title = asStr(body.title, MAX_TITLE);
  if (!title) return badRequest("title is required");

  const description =
    typeof body.description === "string" && body.description.length <= MAX_DESCRIPTION
      ? body.description.trim() || null
      : null;

  if (!isOurBlobUrl(body.site_url)) return badRequest("site_url must be from our blob store");
  if (!isOurBlobUrl(body.video_url)) return badRequest("video_url must be from our blob store");
  if (!isOurBlobUrl(body.image_url)) return badRequest("image_url must be from our blob store");
  // play_url is now a relative path served by our /play/[...path] proxy.
  if (
    body.play_url != null &&
    !(typeof body.play_url === "string" && /^\/play\/[0-9a-f]{16}\/index\.html$/i.test(body.play_url))
  ) {
    return badRequest("play_url must be /play/<slug>/index.html");
  }

  const site_filename = asStr(body.site_filename, 500) ?? "site.zip";
  const video_filename = asStr(body.video_filename, 500) ?? "video.mp4";
  const image_filename = asStr(body.image_filename, 500) ?? "image.jpg";
  const video_content_type = asStr(body.video_content_type, 200) ?? "video/mp4";
  const image_content_type = asStr(body.image_content_type, 200) ?? "image/jpeg";
  const play_prefix = asStr(body.play_prefix, 200);

  try {
    const rows = (await sql`
      INSERT INTO items
        (title, description, site_url, site_filename, site_size,
         video_url, video_filename, video_size, video_content_type,
         image_url, image_filename, image_size, image_content_type,
         play_url, play_prefix)
      VALUES
        (${title}, ${description}, ${body.site_url}, ${site_filename}, ${asSize(body.site_size)},
         ${body.video_url}, ${video_filename}, ${asSize(body.video_size)}, ${video_content_type},
         ${body.image_url}, ${image_filename}, ${asSize(body.image_size)}, ${image_content_type},
         ${body.play_url ?? null}, ${play_prefix})
      RETURNING id
    `) as { id: string }[];
    return NextResponse.json({ id: rows[0].id });
  } catch (e) {
    console.error("items insert failed", e);
    return serverError("could not save item");
  }
}
