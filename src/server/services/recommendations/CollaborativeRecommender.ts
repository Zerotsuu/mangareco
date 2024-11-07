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
  private mangaUserCountsCache: Map<number, number>;
  private readonly minSimilarity: number;

  constructor(minSimilarity = 0.1) {
    this.userMangaMatrix = new Map();
    this.userSimilarityCache = new Map();
    this.mangaUserCountsCache = new Map();
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
    this.updateMangaUserCounts();
  }

  private updateMangaUserCounts(): void {
    this.mangaUserCountsCache.clear();
    this.userMangaMatrix.forEach((userItems) => {
      userItems.forEach((_, mangaId) => {
        this.mangaUserCountsCache.set(
          mangaId,
          (this.mangaUserCountsCache.get(mangaId) ?? 0) + 1
        );
      });
    });
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

    let dotProduct = 0;
    let norm1 = 0;
    let norm2 = 0;

    commonManga.forEach(mangaId => {
      const rating1 = this.getRatingValue(user1Items.get(mangaId)!);
      const rating2 = this.getRatingValue(user2Items.get(mangaId)!);

      dotProduct += rating1 * rating2;
      norm1 += rating1 * rating1;
      norm2 += rating2 * rating2;
    });

    if (norm1 === 0 || norm2 === 0) return 0;

    // Using cosine similarity
    return dotProduct / (Math.sqrt(norm1) * Math.sqrt(norm2));
  }

  private getRatingValue(item: UserMangaItem): number {
    let rating = 0;
    
    // Base rating from like status
    switch (item.likeStatus) {
      case 'like': rating = 0.8; break;
      case 'dislike': rating = -0.8; break;
      default: rating = 0;
    }

    // Reading status multiplier
    switch (item.readingStatus) {
      case 'COMPLETED': rating *= 1.0; break;
      case 'READING': rating *= 0.6; break;
      case 'PLAN_TO_READ': rating *= 0.2; break;
      default: rating *= 0.2;
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

  public async loadAllUsersData(prisma: PrismaClient): Promise<void> {
    try {
      // Clear existing data
      this.userMangaMatrix.clear();
      this.userSimilarityCache.clear();
      this.mangaUserCountsCache.clear();

      // Get all users with their manga lists in a single query
      const allUsers = await prisma.user.findMany({
        where: {
          mangaList: {
            some: {} // Only get users who have manga in their list
          }
        },
        include: {
          mangaList: {
            select: {
              mangaId: true,
              likeStatus: true
            }
          }
        }
      });

      console.log(`Loading data for ${allUsers.length} users`);

      // Process all users
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

      console.log(`Successfully loaded data for ${this.userMangaMatrix.size} users`);
    } catch (error) {
      console.error('Error loading user data:', error);
      throw new Error('Failed to load user data for recommendations');
    }
  }

  public getRecommendations(
    userId: string,
    limit: number,
    excludeIds: Set<number> = new Set<number>()
  ): MangaSimilarity[] {
    const userItems = this.userMangaMatrix.get(userId);
    if (!userItems) return [];

    const similarUsers = this.findSimilarUsers(userId);
    const recommendationScores = new Map<number, { score: number, count: number }>();

    console.log(`Processing recommendations for user ${userId} with ${similarUsers.length} similar users`);

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

    return Array.from(recommendationScores.entries())
      .map(([mangaId, { score, count }]) => ({
        mangaId,
        score: score / count,
        userCount: this.mangaUserCountsCache.get(mangaId) ?? 0
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
  }
}