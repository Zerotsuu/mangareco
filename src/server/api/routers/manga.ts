// src/server/api/routers/manga.ts
import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";
import { getPopularManga, getMangaById } from "~/utils/anilist-api";

export const mangaRouter = createTRPCRouter({
  getPopular: publicProcedure
    .input(z.object({ page: z.number().default(1), perPage: z.number().default(20) }))
    .query(async ({ input }) => {
      const manga = await getPopularManga(input.page, input.perPage);
      return manga.map((m: any) => ({
        id: m.id,
        title: m.title.english || m.title.romaji,
        coverImage: m.coverImage.large,
        description: m.description,
        genres: m.genres,
        averageScore: m.averageScore,
      }));
    }),

  getById: publicProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const manga = await getMangaById(input.id);
      return {
        id: manga.id,
        title: manga.title.english || manga.title.romaji,
        coverImage: manga.coverImage.large,
        description: manga.description,
        genres: manga.genres,
        averageScore: manga.averageScore,
        author: manga.staff.edges.find((edge: any) => edge.role === "Story & Art")?.node.name.full || "Unknown",
      };
    }),
});