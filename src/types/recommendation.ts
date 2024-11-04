// src/types/recommendation.ts
import { type Manga } from "@prisma/client";

export interface MangaRecommendation {
  id: number;
  title: string;
  averageScore: number;
  genres: string[];
}

export interface RecommendationResult {
  recommendations: MangaRecommendation[];
  message: string | null;
}

export interface HuggingFaceResponse {
  data: string[];
}

export interface ParsedRecommendation {
  id: number;
  title: string;
}