import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { db } from "~/server/db";

export const recommendationRouter = createTRPCRouter({
  getRecommendations: protectedProcedure
    .input(z.object({ limit: z.number().min(1).max(100).default(10) }))
    .query(async ({ ctx, input }) => {
      const clerkId = ctx.auth.userId;
      if (!clerkId) throw new Error("User not authenticated");

      // Get user
      const user = await db.user.findUnique({
        where: { clerkId },
        include: {
          mangaList: true,
        },
      });

      if (!user) throw new Error("User not found");

      // Expand the manga details after retrieving the user
      const mangaDetails = await db.manga.findMany({
        where: {
          id: {
            in: user.mangaList.map(item => item.mangaId),
          },
        },
      });

      // Map mangaDetails to user.mangaList
      const mappedMangaList = user.mangaList.map(item => ({
        ...item,
        manga: mangaDetails.find(manga => manga.id === item.mangaId),
      }));

      // Get user's liked and disliked manga
      const likedManga = user.mangaList.filter(item => item.likeStatus === 'like');
      const dislikedManga = user.mangaList.filter(item => item.likeStatus === 'dislike');

      // Get user's preferred genres from liked manga
      const likedGenres = likedManga.flatMap(item => {
        const manga = mangaDetails.find(m => m.id === item.mangaId);
        return manga ? manga.genres : [];
      });
      const genreCounts = likedGenres.reduce((acc, genre) => {
        acc[genre] = (acc[genre] ?? 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      console.log(genreCounts);

      // Get genres to avoid from disliked manga
      const dislikedGenres = new Set(dislikedManga.flatMap(item => {
        const manga = mangaDetails.find(m => m.id === item.mangaId);
        return manga ? manga.genres : [];
  }));

      // Find manga with similar genres to liked manga, not in user's list, and not containing disliked genres
      const recommendations = await db.manga.findMany({
        where: {
          AND: [
            {
              genres: {
                hasSome: Object.keys(genreCounts),
              },
            },
            {
                NOT: {
                  genres: {
                    hasSome: Array.from(dislikedGenres),
                  },
                },
              },
            {
              NOT: { id: { in: user.mangaList.map(item => item.mangaId) } },
            },
          ],
        },
        orderBy: [
          { averageScore: 'desc' },
          { popularity: 'desc' },
        ],
        take: input.limit,
      });

      return recommendations;
    }),
});