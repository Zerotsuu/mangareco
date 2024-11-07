'use client';
import React from 'react';
import { api } from '~/utils/api';
import type { MangaPreview } from '~/server/api/routers/manga';
import { MangaCard } from './MangaCard';
import { Loader2 } from 'lucide-react';

interface MangaGridProps {
  initialPage?: number;
  currentPage?: number;
  perPage?: number;
  manga?: MangaPreview[];
  showPagination?: boolean;
  queryType?: 'trending' | 'allTimePopular' | 'top100';
}


export const MangaGrid: React.FC<MangaGridProps> = ({ 
  initialPage = 1, 
  currentPage,
  perPage = 20, 
  manga,
  showPagination = true,
  queryType = 'allTimePopular'
}) => {
  const [page, setPage] = React.useState(initialPage);

  // Get the appropriate query based on type
  const queryResponse = (() => {
    if (manga) return null;

    switch (queryType) {
      case 'trending':
        return api.manga.getTrending.useQuery({ page: currentPage ?? 1, perPage });
      case 'top100':
        return api.manga.getTop100.useQuery({ page: currentPage ?? 1, perPage });
      case 'allTimePopular':
      default:
        return api.manga.getAllTimePopular.useQuery({ page:currentPage ?? 1, perPage });
    }
  })();

  const isLoading = queryResponse?.isLoading ?? false;
  const error = queryResponse?.error;
  const data = queryResponse?.data;
  const displayManga = manga ?? data?.manga;

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-12">
        <Loader2 className="animate-spin h-8 w-8" />
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="text-center text-red-500 py-12">
        Error: {error.message}
      </div>
    );
  }
  
  if (!displayManga?.length) {
    return (
      <div className="text-center text-gray-500 py-12">
        No manga found
      </div>
    );
  }

  return (
    <div>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
        {displayManga.map((manga: MangaPreview) => (
          <MangaCard
            key={manga.id}
            id={manga.id}
            title={manga.title}
            coverImage={manga.coverImage}
            averageScore={manga.averageScore}
            genres={manga.genres ?? []}
          />
        ))}
      </div>
      
      {showPagination && data?.pageInfo && (
        <div className="flex justify-center items-center gap-4 mt-8">
          <button
            onClick={() => setPage((prev) => prev - 1)}
            disabled={page === 1}
            className="bg-white text-gray-800 font-bold py-2 px-4 rounded-lg shadow-md hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Previous
          </button>

          <span className="text-sm text-gray-600">
            Page {page} of {data.pageInfo.lastPage}
          </span>

          <button
            onClick={() => setPage((prev) => prev + 1)}
            disabled={!data.pageInfo.hasNextPage}
            className="bg-white text-gray-800 font-bold py-2 px-4 rounded-lg shadow-md hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
};