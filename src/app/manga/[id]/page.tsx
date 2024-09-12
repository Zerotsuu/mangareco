// app/manga/[id]/page.tsx
import { api } from '~/utils/api';
import { MangaDetailsView } from '~/app/_components/MangaDetailsView';

export default async function MangaDetails({ params }: { params: { id: number } }) {
  const { data: manga, isLoading } = api.manga.getById.useQuery({ id: params.id });

  if (isLoading) return <div>Loading...</div>;

  return <MangaDetailsView manga = {manga ?? null} />;
}