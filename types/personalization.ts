/**
 * Personalization Engine Types
 * Defines interfaces for user behavior tracking, profiles, and recommendations
 */

import type { NewsArticle } from '../types';

export interface UserBehavior {
  userId: string;
  articleId: string;
  action: 'view' | 'like' | 'share' | 'bookmark' | 'read_time';
  timestamp: number;
  duration?: number; // Reading time in seconds
  topic?: string;
  sentiment?: 'Neutral' | 'Positive' | 'Negative';
  source?: string;
  article?: NewsArticle;
}

export interface UserPreferences {
  topics: Record<string, number>; // topic -> weight (0-1)
  sources: Record<string, number>; // source -> weight (0-1)
  sentiments: Record<string, number>; // sentiment -> weight (0-1)
  readingTime: number; // average reading time in seconds
  activeHours: number[]; // activity by hour [0-23]
  manualTopics?: string[];
}

export interface UserBehaviorStats {
  totalArticlesRead: number;
  totalTimeSpent: number; // in seconds
  lastActive: number;
  engagementRate: number; // 0-1
  favoriteTopics: string[];
  favoriteSources: string[];
  likedArticles: UserFavoriteArticle[];
}

export interface UserFavoriteArticle {
  article: NewsArticle;
  likedAt: number;
}

export interface UserProfileInfo {
  fullName: string;
  email: string;
  title?: string;
  organization?: string;
  bio?: string;
  avatarUrl?: string;
  avatarColor?: string;
}

export interface UserProfile {
  userId: string;
  preferences: UserPreferences;
  behavior: UserBehaviorStats;
  profileInfo: UserProfileInfo;
  learningRate: number; // for online learning (0-1)
  createdAt: number;
  updatedAt: number;
}

export interface ArticleFeatures {
  id: string;
  topic: string;
  source: string;
  sentiment: 'Neutral' | 'Positive' | 'Negative';
  trustScore: string;
  popularity: number; // 0-1
  recency: number; // 0-1 (1 = newest)
  wordCount: number;
  author?: string;
}

export interface RecommendationScore {
  articleId: string;
  score: number; // 0-1
  reasons: string[];
  confidence: number; // 0-1
  breakdown: {
    contentScore: number;
    collaborativeScore: number;
    recencyBonus: number;
    popularityBonus: number;
  };
}

export interface UserSimilarity {
  userId: string;
  similarity: number; // 0-1
}

export interface PersonalizationInsights {
  topTopics: Array<{ topic: string; weight: number; manual?: boolean }>;
  topSources: Array<{ source: string; weight: number }>;
  averageReadTime: number;
  engagementLevel: 'low' | 'medium' | 'high';
  mostActiveHours: Array<{ hour: number; count: number }>;
  readingPattern: string; // e.g., "Morning Reader", "Night Owl"
  diversityScore: number; // 0-1, how diverse are the user's interests
}
