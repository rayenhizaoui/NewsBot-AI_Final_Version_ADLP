import React, { Suspense, useEffect, useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { MOCK_TRENDING_TOPICS } from '../constants';
import type { NewsArticle } from '../types';
import { ViewAllIcon, ShowLessIcon } from '../components/icons/MoreIcons';
import { fetchLatestArticles } from '../services/newsService';
import {
  buildSnapshot,
  buildTopicScores,
  buildUnsplashUrl,
  selectTopTopics,
  sortArticlesByRecency,
  mergeWithFallbackTopics,
  type TopicSnapshot,
  type TopicViewModel,
} from '../utils/trendingMetrics';

const NewsCard = React.lazy(() => import('../components/NewsCard'));
const TrendingTopicCard = React.lazy(() => import('../components/TrendingTopicCard'));

const LATEST_LIMIT = 30;
const TOPIC_STORAGE_KEY = 'newsbot_trending_snapshot_v2';
const MAX_VISIBLE_TOPICS_COLLAPSED = 6;

const useLatestArticles = () => {
  const queryClientInstance = useQueryClient();

  useEffect(() => {
    queryClientInstance.prefetchQuery({
      queryKey: ['latestArticles', LATEST_LIMIT * 2],
      queryFn: () => fetchLatestArticles(LATEST_LIMIT * 2),
      staleTime: 1000 * 60 * 10,
    });
  }, [queryClientInstance]);

  return useQuery<NewsArticle[]>({
    queryKey: ['latestArticles', LATEST_LIMIT],
    queryFn: async () => {
      const data = await fetchLatestArticles(LATEST_LIMIT);
      return data.map(article => ({
        ...article,
        summary: article.summary,
      }));
    },
    select: articles => articles.filter(item => Boolean(item.id)),
  });
};

const loadSnapshot = (): Record<string, TopicSnapshot> => {
  if (typeof window === 'undefined') {
    return {};
  }
  try {
    const raw = window.localStorage.getItem(TOPIC_STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Record<string, TopicSnapshot>) : {};
  } catch (error) {
    console.warn('Unable to read trending snapshot', error);
    return {};
  }
};

const persistSnapshot = (snapshot: Record<string, TopicSnapshot>) => {
  if (typeof window === 'undefined') {
    return;
  }
  try {
    window.localStorage.setItem(TOPIC_STORAGE_KEY, JSON.stringify(snapshot));
  } catch (error) {
    console.warn('Unable to persist trending snapshot', error);
  }
};

const buildTopicImageMap = (): Record<string, string> => {
  return Object.fromEntries(MOCK_TRENDING_TOPICS.map(topic => [topic.name, topic.imageUrl]));
};

const mockTopicsAsViewModel = (topicImageMap: Record<string, string>): TopicViewModel[] => {
  const fallbackImage = 'https://picsum.photos/seed/{topic}/720/420';

  return MOCK_TRENDING_TOPICS.slice(0, 9).map((topic, index) => ({
    name: topic.name,
    count: topic.articleCount,
    growthRate: Number((0.8 + (Math.log1p(topic.articleCount) / Math.log1p(250)) * 3.2).toFixed(1)),
    averageEngagement: 10,
    score: Math.max(6, topic.articleCount),
    rank: index + 1,
    imageUrl: topic.imageUrl ?? buildUnsplashUrl(topic.name, fallbackImage),
  }));
};

const LoadingState: React.FC = () => (
  <div className="flex h-full w-full items-center justify-center py-24" role="status" aria-live="polite">
    <div className="h-12 w-12 animate-spin rounded-full border-4 border-slate-700 border-t-emerald-400" />
    <span className="sr-only">Content is loading…</span>
  </div>
);

const ErrorState: React.FC<{ onRetry: () => void }> = ({ onRetry }) => (
  <div className="flex flex-col items-center justify-center gap-4 rounded-xl border border-slate-700 bg-slate-900/80 p-10 text-center">
    <p className="text-sm text-slate-300">We could not refresh the latest trends. Check your connection and try again.</p>
    <button
      onClick={onRetry}
      className="rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-slate-900 transition hover:bg-emerald-400"
    >
      Retry loading
    </button>
  </div>
);

const TrendsView: React.FC = () => {
  const [showAllTopics, setShowAllTopics] = useState(false);
  const [snapshot, setSnapshot] = useState<Record<string, TopicSnapshot>>(() => loadSnapshot());
  const topicImageMap = useMemo(() => buildTopicImageMap(), []);

  const { data: articles = [], isLoading, isError, refetch, isFetching } = useLatestArticles();

  const topicScores = useMemo(() => buildTopicScores(articles, snapshot), [articles, snapshot]);
  const fallbackTopics = useMemo(() => mockTopicsAsViewModel(topicImageMap), [topicImageMap]);
  const curatedTopics = useMemo(() => {
    const selected = selectTopTopics(topicScores, topicImageMap, 'https://picsum.photos/seed/{topic}/720/420');
    const resolved = mergeWithFallbackTopics(selected, fallbackTopics, 9, 5);
    const hasMeaningfulVariety = resolved.some(topic => topic.name.toLowerCase() !== 'global');
    if (!hasMeaningfulVariety) {
      return mergeWithFallbackTopics([], fallbackTopics, 9, 6);
    }
    return resolved;
  }, [topicScores, topicImageMap, fallbackTopics]);

  const trendingArticles = useMemo(() => sortArticlesByRecency(articles, 6), [articles]);

  useEffect(() => {
    if (topicScores.length) {
      const nextSnapshot = buildSnapshot(topicScores);
      setSnapshot(nextSnapshot);
      persistSnapshot(nextSnapshot);
    }
  }, [topicScores]);

  const visibleTopics = showAllTopics ? curatedTopics : curatedTopics.slice(0, MAX_VISIBLE_TOPICS_COLLAPSED);

  if (isLoading && !articles.length) {
    return <LoadingState />;
  }

  if (isError) {
    return <ErrorState onRetry={() => refetch()} />;
  }

  return (
    <div className="flex h-full flex-col gap-12 overflow-y-auto p-8 text-white" aria-busy={isFetching}>
      <header className="space-y-2">
        <h1 className="text-3xl font-bold text-white">Trending Topics</h1>
        <p className="text-sm text-slate-400">
          Live intelligence on the conversations gaining momentum across the global news cycle.
        </p>
      </header>

      <section className="space-y-6" aria-label="Top trending topics" aria-live="polite">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-2xl font-semibold text-white">Top Trending Topics</h2>
          <button
            onClick={() => setShowAllTopics(prev => !prev)}
            className="flex items-center gap-2 rounded-lg bg-slate-800/70 px-4 py-2 text-sm font-semibold text-slate-300 transition hover:bg-slate-700 hover:text-white"
            aria-label={showAllTopics ? 'Show fewer trending topics' : 'Show all trending topics'}
          >
            {showAllTopics ? <ShowLessIcon /> : <ViewAllIcon />}
            <span>{showAllTopics ? 'Show Less' : 'View All Topics'}</span>
          </button>
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
          <Suspense fallback={<LoadingState />}>
            {visibleTopics.map(topic => (
              <TrendingTopicCard key={topic.name} topic={topic} />
            ))}
          </Suspense>
        </div>
      </section>

      <section className="space-y-6" aria-label="Trending articles">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-semibold text-white">Trending Articles</h2>
          <span className="text-xs uppercase tracking-wide text-slate-500">
            Updated {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
        </div>

        <div className="space-y-6" role="list">
          <Suspense fallback={<LoadingState />}>
            {trendingArticles.length ? (
              trendingArticles.map((article, index) => (
                <NewsCard key={article.id} article={article} index={index} />
              ))
            ) : (
              <p className="rounded-lg border border-slate-700 bg-slate-900/70 p-6 text-sm text-slate-400">
                No live trending articles yet. We will refresh automatically when new stories land.
              </p>
            )}
          </Suspense>
        </div>
      </section>
    </div>
  );
};

const Trends: React.FC = () => {
  return (
    <Suspense fallback={<LoadingState />}>
      <TrendsView />
    </Suspense>
  );
};

export default Trends;