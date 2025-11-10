import type { NewsArticle, Bias } from '../types';

interface FeedArticle {
  id: string;
  headline: string;
  summary: string;
  summaryBullets?: string[];
  fullText: string;
  author: string;
  isoDate: string;
  sentiment: 'Positive' | 'Negative' | 'Neutral';
  bias: Bias;
  readMoreUrl?: string;
  imageUrl?: string;
  source: string;
  trustScore: string;
  categories: string[];
  sentimentSource?: 'lexicon' | 'gemini';
  sentimentAnalyzedAt?: number;
  summarySource?: 'rss' | 'gemini';
  summaryAnalyzedAt?: number;
}

interface FeedConfig {
  key: string;
  url: string;
  sourceName: string;
  trustScore: string;
}

const RSS_FEEDS: Record<string, FeedConfig> = {
  'bbc-world': {
    key: 'bbc-world',
    url: 'https://feeds.bbci.co.uk/news/world/rss.xml',
    sourceName: 'BBC News',
    trustScore: 'A+',
  },
  'aljazeera-all': {
    key: 'aljazeera-all',
    url: 'https://www.aljazeera.com/xml/rss/all.xml',
    sourceName: 'Al Jazeera',
    trustScore: 'B+',
  },
  'ajplus-global': {
    key: 'ajplus-global',
    url: 'https://www.ajplus.net/rss',
    sourceName: 'AJ+',
    trustScore: 'B',
  },
  'abc-world': {
    key: 'abc-world',
    url: 'https://abcnews.go.com/abcnews/internationalheadlines',
    sourceName: 'ABC News',
    trustScore: 'B+',
  },
  'cnn-world': {
    key: 'cnn-world',
    url: 'http://rss.cnn.com/rss/edition_world.rss',
    sourceName: 'CNN',
    trustScore: 'B',
  },
  verge: {
    key: 'verge',
    url: 'https://www.theverge.com/rss/index.xml',
    sourceName: 'The Verge',
    trustScore: 'A-',
  },
};

const TOPIC_FEEDS: Record<string, string[]> = {
  Geopolitics: ['bbc-world', 'aljazeera-all', 'cnn-world'],
  Economics: ['bbc-world', 'abc-world', 'cnn-world'],
  Space: ['bbc-world', 'verge', 'cnn-world'],
  Health: ['bbc-world', 'abc-world', 'cnn-world'],
  Arts: ['bbc-world', 'verge', 'ajplus-global'],
  Technology: ['verge', 'bbc-world', 'abc-world'],
  Global: ['bbc-world', 'aljazeera-all', 'cnn-world', 'abc-world', 'ajplus-global'],
};

const TOPIC_KEYWORDS: Record<string, string[]> = {
  Geopolitics: [
    'geopolitic',
    'diplom',
    'election',
    'war',
    'conflict',
    'eu',
    'united nations',
    'nato',
    'policy',
    'government',
  ],
  Economics: [
    'economy',
    'finance',
    'market',
    'inflation',
    'gdp',
    'trade',
    'business',
    'bank',
    'stocks',
  ],
  Space: [
    'space',
    'nasa',
    'astronaut',
    'satellite',
    'lunar',
    'mars',
    'rocket',
    'galaxy',
  ],
  Health: [
    'health',
    'medical',
    'virus',
    'disease',
    'biotech',
    'vaccine',
    'wellness',
    'hospital',
  ],
  Arts: [
    'art',
    'culture',
    'music',
    'film',
    'museum',
    'design',
    'theatre',
    'fashion',
  ],
  Technology: [
    'technology',
    'ai',
    'artificial intelligence',
    'tech',
    'software',
    'hardware',
    'startup',
    'gadget',
    'robot',
  ],
};

const SOURCE_TRUST_MAP: Array<{ match: RegExp; score: string }> = [
  { match: /bbc\.co\.uk|bbc\.com/i, score: 'A+' },
  { match: /theverge\.com/i, score: 'A-' },
  { match: /reuters/i, score: 'A+' },
  { match: /nytimes|newyorktimes/i, score: 'A+' },
  { match: /aljazeera\.com/i, score: 'B+' },
  { match: /ajplus\.net/i, score: 'B' },
  { match: /abcnews\.go\.com/i, score: 'B+' },
  { match: /cnn\.com/i, score: 'B' },
];

const SOURCE_BIAS_MAP: Array<{ match: RegExp; bias: Bias }> = [
  { match: /bbc\.co\.uk|bbc\.com/i, bias: 'Center' },
  { match: /theverge\.com/i, bias: 'Center-Left' },
  { match: /reuters/i, bias: 'Center' },
  { match: /associatedpress|apnews|ap\.org/i, bias: 'Center' },
  { match: /bloomberg/i, bias: 'Center-Right' },
  { match: /nytimes|newyorktimes/i, bias: 'Center-Left' },
  { match: /wsj|wallstreetjournal/i, bias: 'Center-Right' },
  { match: /guardian/i, bias: 'Left' },
  { match: /aljazeera/i, bias: 'Center-Left' },
  { match: /foxnews/i, bias: 'Right' },
  { match: /ajplus\.net/i, bias: 'Left' },
  { match: /abcnews\.go\.com/i, bias: 'Center-Left' },
  { match: /cnn\.com/i, bias: 'Center-Left' },
];

const SENTIMENT_LEXICON: Record<string, number> = {
  // Positive momentum
  growth: 2,
  record: 2,
  surge: 2,
  wins: 3,
  win: 3,
  boosted: 2,
  boost: 2,
  progress: 2,
  improve: 2,
  improved: 2,
  improving: 2,
  breakthrough: 3,
  success: 3,
  successful: 3,
  increase: 1,
  increased: 1,
  rising: 1,
  strong: 2,
  optimistic: 2,
  recovery: 2,
  recovered: 2,
  stabilises: 1,
  stabilizes: 1,
  gain: 1,
  gains: 2,
  launch: 1,
  launches: 1,
  upgraded: 2,
  milestone: 2,
  achievement: 2,
  approved: 1,
  progressives: 1,
  visionary: 2,
  clean: 1,

  // Negative pressure
  decline: -2,
  declined: -2,
  drop: -2,
  drops: -2,
  dropped: -2,
  loss: -3,
  losses: -3,
  crisis: -3,
  crises: -3,
  tension: -2,
  tensions: -2,
  conflict: -3,
  conflicts: -3,
  war: -3,
  warning: -1,
  warns: -2,
  warned: -2,
  negative: -2,
  fall: -2,
  falls: -2,
  fallen: -2,
  decrease: -2,
  decreased: -2,
  concern: -1,
  concerns: -2,
  controversy: -2,
  slowdown: -2,
  risk: -1,
  risks: -2,
  lawsuit: -2,
  lawsuits: -2,
  investigate: -1,
  investigating: -1,
  investigation: -1,
  collapse: -3,
  collapsing: -3,
  shortage: -2,
  shortages: -2,
  inflation: -2,
  recession: -3,
  setback: -2,
  cyberattack: -3,
  hacked: -3,
  outage: -2,
  ban: -2,
  banned: -3,
  cut: -1,
  cuts: -2,
  cutting: -1,
};

const SENTIMENT_PHRASES: Record<string, number> = {
  'record profit': 3,
  'all-time high': 3,
  'beats expectations': 3,
  'exceeds expectations': 3,
  'on track': 2,
  'wins approval': 2,
  'signs deal': 2,
  'job losses': -3,
  'fails to': -2,
  'misses expectations': -3,
  'under investigation': -2,
  'faces backlash': -2,
  'data breach': -3,
  'mass layoffs': -3,
  'launches investigation': -2,
  'declares war': -4,
  'threatens to': -2,
  'slumps to': -2,
};

const DEFAULT_TRUST_SCORE = 'B';
const DEFAULT_SOURCE_BIAS: Bias = 'Center';
const CORS_PROXY_ENDPOINT = 'https://api.allorigins.win/raw?url=';
const MAX_ARTICLES_PER_TOPIC = 14;
const MAX_LATEST_ARTICLES = 40;
const FEED_CACHE_TTL_MS = 1000 * 60 * 5;
const RECENT_DAYS_LIMIT = 14;
const MIN_FILTERED_RESULTS = 6;
const GEMINI_SENTIMENT_MODEL = 'gemini-2.0-flash-exp';
const GEMINI_SENTIMENT_ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_SENTIMENT_MODEL}:generateContent`;
const GEMINI_SENTIMENT_PROMPT = [
  'Analyze the overall sentiment of the following news article.',
  'Return a JSON object with a single key "sentiment" whose value is exactly one of: Positive, Negative, Neutral.',
  'Base your judgement on the tone towards the main subject. Do not include any additional commentary.',
].join('\n');
const GEMINI_SUMMARY_MODEL = 'gemini-2.0-flash-exp';
const GEMINI_SUMMARY_ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_SUMMARY_MODEL}:generateContent`;
const GEMINI_SUMMARY_PROMPT = [
  'You are NewsBot, an expert news summarizer for readers who want a quick, neutral briefing.',
  'Write a concise 3-bullet summary of the article below in English.',
  'Each bullet should be a complete sentence (10-24 words), covering: key event, important context, possible impact.',
  'Avoid repetition, speculation, or promotional language. Do not mention this is a summary.',
  'Return only a JSON object with the following shape: { "summary": ["bullet 1", "bullet 2", "bullet 3"] }',
  'If there is not enough information to produce 3 bullets, reuse the available facts but keep three entries.',
].join('\n');

export const LIVE_NEWS_STORAGE_KEY = 'newsbot_live_articles';

const feedCache = new Map<string, { timestamp: number; articles: FeedArticle[] }>();

const normalizeText = (text: string): string => text
  .toLowerCase()
  .replace(/[^a-z0-9\s]/g, ' ')
  .replace(/\s+/g, ' ')
  .trim();

const computeSentimentScore = (text: string): number => {
  if (!text) {
    return 0;
  }

  const normalized = normalizeText(text);
  if (!normalized) {
    return 0;
  }

  let score = 0;

  // Evaluate key phrases first
  Object.entries(SENTIMENT_PHRASES).forEach(([phrase, phraseScore]) => {
    if (normalized.includes(phrase)) {
      score += phraseScore;
    }
  });

  const tokens = normalized.split(' ');
  tokens.forEach(token => {
    const tokenScore = SENTIMENT_LEXICON[token];
    if (typeof tokenScore === 'number') {
      score += tokenScore;
    }
  });

  return score;
};

const inferSentiment = (text: string): 'Positive' | 'Negative' | 'Neutral' => {
  const score = computeSentimentScore(text);
  if (score > 1.5) {
    return 'Positive';
  }
  if (score < -1.5) {
    return 'Negative';
  }
  return 'Neutral';
};

const resolveTrustScore = (source: string): string => {
  const entry = SOURCE_TRUST_MAP.find(item => item.match.test(source));
  return entry ? entry.score : DEFAULT_TRUST_SCORE;
};

const resolveSourceBias = (source: string): Bias => {
  const entry = SOURCE_BIAS_MAP.find(item => item.match.test(source));
  return entry ? entry.bias : DEFAULT_SOURCE_BIAS;
};

const formatDisplayDate = (isoString: string): string => {
  if (!isoString) {
    return '';
  }

  const parsed = Date.parse(isoString);
  if (Number.isNaN(parsed)) {
    return isoString;
  }

  const formattedDate = new Date(parsed).toLocaleDateString(undefined, {
    month: 'short',
    day: '2-digit',
    year: 'numeric',
  });

  return formattedDate;
};

const stripHtml = (html: string): string => {
  if (!html) {
    return '';
  }
  return html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
};

const extractDomain = (url?: string | null): string | null => {
  if (!url) {
    return null;
  }

  try {
    const { hostname } = new URL(url);
    return hostname.replace(/^www\./i, '');
  } catch (_error) {
    return null;
  }
};

const sanitizeId = (feedKey: string, raw: string, index: number): string => {
  const slug = raw
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 48);
  return `live-${feedKey}-${slug || index}`;
};

const getFirstText = (element: Element, ...tagNames: string[]): string => {
  for (const tag of tagNames) {
    const found = element.getElementsByTagName(tag);
    if (found && found.length > 0) {
      const value = found.item(0)?.textContent?.trim();
      if (value) {
        return value;
      }
    }
  }
  return '';
};

const getAttributeFromElements = (
  element: Element,
  tagNames: string[],
  attribute: string
): string | undefined => {
  for (const tag of tagNames) {
    const nodes = element.getElementsByTagName(tag);
    for (let i = 0; i < nodes.length; i += 1) {
      const attr = (nodes.item(i) as Element)?.getAttribute(attribute);
      if (attr) {
        return attr;
      }
    }
  }
  return undefined;
};

const extractImageUrl = (item: Element): string | undefined => {
  const mediaUrl = getAttributeFromElements(item, ['media:content', 'media:thumbnail'], 'url');
  if (mediaUrl) {
    return mediaUrl;
  }

  const enclosureUrl = getAttributeFromElements(item, ['enclosure'], 'url');
  if (enclosureUrl) {
    return enclosureUrl;
  }

  const description = getFirstText(item, 'description', 'content:encoded');
  const match = description.match(/<img[^>]+src="([^"]+)"/i);
  return match ? match[1] : undefined;
};

const createArticleFromItem = (
  feed: FeedConfig,
  item: Element,
  index: number
): FeedArticle | null => {
  const title = getFirstText(item, 'title');
  if (!title) {
    return null;
  }

  const link = getFirstText(item, 'link');
  const description = getFirstText(item, 'description', 'content:encoded');
  const pubDateRaw = getFirstText(item, 'pubDate', 'published', 'updated');
  const author = getFirstText(item, 'dc:creator', 'author', 'creator') || feed.sourceName;
  const categories = Array.from(item.getElementsByTagName('category'))
    .map(node => node.textContent?.toLowerCase().trim())
    .filter(Boolean) as string[];
  const imageUrl = extractImageUrl(item);

  let isoDate = new Date().toISOString();
  if (pubDateRaw) {
    const parsed = Date.parse(pubDateRaw);
    if (!Number.isNaN(parsed)) {
      isoDate = new Date(parsed).toISOString();
    }
  }

  const summary = stripHtml(description) || title;
  const fullText = stripHtml(description);
  const sourceDomain = extractDomain(link) || feed.sourceName;
  const trustScore = resolveTrustScore(sourceDomain) || feed.trustScore;
  const bias = resolveSourceBias(sourceDomain);
  const sentimentText = [title, summary, categories.join(' ')].join(' ');

  return {
    id: sanitizeId(feed.key, link || title, index),
    headline: title,
    summary,
    fullText,
    author,
    isoDate,
    sentiment: inferSentiment(sentimentText),
    readMoreUrl: link || undefined,
    imageUrl,
    source: sourceDomain,
    trustScore,
  bias,
    categories,
    sentimentSource: 'lexicon',
    sentimentAnalyzedAt: Date.now(),
    summarySource: 'rss',
    summaryAnalyzedAt: Date.now(),
  };
};

const ensureDomParser = (): DOMParser => {
  if (typeof window === 'undefined' || typeof DOMParser === 'undefined') {
    throw new Error('DOMParser is not available in this environment.');
  }
  return new DOMParser();
};

const parseRssFeed = (feed: FeedConfig, xml: string): FeedArticle[] => {
  const parser = ensureDomParser();
  const doc = parser.parseFromString(xml, 'application/xml');
  if (doc.querySelector('parsererror')) {
    throw new Error(`Échec du parsing du flux RSS (${feed.sourceName}).`);
  }

  const items = Array.from(doc.getElementsByTagName('item'));
  return items
    .map((item, index) => createArticleFromItem(feed, item, index))
    .filter((article): article is FeedArticle => Boolean(article));
};

const fetchFeedXml = async (url: string): Promise<string> => {
  const proxiedUrl = `${CORS_PROXY_ENDPOINT}${encodeURIComponent(url)}`;
  const response = await fetch(proxiedUrl);
  if (!response.ok) {
    throw new Error(`Unable to fetch feed (${response.status})`);
  }
  return response.text();
};

const fetchFeedArticles = async (feedKey: string): Promise<FeedArticle[]> => {
  const cached = feedCache.get(feedKey);
  if (cached && Date.now() - cached.timestamp < FEED_CACHE_TTL_MS) {
    return cached.articles;
  }

  const feed = RSS_FEEDS[feedKey];
  if (!feed) {
    return [];
  }

  try {
    const xml = await fetchFeedXml(feed.url);
    const articles = parseRssFeed(feed, xml);
    feedCache.set(feedKey, { timestamp: Date.now(), articles });
    return articles;
  } catch (error) {
    console.error(`Failed to fetch RSS feed ${feedKey}:`, error);
    return [];
  }
};

const dedupeArticles = (articles: FeedArticle[]): FeedArticle[] => {
  const unique = new Map<string, FeedArticle>();
  articles.forEach(article => {
    const key = article.readMoreUrl || article.headline.toLowerCase();
    if (!unique.has(key)) {
      unique.set(key, article);
    }
  });
  return Array.from(unique.values());
};

const isRecentArticle = (article: FeedArticle): boolean => {
  const parsed = Date.parse(article.isoDate);
  if (Number.isNaN(parsed)) {
    return true;
  }
  const ageMs = Date.now() - parsed;
  return ageMs <= RECENT_DAYS_LIMIT * 24 * 60 * 60 * 1000;
};

const matchesKeywords = (article: FeedArticle, keywords: string[]): boolean => {
  if (!keywords.length) {
    return true;
  }

  const haystack = [
    article.headline,
    article.summary,
    article.categories.join(' '),
    article.source,
  ]
    .join(' ')
    .toLowerCase();

  return keywords.some(keyword => haystack.includes(keyword));
};

const selectArticlesForTopic = (
  articles: FeedArticle[],
  topic: string
): FeedArticle[] => {
  const keywords = (TOPIC_KEYWORDS[topic] || []).map(keyword => keyword.toLowerCase());
  const recentArticles = articles.filter(isRecentArticle);
  const keywordMatches = recentArticles.filter(article => matchesKeywords(article, keywords));

  if (keywordMatches.length >= MIN_FILTERED_RESULTS) {
    return keywordMatches;
  }

  const fallbackMatches = articles.filter(article => matchesKeywords(article, keywords));
  if (fallbackMatches.length) {
    return fallbackMatches;
  }

  return recentArticles.length ? recentArticles : articles;
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

const normalizeSentimentLabel = (value: unknown): 'Positive' | 'Negative' | 'Neutral' | null => {
  if (typeof value !== 'string') {
    return null;
  }

  const lower = value.trim().toLowerCase();
  const normalized = lower.normalize('NFD').replace(/[\u0300-\u036f]/g, '');

  if (['positive', 'positif'].includes(normalized)) {
    return 'Positive';
  }
  if (['negative', 'negatif'].includes(normalized)) {
    return 'Negative';
  }
  if (['neutral', 'neutre'].includes(normalized)) {
    return 'Neutral';
  }
  return null;
};

const buildSentimentPrompt = (article: FeedArticle): string => {
  const summary = article.fullText || article.summary || article.headline;
  const clippedSummary = summary.length > 1800 ? `${summary.slice(0, 1800)}…` : summary;

  return `${GEMINI_SENTIMENT_PROMPT}

Headline: ${article.headline}
Summary: ${clippedSummary}`;
};

const buildSummaryPrompt = (article: FeedArticle): string => {
  const baseText = article.fullText || article.summary || article.headline;
  const clipped = baseText.length > 2400 ? `${baseText.slice(0, 2400)}…` : baseText;
  const categories = article.categories.length ? `Categories: ${article.categories.join(', ')}\n` : '';

  return `${GEMINI_SUMMARY_PROMPT}

Headline: ${article.headline}
Source: ${article.source}
${categories}Published: ${article.isoDate}

Article:
${clipped}`;
};

const analyzeSentimentWithGemini = async (
  article: FeedArticle,
  apiKey: string
): Promise<'Positive' | 'Negative' | 'Neutral' | null> => {
  try {
    const response = await fetch(`${GEMINI_SENTIMENT_ENDPOINT}?key=${encodeURIComponent(apiKey)}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [
          {
            role: 'user',
            parts: [{ text: buildSentimentPrompt(article) }],
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
      throw new Error(`Gemini sentiment request failed (${response.status})`);
    }

    const payload = await response.json();
    const text = payload?.candidates?.[0]?.content?.parts?.map((part: { text?: string }) => part.text || '').join(' ');
    const jsonBlock = extractJsonBlock(text);
    if (!jsonBlock) {
      return null;
    }

    return normalizeSentimentLabel((jsonBlock as Record<string, unknown>).sentiment);
  } catch (error) {
    console.warn('Gemini sentiment analysis error:', error);
    return null;
  }
};

const applyGeminiSentiment = async (articles: FeedArticle[]): Promise<void> => {
  if (!articles.length) {
    return;
  }

  if (typeof window === 'undefined') {
    return;
  }

  const apiKey = localStorage.getItem('gemini_api_key');
  if (!apiKey) {
    return;
  }

  for (const article of articles) {
    if (
      article.sentimentSource === 'gemini' &&
      article.sentimentAnalyzedAt &&
      Date.now() - article.sentimentAnalyzedAt < FEED_CACHE_TTL_MS
    ) {
      continue;
    }

    const sentiment = await analyzeSentimentWithGemini(article, apiKey);
    if (sentiment) {
      article.sentiment = sentiment;
      article.sentimentSource = 'gemini';
      article.sentimentAnalyzedAt = Date.now();
    }

    await new Promise(resolve => setTimeout(resolve, 120));
  }
};

const analyzeSummaryWithGemini = async (
  article: FeedArticle,
  apiKey: string
): Promise<string[] | null> => {
  try {
    const response = await fetch(`${GEMINI_SUMMARY_ENDPOINT}?key=${encodeURIComponent(apiKey)}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [
          {
            role: 'user',
            parts: [{ text: buildSummaryPrompt(article) }],
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
      throw new Error(`Gemini summary request failed (${response.status})`);
    }

    const payload = await response.json();
    const text = payload?.candidates?.[0]?.content?.parts?.map((part: { text?: string }) => part.text || '').join(' ');
    const jsonBlock = extractJsonBlock(text);
    if (!jsonBlock) {
      return null;
    }

    const summary = (jsonBlock as Record<string, unknown>).summary;
    if (Array.isArray(summary)) {
      const cleaned = summary
        .map(item => (typeof item === 'string' ? item.trim() : ''))
        .filter(Boolean);
      if (cleaned.length) {
        return cleaned.slice(0, 3);
      }
    }
    return null;
  } catch (error) {
    console.warn('Gemini summary generation error:', error);
    return null;
  }
};

const applyGeminiSummaries = async (articles: FeedArticle[]): Promise<void> => {
  if (!articles.length) {
    return;
  }

  if (typeof window === 'undefined') {
    return;
  }

  const apiKey = localStorage.getItem('gemini_api_key');
  if (!apiKey) {
    return;
  }

  for (const article of articles) {
    if (
      article.summarySource === 'gemini' &&
      article.summaryAnalyzedAt &&
      Date.now() - article.summaryAnalyzedAt < FEED_CACHE_TTL_MS
    ) {
      continue;
    }

    const bullets = await analyzeSummaryWithGemini(article, apiKey);
    if (bullets && bullets.length) {
      const bulletLines = bullets.slice(0, 3);
      article.summaryBullets = bulletLines;
      article.summary = bulletLines.join(' ');
      article.fullText = article.fullText || article.summary;
      article.summarySource = 'gemini';
      article.summaryAnalyzedAt = Date.now();
    }

    await new Promise(resolve => setTimeout(resolve, 120));
  }
};

export interface SentimentBreakdown {
  positive: number;
  neutral: number;
  negative: number;
  summary: string;
}

const SENTIMENT_DEFAULTS: Record<'Positive' | 'Negative' | 'Neutral', { positive: number; neutral: number; negative: number }> = {
  Positive: { positive: 55, neutral: 30, negative: 15 },
  Neutral: { positive: 30, neutral: 40, negative: 30 },
  Negative: { positive: 20, neutral: 30, negative: 50 },
};

const clampPercentage = (value: number, min = 5, max = 85): number => {
  const rounded = Math.round(value);
  return Math.min(max, Math.max(min, rounded));
};

const computeSentimentComponents = (text: string): { positive: number; negative: number } => {
  if (!text) {
    return { positive: 0, negative: 0 };
  }

  const normalized = normalizeText(text);
  if (!normalized) {
    return { positive: 0, negative: 0 };
  }

  let positive = 0;
  let negative = 0;

  Object.entries(SENTIMENT_PHRASES).forEach(([phrase, score]) => {
    if (normalized.includes(phrase)) {
      if (score >= 0) {
        positive += score;
      } else {
        negative += Math.abs(score);
      }
    }
  });

  normalized.split(' ').forEach(token => {
    const tokenScore = SENTIMENT_LEXICON[token];
    if (typeof tokenScore === 'number') {
      if (tokenScore >= 0) {
        positive += tokenScore;
      } else {
        negative += Math.abs(tokenScore);
      }
    }
  });

  return { positive, negative };
};

const normalizeSentimentMix = (
  rawPositive: number,
  rawNegative: number,
  label: 'Positive' | 'Negative' | 'Neutral'
): { positive: number; neutral: number; negative: number } => {
  const defaults = SENTIMENT_DEFAULTS[label];
  const total = rawPositive + rawNegative;

  if (total <= 0) {
    return { ...defaults };
  }

  const positiveShare = (rawPositive / total) * 100;
  const negativeShare = (rawNegative / total) * 100;
  const neutralShare = Math.max(0, 100 - positiveShare - negativeShare);

  let positive = clampPercentage(positiveShare * 0.6 + defaults.positive * 0.4);
  let negative = clampPercentage(negativeShare * 0.6 + defaults.negative * 0.4);
  let neutral = Math.max(5, 100 - positive - negative);

  const totalAfterClamp = positive + negative + neutral;
  if (totalAfterClamp !== 100) {
    const delta = totalAfterClamp - 100;
    if (delta > 0) {
      if (neutral - delta >= 5) {
        neutral -= delta;
      } else if (positive - delta >= 5) {
        positive -= delta;
      } else {
        negative = Math.max(5, negative - delta);
      }
    } else if (delta < 0) {
      neutral = Math.min(85, neutral - delta);
    }
  }

  return { positive, neutral, negative };
};

const describeSentimentMix = (
  mix: { positive: number; neutral: number; negative: number },
  label: 'Positive' | 'Negative' | 'Neutral'
): string => {
  const { positive, neutral, negative } = mix;
  const top = Math.max(positive, neutral, negative);

  if (top === positive) {
    return `Tone leans positive (${positive}% positive vs ${negative}% negative), consistent with the ${label.toLowerCase()} tag.`;
  }

  if (top === negative) {
    return `Tone leans negative (${negative}% negative vs ${positive}% positive), aligning with the ${label.toLowerCase()} assessment.`;
  }

  return `Tone stays mostly neutral (${neutral}% neutral language) with balanced positive and negative cues.`;
};

export const estimateSentimentBreakdown = (
  text: string,
  label: 'Positive' | 'Negative' | 'Neutral' = 'Neutral'
): SentimentBreakdown => {
  const { positive: rawPositive, negative: rawNegative } = computeSentimentComponents(text);
  const mix = normalizeSentimentMix(rawPositive, rawNegative, label);
  return {
    ...mix,
    summary: describeSentimentMix(mix, label),
  };
};

export const getSourceBias = (source: string): Bias => resolveSourceBias(source);

const resolvePrimaryTopic = (article: FeedArticle): string => {
  const haystack = [
    article.headline,
    article.summary,
    article.categories.join(' '),
  ]
    .join(' ')
    .toLowerCase();

  let bestTopic = 'Global';
  let bestScore = 0;

  Object.entries(TOPIC_KEYWORDS).forEach(([topic, keywords]) => {
    let score = 0;
    keywords.forEach(keyword => {
      if (haystack.includes(keyword)) {
        score += 1;
      }
    });
    if (score > bestScore) {
      bestScore = score;
      bestTopic = topic;
    }
  });

  return bestScore > 0 ? bestTopic : 'Global';
};

const sortByRecency = (a: FeedArticle, b: FeedArticle): number => {
  const timeA = Date.parse(a.isoDate);
  const timeB = Date.parse(b.isoDate);
  if (Number.isNaN(timeA) && Number.isNaN(timeB)) {
    return 0;
  }
  if (Number.isNaN(timeA)) {
    return 1;
  }
  if (Number.isNaN(timeB)) {
    return -1;
  }
  return timeB - timeA;
};

export const fetchTopicArticles = async (topic: string): Promise<NewsArticle[]> => {
  const feedKeys = TOPIC_FEEDS[topic] ?? ['bbc-world'];
  const feedArticlesArrays = await Promise.all(feedKeys.map(fetchFeedArticles));
  const combined = dedupeArticles(feedArticlesArrays.flat());
  const selected = selectArticlesForTopic(combined, topic)
    .slice(0, MAX_ARTICLES_PER_TOPIC);

  await applyGeminiSentiment(selected);
  await applyGeminiSummaries(selected);

  return selected.map(article => ({
    id: `${article.id}-${topic.toLowerCase()}`,
    headline: article.headline,
    source: article.source,
    trustScore: article.trustScore,
    bias: article.bias,
    author: article.author,
    date: formatDisplayDate(article.isoDate),
    summary: article.summary,
    summaryBullets: article.summaryBullets,
    sentiment: article.sentiment,
    topic,
    imageUrl: article.imageUrl,
    readMoreUrl: article.readMoreUrl,
    fullText: article.fullText || article.summary,
  }));
};

export const fetchLatestArticles = async (limit = 24): Promise<NewsArticle[]> => {
  const feedKeys = Object.keys(RSS_FEEDS);
  const feedArticles = await Promise.all(feedKeys.map(fetchFeedArticles));
  const combined = dedupeArticles(feedArticles.flat())
    .filter(isRecentArticle)
    .sort(sortByRecency)
    .slice(0, Math.min(limit, MAX_LATEST_ARTICLES));

  await applyGeminiSentiment(combined);
  await applyGeminiSummaries(combined);

  return combined.map(article => ({
    id: article.id,
    headline: article.headline,
    source: article.source,
    trustScore: article.trustScore,
    bias: article.bias,
    author: article.author,
    date: formatDisplayDate(article.isoDate),
    summary: article.summary,
    summaryBullets: article.summaryBullets,
    sentiment: article.sentiment,
    topic: resolvePrimaryTopic(article),
    imageUrl: article.imageUrl,
    readMoreUrl: article.readMoreUrl,
    fullText: article.fullText || article.summary,
  }));
};

export const persistLiveArticles = (articles: NewsArticle[]): void => {
  try {
    localStorage.setItem(LIVE_NEWS_STORAGE_KEY, JSON.stringify(articles));
  } catch (error) {
    console.warn('Unable to persist live articles:', error);
  }
};

export const loadPersistedLiveArticles = (): NewsArticle[] => {
  try {
    const stored = localStorage.getItem(LIVE_NEWS_STORAGE_KEY);
    if (!stored) {
      return [];
    }
    const parsed = JSON.parse(stored);
    if (!Array.isArray(parsed)) {
      return [];
    }
    return parsed.filter(item => typeof item?.id === 'string');
  } catch (error) {
    console.warn('Unable to load persisted live articles:', error);
    return [];
  }
};

export const getSupportedTopics = (): string[] => {
  return Object.keys(TOPIC_FEEDS);
};
