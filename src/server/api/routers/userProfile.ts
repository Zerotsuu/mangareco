import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";

export const userProfileRouter = createTRPCRouter({
  getUserProfile: protectedProcedure.query(async ({ ctx }) => {
    if (!ctx.auth.userId) {
      throw new Error("User ID is required");
    }
    const profile = await ctx.db.userProfile.findUnique({
      where: { userId: ctx.auth.userId },
    });
    return profile;
  }),
  createProfile: protectedProcedure
    .input(z.object({
      experience: z.string(),
      favoriteGenres: z.array(z.string()),
    }))
    .mutation(async ({ ctx, input }) => {
      if (!ctx.auth.userId) {
        throw new Error("User ID is required");
      }
      const profile = await ctx.db.userProfile.create({
        data: {
          userId: ctx.auth.userId,
          experience: input.experience,
          favoriteGenres: input.favoriteGenres,
        },
      });
      return profile;
    }),
});