//app/_components/MangaDetailsView.tsx
'use client';

import React from 'react';
import Image from 'next/image';
import { AddToListButton } from './AddToListButton';
import { LikeDislikeButton } from './LikeDislikeButton';
import { RemoveFromListButton } from './RemoveFromListButton';
import { api } from '~/utils/api';
import { LoadingSpinner } from './LoadingSpinner';
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
    <div className={isModal ? 'p-6':"container mx-auto px-4 py-8"}>
      <div className="flex flex-col md:flex-row">
        <div className="md:w-1/3">
          <Image
            src={manga.coverImage}
            alt={manga.title}
            width={300}
            height={450}
            className="rounded-lg shadow-md"
          />
        </div>
        <div className="md:w-2/3 md:ml-8 mt-4 md:mt-0">
          <h1 className="text-3xl font-bold">{manga.title}</h1>
          <p className="text-gray-600 mt-2">by {manga.author}</p>
          <div className="mt-4 flex items-center">
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
            <span className="ml-4 text-lg font-semibold">Score: {manga.averageScore}</span>
          </div>
          <div className="mt-4">
            {manga.genres.map((genre: string) => (
              <span
                key={genre}
                className="inline-block bg-gray-200 rounded-full px-3 py-1 text-sm font-semibold text-gray-700 mr-2 mb-2"
              >
                {genre}
              </span>
            ))}
          </div>
          <p className="mt-4">{manga.description}</p>
        </div>
      </div>
    </div>
  );
};