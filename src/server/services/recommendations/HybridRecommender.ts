// src/server/services/recommendations/HybridRecommender.ts

import { ContentBasedRecommender } from './ContentBasedRecommender';
import { CollaborativeRecommender } from './CollaborativeRecommender';
import {
    type UserMangaItem,
    type MangaRecommendation,
    type RecommenderConfig,
    RecommendationError
} from './types';
import type { UserProfile } from '@prisma/client';
import MangaRecommendations from '~/app/_components/Recommendations';

export class HybridRecommender {
    private contentBased: ContentBasedRecommender;
    private collaborative: CollaborativeRecommender;
    private readonly contentWeight: number;
    private readonly collaborativeWeight: number;

    constructor(
        csvData: string,
        contentWeight = 0.6,
        collaborativeWeight = 0.4,
        config?: Partial<RecommenderConfig>
    ) {
        this.contentBased = new ContentBasedRecommender(csvData, config);
        this.collaborative = new CollaborativeRecommender();
        this.contentWeight = contentWeight;
        this.collaborativeWeight = collaborativeWeight;
    }

    public updateUserData(userId: string, items: UserMangaItem[]): void {
        this.collaborative.updateUserInteractions(userId, items);
    }

    public getRecommendations(
        userId: string,
        userList: UserMangaItem[],
        userProfile: UserProfile,
        limit: number,
        excludeIds: number[] = []
    ): MangaRecommendation[] {
        // Get recommendations from both systems
        const contentBasedRecs = this.contentBased.getRecommendations(
            userList,
            userProfile,
            limit * 2,
            excludeIds
        );

        const collaborativeRecs = this.collaborative.getRecommendations(
            userId,
            limit * 2,
            new Set(excludeIds)
        );

        // Create a map for combined scores
        const combinedScores = new Map<number, number>();

        // Normalize and combine content-based scores
        contentBasedRecs.forEach(rec => {
            combinedScores.set(
                rec.id,
                (rec.similarity * this.contentWeight) +
                (combinedScores.get(rec.id) ?? 0)
            );
        });

        // Normalize and combine collaborative scores
        collaborativeRecs.forEach(rec => {
            combinedScores.set(
                rec.mangaId,
                (rec.score * this.collaborativeWeight) +
                (combinedScores.get(rec.mangaId) ?? 0)
            );
        });

        // Sort and return final recommendations
        return Array.from(combinedScores.entries())
            .sort((a, b) => b[1] - a[1])
            .slice(0, limit)
            .map(([id, score]): MangaRecommendation => {
                const contentRec = contentBasedRecs.find(rec => rec.id === id);
                const manga = this.contentBased.getManga(id);
                if (!manga) {
                    throw new RecommendationError("Manga not found", 'DATA_ERROR');
                }

                return {
                    id,
                    title: manga.title,
                    averageScore: manga.averageScore,
                    genres: manga.genres,
                    similarity: score,
                    coverImage: '/default-cover.jpg',
                    matchDetails: contentRec?.matchDetails ?? {
                        genreMatch: 0,
                        themeMatch: 0,
                        scoreMatch: 0,
                        overallScore: score
                    },
                    metadata: manga.metadata ?? {
                        chapters: 0,
                        status: "FINISHED" as const,
                        popularity: 0,
                        favorites: 0,
                        isAdult: false
                    },
                };
            });
    }
}