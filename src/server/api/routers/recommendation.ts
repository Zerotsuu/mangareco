import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "../trpc";
import { ContentBasedRecommender } from "~/server/services/recommendations/ContentBasedRecommender";
import { TRPCError } from "@trpc/server";
import fs from 'fs';
import path from 'path';
import { getMangaById } from "~/utils/anilist-api";
import type { MangaRecommendation } from "~/server/services/recommendations/types";
import { DEFAULT_CONFIG } from "~/server/services/recommendations/types";

// Initialize recommender with CSV data
let recommender: ContentBasedRecommender | null = null;

try {
  const csvPath = path.join(process.cwd(), 'src', 'data', 'manga_features.csv');
  const csvData = fs.readFileSync(csvPath, 'utf-8');
  recommender = new ContentBasedRecommender(csvData);
  console.log('Recommender initialized successfully');
} catch (error) {
  console.error('Failed to initialize recommender:', error);
}

export const recommendationRouter = createTRPCRouter({
  getRecommendations: protectedProcedure
    .input(z.object({
      numRecommendations: z.number().min(1).max(20).default(10),
    }))
    .query(async ({ ctx, input }) => {
      if (!recommender) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Recommendation system not initialized",
        });
      }

      const clerkId = ctx.auth.userId;
      if (!clerkId) {
        throw new TRPCError({ code: "UNAUTHORIZED" });
      }

      try {
        // Get user
        const user = await ctx.db.user.findUnique({
          where: { clerkId },
          include: {
            UserProfile:true
          },
        });

        if (!user?.UserProfile) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "User profile not found",
          });
        }

        // Get user's manga list
        const userList = await ctx.db.mangaList.findMany({
          where: { userId: user.id },
          select: {
            mangaId: true,
            likeStatus: true,
          },
        });

        console.log('User list:', {
          count: userList.length,
          items: userList.slice(0, 3), // Log first 3 items
        });

        if (userList.length === 0) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Please add some manga to your list first",
          });
        }

        // Debug some manga from user's list
        if (userList.length > 0 && userList[0]) {
          console.log('Debugging first manga in list:');
          // recommender.printMangaFeatures(userList[0].mangaId);

        // Debug user profile
        console.log('User profile features:');
        // recommender.printUserProfile(userList);

        // Get recommendations
        const recommendations = recommender.getRecommendations(
          userList,
          // user.UserProfile,
          input.numRecommendations
        );

        console.log('Raw recommendations:', recommendations.slice(0, 3));

        if (!recommendations.length) {
          return [];
        }

        // Fetch manga details
        const mangaDetails = await Promise.all(
          recommendations.map(async (rec) => {
            try {
              const manga = await getMangaById(rec.id);
              return {
                id: manga.id,
                title: manga.title.english ?? manga.title.romaji,
                coverImage: manga.coverImage.large,
                averageScore: manga.averageScore ?? 0,
                genres: manga.genres,
                similarity: rec.similarity
              };
            } catch (error) {
              console.error(`Failed to fetch manga ${rec.id}:`, error);
              return null;
            }
          })
        );

        const validMangaDetails = mangaDetails
          .filter((manga): manga is MangaRecommendation => manga !== null)
          .sort((a, b) => b.similarity - a.similarity);

        console.log('Final recommendations:', {
          count: validMangaDetails.length,
          samples: validMangaDetails.slice(0, 3),
        });

        return validMangaDetails;
      } 
    }catch (error) {
      console.error('Recommendation error:', error);
      throw error;
    }}),
});