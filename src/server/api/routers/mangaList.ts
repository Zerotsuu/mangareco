import { Prisma } from "@prisma/client";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";

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
                experience: "", // Initialize with an empty array
              },
            });
          }

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
          mangaList: true, // Removed { include: { manga: true } }
        },
      });
      if (!user) {
        throw new TRPCError({ code: "NOT_FOUND", message: "User not found" });
      }

      return {
        mangaList: user.mangaList,
        userProfile: {
          id: user.id,
          updatedAt: user.updatedAt,
          clerkId: user.clerkId,
          email: user.email,
          createdAt: user.createdAt,
          // experience: user.experience,
          favoriteGenres: user.favoriteGenres,
        },
      };
    } catch (error) {
      console.error("Error getting user list:", error);
      throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to get user list" });
    }
  }),

  updateUserProfile: protectedProcedure
    .input(
      z.object({
        experience: z.string().optional(),
        favoriteGenres: z.array(z.string()).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const clerkId = ctx.auth.userId;
      if (!clerkId) {
        throw new TRPCError({ code: "UNAUTHORIZED", message: "User not authenticated" });
      }

      try {
        const result = await ctx.db.$transaction(async (prisma) => {
          let user = await prisma.user.findUnique({ where: { clerkId } });
          if (!user) {
            user = await prisma.user.create({ data: { clerkId } });
          }

          return prisma.userProfile.upsert({
            where: { userId: user.id },
            update: {
              ...(input.experience && { experience: input.experience ?? '' }),
              ...(input.favoriteGenres && { favoriteGenres: input.favoriteGenres }),
            },
            create: {
              userId: user.id,
              experience: input.experience ?? '',
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
        const result = await ctx.db.$transaction(async (prisma) => {
          // Use upsert to create or update the user
          const user = await prisma.user.upsert({
            where: { clerkId },
            update: {}, // No updates needed if the user exists
            create: { clerkId },
          });
          // Ensure UserProfile exists
          await prisma.userProfile.upsert({
            where: { userId: user.id },
            update: {},
            create: {
              userId: user.id,
              favoriteGenres: [], // Initialize with an empty array
              experience: "", // Provide a default value for the required 'experience' field
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
              status: "Plan to Read", // Default status
            },
          });
        });

        return result;
      } catch (error) {
        console.error("Error updating like status:", error);
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to update like status" });
      }
    }),

  // Remove manga from list
  removeFromList: protectedProcedure
    .input(
      z.object({
        mangaId: z.number(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const clerkId = ctx.auth.userId!;

      try {
        // Find the user by clerkId
        const user = await ctx.db.user.findUnique({ where: { clerkId } });

        if (!user) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "User not found",
          });
        }

        // Find and delete the manga list item
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

// Update like status
//         const updatedItem = await ctx.db.mangaList.upsert({
//           where: {
//             userId_mangaId: {
//               userId: user.id,
//               mangaId: input.mangaId,
//             },
//           },
//           update: {
//             likeStatus: input.likeStatus,
//           },
//           create: {
//             userId: user.id,
//             mangaId: input.mangaId,
//             likeStatus: input.likeStatus,
//             status: 'Plan to Read', // Default status
//           },
//         });

//         try {
//           return updatedItem;
//         } catch (error) { //err handling pls need to be improved
//           console.error('Error in updateLikeStatus:', error);
//           if (error instanceof Prisma.PrismaClientKnownRequestError) {
//             console.error('Prisma error code:', error.code);
//             console.error('Prisma error message:', error.message);
//           }
//           throw new TRPCError({
//             code: 'INTERNAL_SERVER_ERROR',
//             message: 'Failed to update like status',
//           });
//         }

//     }),
// });
