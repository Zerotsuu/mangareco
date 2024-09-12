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

interface PopularMangaResponse {
  Page: {
    media: AnilistManga[];
  };
}
export const getPopularManga = async (page: number, perPage: number) => {
  const query = `
    query ($page: Int, $perPage: Int) {
      Page(page: $page, perPage: $perPage) {
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
  const data = await anilistClient.request<PopularMangaResponse>(query, variables);
  return data.Page.media;
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