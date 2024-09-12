import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";
import { getPopularManga, getMangaById, type AnilistManga } from "~/utils/anilist-api";

interface MangaPreview {
  id: number;
  title: string;
  coverImage: string;
  description: string;
  genres: string[];
  averageScore: number;
}

interface MangaDetail extends MangaPreview {
  author: string;
}

export const mangaRouter = createTRPCRouter({
  getPopular: publicProcedure
    .input(z.object({ page: z.number().default(1), perPage: z.number().default(20) }))
    .query(async ({ input }): Promise<MangaPreview[]> => {
      const manga = await getPopularManga(input.page, input.perPage);
      return manga.map((m: AnilistManga): MangaPreview => ({
        id: m.id,
        title: m.title.english ?? m.title.romaji,
        coverImage: m.coverImage.large,
        description: m.description,
        genres: m.genres,
        averageScore: m.averageScore,
      }));
    }),

  getById: publicProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }): Promise<MangaDetail> => {
      const manga = await getMangaById(input.id);
      return {
        id: manga.id,
        title: manga.title.english ?? manga.title.romaji,
        coverImage: manga.coverImage.large,
        description: manga.description,
        genres: manga.genres,
        averageScore: manga.averageScore,
        author: manga.staff?.edges.find((edge) => edge.role === "Story & Art")?.node.name.full ?? "Unknown",
      };
    }),
});

export type { MangaPreview, MangaDetail };