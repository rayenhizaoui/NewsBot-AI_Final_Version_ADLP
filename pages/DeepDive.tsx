import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { MOCK_NEWS_ARTICLES, MOCK_PERSPECTIVES } from '../constants';
import {
    loadPersistedLiveArticles,
    estimateSentimentBreakdown,
    getSourceBias,
    type SentimentBreakdown,
} from '../services/newsService';
import type { NewsArticle, PerspectiveArticle, Bias } from '../types';
import { useUser } from '../contexts/UserContext';
import { BackArrowIcon, QuoteIcon } from '../components/icons/IconDefs';
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

    return (
        <div className="bg-slate-900/50 border border-slate-800 rounded-lg p-6 h-full">
            <h3 className="flex items-center space-x-2 text-xl font-bold text-white mb-4">
                <PerspectiveIcon />
                <span>Perspectives Spectrum</span>
            </h3>
            {!perspectives.length && (
                <p className="text-slate-500 text-sm">No additional perspectives available right now.</p>
            )}
            <div className="relative pt-12 min-h-[180px]">
                {/* Spectrum Line */}
                <div className="absolute top-4 w-full h-1 bg-gradient-to-r from-blue-500 via-purple-500 to-red-500 rounded-full"></div>
                <div className="absolute top-3 w-full flex justify-between text-xs text-slate-400">
                    <span>Left</span>
                    <span>Center</span>
                    <span>Right</span>
                </div>

                {/* Perspective Cards */}
                {perspectives.map(p => (
                    <div 
                        key={p.id} 
                        className="absolute w-48" 
                        style={{ left: `calc(${biasPositions[p.bias]} - 96px)` }}
                        onClick={() => setSelectedId(p.id)}
                    >
                        <div className={`relative bg-slate-800 p-3 rounded-lg shadow-lg hover:border-[#64FFDA] transition-all cursor-pointer group border ${selectedId === p.id ? 'border-[#64FFDA]' : 'border-slate-700'}`}>
                            <span className={`absolute -top-3 right-2 px-2 py-0.5 text-[10px] font-semibold rounded-full uppercase tracking-wide ${biasAccentMap[p.bias]}`}>
                                {p.bias.replace('-', ' ')}
                            </span>
                             {/* Connecting Line */}
                            <div className={`absolute bottom-full left-1/2 w-0.5 h-8 group-hover:bg-[#64FFDA] transition-colors ${selectedId === p.id ? 'bg-[#64FFDA]' : 'bg-slate-700'}`}></div>
                            <p className="font-semibold text-white text-sm">{p.sourceLogo}</p>
                            <p className="text-slate-300 text-xs mb-2">{p.headline}</p>
                            <div className="flex items-start space-x-2 text-slate-400 border-t border-slate-700 pt-2 mt-2">
                                <QuoteIcon/>
                                <p className="text-xs italic">"{p.quote}"</p>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
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

    const renderResults = () => {
        if (!selectedOption) {
            return null;
        }

        return (
            <div className="mt-4 text-xs text-slate-400 space-y-2">
                <p className="text-slate-300">
                    Thanks for weighing in! Here is how the community feels right now:
                </p>
                {POLL_OPTIONS.map(option => {
                    const votes = tallies[option.id];
                    const percentage = totalVotes > 0
                        ? Math.round((votes / totalVotes) * 100)
                        : 0;
                    return (
                        <div key={option.id} className="flex items-center justify-between bg-slate-800/60 rounded px-2 py-1">
                            <span className="font-medium text-white">{option.label}</span>
                            <span className="text-slate-300">{percentage}% ({votes})</span>
                        </div>
                    );
                })}
            </div>
        );
    };

    return (
        <div className="bg-slate-900/50 border border-slate-800 rounded-lg p-6 h-full">
            <h3 className="flex items-center space-x-2 text-xl font-bold text-white mb-4">
                <PollIcon />
                <span>Community Poll</span>
            </h3>
            <p className="text-slate-300 mb-4 text-sm">
                After reading multiple perspectives, has your opinion on this topic shifted?
            </p>
            <div className="flex space-x-2">
                {POLL_OPTIONS.map(option => {
                    const isActive = selectedOption === option.id;
                    return (
                        <button
                            key={option.id}
                            onClick={() => handleVote(option.id)}
                            className={`flex-1 font-bold py-2 px-3 rounded transition-colors text-sm border ${
                                isActive
                                    ? 'bg-[#64FFDA]/20 text-[#64FFDA] border-[#64FFDA]/60'
                                    : 'bg-slate-700 hover:bg-slate-600 text-white border-slate-700'
                            }`}
                        >
                            {option.label}
                        </button>
                    );
                })}
            </div>
            {renderResults()}
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
    const [article, setArticle] = useState<NewsArticle | null>(null);
    const [activeTab, setActiveTab] = useState('Summary');
    const { trackArticleView, startReadingTimer } = useUser();
    const readingTimerRef = useRef<(() => void) | null>(null);

    const [summaryPoints, setSummaryPoints] = useState<string[]>(DEFAULT_SUMMARY_POINTS);
    const [sentiment, setSentiment] = useState<SentimentBreakdown | null>(DEFAULT_SENTIMENT);
    const [entities, setEntities] = useState<EntityData[]>(DEFAULT_ENTITIES);
    const [fullArticleText, setFullArticleText] = useState<string>(DEFAULT_FULL_ARTICLE_TEXT);
    const [sourceBias, setSourceBias] = useState<Bias>('Center');
    const [perspectives, setPerspectives] = useState<PerspectiveArticle[]>(MOCK_PERSPECTIVES);

  const analysisTabs = [
    { name: 'Summary', icon: <SummaryIcon /> },
    { name: 'Bias & Sentiment', icon: <SentimentIcon /> },
    { name: 'Key Entities', icon: <EntityIcon /> },
  ];

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

            trackArticleView(article.id, article.topic, article.source);
            readingTimerRef.current?.();
            readingTimerRef.current = startReadingTimer(article.id);

            return () => {
                readingTimerRef.current?.();
                readingTimerRef.current = null;
            };
    }, [article, startReadingTimer, trackArticleView]);

  if (!article) {
    return <div className="p-8 text-white">Article not found.</div>;
  }

  const renderTabContent = () => {
    switch (activeTab) {
        case 'Summary':
            return <ul className="list-disc list-inside space-y-2 text-slate-300">
                {summaryPoints.map((point, index) => <li key={index}>{point}</li>)}
            </ul>;
        case 'Bias & Sentiment':
            return sentiment && <div className="text-slate-300 space-y-4">
                <div>
                    <h4 className="font-semibold text-white mb-2">Sentiment Analysis</h4>
                    <div className="w-full bg-slate-700 rounded-full h-4 flex overflow-hidden">
                        <div className="bg-green-500 h-full" style={{width: `${sentiment.positive}%`}} title={`Positive: ${sentiment.positive}%`}></div>
                        <div className="bg-slate-400 h-full" style={{width: `${sentiment.neutral}%`}} title={`Neutral: ${sentiment.neutral}%`}></div>
                        <div className="bg-red-500 h-full" style={{width: `${sentiment.negative}%`}} title={`Negative: ${sentiment.negative}%`}></div>
                    </div>
                    <p className="text-sm text-slate-400 mt-2">{sentiment.summary}</p>
                </div>
                <div>
                    <h4 className="font-semibold text-white mb-2">Source Political Bias</h4>
                    <BiasMeter bias={sourceBias}/>
                    <p className="text-sm text-slate-400 mt-2">
                        {article.source} is profiled here as a <span className="font-bold text-white">{sourceBias.replace('-', ' ')}</span> outlet, {biasNarrativeMap[sourceBias]}
                    </p>
                </div>
            </div>;
        case 'Key Entities':
            return <div className="text-slate-300 flex flex-wrap gap-3">
                {entities.map(entity => <EntityTag key={entity.label} label={entity.label} type={entity.type} />)}
            </div>;
        default:
            return null;
    }
  };

  return (
    <div className="w-full h-screen overflow-y-auto p-8">
        <Link to="/" className="inline-flex items-center space-x-2 text-slate-400 hover:text-[#64FFDA] mb-6">
          <BackArrowIcon />
          <span>Back to Home</span>
        </Link>
        <header className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">{article.headline}</h1>
          <p className="text-slate-400">{article.source} • {article.author} • {article.date}</p>
        </header>
        
        <div className="grid grid-cols-12 gap-8">
            {/* Left Column (AI Analysis) */}
            <div className="col-span-12 lg:col-span-3">
                <div className="sticky top-8">
                    <div className="bg-slate-900/50 border border-slate-800 rounded-lg">
                      <div className="flex flex-col border-slate-800">
                        {analysisTabs.map(tab => (
                          <button key={tab.name}
                            onClick={() => setActiveTab(tab.name)}
                            className={`flex items-center space-x-2 w-full px-4 py-3 font-semibold transition-colors duration-200 text-left border-l-4 ${activeTab === tab.name ? 'text-[#64FFDA] bg-slate-800 border-[#64FFDA]' : 'text-slate-400 hover:text-white border-transparent hover:bg-slate-800/50'}`}>
                            {tab.icon}
                            <span>{tab.name}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="p-6 min-h-[220px] bg-slate-900/50 border border-slate-800 rounded-lg mt-4">
                        {renderTabContent()}
                    </div>
                </div>
            </div>

            {/* Middle Column (Article) */}
            <div className="col-span-12 lg:col-span-9">
                <article className="prose prose-invert max-w-none text-slate-300 bg-slate-900/50 border border-slate-800 rounded-lg p-8">
                  <h3 className="text-white">Full Article</h3>
                                    {fullArticleText
                                        ? fullArticleText
                                                .split('\n')
                                                .map(paragraph => paragraph.trim())
                                                .filter(Boolean)
                                                .map((paragraph, idx) => (
                                                    <p key={idx}>{paragraph}</p>
                                                ))
                                        : <p className="text-slate-500">No additional article text available.</p>
                                    }
                                    {article.readMoreUrl && (
                                        <a
                                            href={article.readMoreUrl}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="inline-flex items-center gap-1 text-sm text-[#64FFDA] mt-4 hover:underline"
                                        >
                                            Read original source →
                                        </a>
                                    )}
                </article>
            </div>

            {/* Perspectives section */}
            <div className="col-span-12 lg:col-span-9">
                <AlternativePerspectives perspectives={perspectives} />
            </div>

            {/* Poll section */}
            <div className="col-span-12 lg:col-span-3">
                <CommunityPoll articleId={article.id} />
            </div>
        </div>
    </div>
  );
};

export default DeepDive;
