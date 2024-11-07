import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "../trpc";
import { ContentBasedRecommender } from "~/server/services/recommendations/ContentBasedRecommender";
import { CollaborativeRecommender } from "~/server/services/recommendations/CollaborativeRecommender";
import { TRPCError } from "@trpc/server";
import { performance } from 'perf_hooks';
import path from 'path';
import { promises as fs } from 'fs';
import { getMangaById } from "~/utils/anilist-api";
import type {
  MangaRecommendation,
  RecommenderConfig,
  CacheEntry,
  ReadingStatus
} from "~/server/services/recommendations/types";
import { DEFAULT_CONFIG } from "~/server/services/recommendations/types";
import { MatrixFactorizationRecommender } from "~/server/services/recommendations/MatrixFactorizationRecommender";

// Simple in-memory cache implementation
class RecommendationCache {
  private cache = new Map<string, CacheEntry<MangaRecommendation[]>>();
  private history = new Map<string, Set<number>>();
  private readonly CACHE_TTL = 30 * 60 * 1000; // 30 minutes
  private readonly HISTORY_TTL = 24 * 60 * 60 * 1000; // 24 hours

  set(userId: string, key: string, data: MangaRecommendation[]): void {
    this.cache.set(`${userId}:${key}`, {
      data,
      timestamp: Date.now(),
      expiresAt: Date.now() + this.CACHE_TTL
    });
  }

  get(userId: string, key: string): MangaRecommendation[] | null {
    const entry = this.cache.get(`${userId}:${key}`);
    if (!entry || Date.now() > entry.expiresAt) {
      this.cache.delete(`${userId}:${key}`);
      return null;
    }
    return entry.data;
  }

  addToHistory(userId: string, mangaIds: number[]): void {
    const userHistory = this.history.get(userId) ?? new Set();
    mangaIds.forEach(id => userHistory.add(id));
    this.history.set(userId, userHistory);
  }

  getHistory(userId: string): number[] {
    return Array.from(this.history.get(userId) ?? []);
  }

  clearHistory(userId: string): void {
    this.history.delete(userId);
    // Clear all user's recommendation caches
    for (const key of this.cache.keys()) {
      if (key.startsWith(`${userId}:`)) {
        this.cache.delete(key);
      }
    }
  }
}

// Initialize recommender with error handling and retries
let recommender: ContentBasedRecommender | null = null;
let collaborativeRecommender: CollaborativeRecommender | null = null;
let initializationPromise: Promise<void> | null = null;
const cache = new RecommendationCache();

const initializeRecommender = async (retries = 3): Promise<void> => {
  try {
    let csvData: string;
    try {
      const csvPath = path.join(process.cwd(), 'src', 'data', 'manga_features.csv');
      csvData = await fs.readFile(csvPath, 'utf-8');
    } catch (error) {
      console.error('Failed to read CSV file:', error);
      throw error;
    }

    recommender = new ContentBasedRecommender(csvData);
    collaborativeRecommender = new CollaborativeRecommender();
    console.log('Recommenders initialized successfully');
  } catch (error) {
    if (retries > 0) {
      console.warn(`Retrying recommender initialization. Attempts left: ${retries - 1}`);
      await new Promise(resolve => setTimeout(resolve, 1000));
      return initializeRecommender(retries - 1);
    }
    console.error('Failed to initialize recommender:', error);
    throw error;
  }
};

// Function to get or initialize recommender
const getRecommender = async (): Promise<ContentBasedRecommender> => {
  if (recommender) return recommender;

  if (!initializationPromise) {
    initializationPromise = initializeRecommender();
  }

  try {
    await initializationPromise;
    if (!recommender) {
      throw new Error('Recommender failed to initialize');
    }
    return recommender;
  } catch (error) {
    console.error('Failed to initialize recommender:', error);
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Failed to initialize recommendation system",
    });
  }
};

const getCollaborativeRecommender = async (): Promise<CollaborativeRecommender> => {
  if (collaborativeRecommender) return collaborativeRecommender;

  if (!initializationPromise) {
    initializationPromise = initializeRecommender();
  }

  try {
    await initializationPromise;
    if (!collaborativeRecommender) {
      throw new Error('Collaborative recommender failed to initialize');
    }
    return collaborativeRecommender;
  } catch (error) {
    console.error('Failed to initialize collaborative recommender:', error);
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Failed to initialize recommendation system",
    });
  }
};

// Input validation schemas
const recommendationInputSchema = z.object({
  excludeIds: z.array(z.number()).default([]),
  limit: z.number().min(1).max(20).default(10),
  minScore: z.number().min(0).max(100).optional(),
  genres: z.array(z.string()).optional(),
  excludeGenres: z.array(z.string()).optional(),
});

export const recommendationRouter = createTRPCRouter({
  getRecommendations: protectedProcedure
    .input(recommendationInputSchema)
    .query(async ({ ctx, input }) => {
      const start = performance.now();

      try {
        const recommender = await getRecommender();
        if (!recommender) throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Recommendation system is initializing",
        });
        if (!ctx.auth.userId) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "No user ID found",
          });
        }

        // First get the user
        const user = await ctx.db.user.findUnique({
          where: { clerkId: ctx.auth.userId },
          include: {
            UserProfile: true,
          },
        });
        if (!user) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "User not found",
          });
        }

        if (!user.UserProfile) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Please complete your profile first",
          });
        }

        // Get user's manga list
        const userList = await ctx.db.mangaList.findMany({
          where: {
            userId: user.id  // Use the user.id, not clerkId
          },
          select: {
            mangaId: true,
            likeStatus: true,
          },
        });

        console.log('User list length:', userList.length); // Debug log

        if (!userList || userList.length < 5) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: `Please add at least 5 manga to your list for better recommendations (current: ${userList.length})`,
          });
        }

        const cacheKey = JSON.stringify(input);
        const cachedRecommendations = cache.get(ctx.auth.userId, cacheKey);

        if (cachedRecommendations) {
          return {
            items: cachedRecommendations,
            hasMore: true,
            timing: performance.now() - start,
            source: 'cache',
          };
        }

        // Combine exclude IDs with history
        const recommendationHistory = cache.getHistory(ctx.auth.userId);
        const allExcludedIds = new Set([
          ...input.excludeIds,
          ...recommendationHistory,
          ...userList.map(item => item.mangaId),
        ]);

        // Use user preferences merged with default config
        const userSettings = user.UserProfile.recommendationSettings as RecommenderConfig ?? DEFAULT_CONFIG;

        // Get recommendations
        const recommendations = recommender.getRecommendations(
          userList.map(item => ({
            ...item,
            readingStatus: 'COMPLETED',
            likeStatus: item.likeStatus as "like" | "dislike" | null
          })),
          user.UserProfile,
          input.limit + 1,
          Array.from(allExcludedIds)
        );

        // Take only what we need for this page
        const recommendationsForPage = recommendations.slice(0, input.limit);
        const hasMore = recommendations.length > input.limit;

        // Fetch manga details in parallel
        const mangaDetails = await Promise.all(
          recommendations.map(async (rec) => {
            try {
              const manga = await getMangaById(rec.id);

              // Apply filters
              if (input.minScore && (manga.averageScore ?? 0) < input.minScore) {
                return null;
              }

              if (input.genres?.length &&
                !input.genres.some(g => manga.genres.includes(g))) {
                return null;
              }

              if (input.excludeGenres?.length &&
                input.excludeGenres.some(g => manga.genres.includes(g))) {
                return null;
              }

              return {
                id: manga.id,
                title: manga.title.english ?? manga.title.romaji,
                coverImage: manga.coverImage.large,
                averageScore: manga.averageScore ?? 0,
                genres: manga.genres,
                similarity: rec.similarity,
                matchDetails: rec.matchDetails,
                description: manga.description,
                status: manga.status,
              };
            } catch (error) {
              console.error(`Failed to fetch manga ${rec.id}:`, error);
              return null;
            }
          })
        );

        // Process results
        const validMangaDetails = mangaDetails
          .filter((manga): manga is NonNullable<typeof manga> => manga !== null)
          .sort((a, b) => b.similarity - a.similarity)
          .slice(0, input.limit);

        if (validMangaDetails.length === 0) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "No matching recommendations found",
          });
        }

        // Update cache and history
        const recommendationsWithMetadata = validMangaDetails.map(manga => ({
          ...manga,  // Spreads all existing manga properties
          metadata: {  // Adds a new metadata object with:
            timestamp: Date.now(),  // Current time in milliseconds
            lastViewed: new Date(),  // Current date/time
            source: 'recommendation',  // Indicates where this data came from
            popularity: 0,  // Default popularity value
            favorites: 0,  // Default favorites count
            status: (manga.status as "NOT_YET_RELEASED" | "FINISHED" | "RELEASING" | "CANCELLED" | "HIATUS") ?? "NOT_YET_RELEASED",  // Manga publication status
            isAdult: false  // Whether it's adult content
          }
        }));
        cache.set(ctx.auth.userId, cacheKey, recommendationsWithMetadata);
        cache.addToHistory(ctx.auth.userId, recommendationsWithMetadata.map(m => m.id));
        // console.log("recommendation metadata : ", recommendationsWithMetadata);

        return {
          items: recommendationsWithMetadata,
          hasMore: validMangaDetails.length >= input.limit,
          timing: performance.now() - start,
          source: 'fresh',
        };

      } catch (error) {
        console.error('Recommendation error:', error);
        throw error;
      }
    }),

  clearHistory: protectedProcedure.mutation(async ({ ctx }) => {
    try {
      if (!ctx.auth.userId) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "User ID is required"
        });
      }
      cache.clearHistory(ctx.auth.userId);
      return { success: true };
    } catch (error) {
      console.error('Error clearing history:', error);
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to clear recommendation history",
      });
    }
  }),

  // Add new procedure to get user similarity information
  getUserSimilarityInfo: protectedProcedure.query(async ({ ctx }) => {
    try {
      if (!ctx.auth.userId) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "User not authenticated",
        });
      }

      const collaborativeRecommender = await getCollaborativeRecommender();

      // Load all users' data
      await collaborativeRecommender.loadAllUsersData(ctx.db);

      const similarityInfo = collaborativeRecommender.getUserSimilarityDetails(ctx.auth.userId);
      const allUsers = collaborativeRecommender.getAllUsers();

      return {
        similarUsers: similarityInfo.similarUsers,
        totalUsers: similarityInfo.totalUsers,
        userMangaCount: similarityInfo.userMangaCount,
        allUsers: allUsers,
      };
    } catch (error) {
      console.error('Error getting user similarity info:', error);
      throw error;
    }
  }),

  getCollaborativeRecommendations: protectedProcedure
  .input(z.object({
    limit: z.number().min(1).max(50).default(20),
    excludeIds: z.array(z.number()).default([]),
  }))
  .query(async ({ ctx, input }) => {
    const start = performance.now();

    try {
      if (!ctx.auth.userId) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "User not authenticated",
        });
      }

      // Get user's manga list
      const user = await ctx.db.user.findUnique({
        where: { clerkId: ctx.auth.userId },
        include: {
          mangaList: true,
        },
      });

      if (!user || !user.mangaList) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "User data not found",
        });
      }

      const collaborativeRecommender = await getCollaborativeRecommender();

      await collaborativeRecommender.loadAllUsersData(ctx.db);

      const similarityInfo = collaborativeRecommender.getUserSimilarityDetails(ctx.auth.userId);
      console.log('Similarity info:', {
        totalUsers: similarityInfo.totalUsers,
        similarUsers: similarityInfo.similarUsers.length,
        userMangaCount: similarityInfo.userMangaCount
      });

      // Update user interactions
      collaborativeRecommender.updateUserInteractions(
        ctx.auth.userId,
        user.mangaList.map(item => ({
          mangaId: item.mangaId,
          readingStatus: 'COMPLETED' as ReadingStatus,
          likeStatus: item.likeStatus as "like" | "dislike" | null
        }))
      );

      // Get collaborative recommendations
      const collaborativeRecs = collaborativeRecommender.getRecommendations(
        ctx.auth.userId,
        input.limit,
        new Set(input.excludeIds)
      );

      // Debug logs after we have the data
      console.log('User manga list length:', user.mangaList.length);
      console.log('Recommendations found:', collaborativeRecs.length);

      // Fetch manga details for recommendations
      const mangaDetails = await Promise.all(
        collaborativeRecs.map(async (rec) => {
          try {
            const manga = await getMangaById(rec.mangaId);
            return {
              id: manga.id,
              title: manga.title.english ?? manga.title.romaji,
              coverImage: manga.coverImage.large,
              averageScore: manga.averageScore ?? 0,
              genres: manga.genres,
              userCount: rec.userCount,
              description: manga.description,
            };
          } catch (error) {
            console.error(`Failed to fetch manga ${rec.mangaId}:`, error);
            return null;
          }
        })
      );

      const validMangaDetails = mangaDetails.filter((manga): manga is NonNullable<typeof manga> => manga !== null);

      return {
        items: validMangaDetails,
        timing: performance.now() - start,
      };
    } catch (error) {
      console.error('Collaborative recommendation error:', error);
      throw error;
    }
  }),
  

  // getMatrixFactorizationRecommendations: protectedProcedure
  //   .input(z.object({
  //     limit: z.number().min(1).max(50).default(20),
  //     excludeIds: z.array(z.number()).default([]),
  //   }))
  //   .query(async ({ ctx, input }) => {
  //     const start = performance.now();

  //     try {
  //       if (!ctx.auth.userId) {
  //         throw new TRPCError({
  //           code: "UNAUTHORIZED",
  //           message: "User not authenticated",
  //         });
  //       }

  //       // Get user's manga list
  //       const user = await ctx.db.user.findUnique({
  //         where: { clerkId: ctx.auth.userId },
  //         include: {
  //           mangaList: true,
  //         },
  //       });

  //       if (!user || !user.mangaList) {
  //         throw new TRPCError({
  //           code: "NOT_FOUND",
  //           message: "User data not found",
  //         });
  //       }

  //       const mfRecommender = new MatrixFactorizationRecommender();

  //       // Get recommendations
  //       const recommendations = await mfRecommender.getRecommendations(
  //         ctx.auth.userId,
  //         input.limit,
  //         new Set(input.excludeIds)
  //       );

  //       // Fetch manga details for recommendations
  //       const mangaDetails = await Promise.all(
  //         recommendations.map(async (rec) => {
  //           try {
  //             const manga = await getMangaById(rec.mangaId);
  //             return {
  //               id: manga.id,
  //               title: manga.title.english ?? manga.title.romaji,
  //               coverImage: manga.coverImage.large,
  //               averageScore: manga.averageScore ?? 0,
  //               genres: manga.genres,
  //               predictedScore: rec.score,
  //               description: manga.description,
  //             };
  //           } catch (error) {
  //             console.error(`Failed to fetch manga ${rec.mangaId}:`, error);
  //             return null;
  //           }
  //         })
  //       );

  //       const validMangaDetails = mangaDetails.filter(
  //         (manga): manga is NonNullable<typeof manga> => manga !== null
  //       );

  //       return {
  //         items: validMangaDetails,
  //         timing: performance.now() - start,
  //         source: 'matrix-factorization'
  //       };

  //     } catch (error) {
  //       console.error('Matrix factorization recommendation error:', error);
  //       throw error;
  //     }
  //   }),

  // // Add route to get model info
  // getModelInfo: protectedProcedure
  //   .query(async () => {
  //     const mfRecommender = new MatrixFactorizationRecommender();
  //     return mfRecommender.getModelInfo();
  //   }),

  // // Add procedure to trigger model updates
  // updateRecommenderModel: protectedProcedure
  //   .mutation(async ({ ctx }) => {
  //     const mfRecommender = new MatrixFactorizationRecommender();
      
  //     // Get user's latest ratings
  //     const userRatings = await ctx.db.mangaList.findMany({
  //       where: { userId: ctx.auth.userId! },
  //       select: {
  //         mangaId: true,
  //         likeStatus: true,
  //         status: true,
  //       }
  //     });

  //     // Map the ratings to match UserMangaItem interface
  //     const mappedRatings = userRatings.map(rating => ({
  //       mangaId: rating.mangaId,
  //       likeStatus: rating.likeStatus as "like" | "dislike" | null,
  //       readingStatus: rating.status as ReadingStatus
  //     }));

  //     // Update the model 
  //     await mfRecommender.updateModel(mappedRatings, ctx.auth.userId!);

  //     return { success: true };
  //   })
});