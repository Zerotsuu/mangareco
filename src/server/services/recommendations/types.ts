import { z } from 'zod';

// Weighted Feature type for caching
export interface WeightedFeature {
  features: number[];
  timestamp: number;
  weights?: number[];
}

// Feature vector types
export interface FeatureVector {
  genre: number[];
  theme: number[];
  demographic: number[];
  narrative: number[];
  metadata: number[];
}
// Define the response schema
export const recommendationResponseSchema = z.object({
  items: z.array(z.object({
    id: z.number(),
    title: z.string(),
    coverImage: z.string(),
    averageScore: z.number(),
    genres: z.array(z.string()),
    similarity: z.number(),
    description: z.string().optional(),
    metadata: z.object({
      timestamp: z.number(),
      lastViewed: z.date(),
      source: z.string(),
      popularity: z.number(),
      favorites: z.number(),
      status: z.enum([
        "NOT_YET_RELEASED",
        "FINISHED",
        "RELEASING",
        "CANCELLED",
        "HIATUS"
      ]),
      isAdult: z.boolean()
    })
  })),
  hasMore: z.boolean(),
  timing: z.number(),
  source: z.string()
});

// Validation schemas
export const recommenderConfigSchema = z.object({
  minSimilarity: z.number().min(0).max(1).default(0.1),
  weightLikes: z.number().min(0).max(5).default(2.0),
  weightDislikes: z.number().min(-5).max(0).default(-1.0),
  defaultWeight: z.number().min(0).max(2).default(1.0),
  genreImportance: z.number().min(0).max(2).default(1.0),
  themeImportance: z.number().min(0).max(2).default(0.8),
  scoreImportance: z.number().min(0).max(2).default(0.5),
  userExperienceWeight: z.object({
    new: z.number().min(0).max(2).default(0.7),
    intermediate: z.number().min(0).max(2).default(1.0),
    experienced: z.number().min(0).max(2).default(1.3),
  }),
});

// Infer types from schemas
export type RecommenderConfig = z.infer<typeof recommenderConfigSchema>;

// Manga feature types
export interface MangaFeatures {
  id: number;
  title: string;
  averageScore: number;
  genres: string[];
  features: number[];
  featureVector?: FeatureVector;
  metadata?: MangaMetadata;
}

export interface MangaMetadata {
  popularity: number;
  favorites: number;
  releaseYear?: number;
  status: 'FINISHED' | 'RELEASING' | 'NOT_YET_RELEASED' | 'CANCELLED' | 'HIATUS';
  chapters?: number;
  volumes?: number;
  isAdult: boolean;
  source?: string;
  demographic?: string[];
}

// Types for similarity calculations
export interface SimilarityResult {
  id: number;
  similarity: number;
  matchDetails: MatchDetails;
}

export interface MatchDetails {
  genreMatch: number;
  themeMatch: number;
  scoreMatch: number;
  demographicMatch?: number;
  narrativeMatch?: number;
  overallScore: number;
}

// User interaction types
export interface UserMangaItem {
  mangaId: number;
  likeStatus: 'like' | 'dislike' | null;
  readingStatus: ReadingStatus;
  rating?: number;
  progress?: number;
  startDate?: Date;
  completedDate?: Date;
  notes?: string;
}

export type ReadingStatus = 
  | 'READING' 
  | 'COMPLETED' 
  | 'PLAN_TO_READ' ;

// Response types
export interface MangaRecommendation {
  id: number;
  title: string;
  coverImage: string;
  averageScore: number;
  genres: string[];
  similarity: number;
  matchDetails: MatchDetails;
  metadata: MangaMetadata;
  description?: string;
}

// Cache types
export interface CacheEntry<T> {
  data: T;
  timestamp: number;
  expiresAt: number;
}

export interface CacheOptions {
  ttl?: number;  // Time to live in seconds
  skipCache?: boolean;
  forceRefresh?: boolean;
}

// Feature weights for different aspects
export interface FeatureWeights {
  genre: number[];
  theme: number[];
  demographic: number[];
  narrative: number[];
  metadata: number[];
}

// Recommendation filters
export interface RecommendationFilters {
  minScore?: number;
  maxScore?: number;
  includeGenres?: string[];
  excludeGenres?: string[];
  status?: MangaMetadata['status'][];
  yearRange?: {
    start?: number;
    end?: number;
  };
  excludeAdult?: boolean;
  demographic?: string[];
}

// Pagination types
export interface PaginationOptions {
  limit: number;
  offset: number;
  sortBy?: 'similarity' | 'score' | 'popularity' | 'releaseDate';
  sortOrder?: 'asc' | 'desc';
}

// Response type for batch operations
export interface BatchOperationResponse {
  success: boolean;
  errors?: Array<{
    id: number;
    error: string;
  }>;
  processed: number;
  failed: number;
  timing?: number;
}

// Error types
export class RecommendationError extends Error {
  constructor(
    message: string,
    public code: ErrorCode,
    public details?: unknown
  ) {
    super(message);
    this.name = 'RecommendationError';
  }
}

export type ErrorCode = 
  | 'INITIALIZATION_ERROR'
  | 'PROCESSING_ERROR'
  | 'VALIDATION_ERROR'
  | 'DATA_ERROR'
  | 'CACHE_ERROR'
  | 'CONFIG_ERROR';

// Default configuration
export const DEFAULT_CONFIG: RecommenderConfig = {
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
};

// Constants
export const AVAILABLE_GENRES = [
  'Action',
  'Adventure',
  'Comedy',
  'Drama',
  'Fantasy',
  'Horror',
  'Mystery',
  'Romance',
  'Sci-Fi',
  'Slice of Life',
  'Sports',
  'Supernatural',
  'Thriller',
] as const;

export const AVAILABLE_THEMES = [
  'School Life',
  'Military',
  'Historical',
  'Time Travel',
  'Music',
  'Psychological',
  'Gore',
  'Post-Apocalyptic',
  'Cyberpunk',
  'Space',
  'Martial Arts',
  'Super Power',
] as const;

export const DEMOGRAPHICS = [
  'Shounen',
  'Shoujo',
  'Seinen',
  'Josei',
  'Kids',
] as const;

// Type utilities
export type Genre = typeof AVAILABLE_GENRES[number];
export type Theme = typeof AVAILABLE_THEMES[number];
export type Demographic = typeof DEMOGRAPHICS[number];

// Cache configuration
export const CACHE_CONFIG = {
  DEFAULT_TTL: 30 * 60, // 30 minutes
  MAX_TTL: 24 * 60 * 60, // 24 hours
  MIN_TTL: 5 * 60, // 5 minutes
  FEATURE_CACHE_SIZE: 1000,
  RESULT_CACHE_SIZE: 100,
} as const;

export interface HuggingFaceModelInput {
  user_id: string;
  manga_id: string;
  genres: number[];
}

export interface HuggingFaceModelOutput {
  score: number;
}

export interface HuggingFaceRecommendation {
  mangaId: number;
  score: number;
  source: 'huggingface';
}