import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { api } from '~/utils/api';

interface MangaRecommendation {
  title: string;
  coverImage: string;
  averageScore: number;
  genres: string[];
}

export const MangaRecommendations: React.FC = () => {
  const [recommendations, setRecommendations] = useState<MangaRecommendation[]>([]);
  const [numRecommendations, setNumRecommendations] = useState<number>(10);

  const { 
    data,
    refetch, 
    isLoading, 
    error 
  } = api.recommendation.getRecommendations.useQuery(
    { numRecommendations },
    {
      enabled: false, // This prevents the query from running on component mount
    }
  );

  useEffect(() => {
    if (data && Array.isArray(data) && data.every(item => typeof item === 'object')) {
      setRecommendations(data as MangaRecommendation[]);
    } else {
      console.error('Data is not in the correct MangaRecommendation[] format', data);
    }
  }, [data]);

  useEffect(() => {
    if (error) {
      console.error('Error fetching recommendations:', error);
    }
  }, [error]);

  const handleGetRecommendations = () => {
    refetch().catch(err => {
      console.error('Error refetching recommendations:', err);
    });
  };

  const handleNumRecommendationsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value, 10);
    if (!isNaN(value) && value >= 1 && value <= 20) {
      setNumRecommendations(value);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <h2 className="text-2xl font-bold mb-4">Manga Recommendations</h2>
      <div className="mb-4">
        <label htmlFor="numRecommendations" className="mr-2">Number of recommendations:</label>
        <input
          id="numRecommendations"
          type="number"
          value={numRecommendations}
          onChange={handleNumRecommendationsChange}
          min={1}
          max={20}
          className="border rounded px-2 py-1"
        />
        <button
          onClick={handleGetRecommendations}
          disabled={isLoading}
          className="ml-2 bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 disabled:bg-blue-300"
        >
          {isLoading ? 'Loading...' : 'Get Recommendations'}
        </button>
      </div>
      {error && (
        <div className="text-red-500 mb-4">
          Error: {error.message}
        </div>
      )}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
        {recommendations.map((manga, index) => (
          <div key={index} className="border rounded-lg p-4 flex flex-col">
            <Image
              src={manga.coverImage}
              alt={manga.title}
              width={200}
              height={300}
              className="w-full h-64 object-cover mb-2 rounded"
            />
            <h3 className="font-semibold text-lg mb-1 truncate">{manga.title}</h3>
            <p className="text-sm text-gray-600 mb-1">Score: {manga.averageScore.toFixed(2)}</p>
            <p className="text-sm text-gray-600 truncate">{manga.genres.join(', ')}</p>
          </div>
        ))}
      </div>
    </div>
  );
};