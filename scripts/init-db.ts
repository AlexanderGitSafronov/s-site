import { neon } from "@neondatabase/serverless";

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL is required");
  process.exit(1);
}

const sql = neon(url);

await sql`
  CREATE TABLE IF NOT EXISTS items (
    id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    title         text NOT NULL,
    description   text,
    site_url      text NOT NULL,
    site_filename text NOT NULL,
    site_size     bigint NOT NULL DEFAULT 0,
    video_url     text NOT NULL,
    video_filename text NOT NULL,
    video_size    bigint NOT NULL DEFAULT 0,
    video_content_type text NOT NULL DEFAULT 'video/mp4',
    created_at    timestamptz NOT NULL DEFAULT now()
  );
`;

await sql`CREATE INDEX IF NOT EXISTS items_created_at_idx ON items (created_at DESC);`;

console.log("DB initialized.");
