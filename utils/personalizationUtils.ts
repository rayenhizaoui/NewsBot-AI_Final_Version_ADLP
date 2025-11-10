/**
 * Personalization Utilities
 * Helper functions for working with the personalization engine
 */

import { personalizationEngine } from '../services/personalizationEngine';
import type { UserProfile, PersonalizationInsights } from '../types/personalization';

/**
 * Simulate user behavior for testing
 */
export function simulateUserBehavior(userId: string, articleIds: string[], topics: string[]) {
  console.log('🤖 Simulating user behavior...');
  
  // Random behavior patterns
  articleIds.forEach((articleId, index) => {
    const topic = topics[index % topics.length];
    
    // View
    personalizationEngine.trackBehavior({
      userId,
      articleId,
      action: 'view',
      timestamp: Date.now() + index * 1000,
      topic,
    });
    
    // Random like (50% chance)
    if (Math.random() > 0.5) {
      personalizationEngine.trackBehavior({
        userId,
        articleId,
        action: 'like',
        timestamp: Date.now() + index * 1000 + 500,
        topic,
      });
    }
    
    // Random reading time (30-180 seconds)
    const readingTime = Math.floor(Math.random() * 150) + 30;
    personalizationEngine.trackBehavior({
      userId,
      articleId,
      action: 'read_time',
      timestamp: Date.now() + index * 1000 + 1000,
      duration: readingTime,
    });
  });
  
  console.log(`✅ Simulated ${articleIds.length} interactions`);
  return personalizationEngine.getUserProfile(userId);
}

/**
 * Compare two user profiles
 */
export function compareProfiles(userId1: string, userId2: string) {
  const profile1 = personalizationEngine.getUserProfile(userId1);
  const profile2 = personalizationEngine.getUserProfile(userId2);
  
  console.log('📊 Profile Comparison');
  console.log('====================');
  console.log(`\n${userId1}:`);
  console.log('  Articles read:', profile1.behavior.totalArticlesRead);
  console.log('  Engagement:', profile1.behavior.engagementRate.toFixed(2));
  console.log('  Top topics:', Object.keys(profile1.preferences.topics).slice(0, 3));
  
  console.log(`\n${userId2}:`);
  console.log('  Articles read:', profile2.behavior.totalArticlesRead);
  console.log('  Engagement:', profile2.behavior.engagementRate.toFixed(2));
  console.log('  Top topics:', Object.keys(profile2.preferences.topics).slice(0, 3));
  
  return { profile1, profile2 };
}

/**
 * Export user data to JSON
 */
export function exportUserData(userId: string): string {
  const profile = personalizationEngine.exportUserProfile(userId);
  const insights = personalizationEngine.getInsights(userId);
  
  const data = {
    profile,
    insights,
    exportDate: new Date().toISOString(),
  };
  
  const json = JSON.stringify(data, null, 2);
  console.log('📤 User data exported');
  return json;
}

/**
 * Download user data as JSON file
 */
export function downloadUserData(userId: string) {
  const json = exportUserData(userId);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `newsbot-user-${userId}-${Date.now()}.json`;
  a.click();
  URL.revokeObjectURL(url);
  console.log('✅ Download started');
}

/**
 * Get recommendation statistics
 */
export function getRecommendationStats(userId: string, articleIds: string[]) {
  const recommendations = personalizationEngine.getRecommendations(userId, articleIds, articleIds.length);
  
  const stats = {
    total: recommendations.length,
    averageScore: recommendations.reduce((sum, r) => sum + r.score, 0) / recommendations.length,
    highConfidence: recommendations.filter(r => r.confidence > 0.7).length,
    topReasons: recommendations
      .flatMap(r => r.reasons)
      .reduce((acc: Record<string, number>, reason) => {
        acc[reason] = (acc[reason] || 0) + 1;
        return acc;
      }, {}),
  };
  
  console.log('📊 Recommendation Statistics');
  console.log('===========================');
  console.log('Total recommendations:', stats.total);
  console.log('Average score:', stats.averageScore.toFixed(3));
  console.log('High confidence:', stats.highConfidence);
  console.log('Top reasons:', stats.topReasons);
  
  return stats;
}

/**
 * Benchmark recommendation performance
 */
export function benchmarkPerformance(userId: string, articleIds: string[], iterations: number = 100) {
  console.log('⏱️ Benchmarking performance...');
  
  const startTime = performance.now();
  
  for (let i = 0; i < iterations; i++) {
    personalizationEngine.getRecommendations(userId, articleIds, 10);
  }
  
  const endTime = performance.now();
  const totalTime = endTime - startTime;
  const avgTime = totalTime / iterations;
  
  console.log(`✅ Benchmark complete:`);
  console.log(`  - ${iterations} iterations`);
  console.log(`  - Total time: ${totalTime.toFixed(2)}ms`);
  console.log(`  - Average time: ${avgTime.toFixed(2)}ms per call`);
  console.log(`  - Throughput: ${(1000 / avgTime).toFixed(0)} calls/second`);
  
  return { totalTime, avgTime, throughput: 1000 / avgTime };
}

/**
 * Visualize user profile in console
 */
export function visualizeProfile(userId: string) {
  const profile = personalizationEngine.getUserProfile(userId);
  const insights = personalizationEngine.getInsights(userId);
  
  console.log('\n' + '='.repeat(50));
  console.log(`👤 USER PROFILE: ${userId}`);
  console.log('='.repeat(50));
  
  console.log('\n📊 BEHAVIOR STATS');
  console.log('  Articles read:', profile.behavior.totalArticlesRead);
  console.log('  Total time:', Math.floor(profile.behavior.totalTimeSpent / 60), 'minutes');
  console.log('  Engagement:', (profile.behavior.engagementRate * 100).toFixed(0) + '%');
  console.log('  Pattern:', insights.readingPattern);
  
  console.log('\n🎯 TOP TOPICS');
  insights.topTopics.forEach((topic, i) => {
    const bar = '█'.repeat(Math.floor(topic.weight * 20));
    console.log(`  ${i + 1}. ${topic.topic.padEnd(15)} ${bar} ${(topic.weight * 100).toFixed(0)}%`);
  });
  
  console.log('\n📰 TRUSTED SOURCES');
  insights.topSources.forEach((source, i) => {
    const bar = '█'.repeat(Math.floor(source.weight * 20));
    console.log(`  ${i + 1}. ${source.source.padEnd(15)} ${bar} ${(source.weight * 100).toFixed(0)}%`);
  });
  
  console.log('\n⏰ ACTIVE HOURS');
  insights.mostActiveHours.forEach((hour, i) => {
    console.log(`  ${i + 1}. ${hour.hour}:00 - ${hour.count} activities`);
  });
  
  console.log('\n📈 METRICS');
  console.log('  Diversity score:', (insights.diversityScore * 100).toFixed(0) + '%');
  console.log('  Avg read time:', insights.averageReadTime + 's');
  console.log('  Engagement level:', insights.engagementLevel.toUpperCase());
  
  console.log('\n' + '='.repeat(50) + '\n');
}

/**
 * Create demo users with different patterns
 */
export function createDemoUsers() {
  console.log('🎭 Creating demo users...');
  
  // Tech enthusiast
  simulateUserBehavior(
    'demo-tech-enthusiast',
    ['1', '2', '4', '5'],
    ['Technology', 'Technology', 'Space', 'Health']
  );
  
  // Political junkie
  simulateUserBehavior(
    'demo-political-junkie',
    ['1', '3', '7'],
    ['Geopolitics', 'Economics', 'Geopolitics']
  );
  
  // Diverse reader
  simulateUserBehavior(
    'demo-diverse-reader',
    ['1', '2', '3', '4', '5', '6', '7'],
    ['Geopolitics', 'Technology', 'Economics', 'Space', 'Health', 'Arts', 'Geopolitics']
  );
  
  console.log('✅ Created 3 demo users');
  console.log('  - demo-tech-enthusiast');
  console.log('  - demo-political-junkie');
  console.log('  - demo-diverse-reader');
}

// Make utilities available globally in development
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  (window as any).personalizationUtils = {
    simulate: simulateUserBehavior,
    compare: compareProfiles,
    export: exportUserData,
    download: downloadUserData,
    stats: getRecommendationStats,
    benchmark: benchmarkPerformance,
    visualize: visualizeProfile,
    createDemo: createDemoUsers,
  };
  
  console.log('🛠️ Personalization utilities loaded!');
  console.log('Access via: window.personalizationUtils');
}
