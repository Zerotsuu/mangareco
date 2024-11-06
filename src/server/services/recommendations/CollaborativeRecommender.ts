// src/server/services/recommendations/CollaborativeRecommender.ts

import type { UserMangaItem } from './types';

interface UserSimilarity {
  userId: string;
  similarity: number;
}

interface MangaSimilarity {
  mangaId: number;
  score: number;
}

export class CollaborativeRecommender {
  private userMangaMatrix: Map<string, Map<number, UserMangaItem>>;
  private userSimilarityCache: Map<string, UserSimilarity[]>;
  private readonly minSimilarity: number;

  constructor(minSimilarity = 0.1) {
    this.userMangaMatrix = new Map();
    this.userSimilarityCache = new Map();
    this.minSimilarity = minSimilarity;
  }

  // Add or update a user's manga interactions
  public updateUserInteractions(userId: string, items: UserMangaItem[]): void {
    const userInteractions = new Map<number, UserMangaItem>();
    items.forEach(item => userInteractions.set(item.mangaId, item));
    this.userMangaMatrix.set(userId, userInteractions);
    // Clear cached similarities for this user
    this.userSimilarityCache.delete(userId);
  }

  // Calculate similarity between two users using Pearson correlation
  private calculateUserSimilarity(user1: string, user2: string): number {
    const user1Items = this.userMangaMatrix.get(user1);
    const user2Items = this.userMangaMatrix.get(user2);

    if (!user1Items || !user2Items) return 0;

    // Find common manga between users
    const commonManga = Array.from(user1Items.keys())
      .filter(mangaId => user2Items.has(mangaId));

    if (commonManga.length < 5) return 0; // Require minimum common items

    let sum1 = 0, sum2 = 0, sum1Sq = 0, sum2Sq = 0, pSum = 0;
    const n = commonManga.length;

    commonManga.forEach(mangaId => {
      const rating1 = this.getRatingValue(user1Items.get(mangaId)!);
      const rating2 = this.getRatingValue(user2Items.get(mangaId)!);

      sum1 += rating1;
      sum2 += rating2;
      sum1Sq += rating1 ** 2;
      sum2Sq += rating2 ** 2;
      pSum += rating1 * rating2;
    });

    // Calculate Pearson correlation coefficient
    const num = pSum - (sum1 * sum2 / n);
    const den = Math.sqrt(
      (sum1Sq - sum1 ** 2 / n) *
      (sum2Sq - sum2 ** 2 / n)
    );

    return den === 0 ? 0 : num / den;
  }

  // Convert like/dislike status to numeric rating
  private getRatingValue(item: UserMangaItem): number {
    switch (item.likeStatus) {
      case 'like': return 1;
      case 'dislike': return -1;
      default: return 0;
    }
  }

  // Find similar users
  private findSimilarUsers(userId: string): UserSimilarity[] {
    // Check cache first
    if (this.userSimilarityCache.has(userId)) {
      return this.userSimilarityCache.get(userId)!;
    }

    const similarities: UserSimilarity[] = [];
    this.userMangaMatrix.forEach((_, otherUserId) => {
      if (otherUserId !== userId) {
        const similarity = this.calculateUserSimilarity(userId, otherUserId);
        if (similarity > this.minSimilarity) {
          similarities.push({ userId: otherUserId, similarity });
        }
      }
    });

    // Sort by similarity and cache results
    const sortedSimilarities = similarities.sort((a, b) => b.similarity - a.similarity);
    this.userSimilarityCache.set(userId, sortedSimilarities);

    return sortedSimilarities;
  }

  // Get recommendations for a user
  public getRecommendations(
    userId: string,
    limit: number,
    excludeIds: Set<number> = new Set<number>()
  ): MangaSimilarity[] {
    const userItems = this.userMangaMatrix.get(userId);
    if (!userItems) return [];

    const similarUsers = this.findSimilarUsers(userId);
    const recommendationScores = new Map<number, { score: number, count: number }>();

    // Aggregate recommendations from similar users
    similarUsers.forEach(({ userId: similarUserId, similarity }) => {
      const similarUserItems = this.userMangaMatrix.get(similarUserId);
      if (!similarUserItems) return;

      similarUserItems.forEach((item, mangaId) => {
        if (!userItems.has(mangaId) && !excludeIds.has(mangaId)) {
          const rating = this.getRatingValue(item);
          const weightedRating = rating * similarity;

          const current = recommendationScores.get(mangaId) ?? { score: 0, count: 0 };
          recommendationScores.set(mangaId, {
            score: current.score + weightedRating,
            count: current.count + 1
          });
        }
      });
    });

    // Calculate final scores and sort recommendations
    const recommendations: MangaSimilarity[] = Array.from(recommendationScores.entries())
      .map(([mangaId, { score, count }]) => ({
        mangaId,
        score: score / count // Normalize by number of ratings
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);

    return recommendations;
  }
}