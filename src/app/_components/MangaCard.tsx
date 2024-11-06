import Image from 'next/image';
import Link from 'next/link';
import { useMangaModal } from '../_contexts/MangaModalContext';

interface MangaCardProps {
  id: number;
  title: string;
  coverImage: string;
  averageScore?: number;
  genres?: string[];
  similarity?: number;
  status?: string;
  likeStatus?: string | null;
  userCount?: number;
}

export const MangaCard: React.FC<MangaCardProps> = ({
  id,
  title,
  coverImage,
  averageScore,
  genres,
  similarity,
  status,
  likeStatus,
  userCount
}) => {
    const { openMangaModal } = useMangaModal();

    return (
        <div 
          onClick={() => openMangaModal(id)}
          className="cursor-pointer block group"
        >
          <div className="border rounded-lg overflow-hidden bg-white shadow-sm hover:shadow-md transition-shadow duration-200">
            <div className="relative aspect-[2/3] overflow-hidden">
              <Image
                src={coverImage}
                alt={title}
                fill
                className="object-cover group-hover:scale-105 transition-transform duration-200"
                sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, (max-width: 1024px) 25vw, 20vw"
              />
            </div>
            <div className="p-3">
              <h3 className="font-semibold text-sm mb-1 truncate" title={title}>
                {title}
              </h3>
              <div className="space-y-1">
                {(averageScore ?? similarity ?? userCount) && (
                  <div className="flex justify-between items-center">
                    {averageScore && (
                      <p className="text-xs text-gray-600">
                        Score: {averageScore.toFixed(1)}
                      </p>
                    )}
                    {similarity && (
                      <p className="text-xs font-medium text-blue-600">
                        {(similarity * 100).toFixed(0)}% Match
                      </p>
                    )}
                    {userCount && (
                      <p className="text-xs font-medium text-blue-600">
                        {userCount} Users
                      </p>
                    )}
                  </div>
                )}
                {status && (
                  <p className="text-xs text-gray-600">Status: {status}</p>
                )}
                {genres && genres.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {genres.slice(0, 2).map((genre) => (
                      <span
                        key={genre}
                        className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded"
                      >
                        {genre}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      );
};