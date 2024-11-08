// // src/server/services/recommendations/MangaRecommendationService.ts
// import { HuggingFaceRecommender } from './HuggingFaceRecommender.ts';
// import { prisma } from '@/server/db';

// export class MangaRecommendationService {
//   private recommender: HuggingFaceRecommender;
  
//   constructor(huggingfaceApiKey: string) {
//     this.recommender = new HuggingFaceRecommender(huggingfaceApiKey);
//   }
  
//   async getRecommendations(userId: string, limit: number = 10) {
//     // Get all manga from database
//     const allManga = await prisma.manga.findMany({
//       select: {
//         id: true,
//         genres: true
//       }
//     });
    
//     // Get recommendations for each manga
//     const recommendations = await Promise.all(
//       allManga.map(async manga => {
//         const score = await this.recommender.getRecommendation(
//           userId,
//           manga.id,
//           manga.genres
//         );
        
//         return {
//           mangaId: manga.id,
//           score
//         };
//       })
//     );
    
//     // Sort by score and return top recommendations
//     return recommendations
//       .sort((a, b) => b.score - a.score)
//       .slice(0, limit);
//   }
// }