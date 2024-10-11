// // app/search/page.tsx
// 'use client';

// import React from 'react';
// import { useSearchParams, useRouter } from 'next/navigation';
// import { api } from '~/utils/api';
// import { MangaGrid } from '~/app/_components/MangaGrid';

// export default function SearchResults() {
//   const searchParams = useSearchParams();
//   const router = useRouter();
//   const query = searchParams.get('q') ?? '';
//   const page = parseInt(searchParams.get('page') ?? '1', 10);

//   const { data, isLoading, error } = api.manga.search.useQuery({ query, page, perPage: 20 });

//   const handlePageChange = (newPage: number) => {
//     router.push(`/search?q=${encodeURIComponent(query)}&page=${newPage}`);
//   };

//   if (isLoading) return <div>Loading...</div>;
//   if (error) return <div>Error: {error.message}</div>;
//   if (!data || data.manga.length === 0) return <div>No results found for &quot;{query}&quot;</div>;

//   return (
//     <div className="container mx-auto px-4 py-8">
//       <h1 className="text-3xl font-bold mb-6">Search Results for &quot;{query}&quot;</h1>
//                   <MangaGrid 
//                         manga={data.manga.map(manga => ({
//                                     ...manga,
//                                     coverImage: '/path/to/placeholder-image.jpg'
//                               }))}
                              
//                         pageInfo={{
//                               currentPage: data.pageInfo.currentPage,
//                               hasNextPage: data.pageInfo.hasNextPage,
//                               lastPage: data.pageInfo.totalPages,
//                               perPage: 20
//                         }}
//                         onPageChange={handlePageChange}
//                         currentPage={page}
//                   />
//             </div>
//       );
// }