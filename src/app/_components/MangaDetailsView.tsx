//app/_components/MangaDetailsView.tsx
'use client';

import React from 'react';
import Image from 'next/image';
import { AddToListButton } from './AddToListButton';
import { LikeDislikeButton } from './LikeDislikeButton';
import { RemoveFromListButton } from './RemoveFromListButton';

// type MangaDetails = RouterOutputs['manga']['getById'];
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
}

export const MangaDetailsView: React.FC<MangaDetailsViewProps> = ({ manga }) => {
  if (!manga) return <div>Manga not found</div>;

  return (
    <div className="container mx-auto px-4 py-8">
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
            <LikeDislikeButton mangaId={manga.id} initialLikeStatus={manga.userLikeStatus} />
            {manga.isInUserList ? (
              <RemoveFromListButton mangaId={manga.id} />
            ) : (
              <AddToListButton mangaId={manga.id} />
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