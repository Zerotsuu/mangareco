import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { type Prisma } from "@prisma/client";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { DEFAULT_CONFIG } from "~/server/services/recommendations/types";

// Input validation schemas
const experienceSchema = z.enum(["new", "intermediate", "experienced"]);
const favoriteGenresSchema = z.array(z.string()).min(1);

const profileInputSchema = z.object({
  experience: experienceSchema,
  favoriteGenres: favoriteGenresSchema,
});

// Recommendation settings schema
const recommenderConfigSchema = z.object({
  minSimilarity: z.number().min(0).max(1),
  weightLikes: z.number().min(0),
  weightDislikes: z.number(),
  defaultWeight: z.number(),
  genreImportance: z.number().min(0),
  themeImportance: z.number().min(0),
  scoreImportance: z.number().min(0),
  userExperienceWeight: z.object({
    new: z.number(),
    intermediate: z.number(),
    experienced: z.number(),
  }),
});

export type RecommenderConfigInput = z.infer<typeof recommenderConfigSchema>;

function isValidConfig(config: unknown): config is RecommenderConfigInput {
  try {
    recommenderConfigSchema.parse(config);
    return true;
  } catch {
    return false;
  }
}

export const userProfileRouter = createTRPCRouter({
  getUserProfile: protectedProcedure.query(async ({ ctx }) => {
    if (!ctx.auth.userId) {
      throw new TRPCError({ 
        code: "UNAUTHORIZED",
        message: "User ID is required" 
      });
    }
    const profile = await ctx.db.userProfile.findUnique({
      where: { userId: ctx.auth.userId },
    });
    return profile;
  }),

  createProfile: protectedProcedure
    .input(profileInputSchema)
    .mutation(async ({ ctx, input }) => {
      const clerkId = ctx.auth.userId;
      if (!clerkId) {
        throw new TRPCError({ 
          code: "UNAUTHORIZED",
          message: "User ID is required" 
        });
      }

      try {
        // Use a transaction to ensure data consistency
        const result = await ctx.db.$transaction(async (prisma) => {
          // First, create or find the User
          const user = await prisma.user.upsert({
            where: { clerkId },
            create: { clerkId },
            update: {},
          });

          // Then upsert the UserProfile
          const profile = await prisma.userProfile.upsert({
            where: { userId: user.id },
            create: {
              userId: user.id,
              experience: input.experience,
              favoriteGenres: input.favoriteGenres,
              recommendationSettings: DEFAULT_CONFIG as unknown as Prisma.JsonObject,
            },
            update: {
              experience: input.experience,
              favoriteGenres: input.favoriteGenres,
              // Don't override existing recommendation settings on update
            },
          });

          return profile;
        });

        return result;
      } catch (error) {
        console.error("Error creating/updating profile:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to create/update profile",
        });
      }
    }),

    getRecommendationSettings: protectedProcedure
    .query(async ({ ctx }): Promise<RecommenderConfigInput> => {
      const userId = ctx.auth.userId;
      if (!userId) {
        throw new TRPCError({ code: "UNAUTHORIZED" });
      }

      try {
        // First find the user by clerkId
        const user = await ctx.db.user.findUnique({
          where: { clerkId: userId },
        });

        if (!user) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "User not found",
          });
        }

        // Then get the profile
        const profile = await ctx.db.userProfile.findUnique({
          where: { userId: user.id },
        });

        if (!profile) {
          // Return default config if no profile exists
          return DEFAULT_CONFIG;
        }

        const settings = profile.recommendationSettings as unknown;

        if (settings && isValidConfig(settings)) {
          return settings as unknown as RecommenderConfigInput;
        }

        return DEFAULT_CONFIG;
      } catch (error) {
        console.error("Error fetching recommendation settings:", error);
        // Return default config on error
        return DEFAULT_CONFIG;
      }
    }),


   updateRecommendationSettings: protectedProcedure
    .input(recommenderConfigSchema)
    .mutation(async ({ ctx, input }): Promise<RecommenderConfigInput> => {
      const userId = ctx.auth.userId;
      if (!userId) {
        throw new TRPCError({ code: "UNAUTHORIZED" });
      }

      try {
        // First find or create the user
        const user = await ctx.db.user.upsert({
          where: { clerkId: userId },
          create: { clerkId: userId },
          update: {},
        });

        // Then find or create the profile with a transaction
        const result = await ctx.db.$transaction(async (prisma) => {
          const profile = await prisma.userProfile.upsert({
            where: { userId: user.id },
            create: {
              userId: user.id,
              experience: "new", // Default experience
              favoriteGenres: [], // Empty array for genres
              recommendationSettings: input as Prisma.JsonObject,
            },
            update: {
              recommendationSettings: input as Prisma.JsonObject,
            },
            select: {
              recommendationSettings: true,
            },
          });

          return profile;
        });

        const settings = result.recommendationSettings as unknown;
        
        if (!settings || !isValidConfig(settings)) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Invalid settings format",
          });
        }

        return settings;
      } catch (error) {
        console.error("Error updating recommendation settings:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to update settings",
        });
      }
    }),

  updateProfile: protectedProcedure
    .input(profileInputSchema)
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.auth.userId;
      if (!userId) {
        throw new TRPCError({ 
          code: "UNAUTHORIZED",
          message: "User ID is required" 
        });
      }

      try {
        const profile = await ctx.db.userProfile.update({
          where: { userId },
          data: {
            experience: input.experience,
            favoriteGenres: input.favoriteGenres,
          },
        });

        return profile;
      } catch (error) {
        console.error("Error updating profile:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to update profile",
        });
      }
    }),
});