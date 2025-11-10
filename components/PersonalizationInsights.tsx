/**
 * PersonalizationInsights Component
 * Displays user's personalization insights and reading patterns
 */

import React from 'react';
import type { PersonalizationInsights } from '../types/personalization';

interface PersonalizationInsightsProps {
  insights: PersonalizationInsights | null;
  isLoading?: boolean;
  className?: string;
}

const PersonalizationInsights: React.FC<PersonalizationInsightsProps> = ({
  insights,
  isLoading = false,
  className = '',
}) => {
  if (isLoading) {
    return (
      <div className={`bg-slate-800/50 rounded-xl p-6 backdrop-blur-sm ${className}`}>
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-slate-700 rounded w-1/3"></div>
          <div className="h-8 bg-slate-700 rounded"></div>
          <div className="h-8 bg-slate-700 rounded"></div>
        </div>
      </div>
    );
  }

  if (!insights) {
    return null;
  }

  const getEngagementColor = (level: string) => {
    switch (level) {
      case 'high':
        return 'text-green-400 bg-green-400/10';
      case 'medium':
        return 'text-yellow-400 bg-yellow-400/10';
      case 'low':
        return 'text-red-400 bg-red-400/10';
      default:
        return 'text-gray-400 bg-gray-400/10';
    }
  };

  const getDiversityColor = (score: number) => {
    if (score >= 0.7) return 'text-purple-400';
    if (score >= 0.4) return 'text-blue-400';
    return 'text-gray-400';
  };

  return (
    <div className={`bg-gradient-to-br from-slate-800/70 to-slate-900/70 rounded-xl p-6 backdrop-blur-sm border border-slate-700/50 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-white flex items-center gap-2">
          <span className="text-2xl">📊</span>
          Your Reading Profile
        </h3>
        <span className="text-xs text-slate-400">
          {insights.readingPattern}
        </span>
      </div>

      {/* Engagement & Diversity */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-slate-800/50 rounded-lg p-4">
          <div className="text-xs text-slate-400 mb-1">Engagement</div>
          <div className={`inline-flex items-center px-2.5 py-1 rounded-full text-sm font-semibold ${getEngagementColor(insights.engagementLevel)}`}>
            {insights.engagementLevel.toUpperCase()}
          </div>
        </div>
        <div className="bg-slate-800/50 rounded-lg p-4">
          <div className="text-xs text-slate-400 mb-1">Diversity Score</div>
          <div className={`text-2xl font-bold ${getDiversityColor(insights.diversityScore)}`}>
            {Math.round(insights.diversityScore * 100)}%
          </div>
        </div>
      </div>

      {/* Top Topics */}
      {insights.topTopics.length > 0 && (
        <div className="mb-6">
          <h4 className="text-sm font-medium text-slate-300 mb-3 flex items-center gap-2">
            <span>🎯</span>
            Favorite Topics
          </h4>
          <div className="flex flex-wrap gap-2">
            {insights.topTopics.map(({ topic, weight, manual }) => {
              const isManual = Boolean(manual);
              return (
                <div
                  key={topic}
                  className="inline-flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r from-blue-500/20 to-purple-500/20 rounded-full border border-blue-400/30"
                >
                  <span className="text-sm text-white font-medium">{topic}</span>
                  <div className="flex items-center gap-1">
                    {isManual && (
                      <span className="text-[10px] uppercase tracking-wide font-semibold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300">
                        Pinned
                      </span>
                    )}
                    <span className="text-xs text-blue-300 font-semibold">
                      {Math.round(weight * 100)}%
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Top Sources */}
      {insights.topSources.length > 0 && (
        <div className="mb-6">
          <h4 className="text-sm font-medium text-slate-300 mb-3 flex items-center gap-2">
            <span>📰</span>
            Trusted Sources
          </h4>
          <div className="space-y-2">
            {insights.topSources.slice(0, 3).map(({ source, weight }) => (
              <div key={source} className="flex items-center justify-between">
                <span className="text-sm text-slate-300">{source}</span>
                <div className="flex items-center gap-2">
                  <div className="w-24 h-2 bg-slate-700 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-green-500 to-emerald-500 rounded-full transition-all"
                      style={{ width: `${weight * 100}%` }}
                    ></div>
                  </div>
                  <span className="text-xs text-slate-400 w-10 text-right">
                    {Math.round(weight * 100)}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Reading Stats */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-slate-800/50 rounded-lg p-3">
          <div className="text-xs text-slate-400 mb-1">Avg. Read Time</div>
          <div className="text-xl font-bold text-white">
            {Math.floor(insights.averageReadTime / 60)}m {insights.averageReadTime % 60}s
          </div>
        </div>
        <div className="bg-slate-800/50 rounded-lg p-3">
          <div className="text-xs text-slate-400 mb-1">Peak Hours</div>
          <div className="flex gap-1">
            {insights.mostActiveHours.slice(0, 3).map(({ hour }) => (
              <span key={hour} className="text-sm text-white font-medium">
                {hour}:00
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PersonalizationInsights;
