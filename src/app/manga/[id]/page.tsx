// app/manga/[id]/page.tsx
import { api } from '~/trpc/server';
import { MangaDetailsView } from '~/app/_components/MangaDetailsView';

export default async function MangaDetails({ params }: { params: { id: number } }) {
  const mangaId = Number(params.id);
  
  const manga = await api.manga.getById({ id: mangaId });

  return <MangaDetailsView manga={manga ?? null} />;
}