// src/server/services/recommendations/MatrixFactorizationRecommender.ts
import { UserMangaItem } from "./types";

interface HuggingFaceResponse {
  manga_ids: number[];
  scores: number[];
}

interface MangaSimilarity {
  mangaId: number;
  score: number;
  userCount: number;
}

export class MatrixFactorizationRecommender {
  private readonly HF_API_URL = process.env.HUGGING_FACE_API_URL;
  private readonly HF_API_KEY = process.env.HUGGING_FACE_TOKEN;

  async getRecommendations(
    userId: string,
    limit = 10,
    excludeIds: Set<number> = new Set<number>()
  ): Promise<MangaSimilarity[]> {
    try {
      const response = await fetch(
        `${this.HF_API_URL}/predict`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.HF_API_KEY}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            user_id: userId,
            top_k: limit + excludeIds.size // Request extra items to account for exclusions
          })
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to get recommendations: ${errorText}`);
      }

      const predictions = await response.json() as HuggingFaceResponse;

      // Filter out excluded manga and map to correct format
      return predictions.manga_ids
        .filter((mangaId, index) =>
          !excludeIds.has(mangaId) &&
          predictions.scores[index] !== undefined
        )
        .map((mangaId, index) => ({
          mangaId,
          score: predictions.scores[index]!,
          userCount: 0 // This could be updated if you track this information
        }))
        .slice(0, limit); // Ensure we only return requested number of items

    } catch (error) {
      console.error('Error getting recommendations:', error);
      throw error;
    }
  }

  async updateModel(newRatings: UserMangaItem[], userId: string): Promise<void> {
    try {
      // Convert ratings to the format expected by the model
      const formattedRatings = newRatings.map(rating => ({
        user_id: userId,
        manga_id: rating.mangaId,
        rating: this.convertLikeStatusToRating(rating.likeStatus)
      }));

      const response = await fetch(
        `${this.HF_API_URL}/update`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.HF_API_KEY}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ ratings: formattedRatings })
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to update model: ${errorText}`);
      }

      const result = await response.json() as { success: boolean };
      console.log('Model update result:', result);

    } catch (error) {
      console.error('Error updating model:', error);
      throw error;
    }
  }

  private convertLikeStatusToRating(likeStatus: string | null): number {
    switch (likeStatus) {
      case 'like': return 1.0;
      case 'dislike': return -1.0;
      default: return 0.0;
    }
  }

  async getModelInfo(): Promise<{
    num_users: number;
    num_manga: number;
    embedding_size: number;
  }> {
    try {
      const response = await fetch(
        `${this.HF_API_URL}/model-info`,
        {
          headers: {
            'Authorization': `Bearer ${this.HF_API_KEY}`
          }
        }
      );

      if (!response.ok) {
        throw new Error('Failed to get model info');
      }

      return await response.json() as {
        num_users: number;
        num_manga: number;
        embedding_size: number;
      };
    } catch (error) {
      console.error('Error getting model info:', error);
      throw error;
    }
  }
}