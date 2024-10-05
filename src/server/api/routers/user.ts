import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";

export const userRouter = createTRPCRouter({
  updateProfile: protectedProcedure
    .input(z.object({ readingExperience: z.string() }))
    .mutation(async ({ ctx, input }) => {
      if (!ctx.auth.userId) {
        throw new Error("User not authenticated");
      }
      const updatedUser = await ctx.db.user.update({
        where: { clerkId: ctx.auth.userId },
        data: { readingExperience: input.readingExperience } as { readingExperience: string },
      });
      return updatedUser;
    }),
});