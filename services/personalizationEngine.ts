/**
 * Personalization Engine
 * Implements collaborative filtering, content-based filtering, and online learning
 */

import type {
  UserBehavior,
  UserProfile,
  UserPreferences,
  UserBehaviorStats,
  ArticleFeatures,
  RecommendationScore,
  UserSimilarity,
  PersonalizationInsights,
  UserFavoriteArticle,
  UserProfileInfo,
} from '../types/personalization';

class PersonalizationEngine {
  private userProfiles: Map<string, UserProfile> = new Map();
  private articleFeatures: Map<string, ArticleFeatures> = new Map();
  private userSimilarities: Map<string, UserSimilarity[]> = new Map();
  private behaviorQueue: UserBehavior[] = [];

  // Hyperparameters
  private readonly LEARNING_RATE = 0.15;
  private readonly DECAY_FACTOR = 0.97;
  private readonly MIN_INTERACTIONS = 3;
  private readonly COLLABORATIVE_WEIGHT = 0.35;
  private readonly CONTENT_WEIGHT = 0.50;
  private readonly RECENCY_WEIGHT = 0.10;
  private readonly POPULARITY_WEIGHT = 0.05;
  private readonly SIMILARITY_THRESHOLD = 0.3;
  private readonly TOP_SIMILAR_USERS = 10;

  constructor() {
    this.loadFromStorage();
    this.startBackgroundProcessing();
  }

  // ==========================================
  // USER PROFILE MANAGEMENT
  // ==========================================

  /**
   * Initialize a new user profile with default values
   */
  initializeUserProfile(userId: string): UserProfile {
    const profile: UserProfile = {
      userId,
      preferences: {
        topics: {},
        sources: {},
        sentiments: { Neutral: 0.5, Positive: 0.3, Negative: 0.2 },
        readingTime: 0,
        activeHours: Array(24).fill(0),
        manualTopics: [],
      },
      behavior: {
        totalArticlesRead: 0,
        totalTimeSpent: 0,
        lastActive: Date.now(),
        engagementRate: 0,
        favoriteTopics: [],
        favoriteSources: [],
        likedArticles: [],
      },
      profileInfo: this.getDefaultProfileInfo(),
      learningRate: this.LEARNING_RATE,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    this.userProfiles.set(userId, profile);
    this.saveToStorage();
    return profile;
  }

  /**
   * Get user profile, create if doesn't exist
   */
  getUserProfile(userId: string): UserProfile {
    let profile = this.userProfiles.get(userId);
    if (!profile) {
      profile = this.initializeUserProfile(userId);
    } else {
      if (!Array.isArray(profile.behavior.likedArticles)) {
        profile.behavior.likedArticles = [];
      }

      if (!profile.profileInfo) {
        profile.profileInfo = this.getDefaultProfileInfo();
      } else {
        profile.profileInfo = {
          ...this.getDefaultProfileInfo(),
          ...profile.profileInfo,
        };
      }

      if (!Array.isArray(profile.preferences.manualTopics)) {
        profile.preferences.manualTopics = [];
      }
    }

    profile.behavior.favoriteTopics = this.computeFavoriteTopics(profile);
    return profile;
  }

  // ==========================================
  // BEHAVIOR TRACKING & ONLINE LEARNING
  // ==========================================

  /**
   * Track user behavior and update profile in real-time
   */
  trackBehavior(behavior: UserBehavior): void {
    this.behaviorQueue.push(behavior);
    this.updateUserProfileOnline(behavior);

    // Process queue if it gets large
    if (this.behaviorQueue.length >= 20) {
      this.processBehaviorBatch();
    }
  }

  /**
   * Update user profile using online learning algorithm
   */
  private updateUserProfileOnline(behavior: UserBehavior): void {
    const profile = this.getUserProfile(behavior.userId);
    const { learningRate } = profile;
    const reward = this.calculateReward(behavior);

    // Update topic preferences with exponential moving average
    if (behavior.topic) {
      const currentWeight = profile.preferences.topics[behavior.topic] || 0;
      profile.preferences.topics[behavior.topic] = 
        currentWeight + learningRate * (reward - currentWeight);
    }

    // Update source preferences
    if (behavior.source) {
      const currentWeight = profile.preferences.sources[behavior.source] || 0;
      profile.preferences.sources[behavior.source] = 
        currentWeight + learningRate * (reward - currentWeight);
    }

    // Update sentiment preferences
    if (behavior.sentiment) {
      const currentWeight = profile.preferences.sentiments[behavior.sentiment] || 0;
      profile.preferences.sentiments[behavior.sentiment] = 
        currentWeight + learningRate * (reward - currentWeight);
    }

    // Update behavior statistics
    if (behavior.action === 'view') {
      profile.behavior.totalArticlesRead++;
    }

    if (behavior.duration) {
      profile.behavior.totalTimeSpent += behavior.duration;
      const avgReadTime = profile.behavior.totalTimeSpent / Math.max(1, profile.behavior.totalArticlesRead);
      profile.preferences.readingTime = avgReadTime;
    }

    if (behavior.action === 'like' && behavior.article) {
      this.addLikedArticle(profile, {
        article: behavior.article,
        likedAt: behavior.timestamp,
      });
    }

    // Update active hours
    const hour = new Date(behavior.timestamp).getHours();
    profile.preferences.activeHours[hour]++;

    // Calculate engagement rate
    profile.behavior.engagementRate = this.calculateEngagementRate(profile);

  // Update favorite topics and sources
  profile.behavior.favoriteTopics = this.computeFavoriteTopics(profile);
    profile.behavior.favoriteSources = this.getTopPreferences(profile.preferences.sources, 5);

    profile.behavior.lastActive = behavior.timestamp;
    profile.updatedAt = Date.now();

    // Apply temporal decay periodically
    if (Math.random() < 0.1) { // 10% chance on each update
      this.applyTemporalDecay(profile);
    }

    this.userProfiles.set(behavior.userId, profile);
    this.saveToStorage();
  }

  /**
   * Calculate reward for a user action
   */
  private calculateReward(behavior: UserBehavior): number {
    const actionWeights: Record<string, number> = {
      view: 0.3,
      like: 0.8,
      share: 1.0,
      bookmark: 0.9,
      read_time: 0.5,
    };

    let reward = actionWeights[behavior.action] || 0;

    // Boost for long reading times
    if (behavior.duration) {
      const readingBoost = Math.min(behavior.duration / 180, 1.5); // Cap at 3 minutes
      reward *= readingBoost;
    }

    return Math.max(0, Math.min(1, reward));
  }

  /**
   * Calculate user engagement rate
   */
  private calculateEngagementRate(profile: UserProfile): number {
    if (profile.behavior.totalArticlesRead === 0) return 0;

    const avgReadTime = profile.preferences.readingTime;
    const expectedReadTime = 120; // 2 minutes baseline
    const timeEngagement = Math.min(avgReadTime / expectedReadTime, 1);

    // Factor in interaction diversity
    const topicDiversity = Object.keys(profile.preferences.topics).length / 10; // Normalize
    const diversityBonus = Math.min(topicDiversity, 0.3);

    return Math.min(timeEngagement * 0.7 + diversityBonus, 1);
  }

  /**
   * Apply temporal decay to preferences
   */
  private applyTemporalDecay(profile: UserProfile): void {
    Object.keys(profile.preferences.topics).forEach(topic => {
      profile.preferences.topics[topic] *= this.DECAY_FACTOR;
      // Remove very low weights
      if (profile.preferences.topics[topic] < 0.01) {
        delete profile.preferences.topics[topic];
      }
    });

    Object.keys(profile.preferences.sources).forEach(source => {
      profile.preferences.sources[source] *= this.DECAY_FACTOR;
      if (profile.preferences.sources[source] < 0.01) {
        delete profile.preferences.sources[source];
      }
    });
  }

  /**
   * Persist a liked article to the user's profile, keeping recent items first
   */
  private addLikedArticle(profile: UserProfile, entry: UserFavoriteArticle): void {
    const existingIndex = profile.behavior.likedArticles.findIndex(item => item.article.id === entry.article.id);

    if (existingIndex >= 0) {
      profile.behavior.likedArticles.splice(existingIndex, 1);
    }

    profile.behavior.likedArticles.unshift(entry);

    if (profile.behavior.likedArticles.length > 50) {
      profile.behavior.likedArticles = profile.behavior.likedArticles.slice(0, 50);
    }
  }

  /**
   * Remove a liked article from the user's profile
   */
  removeLikedArticle(userId: string, articleId: string): void {
    const profile = this.getUserProfile(userId);
    const beforeCount = profile.behavior.likedArticles.length;

    profile.behavior.likedArticles = profile.behavior.likedArticles.filter(
      entry => entry.article.id !== articleId
    );

    if (profile.behavior.likedArticles.length !== beforeCount) {
      profile.updatedAt = Date.now();
      this.userProfiles.set(userId, profile);
      this.saveToStorage();
    }
  }

  /**
   * Return default profile info values
   */
  private getDefaultProfileInfo(): UserProfileInfo {
    return {
      fullName: 'Rayen',
      email: 'rayen@example.com',
      title: 'Analyst',
      organization: 'NewsBot AI',
      bio: 'Curious mind tracking geopolitics, tech, and market shifts.',
      avatarUrl: undefined,
      avatarColor: '#3b82f6',
    };
  }

  /**
   * Update editable profile fields
   */
  updateProfileInfo(userId: string, updates: Partial<UserProfileInfo>): UserProfileInfo {
    const profile = this.getUserProfile(userId);

    const sanitize = (value?: string) =>
      typeof value === 'string' ? value.trim() : undefined;
    const sanitizeAvatar = (value?: string) => {
      if (typeof value !== 'string') {
        return profile.profileInfo.avatarUrl;
      }
      const trimmed = value.trim();
      if (!trimmed) {
        return undefined;
      }
      if (trimmed.startsWith('data:image/')) {
        return trimmed;
      }
      try {
        const url = new URL(trimmed);
        if (url.protocol === 'http:' || url.protocol === 'https:') {
          return url.toString();
        }
      } catch (_error) {
        // Ignore parse errors and fall back to previous avatar
      }
      return profile.profileInfo.avatarUrl;
    };

    const nextInfo: UserProfileInfo = {
      ...profile.profileInfo,
      ...updates,
    };

    const sanitizedInfo: UserProfileInfo = {
      fullName: sanitize(nextInfo.fullName) || profile.profileInfo.fullName,
      email: sanitize(nextInfo.email) || profile.profileInfo.email,
      title: sanitize(nextInfo.title) || '',
      organization: sanitize(nextInfo.organization) || '',
      bio: sanitize(nextInfo.bio) || '',
      avatarUrl: sanitizeAvatar(nextInfo.avatarUrl),
      avatarColor: sanitize(nextInfo.avatarColor) || profile.profileInfo.avatarColor,
    };

    profile.profileInfo = sanitizedInfo;
    profile.updatedAt = Date.now();
    this.userProfiles.set(userId, profile);
    this.saveToStorage();

    return profile.profileInfo;
  }

  updateManualTopics(userId: string, topics: string[]): string[] {
    const profile = this.getUserProfile(userId);
    const sanitized = topics
      .map(topic => topic.trim())
      .filter(topic => topic.length > 0)
      .slice(0, 10);

    profile.preferences.manualTopics = Array.from(new Set(sanitized));
    profile.behavior.favoriteTopics = this.computeFavoriteTopics(profile);
    profile.updatedAt = Date.now();

    this.userProfiles.set(userId, profile);
    this.saveToStorage();

    return profile.preferences.manualTopics;
  }

  /**
   * Get top N preferences from a preference map
   */
  private getTopPreferences(prefs: Record<string, number>, n: number): string[] {
    return Object.entries(prefs)
      .sort((a, b) => b[1] - a[1])
      .slice(0, n)
      .map(([key]) => key);
  }

  private computeFavoriteTopics(profile: UserProfile): string[] {
    const manualTopics = Array.isArray(profile.preferences.manualTopics)
      ? profile.preferences.manualTopics.filter(Boolean)
      : [];
    const autoTopics = this.getTopPreferences(profile.preferences.topics, 5);

    const merged: string[] = [];
    manualTopics.forEach(topic => {
      if (topic && !merged.includes(topic)) {
        merged.push(topic);
      }
    });

    autoTopics.forEach(topic => {
      if (topic && !merged.includes(topic)) {
        merged.push(topic);
      }
    });

    return merged.slice(0, 8);
  }

  // ==========================================
  // ARTICLE FEATURE MANAGEMENT
  // ==========================================

  /**
   * Register article features for recommendation
   */
  registerArticle(article: ArticleFeatures): void {
    this.articleFeatures.set(article.id, article);
  }

  /**
   * Register multiple articles at once
   */
  registerArticles(articles: ArticleFeatures[]): void {
    articles.forEach(article => this.registerArticle(article));
  }

  // ==========================================
  // CONTENT-BASED FILTERING
  // ==========================================

  /**
   * Calculate content-based recommendation score
   */
  private getContentBasedScore(userId: string, articleId: string): number {
    const profile = this.getUserProfile(userId);
    const article = this.articleFeatures.get(articleId);

    if (!article) return 0;

    let score = 0;

    // Topic match (40%)
    const topicWeight = profile.preferences.topics[article.topic] || 0;
    score += topicWeight * 0.4;

    // Source preference (25%)
    const sourceWeight = profile.preferences.sources[article.source] || 0;
    score += sourceWeight * 0.25;

    // Sentiment alignment (20%)
    const sentimentWeight = profile.preferences.sentiments[article.sentiment] || 0.5;
    score += sentimentWeight * 0.2;

    // Trust score bonus (15%)
    const trustBonus = this.normalizeTrustScore(article.trustScore);
    score += trustBonus * 0.15;

    return Math.max(0, Math.min(1, score));
  }

  /**
   * Normalize trust score to 0-1
   */
  private normalizeTrustScore(trustScore: string): number {
    const scoreMap: Record<string, number> = {
      'A+': 1.0, 'A': 0.9, 'A-': 0.8,
      'B+': 0.7, 'B': 0.6, 'B-': 0.5,
      'C+': 0.4, 'C': 0.3, 'C-': 0.2,
    };
    return scoreMap[trustScore] || 0.5;
  }

  // ==========================================
  // COLLABORATIVE FILTERING
  // ==========================================

  /**
   * Calculate similarity between two users
   */
  private calculateUserSimilarity(userId1: string, userId2: string): number {
    const profile1 = this.getUserProfile(userId1);
    const profile2 = this.getUserProfile(userId2);

    // Cosine similarity on topic preferences
    const topicSim = this.cosineSimilarity(
      profile1.preferences.topics,
      profile2.preferences.topics
    );

    // Cosine similarity on source preferences
    const sourceSim = this.cosineSimilarity(
      profile1.preferences.sources,
      profile2.preferences.sources
    );

    // Weighted combination
    return topicSim * 0.7 + sourceSim * 0.3;
  }

  /**
   * Calculate cosine similarity between two vectors
   */
  private cosineSimilarity(vec1: Record<string, number>, vec2: Record<string, number>): number {
    const keys = new Set([...Object.keys(vec1), ...Object.keys(vec2)]);
    if (keys.size === 0) return 0;

    let dotProduct = 0;
    let mag1 = 0;
    let mag2 = 0;

    keys.forEach(key => {
      const v1 = vec1[key] || 0;
      const v2 = vec2[key] || 0;
      dotProduct += v1 * v2;
      mag1 += v1 * v1;
      mag2 += v2 * v2;
    });

    const magnitude = Math.sqrt(mag1) * Math.sqrt(mag2);
    return magnitude === 0 ? 0 : dotProduct / magnitude;
  }

  /**
   * Find similar users
   */
  private findSimilarUsers(userId: string): UserSimilarity[] {
    const cached = this.userSimilarities.get(userId);
    if (cached) return cached;

    const similarities: UserSimilarity[] = [];
    const allUserIds = Array.from(this.userProfiles.keys());

    allUserIds.forEach(otherUserId => {
      if (otherUserId !== userId) {
        const similarity = this.calculateUserSimilarity(userId, otherUserId);
        if (similarity >= this.SIMILARITY_THRESHOLD) {
          similarities.push({ userId: otherUserId, similarity });
        }
      }
    });

    const sorted = similarities
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, this.TOP_SIMILAR_USERS);

    this.userSimilarities.set(userId, sorted);
    return sorted;
  }

  /**
   * Calculate collaborative filtering score
   */
  private getCollaborativeScore(userId: string, articleId: string): number {
    const similarUsers = this.findSimilarUsers(userId);
    if (similarUsers.length === 0) return 0;

    const article = this.articleFeatures.get(articleId);
    if (!article) return 0;

    let weightedSum = 0;
    let totalWeight = 0;

    similarUsers.forEach(({ userId: otherUserId, similarity }) => {
      const otherProfile = this.getUserProfile(otherUserId);
      const topicWeight = otherProfile.preferences.topics[article.topic] || 0;
      
      weightedSum += similarity * topicWeight;
      totalWeight += similarity;
    });

    return totalWeight > 0 ? weightedSum / totalWeight : 0;
  }

  // ==========================================
  // HYBRID RECOMMENDATION
  // ==========================================

  /**
   * Get personalized recommendations for a user
   */
  getRecommendations(
    userId: string,
    candidateArticles: string[],
    limit: number = 10
  ): RecommendationScore[] {
    const profile = this.getUserProfile(userId);
    const hasEnoughData = profile.behavior.totalArticlesRead >= this.MIN_INTERACTIONS;

    const recommendations: RecommendationScore[] = candidateArticles.map(articleId => {
      const article = this.articleFeatures.get(articleId);
      if (!article) {
        return {
          articleId,
          score: 0,
          reasons: ['Article not found'],
          confidence: 0,
          breakdown: { contentScore: 0, collaborativeScore: 0, recencyBonus: 0, popularityBonus: 0 },
        };
      }

      // Calculate individual scores
      const contentScore = this.getContentBasedScore(userId, articleId);
      const collaborativeScore = hasEnoughData 
        ? this.getCollaborativeScore(userId, articleId)
        : 0;
      const recencyBonus = article.recency;
      const popularityBonus = article.popularity;

      // Hybrid score
      let finalScore: number;
      if (hasEnoughData) {
        finalScore = 
          contentScore * this.CONTENT_WEIGHT +
          collaborativeScore * this.COLLABORATIVE_WEIGHT +
          recencyBonus * this.RECENCY_WEIGHT +
          popularityBonus * this.POPULARITY_WEIGHT;
      } else {
        // Cold start: rely more on content and popularity
        finalScore = 
          contentScore * 0.7 +
          recencyBonus * 0.15 +
          popularityBonus * 0.15;
      }

      // Generate explanation
      const reasons = this.generateReasons(profile, article, contentScore, collaborativeScore);
      const confidence = hasEnoughData ? 0.85 : 0.55;

      return {
        articleId,
        score: finalScore,
        reasons,
        confidence,
        breakdown: {
          contentScore,
          collaborativeScore,
          recencyBonus,
          popularityBonus,
        },
      };
    });

    return recommendations
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
  }

  /**
   * Generate human-readable recommendation reasons
   */
  private generateReasons(
    profile: UserProfile,
    article: ArticleFeatures,
    contentScore: number,
    collaborativeScore: number
  ): string[] {
    const reasons: string[] = [];

    // Topic match
    const topicWeight = profile.preferences.topics[article.topic] || 0;
    if (topicWeight > 0.6) {
      reasons.push(`You frequently read ${article.topic} articles`);
    } else if (topicWeight > 0.3) {
      reasons.push(`Related to your interest in ${article.topic}`);
    }

    // Source preference
    const sourceWeight = profile.preferences.sources[article.source] || 0;
    if (sourceWeight > 0.5) {
      reasons.push(`From ${article.source}, a source you trust`);
    }

    // Collaborative
    if (collaborativeScore > 0.5) {
      reasons.push('Popular with readers like you');
    }

    // High quality
    if (this.normalizeTrustScore(article.trustScore) > 0.8) {
      reasons.push('High trust score');
    }

    // Recency
    if (article.recency > 0.8) {
      reasons.push('Breaking news');
    }

    if (reasons.length === 0) {
      reasons.push('Recommended for you');
    }

    return reasons.slice(0, 3);
  }

  // ==========================================
  // INSIGHTS & ANALYTICS
  // ==========================================

  /**
   * Get personalization insights for user
   */
  getInsights(userId: string): PersonalizationInsights {
    const profile = this.getUserProfile(userId);

    const manualTopics = Array.isArray(profile.preferences.manualTopics)
      ? profile.preferences.manualTopics.filter(Boolean)
      : [];

    const topicScores = new Map<string, { weight: number; manual: boolean }>();

    manualTopics.forEach((topic, index) => {
      const baseWeight = Math.max(0.8 - index * 0.03, 0.6);
      const learnedWeight = profile.preferences.topics[topic] ?? 0;
      topicScores.set(topic, {
        weight: Math.max(baseWeight, learnedWeight),
        manual: true,
      });
    });

    Object.entries(profile.preferences.topics).forEach(([topic, weight]) => {
      const normalized = Math.max(0, Math.min(1, weight));
      const existing = topicScores.get(topic);
      if (existing) {
        existing.weight = Math.max(existing.weight, normalized);
      } else {
        topicScores.set(topic, { weight: normalized, manual: false });
      }
    });

    const topTopics = Array.from(topicScores.entries())
      .sort((a, b) => {
        if (a[1].manual !== b[1].manual) {
          return a[1].manual ? -1 : 1;
        }
        return b[1].weight - a[1].weight;
      })
      .slice(0, 5)
      .map(([topic, data]) => ({
        topic,
        weight: Math.round(data.weight * 100) / 100,
        manual: data.manual || undefined,
      }));

    // Top sources
    const topSources = Object.entries(profile.preferences.sources)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([source, weight]) => ({ source, weight: Math.round(weight * 100) / 100 }));

    // Most active hours
    const mostActiveHours = profile.preferences.activeHours
      .map((count, hour) => ({ hour, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 3);

    // Determine reading pattern
    const avgHour = mostActiveHours.length > 0 ? mostActiveHours[0].hour : 12;
    let readingPattern: string;
    if (avgHour >= 5 && avgHour < 12) {
      readingPattern = 'Morning Reader';
    } else if (avgHour >= 12 && avgHour < 17) {
      readingPattern = 'Afternoon Browser';
    } else if (avgHour >= 17 && avgHour < 22) {
      readingPattern = 'Evening Reader';
    } else {
      readingPattern = 'Night Owl';
    }

    // Calculate diversity score
    const uniqueTopicCount = new Set([
      ...Object.keys(profile.preferences.topics),
      ...manualTopics,
    ]).size;
    const diversityScore = Math.min(uniqueTopicCount / 10, 1);

    // Engagement level
    let engagementLevel: 'low' | 'medium' | 'high';
    if (profile.behavior.engagementRate < 0.3) {
      engagementLevel = 'low';
    } else if (profile.behavior.engagementRate < 0.7) {
      engagementLevel = 'medium';
    } else {
      engagementLevel = 'high';
    }

    return {
      topTopics,
      topSources,
      averageReadTime: Math.round(profile.preferences.readingTime),
      engagementLevel,
      mostActiveHours,
      readingPattern,
      diversityScore: Math.round(diversityScore * 100) / 100,
    };
  }

  // ==========================================
  // BACKGROUND PROCESSING
  // ==========================================

  /**
   * Process queued behaviors in batch
   */
  private processBehaviorBatch(): void {
    if (this.behaviorQueue.length === 0) return;

    // Clear similarity cache to force recalculation
    this.userSimilarities.clear();

    // Clear queue
    this.behaviorQueue = [];

    console.log('✅ Processed behavior batch');
  }

  /**
   * Start background processing tasks
   */
  private startBackgroundProcessing(): void {
    // Process behavior batch every 60 seconds
    setInterval(() => {
      this.processBehaviorBatch();
    }, 60000);

    // Apply decay to all profiles every 2 hours
    setInterval(() => {
      this.userProfiles.forEach(profile => {
        this.applyTemporalDecay(profile);
      });
      this.saveToStorage();
      console.log('✅ Applied temporal decay to all profiles');
    }, 7200000);
  }

  // ==========================================
  // PERSISTENCE
  // ==========================================

  /**
   * Save data to localStorage
   */
  private saveToStorage(): void {
    try {
      const profilesData = JSON.stringify(Array.from(this.userProfiles.entries()));
      const articlesData = JSON.stringify(Array.from(this.articleFeatures.entries()));
      
      localStorage.setItem('newsbot_user_profiles', profilesData);
      localStorage.setItem('newsbot_article_features', articlesData);
    } catch (error) {
      console.error('Failed to save personalization data:', error);
    }
  }

  /**
   * Load data from localStorage
   */
  private loadFromStorage(): void {
    try {
      const profilesData = localStorage.getItem('newsbot_user_profiles');
      const articlesData = localStorage.getItem('newsbot_article_features');

      if (profilesData) {
        this.userProfiles = new Map(JSON.parse(profilesData));
        console.log(`✅ Loaded ${this.userProfiles.size} user profiles`);
      }

      if (articlesData) {
        this.articleFeatures = new Map(JSON.parse(articlesData));
        console.log(`✅ Loaded ${this.articleFeatures.size} article features`);
      }
    } catch (error) {
      console.error('Failed to load personalization data:', error);
    }
  }

  /**
   * Export user profile for debugging
   */
  exportUserProfile(userId: string): UserProfile | undefined {
    return this.userProfiles.get(userId);
  }

  /**
   * Reset user profile
   */
  resetUserProfile(userId: string): void {
    this.userProfiles.delete(userId);
    this.userSimilarities.delete(userId);
    this.initializeUserProfile(userId);
    this.saveToStorage();
  }

  /**
   * Clear all data
   */
  clearAllData(): void {
    this.userProfiles.clear();
    this.articleFeatures.clear();
    this.userSimilarities.clear();
    this.behaviorQueue = [];
    localStorage.removeItem('newsbot_user_profiles');
    localStorage.removeItem('newsbot_article_features');
    console.log('✅ Cleared all personalization data');
  }
}

// Singleton instance
export const personalizationEngine = new PersonalizationEngine();
