// src/server/services/recommendations/HuggingFaceRecommender.ts
import { HfInference } from '@huggingface/inference';
import type { HuggingFaceModelInput, HuggingFaceModelOutput } from './types';

type HuggingFaceResponse = 
  | number 
  | number[] 
  | { score: number } 
  | { rating: number };

export class huggingFaceRecommender {
  private readonly hf: HfInference;
  private readonly MODEL_ID = 'ZeroShirayuki/manga-recommender';
  private readonly apiToken: string;
  private readonly genreList: readonly string[] = [
    "Action", "Adventure", "Comedy", "Drama", "Fantasy",
    "Horror", "Mystery", "Romance", "Sci-Fi", "Slice of Life",
    "Sports", "Supernatural", "Thriller", "Psychological", "Mecha",
    "Seinen", "Shounen"
  ] as const;

  constructor(apiToken: string) {
    if (!apiToken) throw new Error('HuggingFace API token is required');
    this.apiToken = apiToken;
    this.hf = new HfInference(apiToken);
  }

  async getRecommendation(
    userId: string,
    mangaId: number,
    genres: string[]
  ): Promise<number> {
    try {
      const input = {
        inputs: {
          user_id: userId,
          manga_id: mangaId.toString(),
          genres: this.encodeGenres(genres)
        }
      };

      console.log('Sending request to HuggingFace:', {
        model: this.MODEL_ID,
        input: input
      });

      const response = await fetch(
        `https://api-inference.huggingface.co/models/${this.MODEL_ID}`, 
        {
          headers: { 
            'Authorization': `Bearer ${this.apiToken}`,
            'Content-Type': 'application/json'
          },
          method: 'POST',
          body: JSON.stringify(input)
        }
      );

      if (!response.ok) {
        const error = await response.text();
        console.error('HuggingFace API error response:', {
          status: response.status,
          statusText: response.statusText,
          error: error
        });
        throw new Error(`API request failed: ${error}`);
      }

      const result = await response.json() as HuggingFaceResponse;
      console.log('HuggingFace raw response:', result);

      // Type guard functions
      const isNumberArray = (value: unknown): value is number[] => 
        Array.isArray(value) && value.every(item => typeof item === 'number');

      const isScoreObject = (value: unknown): value is { score: number } =>
        typeof value === 'object' && value !== null && 'score' in value && 
        typeof (value as { score: unknown }).score === 'number';

      const isRatingObject = (value: unknown): value is { rating: number } =>
        typeof value === 'object' && value !== null && 'rating' in value && 
        typeof (value as { rating: unknown }).rating === 'number';

      // Handle different response formats with type safety
      if (typeof result === 'number') {
        return result;
      }
      if (isNumberArray(result) && result.length > 0) {
        return result[0]!;
      }
      if (isScoreObject(result)) {
        return result.score;
      }
      if (Array.isArray(result) && result.length > 0 && isRatingObject(result[0])) {
        return result[0].rating;
      }
      if (isRatingObject(result)) {
        return result.rating;
      }

      throw new Error(`Unexpected response format from model: ${JSON.stringify(result)}`);
    } catch (error) {
      console.error('HuggingFace API error:', {
        userId,
        mangaId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  private encodeGenres(genres: string[]): number[] {
    return this.genreList.map((genre) => 
      genres.includes(genre) ? 1 : 0
    );
  }
}