import { type MangaFeatures, type SimilarityResult, type UserMangaItem, type RecommenderConfig } from './types';
import type { UserProfile } from "@prisma/client";

const DEFAULT_CONFIG: RecommenderConfig = {
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
  maxResults: 20
};

export class ContentBasedRecommender {
  private mangaFeatures = new Map<number, MangaFeatures>();
  private config: RecommenderConfig;

  constructor(csvData: string, config: RecommenderConfig = DEFAULT_CONFIG) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.loadFeaturesFromCSV(csvData);
  }

  public updateConfig(newConfig: RecommenderConfig): void {
    this.config = { ...this.config, ...newConfig };
    console.log('Updated recommender config:', this.config);
  }

  private loadFeaturesFromCSV(csvData: string) {
    const lines = csvData.split('\n').filter(line => line.trim());
    const headers = lines[0]?.split(',') ?? [];
    const genreEndIndex = headers.findIndex(h => h === '4-koma');
    const featureStartIndex = genreEndIndex;

    for (let i = 1; i < lines.length; i++) {
      const currentLine = lines[i];
      if (!currentLine) continue;

      const values = currentLine.split(',');
      const id = parseInt(values[0] ?? '0');
      
      // Extract genres (binary values from Action to last genre)
      const genres = headers.slice(4, genreEndIndex)
        .filter((_, index) => parseInt(values[index + 4] ?? '0') === 1);

      // Extract features
      const features = values.slice(featureStartIndex).map(v => parseFloat(v) || 0);
      const averageScore = parseFloat(values[2] ?? "0");

      this.mangaFeatures.set(id, {
        id,
        title: values[1] ?? "",
        averageScore,
        genres,
        features
      });
    }
  }

  private calculateCosineSimilarity(vec1: number[], vec2: number[]): number {
    if (vec1.length !== vec2.length) return 0;

    let dotProduct = 0;
    let norm1 = 0;
    let norm2 = 0;

    for (let i = 0; i < vec1.length; i++) {
      const value1 = vec1[i] ?? 0;
      const value2 = vec2[i] ?? 0;
      dotProduct += value1 * value2;
      norm1 += value1 * value1;
      norm2 += value2 * value2;
    }

    norm1 = Math.sqrt(norm1);
    norm2 = Math.sqrt(norm2);

    if (norm1 === 0 || norm2 === 0) return 0;
    return dotProduct / (norm1 * norm2);
  }

  private calculateGenreSimilarity(mangaGenres: string[], userFavoriteGenres: string[]): number {
    if (!userFavoriteGenres.length || !mangaGenres.length) return 0;
    
    const commonGenres = mangaGenres.filter(g => userFavoriteGenres.includes(g));
    return commonGenres.length / Math.max(mangaGenres.length, userFavoriteGenres.length);
  }

  private getUserProfile(userList: UserMangaItem[]): number[] {
    const anyManga = this.mangaFeatures.values().next().value;
    const featureLength = anyManga ? anyManga.features.length : 0;
    const avgFeatures = new Array(featureLength).fill(0);
    let totalWeight = 0;

    userList.forEach(item => {
      const manga = this.mangaFeatures.get(item.mangaId);
      if (!manga) return;

      let weight = this.config.defaultWeight;
      if (item.likeStatus === 'like') weight = this.config.weightLikes;
      if (item.likeStatus === 'dislike') weight = this.config.weightDislikes;

      manga.features.forEach((feat, idx) => {
        avgFeatures[idx] += feat * weight;
      });
      totalWeight += Math.abs(weight);
    });

    return totalWeight > 0
      ? avgFeatures.map(feat => feat / totalWeight)
      : new Array<number>(avgFeatures.length).fill(0);
  }

  private adjustSimilarityScore(
    baseSimilarity: number,
    manga: MangaFeatures,
    userProfile: UserProfile,
    userList: UserMangaItem[]
  ): number {
    let adjustedSimilarity = baseSimilarity;

    // Apply experience weight
    const experienceWeight = this.config.userExperienceWeight[
      userProfile.experience as keyof typeof this.config.userExperienceWeight
    ] ?? this.config.userExperienceWeight.intermediate;
    
    adjustedSimilarity *= experienceWeight;

    // Apply genre importance if enabled
    if (this.config.genreImportance > 0) {
      const genreSimilarity = this.calculateGenreSimilarity(
        manga.genres,
        userProfile.favoriteGenres
      );
      adjustedSimilarity *= (1 + (genreSimilarity * this.config.genreImportance));
    }

    // Apply score importance if enabled
    if (this.config.scoreImportance > 0 && manga.averageScore > 0) {
      const scoreInfluence = (manga.averageScore / 100) * this.config.scoreImportance;
      adjustedSimilarity *= (1 + scoreInfluence);
    }

    return Math.max(0, Math.min(1, adjustedSimilarity));
  }

  public getRecommendations(
    userList: UserMangaItem[],
    userProfile: UserProfile,
    numRecommendations = 10
  ): SimilarityResult[] {
    const userFeatureProfile = this.getUserProfile(userList);
    const similarities: SimilarityResult[] = [];
    const userMangaIds = new Set(userList.map(item => item.mangaId));

    this.mangaFeatures.forEach((manga, id) => {
      if (userMangaIds.has(id)) return;

      const baseSimilarity = this.calculateCosineSimilarity(
        userFeatureProfile, 
        manga.features
      );

      if (baseSimilarity >= this.config.minSimilarity) {
        const adjustedSimilarity = this.adjustSimilarityScore(
          baseSimilarity,
          manga,
          userProfile,
          userList
        );

        similarities.push({ 
          id, 
          similarity: adjustedSimilarity
        });
      }
    });

    return similarities
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, Math.min(numRecommendations, this.config.maxResults));
  }

  public getMangaFeatures(id: number): MangaFeatures | undefined {
    return this.mangaFeatures.get(id);
  }

  public getAllMangaIds(): number[] {
    return Array.from(this.mangaFeatures.keys());
  }
}