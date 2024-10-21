// server/api/routers/recommendation.ts

import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { TRPCError } from "@trpc/server";

const MangaRecommendationSchema = z.object({
  id: z.number(),
  title: z.string(),
  coverImage: z.string().optional(),
  averageScore: z.number(),
  genres: z.array(z.string()),
});

export const recommendationRouter = createTRPCRouter({
  getRecommendations: protectedProcedure
    .input(z.object({
      numRecommendations: z.number().min(1).max(20).default(10),
    }))
    .query(async ({ input, ctx }) => {
      const clerkUserId = ctx.auth.userId;

      if (!clerkUserId) {
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: 'User ID is null or undefined',
        });
      }

      try {
        // First, find the user in our database using the Clerk user ID
        const user = await ctx.db.user.findUnique({
          where: { clerkId: clerkUserId },
        });

        if (!user) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'User not found',
          });
        }

        // Now fetch the user's manga list
        const userManga = await ctx.db.mangaList.findMany({
          where: { userId: user.id },
          select: {
            mangaId: true,
          },
        });

        if (userManga.length === 0) {
          // Return a specific response for empty list
          return {
            recommendations: [],
            message: "Your manga list is empty. Add some manga to get personalized recommendations!"
          };
        }

        // Extract manga IDs
        const mangaIds = userManga.map(item => item.mangaId);

        console.log("Manga IDs:", mangaIds.join(',')); // Log manga IDs for debugging

        const response = await fetch(
          "https://zeroshirayuki-mangarecommendations.hf.space/api/predict",
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              data: [
                mangaIds.join(','),
                input.numRecommendations
              ]
            }),
          }
        );

        if (!response.ok) {
          const errorText = await response.text();
          console.error("Hugging Face API error:", errorText);
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: `Hugging Face API error: ${response.status} ${response.statusText}`,
            cause: errorText,
          });
        }

        const result = await response.json() as { data: (string | undefined)[] };
        console.log("Raw API response:", result); // Log raw API response

        // Safely handle potential undefined values
        const dataString = result.data[0];
        if (typeof dataString !== 'string') {
          throw new Error("Invalid response format: expected a JSON string");
        }

        // Safe parsing of the JSON string
        const recommendedIds: string[] = JSON.parse(dataString) as string[];

  // Convert recommendedIds from string[] to number[]
  const recommendedIdsAsNumbers = recommendedIds.map(id => Number(id));

  // Fetch manga details from your database
  const recommendedManga = await ctx.db.manga.findMany({
    where: {
      id: {
        in: recommendedIdsAsNumbers
      }
    }
  });

  // Transform the data to match MangaRecommendationSchema
        const recommendations = recommendedManga.map(manga => ({
          id: manga.id,
          title: manga.title,
          coverImage: `https://example.com/covers/${manga.id}.jpg`, // You'll need to adjust this to your actual cover image URL structure
          averageScore: manga.averageScore,
          genres: manga.genres,
        }));

        return { recommendations, message: null };
      } catch (error) {
        console.error("Error in getRecommendations:", error);
        if (error instanceof TRPCError) {
          throw error;
        }
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to fetch recommendations',
          cause: error,
        });
      }
    }),
});