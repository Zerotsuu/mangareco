import { z } from "zod";
import { createTRPCRouter, protectedProcedure, publicProcedure } from "~/server/api/trpc";
import { TRPCError } from "@trpc/server";
import { clerkClient } from "@clerk/nextjs/server";

export const userRouter = createTRPCRouter({
  createOrUpdateUser: protectedProcedure
    .input(
      z.object({
        experience: z.string().optional(),
        favoriteGenres: z.array(z.string()).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const clerkId = ctx.auth.userId;
      if (!clerkId) {
        throw new TRPCError({ code: "UNAUTHORIZED", message: "User not authenticated" });
      }

      try {
        // Fetch user details from Clerk
        const clerkUser = await clerkClient.users.getUser(clerkId);
        const email = clerkUser.emailAddresses[0]?.emailAddress;

        const result = await ctx.db.$transaction(async (prisma) => {
          // Upsert User
          const user = await prisma.user.upsert({
            where: { clerkId },
            update: { email },
            create: { clerkId, email },
          });

          // Upsert UserProfile
          const userProfile = await prisma.userProfile.upsert({
            where: { userId: user.id },
            update: {
              experience: input.experience,
              favoriteGenres: input.favoriteGenres,
            },
            create: {
              userId: user.id,
              experience: input.experience,
              favoriteGenres: input.favoriteGenres ?? [],
            },
          });

          return { user, userProfile };
        });

        return result;
      } catch (error) {
        console.error("Error creating or updating user:", error);
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to create or update user" });
      }
    }),

  getCurrentUser: protectedProcedure
    .query(async ({ ctx }) => {
      const clerkId = ctx.auth.userId;
      if (!clerkId) {
        throw new TRPCError({ code: "UNAUTHORIZED", message: "User not authenticated" });
      }

      try {
        const user = await ctx.db.user.findUnique({
          where: { clerkId },
        });

        if (!user) {
          throw new TRPCError({ code: "NOT_FOUND", message: "User not found" });
        }

        return user;
      } catch (error) {
        console.error("Error fetching current user:", error);
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to fetch user" });
      }
    }),

  updateUserProfile: protectedProcedure
    .input(
      z.object({
        experience: z.string().optional(),
        favoriteGenres: z.array(z.string()).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const clerkId = ctx.auth.userId;
      if (!clerkId) {
        throw new TRPCError({ code: "UNAUTHORIZED", message: "User not authenticated" });
      }

      try {
        const result = await ctx.db.$transaction(async (prisma) => {
          const user = await prisma.user.findUnique({ where: { clerkId } });
          if (!user) {
            throw new TRPCError({ code: "NOT_FOUND", message: "User not found" });
          }

          return prisma.userProfile.upsert({
            where: { userId: user.id },
            update: {
              experience: input.experience,
              favoriteGenres: input.favoriteGenres,
            },
            create: {
              userId: user.id,
              experience: input.experience,
              favoriteGenres: input.favoriteGenres ?? [],
            },
          });
        });

        return result;
      } catch (error) {
        console.error("Error updating user profile:", error);
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to update user profile" });
      }
    }),
});