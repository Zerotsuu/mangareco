// src/app/_components/DiscoverSection.tsx
'use client'
import { api } from "~/trpc/react";
import { useEffect, useState } from "react";
import { MangaCard } from "./MangaCard";
import { LoadingSpinner } from "./LoadingSpinner";

export function DiscoverSection() {
  const [excludeIds, setExcludeIds] = useState<number[]>([]);
  
  const { data, isLoading, error } = api.recommendation.getHuggingFaceRecommendations.useQuery({
    limit: 20,
    excludeIds: excludeIds,
  });

  if (isLoading) {
    return <LoadingSpinner />;
  }

  if (error) {
    return (
      <div className="text-red-500">
        {error.message}
      </div>
    );
  }

  if (!data?.items.length) {
    return (
      <div className="text-gray-500">
        No recommendations found. Try adding more manga to your list!
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">
      {data.items.map((manga) => (
        <MangaCard
          key={manga.id}
          id={manga.id}
          title={manga.title}
          coverImage={manga.coverImage}
          averageScore={manga.averageScore}
          genres={manga.genres}
          // Convert mlScore to a percentage if you want to show it as userCount
          userCount={manga.mlScore ? Math.round(manga.mlScore * 100) : undefined}
        />
      ))}
      {data.timing && (
        <div className="text-sm text-gray-500 mt-4">
          Generated in {Math.round(data.timing)}ms
        </div>
      )}
    </div>
  );
}