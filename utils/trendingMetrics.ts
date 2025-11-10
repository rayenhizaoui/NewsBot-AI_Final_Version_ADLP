import { groupBy, orderBy, sumBy } from 'lodash';
import stringSimilarity from 'string-similarity';
import type { NewsArticle } from '../types';

export interface TopicSnapshot {
  count: number;
  totalEngagement: number;
  lastUpdated: number;
}

export interface TopicScore {
  name: string;
  count: number;
  growthRate: number;
  averageEngagement: number;
  score: number;
}

export interface TopicViewModel extends TopicScore {
  rank: number;
  imageUrl: string;
}

const SCORE_THRESHOLD = 5;
const SIMILARITY_THRESHOLD = 0.72;
const MAX_SIMILAR_PER_CLUSTER = 2;

const DEFAULT_ENGAGEMENT = 5;

const TOPIC_KEYWORDS: Record<string, string[]> = {
  Geopolitics: ['geopolitic', 'diplom', 'election', 'war', 'conflict', 'nato', 'policy', 'government', 'summit'],
  Economics: ['economy', 'finance', 'market', 'inflation', 'gdp', 'trade', 'business', 'bank', 'stocks', 'rate'],
  Space: ['space', 'nasa', 'astronaut', 'satellite', 'lunar', 'mars', 'rocket', 'galaxy', 'orbit'],
  Health: ['health', 'medical', 'virus', 'disease', 'biotech', 'vaccine', 'wellness', 'hospital', 'covid'],
  Arts: ['art', 'culture', 'music', 'film', 'museum', 'design', 'theatre', 'fashion', 'exhibit'],
  Technology: ['technology', 'tech', 'software', 'hardware', 'startup', 'gadget', 'robot', 'ai', 'artificial intelligence'],
  Energy: ['energy', 'climate', 'emissions', 'carbon', 'renewable', 'solar', 'wind', 'hydrogen', 'battery'],
  Sports: ['sport', 'league', 'tournament', 'championship', 'season', 'match'],
  Science: ['science', 'research', 'laboratory', 'experiment', 'study', 'scientist'],
};

const sanitizeTopicName = (value: string | undefined): string => {
  if (!value) {
    return '';
  }
  return value.trim();
};

const inferTopicFromText = (article: NewsArticle): string | null => {
  const haystack = [
    article.topic,
    article.headline,
    Array.isArray(article.summaryBullets) ? article.summaryBullets.join(' ') : '',
    article.summary,
    article.fullText,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

  let bestTopic: string | null = null;
  let bestScore = 0;

  Object.entries(TOPIC_KEYWORDS).forEach(([topic, keywords]) => {
    const score = keywords.reduce((total, keyword) => {
      return haystack.includes(keyword) ? total + 1 : total;
    }, 0);

    if (score > bestScore) {
      bestScore = score;
      bestTopic = topic;
    }
  });

  return bestScore > 0 ? bestTopic : null;
};

const resolveArticleTopic = (article: NewsArticle): string => {
  const initial = sanitizeTopicName(article.topic);
  if (initial && initial.toLowerCase() !== 'global') {
    return initial;
  }

  const inferred = inferTopicFromText(article);
  if (inferred) {
    return inferred;
  }

  return initial || 'Global';
};

const computeMockEngagement = (article: NewsArticle): number => {
  const base = article.summary?.length ?? 0;
  const scaled = Math.max(DEFAULT_ENGAGEMENT, Math.round(base / 40));
  return Math.min(100, scaled);
};

const parseDisplayDate = (dateStr: string | undefined): number => {
  if (!dateStr) {
    return Date.now();
  }
  const parsed = Date.parse(dateStr);
  return Number.isNaN(parsed) ? Date.now() : parsed;
};

export const buildTopicScores = (
  articles: NewsArticle[],
  previousSnapshot: Record<string, TopicSnapshot> = {}
): TopicScore[] => {
  if (!articles.length) {
    return [];
  }

  const grouped = groupBy(articles, resolveArticleTopic) as Record<string, NewsArticle[]>;
  const now = Date.now();

  return Object.entries(grouped).map(([topic, items]) => {
    const count = items.length;
    const engagementValues = items.map(article => {
      const engagement = (article as { engagement?: number }).engagement;
      return typeof engagement === 'number' ? engagement : computeMockEngagement(article);
    });
    const totalEngagement = sumBy(engagementValues);
    const averageEngagement = totalEngagement / Math.max(engagementValues.length, 1);

    const prev = previousSnapshot[topic];
    const prevCount = prev?.count ?? 0;
    const hoursElapsed = prev ? Math.max((now - prev.lastUpdated) / (1000 * 60 * 60), 1) : 24;
    const growthRate = ((count - prevCount) / Math.max(prevCount, 1)) * (24 / hoursElapsed);

    const score = count * 0.5 + growthRate * 0.3 + averageEngagement * 0.2;

    return {
      name: topic,
      count,
      growthRate,
      averageEngagement,
      score,
    } as TopicScore;
  });
};

export const selectTopTopics = (
  scores: TopicScore[],
  topicImageMap: Record<string, string>,
  fallbackImage: string
): TopicViewModel[] => {
  const filtered = scores.filter(metric => metric.score >= SCORE_THRESHOLD);
  if (!filtered.length) {
    return [];
  }

  const ordered = orderBy(filtered, ['score', 'growthRate', 'count'], ['desc', 'desc', 'desc']);
  const curated: TopicViewModel[] = [];

  ordered.forEach(candidate => {
    const similarCount = curated.reduce((total, existing) => {
      const similarity = stringSimilarity.compareTwoStrings(existing.name, candidate.name);
      return similarity >= SIMILARITY_THRESHOLD ? total + 1 : total;
    }, 0);

    if (similarCount >= MAX_SIMILAR_PER_CLUSTER) {
      return;
    }

    curated.push({
      ...candidate,
      rank: curated.length + 1,
      imageUrl: topicImageMap[candidate.name] ?? buildUnsplashUrl(candidate.name, fallbackImage),
    });
  });

  return curated.slice(0, 9);
};

export const buildUnsplashUrl = (topic: string, fallback: string): string => {
  if (!topic) {
    return fallback || 'https://picsum.photos/seed/newsbot/480/320';
  }
  const slug = encodeURIComponent(topic.toLowerCase());
  if (fallback && fallback.includes('{topic}')) {
    return fallback.replace('{topic}', slug || 'newsbot');
  }
  return fallback || `https://picsum.photos/seed/${slug || 'newsbot'}/480/320`;
};

export const buildSnapshot = (scores: TopicScore[]): Record<string, TopicSnapshot> => {
  const timestamp = Date.now();
  return scores.reduce<Record<string, TopicSnapshot>>((acc, score) => {
    acc[score.name] = {
      count: score.count,
      totalEngagement: score.averageEngagement * score.count,
      lastUpdated: timestamp,
    };
    return acc;
  }, {});
};

export const sortArticlesByRecency = (articles: NewsArticle[], limit = 6): NewsArticle[] => {
  return orderBy(
    articles,
    article => parseDisplayDate(article.date),
    ['desc']
  ).slice(0, limit);
};

export const mergeWithFallbackTopics = (
  topics: TopicViewModel[],
  fallbackTopics: TopicViewModel[],
  limit = 9,
  minimum = 5
): TopicViewModel[] => {
  const unique = new Map<string, TopicViewModel>();
  topics.forEach(topic => {
    if (!unique.has(topic.name)) {
      unique.set(topic.name, { ...topic });
    }
  });

  if (unique.size < minimum) {
    fallbackTopics.forEach(topic => {
      if (unique.size >= limit) {
        return;
      }
      if (!unique.has(topic.name)) {
        unique.set(topic.name, { ...topic });
      }
    });
  }

  const merged = Array.from(unique.values()).slice(0, limit);
  const ranked = orderBy(merged, ['score', 'growthRate', 'count'], ['desc', 'desc', 'desc']);
  return ranked.map((topic, index) => ({ ...topic, rank: index + 1 }));
};
