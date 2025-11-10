/**
 * User Context
 * Provides global user state and personalization access
 */

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { usePersonalization } from '../hooks/usePersonalization';
import type { NewsArticle } from '../types';
import type {
  UserProfile,
  PersonalizationInsights,
  RecommendationScore,
  UserFavoriteArticle,
  UserProfileInfo,
} from '../types/personalization';

interface UserContextType {
  userId: string;
  setUserId: (id: string) => void;
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

const UserContext = createContext<UserContextType | undefined>(undefined);

interface UserProviderProps {
  children: ReactNode;
  defaultUserId?: string;
}

export const UserProvider: React.FC<UserProviderProps> = ({ 
  children, 
  defaultUserId = 'default-user' 
}) => {
  const [userId, setUserId] = useState<string>(defaultUserId);

  // Load user ID from localStorage if available
  useEffect(() => {
    const savedUserId = localStorage.getItem('newsbot_current_user_id');
    if (savedUserId) {
      setUserId(savedUserId);
    }
  }, []);

  // Save user ID to localStorage when it changes
  useEffect(() => {
    if (userId) {
      localStorage.setItem('newsbot_current_user_id', userId);
    }
  }, [userId]);

  const personalization = usePersonalization(userId);

  const value: UserContextType = {
    userId,
    setUserId,
    ...personalization,
  };

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
};

export const useUser = (): UserContextType => {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
};
