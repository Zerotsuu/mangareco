import type { Manga, MangaList } from "@prisma/client";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { getMangaById } from "~/utils/anilist-api";

interface MangaListItem extends MangaList {
  manga: Manga;
}

export const mangaListRouter = createTRPCRouter({
  addToList: protectedProcedure
    .input(
      z.object({
        mangaId: z.number(),
        status: z.string(),
        likeStatus: z.enum(["like", "dislike"]).nullable(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const clerkId = ctx.auth.userId;
      if (!clerkId) {
        throw new TRPCError({ code: "UNAUTHORIZED", message: "User not authenticated" });
      }

      try {
        // Fetch manga details from AniList
        const mangaDetails = await getMangaById(input.mangaId);

        const result = await ctx.db.$transaction(async (prisma) => {
          // First, ensure the User exists
          let user = await prisma.user.findUnique({ where: { clerkId } });
          if (!user) {
            user = await prisma.user.create({ data: { clerkId } });
          }

          // Then, ensure the UserProfile exists
          let userProfile = await prisma.userProfile.findUnique({ where: { userId: user.id } });
          if (!userProfile) {
            userProfile = await prisma.userProfile.create({
              data: {
                userId: user.id,
                favoriteGenres: [],
                experience: "",
              },
            });
          }

          // Create or update the manga in our database
          await prisma.manga.upsert({
            where: { id: input.mangaId },
            create: {
              id: input.mangaId,
              title: mangaDetails.title.english ?? mangaDetails.title.romaji,
              coverImage: mangaDetails.coverImage.large,
              averageScore: mangaDetails.averageScore,
              genres: mangaDetails.genres,
              author: mangaDetails.staff?.edges.find((edge) => edge.role === "Story & Art")?.node.name.full ?? "Unknown",
              popularity: mangaDetails.popularity ?? 0,
              description: mangaDetails.description ?? "",
            },
            update: {
              title: mangaDetails.title.english ?? mangaDetails.title.romaji,
              coverImage: mangaDetails.coverImage.large,
              averageScore: mangaDetails.averageScore,
              genres: mangaDetails.genres,
              description: mangaDetails.description ?? "",
            },
          });

          // Finally, upsert the MangaList item
          return prisma.mangaList.upsert({
            where: {
              userId_mangaId: {
                userId: user.id,
                mangaId: input.mangaId,
              },
            },
            update: {
              status: input.status,
              likeStatus: input.likeStatus,
            },
            create: {
              userId: user.id,
              mangaId: input.mangaId,
              status: input.status,
              likeStatus: input.likeStatus,
            },
          });
        });

        return result;
      } catch (error) {
        console.error("Error adding to list:", error);
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to add to list" });
      }
    }),

  getUserList: protectedProcedure.query(async ({ ctx }) => {
    const clerkId = ctx.auth.userId;
    if (!clerkId) {
      throw new TRPCError({ code: "UNAUTHORIZED", message: "User not authenticated" });
    }

    try {
      const user = await ctx.db.user.findUnique({
        where: { clerkId },
        include: {
          mangaList: {
            include: {
              manga: true, // Include manga details
            },
          },
        },
      });
      if (!user) {
        throw new TRPCError({ code: "NOT_FOUND", message: "User not found" });
      }

      if (!user.mangaList) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "User manga list not found" });
      }

      return {
        mangaList: user.mangaList as MangaListItem[],
      };
    } catch (error) {
      console.error("Error getting user list:", error);
      throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to get user list" });
    }
  }),

  updateLikeStatus: protectedProcedure
    .input(
      z.object({
        mangaId: z.number(),
        likeStatus: z.enum(["like", "dislike"]).nullable(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const clerkId = ctx.auth.userId;
      if (!clerkId) {
        throw new TRPCError({ code: "UNAUTHORIZED", message: "User not authenticated" });
      }

      try {
        // Fetch manga details from AniList
        const mangaDetails = await getMangaById(input.mangaId);

        const result = await ctx.db.$transaction(async (prisma) => {
          // Use upsert to create or update the user
          const user = await prisma.user.upsert({
            where: { clerkId },
            update: {},
            create: { clerkId },
          });

          // Ensure UserProfile exists
          await prisma.userProfile.upsert({
            where: { userId: user.id },
            update: {},
            create: {
              userId: user.id,
              favoriteGenres: [],
              experience: "",
            },
          });

          // Create or update the manga in our database
          await prisma.manga.upsert({
            where: { id: input.mangaId },
            create: {
              id: input.mangaId,
              title: mangaDetails.title.english ?? mangaDetails.title.romaji,
              coverImage: mangaDetails.coverImage.large,
              averageScore: mangaDetails.averageScore,
              genres: mangaDetails.genres,
              author: mangaDetails.staff?.edges.find((edge) => edge.role === "Story & Art")?.node.name.full ?? "Unknown",
              popularity: mangaDetails.popularity ?? 0,
              description: mangaDetails.description ?? "",
            },
            update: {
              title: mangaDetails.title.english ?? mangaDetails.title.romaji,
              coverImage: mangaDetails.coverImage.large,
              averageScore: mangaDetails.averageScore,
              genres: mangaDetails.genres,
              description: mangaDetails.description ?? "",
            },
          });

          // Update or create the MangaList item
          return prisma.mangaList.upsert({
            where: {
              userId_mangaId: {
                userId: user.id,
                mangaId: input.mangaId,
              },
            },
            update: { likeStatus: input.likeStatus },
            create: {
              userId: user.id,
              mangaId: input.mangaId,
              likeStatus: input.likeStatus,
              status: "Plan to Read",
            },
          });
        });

        return result;
      } catch (error) {
        console.error("Error updating like status:", error);
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to update like status" });
      }
    }),

  removeFromList: protectedProcedure
    .input(
      z.object({
        mangaId: z.number(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const clerkId = ctx.auth.userId!;

      try {
        const user = await ctx.db.user.findUnique({ where: { clerkId } });

        if (!user) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "User not found",
          });
        }

        const deletedItem = await ctx.db.mangaList.deleteMany({
          where: {
            userId: user.id,
            mangaId: input.mangaId,
          },
        });

        if (deletedItem.count === 0) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Manga not found in user's list",
          });
        }

        return { success: true, message: "Manga removed from list" };
      } catch (error) {
        console.error("Error in removeFromList:", error);
        if (error instanceof TRPCError) {
          throw error;
        }
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to remove manga from list",
        });
      }
    }),
});