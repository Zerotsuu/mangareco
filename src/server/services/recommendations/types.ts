export interface MangaFeatures {
    id: number;
    title: string;
    averageScore: number;
    genres: string[];
    features: number[];
  }
  
  export interface SimilarityResult {
    id: number;
    similarity: number;
  }
  
  export interface UserMangaItem {
    mangaId: number;
    likeStatus: string | null;
  }
  
  // Response type for recommendations
  export interface MangaRecommendation {
    id: number;
    title: string;
    coverImage: string;
    averageScore: number;
    genres: string[];
    similarity: number;
  }
  
  export interface RecommenderConfig {
    minSimilarity: number;
    weightLikes: number;
    weightDislikes: number;
    defaultWeight: number;
    genreImportance: number;
    themeImportance: number;
    scoreImportance: number;
    userExperienceWeight: {
      new: number;
      intermediate: number;
      experienced: number;
    };
    maxResults: number;
  }

  export const DEFAULT_CONFIG: RecommenderConfig = {
    minSimilarity: 0.1,
    weightLikes: 2.0,
    weightDislikes: -1.0,
    defaultWeight: 1.0,
    genreImportance: 1.0,
    themeImportance: 0.8,
    scoreImportance: 0.5,
    userExperienceWeight: {
      new: 0.7,        // Newer users get more mainstream recommendations
      intermediate: 1.0,
      experienced: 1.3, // Experienced users get more niche recommendations
    },
    maxResults: 20,
  };