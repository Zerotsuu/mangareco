import { MangaGrid } from '~/app/_components/MangaGrid';
import { api } from '~/trpc/server';
import type { MangaPreview } from '~/server/api/routers/manga';


export default async function Home() {
  const popularManga : MangaPreview[] = await api.manga.getPopular({ page: 1, perPage: 20 });

  return (
    <main className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">Popular Manga</h1>
      <MangaGrid manga={popularManga} />
    </main>
  );
}