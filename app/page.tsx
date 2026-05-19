import Link from "next/link";
import { sql, type Item } from "@/lib/db";
import { ItemRow } from "@/components/item-row";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const rows = (await sql`
    SELECT id, title, description, author, site_url, site_filename, site_size,
           video_url, video_filename, video_size, video_content_type,
           image_url, image_filename, image_size, image_content_type,
           play_url, play_prefix, created_at
    FROM items
    ORDER BY created_at DESC
  `) as Item[];

  if (rows.length === 0) {
    return (
      <div className="text-center py-32 max-w-md mx-auto">
        <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-violet-500/20 to-indigo-500/20 border border-white/10 flex items-center justify-center">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-10 h-10 text-violet-300">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 12h16.5m-16.5 3.75h16.5M3.75 19.5h16.5M5.625 4.5h12.75a1.875 1.875 0 010 3.75H5.625a1.875 1.875 0 010-3.75z" />
          </svg>
        </div>
        <h1 className="text-3xl font-semibold tracking-tight mb-3">Каталог пуст</h1>
        <p className="text-neutral-400 mb-8">Загрузите первую игру с архивом, видео-превью и обложкой.</p>
        <Link href="/upload" className="btn-primary">
          <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
            <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z" />
          </svg>
          Добавить первую игру
        </Link>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-end justify-between mb-8">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Каталог</h1>
          <p className="text-sm text-neutral-400 mt-1">
            {rows.length} {plural(rows.length, ["игра", "игры", "игр"])}
          </p>
        </div>
      </div>
      <div className="flex flex-col gap-3">
        {rows.map((item) => (
          <ItemRow key={item.id} item={item} />
        ))}
      </div>
    </div>
  );
}

function plural(n: number, forms: [string, string, string]) {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return forms[0];
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return forms[1];
  return forms[2];
}
