import { GraphQLClient } from 'graphql-request';

const ANILIST_API_ENDPOINT = 'https://graphql.anilist.co';

// Cache types
interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

// Queue operation type
interface QueueOperation<T> {
  resolve: (value: T | PromiseLike<T>) => void;
  reject: (reason?: Error) => void;
  operation: () => Promise<T>;
}

// Rate limiting configuration
interface RateLimit {
  requests: number;
  windowMs: number;
  queue: QueueOperation<unknown>[];
  count: number;
  lastReset: number;
}

// Initialize cache with proper typing
const cache = new Map<string, CacheEntry<PaginatedResponse | GetMangaByIdResponse>>();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

// Rate limiting setup with proper typing
const RATE_LIMIT: RateLimit = {
  requests: 85,
  windowMs: 60 * 1000,
  queue: [],
  count: 0,
  lastReset: Date.now()
};

export interface AnilistManga {
  status: string;
  popularity: number;
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

interface PageInfo {
  total: number;
  currentPage: number;
  lastPage: number;
  hasNextPage: boolean;
  perPage: number;
}

interface PaginatedResponse {
  Page: {
    pageInfo: PageInfo;
    media: AnilistManga[];
  };
}

export interface PaginatedMangaResult {
  manga: AnilistManga[];
  pageInfo: PageInfo;
}

interface GetMangaByIdResponse {
  Media: AnilistManga;
}

interface GraphQLErrorResponse extends Error {
  response?: {
    status: number;
    headers: Headers;
  };
}

// Query variables types
interface PageVariables {
  page: number;
  perPage: number;
}

interface SearchVariables extends PageVariables {
  search: string;
}

interface IdVariable {
  id: number;
}

// Create rate-limited GraphQL client
class RateLimitedGraphQLClient {
  private client: GraphQLClient;

  constructor(endpoint: string) {
    this.client = new GraphQLClient(endpoint);
  }

  private async executeWithRateLimit<T>(operation: () => Promise<T>): Promise<T> {
    if (Date.now() - RATE_LIMIT.lastReset >= RATE_LIMIT.windowMs) {
      RATE_LIMIT.count = 0;
      RATE_LIMIT.lastReset = Date.now();
    }

    if (RATE_LIMIT.count < RATE_LIMIT.requests) {
      RATE_LIMIT.count++;
      return operation();
    }

    return new Promise<T>((resolve, reject) => {
      RATE_LIMIT.queue.push({ 
        resolve: resolve as (value: unknown) => void, 
        reject, 
        operation 
      });
      
      setTimeout(() => {
        this.processQueue();
      }, RATE_LIMIT.windowMs - (Date.now() - RATE_LIMIT.lastReset));
    });
  }

  private processQueue(): void {
    RATE_LIMIT.count = 0;
    RATE_LIMIT.lastReset = Date.now();

    while (RATE_LIMIT.queue.length > 0 && RATE_LIMIT.count < RATE_LIMIT.requests) {
      const next = RATE_LIMIT.queue.shift();
      if (next) {
        RATE_LIMIT.count++;
        next.operation()
          .then(next.resolve)
          .catch(next.reject);
      }
    }
  }

  async request<T extends PaginatedResponse | GetMangaByIdResponse>(
    query: string, 
    variables: PageVariables | SearchVariables | IdVariable,
    cacheKey?: string
  ): Promise<T> {
    if (cacheKey) {
      const cached = cache.get(cacheKey);
      if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
        return cached.data as T;
      }
    }

    try {
      const data = await this.executeWithRateLimit(() =>
        this.client.request<T>(query, variables)
      );

      if (cacheKey) {
        cache.set(cacheKey, { data, timestamp: Date.now() });
      }

      return data;
    } catch (error) {
      const graphQLError = error as GraphQLErrorResponse;
      if (graphQLError.response?.status === 429) {
        const retryAfter = parseInt(graphQLError.response.headers.get('retry-after') ?? '30');
        await new Promise(resolve => setTimeout(resolve, retryAfter * 1000));
        return this.request<T>(query, variables, cacheKey);
      }
      throw error;
    }
  }
}

export const anilistClient = new RateLimitedGraphQLClient(ANILIST_API_ENDPOINT);

export const getTrendingManga = async (page: number, perPage: number): Promise<PaginatedMangaResult> => {
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
        media(
          type: MANGA,
          sort: [TRENDING_DESC, POPULARITY_DESC],
          isAdult: false,
          countryOfOrigin: JP
        ) {
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

  const variables: PageVariables = { page, perPage };
  const cacheKey = `trending-${page}-${perPage}`;
  
  const data = await anilistClient.request<PaginatedResponse>(
    query, 
    variables,
    cacheKey
  );
  console.log('Trending manga response:', data);
  return {
    manga: data.Page.media,
    pageInfo: data.Page.pageInfo
  };
};

export const getTop100Manga = async (page: number, perPage: number): Promise<PaginatedMangaResult> => {
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
        media(
          type: MANGA,
          sort: [SCORE_DESC, POPULARITY_DESC],
          isAdult: false,
          countryOfOrigin: JP,
        ) {
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
          popularity
        }
      }
    }
  `;

  const variables: PageVariables = { page, perPage };
  const cacheKey = `top100-${page}-${perPage}`;
  
  const data = await anilistClient.request<PaginatedResponse>(
    query, 
    variables,
    cacheKey
  );
  
  return {
    manga: data.Page.media,
    pageInfo: data.Page.pageInfo
  };
};


export const getAllTimePopularManga = async (page: number, perPage: number): Promise<PaginatedMangaResult> => {
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
        media(
          type: MANGA,
          sort: POPULARITY_DESC,
          isAdult: false,
          countryOfOrigin: JP
        ) {
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
          popularity
        }
      }
    }
  `;


  const variables: PageVariables = { page, perPage };
  const cacheKey = `all-time-pupular-${page}-${perPage}`;
  
  const data = await anilistClient.request<PaginatedResponse>(
    query, 
    variables,
    cacheKey
  );
  
  return {
    manga: data.Page.media,
    pageInfo: data.Page.pageInfo
  };
};

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
        status
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

  const variables: IdVariable = { id };
  const cacheKey = `manga-${id}`;
  
  const data = await anilistClient.request<GetMangaByIdResponse>(
    query, 
    variables,
    cacheKey
  );
  
  return data.Media;
};

export const searchManga = async (
  searchQuery: string,
  page: number,
  perPage: number
): Promise<PaginatedMangaResult> => {
  const query = `
    query ($search: String, $page: Int, $perPage: Int) {
      Page(page: $page, perPage: $perPage) {
        pageInfo {
          total
          currentPage
          lastPage
          hasNextPage
          perPage
        }
        media(type: MANGA, search: $search, isAdult: false) {
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

  const variables: SearchVariables = { search: searchQuery, page, perPage };
  
  const data = await anilistClient.request<PaginatedResponse>(query, variables);
  return {
    manga: data.Page.media,
    pageInfo: data.Page.pageInfo
  };
};