'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { api } from '~/utils/api';
import { Loader2, BookPlus } from 'lucide-react';
import { RecommendationSettings } from './RecommendationSettings';

export const MangaRecommendations: React.FC = () => {
  const [numRecommendations, setNumRecommendations] = useState(10);
  const [isGenerating, setIsGenerating] = useState(false);

  // Get user's list first
  const { 
    data: userList,
    isLoading: isLoadingList 
  } = api.mangaList.getUserList.useQuery();

  const { 
    data: recommendations,
    isLoading: isLoadingRecs,
    error,
    refetch
  } = api.recommendation.getRecommendations.useQuery(
    { numRecommendations },
    { 
      enabled: false,
      retry: false // Don't retry on error
    }
  );

  const handleGetRecommendations = async () => {
    setIsGenerating(true);
    try {
      await refetch();
    } catch (error) {
      console.error('Error fetching recommendations:', error);
      setIsGenerating(false);
    }
  };

  if (isLoadingList) {
    return (
      <div className="text-center py-12">
        <Loader2 className="animate-spin mx-auto h-8 w-8 mb-4" />
        <p>Loading your manga list...</p>
      </div>
    );
  }

  // Check if user has any manga in their list
  if (!userList?.mangaList?.length) {
    return (
      <div className="text-center py-12 max-w-md mx-auto">
        <BookPlus className="mx-auto h-12 w-12 text-gray-400 mb-4" />
        <h2 className="text-xl font-semibold mb-4">Start Your Manga List</h2>
        <p className="text-gray-600 mb-6">
          To get personalized recommendations, you need to add some manga to your list first.
          Try adding at least 5 manga to get better recommendations!
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
      {/* Control Panel */}
      <div className="bg-white p-6 rounded-lg shadow">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <div className="flex-1">
            <label htmlFor="numRecommendations" className="block text-sm font-medium text-gray-700 mb-1">
              Number of recommendations
            </label>
            <input
              id="numRecommendations"
              type="number"
              value={numRecommendations}
              onChange={(e) => setNumRecommendations(Math.min(20, Math.max(1, parseInt(e.target.value) || 1)))}
              min={1}
              max={20}
              className="border rounded px-3 py-1.5 w-24"
            />
          </div>
          <div className="w-full sm:w-auto">
            <button
              onClick={handleGetRecommendations}
              disabled={isGenerating || isLoadingRecs}
              className="w-full sm:w-auto flex items-center justify-center gap-2 bg-blue-500 text-white px-6 py-2 rounded-lg hover:bg-blue-600 disabled:bg-blue-300 disabled:cursor-not-allowed transition-colors"
            >
              {(isGenerating || isLoadingRecs) && <Loader2 className="animate-spin" size={18} />}
              {isGenerating || isLoadingRecs ? 'Generating...' : 'Get Recommendations'}
            </button>
          </div>
        </div>

        {/* Information about user's list */}
        <div className="mt-4 text-sm text-gray-600">
          <p>Based on {userList.mangaList.length} manga in your list</p>
        </div>
      </div>

      <div className="mb-8">
        <RecommendationSettings />
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-600 px-6 py-4 rounded-lg">
          <p className="font-medium">Error getting recommendations</p>
          <p className="text-sm mt-1">{error.message}</p>
        </div>
      )}

      {/* Results Grid */}
      {recommendations && recommendations.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {recommendations.map((manga) => (
            <Link 
              key={manga.id} 
              href={`/manga/${manga.id}`}
              className="block group"
            >
              <div className="border rounded-lg overflow-hidden bg-white shadow hover:shadow-lg transition-shadow">
                <div className="relative aspect-[2/3] overflow-hidden">
                  <Image
                    src={manga.coverImage}
                    alt={manga.title}
                    fill
                    className="object-cover group-hover:scale-105 transition-transform duration-200"
                    sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, (max-width: 1024px) 25vw, 20vw"
                  />
                </div>
                <div className="p-3">
                  <h3 className="font-semibold text-sm mb-1 truncate" title={manga.title}>
                    {manga.title}
                  </h3>
                  <div className="space-y-1">
                    <p className="text-xs text-gray-600">
                      Score: {manga.averageScore.toFixed(1)}
                    </p>
                    <p className="text-xs text-gray-600">
                      Match: {(manga.similarity * 100).toFixed(0)}%
                    </p>
                    <p className="text-xs text-gray-500 truncate" title={manga.genres.join(', ')}>
                      {manga.genres.join(', ')}
                    </p>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      ) : recommendations && recommendations.length === 0 ? (
        <div className="text-center py-8 bg-gray-50 rounded-lg">
          <p className="text-gray-600">No recommendations found. Try adding more manga to your list.</p>
        </div>
      ) : null}
    </div>
  );
};