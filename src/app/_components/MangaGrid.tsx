import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import type { MangaPreview } from '~/server/api/routers/manga';

// type Manga = RouterOutputs['manga']['getPopular'][number];
interface MangaGridProps {
  manga: MangaPreview[];
}

export const MangaGrid: React.FC<MangaGridProps> = ({ manga }) => {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
      {manga.map((item) => (
        <Link href={`/manga/${item.id}`} key={item.id} className="block">
          <div className="bg-white rounded-lg shadow-md overflow-hidden">
            <Image
              src={item.coverImage}
              alt={item.title}
              width={200}
              height={300}
              className="w-full h-auto"
            />
            <div className="p-2">
              <h3 className="text-sm font-medium truncate">{item.title}</h3>
              <p className="text-xs text-gray-500">Score: {item.averageScore}</p>
            </div>
          </div>
        </Link>
      ))}
    </div>
  );
};