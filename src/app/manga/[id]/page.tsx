import { api } from '~/trpc/server';
import { MangaDetailsView } from '~/app/_components/MangaDetailsView';

export default async function MangaDetails({ params }: { params: { id: string } }) {
  const manga = await api.manga.getById({ id: parseInt(params.id, 10) });

  return <MangaDetailsView manga={manga} />;
}