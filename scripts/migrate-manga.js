// // scripts/migrate-manga.js
// import { PrismaClient } from '@prisma/client';
// import fetch from 'node-fetch';

// const prisma = new PrismaClient();

// // AniList API query function
// /**
//  * @param {number} id
//  */
// async function getMangaById(id) {
//   const query = `
//     query ($id: Int) {
//       Media(id: $id, type: MANGA) {
//         id
//         title {
//           romaji
//           english
//         }
//         genres
//         averageScore
//         staff {
//           edges {
//             role
//             node {
//               name {
//                 full
//               }
//             }
//           }
//         }
//       }
//     }
//   `;

//   const response = await fetch('https://graphql.anilist.co', {
//     method: 'POST',
//     headers: {
//       'Content-Type': 'application/json',
//       'Accept': 'application/json',
//     },
//     body: JSON.stringify({
//       query,
//       variables: { id }
//     })
//   });

//   const data = await response.json();
//   return data.data?.Media;
// }

// async function migrateManga() {
//   try {
//     // Get all mangaIds from MangaList
//     const mangaLists = await prisma.mangaList.findMany({
//       select: {
//         mangaId: true
//       },
//       distinct: ['mangaId']
//     });

//     console.log(`Found ${mangaLists.length} unique manga entries to migrate`);

//     // Fetch and create manga entries
//     for (const { mangaId } of mangaLists) {
//       try {
//         // Check if manga already exists
//         const existingManga = await prisma.manga.findUnique({
//           where: { id: mangaId }
//         });

//         if (!existingManga) {
//           // Add delay to respect AniList API rate limits
//           await new Promise(resolve => setTimeout(resolve, 1000));

//           // Fetch manga details from AniList
//           const mangaDetails = await getMangaById(mangaId);
          
//           if (mangaDetails) {
//             const author = mangaDetails.staff?.edges.find(edge => 
//               edge.role.toLowerCase().includes('story') || 
//               edge.role.toLowerCase().includes('author')
//             )?.node.name.full || 'Unknown';

//             await prisma.manga.create({
//               data: {
//                 id: mangaId,
//                 title: mangaDetails.title.english || mangaDetails.title.romaji,
//                 genres: mangaDetails.genres || [],
//                 author: author,
//                 averageScore: mangaDetails.averageScore || 0,
//                 popularity: 0 // Default popularity
//               }
//             });
//             console.log(`Created manga entry for ID ${mangaId}: ${mangaDetails.title.english || mangaDetails.title.romaji}`);
//           } else {
//             console.warn(`Could not fetch details for manga ID ${mangaId}`);
//           }
//         } else {
//           console.log(`Manga ID ${mangaId} already exists: ${existingManga.title}`);
//         }
//       } catch (error) {
//         console.error(`Error processing manga ID ${mangaId}:`, error);
//       }
//     }

//     console.log('Migration completed');
//   } catch (error) {
//     console.error('Migration failed:', error);
//   } finally {
//     await prisma.$disconnect();
//   }
// }

// // Run the migration
// migrateManga().catch(console.error);