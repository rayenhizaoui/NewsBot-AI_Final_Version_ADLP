import { orderBy } from 'lodash';
import type {
  ForecastMetrics,
  ForecastScenarioModifiers,
  TopicPrediction,
  NewsArticle,
} from '../types';

export interface EventAnalyticsResult {
  metrics: ForecastMetrics;
  predictions: TopicPrediction[];
  driverInsights: string[];
  warnings: string[];
}

export const DEFAULT_SCENARIO_MODIFIERS: ForecastScenarioModifiers = {
  description: 'Baseline conditions',
  growthMultiplier: 1,
  sentimentShift: 0,
  volumeMultiplier: 1,
  engagementShift: 0,
};

const MS_IN_DAY = 1000 * 60 * 60 * 24;
const MAX_PREDICTION_TOPICS = 5;
const LAMBDA_DECAY = 0.55;

const SENTIMENT_TO_NUMERIC: Record<'Positive' | 'Neutral' | 'Negative', number> = {
  Positive: 1,
  Neutral: 0,
  Negative: -1,
};

const clampScore = (value: number, min = 0, max = 100): number => {
  if (!Number.isFinite(value)) {
    return min;
  }
  return Math.min(max, Math.max(min, value));
};

const normalizeScenarioModifiers = (
  modifiers?: Partial<ForecastScenarioModifiers>
): ForecastScenarioModifiers => ({
  ...DEFAULT_SCENARIO_MODIFIERS,
  ...(modifiers ?? {}),
});

const toStartOfDay = (timestamp: number): number => {
  const date = new Date(timestamp);
  date.setHours(0, 0, 0, 0);
  return date.getTime();
};

const buildDailyCounts = (articles: NewsArticle[], windowDays: number): Map<number, number> => {
  const now = Date.now();
  const floor = now - windowDays * MS_IN_DAY;
  const counts = new Map<number, number>();

  articles.forEach(article => {
    const parsed = Date.parse(article.date);
    if (Number.isNaN(parsed) || parsed < floor) {
      return;
    }
    const day = toStartOfDay(parsed);
    counts.set(day, (counts.get(day) ?? 0) + 1);
  });

  return counts;
};

const calculateHistoricalRelevance = (articles: NewsArticle[], windowDays = 7): number => {
  const counts = buildDailyCounts(articles, windowDays);
  if (!counts.size) {
    return 0;
  }

  const now = Date.now();
  let weightedSum = 0;
  let normalization = 0;

  counts.forEach((count, dayTs) => {
    const daysAgo = Math.max(0, (now - dayTs) / MS_IN_DAY);
    const weight = Math.exp(-LAMBDA_DECAY * daysAgo);
    weightedSum += count * weight;
    normalization += weight;
  });

  const baseline = counts.size;
  const relevance = (weightedSum / Math.max(normalization, 1)) * 100 / Math.max(baseline, 1);
  return clampScore(relevance, 5, 100);
};

const calculateGrowthRate = (articles: NewsArticle[], windowDays = 5): number => {
  const counts = buildDailyCounts(articles, windowDays);
  if (!counts.size) {
    return 0;
  }

  const sortedDays = Array.from(counts.keys()).sort((a, b) => a - b);
  const n = sortedDays.length;
  if (n < 2) {
    return 0;
  }

  const xs = sortedDays.map((day, idx) => idx);
  const ys = sortedDays.map(day => counts.get(day) ?? 0);

  const sumX = xs.reduce((acc, val) => acc + val, 0);
  const sumY = ys.reduce((acc, val) => acc + val, 0);
  const sumXY = xs.reduce((acc, val, idx) => acc + val * ys[idx], 0);
  const sumX2 = xs.reduce((acc, val) => acc + val * val, 0);

  const numerator = n * sumXY - sumX * sumY;
  const denominator = n * sumX2 - sumX * sumX;
  if (denominator === 0) {
    return 0;
  }

  const slope = numerator / denominator;
  const average = sumY / n || 1;
  const normalizedGrowth = slope / Math.max(average, 1);
  return clampScore(50 + normalizedGrowth * 100, 0, 100) / 100;
};

const calculateSentimentVolatility = (articles: NewsArticle[]): number => {
  if (!articles.length) {
    return 0;
  }

  const sentimentValues = articles.map(article => SENTIMENT_TO_NUMERIC[article.sentiment] ?? 0);
  const mean = sentimentValues.reduce((acc, val) => acc + val, 0) / sentimentValues.length;
  const variance = sentimentValues.reduce((acc, val) => acc + (val - mean) ** 2, 0) / sentimentValues.length;
  const stdDev = Math.sqrt(variance);
  return clampScore(stdDev * 45, 0, 100);
};

const inferEngagement = (article: NewsArticle): number => {
  const bullets = article.summaryBullets?.length ?? 0;
  const summaryWeight = Math.min(1200, (article.summary || article.fullText || '').length) / 1200;
  return clampScore((bullets * 12 + summaryWeight * 60 + Math.random() * 8), 10, 95);
};

const calculateEngagementEma = (articles: NewsArticle[], alpha = 0.55): number => {
  if (!articles.length) {
    return 0;
  }
  const sorted = [...articles].sort((a, b) => Date.parse(a.date) - Date.parse(b.date));
  let ema = inferEngagement(sorted[0]);
  for (let idx = 1; idx < sorted.length; idx += 1) {
    const engagement = inferEngagement(sorted[idx]);
    ema = alpha * engagement + (1 - alpha) * ema;
  }
  return clampScore(ema, 5, 100);
};

const buildPredictionScore = (
  historicalRelevance: number,
  growthRate: number,
  sentimentVolatility: number,
  engagementEma: number
): number => {
  const normalizedGrowth = clampScore(growthRate * 100, 0, 100);
  const score =
    historicalRelevance * 0.4 +
    normalizedGrowth * 0.3 +
    sentimentVolatility * 0.2 +
    engagementEma * 0.1;
  return clampScore(score, 10, 100);
};

const applyScenarioToMetrics = (
  base: ForecastMetrics,
  modifiers: ForecastScenarioModifiers
): ForecastMetrics => {
  const adjustedGrowth = clampScore(base.growthRate * modifiers.growthMultiplier * 100, 0, 200) / 100;
  const adjustedSentiment = clampScore(base.sentimentVolatility + modifiers.sentimentShift * 10, 0, 100);
  const adjustedEngagement = clampScore(base.engagementEma + modifiers.engagementShift * 20, 0, 100);
  const adjustedHistorical = clampScore(base.historicalRelevance * modifiers.volumeMultiplier, 0, 100);

  return {
    historicalRelevance: adjustedHistorical,
    growthRate: adjustedGrowth,
    sentimentVolatility: adjustedSentiment,
    engagementEma: adjustedEngagement,
    predictionScore: buildPredictionScore(
      adjustedHistorical,
      adjustedGrowth,
      adjustedSentiment,
      adjustedEngagement
    ),
  };
};

const forecastFutureTopics = (
  articles: NewsArticle[],
  metrics: ForecastMetrics,
  modifiers: ForecastScenarioModifiers
): TopicPrediction[] => {
  if (!articles.length) {
    return [];
  }

  const topicCounts = new Map<string, number>();
  articles.forEach(article => {
    const topic = article.topic || 'General';
    topicCounts.set(topic, (topicCounts.get(topic) ?? 0) + 1);
  });

  const predictions = Array.from(topicCounts.entries()).map(([topic, count]) => {
    const growthFactor = 1 + metrics.growthRate * modifiers.growthMultiplier + modifiers.volumeMultiplier - 1;
    const volatilityPenalty = 1 - Math.min(metrics.sentimentVolatility / 150, 0.35);
    const predictedCount = count * Math.max(0.5, growthFactor) * volatilityPenalty;
    const confidence = clampScore(metrics.predictionScore * volatilityPenalty, 15, 95);
    const drivers = [
      `Recent coverage: ${count} articles`,
      `Growth index: ${(metrics.growthRate * 100).toFixed(1)}%`,
      `Sentiment volatility: ${metrics.sentimentVolatility.toFixed(1)} pts`,
    ];
    return {
      topic,
      predictedCount: Number(predictedCount.toFixed(1)),
      confidence,
      drivers,
    } as TopicPrediction;
  });

  return orderBy(predictions, ['predictedCount', 'confidence'], ['desc', 'desc']).slice(0, MAX_PREDICTION_TOPICS);
};

const buildDriverInsights = (
  metrics: ForecastMetrics,
  modifiers: ForecastScenarioModifiers,
  predictions: TopicPrediction[]
): string[] => {
  const insights = [
    `Historical relevance index at ${metrics.historicalRelevance.toFixed(1)} (7-day decay).`,
    `Growth velocity adjusted to ${(metrics.growthRate * 100).toFixed(1)}% with multiplier x${modifiers.growthMultiplier.toFixed(2)}.`,
    `Sentiment volatility ${metrics.sentimentVolatility.toFixed(1)} pts after shift ${modifiers.sentimentShift >= 0 ? '+' : ''}${(modifiers.sentimentShift * 10).toFixed(1)}.`,
    `Engagement EMA ${metrics.engagementEma.toFixed(1)} with shift ${(modifiers.engagementShift * 20).toFixed(1)}.`,
  ];

  if (predictions.length) {
    const leader = predictions[0];
    insights.push(
      `Top predicted topic: ${leader.topic} (~${leader.predictedCount.toFixed(1)} articles, confidence ${leader.confidence}%).`
    );
  }

  return insights;
};

export const buildEventAnalytics = (
  articles: NewsArticle[],
  scenarioModifiers?: Partial<ForecastScenarioModifiers>
): EventAnalyticsResult => {
  const modifiers = normalizeScenarioModifiers(scenarioModifiers);
  const historicalRelevance = calculateHistoricalRelevance(articles);
  const growthRate = calculateGrowthRate(articles);
  const sentimentVolatility = calculateSentimentVolatility(articles);
  const engagementEma = calculateEngagementEma(articles);

  const baselineMetrics: ForecastMetrics = {
    historicalRelevance,
    growthRate,
    sentimentVolatility,
    engagementEma,
    predictionScore: buildPredictionScore(
      historicalRelevance,
      growthRate,
      sentimentVolatility,
      engagementEma
    ),
  };

  const adjustedMetrics = applyScenarioToMetrics(baselineMetrics, modifiers);
  const predictions = forecastFutureTopics(articles, adjustedMetrics, modifiers);

  const warnings: string[] = [];
  if (articles.length < 3) {
    warnings.push('Limited signal coverage — predictions carry higher uncertainty.');
  }
  if (adjustedMetrics.sentimentVolatility > 60) {
    warnings.push('High sentiment volatility detected. Monitor for rapid pivots.');
  }

  const driverInsights = buildDriverInsights(adjustedMetrics, modifiers, predictions);

  return {
    metrics: adjustedMetrics,
    predictions,
    driverInsights,
    warnings,
  };
};
