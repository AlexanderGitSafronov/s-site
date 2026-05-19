import { sql, type Item } from "@/lib/db";
import { ItemCard } from "@/components/item-card";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const rows = (await sql`
    SELECT id, title, description, site_url, site_filename, site_size,
           video_url, video_filename, video_size, video_content_type, created_at
    FROM items
    ORDER BY created_at DESC
  `) as Item[];

  if (rows.length === 0) {
    return (
      <div className="text-center py-20">
        <h1 className="text-2xl font-semibold mb-2">Пока пусто</h1>
        <p className="text-neutral-400">Загрузите первый сайт и видео-превью.</p>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold mb-6">Каталог ({rows.length})</h1>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {rows.map((item) => (
          <ItemCard key={item.id} item={item} />
        ))}
      </div>
    </div>
  );
}
