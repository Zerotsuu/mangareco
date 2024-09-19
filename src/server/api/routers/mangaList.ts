import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";

export const mangaListRouter = createTRPCRouter({
  addToList: protectedProcedure
    .input(z.object({
      mangaId: z.number(),
      status: z.string(),
      rating: z.number().min(0).max(10).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const clerkId = ctx.auth.userId;
      if (clerkId === null) {
        throw new Error("User not authenticated");
      }
      // Check if the user exists
      let user = await ctx.db.user.findUnique({
        where: { clerkId },
      });

      // If the user doesn't exist, create a new user
      if (!user) {
        user = await ctx.db.user.create({
          data: { clerkId },
        });
      }
      return ctx.db.mangaList.create({
        data: {
          userId: user.id,
          mangaId: input.mangaId,
          status: input.status,
          rating: input.rating,
        },
      });
    }),

  getUserList: protectedProcedure
    .query(async ({ ctx }) => {
      const clerkId = ctx.auth.userId;
      if (clerkId === null) {
        throw new Error("User not authenticated");
      }
      const user = await ctx.db.user.findUnique({
        where: { clerkId },
      });
      if (!user) {
        throw new Error("User not found");
      }
      return ctx.db.mangaList.findMany({
        where: { userId: user.id },
        include: { user: true },
      });
    }),
});