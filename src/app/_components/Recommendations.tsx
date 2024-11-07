'use client';

import React, { useState, useCallback, useRef, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { api } from '~/utils/api';
import { 
  Loader2, 
  BookPlus, 
  RefreshCcw, 
  AlertCircle,
  ChevronDown,
  Filter,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { MangaCard } from './MangaCard';
// import debounce from 'lodash.debounce';
// import { useInView } from 'react-intersection-observer';
import { RecommendationSettings } from './RecommendationSettings';

interface RecommendationResponse {
  items: MangaRecommendation[];
  hasMore: boolean;
  timing: number;
  source: 'cache' | 'fresh';
}


interface MangaRecommendation {
  id: number;
  title: string;
  coverImage: string;
  averageScore: number;
  genres: string[];
  similarity: number;
  description?: string;
}

interface FilterOptions {
  minScore: number;
  genres: string[];
  excludeGenres: string[];
}

export const MangaRecommendations: React.FC = () => {
  const ITEMS_PER_PAGE = 10;
  const [isGenerating, setIsGenerating] = useState(false);
  const [recommendations, setRecommendations] = useState<MangaRecommendation[]>([]);
  const [filters, setFilters] = useState<FilterOptions>({
    minScore: 0,
    genres: [],
    excludeGenres: [],
  });
  const [showFilters, setShowFilters] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Get user's list first
  const { 
    data: userList,
    isLoading: isLoadingList 
  } = api.mangaList.getUserList.useQuery(undefined, {
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });

  // Query for recommendations
  const {
    data: recommendationData,
    isLoading: isLoadingRecs,
    error: recommendationError,
    refetch,
    isFetching
  } = api.recommendation.getRecommendations.useQuery(
    { 
      excludeIds: recommendations.map(r => r.id),
      limit: 10,
      ...filters,
    },
    { 
      enabled: false,
      staleTime: Infinity,
      retry: 3,
      // retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    }
  );

  // For clearing recommendation history
  const clearHistoryMutation = api.recommendation.clearHistory.useMutation({
    onSuccess: () => {
      setRecommendations([]);
      void refetch();
    },
  });

  // Debounced filter updates
  const debouncedFilterUpdate = useCallback((_newFilters: FilterOptions) => {
    void refetch();
  }, [refetch]);

  // Update recommendations when new data arrives
  useEffect(() => {
    if (recommendationData?.items && !isFetching) {
      setRecommendations(prev => {
        if (prev.length === 0) {
          return recommendationData.items;
        }
        const existingIds = new Set(prev.map(r => r.id));
        const newItems = recommendationData.items.filter(item => !existingIds.has(item.id));
        return [...prev, ...newItems];
      });
    }
  }, [recommendationData, isFetching]);
  

  const handleGetRecommendations = async () => {
    setIsGenerating(true);
    setError(null);
    try {
      setRecommendations([]); // Clear existing recommendations
      const result = await refetch();
      if (result.data?.items) {
        setRecommendations(result.data.items);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to get recommendations');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleRefresh = async () => {
    setIsGenerating(true);
    setError(null);
    try {
      await clearHistoryMutation.mutateAsync();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to refresh recommendations');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleLoadMore = async () => {
    try {
      await refetch();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load more recommendations');
    }
  };

  // Loading state
  if (isLoadingList) {
    return (
      <div className="text-center py-12">
        <Loader2 className="animate-spin mx-auto h-8 w-8 mb-4" />
        <p className="text-gray-600">Loading your manga list...</p>
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
  console.log("recommendationData : ============", recommendationData?.hasMore );
  return (
    <div className="space-y-6">
      {/* Control Panel */}
      <div className="bg-white p-6 rounded-lg shadow">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <div className="w-full sm:w-auto flex gap-2">
            <button
              onClick={handleGetRecommendations}
              disabled={isGenerating || isLoadingRecs}
              className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-blue-500 text-white px-6 py-2 rounded-lg hover:bg-blue-600 disabled:bg-blue-300 disabled:cursor-not-allowed transition-colors"
            >
              {(isGenerating || isLoadingRecs) && <Loader2 className="animate-spin" size={18} />}
              {isGenerating || isLoadingRecs ? 'Generating...' : 'Get Recommendations'}
            </button>
            
            {recommendations.length > 0 && (
              <button
                onClick={handleRefresh}
                disabled={isGenerating || isLoadingRecs}
                className="flex items-center justify-center gap-2 bg-gray-100 text-gray-700 px-3 py-2 rounded-lg hover:bg-gray-200 disabled:bg-gray-50 disabled:text-gray-400 disabled:cursor-not-allowed transition-colors"
                title="Get fresh recommendations"
              >
                <RefreshCcw size={18} />
              </button>
            )}

            {/* <button
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center gap-2 bg-gray-100 text-gray-700 px-3 py-2rounded-lg hover:bg-gray-200 transition-colors"
              title="Filter recommendations"
            >
              <Filter size={18} />
              <ChevronDown
                size={16}
                className={`transform transition-transform duration-200 ${
                  showFilters ? 'rotate-180' : ''
                }`}
              />
            </button> */}
          </div>
          {/* Settings */}
        <RecommendationSettings />
        </div>

        {/* Filter Panel */}
        <AnimatePresence>
          {showFilters && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div className="mt-4 p-4 border rounded-lg bg-gray-50">
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {/* Minimum Score Filter */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Minimum Score: {filters.minScore}
                    </label>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={filters.minScore}
                      onChange={(e) => {
                        const newFilters = {
                          ...filters,
                          minScore: parseInt(e.target.value)
                        };
                        setFilters(newFilters);
                        debouncedFilterUpdate(newFilters);
                      }}
                      className="w-full"
                    />
                  </div>

                  {/* Genre Filters */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Include Genres
                    </label>
                    <select
                      multiple
                      value={filters.genres}
                      onChange={(e) => {
                        const selectedGenres = Array.from(
                          e.target.selectedOptions,
                          option => option.value
                        );
                        const newFilters = {
                          ...filters,
                          genres: selectedGenres
                        };
                        setFilters(newFilters);
                        debouncedFilterUpdate(newFilters);
                      }}
                      className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    >
                      {AVAILABLE_GENRES.map(genre => (
                        <option key={genre} value={genre}>
                          {genre}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Exclude Genres */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Exclude Genres
                    </label>
                    <select
                      multiple
                      value={filters.excludeGenres}
                      onChange={(e) => {
                        const selectedGenres = Array.from(
                          e.target.selectedOptions,
                          option => option.value
                        );
                        const newFilters = {
                          ...filters,
                          excludeGenres: selectedGenres
                        };
                        setFilters(newFilters);
                        debouncedFilterUpdate(newFilters);
                      }}
                      className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    >
                      {AVAILABLE_GENRES.map(genre => (
                        <option key={genre} value={genre}>
                          {genre}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="mt-4 flex justify-end">
                  <button
                    onClick={() => {
                      const defaultFilters = {
                        minScore: 0,
                        genres: [],
                        excludeGenres: []
                      };
                      setFilters(defaultFilters);
                      debouncedFilterUpdate(defaultFilters);
                    }}
                    className="text-sm text-gray-600 hover:text-gray-900"
                  >
                    Reset Filters
                  </button>
                </div>
              </div>
              
            </motion.div>
          )}
          
      
        </AnimatePresence>
        

        {/* Stats */}
        <div className="mt-4 text-sm text-gray-600">
          <p>Based on {userList.mangaList.length} manga in your list</p>
          {recommendations.length > 0 && (
            <p>Found {recommendations.length} recommendations</p>
          )}
          {recommendationData?.timing && (
            <p>Generated in {(recommendationData.timing / 1000).toFixed(2)}s</p>
          )}
        </div>
      </div>

      

      {/* Error Display */}
      {(error ?? recommendationError) && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-red-50 border border-red-200 text-red-600 px-6 py-4 rounded-lg flex items-start gap-3"
        >
          <AlertCircle className="flex-shrink-0 h-5 w-5 mt-0.5" />
          <div>
            <p className="font-medium">Error getting recommendations</p>
            <p className="text-sm mt-1">
              {error ?? recommendationError?.message ?? 'Please try again later'}
            </p>
          </div>
        </motion.div>
      )}

      {/* Results Grid */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3 }}
      >
        {recommendations.length > 0 ? (
          <div className="space-y-6">
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {recommendations.map((manga, index) => (
                <motion.div
                  key={manga.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                >
                  <MangaCard
                  
                        key={manga.id}
                        id={manga.id}
                        title={manga.title}
                        coverImage={manga.coverImage}
                        averageScore={manga.averageScore}
                        genres={manga.genres}
                        similarity={manga.similarity}                     
                  />
                </motion.div>
              ))}
            </div>

            
           {/* Load More Button */}
          

{recommendations.length > 0 && recommendations.length % ITEMS_PER_PAGE === 0 && (
  <div className="flex justify-center mt-8">
    <button
      onClick={handleLoadMore}
      disabled={isLoadingRecs || isFetching}
      className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-3 rounded-lg 
        disabled:bg-blue-300 disabled:cursor-not-allowed transition-colors
        flex items-center gap-2"
    >
      {(isLoadingRecs || isFetching) && (
        <Loader2 className="animate-spin" size={20} />
      )}
      {isLoadingRecs || isFetching ? 'Loading...' : 'Load More Recommendations'}
    </button>
  </div>
)}
          </div>
        )  : null}
      </motion.div>
    </div>
  );
  
};


// Available genres for filtering
const AVAILABLE_GENRES = [
  'Action', 'Adventure', 'Comedy', 'Drama', 'Fantasy', 'Horror',
  'Mystery', 'Romance', 'Sci-Fi', 'Slice of Life', 'Sports', 'Supernatural',
  'Thriller'
];

export default MangaRecommendations;