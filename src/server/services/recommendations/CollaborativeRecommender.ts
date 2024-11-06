// src/server/services/recommendations/CollaborativeRecommender.ts

import { PrismaClient } from '@prisma/client';
import type { UserMangaItem } from './types';

interface UserSimilarity {
  userId: string;
  similarity: number;
}

interface MangaSimilarity {
  mangaId: number;
  score: number;
  userCount: number;
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

  public getAllUsers(): { userId: string; mangaCount: number }[] {
    return Array.from(this.userMangaMatrix.entries()).map(([userId, mangaList]) => ({
      userId,
      mangaCount: mangaList.size
    }));
  }

  public updateUserInteractions(userId: string, items: UserMangaItem[]): void {
    const userInteractions = new Map<number, UserMangaItem>();
    items.forEach(item => userInteractions.set(item.mangaId, item));
    this.userMangaMatrix.set(userId, userInteractions);
    this.userSimilarityCache.delete(userId);
  }

  public getUserSimilarityDetails(userId: string): {
    similarUsers: UserSimilarity[];
    totalUsers: number;
    userMangaCount: number;
  } {
    const similarUsers = this.findSimilarUsers(userId);
    const userMangaCount = this.userMangaMatrix.get(userId)?.size ?? 0;

    return {
      similarUsers,
      totalUsers: this.userMangaMatrix.size,
      userMangaCount
    };
  }



  private calculateUserSimilarity(user1: string, user2: string): number {
    const user1Items = this.userMangaMatrix.get(user1);
    const user2Items = this.userMangaMatrix.get(user2);

    if (!user1Items || !user2Items) return 0;

    const commonManga = Array.from(user1Items.keys())
      .filter(mangaId => user2Items.has(mangaId));

    if (commonManga.length < 2) return 0;

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

    const num = pSum - (sum1 * sum2 / n);
    const den = Math.sqrt(
      (sum1Sq - sum1 ** 2 / n) *
      (sum2Sq - sum2 ** 2 / n)
    );

    if (den === 0) return 0;

    // Calculate similarity and ensure it's between 0 and 1
    const rawSimilarity = num / den;
    const normalizedSimilarity = Math.max(0, Math.min(1, (rawSimilarity + 1) / 2));

    console.log(`Raw similarity: ${rawSimilarity}, Normalized: ${normalizedSimilarity}`);

    return normalizedSimilarity;
  }

  private getRatingValue(item: UserMangaItem): number {
    let rating = 0;
    switch (item.likeStatus) {
      case 'like': rating = 0.8; break;
      case 'dislike': rating = 0.8; break;
      default: rating = 0;
    }

    switch (item.readingStatus) {
      case 'COMPLETED': rating *= 1.1; break;
      case 'READING': rating *= 1.0; break;
      case 'PLAN_TO_READ': rating *= 0.9; break;
      default: rating *= 0.9;
    }

    return rating;
  }

  private findSimilarUsers(userId: string): UserSimilarity[] {
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

    const sortedSimilarities = similarities.sort((a, b) => b.similarity - a.similarity);
    this.userSimilarityCache.set(userId, sortedSimilarities);

    return sortedSimilarities;
  }

  // Add method to load all users' data
  public async loadAllUsersData(prisma: PrismaClient): Promise<void> {
    const allUsers = await prisma.user.findMany({
      include: {
        mangaList: true
      }
    });

    console.log(`Loading data for ${allUsers.length} users`);

    allUsers.forEach(user => {
      if (user.mangaList && user.mangaList.length > 0) {
        this.updateUserInteractions(
          user.clerkId,
          user.mangaList.map(item => ({
            mangaId: item.mangaId,
            readingStatus: 'COMPLETED',
            likeStatus: item.likeStatus as "like" | "dislike" | null
          }))
        );
      }
    });

    console.log(`Loaded data for ${this.userMangaMatrix.size} users`);
  }

  public getRecommendations(
    userId: string,
    limit: number,
    excludeIds: Set<number> = new Set<number>()
  ): MangaSimilarity[] {
    const userItems = this.userMangaMatrix.get(userId);
    if (!userItems) return [];

    const similarUsers = this.findSimilarUsers(userId);
    console.log(`Found ${similarUsers.length} similar users for user ${userId}`);

    const recommendationScores = new Map<number, { score: number, count: number, userCount:number }>(); 

    // First pass: count how many users have each manga
    const mangaUserCounts = new Map<number, number>();
    this.userMangaMatrix.forEach((userItems) => {
      userItems.forEach((_, mangaId) => {
        mangaUserCounts.set(mangaId, (mangaUserCounts.get(mangaId) ?? 0) + 1);
      });
    });

    similarUsers.forEach(({ userId: similarUserId, similarity }) => {
      const similarUserItems = this.userMangaMatrix.get(similarUserId);
      if (!similarUserItems) return;

      console.log(`Processing similar user ${similarUserId} with similarity ${similarity}`);

      similarUserItems.forEach((item, mangaId) => {
        if (!userItems.has(mangaId) && !excludeIds.has(mangaId)) {
          const rating = this.getRatingValue(item);
          const weightedRating = rating * similarity;
          const userCount = mangaUserCounts.get(mangaId) ?? 0;

          const current = recommendationScores.get(mangaId) ?? { score: 0, count: 0 , userCount:userCount};
          recommendationScores.set(mangaId, {
            score: current.score + weightedRating,
            count: current.count + 1,
            userCount:userCount
          });
        }
      });
    });



    return Array.from(recommendationScores.entries())
      .map(([mangaId, { score, count, userCount }]) => ({
        mangaId,
        score: score / count,
        userCount: userCount
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
  }
}