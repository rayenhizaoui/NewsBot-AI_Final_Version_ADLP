import { describe, expect, it } from '@jest/globals';
import { buildTopicScores, selectTopTopics, sortArticlesByRecency, type TopicSnapshot } from '../utils/trendingMetrics';
import type { NewsArticle } from '../types';

describe('trendingMetrics', () => {
  const baseArticles: NewsArticle[] = [
    {
      id: '1',
      headline: 'AI breakthrough boosts healthcare',
      source: 'Tech Daily',
      trustScore: 'A',
      bias: 'Center',
      author: 'Jane Doe',
      date: new Date().toISOString(),
      summary: 'AI is helping hospitals modernize care pathways.',
      summaryBullets: ['AI expansion', 'Hospitals modernize', 'Improved outcomes'],
      sentiment: 'Positive',
      topic: 'Technology',
      imageUrl: '',
      readMoreUrl: 'https://example.com/1',
      fullText: 'Full article',
    },
    {
      id: '2',
      headline: 'Startups race to deploy green hydrogen',
      source: 'Climate Wire',
      trustScore: 'A-',
      bias: 'Center-Left',
      author: 'John Smith',
      date: new Date().toISOString(),
      summary: 'Hydrogen firms see record funding.',
      sentiment: 'Positive',
      topic: 'Energy',
      imageUrl: '',
      readMoreUrl: 'https://example.com/2',
      fullText: 'Full article',
    },
  ];

  it('computes topic scores with snapshot growth', () => {
    const snapshot: Record<string, TopicSnapshot> = {
      Technology: { count: 1, totalEngagement: 45, lastUpdated: Date.now() - 2 * 60 * 60 * 1000 },
    };

    const scores = buildTopicScores(baseArticles, snapshot);
    const techScore = scores.find(score => score.name === 'Technology');

    expect(scores).toHaveLength(2);
    expect(techScore?.count).toBe(1);
    expect((techScore?.growthRate ?? 0)).toBeGreaterThanOrEqual(0);
  });

  it('filters and orders topics by trending score', () => {
    const boostedArticles: NewsArticle[] = [
      ...baseArticles,
      ...Array.from({ length: 4 }, (_, index) => ({
        ...baseArticles[0],
        id: `tech-${index}`,
        summary: 'Extended summary '.repeat(40),
        date: new Date(Date.now() - index * 60 * 60 * 1000).toISOString(),
      })),
    ];

    const scores = buildTopicScores(boostedArticles, {});

    const topics = selectTopTopics(scores, { Technology: 'image-a' }, 'fallback-image');
    expect(topics.length).toBeGreaterThan(0);
    expect(topics[0].score).toBeGreaterThanOrEqual(topics[topics.length - 1].score);
  });

  it('sorts articles by recency', () => {
    const sorted = sortArticlesByRecency([
      { ...baseArticles[0], id: '4', date: 'Jan 01, 2020' },
      { ...baseArticles[0], id: '5', date: new Date().toISOString() },
    ]);

    expect(sorted[0].id).toBe('5');
  });
});
