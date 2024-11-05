import {
  type MangaFeatures,
  type SimilarityResult,
  type UserMangaItem,
  type RecommenderConfig,
  type WeightedFeature
} from './types';
import type { UserProfile } from "@prisma/client";
import { z } from 'zod';

// Validation schemas (AI)
const configSchema = z.object({
  minSimilarity: z.number().min(0).max(1),
  weightLikes: z.number(),
  weightDislikes: z.number(),
  defaultWeight: z.number(),
  genreImportance: z.number().min(0),
  themeImportance: z.number().min(0),
  scoreImportance: z.number().min(0),
  userExperienceWeight: z.object({
    new: z.number(),
    intermediate: z.number(),
    experienced: z.number()
  })
});

export class ContentBasedRecommender {
  private mangaFeatures = new Map<number, MangaFeatures>();
  private config: RecommenderConfig;
  private validationErrors: string[] = [];

  constructor(csvData: string, config: Partial<RecommenderConfig> = {}) {
    this.config = {
      minSimilarity: 0.1,
      weightLikes: 2.0,
      weightDislikes: -1.0,
      defaultWeight: 1.0,
      genreImportance: 1.0,
      themeImportance: 0.8,
      scoreImportance: 0.5,
      userExperienceWeight: {
        new: 0.7,
        intermediate: 1.0,
        experienced: 1.3,
      },
      ...config
    };

    this.loadFeaturesFromCSV(csvData);
    this.logValidationSummary();
  }

  private logValidationSummary(): void {
    if (this.validationErrors.length > 0) {
      console.warn(`Found ${this.validationErrors.length} validation issues during initialization`);
      console.warn('First few issues:', this.validationErrors.slice(0, 5));
    }
    console.log(`Successfully loaded ${this.mangaFeatures.size} valid manga features`);
  }

  private loadFeaturesFromCSV(csvData: string): void {
    try {
      const lines = csvData.trim().split('\n');
      if (lines.length < 2) {
        throw new Error('CSV data is empty or invalid');
      }

      const headers = lines[0]?.split(',') ?? [];
      const genreEndIndex = headers.findIndex(h => h === '4-koma');
      
      if (genreEndIndex === -1) {
        throw new Error('Invalid CSV format: genre delimiter not found');
      }

      // Pre-calculate indices
      const idIndex = 0;
      const titleIndex = 1;
      const scoreIndex = 2;
      const genreStartIndex = 4;

      // Process each line
      for (let i = 1; i < lines.length; i++) {
        const line = lines[i]?.trim() ?? '';
        if (!line) continue;

        try {
          const values = line.split(',');
          const id = parseInt(values[idIndex]??`0`);
          
          if (isNaN(id) || id <= 0) {
            this.validationErrors.push(`Invalid ID at line ${i + 1}: ${values[idIndex]}`);
            continue;
          }

          // Extract genres
          const genres = headers
            .slice(genreStartIndex, genreEndIndex)
            .filter((_, index) => values[index + genreStartIndex] === '1');

          // Parse features with validation (AI)
          const features = values.slice(genreEndIndex).map(v => {
            const num = parseFloat(v);
            return isNaN(num) ? 0 : num;
          });

          // Basic validation
          if (features.length === 0) {
            this.validationErrors.push(`No features found for manga ID ${id} at line ${i + 1}`);
            continue;
          }

          let averageScore = parseFloat(values[scoreIndex] ?? '0');
          if (averageScore < 0 || averageScore > 100) {
            this.validationErrors.push(`Invalid score for manga ID ${id}: ${averageScore}`);
            averageScore = 0;
          }

          this.mangaFeatures.set(id, {
            id,
            title: values[titleIndex]?.trim() ?? `Unknown Title ${id}`,
            averageScore,
            genres,
            features
          });

        } catch (error) {
          this.validationErrors.push(`Error processing line ${i + 1}: ${error?.toString() ?? 'Unknown error'}`);
          continue;
        }
      }

      // Validate final data 
      if (this.mangaFeatures.size === 0) {
        throw new Error('No valid manga features were loaded');
      }

    } catch (error) {
      console.error('Error loading features from CSV:', error);
      throw new Error('Failed to initialize recommendation system');
    }
  }

  private calculateCosineSimilarity(vec1: number[], vec2: number[]): number {
    if (vec1.length !== vec2.length) return 0;

    let dotProduct = 0;
    let norm1 = 0;
    let norm2 = 0;

    for (let i = 0; i < vec1.length; i++) {
      dotProduct += (vec1[i] ?? 0) * (vec2[i] ?? 0);
      norm1 += (vec1[i] ?? 0) ** 2;
      norm2 += (vec2[i] ?? 0) ** 2;
    }

    const normProduct = Math.sqrt(norm1) * Math.sqrt(norm2);
    return normProduct === 0 ? 0 : dotProduct / normProduct;
  }

  public getRecommendations(
    userList: UserMangaItem[],
    userProfile: UserProfile,
    limit: number,
    excludeIds: number[] = []
  ): SimilarityResult[] {
    if (!userList.length) {
      throw new Error('User list is empty');
    }

    // Validate user's manga list
    const validUserList = userList.filter(item => this.mangaFeatures.has(item.mangaId));
    if (validUserList.length === 0) {
      throw new Error('No valid manga found in user list');
    }

    // console.log(`Processing ${validUserList.length} valid manga from user's list`);

    const userFeatureProfile = this.getUserFeatureProfile(validUserList);
    const similarities: SimilarityResult[] = [];
    const excludeSet = new Set(excludeIds);
    

    // Process manga in batches for better performance (AI)
    const BATCH_SIZE = 1000;
    const mangaEntries = Array.from(this.mangaFeatures.entries());

    for (let i = 0; i < mangaEntries.length; i += BATCH_SIZE) {
      const batch = mangaEntries.slice(i, i + BATCH_SIZE);
      
      batch.forEach(([id, manga]) => {
        if (excludeSet.has(id)) return;

        const similarity = this.calculateCosineSimilarity(
          userFeatureProfile,
          manga.features
        );

        if (similarity >= this.config.minSimilarity) {
          similarities.push({ 
            id, 
            similarity,
            matchDetails: {
              overallScore: similarity,
              genreMatch: this.calculateGenreMatch(manga, userProfile),
              themeMatch: this.calculateThemeMatch(manga.features, userFeatureProfile),
              scoreMatch: this.calculateScoreMatch(manga.averageScore)
            }
          });
        }
      });
    }

    console.log(`Found ${similarities.length} potential recommendations`);

    return similarities
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, limit);
  }

  private getUserFeatureProfile(userList: UserMangaItem[]): number[] {
    const featureLength = this.getFeatureLength();
    const weightedFeatures = new Array(featureLength).fill(0);
    let totalWeight = 0;

    userList.forEach(item => {
      const manga = this.mangaFeatures.get(item.mangaId);
      if (!manga) return;

      const weight = this.getItemWeight(item.likeStatus);
      manga.features.forEach((feat, idx) => {
        weightedFeatures[idx] += feat * weight;
      });
      totalWeight += Math.abs(weight);
    });

    return totalWeight > 0 ? weightedFeatures.map(feat => feat / totalWeight): weightedFeatures as number[];
  }

  private getItemWeight(likeStatus: string | null): number {
    switch (likeStatus) {
      case 'like': return this.config.weightLikes;
      case 'dislike': return this.config.weightDislikes;
      default: return this.config.defaultWeight;
    }
  }

  private getFeatureLength(): number {
    const firstManga = this.mangaFeatures.values().next().value;
    if (!firstManga) {
      throw new Error('No manga features available');
    }
    return firstManga.features.length;
  }

  private calculateGenreMatch(manga: MangaFeatures, userProfile: UserProfile): number {
    if (!userProfile.favoriteGenres.length || !manga.genres.length) return 0;
    
    const intersection = manga.genres.filter(g => 
      userProfile.favoriteGenres.includes(g)
    ).length;
    
    return intersection / Math.max(manga.genres.length, userProfile.favoriteGenres.length);
  }

  private calculateThemeMatch(mangaFeatures: number[], userFeatures: number[]): number {
    // Use a subset of features that correspond to themes
    const themeFeatures = mangaFeatures.slice(20, 30); // Adjust indices based on your feature vector
    const userThemeFeatures = userFeatures.slice(20, 30);
    
    return this.calculateCosineSimilarity(themeFeatures, userThemeFeatures);
  }

  private calculateScoreMatch(mangaScore: number): number {
    return mangaScore / 100; // Normalize score to 0-1 range
  }

  public hasMoreRecommendations(excludeIds: number[]): boolean {
    const excludeSet = new Set(excludeIds);
    return Array.from(this.mangaFeatures.keys())
      .some(id => !excludeSet.has(id));
  }

  public getFeatureStats(): {
    totalManga: number;
    validationErrors: number;
    averageFeatures: number;
  } {
    return {
      totalManga: this.mangaFeatures.size,
      validationErrors: this.validationErrors.length,
      averageFeatures: Array.from(this.mangaFeatures.values())
        .reduce((acc, manga) => acc + manga.features.length, 0) / this.mangaFeatures.size
    };
  }
}
