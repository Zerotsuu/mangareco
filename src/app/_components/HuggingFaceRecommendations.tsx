// src/components/HuggingFaceRecommendations.tsx
import { api } from "~/utils/api";

export const HuggingFaceRecommendations: React.FC = () => {
  const { data, isLoading, error } = api.recommendation.getHuggingFaceRecommendations.useQuery({
    limit: 10
  });

  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;
  if (!data?.items.length) return <div>No recommendations found</div>;

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
      {data.items.map((manga) => (
        <div key={manga.id} className="relative rounded-lg border p-4 shadow">
          <img
            src={manga.coverImage}
            alt={manga.title}
            className="w-full rounded-lg"
          />
          <h3 className="mt-2 text-lg font-semibold">{manga.title}</h3>
          <div className="mt-1 text-sm text-gray-600">
            Score: {Math.round(manga.mlScore * 100)}%
          </div>
        </div>
      ))}
    </div>
  );
};