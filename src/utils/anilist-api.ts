import { GraphQLClient } from 'graphql-request';

const ANILIST_API_ENDPOINT = 'https://graphql.anilist.co';

export const anilistClient = new GraphQLClient(ANILIST_API_ENDPOINT);

export interface AnilistManga {
  id: number;
  title: {
    romaji: string;
    english: string | null;
  };
  coverImage: {
    large: string;
  };
  description: string;
  genres: string[];
  averageScore: number;
  staff?: {
    edges: Array<{
      role: string;
      node: {
        name: {
          full: string;
        };
      };
    }>;
  };
}

interface PaginatedResponse {
  Page: {
    pageInfo: {
      total: number;
      currentPage: number;
      lastPage: number;
      hasNextPage: boolean;
      perPage: number;
    };
    media: AnilistManga[];
  };
}

export interface PaginatedMangaResult {
  manga: AnilistManga[];
  pageInfo: {
    total: number;
    currentPage: number;
    lastPage: number;
    hasNextPage: boolean;
    perPage: number;
  };
}

export const getPopularManga = async (page: number, perPage: number): Promise<PaginatedMangaResult> => {
  const query = `
    query ($page: Int, $perPage: Int) {
      Page(page: $page, perPage: $perPage) {
        pageInfo {
          total
          currentPage
          lastPage
          hasNextPage
          perPage
        }
        media(type: MANGA, sort: POPULARITY_DESC) {
          id
          title {
            romaji
            english
          }
          coverImage {
            large
          }
          description
          genres
          averageScore
        }
      }
    }
  `;

  const variables = { page, perPage };
  const data = await anilistClient.request<PaginatedResponse>(query, variables);
  return {
    manga: data.Page.media,
    pageInfo: data.Page.pageInfo
  };
};

interface GetMangaByIdResponse {
  Media: AnilistManga;
}

export const getMangaById = async (id: number): Promise<AnilistManga> => {
  const query = `
    query ($id: Int) {
      Media(id: $id, type: MANGA) {
        id
        title {
          romaji
          english
        }
        coverImage {
          large
        }
        description
        genres
        averageScore
        staff {
          edges {
            role
            node {
              name {
                full
              }
            }
          }
        }
      }
    }
  `;

  const variables = { id };
  const data = await anilistClient.request<GetMangaByIdResponse>(query, variables);
  return data.Media;
};

export interface SearchMangaResponse {
  Page: {
    pageInfo: {
      total: number;
      currentPage: number;
      lastPage: number;
      hasNextPage: boolean;
      perPage: number;
    };
    media: AnilistManga[];
  };
}

export const searchManga = async (
  query: string,
  page: number,
  perPage: number
): Promise<PaginatedMangaResult> => {
  const searchQuery = `
    query ($search: String, $page: Int, $perPage: Int) {
      Page(page: $page, perPage: $perPage) {
        pageInfo {
          total
          currentPage
          lastPage
          hasNextPage
          perPage
        }
        media(type: MANGA, search: $search) {
          id
          title {
            romaji
            english
          }
          coverImage {
            large
          }
          description
          genres
          averageScore
        }
      }
    }
  `;

  const variables = { search: query, page, perPage };
  const data = await anilistClient.request<SearchMangaResponse>(searchQuery, variables);
  return {
    manga: data.Page.media,
    pageInfo: data.Page.pageInfo
  };
};