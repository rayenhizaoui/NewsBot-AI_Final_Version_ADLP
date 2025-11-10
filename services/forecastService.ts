import { z } from 'zod';
import type {
  ForecastNode,
  ForecastOutcome,
  ForecastScenarioModifiers,
  NewsArticle,
} from '../types';
import {
  fetchLatestArticles,
  estimateSentimentBreakdown,
  getSourceBias,
} from './newsService';
import {
  buildEventAnalytics,
  DEFAULT_SCENARIO_MODIFIERS,
  type EventAnalyticsResult,
} from '../utils/forecastAnalytics';
import { MOCK_FORECASTS } from '../constants';

interface ForecastEventConfig {
  id: string;
  eventName: string;
  description: string;
  topics: string[];
  keywords: string[];
  windowDays: number;
  articleLimit: number;
  fallback: ForecastNode | null;
}

interface ForecastRequestOptions {
  scenario?: string;
}

interface ScenarioContext {
  key: 'baseline' | 'trade-relief' | 'conflict-escalation' | 'tech-breakthrough' | 'custom';
  label: string;
  summary: string;
  modifiers: ForecastScenarioModifiers;
  raw?: string;
}

interface CacheEntry {
  timestamp: number;
  ttl: number;
  data: ForecastNode;
}

interface ArticleCacheEntry {
  timestamp: number;
  articles: NewsArticle[];
}

const FORECAST_MODEL = 'gemini-2.0-flash-exp';
const FORECAST_ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${FORECAST_MODEL}:generateContent`;
const FORECAST_CACHE_PREFIX = 'newsbot_forecast_v2_';
const ARTICLE_CACHE_PREFIX = 'newsbot_article_buffer_';
const MIN_CACHE_TTL_MS = 1000 * 60 * 4;
const MAX_CACHE_TTL_MS = 1000 * 60 * 12;
const ARTICLE_CACHE_TTL_MS = 1000 * 60 * 4;
const MAX_RELEVANT_ARTICLES = 18;
const DIGEST_BULLET_LIMIT = 24;
const MS_IN_DAY = 1000 * 60 * 60 * 24;

const probabilitySchema = z.preprocess(value => {
  if (typeof value === 'string') {
    const parsed = Number.parseFloat(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  }
  if (typeof value === 'number') {
    return value;
  }
  return undefined;
}, z.number().min(5).max(95));

const ForecastOutcomeSchema = z.object({
  title: z.string().trim().min(4).max(160),
  probability: probabilitySchema,
  explanation: z.string().trim().min(8).max(480),
});

const ForecastResponseSchema = z.object({
  eventName: z.string().trim().min(2).max(180),
  shortTerm: z.array(ForecastOutcomeSchema).min(1).max(4),
  mediumTerm: z.array(ForecastOutcomeSchema).min(1).max(4),
  keyDrivers: z.array(z.string().trim().min(4).max(200)).min(1).max(6),
});

const FORECAST_EVENT_SCHEMA = z.object({
  id: z.string().min(3),
  eventName: z.string().min(6),
  description: z.string().min(12),
  topics: z.array(z.string().min(3)).min(1),
  keywords: z.array(z.string().min(2)).min(3),
  windowDays: z.number().int().min(2).max(45),
  articleLimit: z.number().int().min(6).max(60),
  fallback: z.any().nullable(),
});

const RAW_FORECAST_EVENTS: Array<z.infer<typeof FORECAST_EVENT_SCHEMA>> = [
  {
    id: 'global-chip-shortage',
    eventName: 'Global Chip Shortage',
    description: 'Evaluates semiconductor supply risk across technology manufacturing ecosystems.',
    topics: ['Technology', 'Economics'],
    keywords: [
      'semiconductor',
      'chip',
      'supply chain',
      'foundry',
      'fab',
      'wafer',
      'tsmc',
      'intel',
      'qualcomm',
      'taiwan',
      'lithography',
    ],
    windowDays: 30,
    articleLimit: 32,
    fallback: MOCK_FORECASTS['global-chip-shortage'] ?? null,
  },
];

const FORECAST_EVENTS: Record<string, ForecastEventConfig> = RAW_FORECAST_EVENTS.reduce(
  (acc, raw) => {
    const parsed = FORECAST_EVENT_SCHEMA.parse(raw);
    acc[parsed.id] = parsed as ForecastEventConfig;
    return acc;
  },
  {} as Record<string, ForecastEventConfig>,
);

type ScenarioKey = ScenarioContext['key'];

interface ScenarioPreset {
  key: ScenarioKey;
  label: string;
  summary: string;
  modifiers: ForecastScenarioModifiers;
  synonyms: string[];
}

const SCENARIO_PRESETS: ScenarioPreset[] = [
  {
    key: 'trade-relief',
    label: 'Trade Relief',
    summary: 'Scenario assumes easing of trade restrictions and smoother logistics.',
    modifiers: {
      ...DEFAULT_SCENARIO_MODIFIERS,
      description: 'Trade relief scenario',
      growthMultiplier: 1.12,
      sentimentShift: 0.6,
      volumeMultiplier: 1.05,
      engagementShift: 0.1,
    },
    synonyms: ['trade', 'agreement', 'tariff', 'sanction lift', 'supply chain relief', 'deal'],
  },
  {
    key: 'conflict-escalation',
    label: 'Conflict Escalation',
    summary: 'Scenario assumes geopolitical tension escalates in key production regions.',
    modifiers: {
      ...DEFAULT_SCENARIO_MODIFIERS,
      description: 'Conflict escalation scenario',
      growthMultiplier: 0.88,
      sentimentShift: -0.9,
      volumeMultiplier: 0.95,
      engagementShift: -0.05,
    },
    synonyms: ['conflict', 'war', 'tension', 'geopolitical', 'sanction', 'disruption'],
  },
  {
    key: 'tech-breakthrough',
    label: 'Tech Breakthrough',
    summary: 'Scenario assumes step-change innovation improves yields and efficiency.',
    modifiers: {
      ...DEFAULT_SCENARIO_MODIFIERS,
      description: 'Tech breakthrough scenario',
      growthMultiplier: 1.18,
      sentimentShift: 0.85,
      volumeMultiplier: 1.08,
      engagementShift: 0.25,
    },
    synonyms: ['breakthrough', 'innovation', 'efficiency', 'new process', 'technology', 'ai-driven'],
  },
];

interface ScenarioNarrative {
  shortDemandTitle: string;
  shortDemandSuffix: string;
  shortRiskTitle: string;
  shortRiskSuffix: string;
  mediumPrimaryPrefix: string;
  mediumPrimarySuffix: string;
  mediumSecondaryPrefix: string;
  mediumSecondarySuffix: string;
  fallbackPrimaryTitle: string;
  fallbackSecondaryTitle: string;
}

const SCENARIO_NARRATIVES: Record<ScenarioKey, ScenarioNarrative> = {
  baseline: {
    shortDemandTitle: 'Demand Momentum Likely to Persist',
    shortDemandSuffix: 'Organic momentum aligns with recent coverage.',
    shortRiskTitle: 'Supply Conditions Moderately Stable',
    shortRiskSuffix: 'Volatility signals remain within historical bounds.',
    mediumPrimaryPrefix: 'Core Theme: ',
    mediumPrimarySuffix: 'Baseline outlook grounded in current analytics.',
    mediumSecondaryPrefix: 'Secondary Watch: ',
    mediumSecondarySuffix: 'Complementary signals worth monitoring.',
    fallbackPrimaryTitle: 'Baseline Medium-Term Outlook',
    fallbackSecondaryTitle: 'Monitor for Additional Baseline Signals',
  },
  'trade-relief': {
    shortDemandTitle: 'Trade Relief: Supply Lines Normalize',
    shortDemandSuffix: 'Easing restrictions channels demand toward faster recovery.',
    shortRiskTitle: 'Trade Relief: Pricing Pressure Cools',
    shortRiskSuffix: 'Lower friction reduces disruption probability.',
    mediumPrimaryPrefix: 'Trade Relief Focus: ',
    mediumPrimarySuffix: 'Logistics revival shapes the primary narrative.',
    mediumSecondaryPrefix: 'Logistics Watch: ',
    mediumSecondarySuffix: 'Secondary effects from revived corridors.',
    fallbackPrimaryTitle: 'Trade Relief Trajectory',
    fallbackSecondaryTitle: 'Logistics Stabilization Signals',
  },
  'conflict-escalation': {
    shortDemandTitle: 'Conflict Scenario: Disruptions Intensify',
    shortDemandSuffix: 'Escalating tensions pressure demand fulfillment.',
    shortRiskTitle: 'Conflict Scenario: Escalation Risk Elevated',
    shortRiskSuffix: 'Critical corridors face higher disruption odds.',
    mediumPrimaryPrefix: 'Conflict Priority: ',
    mediumPrimarySuffix: 'Security-driven bottlenecks dominate the horizon.',
    mediumSecondaryPrefix: 'Risk Spillover: ',
    mediumSecondarySuffix: 'Secondary channels vulnerable to escalation.',
    fallbackPrimaryTitle: 'Conflict Outlook',
    fallbackSecondaryTitle: 'Escalation Watchpoints',
  },
  'tech-breakthrough': {
    shortDemandTitle: 'Breakthrough Scenario: Efficiency Surge',
    shortDemandSuffix: 'Process gains accelerate capacity and demand capture.',
    shortRiskTitle: 'Breakthrough Scenario: Residual Supply Risks',
    shortRiskSuffix: 'Innovation eases strain though pockets of volatility persist.',
    mediumPrimaryPrefix: 'Innovation Focus: ',
    mediumPrimarySuffix: 'Efficiency gains reshape mid-range balance.',
    mediumSecondaryPrefix: 'Capability Expansion: ',
    mediumSecondarySuffix: 'Secondary themes leverage breakthrough potential.',
    fallbackPrimaryTitle: 'Innovation Trajectory',
    fallbackSecondaryTitle: 'Capability Expansion Signals',
  },
  custom: {
    shortDemandTitle: 'Scenario Impact: Demand Trajectory',
    shortDemandSuffix: 'Custom assumption rebalances immediate demand.',
    shortRiskTitle: 'Scenario Impact: Volatility Outlook',
    shortRiskSuffix: 'Volatility recalculated under the provided scenario.',
    mediumPrimaryPrefix: 'Scenario Spotlight: ',
    mediumPrimarySuffix: 'Primary theme reframed by scenario input.',
    mediumSecondaryPrefix: 'Scenario Watchlist: ',
    mediumSecondarySuffix: 'Secondary areas influenced by scenario assumptions.',
    fallbackPrimaryTitle: 'Scenario-Guided Outlook',
    fallbackSecondaryTitle: 'Scenario Watchlist Signals',
  },
};

const ARTICLE_MEMORY_CACHE = new Map<string, ArticleCacheEntry>();

const summarizeScenario = (scenario: ScenarioContext): string => {
  const summary = scenario.summary.trim();
  if (!summary) {
    return '';
  }
  return summary.length > 220 ? `${summary.slice(0, 217)}...` : summary;
};

const clampProbability = (value: number): number => {
  if (!Number.isFinite(value)) {
    return 50;
  }
  return Math.min(95, Math.max(5, Math.round(value)));
};

const clampScore = (value: number, min = 0, max = 100): number => {
  if (!Number.isFinite(value)) {
    return min;
  }
  return Math.min(max, Math.max(min, Math.round(value)));
};

const extractJsonBlock = (text: string): Record<string, unknown> | null => {
  if (!text) {
    return null;
  }
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) {
    return null;
  }
  try {
    return JSON.parse(match[0]);
  } catch (_error) {
    return null;
  }
};

const buildDigestLine = (article: NewsArticle): string => {
  if (article.summaryBullets && article.summaryBullets.length) {
    return `- ${article.summaryBullets[0]}`;
  }

  const fragments = (article.summary || article.fullText || '')
    .split(/(?<=[.!?])\s+/)
    .filter(Boolean);
  const first = fragments[0] ?? article.summary ?? article.headline;
  return `- ${first}`;
};

const describeDataWindow = (articles: NewsArticle[]): string => {
  if (!articles.length) {
    return 'No recent coverage available';
  }
  const timestamps = articles
    .map(article => {
      const parsed = Date.parse(article.date);
      return Number.isNaN(parsed) ? null : parsed;
    })
    .filter((value): value is number => value !== null);
  if (!timestamps.length) {
    return `Latest ${articles.length} article${articles.length > 1 ? 's' : ''} reviewed.`;
  }
  const minTs = Math.min(...timestamps);
  const maxTs = Math.max(...timestamps);
  const spanDays = Math.max(1, Math.round((maxTs - minTs) / MS_IN_DAY) + 1);
  const earliest = new Date(minTs).toLocaleDateString();
  const latest = new Date(maxTs).toLocaleDateString();
  return `Coverage window: ${earliest} → ${latest} (${spanDays} day${spanDays > 1 ? 's' : ''})`;
};

const resolveScenarioContext = (rawScenario?: string): ScenarioContext => {
  if (!rawScenario) {
    return {
      key: 'baseline',
      label: 'Baseline Conditions',
      summary: 'Baseline conditions without additional interventions.',
      modifiers: { ...DEFAULT_SCENARIO_MODIFIERS },
    };
  }

  const normalized = rawScenario.toLowerCase();
  const preset = SCENARIO_PRESETS.find(entry =>
    entry.synonyms.some(keyword => normalized.includes(keyword)),
  );

  if (preset) {
    return {
      key: preset.key,
      label: preset.label,
      summary: `${preset.summary} User prompt: ${rawScenario}`,
      modifiers: { ...preset.modifiers },
      raw: rawScenario,
    };
  }

  const positiveCues = ['improve', 'stabilize', 'ally', 'boost', 'recover', 'support'];
  const negativeCues = ['disrupt', 'shutdown', 'ban', 'conflict', 'shortage', 'delay'];

  let score = 0;
  positiveCues.forEach(cue => {
    if (normalized.includes(cue)) {
      score += 1;
    }
  });
  negativeCues.forEach(cue => {
    if (normalized.includes(cue)) {
      score -= 1;
    }
  });

  const sentimentShift = Math.max(-1.1, Math.min(1.1, score * 0.35));
  const growthMultiplier = 1 + Math.max(-0.18, Math.min(0.18, score * 0.05));
  const volumeMultiplier = 1 + Math.max(-0.12, Math.min(0.14, score * 0.04));
  const engagementShift = Math.max(-0.35, Math.min(0.35, score * 0.07));

  return {
    key: 'custom',
    label: 'Custom Scenario',
    summary: rawScenario,
    raw: rawScenario,
    modifiers: {
      ...DEFAULT_SCENARIO_MODIFIERS,
      description: `Custom scenario: ${rawScenario}`,
      sentimentShift,
      growthMultiplier,
      volumeMultiplier,
      engagementShift,
    },
  };
};

const BIAS_WEIGHTS: Record<string, number> = {
  Left: 0.82,
  'Center-Left': 0.95,
  Center: 1,
  'Center-Right': 0.95,
  Right: 0.82,
};

const TRUST_WEIGHTS: Record<string, number> = {
  'A+': 1,
  A: 0.98,
  'A-': 0.95,
  'B+': 0.9,
  B: 0.86,
  default: 0.82,
};

const scoreArticleForEvent = (article: NewsArticle, config: ForecastEventConfig): number => {
  let score = 0;
  if (config.topics.includes(article.topic)) {
    score += 3;
  }

  const haystack = `${article.headline} ${article.summary} ${(article.summaryBullets ?? []).join(' ')}`
    .toLowerCase();
  config.keywords.forEach(keyword => {
    if (haystack.includes(keyword)) {
      score += 2.4;
    }
  });

  const resolvedBias = article.bias ?? getSourceBias(article.source);
  const biasWeight = BIAS_WEIGHTS[resolvedBias ?? 'Center'] ?? 0.85;
  const trustWeight = TRUST_WEIGHTS[article.trustScore] ?? TRUST_WEIGHTS.default;
  score *= biasWeight * trustWeight;

  const breakdown = estimateSentimentBreakdown(
    article.summary || article.fullText || article.headline,
    article.sentiment,
  );
  const sentimentSpread = Math.abs(breakdown.positive - breakdown.negative) / 100;
  score += sentimentSpread * 1.6;

  const recencyTs = Date.parse(article.date);
  if (!Number.isNaN(recencyTs)) {
    const ageDays = Math.max(0, (Date.now() - recencyTs) / MS_IN_DAY);
    score += Math.max(0, 2.5 - ageDays * 0.4);
  }

  return score;
};

const buildForecastPrompt = (
  config: ForecastEventConfig,
  articles: NewsArticle[],
  analytics: EventAnalyticsResult,
  scenario: ScenarioContext,
): string => {
  const digestLines = articles
    .map(buildDigestLine)
    .slice(0, DIGEST_BULLET_LIMIT)
    .join('\n');

  const metrics = analytics.metrics;
  const predictionsBlock = analytics.predictions.length
    ? analytics.predictions
        .slice(0, 3)
        .map(prediction =>
          `- ${prediction.topic}: ≈${prediction.predictedCount} articles, confidence ${prediction.confidence}%`,
        )
        .join('\n')
    : '- No pronounced topic concentrations detected.';

  const warningsBlock = analytics.warnings.length
    ? analytics.warnings.map(item => `- ${item}`).join('\n')
    : '- None detected.';

  const scenarioSummary = scenario.raw ?? scenario.summary;

  return [
    'You are NewsBot, an expert geopolitical and market forecaster.',
    `Event: ${config.eventName}`,
    `Context: ${config.description}`,
    `Scenario input: ${scenarioSummary || 'Baseline conditions'}.`,
    `Scenario modifiers already applied in analytics: growth x${scenario.modifiers.growthMultiplier.toFixed(2)}, sentiment shift ${scenario.modifiers.sentimentShift.toFixed(2)}, volume x${scenario.modifiers.volumeMultiplier.toFixed(2)}, engagement shift ${scenario.modifiers.engagementShift.toFixed(2)}.`,
    'Use the analytics summary and digest below to craft evidence-backed forecasts that are distinct for this scenario.',
    'Return ONLY valid JSON with this schema: {"eventName": string, "shortTerm": [{"title": string, "probability": number, "explanation": string}, ...], "mediumTerm": [...], "keyDrivers": [string, ...]}',
    'Probabilities must be integers between 5 and 95. Mention uncertainty if evidence is sparse. Adjust the storyline to reflect the scenario context explicitly.',
    '',
    'Analytics summary:',
    `- Historical relevance index: ${metrics.historicalRelevance.toFixed(1)}`,
    `- Growth velocity (EMA): ${(metrics.growthRate * 100).toFixed(1)}%`,
    `- Sentiment volatility: ${metrics.sentimentVolatility.toFixed(1)} pts`,
    `- Engagement EMA: ${metrics.engagementEma.toFixed(1)}`,
    `- Composite prediction score: ${metrics.predictionScore.toFixed(1)}`,
    '',
    'Top predicted thematic concentrations:',
    predictionsBlock,
    '',
    'Risk warnings:',
    warningsBlock,
    '',
    'News digest (most recent first):',
    digestLines || '- No recent coverage. Base reasoning on historical patterns and default priors.',
  ].join('\n');
};

const readCache = (eventId: string, scenarioKey: string): ForecastNode | null => {
  if (typeof window === 'undefined') {
    return null;
  }

  const key = `${FORECAST_CACHE_PREFIX}${eventId}_${scenarioKey}`;

  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) {
      return null;
    }

    const entry = JSON.parse(raw) as CacheEntry | null;
    if (!entry || typeof entry.timestamp !== 'number' || typeof entry.ttl !== 'number') {
      window.localStorage.removeItem(key);
      return null;
    }

    if (Date.now() - entry.timestamp > entry.ttl) {
      window.localStorage.removeItem(key);
      return null;
    }

    return {
      ...entry.data,
      cacheSource: 'cache',
    };
  } catch (error) {
    console.warn('Unable to read forecast cache:', error);
    return null;
  }
};

const writeCache = (
  eventId: string,
  scenarioKey: string,
  data: ForecastNode,
  ttl: number,
): void => {
  if (typeof window === 'undefined') {
    return;
  }

  const key = `${FORECAST_CACHE_PREFIX}${eventId}_${scenarioKey}`;
  const entry: CacheEntry = {
    timestamp: Date.now(),
    ttl: Math.max(MIN_CACHE_TTL_MS, Math.min(MAX_CACHE_TTL_MS, ttl)),
    data,
  };

  try {
    window.localStorage.setItem(key, JSON.stringify(entry));
  } catch (error) {
    console.warn('Unable to persist forecast cache:', error);
  }
};

const mapForecastResponse = (
  payload: Record<string, unknown>,
  config: ForecastEventConfig,
): ForecastNode | null => {
  const parsed = ForecastResponseSchema.safeParse(payload);
  if (!parsed.success) {
    console.warn('Gemini forecast response failed validation:', parsed.error);
    return null;
  }

  const normalizeOutcome = (outcome: z.infer<typeof ForecastOutcomeSchema>): ForecastOutcome => ({
    title: outcome.title,
    probability: clampProbability(Math.round(outcome.probability)),
    explanation: outcome.explanation,
  });

  const data = parsed.data;

  return {
    id: config.id,
    eventName: data.eventName || config.eventName,
    shortTerm: data.shortTerm.slice(0, 3).map(normalizeOutcome),
    mediumTerm: data.mediumTerm.slice(0, 3).map(normalizeOutcome),
    keyDrivers: data.keyDrivers.slice(0, 6),
  };
};

const requestGeminiForecast = async (
  prompt: string,
  apiKey: string,
  config: ForecastEventConfig,
): Promise<ForecastNode | null> => {
  try {
    const response = await fetch(`${FORECAST_ENDPOINT}?key=${encodeURIComponent(apiKey)}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [
          {
            role: 'user',
            parts: [{ text: prompt }],
          },
        ],
        safetySettings: [
          { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_NONE' },
          { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_NONE' },
          { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_NONE' },
          { category: 'HARM_CATEGORY_SEXUAL', threshold: 'BLOCK_NONE' },
        ],
      }),
    });

    if (!response.ok) {
      throw new Error(`Gemini forecast request failed (${response.status})`);
    }

    const payload = await response.json();
    const text = payload?.candidates?.[0]?.content?.parts
      ?.map((part: { text?: string }) => part.text ?? '')
      .join(' ');
    if (!text || typeof text !== 'string') {
      return null;
    }

    const jsonBlock = extractJsonBlock(text);
    if (!jsonBlock) {
      return null;
    }

    return mapForecastResponse(jsonBlock, config);
  } catch (error) {
    console.warn('Gemini forecast generation error:', error);
    return null;
  }
};

const buildHeuristicForecast = (
  config: ForecastEventConfig,
  articles: NewsArticle[],
  analytics: EventAnalyticsResult,
  scenario: ScenarioContext,
): ForecastNode | null => {
  if (!articles.length) {
    return null;
  }

  const metrics = analytics.metrics;
  const predictions = analytics.predictions;

  const growthOutlook = metrics.growthRate * 100;
  const sentimentRisk = metrics.sentimentVolatility;
  const demandSignal = metrics.historicalRelevance;
  const demandContribution = (demandSignal - 50) * 0.18;

  const scenarioMomentum = (scenario.modifiers.growthMultiplier - 1) * 120;
  const scenarioSentiment = scenario.modifiers.sentimentShift * 24;
  const scenarioVolume = (scenario.modifiers.volumeMultiplier - 1) * 90;
  const scenarioEngagement = scenario.modifiers.engagementShift * 30;
  const scenarioDelta = scenarioMomentum * 0.35 + scenarioSentiment * 0.45 + scenarioVolume * 0.2;

  const narrative = SCENARIO_NARRATIVES[scenario.key] ?? SCENARIO_NARRATIVES.custom;
  const scenarioSummary = summarizeScenario(scenario);
  const scenarioSuffix = scenarioSummary ? ` ${scenarioSummary}` : '';

  const shortTerm: ForecastOutcome[] = [
    {
      title: growthOutlook >= 55
        ? narrative.shortDemandTitle
        : `${narrative.shortDemandTitle} (watch pace)`,
      probability: clampProbability(
        48 + growthOutlook * 0.32 + scenarioDelta + scenarioEngagement + demandContribution,
      ),
      explanation:
        `${narrative.shortDemandSuffix} Growth ${growthOutlook.toFixed(1)}%, demand index ${demandSignal.toFixed(1)}. Scenario deltas (g:${scenarioMomentum.toFixed(1)}, s:${scenarioSentiment.toFixed(1)}, v:${scenarioVolume.toFixed(1)}).${scenarioSuffix}`,
    },
    {
      title: sentimentRisk >= 55
        ? narrative.shortRiskTitle
        : `${narrative.shortRiskTitle} (monitor)`,
      probability: clampProbability(46 + sentimentRisk * 0.38 - scenarioSentiment * 0.6),
      explanation:
        `${narrative.shortRiskSuffix} Volatility ${sentimentRisk.toFixed(1)} pts adjusted by scenario sentiment shift ${scenario.modifiers.sentimentShift.toFixed(2)}.${scenarioSuffix}`,
    },
  ];

  const mediumTerm: ForecastOutcome[] = [];
  if (predictions.length) {
    const leader = predictions[0];
    const scenarioConfidence = leader.confidence + scenarioMomentum * 0.15 - scenarioSentiment * 0.1;
    mediumTerm.push({
      title: `${narrative.mediumPrimaryPrefix}${leader.topic}`,
      probability: clampProbability(50 + scenarioConfidence * 0.38 + scenarioVolume * 0.25),
      explanation:
        `Projected ≈${leader.predictedCount.toFixed(1)} articles; scenario confidence ${scenarioConfidence.toFixed(1)}%. ${narrative.mediumPrimarySuffix}.${scenarioSuffix}`,
    });
    const runner = predictions[1];
    if (runner) {
      const runnerConfidence = runner.confidence + scenarioEngagement * 0.3;
      mediumTerm.push({
        title: `${narrative.mediumSecondaryPrefix}${runner.topic}`,
        probability: clampProbability(45 + runnerConfidence * 0.3 + scenarioSentiment * 0.25),
        explanation:
          `Confidence ${runnerConfidence.toFixed(1)}% after scenario engagement and sentiment adjustments. ${narrative.mediumSecondarySuffix}.${scenarioSuffix}`,
      });
    }
  }

  if (!mediumTerm.length) {
    mediumTerm.push(
      {
        title: narrative.fallbackPrimaryTitle,
        probability: 50,
        explanation:
          `Insufficient topical concentration to infer a confident outcome. ${narrative.mediumPrimarySuffix}.${scenarioSuffix}`,
      },
      {
        title: narrative.fallbackSecondaryTitle,
        probability: 48,
        explanation:
          `Await further coverage to refine medium-term expectations. ${narrative.mediumSecondarySuffix}.${scenarioSuffix}`,
      },
    );
  } else if (mediumTerm.length === 1) {
    mediumTerm.push({
      title: `${narrative.mediumSecondaryPrefix}Secondary Channels`,
      probability: clampProbability(46 + metrics.predictionScore * 0.2),
      explanation:
        `Single-topic dominance suggests tracking emerging signals to confirm breadth. ${narrative.mediumSecondarySuffix}.${scenarioSuffix}`,
    });
  }

  const driverCandidates = [
    `Scenario lens: ${scenario.summary}`,
    ...analytics.driverInsights.slice(0, 4),
    ...articles.slice(0, 3).map(article => `${article.source}: ${article.headline}`),
  ].filter(Boolean);

  const uniqueDrivers = Array.from(new Set(driverCandidates)).slice(0, 5);
  if (!uniqueDrivers.length) {
    uniqueDrivers.push('Monitoring scenario impacts and sentiment dispersion.');
  }

  return {
    id: config.id,
    eventName: config.eventName,
    shortTerm: shortTerm.slice(0, 2),
    mediumTerm: mediumTerm.slice(0, 2),
    keyDrivers: uniqueDrivers,
  };
};

const selectRelevantArticles = (
  articles: NewsArticle[],
  config: ForecastEventConfig,
): NewsArticle[] => {
  const scored = articles
    .map(article => ({ article, score: scoreArticleForEvent(article, config) }))
    .filter(entry => Number.isFinite(entry.score));

  scored.sort((a, b) => b.score - a.score);

  const limit = Math.min(config.articleLimit, MAX_RELEVANT_ARTICLES);
  const seen = new Set<string>();
  const selected: NewsArticle[] = [];

  for (const { article } of scored) {
    if (seen.has(article.id)) {
      continue;
    }
    seen.add(article.id);
    selected.push(article);
    if (selected.length >= limit) {
      break;
    }
  }

  if (!selected.length) {
    return articles.slice(0, limit);
  }

  return selected;
};

const computeAdaptiveTtl = (metrics: EventAnalyticsResult['metrics']): number => {
  const volatilityFactor = Math.min(1, Math.abs(metrics.sentimentVolatility) / 25);
  const growthFactor = Math.min(1, Math.abs(metrics.growthRate));
  const engagementFactor = Math.min(1, Math.abs(metrics.engagementEma) / 100);

  const changePressure = volatilityFactor * 0.55 + growthFactor * 0.35 + engagementFactor * 0.1;
  const freshnessWeight = Math.max(0, Math.min(1, 1 - changePressure));
  const span = MAX_CACHE_TTL_MS - MIN_CACHE_TTL_MS;

  return Math.round(MIN_CACHE_TTL_MS + span * freshnessWeight);
};

const applyDiagnostics = (
  node: ForecastNode,
  analytics: EventAnalyticsResult,
  articles: NewsArticle[],
  scenario: ScenarioContext,
  cacheSource: ForecastNode['cacheSource'],
): ForecastNode => ({
  ...node,
  generatedAt: Date.now(),
  cacheSource,
  metrics: analytics.metrics,
  predictions: analytics.predictions,
  scenarioSummary: scenario.summary,
  scenarioModifiers: scenario.modifiers,
  diagnostics: {
    warnings: analytics.warnings,
    dataWindow: describeDataWindow(articles),
  },
});

const getFallbackForecast = (
  eventId: string,
  scenario: ScenarioContext,
): ForecastNode | null => {
  const fallback = FORECAST_EVENTS[eventId]?.fallback;
  if (!fallback) {
    return null;
  }
  const clone: ForecastNode = JSON.parse(JSON.stringify(fallback));
  return {
    ...clone,
    cacheSource: 'fallback',
    generatedAt: Date.now(),
    scenarioSummary: scenario.summary,
    scenarioModifiers: scenario.modifiers,
  };
};

const readArticleCache = async (
  event: ForecastEventConfig,
): Promise<NewsArticle[]> => {
  const key = `${ARTICLE_CACHE_PREFIX}${event.id}`;
  const cached = ARTICLE_MEMORY_CACHE.get(key);
  if (cached && Date.now() - cached.timestamp < ARTICLE_CACHE_TTL_MS) {
    return cached.articles;
  }

  const latest = await fetchLatestArticles(event.articleLimit);
  ARTICLE_MEMORY_CACHE.set(key, { timestamp: Date.now(), articles: latest });
  return latest;
};

export const getLiveForecast = async (
  eventId: string,
  options: ForecastRequestOptions = {},
): Promise<ForecastNode | null> => {
  const config = FORECAST_EVENTS[eventId];
  if (!config) {
    console.warn(`No forecast configuration found for ${eventId}`);
    return null;
  }

  const scenarioRaw = options.scenario?.trim();
  const scenario = resolveScenarioContext(scenarioRaw);
  const scenarioKey = scenario.key === 'custom'
    ? `custom_${(scenarioRaw?.toLowerCase().replace(/[^a-z0-9]+/g, '-') ?? 'baseline').slice(0, 64)}`
    : scenario.key;

  const cached = readCache(eventId, scenarioKey);
  if (cached) {
    return {
      ...cached,
      scenarioSummary: scenario.summary,
      scenarioModifiers: scenario.modifiers,
    };
  }

  if (typeof window === 'undefined') {
    return getFallbackForecast(eventId, scenario);
  }

  let articles: NewsArticle[] = [];
  try {
    const latest = await readArticleCache(config);
    articles = selectRelevantArticles(latest, config);
  } catch (error) {
    console.warn('Unable to fetch live articles for forecast:', error);
  }

  if (!articles.length) {
    return getFallbackForecast(eventId, scenario);
  }

  const analytics = buildEventAnalytics(articles, scenario.modifiers);
  const ttl = computeAdaptiveTtl(analytics.metrics);

  const apiKey = typeof window !== 'undefined'
    ? localStorage.getItem('gemini_api_key')
    : null;

  const shouldQueryGemini = Boolean(apiKey) && scenario.key === 'baseline';

  if (!shouldQueryGemini) {
    const heuristic = buildHeuristicForecast(config, articles, analytics, scenario);
    if (!heuristic) {
      return getFallbackForecast(eventId, scenario);
    }
    const enriched = applyDiagnostics(heuristic, analytics, articles, scenario, 'heuristic');
    writeCache(eventId, scenarioKey, enriched, ttl);
    return enriched;
  }

  const prompt = buildForecastPrompt(config, articles, analytics, scenario);
  const geminiForecast = await requestGeminiForecast(prompt, apiKey as string, config);

  if (geminiForecast) {
    const enriched = applyDiagnostics(geminiForecast, analytics, articles, scenario, 'gemini');
    writeCache(eventId, scenarioKey, enriched, ttl);
    return enriched;
  }

  const heuristicFallback = buildHeuristicForecast(config, articles, analytics, scenario);
  if (heuristicFallback) {
    const enriched = applyDiagnostics(heuristicFallback, analytics, articles, scenario, 'heuristic');
    writeCache(eventId, scenarioKey, enriched, ttl);
    return enriched;
  }

  return getFallbackForecast(eventId, scenario);
};
