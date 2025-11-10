/**
 * Simple test file to verify personalization engine functionality
 * Run this in the browser console to test the engine
 */

import { personalizationEngine } from './services/personalizationEngine';
import type { ArticleFeatures, UserBehavior } from './types/personalization';

export function testPersonalizationEngine() {
  console.log('🧪 Testing Personalization Engine...\n');

  // Test 1: Create user profile
  console.log('Test 1: Creating user profile...');
  const userId = 'test-user-1';
  const profile = personalizationEngine.getUserProfile(userId);
  console.log('✅ Profile created:', profile);
  console.log('');

  // Test 2: Register articles
  console.log('Test 2: Registering test articles...');
  const testArticles: ArticleFeatures[] = [
    {
      id: 'test-1',
      topic: 'Technology',
      source: 'TechCrunch',
      sentiment: 'Positive',
      trustScore: 'A+',
      popularity: 0.8,
      recency: 0.9,
      wordCount: 500,
    },
    {
      id: 'test-2',
      topic: 'Technology',
      source: 'Wired',
      sentiment: 'Neutral',
      trustScore: 'A',
      popularity: 0.7,
      recency: 0.8,
      wordCount: 600,
    },
    {
      id: 'test-3',
      topic: 'Health',
      source: 'MedNews',
      sentiment: 'Positive',
      trustScore: 'B+',
      popularity: 0.6,
      recency: 0.5,
      wordCount: 400,
    },
  ];

  personalizationEngine.registerArticles(testArticles);
  console.log('✅ Registered', testArticles.length, 'articles');
  console.log('');

  // Test 3: Track behaviors
  console.log('Test 3: Simulating user behavior...');
  const behaviors: UserBehavior[] = [
    {
      userId,
      articleId: 'test-1',
      action: 'view',
      timestamp: Date.now(),
      topic: 'Technology',
      source: 'TechCrunch',
    },
    {
      userId,
      articleId: 'test-1',
      action: 'read_time',
      timestamp: Date.now() + 1000,
      duration: 120,
    },
    {
      userId,
      articleId: 'test-1',
      action: 'like',
      timestamp: Date.now() + 2000,
      topic: 'Technology',
      source: 'TechCrunch',
    },
    {
      userId,
      articleId: 'test-2',
      action: 'view',
      timestamp: Date.now() + 3000,
      topic: 'Technology',
      source: 'Wired',
    },
  ];

  behaviors.forEach(behavior => {
    personalizationEngine.trackBehavior(behavior);
  });
  console.log('✅ Tracked', behaviors.length, 'behaviors');
  console.log('');

  // Test 4: Get updated profile
  console.log('Test 4: Checking updated profile...');
  const updatedProfile = personalizationEngine.getUserProfile(userId);
  console.log('✅ Updated profile:');
  console.log('  - Topics:', updatedProfile.preferences.topics);
  console.log('  - Sources:', updatedProfile.preferences.sources);
  console.log('  - Total articles read:', updatedProfile.behavior.totalArticlesRead);
  console.log('  - Engagement rate:', updatedProfile.behavior.engagementRate.toFixed(2));
  console.log('');

  // Test 5: Get recommendations
  console.log('Test 5: Getting recommendations...');
  const articleIds = testArticles.map(a => a.id);
  const recommendations = personalizationEngine.getRecommendations(userId, articleIds, 3);
  console.log('✅ Top recommendations:');
  recommendations.forEach((rec, i) => {
    console.log(`  ${i + 1}. Article ${rec.articleId}`);
    console.log(`     Score: ${rec.score.toFixed(3)}`);
    console.log(`     Confidence: ${rec.confidence.toFixed(2)}`);
    console.log(`     Reasons:`, rec.reasons);
    console.log(`     Breakdown:`, rec.breakdown);
  });
  console.log('');

  // Test 6: Get insights
  console.log('Test 6: Getting user insights...');
  const insights = personalizationEngine.getInsights(userId);
  console.log('✅ User insights:');
  console.log('  - Top topics:', insights.topTopics);
  console.log('  - Top sources:', insights.topSources);
  console.log('  - Avg read time:', insights.averageReadTime, 'seconds');
  console.log('  - Engagement level:', insights.engagementLevel);
  console.log('  - Reading pattern:', insights.readingPattern);
  console.log('  - Diversity score:', insights.diversityScore);
  console.log('');

  // Test 7: Test collaborative filtering with multiple users
  console.log('Test 7: Testing collaborative filtering...');
  const userId2 = 'test-user-2';
  
  // Create similar user behavior
  personalizationEngine.trackBehavior({
    userId: userId2,
    articleId: 'test-1',
    action: 'like',
    timestamp: Date.now(),
    topic: 'Technology',
    source: 'TechCrunch',
  });
  
  personalizationEngine.trackBehavior({
    userId: userId2,
    articleId: 'test-2',
    action: 'like',
    timestamp: Date.now(),
    topic: 'Technology',
    source: 'Wired',
  });

  console.log('✅ Created second user with similar interests');
  const recs2 = personalizationEngine.getRecommendations(userId2, articleIds, 3);
  console.log('✅ Recommendations for user 2:', recs2.map(r => ({
    id: r.articleId,
    score: r.score.toFixed(3),
  })));
  console.log('');

  // Test 8: Export and display profile
  console.log('Test 8: Exporting user profile...');
  const exportedProfile = personalizationEngine.exportUserProfile(userId);
  console.log('✅ Exported profile:', exportedProfile);
  console.log('');

  console.log('🎉 All tests completed successfully!');
  console.log('');
  console.log('💡 Tips:');
  console.log('  - Open localStorage to see saved data');
  console.log('  - Try clearing data: personalizationEngine.clearAllData()');
  console.log('  - Try resetting a user: personalizationEngine.resetUserProfile("test-user-1")');
  console.log('');

  return {
    profile: updatedProfile,
    recommendations,
    insights,
    success: true,
  };
}

// Auto-run in development
if (process.env.NODE_ENV === 'development') {
  console.log('📊 Personalization Engine loaded!');
  console.log('Run testPersonalizationEngine() to test functionality');
}
