import { Prisma } from "@prisma/client";
import { TRPCError } from "@trpc/server";
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

    updateLikeStatus: protectedProcedure
      .input(z.object({
        mangaId: z.number(),
        likeStatus: z.enum(['like', 'dislike']).nullable(),
      }))
      .mutation(async ({ ctx, input }) => { const userId = ctx.auth.userId!;
        try {
          // Find User
          let user = await ctx.db.user.findUnique({ where: { id: userId } });

          // Check if user exists, create if not
          if(!user) {
            user = await ctx.db.user.create({
              data: { id: userId, clerkId: userId },
            });
          }

          let mangaListItem = await ctx.db.mangaList.findFirst({
            where: {
              userId:user.id,
              mangaId: input.mangaId,
            },
          });
           if (mangaListItem) {
            //Update existing entry
            mangaListItem = await ctx.db.mangaList.update({
              where: {id: mangaListItem.id},
              data: {
                likeStatus: input.likeStatus,
              },
            });
          } else {
            //Create new entry
            mangaListItem = await ctx.db.mangaList.create({
              data: {
                userId: user.id,
                mangaId: input.mangaId,
                likeStatus: input.likeStatus,
                status: 'Plan to Read', // Default status
              },
            });
          }
          return mangaListItem;
        } catch (error) {
          console.error('Error updating like status:', error);
          if (error instanceof Prisma.PrismaClientKnownRequestError) {
            console.error('Prisma error code:', error.code);
            console.error('Prisma error message:', error.message);
          }
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: 'Failed to update like status',
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