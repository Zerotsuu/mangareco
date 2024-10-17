'use client';
import React, { useState, useEffect } from 'react';
import { api } from '~/utils/api';
import Image from 'next/image';
import Link from 'next/link';

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
            <Link key={item.id} href={`/manga/${item.mangaId}`}>
              <div className="border rounded-lg p-4 shadow-md text-center">
                {manga && (
                  <Image
                    src={manga.coverImage}
                    alt={manga.title}
                    width={200}
                    height={300}
                    className="w-full h-96 object-cover mb-2 rounded"
                  />
                )}
                <h2 className="text-xl font-semibold mb-2">{manga?.title ?? `Manga ${item.mangaId}`}</h2>
                <p className="text-gray-600">Status: {item.status}</p>
                {item.likeStatus && <p className="text-gray-600">Like Status: {item.likeStatus}</p>}
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
};

export default UserListPage;