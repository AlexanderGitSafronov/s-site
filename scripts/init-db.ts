import { neon } from "@neondatabase/serverless";

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL is required");
  process.exit(1);
}

const sql = neon(url);

async function main() {
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
  await sql`ALTER TABLE items ADD COLUMN IF NOT EXISTS image_url text;`;
  await sql`ALTER TABLE items ADD COLUMN IF NOT EXISTS image_filename text;`;
  await sql`ALTER TABLE items ADD COLUMN IF NOT EXISTS image_size bigint NOT NULL DEFAULT 0;`;
  await sql`ALTER TABLE items ADD COLUMN IF NOT EXISTS image_content_type text;`;
  await sql`ALTER TABLE items ADD COLUMN IF NOT EXISTS play_url text;`;
  await sql`ALTER TABLE items ADD COLUMN IF NOT EXISTS play_prefix text;`;
  await sql`ALTER TABLE items ADD COLUMN IF NOT EXISTS author text;`;
  await sql`CREATE INDEX IF NOT EXISTS items_created_at_idx ON items (created_at DESC);`;
  console.log("DB initialized.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
