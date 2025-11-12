import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { MOCK_NEWS_ARTICLES, MOCK_PERSPECTIVES } from '../constants';
import {
    loadPersistedLiveArticles,
    estimateSentimentBreakdown,
    getSourceBias,
    type SentimentBreakdown,
} from '../services/newsService';
import type { NewsArticle, PerspectiveArticle, Bias } from '../types';
import { useUser } from '../contexts/UserContext';
import { BackArrowIcon, QuoteIcon, ShieldIcon } from '../components/icons/IconDefs';
import { SummaryIcon, SentimentIcon, EntityIcon, PerspectiveIcon, PollIcon } from '../components/icons/MoreIcons';

const BiasMeter: React.FC<{ bias: Bias }> = ({ bias }) => {
    const positions: Record<Bias, string> = {
        'Left': '10%',
        'Center-Left': '30%',
        'Center': '50%',
        'Center-Right': '70%',
        'Right': '90%'
    };
    return (
        <div className="w-full bg-slate-700 rounded-full h-2.5 my-2 relative">
            <div className="bg-gradient-to-r from-blue-500 via-purple-500 to-red-500 h-2.5 rounded-full"></div>
            <div 
                className="absolute top-[-4px] w-4 h-4 bg-white rounded-full border-2 border-[#64FFDA]" 
                style={{ left: `calc(${positions[bias]} - 8px)` }}
                title={`Bias: ${bias}`}
            ></div>
        </div>
    );
};

const biasAccentMap: Record<Bias, string> = {
    Left: 'bg-blue-500/20 text-blue-200 border border-blue-400/40',
    'Center-Left': 'bg-sky-500/20 text-sky-200 border border-sky-400/40',
    Center: 'bg-slate-500/20 text-slate-200 border border-slate-400/40',
    'Center-Right': 'bg-amber-500/20 text-amber-200 border border-amber-400/40',
    Right: 'bg-red-500/20 text-red-200 border border-red-400/40',
};

const biasNarrativeMap: Record<Bias, string> = {
    Left: 'often highlighting progressive framing and social impact implications.',
    'Center-Left': 'leaning subtly progressive while prioritizing fact-based reporting.',
    Center: 'aiming for balance with minimal ideological framing.',
    'Center-Right': 'leaning pro-market with moderate conservative framing.',
    Right: 'emphasizing conservative priorities and regulatory skepticism.',
};

const perspectiveQuoteFor = (article: NewsArticle): string => {
    const fromBullets = article.summaryBullets?.find(bullet => Boolean(bullet?.trim()));
    if (fromBullets) {
        const trimmed = fromBullets.trim();
        return trimmed.length > 160 ? `${trimmed.slice(0, 157)}...` : trimmed;
    }

    const summary = article.summary ?? '';
    const firstSentence = summary.split(/(?<=[.!?])\s+/).find(chunk => chunk.trim().length > 0);
    const fallback = firstSentence?.trim() || summary.trim() || article.headline;
    if (!fallback) {
        return 'No quick synopsis available yet.';
    }
    return fallback.length > 160 ? `${fallback.slice(0, 157)}...` : fallback;
};

const AlternativePerspectives: React.FC<{ perspectives: PerspectiveArticle[] }> = ({ perspectives }) => {
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const biasPositions: Record<Bias, string> = {
        'Left': '10%',
        'Center-Left': '30%',
        'Center': '50%',
        'Center-Right': '70%',
        'Right': '90%'
    };

    useEffect(() => {
        setSelectedId(perspectives[0]?.id ?? null);
    }, [perspectives]);

    const selectedPerspective = perspectives.find(p => p.id === selectedId);

    return (
        <div className="bg-slate-900/80 backdrop-blur-sm border border-slate-800 rounded-xl shadow-2xl overflow-hidden">
            <div className="bg-gradient-to-r from-purple-500/10 to-blue-500/10 p-6 border-b border-slate-800">
              <h3 className="flex items-center space-x-2 text-2xl font-bold text-white">
                  <PerspectiveIcon />
                  <span>Perspectives Spectrum</span>
              </h3>
              <p className="text-sm text-slate-400 mt-2">
                Explore how different sources across the political spectrum cover this story
              </p>
            </div>
            
            {!perspectives.length ? (
                <div className="p-12 text-center">
                  <div className="text-6xl mb-4">🔍</div>
                  <p className="text-slate-500 text-sm">No additional perspectives available right now.</p>
                </div>
            ) : (
              <div className="p-8">
                <div className="relative pt-20 pb-8 min-h-[280px]">
                    {/* Spectrum Line */}
                    <div className="absolute top-8 w-full h-2 bg-gradient-to-r from-blue-500 via-purple-500 to-red-500 rounded-full shadow-lg"></div>
                    <div className="absolute top-2 w-full flex justify-between text-xs font-bold text-slate-400 uppercase tracking-wider">
                        <span>Left</span>
                        <span>Center</span>
                        <span>Right</span>
                    </div>

                    {/* Perspective Cards */}
                    {perspectives.map(p => (
                        <motion.div 
                            key={p.id} 
                            className="absolute w-56" 
                            style={{ left: `calc(${biasPositions[p.bias]} - 112px)` }}
                            onClick={() => setSelectedId(p.id)}
                            whileHover={{ scale: 1.05, y: -4 }}
                            whileTap={{ scale: 0.98 }}
                        >
                            <div className={`relative bg-slate-800 p-4 rounded-xl shadow-xl hover:shadow-2xl transition-all cursor-pointer group border-2 ${
                              selectedId === p.id ? 'border-[#64FFDA] ring-2 ring-[#64FFDA]/30' : 'border-slate-700 hover:border-slate-600'
                            }`}>
                                <span className={`absolute -top-3 right-3 px-3 py-1 text-[10px] font-bold rounded-full uppercase tracking-wider shadow-lg ${biasAccentMap[p.bias]}`}>
                                    {p.bias.replace('-', ' ')}
                                </span>
                                {/* Connecting Line */}
                                <div className={`absolute bottom-full left-1/2 w-1 h-12 rounded-full transition-colors ${
                                  selectedId === p.id ? 'bg-[#64FFDA] shadow-glow' : 'bg-slate-700 group-hover:bg-slate-600'
                                }`}></div>
                                
                                <div className="flex items-center space-x-2 mb-3">
                                  <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-sm">
                                    📰
                                  </div>
                                  <p className="font-bold text-white text-sm">{p.sourceLogo}</p>
                                </div>
                                
                                <p className="text-slate-300 text-xs font-medium mb-3 line-clamp-2">{p.headline}</p>
                                
                                <div className="flex items-start space-x-2 text-slate-400 border-t border-slate-700 pt-3">
                                    <QuoteIcon />
                                    <p className="text-xs italic leading-relaxed line-clamp-3">"{p.quote}"</p>
                                </div>
                            </div>
                        </motion.div>
                    ))}
                </div>

                {/* Selected Perspective Details */}
                {selectedPerspective && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mt-8 p-6 bg-slate-800/50 rounded-xl border border-slate-700"
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h4 className="text-lg font-bold text-white mb-1">{selectedPerspective.sourceLogo}</h4>
                        <span className={`inline-block px-3 py-1 text-xs font-bold rounded-full ${biasAccentMap[selectedPerspective.bias]}`}>
                          {selectedPerspective.bias.replace('-', ' ')} Perspective
                        </span>
                      </div>
                    </div>
                    <p className="text-slate-300 font-medium mb-3">{selectedPerspective.headline}</p>
                    <blockquote className="border-l-4 border-[#64FFDA] pl-4 py-2 italic text-slate-400 text-sm">
                      "{selectedPerspective.quote}"
                    </blockquote>
                  </motion.div>
                )}
              </div>
            )}
        </div>
    );
};

interface CommunityPollProps {
    articleId?: string;
}

const POLL_OPTIONS: Array<{ id: 'yes' | 'no' | 'unsure'; label: string }> = [
    { id: 'yes', label: 'Yes' },
    { id: 'no', label: 'No' },
    { id: 'unsure', label: 'Unsure' },
];

const CommunityPoll: React.FC<CommunityPollProps> = ({ articleId }) => {
    const pollKey = articleId ? `newsbot-poll-${articleId}` : 'newsbot-poll-global';
    const [selectedOption, setSelectedOption] = useState<'yes' | 'no' | 'unsure' | null>(null);
    const [tallies, setTallies] = useState<Record<'yes' | 'no' | 'unsure', number>>({
        yes: 0,
        no: 0,
        unsure: 0,
    });

    useEffect(() => {
        if (typeof window === 'undefined') {
            return;
        }

        try {
            const stored = localStorage.getItem(pollKey);
            if (!stored) {
                return;
            }
            const parsed = JSON.parse(stored) as {
                option?: 'yes' | 'no' | 'unsure';
                tallies?: Record<'yes' | 'no' | 'unsure', number>;
            };
            if (parsed.option) {
                setSelectedOption(parsed.option);
            }
            if (parsed.tallies) {
                setTallies(prev => ({ ...prev, ...parsed.tallies }));
            }
        } catch (error) {
            console.warn('Unable to load existing poll response', error);
        }
    }, [pollKey]);

    const totalVotes = tallies.yes + tallies.no + tallies.unsure;

    const handleVote = (option: 'yes' | 'no' | 'unsure') => {
        if (selectedOption && selectedOption === option) {
            return;
        }

        const nextTallies = {
            ...tallies,
            [option]: tallies[option] + 1,
            ...(selectedOption
                ? { [selectedOption]: Math.max(0, tallies[selectedOption] - 1) }
                : {}),
        } as Record<'yes' | 'no' | 'unsure', number>;

        setSelectedOption(option);
        setTallies(nextTallies);

        if (typeof window !== 'undefined') {
            try {
                localStorage.setItem(
                    pollKey,
                    JSON.stringify({ option, tallies: nextTallies })
                );
            } catch (error) {
                console.warn('Unable to persist poll response', error);
            }
        }
    };

    const getOptionColor = (optionId: 'yes' | 'no' | 'unsure') => {
      switch(optionId) {
        case 'yes': return 'bg-green-500';
        case 'no': return 'bg-red-500';
        case 'unsure': return 'bg-yellow-500';
      }
    };

    const getOptionEmoji = (optionId: 'yes' | 'no' | 'unsure') => {
      switch(optionId) {
        case 'yes': return '👍';
        case 'no': return '👎';
        case 'unsure': return '🤷';
      }
    };

    const renderResults = () => {
        if (!selectedOption) {
            return null;
        }

        return (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              transition={{ duration: 0.3 }}
              className="mt-6 space-y-3"
            >
                <div className="flex items-center space-x-2 text-[#64FFDA] mb-4">
                  <span className="text-2xl">✓</span>
                  <p className="text-sm font-semibold">
                    Thanks for participating! Here's what the community thinks:
                  </p>
                </div>
                {POLL_OPTIONS.map(option => {
                    const votes = tallies[option.id];
                    const percentage = totalVotes > 0
                        ? Math.round((votes / totalVotes) * 100)
                        : 0;
                    return (
                        <div key={option.id} className="space-y-2">
                          <div className="flex items-center justify-between text-sm">
                            <span className="font-medium text-white flex items-center space-x-2">
                              <span>{getOptionEmoji(option.id)}</span>
                              <span>{option.label}</span>
                            </span>
                            <span className="text-slate-400 font-semibold">{percentage}%</span>
                          </div>
                          <div className="w-full bg-slate-700 rounded-full h-3 overflow-hidden">
                            <motion.div
                              initial={{ width: 0 }}
                              animate={{ width: `${percentage}%` }}
                              transition={{ duration: 0.5, ease: "easeOut" }}
                              className={`h-full ${getOptionColor(option.id)} shadow-lg`}
                            />
                          </div>
                          <p className="text-xs text-slate-500">{votes} {votes === 1 ? 'vote' : 'votes'}</p>
                        </div>
                    );
                })}
            </motion.div>
        );
    };

    return (
        <div className="bg-slate-900/80 backdrop-blur-sm border border-slate-800 rounded-xl shadow-2xl overflow-hidden">
            <div className="bg-gradient-to-r from-blue-500/10 to-purple-500/10 p-6 border-b border-slate-800">
              <h3 className="flex items-center space-x-2 text-2xl font-bold text-white">
                  <PollIcon />
                  <span>Community Poll</span>
              </h3>
              <p className="text-sm text-slate-400 mt-2">
                Join {totalVotes} {totalVotes === 1 ? 'reader' : 'readers'} who shared their opinion
              </p>
            </div>
            
            <div className="p-6">
              <p className="text-slate-300 mb-6 text-base font-medium leading-relaxed">
                  After reading multiple perspectives, has your opinion on this topic shifted?
              </p>
              <div className="grid grid-cols-3 gap-3">
                  {POLL_OPTIONS.map(option => {
                      const isActive = selectedOption === option.id;
                      return (
                          <motion.button
                              key={option.id}
                              onClick={() => handleVote(option.id)}
                              whileHover={{ scale: 1.05 }}
                              whileTap={{ scale: 0.95 }}
                              className={`flex flex-col items-center justify-center py-4 px-3 rounded-xl transition-all text-sm border-2 font-bold ${
                                  isActive
                                      ? 'bg-[#64FFDA]/20 text-[#64FFDA] border-[#64FFDA] shadow-lg ring-2 ring-[#64FFDA]/30'
                                      : 'bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white border-slate-700 hover:border-slate-600'
                              }`}
                          >
                              <span className="text-2xl mb-2">{getOptionEmoji(option.id)}</span>
                              <span>{option.label}</span>
                          </motion.button>
                      );
                  })}
              </div>
              {renderResults()}
            </div>
        </div>
    );
};


const EntityTag: React.FC<{ label: string; type: string }> = ({ label, type }) => {
    const colors: { [key: string]: string } = {
        'Person': 'bg-green-500/20 text-green-300',
        'Organization': 'bg-sky-500/20 text-sky-300',
        'Location': 'bg-amber-500/20 text-amber-300',
        'Topic': 'bg-purple-500/20 text-purple-300',
        'Other': 'bg-slate-500/20 text-slate-300',
    };
    const colorClass = colors[type] || colors['Other'];
    return (
        <div className="flex items-center space-x-2 bg-slate-800 rounded-full px-3 py-1">
            <span className={`w-2 h-2 rounded-full ${colorClass.split(' ')[0]}`}></span>
            <span className="text-sm font-medium text-slate-300">{label}</span>
            <span className="text-xs text-slate-500">{type}</span>
        </div>
    )
};

interface EntityData {
    label: string;
    type: 'Person' | 'Organization' | 'Location' | 'Topic' | 'Other';
}

const DEFAULT_SUMMARY_POINTS = [
    'G7 nations sign the historic Global AI Accord to regulate artificial intelligence.',
    'The accord is built on three pillars: transparency, safety, and accountability.',
    'A new international body, the Global AI Safety Institute, will be formed for testing and auditing.',
    'The agreement is not legally binding and relies on voluntary commitment from nations and tech companies.',
    'Critics view it as a crucial first step, but its success depends on implementation.'
];

const DEFAULT_SENTIMENT: SentimentBreakdown = {
    positive: 15,
    neutral: 80,
    negative: 5,
    summary: 'The article maintains a largely neutral and objective tone, focusing on reporting the facts of the agreement.'
};

const DEFAULT_ENTITIES: EntityData[] = [
    { label: 'Group of Seven (G7)', type: 'Organization' },
    { label: 'Global AI Accord', type: 'Topic' },
    { label: 'Geneva', type: 'Location' },
    { label: 'Global AI Safety Institute', type: 'Organization' },
    { label: 'Artificial Intelligence', type: 'Topic' },
    { label: 'Humanity', type: 'Other' },
];

const DEFAULT_FULL_ARTICLE_TEXT = `
    GENEVA – In a landmark decision aimed at shaping the future of artificial intelligence, leaders from the Group of Seven (G7) nations concluded a multi-day summit by signing the historic Global AI Accord. The agreement, brokered after intense negotiations, represents the first major international effort to establish guardrails for the rapidly advancing technology.
    The core of the accord focuses on three pillars: transparency, safety, and accountability. Tech companies developing powerful "frontier" models will be expected to adhere to new transparency standards, including disclosing key aspects of their training data and model architecture. This move is intended to provide regulators and the public with greater insight into how these complex systems operate.
    Furthermore, the pact establishes a new international body, provisionally named the Global AI Safety Institute, which will be tasked with developing standardized testing protocols and auditing high-risk AI systems. "We are entering a new era of technology, and it requires a new era of global cooperation," stated one of the lead negotiators. "This institute will be crucial in ensuring that AI is developed and deployed in a manner that is safe, secure, and beneficial to all of humanity."
    Despite the celebratory tone, some critics have pointed out that the accord's provisions are not legally binding. Its success hinges on the voluntary commitment of signatory nations and the tech giants within their borders. Experts suggest that while it is a vital first step, the true test will be in its implementation and the willingness of all parties to translate its principles into concrete actions.
`;

const DeepDive: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [article, setArticle] = useState<NewsArticle | null>(null);
    const [activeTab, setActiveTab] = useState('Summary');
    const { trackArticleView, startReadingTimer, trackLike, removeLike, trackBookmark, likedArticles } = useUser();
    const readingTimerRef = useRef<(() => void) | null>(null);

    const [liked, setLiked] = useState<boolean>(false);
    const [bookmarked, setBookmarked] = useState(false);
    const [summaryPoints, setSummaryPoints] = useState<string[]>(DEFAULT_SUMMARY_POINTS);
    const [sentiment, setSentiment] = useState<SentimentBreakdown | null>(DEFAULT_SENTIMENT);
    const [entities, setEntities] = useState<EntityData[]>(DEFAULT_ENTITIES);
    const [fullArticleText, setFullArticleText] = useState<string>(DEFAULT_FULL_ARTICLE_TEXT);
    const [sourceBias, setSourceBias] = useState<Bias>('Center');
    const [perspectives, setPerspectives] = useState<PerspectiveArticle[]>(MOCK_PERSPECTIVES);
    const [readingProgress, setReadingProgress] = useState(0);

  const analysisTabs = [
    { name: 'Summary', icon: <SummaryIcon />, description: 'AI-generated key points' },
    { name: 'Bias & Sentiment', icon: <SentimentIcon />, description: 'Analyze perspective & tone' },
    { name: 'Key Entities', icon: <EntityIcon />, description: 'People, places & topics' },
  ];

  // Scroll progress tracking
  useEffect(() => {
    const handleScroll = () => {
      const windowHeight = window.innerHeight;
      const documentHeight = document.documentElement.scrollHeight - windowHeight;
      const scrolled = window.scrollY;
      const progress = (scrolled / documentHeight) * 100;
      setReadingProgress(Math.min(progress, 100));
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    const persisted = typeof window !== 'undefined' ? loadPersistedLiveArticles() : [];
    const mockArticle = MOCK_NEWS_ARTICLES.find(a => a.id === id) || null;
    const liveArticle = persisted.find(a => a.id === id) || null;
    const resolvedArticle = mockArticle ?? liveArticle ?? null;

    setArticle(resolvedArticle);

    if (resolvedArticle) {
        const isMockArticle = MOCK_NEWS_ARTICLES.some(item => item.id === resolvedArticle.id);
        const resolvedBias = resolvedArticle.bias ?? getSourceBias(resolvedArticle.source);
        setSourceBias(resolvedBias);

        if (isMockArticle) {
            setSummaryPoints(DEFAULT_SUMMARY_POINTS);
            setSentiment(DEFAULT_SENTIMENT);
            setEntities(DEFAULT_ENTITIES);
            setFullArticleText(DEFAULT_FULL_ARTICLE_TEXT);
            setPerspectives(MOCK_PERSPECTIVES);
        } else {
            const fullText = resolvedArticle.fullText || resolvedArticle.summary || '';
            const bulletPoints = (resolvedArticle.summaryBullets ?? []).filter(Boolean);
            const generatedPoints = fullText
                .split(/(?<=[.!?])\s+/)
                .map(point => point.trim())
                .filter(Boolean)
                .slice(0, 5);

            if (bulletPoints.length) {
                setSummaryPoints(bulletPoints.slice(0, 5));
            } else {
                setSummaryPoints(generatedPoints.length ? generatedPoints : [resolvedArticle.summary]);
            }

            const breakdown = estimateSentimentBreakdown(fullText || resolvedArticle.summary, resolvedArticle.sentiment);
            setSentiment(breakdown);
            setEntities([]);
            setFullArticleText(fullText || bulletPoints.join(' '));

            const peerArticles = persisted
                .filter(a => a.id !== resolvedArticle.id)
                .filter(a => a.topic === resolvedArticle.topic);

            const perspectiveMap = new Map<Bias, PerspectiveArticle>();
            peerArticles.forEach(candidate => {
                const bias = candidate.bias ?? getSourceBias(candidate.source);
                if (perspectiveMap.has(bias)) {
                    return;
                }
                perspectiveMap.set(bias, {
                    id: `live-perspective-${candidate.id}`,
                    sourceLogo: candidate.source,
                    headline: candidate.headline,
                    bias,
                    quote: perspectiveQuoteFor(candidate),
                });
            });

            const livePerspectives = Array.from(perspectiveMap.values());
            if (!livePerspectives.length) {
                setPerspectives(MOCK_PERSPECTIVES);
            } else {
                const supplemented = [...livePerspectives];
                if (supplemented.length < 3) {
                    const missingBiases = new Set<Bias>(supplemented.map(item => item.bias));
                    MOCK_PERSPECTIVES.forEach(mock => {
                        if (supplemented.length >= 3) {
                            return;
                        }
                        if (!missingBiases.has(mock.bias)) {
                            supplemented.push(mock);
                            missingBiases.add(mock.bias);
                        }
                    });
                }
                setPerspectives(supplemented.slice(0, 5));
            }
        }
    } else {
        setSummaryPoints([]);
        setSentiment(null);
        setEntities([]);
        setFullArticleText('');
        setSourceBias('Center');
        setPerspectives(MOCK_PERSPECTIVES);
    }

    setActiveTab('Summary');
  }, [id]);

    useEffect(() => {
        if (!article) {
            return;
        }

        const isLiked = likedArticles.some(entry => entry.article.id === article.id);
        setLiked(isLiked);

        trackArticleView(article.id, article.topic, article.source);
        readingTimerRef.current?.();
        readingTimerRef.current = startReadingTimer(article.id);

        return () => {
            readingTimerRef.current?.();
            readingTimerRef.current = null;
        };
    }, [article, startReadingTimer, trackArticleView, likedArticles]);

  if (!article) {
    return (
      <div className="w-full h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-white mb-4">Article Not Found</h1>
          <p className="text-slate-400 mb-6">The article you're looking for doesn't exist or has been removed.</p>
          <button
            onClick={() => navigate('/')}
            className="bg-[#64FFDA]/10 text-[#64FFDA] px-6 py-3 rounded-lg hover:bg-[#64FFDA]/20 transition-colors font-semibold"
          >
            Return to Home
          </button>
        </div>
      </div>
    );
  }

  const handleLike = () => {
    if (liked) {
      removeLike(article.id);
      setLiked(false);
    } else {
      trackLike(article);
      setLiked(true);
    }
  };

  const handleBookmark = () => {
    setBookmarked(!bookmarked);
    if (!bookmarked) {
      trackBookmark(article.id, article.topic, article.source);
    }
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: article.headline,
        text: article.summary,
        url: window.location.href,
      }).catch(() => {});
    } else {
      navigator.clipboard.writeText(window.location.href);
      alert('Link copied to clipboard!');
    }
  };

  const renderTabContent = () => {
    switch (activeTab) {
        case 'Summary':
            return (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
              >
                <ul className="space-y-3">
                  {summaryPoints.map((point, index) => (
                    <li key={index} className="flex items-start space-x-3">
                      <span className="flex-shrink-0 w-6 h-6 rounded-full bg-[#64FFDA]/20 text-[#64FFDA] flex items-center justify-center text-xs font-bold mt-0.5">
                        {index + 1}
                      </span>
                      <span className="text-slate-300 text-sm leading-relaxed">{point}</span>
                    </li>
                  ))}
                </ul>
              </motion.div>
            );
        case 'Bias & Sentiment':
            return sentiment && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
                className="space-y-6"
              >
                <div>
                    <h4 className="font-semibold text-white mb-3 flex items-center space-x-2">
                      <span className="w-2 h-2 rounded-full bg-[#64FFDA]"></span>
                      <span>Sentiment Analysis</span>
                    </h4>
                    <div className="space-y-2">
                      <div className="flex justify-between text-xs text-slate-400 mb-1">
                        <span>Positive: {sentiment.positive}%</span>
                        <span>Neutral: {sentiment.neutral}%</span>
                        <span>Negative: {sentiment.negative}%</span>
                      </div>
                      <div className="w-full bg-slate-700 rounded-full h-3 flex overflow-hidden shadow-inner">
                        <div className="bg-gradient-to-r from-green-500 to-green-400 h-full transition-all" style={{width: `${sentiment.positive}%`}}></div>
                        <div className="bg-gradient-to-r from-slate-400 to-slate-300 h-full transition-all" style={{width: `${sentiment.neutral}%`}}></div>
                        <div className="bg-gradient-to-r from-red-500 to-red-400 h-full transition-all" style={{width: `${sentiment.negative}%`}}></div>
                      </div>
                      <p className="text-sm text-slate-400 mt-3 leading-relaxed">{sentiment.summary}</p>
                    </div>
                </div>
                <div className="pt-4 border-t border-slate-700">
                    <h4 className="font-semibold text-white mb-3 flex items-center space-x-2">
                      <span className="w-2 h-2 rounded-full bg-purple-400"></span>
                      <span>Source Political Bias</span>
                    </h4>
                    <BiasMeter bias={sourceBias}/>
                    <p className="text-sm text-slate-400 mt-3 leading-relaxed">
                        {article.source} is classified as <span className="font-bold text-white">{sourceBias.replace('-', ' ')}</span>, {biasNarrativeMap[sourceBias]}
                    </p>
                </div>
              </motion.div>
            );
        case 'Key Entities':
            return (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
              >
                {entities.length > 0 ? (
                  <div className="flex flex-wrap gap-3">
                    {entities.map(entity => <EntityTag key={entity.label} label={entity.label} type={entity.type} />)}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <EntityIcon />
                    <p className="text-slate-500 mt-3 text-sm">No entities extracted for this article yet.</p>
                  </div>
                )}
              </motion.div>
            );
        default:
            return null;
    }
  };

  return (
    <div className="w-full min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      {/* Reading Progress Bar */}
      <motion.div
        className="fixed top-0 left-0 right-0 h-1 bg-[#64FFDA] z-50 origin-left"
        style={{ scaleX: readingProgress / 100 }}
        initial={{ scaleX: 0 }}
        animate={{ scaleX: readingProgress / 100 }}
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Back Button */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5 }}
        >
          <Link 
            to="/" 
            className="inline-flex items-center space-x-2 text-slate-400 hover:text-[#64FFDA] mb-8 group transition-colors"
          >
            <BackArrowIcon />
            <span className="font-medium">Back to Feed</span>
          </Link>
        </motion.div>

        {/* Article Header */}
        <motion.header
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="mb-8"
        >
          <div className="flex items-center space-x-3 mb-4">
            <span className={`px-3 py-1 text-xs font-bold rounded-full uppercase tracking-wide ${
              article.sentiment === 'Positive' ? 'bg-green-500/20 text-green-300' :
              article.sentiment === 'Negative' ? 'bg-red-500/20 text-red-300' :
              'bg-yellow-500/20 text-yellow-300'
            }`}>
              {article.sentiment}
            </span>
            <span className="px-3 py-1 text-xs font-bold rounded-full bg-blue-500/20 text-blue-300 uppercase tracking-wide">
              {article.topic}
            </span>
          </div>
          
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-4 leading-tight">
            {article.headline}
          </h1>
          
          <div className="flex flex-wrap items-center gap-4 text-slate-400 text-sm">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center">
                <span className="text-xs">📰</span>
              </div>
              <span className="font-semibold text-white">{article.source}</span>
            </div>
            <span>•</span>
            <span>{article.author}</span>
            <span>•</span>
            <span>{article.date}</span>
            <span>•</span>
            <div className="flex items-center space-x-1">
              <ShieldIcon />
              <span className="font-semibold text-[#64FFDA]">{article.trustScore}</span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center space-x-3 mt-6">
            <button
              onClick={handleLike}
              className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-all ${
                liked 
                  ? 'bg-red-500/20 text-red-400 border border-red-400/40' 
                  : 'bg-slate-800 text-slate-400 hover:text-red-400 hover:bg-slate-700 border border-slate-700'
              }`}
            >
              <span>{liked ? '❤️' : '🤍'}</span>
              <span className="text-sm font-medium">Like</span>
            </button>
            
            <button
              onClick={handleBookmark}
              className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-all ${
                bookmarked 
                  ? 'bg-[#64FFDA]/20 text-[#64FFDA] border border-[#64FFDA]/40' 
                  : 'bg-slate-800 text-slate-400 hover:text-[#64FFDA] hover:bg-slate-700 border border-slate-700'
              }`}
            >
              <span>{bookmarked ? '🔖' : '📑'}</span>
              <span className="text-sm font-medium">Save</span>
            </button>
            
            <button
              onClick={handleShare}
              className="flex items-center space-x-2 px-4 py-2 rounded-lg bg-slate-800 text-slate-400 hover:text-blue-400 hover:bg-slate-700 border border-slate-700 transition-all"
            >
              <span>🔗</span>
              <span className="text-sm font-medium">Share</span>
            </button>
          </div>
        </motion.header>
        
        <div className="grid grid-cols-12 gap-8">
            {/* Left Sidebar - AI Analysis */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="col-span-12 lg:col-span-4"
            >
                <div className="sticky top-8">
                    <div className="bg-slate-900/80 backdrop-blur-sm border border-slate-800 rounded-xl shadow-2xl overflow-hidden">
                      <div className="bg-gradient-to-r from-[#64FFDA]/10 to-purple-500/10 p-4 border-b border-slate-800">
                        <h2 className="text-lg font-bold text-white flex items-center space-x-2">
                          <span className="text-[#64FFDA]">🤖</span>
                          <span>AI Analysis</span>
                        </h2>
                        <p className="text-xs text-slate-400 mt-1">Powered by advanced NLP</p>
                      </div>
                      
                      <div className="flex flex-col">
                        {analysisTabs.map((tab, index) => (
                          <motion.button
                            key={tab.name}
                            onClick={() => setActiveTab(tab.name)}
                            whileHover={{ x: 4 }}
                            whileTap={{ scale: 0.98 }}
                            className={`flex items-start space-x-3 w-full px-5 py-4 font-semibold transition-all duration-200 text-left border-l-4 ${
                              activeTab === tab.name 
                                ? 'text-[#64FFDA] bg-slate-800/80 border-[#64FFDA] shadow-lg' 
                                : 'text-slate-400 hover:text-white border-transparent hover:bg-slate-800/50'
                            }`}
                          >
                            <div className="mt-0.5">{tab.icon}</div>
                            <div className="flex-1">
                              <div className="font-bold">{tab.name}</div>
                              <div className="text-xs text-slate-500 mt-0.5">{tab.description}</div>
                            </div>
                          </motion.button>
                        ))}
                      </div>
                    </div>
                    
                    <div className="p-6 min-h-[300px] bg-slate-900/80 backdrop-blur-sm border border-slate-800 rounded-xl shadow-2xl mt-4">
                        {renderTabContent()}
                    </div>
                </div>
            </motion.div>

            {/* Main Content - Article */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
              className="col-span-12 lg:col-span-8"
            >
                <article className="prose prose-invert prose-lg max-w-none bg-slate-900/80 backdrop-blur-sm border border-slate-800 rounded-xl shadow-2xl p-8 md:p-12">
                  <h3 className="text-white text-2xl font-bold mb-6 flex items-center space-x-2">
                    <span>📄</span>
                    <span>Full Article</span>
                  </h3>
                  <div className="text-slate-300 leading-relaxed space-y-4">
                    {fullArticleText
                      ? fullArticleText
                          .split('\n')
                          .map(paragraph => paragraph.trim())
                          .filter(Boolean)
                          .map((paragraph, idx) => (
                              <p key={idx} className="text-base md:text-lg">{paragraph}</p>
                          ))
                      : <p className="text-slate-500 text-center py-8">No additional article text available.</p>
                    }
                  </div>
                  {article.readMoreUrl && (
                      <a
                          href={article.readMoreUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-2 px-6 py-3 text-sm font-semibold text-[#64FFDA] bg-[#64FFDA]/10 rounded-lg mt-8 hover:bg-[#64FFDA]/20 transition-colors border border-[#64FFDA]/30"
                      >
                          Read original source 
                          <span>→</span>
                      </a>
                  )}
                </article>

                {/* Alternative Perspectives */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.4 }}
                  className="mt-8"
                >
                  <AlternativePerspectives perspectives={perspectives} />
                </motion.div>

                {/* Community Poll */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.5 }}
                  className="mt-8"
                >
                  <CommunityPoll articleId={article.id} />
                </motion.div>
            </motion.div>
        </div>
      </div>
    </div>
  );
};

export default DeepDive;
