// src/utils/anilist-api.ts
import { GraphQLClient } from 'graphql-request';

const ANILIST_API_ENDPOINT = 'https://graphql.anilist.co';

export const anilistClient = new GraphQLClient(ANILIST_API_ENDPOINT);
interface PopularMangaResponse {
    Page: {
      media: {
        id: number;
        title: {
          romaji: string;
          english: string;
        };
        coverImage: {
          large: string;
        };
        description: string;
        genres: string[];
        averageScore: number;
      }[];
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

export const getMangaById = async (id: number) => {
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
  const data: {Media:any} = await anilistClient.request(query, variables);
  return data.Media;
};