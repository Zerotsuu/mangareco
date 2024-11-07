//app/_components/MangaDetailsView.tsx
'use client';

import React from 'react';
import Image from 'next/image';
import { AddToListButton } from './AddToListButton';
import { LikeDislikeButton } from './LikeDislikeButton';
import { RemoveFromListButton } from './RemoveFromListButton';
import { api } from '~/utils/api';
import { LoadingSpinner } from './LoadingSpinner';
import LicensedMangaSources from './MangaSources';
import MangaDescription from './MangaDescription';

interface MangaDetails {
  id: number;
  title: string;
  author: string;
  coverImage: string;
  averageScore: number;
  genres: string[];
  description: string;
  userLikeStatus: 'like'|'dislike'| null;
  isInUserList: boolean;
}

interface MangaDetailsViewProps {
  manga: MangaDetails | null;
  isModal?: boolean;
}

export const MangaDetailsView: React.FC<MangaDetailsViewProps> = ({ manga: initialManga, isModal = false }) => {
  const utils = api.useContext();
  
  // Fetch real-time manga data
  const { data: manga } = api.manga.getById.useQuery(
    { id: initialManga?.id ?? 0 },
    { 
      initialData: initialManga ?? undefined,
      enabled: !!initialManga 
    }
  );

  if (!manga) return <LoadingSpinner />;

  return (
    <div className={`${isModal ? 'p-6' : 'container mx-auto px-4 py-8'} max-w-6xl`}>
      <div className="flex flex-col md:flex-row gap-8">
        {/* Increased image container size */}
        <div className="md:w-2/5">
          <div className="sticky top-4">
            <Image
              src={manga.coverImage}
              alt={manga.title}
              width={500}
              height={750}
              className="rounded-lg shadow-md w-full h-auto object-contain"
              priority
            />
          </div>
        </div>

        <div className="md:w-3/5 space-y-6">
          {/* Title and Author */}
          <div>
            <h1 className="text-4xl font-bold mb-2">{manga.title}</h1>
            <p className="text-xl text-gray-600">by {manga.author}</p>
          </div>

          {/* Action Buttons and Score */}
          <div className="flex items-center gap-4">
            <LikeDislikeButton 
              mangaId={manga.id} 
              initialLikeStatus={manga.userLikeStatus}
              onSuccess={() => {
                void utils.manga.getById.invalidate({ id: manga.id });
              }}
            />
            {manga.isInUserList ? (
              <RemoveFromListButton 
                mangaId={manga.id}
                onSuccess={() => {
                  void utils.manga.getById.invalidate({ id: manga.id });
                  void utils.mangaList.getUserList.invalidate();
                }}
              />
            ) : (
              <AddToListButton 
                mangaId={manga.id}
                onSuccess={() => {
                  void utils.manga.getById.invalidate({ id: manga.id });
                  void utils.mangaList.getUserList.invalidate();
                }}
              />
            )}
            <div className="ml-2 text-lg font-semibold bg-gray-100 px-4 py-2 rounded-full">
              Score: {manga.averageScore}
            </div>
          </div>

          {/* Genres */}
          <div className="flex flex-wrap gap-2">
            {manga.genres.map((genre: string) => (
              <span
                key={genre}
                className="bg-gray-200 rounded-full px-4 py-2 text-sm font-semibold text-gray-700"
              >
                {genre}
              </span>
            ))}
          </div>

          {/* Description */}
          <div className="bg-gray-50 rounded-lg p-4">
            <MangaDescription description={manga.description} />
          </div>

          {/* Sources */}
          <div>
            <LicensedMangaSources mangaTitle={manga.title} />
          </div>
        </div>
      </div>
    </div>
  );
};