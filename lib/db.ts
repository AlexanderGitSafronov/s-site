import { neon } from "@neondatabase/serverless";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is not set");
}

export const sql = neon(process.env.DATABASE_URL);

export type Item = {
  id: string;
  title: string;
  description: string | null;
  site_url: string;
  site_filename: string;
  site_size: number;
  video_url: string;
  video_filename: string;
  video_size: number;
  video_content_type: string;
  created_at: string;
};
