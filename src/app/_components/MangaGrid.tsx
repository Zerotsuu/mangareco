'use client';
import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { api } from '~/utils/api';
import type { MangaPreview } from '~/server/api/routers/manga';

interface MangaGridProps {
  initialPage?: number;
  perPage?: number;
  manga?: MangaPreview[];
  showPagination?: boolean;
}

export const MangaGrid: React.FC<MangaGridProps> = ({ 
  initialPage = 1, 
  perPage = 20, 
  manga,
  showPagination = true
}) => {
  const [page, setPage] = React.useState(initialPage);
  const { data, isLoading, error } = api.manga.getPopular.useQuery(
    { page, perPage },
    { enabled: !manga } // Only run this query if manga prop is not provided
  );

  const displayManga = manga ?? data?.manga;

  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;
  if (!displayManga) return <div>No manga found</div>;

  return (
    <div>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
        {displayManga.map((item: MangaPreview) => (
          <Link href={`/manga/${item.id}`} key={item.id} className="block">
            <div className="bg-white rounded-lg shadow-md p-4 overflow-hidden">
              <Image
                src={item.coverImage}
                alt={item.title}
                width={200}
                height={300}
                className="w-full h-96 object-cover mb-2 rounded"
              />
              <div className="p-2">
                <h3 className="text-sm font-medium truncate">{item.title}</h3>
                {/* <p className="text-xs text-gray-500">Score: {item.averageScore.toFixed(2)}</p> */}
              </div>
            </div>
          </Link>
        ))}
      </div>
      {showPagination && data?.pageInfo && (
        <div className="flex justify-center mt-4">
          <button
            onClick={() => setPage((prev) => prev - 1)}
            disabled={page === 1}
            className="bg-white text-gray-800 font-bold py-2 px-4 rounded-lg shadow-md hover:bg-gray-100 mr-2"
          >
            Previous
          </button>
          <button
            onClick={() => setPage((prev) => prev + 1)}
            disabled={!data.pageInfo.hasNextPage}
            className="bg-white text-gray-800 font-bold py-2 px-4 rounded-lg shadow-md hover:bg-gray-100"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
};