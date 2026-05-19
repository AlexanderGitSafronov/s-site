# s-site

Каталог сайтов с видео-превью. Загружай zip-архив сайта + короткое видео, скачивай оба файла.

## Стек

- Next.js 15 (App Router) + TypeScript + Tailwind
- Neon Postgres — метаданные
- Vercel Blob — файлы (прямые клиентские загрузки, без 4.5 МБ лимита API)
- Хостинг: Vercel

## Локальный запуск

```bash
npm install
cp .env.example .env.local   # вписать DATABASE_URL и BLOB_READ_WRITE_TOKEN
npm run db:init              # создать таблицу в Neon
npm run dev
```

## Деплой

Подключён к Vercel — каждый push в `main` триггерит сборку. Env vars (`DATABASE_URL`, `BLOB_READ_WRITE_TOKEN`) задаются в Vercel Project Settings.
