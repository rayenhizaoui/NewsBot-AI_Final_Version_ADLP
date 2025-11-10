import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import NewsCard from '../components/NewsCard';
import PersonalizationInsights from '../components/PersonalizationInsights';
import type { NewsArticle } from '../types';
import type { ArticleFeatures } from '../types/personalization';
import { MOCK_NEWS_ARTICLES } from '../constants';
import { TopicIcon } from '../components/icons/MoreIcons';
import { useUser } from '../contexts/UserContext';
import { personalizationEngine } from '../services/personalizationEngine';
import {
  fetchLatestArticles,
  fetchTopicArticles,
  loadPersistedLiveArticles,
  persistLiveArticles,
} from '../services/newsService';

interface EnhancedArticle extends NewsArticle {
  recommendationScore?: number;
  recommendationReasons?: string[];
  confidence?: number;
}

const DEFAULT_TOPICS = ['Technology', 'Economics', 'Geopolitics'];

const mergeArticles = (incoming: NewsArticle[], existing: NewsArticle[]): NewsArticle[] => {
  if (!incoming.length) {
    return existing;
  }

  const seen = new Set<string>();
  const combined = [...incoming, ...existing];
  return combined.filter(article => {
    if (seen.has(article.id)) {
      return false;
    }
    seen.add(article.id);
    return true;
  });
};

const computeRecencyScore = (dateStr: string): number => {
  if (!dateStr) {
    return 0.6;
  }

  const candidates = [dateStr, dateStr.split('•')[0]?.trim()].filter(Boolean) as string[];
  for (const candidate of candidates) {
    const parsed = Date.parse(candidate);
    if (!Number.isNaN(parsed)) {
      const ageInHours = (Date.now() - parsed) / (1000 * 60 * 60);
      const decayWindowHours = 24 * 14;
      const score = 1 - ageInHours / decayWindowHours;
      return Math.max(0, Math.min(1, score));
    }
  }
  return 0.75;
};

const groupArticlesByTopic = (articles: NewsArticle[]): Record<string, NewsArticle[]> => {
  return articles.reduce<Record<string, NewsArticle[]>>((acc, article) => {
    acc[article.topic] = acc[article.topic] || [];
    acc[article.topic].push(article);
    return acc;
  }, {});
};

const formatLastUpdated = (isoTimestamp: string): string => {
  try {
    return new Date(isoTimestamp).toLocaleTimeString(undefined, {
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch (error) {
    console.warn('Unable to format timestamp', error);
    return '';
  }
};

const diversifyBySource = (articles: EnhancedArticle[], perSourceLimit = 2): EnhancedArticle[] => {
  if (articles.length <= 1) {
    return articles;
  }

  const counts = new Map<string, number>();
  const primary: EnhancedArticle[] = [];
  const overflow: EnhancedArticle[] = [];

  articles.forEach(article => {
    const current = counts.get(article.source) ?? 0;
    if (current < perSourceLimit) {
      counts.set(article.source, current + 1);
      primary.push(article);
    } else {
      overflow.push(article);
    }
  });

  overflow.forEach(article => {
    const current = counts.get(article.source) ?? 0;
    counts.set(article.source, current + 1);
    primary.push(article);
  });

  return primary;
};

const getGreeting = () => {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
};

const Dashboard: React.FC = () => {
  const [baseArticles, setBaseArticles] = useState<NewsArticle[]>(() => {
    if (typeof window === 'undefined') {
      return MOCK_NEWS_ARTICLES;
    }
    const persisted = loadPersistedLiveArticles();
    if (persisted.length) {
      return mergeArticles(persisted, MOCK_NEWS_ARTICLES);
    }
    return MOCK_NEWS_ARTICLES;
  });

  const [articles, setArticles] = useState<EnhancedArticle[]>([]);
  const [topics, setTopics] = useState<string[]>(() => [
    ...new Set(MOCK_NEWS_ARTICLES.map(article => article.topic)),
  ]);
  const [activeTopic, setActiveTopic] = useState<string | null>(null);
  const [showInsights, setShowInsights] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [liveArticlesByTopic, setLiveArticlesByTopic] = useState<Record<string, NewsArticle[]>>(() => {
    if (typeof window === 'undefined') {
      return {};
    }
    const persisted = loadPersistedLiveArticles();
    if (!persisted.length) {
      return {};
    }
    return groupArticlesByTopic(persisted);
  });

  const liveArticlesByTopicRef = useRef(liveArticlesByTopic);

  const {
    profile,
    insights,
    manualTopics,
    getRecommendations,
    trackArticleView,
    isLoading,
  } = useUser();

  useEffect(() => {
    liveArticlesByTopicRef.current = liveArticlesByTopic;
    if (typeof window !== 'undefined') {
      const flattened = Object.values(liveArticlesByTopic).flat();
      if (flattened.length) {
        persistLiveArticles(flattened);
      }
    }
  }, [liveArticlesByTopic]);

  useEffect(() => {
    const topicSet = new Set<string>(baseArticles.map(article => article.topic));
    manualTopics.forEach(topic => topicSet.add(topic));
    setTopics(Array.from(topicSet));
  }, [baseArticles, manualTopics]);

  const refreshRecommendations = useCallback(
    (candidateArticles: NewsArticle[]) => {
      if (!candidateArticles.length) {
        setArticles([]);
        return;
      }

      const articleFeatures: ArticleFeatures[] = candidateArticles.map(article => ({
        id: article.id,
        topic: article.topic,
        source: article.source,
        sentiment: article.sentiment,
        trustScore: article.trustScore,
        popularity: Math.random() * 0.5 + 0.5,
        recency: computeRecencyScore(article.date),
        wordCount: (article.fullText || article.summary || '').split(/\s+/).filter(Boolean).length || 120,
        author: article.author,
      }));

      personalizationEngine.registerArticles(articleFeatures);

      const articleIds = candidateArticles.map(article => article.id);
      const recommendations = getRecommendations(articleIds, candidateArticles.length);

      const enhancedArticles: EnhancedArticle[] = candidateArticles.map(article => {
        const rec = recommendations.find(r => r.articleId === article.id);
        return {
          ...article,
          recommendationScore: rec?.score || 0,
          recommendationReasons: rec?.reasons || [],
          confidence: rec?.confidence || 0,
        };
      });

      const sortedByScore = enhancedArticles.sort(
        (a, b) => (b.recommendationScore || 0) - (a.recommendationScore || 0),
      );

      setArticles(diversifyBySource(sortedByScore, 2));
    },
    [getRecommendations],
  );

  useEffect(() => {
    refreshRecommendations(baseArticles);
  }, [baseArticles, refreshRecommendations]);

  const filteredArticles = useMemo(() => {
    if (activeTopic) {
      return articles.filter(article => article.topic === activeTopic);
    }
    return articles;
  }, [articles, activeTopic]);

  const computeRefreshTopics = useCallback(() => {
    const manualList = manualTopics.filter(Boolean);
    const insightList = insights?.topTopics?.map(t => t.topic) ?? [];
    const baseList = [...manualList, ...insightList, ...DEFAULT_TOPICS];
    const combined = activeTopic ? [activeTopic, ...baseList] : baseList;
    return Array.from(new Set(combined.filter(Boolean)));
  }, [activeTopic, insights, manualTopics]);

  const fetchArticlesForTopics = useCallback(
    async (
      topicsToFetch: string[],
      options: { force?: boolean; background?: boolean } = {},
    ) => {
      const { force = false, background = false } = options;
      const uniqueTopics = Array.from(new Set(topicsToFetch.filter(Boolean)));
      if (!uniqueTopics.length) {
        return;
      }

      const topicsNeedingFetch = uniqueTopics.filter(topic => {
        if (force) {
          return true;
        }
        const cached = liveArticlesByTopicRef.current[topic];
        return !cached || cached.length === 0;
      });

      if (!topicsNeedingFetch.length) {
        return;
      }

      if (!background) {
        setIsRefreshing(true);
      }

      try {
        const results = await Promise.all(topicsNeedingFetch.map(topic => fetchTopicArticles(topic)));
        const latestByTopic = topicsNeedingFetch.reduce<Record<string, NewsArticle[]>>((acc, topic, index) => {
          acc[topic] = results[index];
          return acc;
        }, {});

        setLiveArticlesByTopic(prev => ({
          ...prev,
          ...latestByTopic,
        }));

        setBaseArticles(prev => {
          const incomingArticles = Object.values(latestByTopic).flat();
          if (!incomingArticles.length) {
            return prev;
          }
          return mergeArticles(incomingArticles, prev);
        });

        const flattened = Object.values(latestByTopic).flat();
        if (flattened.length) {
          persistLiveArticles(flattened);
        }

        setLastUpdated(new Date().toISOString());
        setFetchError(null);
      } catch (error) {
        console.error('Failed to load live articles', error);
        const hasCache = topicsNeedingFetch.some(topic => {
          const cached = liveArticlesByTopicRef.current[topic];
          return cached && cached.length > 0;
        });
        setFetchError(
          hasCache
            ? 'Actualisation impossible pour le moment. Les dernieres recommandations en cache restent affichees.'
            : 'Impossible de recuperer les dernieres actualites. Reessayez dans un instant.',
        );
      } finally {
        if (!background) {
          setIsRefreshing(false);
        }
      }
    },
    [],
  );

  useEffect(() => {
    fetchArticlesForTopics(computeRefreshTopics());
  }, [computeRefreshTopics, fetchArticlesForTopics]);

  useEffect(() => {
    const loadLatestHeadlines = async () => {
      try {
        const latest = await fetchLatestArticles(24);
        if (!latest.length) {
          return;
        }
        setBaseArticles(prev => mergeArticles(latest, prev));
        setLiveArticlesByTopic(prev => ({
          ...prev,
          Latest: latest,
        }));
      } catch (error) {
        console.warn('Unable to load latest headlines', error);
      }
    };

    loadLatestHeadlines();
  }, []);

  useEffect(() => {
    const topicsToRefresh = computeRefreshTopics();
    if (topicsToRefresh.length === 0 || typeof window === 'undefined') {
      return;
    }

    const intervalId = window.setInterval(() => {
      fetchArticlesForTopics(topicsToRefresh, { force: true, background: true });
    }, 1000 * 60 * 5);

    return () => window.clearInterval(intervalId);
  }, [computeRefreshTopics, fetchArticlesForTopics]);

  const handleTopicSelect = useCallback(
    (topic: string) => {
      const isAlreadyActive = activeTopic === topic;
      const nextTopic = isAlreadyActive ? null : topic;
      setActiveTopic(nextTopic);

      if (!isAlreadyActive && !liveArticlesByTopicRef.current[topic]) {
        fetchArticlesForTopics([topic]);
      }
    },
    [activeTopic, fetchArticlesForTopics],
  );

  const handleArticleClick = useCallback(
    (article: EnhancedArticle) => {
      trackArticleView(article.id, article.topic, article.source);
    },
    [trackArticleView],
  );

  const handleFullRefresh = useCallback(() => {
    fetchArticlesForTopics(computeRefreshTopics(), { force: true });
  }, [fetchArticlesForTopics, computeRefreshTopics]);

  const engagementPercent = Math.round((profile?.behavior.engagementRate ?? 0) * 100);
  const totalReads = profile?.behavior.totalArticlesRead ?? 0;
  const avgReadMinutes = insights ? Math.max(0, Math.round(insights.averageReadTime / 60)) : 0;
  const topTopic = insights?.topTopics?.[0];
  const secondaryTopics = insights?.topTopics?.slice(1, 3) ?? [];
  const topSource = insights?.topSources?.[0];
  const liveTopicCount = Object.keys(liveArticlesByTopic).length;
  const pinnedCount = manualTopics.length;
  const recommendedCount = filteredArticles.length;
  const displayName = profile?.profileInfo.fullName || 'Rayen';
  const firstName = useMemo(() => displayName.split(' ')[0] || displayName, [displayName]);

  return (
    <div className="min-h-screen w-full overflow-y-auto bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-6 md:p-10">
      <div className="mx-auto flex w-full max-w-[1400px] flex-col gap-10">
        <section className="relative overflow-hidden rounded-3xl border border-slate-800/60 bg-slate-900/70 p-8 shadow-[0_25px_60px_-35px_rgba(45,212,191,0.45)]">
          <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/10 via-transparent to-purple-500/20" aria-hidden="true"></div>
          <div className="absolute -top-24 -right-24 h-64 w-64 rounded-full bg-cyan-500/15 blur-3xl" aria-hidden="true"></div>
          <div className="relative z-10 flex flex-col gap-8 lg:flex-row lg:items-center">
            <div className="flex-1">
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-cyan-300/80">
                {getGreeting()}, {firstName}
              </p>
              <h1 className="mt-3 text-3xl font-bold text-white md:text-4xl">
                {topTopic ? `Focus on ${topTopic.topic}` : 'Your intelligence briefing'}
              </h1>
              <p className="mt-4 max-w-xl text-sm text-slate-300 md:text-base">
                {topTopic
                  ? `You have shown ${Math.round(topTopic.weight * 100)}% affinity for ${topTopic.topic}. We will prioritise breaking coverage and expert analysis tailored to your interests.`
                  : 'Stay ahead with curated reporting, sentiment analysis, and AI summaries tuned to your reading patterns.'}
              </p>
              {secondaryTopics.length > 0 && (
                <div className="mt-5 flex flex-wrap gap-2">
                  {secondaryTopics.map(({ topic }) => (
                    <span key={topic} className="rounded-full border border-slate-700/60 bg-slate-800/60 px-3 py-1 text-xs font-semibold text-slate-200">
                      Next to watch: {topic}
                    </span>
                  ))}
                </div>
              )}
              <div className="mt-6 flex flex-wrap gap-3">
                <a
                  href="#/profile"
                  className="inline-flex items-center gap-2 rounded-full border border-cyan-400/60 bg-cyan-500/10 px-5 py-2 text-sm font-semibold text-cyan-300 transition-transform hover:scale-105 hover:border-cyan-300/80 hover:text-cyan-200"
                >
                  Manage profile
                </a>
                <a
                  href="#/trends"
                  className="inline-flex items-center gap-2 rounded-full border border-slate-700/70 bg-slate-800/60 px-5 py-2 text-sm font-semibold text-slate-200 transition-transform hover:scale-105 hover:text-white"
                >
                  View market trends
                </a>
                <button
                  onClick={handleFullRefresh}
                  disabled={isRefreshing}
                  className={`inline-flex items-center gap-2 rounded-full px-5 py-2 text-sm font-semibold transition-transform ${
                    isRefreshing
                      ? 'cursor-not-allowed border border-slate-700 bg-slate-800/60 text-slate-400'
                      : 'border border-emerald-500/50 bg-emerald-500/10 text-emerald-200 hover:scale-105 hover:text-emerald-100'
                  }`}
                >
                  {isRefreshing ? 'Refreshing...' : 'Refresh feed'}
                </button>
              </div>
            </div>
            <div className="grid w-full min-w-[220px] grid-cols-2 gap-4 sm:w-auto">
              <div className="rounded-2xl border border-slate-700/50 bg-slate-900/70 p-4">
                <p className="text-xs uppercase tracking-wide text-slate-400">Articles read</p>
                <p className="mt-2 text-2xl font-semibold text-white">{totalReads}</p>
                <p className="mt-1 text-xs text-slate-500">All time</p>
              </div>
              <div className="rounded-2xl border border-slate-700/50 bg-slate-900/70 p-4">
                <p className="text-xs uppercase tracking-wide text-slate-400">Avg. session</p>
                <p className="mt-2 text-2xl font-semibold text-white">{avgReadMinutes > 0 ? `${avgReadMinutes}m` : '--'}</p>
                <p className="mt-1 text-xs text-slate-500">Per article</p>
              </div>
              <div className="rounded-2xl border border-slate-700/50 bg-slate-900/70 p-4">
                <p className="text-xs uppercase tracking-wide text-slate-400">Engagement</p>
                <p className="mt-2 text-2xl font-semibold text-white">{engagementPercent}%</p>
                <p className="mt-1 text-xs text-slate-500">Current streak</p>
              </div>
              <div className="rounded-2xl border border-slate-700/50 bg-slate-900/70 p-4">
                <p className="text-xs uppercase tracking-wide text-slate-400">Pinned topics</p>
                <p className="mt-2 text-2xl font-semibold text-white">{pinnedCount}</p>
                <p className="mt-1 text-xs text-slate-500">Custom focus areas</p>
              </div>
            </div>
          </div>
        </section>

        <div className="grid grid-cols-1 gap-8 xl:grid-cols-[minmax(0,2fr)_minmax(320px,1fr)]">
          <section className="space-y-8">
            <div className="rounded-3xl border border-slate-800/60 bg-slate-900/60 p-6 shadow-lg shadow-slate-950/40">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold text-white">Explore topics</h2>
                  <p className="text-xs text-slate-400">Curated across {topics.length} themes</p>
                </div>
                {activeTopic && (
                  <span className="rounded-full border border-cyan-400/40 bg-cyan-500/10 px-3 py-1 text-xs font-semibold text-cyan-200">
                    Focused on {activeTopic}
                  </span>
                )}
              </div>
              <div className="flex flex-wrap gap-3">
                {topics.map(topic => {
                  const topicMeta = insights?.topTopics.find(t => t.topic === topic);
                  const isManualSelection = manualTopics.includes(topic) || Boolean(topicMeta?.manual);
                  const isPreferred = Boolean(topicMeta && !topicMeta.manual);
                  const isActive = activeTopic === topic;
                  return (
                    <button
                      key={topic}
                      onClick={() => handleTopicSelect(topic)}
                      className={`flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold transition-all ${
                        isActive
                          ? 'border-cyan-400 bg-cyan-500/20 text-white shadow-lg shadow-cyan-500/30'
                          : isManualSelection
                          ? 'border-emerald-400/70 bg-emerald-500/20 text-white'
                          : isPreferred
                          ? 'border-blue-400/60 bg-blue-500/20 text-white'
                          : 'border-slate-700 bg-slate-800/60 text-slate-200 hover:border-slate-500 hover:text-white'
                      }`}
                    >
                      <TopicIcon />
                      {topic}
                      {isManualSelection && <span className="ml-1">Pinned</span>}
                      {!isManualSelection && isPreferred && <span className="ml-1">Priority</span>}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="rounded-3xl border border-slate-800/60 bg-slate-900/60 p-6 shadow-lg shadow-slate-950/40">
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                  <h2 className="text-xl font-semibold text-white">Recommended for you</h2>
                  <p className="text-xs text-slate-400">
                    {activeTopic
                      ? `Deep dive into ${activeTopic}. Select the topic again to reset.`
                      : `Showing ${recommendedCount} articles ranked by your interest graph.`}
                  </p>
                  {topSource && (
                    <p className="mt-1 text-xs text-slate-500">
                      Top trusted source today: <span className="text-slate-300">{topSource.source}</span>
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <button
                    onClick={handleFullRefresh}
                    disabled={isRefreshing}
                    className={`rounded-lg px-4 py-2 text-sm font-semibold transition-colors ${
                      isRefreshing
                        ? 'cursor-not-allowed border border-slate-700 bg-slate-800/70 text-slate-400'
                        : 'border border-slate-700 bg-slate-800/70 text-slate-200 hover:border-cyan-400/60 hover:text-white'
                    }`}
                  >
                    {isRefreshing ? 'Refreshing...' : 'Refresh'}
                  </button>
                  {lastUpdated && (
                    <span className="text-xs text-slate-500">Updated {formatLastUpdated(lastUpdated)}</span>
                  )}
                </div>
              </div>

              {fetchError && (
                <div className="mt-4 rounded-2xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                  {fetchError}
                </div>
              )}

              <div className="mt-6 space-y-6">
                {recommendedCount > 0 ? (
                  filteredArticles.map((article, index) => {
                    const showBadge = article.recommendationScore && article.recommendationScore > 0.6;
                    return (
                      <div
                        key={article.id}
                        className="relative rounded-2xl border border-slate-800/70 bg-slate-900/70 p-5 transition-colors hover:border-cyan-400/40"
                      >
                        {showBadge && index < 3 && (
                          <div className="absolute -top-3 left-6 z-10">
                            <div className="rounded-full bg-gradient-to-r from-yellow-500 to-orange-500 px-3 py-1 text-xs font-bold text-white shadow-lg">
                              {index === 0 ? 'Top pick' : 'High match'}
                            </div>
                          </div>
                        )}

                        <div onClick={() => handleArticleClick(article)}>
                          <NewsCard article={article} index={index} />
                        </div>

                        {article.recommendationReasons && article.recommendationReasons.length > 0 && (
                          <div className="mt-4">
                            <div className="flex flex-wrap gap-2">
                              {article.recommendationReasons.slice(0, 3).map((reason, idx) => (
                                <span key={idx} className="rounded-full bg-slate-800/70 px-3 py-1 text-xs text-slate-300">
                                  Reason: {reason}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })
                ) : (
                  <div className="rounded-2xl border border-slate-800/70 bg-slate-900/70 px-6 py-10 text-center">
                    <p className="text-sm text-slate-300">We are gathering fresh recommendations for you.</p>
                    <p className="mt-2 text-xs text-slate-500">Revisit shortly or refine your topics.</p>
                  </div>
                )}
              </div>

              {process.env.NODE_ENV === 'development' && insights && (
                <div className="mt-6 rounded-2xl border border-slate-800/60 bg-slate-900/60 p-4">
                  <details className="text-xs text-slate-400">
                    <summary className="cursor-pointer hover:text-slate-200">Debug: personalization data</summary>
                    <pre className="mt-2 overflow-auto">
                      {JSON.stringify(
                        {
                          totalArticles: filteredArticles.length,
                          topScores: filteredArticles.slice(0, 3).map(a => ({
                            id: a.id,
                            score: a.recommendationScore,
                            reasons: a.recommendationReasons,
                          })),
                          insights,
                        },
                        null,
                        2,
                      )}
                    </pre>
                  </details>
                </div>
              )}
            </div>
          </section>

          <aside className="space-y-6">
            {showInsights ? (
              <div>
                <PersonalizationInsights insights={insights} isLoading={isLoading} className="shadow-lg shadow-slate-950/40" />
                <button
                  onClick={() => setShowInsights(false)}
                  className="mt-3 text-xs font-semibold text-slate-400 transition-colors hover:text-white"
                >
                  Hide insights
                </button>
              </div>
            ) : (
              <button
                onClick={() => setShowInsights(true)}
                className="w-full rounded-2xl border border-slate-800/70 bg-slate-900/60 px-4 py-3 text-sm font-semibold text-slate-300 transition-colors hover:border-cyan-400/60 hover:text-white"
              >
                Show reading insights
              </button>
            )}

            <div className="rounded-3xl border border-slate-800/60 bg-slate-900/60 p-6">
              <h3 className="text-sm font-semibold text-white">Quick actions</h3>
              <ul className="mt-4 space-y-3 text-sm text-slate-300">
                <li>
                  <a href="#/profile" className="inline-flex items-center gap-2 transition-colors hover:text-white">
                    <span className="text-xs font-semibold">Profile</span>
                    <span>Update preferences and topics</span>
                  </a>
                </li>
                <li>
                  <a href="#/trends" className="inline-flex items-center gap-2 transition-colors hover:text-white">
                    <span className="text-xs font-semibold">Trends</span>
                    <span>Review macro signals</span>
                  </a>
                </li>
                <li>
                  <a href="#/forecast/insights" className="inline-flex items-center gap-2 transition-colors hover:text-white">
                    <span className="text-xs font-semibold">Forecasts</span>
                    <span>Open scenario workspace</span>
                  </a>
                </li>
              </ul>
            </div>

            <div className="rounded-3xl border border-slate-800/60 bg-slate-900/60 p-6">
              <h3 className="text-sm font-semibold text-white">Live feed snapshot</h3>
              <div className="mt-4 space-y-3 text-sm text-slate-300">
                <div className="flex items-center justify-between">
                  <span>Active live topics</span>
                  <span className="font-semibold text-cyan-300">{liveTopicCount}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Stories in queue</span>
                  <span className="font-semibold text-slate-200">{recommendedCount}</span>
                </div>
                <div className="flex flex-col gap-1">
                  <span>Signals</span>
                  <div className="flex flex-wrap gap-2">
                    {manualTopics.slice(0, 4).map(topic => (
                      <span key={topic} className="rounded-full border border-emerald-400/50 bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-200">
                        {topic}
                      </span>
                    ))}
                    {manualTopics.length === 0 && (
                      <span className="text-xs text-slate-500">Pin topics to refine your feed.</span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;

