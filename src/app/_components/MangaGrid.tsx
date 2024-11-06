'use client';
import React from 'react';
import { api } from '~/utils/api';
import type { MangaPreview } from '~/server/api/routers/manga';
import { MangaCard } from './MangaCard';
import { Loader2 } from 'lucide-react';

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

  if (isLoading) return (
    <div className="flex justify-center items-center py-12">
      <Loader2 className="animate-spin h-8 w-8" />
    </div>
  );
  
  if (error) return (
    <div className="text-center text-red-500 py-12">
      Error: {error.message}
    </div>
  );
  
  if (!displayManga) return (
    <div className="text-center text-gray-500 py-12">
      No manga found
    </div>
  );

  return (
    <div>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
        {displayManga.map((item: MangaPreview) => (
          <MangaCard
            key={item.id}
            id={item.id}
            title={item.title}
            coverImage={item.coverImage}
            averageScore={item.averageScore}
            genres={item.genres ?? []}
          />
        ))}
      </div>
      
      {showPagination && data?.pageInfo && (
        <div className="flex justify-center mt-8">
          <button
            onClick={() => setPage((prev) => prev - 1)}
            disabled={page === 1}
            className="bg-white text-gray-800 font-bold py-2 px-4 rounded-lg shadow-md hover:bg-gray-100 mr-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Previous
          </button>
          <button
            onClick={() => setPage((prev) => prev + 1)}
            disabled={!data.pageInfo.hasNextPage}
            className="bg-white text-gray-800 font-bold py-2 px-4 rounded-lg shadow-md hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
};