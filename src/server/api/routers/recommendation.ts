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
  ReadingStatus,
  HuggingFaceRecommendation
} from "~/server/services/recommendations/types";
import { DEFAULT_CONFIG } from "~/server/services/recommendations/types";
// import { MatrixFactorizationRecommender } from "~/server/services/recommendations/MatrixFactorizationRecommender";
import { huggingFaceRecommender } from "~/server/services/recommendations/HuggingFaceRecommender";
import { env } from "~/env";
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
let hfRecommender: huggingFaceRecommender | null = null;
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
// Add this function with other getter functions
const getHuggingFaceRecommender = (): huggingFaceRecommender => {
  if (!hfRecommender) {
    if (!env.HUGGINGFACE_API_KEY) {
      throw new Error('HuggingFace API key not configured');
    }
    hfRecommender = new huggingFaceRecommender(env.HUGGINGFACE_API_KEY);
  }
  return hfRecommender;
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

        console.log('Debug - User list:', {
          length: userList.length,
          sampleItems: userList.slice(0, 3)
        });

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
        
              // Make filtering more lenient
              let shouldInclude = true;
        
              if (input.minScore && (manga.averageScore ?? 0) < input.minScore) {
                shouldInclude = false;
              }
        
              if (input.genres?.length && 
                  !input.genres.some(g => manga.genres.includes(g))) {
                shouldInclude = false;
              }
        
              if (input.excludeGenres?.length && 
                  input.excludeGenres.some(g => manga.genres.includes(g))) {
                shouldInclude = false;
              }
        
              if (!shouldInclude) {
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

       // Modify the error check to be more informative
if (validMangaDetails.length === 0) {
  throw new TRPCError({
    code: "NOT_FOUND",
    message: "No recommendations found matching the specified criteria. Try adjusting your filters.",
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
  
  getHuggingFaceRecommendations: protectedProcedure
    .input(z.object({
      limit: z.number().min(1).max(50).default(20),
      excludeIds: z.array(z.number()).default([]),
    }))
    .query(async ({ ctx, input }) => {
      const start = performance.now();

      if (!ctx.auth.userId) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "User not authenticated",
        });
      }

      try {
        const recommender = getHuggingFaceRecommender();
        // Get user's manga list
        const user = await ctx.db.user.findUnique({
          where: { clerkId: ctx.auth.userId },
          include: {
            mangaList: {
              select: {
                mangaId: true
              }
            }
          },
        });

        if (!user) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "User not found",
          });
        }

        const userMangaIds = new Set(user.mangaList.map(item => item.mangaId));
        const excludeSet = new Set([...input.excludeIds, ...userMangaIds]);

        // Get candidate manga
        const candidates = await ctx.db.manga.findMany({
          where: {
            id: {
              notIn: Array.from(excludeSet)
            }
          },
          select: {
            id: true,
            genres: true
          }
        });

        // Get recommendations
      const recommendations = await Promise.all(
        candidates.map(async (manga) => {
          const score = 0.5;
          try {
            if (!ctx.auth.userId) {
              throw new Error("User ID is required");
            }
            let score;
            try {
              if (recommender instanceof Error) {
                throw new Error("Recommender system unavailable");
              }
             
            } catch (e) {
              console.error(`HuggingFace API error for manga ${manga.id}:`, e);
              score = 0;
            }

            return {
              mangaId: manga.id,
              score,
              source: 'huggingface' as const
            };
          } catch (error) {
            console.error(`Failed to get recommendation for manga ${manga.id}:`, error);
            return {
              mangaId: manga.id,
              score: 0,
              source: 'huggingface' as const
            };
          }
        })
      );

        // Sort and get top recommendations
        const topRecommendations = recommendations
          .sort((a, b) => b.score - a.score)
          .slice(0, input.limit);

        // Fetch full manga details
        const mangaDetails = await Promise.all(
          topRecommendations.map(async (rec) => {
            try {
              const manga = await getMangaById(rec.mangaId);
              
              return manga ? {
                id: manga.id,
                title: manga.title.english ?? manga.title.romaji,
                coverImage: manga.coverImage.large,
                averageScore: manga.averageScore ?? 0,
                genres: manga.genres,
                description: manga.description ?? '',
                status: manga.status,
                mlScore: rec.score,
                source: rec.source
              } : null;
            } catch (error) {
              console.error(`Failed to fetch manga ${rec.mangaId}:`, error);
              return null;
            }
          })
        );

        const validRecommendations = mangaDetails.filter(
          (manga): manga is NonNullable<typeof manga> => manga !== null
        );

        if (validRecommendations.length === 0) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "No recommendations found",
          });
        }

        return {
          items: validRecommendations,
          timing: performance.now() - start,
          source: 'huggingface' as const
        };

      } catch (error) {
        if (error instanceof TRPCError) throw error;
        
        console.error('HuggingFace recommendation error:', error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to get recommendations",
        });
      }
    }),
});