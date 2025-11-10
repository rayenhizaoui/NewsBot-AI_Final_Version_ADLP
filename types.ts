export interface NewsArticle {
  id: string;
  headline: string;
  source: string;
  trustScore: string;
  bias?: Bias;
  author: string;
  date: string;
  summary: string;
  summaryBullets?: string[];
  sentiment: 'Neutral' | 'Positive' | 'Negative';
  topic: string;
  imageUrl?: string;
  readMoreUrl?: string;
  fullText?: string;
}

export type Bias = 'Left' | 'Center-Left' | 'Center' | 'Center-Right' | 'Right';

export interface PerspectiveArticle {
  id: string;
  sourceLogo: string;
  headline: string;
  bias: Bias;
  quote: string;
}

export interface ForecastOutcome {
    title: string;
    probability: number;
    explanation: string;
}

export type ForecastCacheSource = 'gemini' | 'heuristic' | 'fallback' | 'cache';

export interface ForecastScenarioModifiers {
  description?: string;
  growthMultiplier: number;
  sentimentShift: number;
  volumeMultiplier: number;
  engagementShift: number;
}

export interface ForecastMetrics {
  historicalRelevance: number;
  growthRate: number;
  sentimentVolatility: number;
  engagementEma: number;
  predictionScore: number;
}

export interface TopicPrediction {
  topic: string;
  predictedCount: number;
  confidence: number;
  drivers: string[];
}

export interface ForecastNode {
    id: string;
    eventName: string;
    shortTerm: ForecastOutcome[];
    mediumTerm: ForecastOutcome[];
    keyDrivers: string[];
  generatedAt?: number;
  cacheSource?: ForecastCacheSource;
  metrics?: ForecastMetrics;
  predictions?: TopicPrediction[];
  scenarioSummary?: string;
  scenarioModifiers?: ForecastScenarioModifiers;
  diagnostics?: {
    warnings?: string[];
    dataWindow?: string;
  };
}

export interface TrendingTopic {
  id: string;
  name: string;
  articleCount: number;
  imageUrl: string;
}

export interface WebGroundingSource {
    uri: string;
    title: string;
}

export interface ChatMessage {
  sender: 'user' | 'bot';
  text: string;
  sources?: WebGroundingSource[];
}

export interface ChatSession {
    id: string;
    title: string;
    messages: ChatMessage[];
}
