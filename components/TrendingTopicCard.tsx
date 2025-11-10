import React from 'react';
import { motion } from 'framer-motion';
import type { TopicViewModel } from '../utils/trendingMetrics';

export interface TrendingTopicCardProps {
  topic: TopicViewModel;
}

const TrendingTopicCard: React.FC<TrendingTopicCardProps> = ({ topic }) => {
  const growthLabel = topic.growthRate >= 0 ? 'up' : 'down';
  const normalizedScore = Math.min(100, Math.max(0, Math.round(topic.score * 4)));

  return (
    <motion.article
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12 }}
      transition={{ duration: 0.25 }}
      className="group relative overflow-hidden rounded-xl bg-slate-900/70 ring-1 ring-slate-700/60 backdrop-blur shadow-lg"
      aria-label={`Trending topic ${topic.name}`}
    >
      <div className="absolute left-4 top-4 z-20 rounded-full bg-emerald-500/90 px-3 py-1 text-xs font-semibold text-emerald-50">
        Top {topic.rank}
      </div>
      <div className="h-44 w-full overflow-hidden">
        <img
          src={topic.imageUrl}
          alt={topic.name}
          loading="lazy"
          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
        />
      </div>
      <div className="relative z-10 space-y-3 p-4">
        <header className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-lg font-semibold text-white" aria-live="polite">
              {topic.name}
            </h3>
            <p className="text-xs uppercase tracking-wide text-slate-400">{topic.count} articles</p>
          </div>
          <span
            className={`flex items-center rounded-full px-2 py-1 text-xs font-semibold ${
              growthLabel === 'up' ? 'bg-emerald-600/80 text-emerald-50' : 'bg-rose-600/80 text-rose-50'
            }`}
          >
            {growthLabel === 'up' ? '▲' : '▼'} {Math.abs(topic.growthRate).toFixed(1)}x
          </span>
        </header>
        <div className="space-y-2" aria-label="Trending score">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Score</span>
            <span>{topic.score.toFixed(1)}</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-slate-700" role="presentation">
            <div
              className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-cyan-400"
              style={{ width: `${normalizedScore}%` }}
            ></div>
          </div>
        </div>
      </div>
    </motion.article>
  );
};

export default React.memo(TrendingTopicCard);
