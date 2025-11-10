import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import type { NewsArticle } from '../types';
import { ShieldIcon } from './icons/IconDefs';
import { useUser } from '../contexts/UserContext';

interface NewsCardProps {
  article: NewsArticle;
  index?: number;
}

const NewsCard: React.FC<NewsCardProps> = ({ article, index = 0 }) => {
  const { trackLike, removeLike, trackShare, trackBookmark, likedArticles } = useUser();
  const [liked, setLiked] = useState<boolean>(() =>
    likedArticles.some(entry => entry.article.id === article.id)
  );
  const [bookmarked, setBookmarked] = useState(false);

  useEffect(() => {
    const isLiked = likedArticles.some(entry => entry.article.id === article.id);
    setLiked(isLiked);
  }, [likedArticles, article.id]);

  const getSentimentColor = (sentiment: string) => {
    switch (sentiment) {
      case 'Positive': return 'bg-green-500/20 text-green-300';
      case 'Negative': return 'bg-red-500/20 text-red-300';
      default: return 'bg-slate-500/20 text-slate-300';
    }
  };

  const handleLike = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (liked) {
      removeLike(article.id);
      setLiked(false);
    } else {
      trackLike(article);
      setLiked(true);
    }
  };

  const handleShare = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    trackShare(article.id, article.topic, article.source);
    // You can add actual share functionality here
    if (navigator.share) {
      navigator.share({
        title: article.headline,
        text: article.summary,
        url: window.location.href,
      }).catch(() => {});
    }
  };

  const handleBookmark = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setBookmarked(!bookmarked);
    if (!bookmarked) {
      trackBookmark(article.id, article.topic, article.source);
    }
  };

  return (
    <div 
      className="bg-slate-900/50 backdrop-blur-sm border border-slate-800 rounded-lg p-6 hover:border-[#64FFDA]/50 transition-all duration-300 hover:bg-slate-900/70 fade-in"
      style={{ animationDelay: `${index * 100}ms` }}
    >
      <h2 className="text-xl font-bold text-white mb-2">{article.headline}</h2>
      
      <div className="flex items-center text-sm text-slate-400 mb-4 space-x-4">
        <span>{article.source}</span>
        <div className="flex items-center space-x-1">
          <ShieldIcon />
          <span className="font-semibold text-[#64FFDA]">{article.trustScore}</span>
        </div>
        <span className="text-xs">{article.author}</span>
        <span className="text-xs">{article.date}</span>
      </div>
      
      <div className="text-slate-300 mb-4">
        <span className="font-semibold text-white block mb-2">AI Summary:</span>
        {article.summaryBullets && article.summaryBullets.length > 0 ? (
          <ul className="list-disc list-inside space-y-1 text-sm text-slate-300">
            {article.summaryBullets.slice(0, 3).map((bullet, idx) => (
              <li key={idx}>{bullet}</li>
            ))}
          </ul>
        ) : (
          <p>{article.summary}</p>
        )}
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getSentimentColor(article.sentiment)}`}>
            {article.sentiment}
          </span>
          <span className="px-2 py-1 text-xs font-semibold rounded-full bg-blue-500/20 text-blue-300">
            {article.topic}
          </span>
        </div>
        
        <div className="flex items-center gap-3">
          {/* Interaction Buttons */}
          <button
            onClick={handleLike}
            className={`transition-all duration-200 ${
              liked 
                ? 'text-red-400 scale-110' 
                : 'text-slate-400 hover:text-red-400 hover:scale-110'
            }`}
            title="Like"
          >
            {liked ? '❤️' : '🤍'}
          </button>

          <button
            onClick={handleBookmark}
            className={`transition-all duration-200 ${
              bookmarked 
                ? 'text-yellow-400 scale-110' 
                : 'text-slate-400 hover:text-yellow-400 hover:scale-110'
            }`}
            title="Bookmark"
          >
            {bookmarked ? '🔖' : '📑'}
          </button>

          <button
            onClick={handleShare}
            className="text-slate-400 hover:text-blue-400 hover:scale-110 transition-all duration-200"
            title="Share"
          >
            📤
          </button>
          
          <Link 
            to={`/article/${article.id}`} 
            className="bg-[#64FFDA]/10 text-[#64FFDA] font-semibold px-4 py-2 rounded-md hover:bg-[#64FFDA]/20 transition-colors duration-200 text-sm">
            Deep Dive & Perspectives
          </Link>
        </div>
      </div>
    </div>
  );
};

export default NewsCard;
