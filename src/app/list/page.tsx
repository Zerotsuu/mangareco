'use client';
import React, { useState, useEffect } from 'react';
import { api } from '~/utils/api';
import Image from 'next/image';
import Link from 'next/link';
import { MangaCard } from '../_components/MangaCard';

interface MangaDetails {
  id: number;
  title: string;
  coverImage: string;
}

interface MangaListItem {
  id: number;
  mangaId: number;
  status: string;
  likeStatus: string | null;
}

const UserListPage: React.FC = () => {
  const { data: userData, isLoading } = api.mangaList.getUserList.useQuery();
  const [mangaIds, setMangaIds] = useState<number[]>([]);

  const { data: mangaData } = api.manga.getByIds.useQuery(
    { ids: mangaIds },
    { enabled: mangaIds.length > 0 }
  );

  useEffect(() => {
    if (userData?.mangaList) {
      const ids = userData.mangaList.map(item => item.mangaId);
      setMangaIds(ids);
    }
  }, [userData]);

  if (isLoading) return <div>Loading...</div>;

  console.log("User data", userData);
  console.log("Manga data", mangaData);

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">Your Manga List</h1>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {userData?.mangaList?.map((item: MangaListItem) => {
          const manga = mangaData?.find(m => m.id === item.mangaId);
          return (  
            <MangaCard
                  key={item.id}
                  id={item.mangaId}
                  title={manga?.title ?? `Manga ${item.mangaId}`}
                  coverImage={manga?.coverImage ?? ''}
                  status={item.status}
                  likeStatus={item.likeStatus}
                />
          );
        })}
      </div>
    </div>
  );
};

export default UserListPage;