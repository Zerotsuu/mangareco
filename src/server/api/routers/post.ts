import { z } from "zod";
import { createTRPCRouter, protectedProcedure, publicProcedure } from "~/server/api/trpc";
import { TRPCError } from "@trpc/server";

// Define the Post type based on your Prisma schema
type Post = {
  id: number;
  name: string;
  createdAt: Date;
  updatedAt: Date;
  createdById: string;
};

export const postRouter = createTRPCRouter({
  hello: publicProcedure
    .input(z.object({ text: z.string() }))
    .query(({ input }) => {
      return {
        greeting: `Hello ${input.text}`,
      };
    }),

  create: protectedProcedure
    .input(z.object({ name: z.string().min(1) }))
    .mutation(async ({ ctx, input }): Promise<Post> => {
      if (!ctx.session) {
        throw new TRPCError({ code: "UNAUTHORIZED" });
      }

      return ctx.db.post.create({
        data: {
          name: input.name,
          createdById: ctx.session.userId,
        },
      });
    }),

  getLatest: publicProcedure.query(async ({ ctx }): Promise<Post | null> => {
    return ctx.db.post.findFirst({
      orderBy: { createdAt: "desc" },
    });
  }),
});