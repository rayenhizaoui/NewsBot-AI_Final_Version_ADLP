/**
 * usePersonalization Hook
 * React hook for interacting with the personalization engine
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { personalizationEngine } from '../services/personalizationEngine';
import type { NewsArticle } from '../types';
import type {
  UserBehavior,
  UserProfile,
  RecommendationScore,
  PersonalizationInsights,
  UserFavoriteArticle,
  UserProfileInfo,
} from '../types/personalization';

interface UsePersonalizationReturn {
  profile: UserProfile | null;
  insights: PersonalizationInsights | null;
  trackArticleView: (articleId: string, topic?: string, source?: string) => void;
  trackReadingTime: (articleId: string, duration: number) => void;
  trackLike: (article: NewsArticle) => void;
  removeLike: (articleId: string) => void;
  trackShare: (articleId: string, topic?: string, source?: string) => void;
  trackBookmark: (articleId: string, topic?: string, source?: string) => void;
  getRecommendations: (candidateArticles: string[], limit?: number) => RecommendationScore[];
  startReadingTimer: (articleId: string) => () => void;
  refreshProfile: () => void;
  isLoading: boolean;
  likedArticles: UserFavoriteArticle[];
  updateProfileInfo: (updates: Partial<UserProfileInfo>) => void;
  manualTopics: string[];
  updateManualTopics: (topics: string[]) => void;
  resetPersonalization: () => boolean;
}

export const usePersonalization = (userId: string): UsePersonalizationReturn => {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [insights, setInsights] = useState<PersonalizationInsights | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const readingTimers = useRef<Map<string, number>>(new Map());

  // Initialize profile
  useEffect(() => {
    if (!userId) return;

    try {
      const userProfile = personalizationEngine.getUserProfile(userId);
      setProfile(userProfile);

      const userInsights = personalizationEngine.getInsights(userId);
      setInsights(userInsights);

      setIsLoading(false);
    } catch (error) {
      console.error('Error loading user profile:', error);
      setIsLoading(false);
    }
  }, [userId]);

  // Track behavior helper
  const trackBehavior = useCallback(
    (behavior: Omit<UserBehavior, 'userId' | 'timestamp'>) => {
      if (!userId) return;

      try {
        personalizationEngine.trackBehavior({
          ...behavior,
          userId,
          timestamp: Date.now(),
        });

        // Update local state
        const updatedProfile = personalizationEngine.getUserProfile(userId);
        setProfile(updatedProfile);

        const updatedInsights = personalizationEngine.getInsights(userId);
        setInsights(updatedInsights);
      } catch (error) {
        console.error('Error tracking behavior:', error);
      }
    },
    [userId]
  );

  // Track article view
  const trackArticleView = useCallback(
    (articleId: string, topic?: string, source?: string) => {
      trackBehavior({
        articleId,
        action: 'view',
        topic,
        source,
      });
    },
    [trackBehavior]
  );

  // Track reading time
  const trackReadingTime = useCallback(
    (articleId: string, duration: number) => {
      if (duration < 1) return; // Ignore very short durations

      trackBehavior({
        articleId,
        action: 'read_time',
        duration,
      });
    },
    [trackBehavior]
  );

  // Track like
  const trackLike = useCallback(
    (article: NewsArticle) => {
      if (!article) {
        return;
      }

      trackBehavior({
        articleId: article.id,
        action: 'like',
        topic: article.topic,
        source: article.source,
        sentiment: article.sentiment,
        article,
      });
    },
    [trackBehavior]
  );

  const removeLike = useCallback(
    (articleId: string) => {
      if (!userId) {
        return;
      }

      try {
        personalizationEngine.removeLikedArticle(userId, articleId);
        const updatedProfile = personalizationEngine.getUserProfile(userId);
        setProfile(updatedProfile);

        const updatedInsights = personalizationEngine.getInsights(userId);
        setInsights(updatedInsights);
      } catch (error) {
        console.error('Error removing liked article:', error);
      }
    },
    [userId]
  );

  // Track share
  const trackShare = useCallback(
    (articleId: string, topic?: string, source?: string) => {
      trackBehavior({
        articleId,
        action: 'share',
        topic,
        source,
      });
    },
    [trackBehavior]
  );

  // Track bookmark
  const trackBookmark = useCallback(
    (articleId: string, topic?: string, source?: string) => {
      trackBehavior({
        articleId,
        action: 'bookmark',
        topic,
        source,
      });
    },
    [trackBehavior]
  );

  const likedArticlesState: UserFavoriteArticle[] = profile?.behavior.likedArticles ?? [];
  const manualTopicsState: string[] = profile?.preferences.manualTopics ?? [];

  const updateProfileInfo = useCallback(
    (updates: Partial<UserProfileInfo>) => {
      if (!userId) {
        return;
      }

      try {
        const updatedInfo = personalizationEngine.updateProfileInfo(userId, updates);
        setProfile(prev => {
          if (!prev) {
            return personalizationEngine.getUserProfile(userId);
          }
          return {
            ...prev,
            profileInfo: updatedInfo,
          };
        });
      } catch (error) {
        console.error('Error updating profile info:', error);
      }
    },
    [userId]
  );

  const updateManualTopics = useCallback(
    (topics: string[]) => {
      if (!userId) {
        return;
      }

      try {
        personalizationEngine.updateManualTopics(userId, topics);
        const latestProfile = personalizationEngine.getUserProfile(userId);
        const latestInsights = personalizationEngine.getInsights(userId);
        setProfile(latestProfile);
        setInsights(latestInsights);
      } catch (error) {
        console.error('Error updating manual topics:', error);
      }
    },
    [userId]
  );

  const resetPersonalization = useCallback((): boolean => {
    if (!userId) {
      return false;
    }

    try {
      personalizationEngine.resetUserProfile(userId);
      const refreshedProfile = personalizationEngine.getUserProfile(userId);
      const refreshedInsights = personalizationEngine.getInsights(userId);
      setProfile(refreshedProfile);
      setInsights(refreshedInsights);
      return true;
    } catch (error) {
      console.error('Error resetting personalization:', error);
      return false;
    }
  }, [userId]);

  // Get recommendations
  const getRecommendations = useCallback(
    (candidateArticles: string[], limit: number = 10): RecommendationScore[] => {
      if (!userId) return [];

      try {
        return personalizationEngine.getRecommendations(userId, candidateArticles, limit);
      } catch (error) {
        console.error('Error getting recommendations:', error);
        return [];
      }
    },
    [userId]
  );

  // Start reading timer - returns a cleanup function
  const startReadingTimer = useCallback(
    (articleId: string) => {
      const startTime = Date.now();
      readingTimers.current.set(articleId, startTime);

      // Return cleanup function
      return () => {
        const start = readingTimers.current.get(articleId);
        if (start) {
          const duration = Math.floor((Date.now() - start) / 1000);
          trackReadingTime(articleId, duration);
          readingTimers.current.delete(articleId);
        }
      };
    },
    [trackReadingTime]
  );

  // Refresh profile manually
  const refreshProfile = useCallback(() => {
    if (!userId) return;

    try {
      const userProfile = personalizationEngine.getUserProfile(userId);
      setProfile(userProfile);

      const userInsights = personalizationEngine.getInsights(userId);
      setInsights(userInsights);
    } catch (error) {
      console.error('Error refreshing profile:', error);
    }
  }, [userId]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      // Track any remaining reading times
      readingTimers.current.forEach((startTime, articleId) => {
        const duration = Math.floor((Date.now() - startTime) / 1000);
        if (duration > 1) {
          trackReadingTime(articleId, duration);
        }
      });
      readingTimers.current.clear();
    };
  }, [trackReadingTime]);

  return {
    profile,
    insights,
    trackArticleView,
    trackReadingTime,
    trackLike,
    removeLike,
    trackShare,
    trackBookmark,
    getRecommendations,
    startReadingTimer,
    refreshProfile,
    isLoading,
    likedArticles: likedArticlesState,
    updateProfileInfo,
    manualTopics: manualTopicsState,
    updateManualTopics,
    resetPersonalization,
  };
};
