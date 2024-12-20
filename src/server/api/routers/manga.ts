import { z } from "zod";
import { createTRPCRouter, protectedProcedure, publicProcedure } from "~/server/api/trpc";
import { 
  getAllTimePopularManga, 
  getTrendingManga, 
  getTop100Manga,
  getMangaById, 
  type AnilistManga, 
  searchManga 
} from "~/utils/anilist-api";
import { db } from "~/server/db";

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
  userLikeStatus: "like" | "dislike" | null
  isInUserList: boolean;
}

interface PaginatedMangaResponse {
  manga: MangaPreview[];
  pageInfo: {
    total: number;
    currentPage: number;
    lastPage: number;
    hasNextPage: boolean;
    perPage: number;
  };
}

export const mangaRouter = createTRPCRouter({
  // Get trending manga
  getTrending: publicProcedure
    .input(z.object({ page: z.number().default(1), perPage: z.number().default(20) }))
    .query(async ({ input }): Promise<PaginatedMangaResponse> => {
      const result = await getTrendingManga(input.page, input.perPage);
      const mangaPreviews = result.manga.map((m: AnilistManga): MangaPreview => ({
        id: m.id,
        title: m.title.english ?? m.title.romaji,
        coverImage: m.coverImage.large,
        description: m.description,
        genres: m.genres,
        averageScore: m.averageScore,
      }));
      return {
        manga: mangaPreviews,
        pageInfo: result.pageInfo,
      };
    }),

  // Get all-time popular manga (renamed from getPopular)
  getAllTimePopular: publicProcedure
    .input(z.object({ page: z.number().default(1), perPage: z.number().default(20) }))
    .query(async ({ input }): Promise<PaginatedMangaResponse> => {
      const result = await getAllTimePopularManga(input.page, input.perPage);
      const mangaPreviews = result.manga.map((m: AnilistManga): MangaPreview => ({
        id: m.id,
        title: m.title.english ?? m.title.romaji,
        coverImage: m.coverImage.large,
        description: m.description,
        genres: m.genres,
        averageScore: m.averageScore,
      }));
      return {
        manga: mangaPreviews,
        pageInfo: result.pageInfo,
      };
    }),

  // Get top 100 manga
  getTop100: publicProcedure
    .input(z.object({ page: z.number().default(1), perPage: z.number().default(20) }))
    .query(async ({ input }): Promise<PaginatedMangaResponse> => {
      const result = await getTop100Manga(input.page, input.perPage);
      const mangaPreviews = result.manga.map((m: AnilistManga): MangaPreview => ({
        id: m.id,
        title: m.title.english ?? m.title.romaji,
        coverImage: m.coverImage.large,
        description: m.description,
        genres: m.genres,
        averageScore: m.averageScore,
      }));
      return {
        manga: mangaPreviews,
        pageInfo: result.pageInfo,
      };
    }),

  getById: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ ctx, input }): Promise<MangaDetail> => {
      const manga = await getMangaById(input.id);
      const clerkId = ctx.auth.userId;

      let userLikeStatus: 'like' | 'dislike' | null = null;
      let isInUserList = false;

      if (clerkId) {
        const user = await ctx.db.user.findUnique({ where: { clerkId } });
        if (user) {
          const mangaListItem = await ctx.db.mangaList.findUnique({
            where: {
              userId_mangaId: {
                userId: user.id,
                mangaId: input.id,
              },
            },
            select: { likeStatus: true },
          });
          userLikeStatus = mangaListItem?.likeStatus as 'like' | 'dislike' | null;
          isInUserList = !!mangaListItem;
        }
      }

      return {
        id: manga.id,
        title: manga.title.english ?? manga.title.romaji,
        coverImage: manga.coverImage.large,
        description: manga.description,
        genres: manga.genres,
        averageScore: manga.averageScore,
        author: manga.staff?.edges.find((edge) => edge.role === "Story & Art")?.node.name.full ?? "Unknown",
        userLikeStatus,
        isInUserList,
      };
    }),

  getByIds: publicProcedure
    .input(z.object({ ids: z.array(z.number()) }))
    .query(async ({ input }): Promise<MangaDetail[]> => {
      const mangaPromises = input.ids.map(async (id) => {
        const manga = await getMangaById(id);
        return {
          id: manga.id,
          title: manga.title.english ?? manga.title.romaji,
          coverImage: manga.coverImage.large,
          description: manga.description,
          genres: manga.genres,
          averageScore: manga.averageScore,
          author: manga.staff?.edges.find((edge) => edge.role === "Story & Art")?.node.name.full ?? "Unknown",
          userLikeStatus: null,
          isInUserList: false,
        };
      });
      return Promise.all(mangaPromises);
    }),

  search: publicProcedure
    .input(z.object({
      query: z.string(),
      page: z.number().int().positive(),
      perPage: z.number().int().positive().max(50)
    }))
    .query(async ({ input }) => {
      const { query, page, perPage } = input;
      return await searchManga(query, page, perPage);
    }),
});

export type { MangaPreview, MangaDetail, PaginatedMangaResponse };