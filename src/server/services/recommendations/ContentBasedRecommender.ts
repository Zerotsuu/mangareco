import { type MangaFeatures, type SimilarityResult, type UserMangaItem, type RecommenderConfig } from './types';

const DEFAULT_CONFIG: RecommenderConfig = {
  minSimilarity: 0.1,
  weightLikes: 2,
  weightDislikes: -1,
  defaultWeight: 1,
  genreImportance: 0,
  themeImportance: 0,
  scoreImportance: 0,
  userExperienceWeight: {
    new: 0,
    intermediate: 0,
    experienced: 0
  },
  maxResults: 0
};

export class ContentBasedRecommender {
  private mangaFeatures = new Map<number, MangaFeatures>();
  private config: RecommenderConfig;

  constructor(csvData: string, config: RecommenderConfig = DEFAULT_CONFIG) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.loadFeaturesFromCSV(csvData);
  }

  private loadFeaturesFromCSV(csvData: string) {
    const lines = csvData.split('\n').filter(line => line.trim());
    const headers = lines[0]?.split(',') ?? [];
    const featureIndices = headers.slice(5); // Skip id, title, score, popularity, and first few columns

    for (let i = 1; i < lines.length; i++) {
      const currentLine = lines[i];
      if (!currentLine) continue;

      const values = currentLine.split(',');
      const id = parseInt(values[0] ?? '0');
      const features = values.slice(5).map(v => parseFloat(v));
      const averageScore = parseFloat(values[2] ?? "0");

      this.mangaFeatures.set(id, {
        id,
        title: values[1] ?? "",
        averageScore,
        genres: [], // Will be populated from AniList data
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

  private getUserProfile(userList: UserMangaItem[]): number[] {
    const anyManga = this.mangaFeatures.values().next().value;
    const featureLength = anyManga ? anyManga.features.length : 0;
    const avgFeatures = new Array(featureLength).fill(0);
    let totalWeight = 0;

    userList.forEach(item => {
      const manga = this.mangaFeatures.get(item.mangaId);
      if (!manga) return;

      let weight = this.config.defaultWeight ?? 1;
      if (item.likeStatus === 'like') weight = this.config.weightLikes ?? 2;
      if (item.likeStatus === 'dislike') weight = this.config.weightDislikes ?? -1;

      manga.features.forEach((feat, idx) => {
        avgFeatures[idx] += feat * weight;
      });
      totalWeight += Math.abs(weight);
    });

    const calculateWeightedAverage = (avgFeatures: number[], totalWeight: number): number[] => {
      return totalWeight > 0
        ? avgFeatures.map((feat: number) => feat / totalWeight)
        : avgFeatures;
    };

    const weightedAverage = calculateWeightedAverage(avgFeatures as number[], totalWeight);

    return weightedAverage;
  }

  public getRecommendations(
    userList: UserMangaItem[],
    numRecommendations= 10
  ): SimilarityResult[] {
    const userProfile = this.getUserProfile(userList);
    const similarities: SimilarityResult[] = [];
    const userMangaIds = new Set(userList.map(item => item.mangaId));

    this.mangaFeatures.forEach((manga, id) => {
      if (userMangaIds.has(id)) return;

      const similarity = this.calculateCosineSimilarity(userProfile, manga.features);
      if (similarity >= (this.config.minSimilarity ?? 0.1)) {
        similarities.push({ id, similarity });
      }
    });

    return similarities
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, numRecommendations);
  }

  public getMangaFeatures(id: number): MangaFeatures | undefined {
    return this.mangaFeatures.get(id);
  }

  public getAllMangaIds(): number[] {
    return Array.from(this.mangaFeatures.keys());
  }
}