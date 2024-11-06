'use client';

import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { api } from '~/utils/api';
import { Loader2, BookPlus } from 'lucide-react';

interface MangaRecommendation {
  id: number;
  title: string;
  coverImage: string;
  averageScore: number;
  genres: string[];
  similarity: number;
  description?: string;
}

export const DiscoverSection: React.FC = () => {
  const [recommendations, setRecommendations] = React.useState<MangaRecommendation[]>([]);

  const {
    data: recommendationData,
    isLoading,
    error
  } = api.recommendation.getCollaborativeRecommendations.useQuery(
    { limit: 20 },
    {
      staleTime: 5 * 60 * 1000, // 5 minutes
      retry: 2,
    }
  );

  React.useEffect(() => {
    if (recommendationData?.items) {
      setRecommendations(recommendationData.items);
    }
  }, [recommendationData]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-red-500">{error.message}</p>
      </div>
    );
  }

  if (!recommendations.length) {
    return (
      <div className="text-center py-12 max-w-md mx-auto">
        <BookPlus className="mx-auto h-12 w-12 text-gray-400 mb-4" />
        <h2 className="text-xl font-semibold mb-4">Start Your Manga Journey</h2>
        <p className="text-gray-600 mb-6">
          Add some manga to your list to get personalized recommendations!
        </p>
        <Link
          href="/"
          className="inline-block bg-blue-500 text-white px-6 py-3 rounded-lg hover:bg-blue-600 transition-colors"
        >
          Browse Popular Manga
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
     
      {/* Recommendations Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
        {recommendations.map((manga) => (
          <Link
            key={manga.id}
            href={`/manga/${manga.id}`}
            className="group"
          >
            <div className="bg-white rounded-lg shadow-sm overflow-hidden">
              <div className="relative aspect-[2/3]">
                <Image
                  src={manga.coverImage}
                  alt={manga.title}
                  fill
                  className="object-cover group-hover:scale-105 transition-transform duration-200"
                  sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, (max-width: 1024px) 25vw, 20vw"
                />
              </div>
              <div className="p-3">
                <h3 
                  className="font-medium text-sm mb-1 truncate"
                  title={manga.title}
                >
                  {manga.title}
                </h3>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-gray-600">
                    Score: {manga.averageScore.toFixed(1)}
                  </span>
                  <span className="text-blue-600 font-medium">
                    {(manga.similarity * 100).toFixed(0)}% Match
                  </span>
                </div>
                <div className="mt-2 flex flex-wrap gap-1">
                  {manga.genres.slice(0, 2).map((genre) => (
                    <span
                      key={genre}
                      className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded"
                    >
                      {genre}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
};