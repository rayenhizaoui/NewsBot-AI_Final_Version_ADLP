import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ReadIcon, ViewedIcon, FollowedIcon } from '../components/icons/MoreIcons';
import PersonalizationInsights from '../components/PersonalizationInsights';
import { useUser } from '../contexts/UserContext';
import { getSupportedTopics } from '../services/newsService';

const Profile: React.FC = () => {
  const {
    profile,
    insights,
    isLoading,
    likedArticles,
    updateProfileInfo,
    manualTopics,
    updateManualTopics,
    resetPersonalization,
  } = useUser();

  const profileInfo = profile?.profileInfo;
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isTopicsOpen, setIsTopicsOpen] = useState(false);
  const [editStatus, setEditStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [topicsError, setTopicsError] = useState<string | null>(null);
  const [resetNotice, setResetNotice] = useState<'success' | 'error' | null>(null);

  const [formState, setFormState] = useState({
    fullName: profileInfo?.fullName ?? 'Rayen',
    email: profileInfo?.email ?? 'rayen@example.com',
    title: profileInfo?.title ?? '',
    organization: profileInfo?.organization ?? '',
    bio: profileInfo?.bio ?? '',
    avatarUrl: profileInfo?.avatarUrl ?? '',
  });
  const [avatarPreview, setAvatarPreview] = useState<string | null>(profileInfo?.avatarUrl ?? null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [selectedTopics, setSelectedTopics] = useState<string[]>(manualTopics ?? []);

  useEffect(() => {
    if (profileInfo) {
      setFormState({
        fullName: profileInfo.fullName,
        email: profileInfo.email,
        title: profileInfo.title ?? '',
        organization: profileInfo.organization ?? '',
        bio: profileInfo.bio ?? '',
        avatarUrl: profileInfo.avatarUrl ?? '',
      });
      setAvatarPreview(profileInfo.avatarUrl ?? null);
    }
  }, [profileInfo]);

  useEffect(() => {
    setSelectedTopics(manualTopics);
  }, [manualTopics]);

  const supportedTopics = useMemo(() => {
    const baseTopics = getSupportedTopics();
    const inferred = profile?.behavior.favoriteTopics ?? [];
    const unique = new Set<string>([...baseTopics, ...inferred, ...manualTopics]);
    return Array.from(unique).sort();
  }, [profile?.behavior.favoriteTopics, manualTopics]);

  const avatarInitial = useMemo(() => {
    const source = profileInfo?.fullName || 'Rayen';
    return source.charAt(0).toUpperCase();
  }, [profileInfo?.fullName]);

  const openEditModal = () => {
    setErrorMessage(null);
    setEditStatus('idle');
    setIsEditOpen(true);
  };

  const openTopicsModal = () => {
    setTopicsError(null);
    setSelectedTopics(manualTopics.length ? manualTopics : (profile?.behavior.favoriteTopics ?? []));
    setIsTopicsOpen(true);
  };

  const closeTopicsModal = () => {
    setIsTopicsOpen(false);
    setTopicsError(null);
  };

  const closeEditModal = () => {
    setIsEditOpen(false);
    setEditStatus('idle');
    setErrorMessage(null);
  };

  const handleInputChange = (
    event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = event.target;
    setFormState(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleAvatarUpload = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    if (!file.type.startsWith('image/')) {
      setErrorMessage('Le fichier doit être une image.');
      event.target.value = '';
      return;
    }

    const maxBytes = 1.5 * 1024 * 1024;
    if (file.size > maxBytes) {
      setErrorMessage('Veuillez choisir une image de 1.5MB ou moins.');
      event.target.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const result = typeof reader.result === 'string' ? reader.result : null;
      if (result) {
        setFormState(prev => ({
          ...prev,
          avatarUrl: result,
        }));
        setAvatarPreview(result);
        setErrorMessage(null);
      }
    };
    reader.onerror = () => {
      setErrorMessage('Impossible de lire cette image. Réessayez.');
    };

    reader.readAsDataURL(file);
    event.target.value = '';
  };

  const handleAvatarRemove = () => {
    setFormState(prev => ({
      ...prev,
      avatarUrl: '',
    }));
    setAvatarPreview(null);
    setErrorMessage(null);
  };

  const toggleTopicSelection = (topic: string) => {
    setSelectedTopics(prev => {
      if (prev.includes(topic)) {
        return prev.filter(item => item !== topic);
      }
      if (prev.length >= 8) {
        setTopicsError('Vous pouvez suivre jusqu’à 8 sujets.');
        return prev;
      }
      setTopicsError(null);
      return [...prev, topic];
    });
  };

  const handleTopicsSave = () => {
    updateManualTopics(selectedTopics);
    closeTopicsModal();
  };

  const handleTopicsReset = () => {
    setSelectedTopics([]);
    setTopicsError(null);
  };

  const handleFavoriteReset = () => {
    const confirmed = window.confirm(
      'Voulez-vous réinitialiser vos statistiques et favoris ? Vous perdrez vos sujets suivis et historique personnalisé.'
    );

    if (!confirmed) {
      return;
    }

    const success = resetPersonalization();
    if (success) {
      setSelectedTopics([]);
      setResetNotice('success');
    } else {
      setResetNotice('error');
    }

    setTimeout(() => setResetNotice(null), 2500);
  };

  const validateForm = () => {
    if (!formState.fullName.trim()) {
      setErrorMessage('Full name is required.');
      return false;
    }

    if (!formState.email.trim()) {
      setErrorMessage('Email is required.');
      return false;
    }

    const emailRegex = /.+@.+\..+/;
    if (!emailRegex.test(formState.email.trim())) {
      setErrorMessage('Please provide a valid email address.');
      return false;
    }

    return true;
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!validateForm()) {
      setEditStatus('error');
      return;
    }

    setEditStatus('saving');
    setErrorMessage(null);

    try {
      updateProfileInfo({
        fullName: formState.fullName,
        email: formState.email,
        title: formState.title,
        organization: formState.organization,
        bio: formState.bio,
        avatarUrl: formState.avatarUrl,
      });

      setEditStatus('saved');
      setTimeout(() => {
        closeEditModal();
      }, 600);
    } catch (error) {
      console.error(error);
      setErrorMessage('Unable to save profile changes. Please try again.');
      setEditStatus('error');
    }
  };

  const followedTopics = (manualTopics.length ? manualTopics : profile?.behavior.favoriteTopics) || 
    ['Geopolitics', 'Technology', 'Economics', 'AI Ethics', 'Climate Change'];

  const totalArticlesRead = profile?.behavior.totalArticlesRead || 142;
  const totalTimeSpent = profile?.behavior.totalTimeSpent || 0;
  const engagementRate = profile?.behavior.engagementRate || 0;

  const formatTime = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  };

  const getEngagementEmoji = (rate: number): string => {
    if (rate >= 0.7) return '🔥';
    if (rate >= 0.4) return '👍';
    return '📈';
  };

  const formatRelativeTime = (timestamp: number): string => {
    const diffMs = Date.now() - timestamp;
    if (diffMs < 0) {
      return 'Just now';
    }

    const minutes = Math.floor(diffMs / (1000 * 60));
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;

    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;

    const days = Math.floor(hours / 24);
    if (days < 7) return `${days}d ago`;

    return new Date(timestamp).toLocaleDateString();
  };

  const displayedLikedArticles = likedArticles.slice(0, 6);

  const displayName = profileInfo?.fullName ?? 'Rayen';
  const displayEmail = profileInfo?.email ?? 'rayen@example.com';
  const displayTitle = profileInfo?.title?.trim();
  const displayOrg = profileInfo?.organization?.trim();
  const displayBio = profileInfo?.bio?.trim();

  return (
    <div className="p-8 text-white max-w-5xl mx-auto">
      <h1 className="text-3xl font-bold mb-8">Profile</h1>

      {/* Profile Card */}
      <div className="bg-gradient-to-r from-slate-900/70 to-slate-800/70 border border-slate-700 rounded-xl p-8 flex items-center space-x-8 mb-10 backdrop-blur-sm">
        <div className="w-24 h-24 rounded-full flex items-center justify-center shadow-lg overflow-hidden bg-gradient-to-br from-blue-500 to-purple-600">
          {profileInfo?.avatarUrl ? (
            <img
              src={profileInfo.avatarUrl}
              alt={`${displayName} avatar`}
              className="w-full h-full object-cover"
            />
          ) : (
            <span className="text-4xl font-bold text-white">{avatarInitial}</span>
          )}
        </div>
        <div className="flex-1">
          <h2 className="text-2xl font-bold">{displayName}</h2>
          <p className="text-slate-400">{displayEmail}</p>
          {(displayTitle || displayOrg) && (
            <p className="text-sm text-slate-400 mt-2">
              {[displayTitle, displayOrg].filter(Boolean).join(' • ')}
            </p>
          )}
          {displayBio && (
            <p className="text-sm text-slate-400 mt-3 max-w-xl leading-relaxed">
              {displayBio}
            </p>
          )}
          <div className="mt-3 flex gap-2">
            <span className="px-3 py-1 text-sm font-semibold rounded-full bg-[#64FFDA]/20 text-[#64FFDA]">
              Pro Member
            </span>
            {insights && (
              <span className="px-3 py-1 text-sm font-semibold rounded-full bg-purple-500/20 text-purple-300">
                {insights.readingPattern}
              </span>
            )}
          </div>
        </div>
        <button
          onClick={openEditModal}
          className="bg-[#64FFDA]/10 text-[#64FFDA] font-semibold px-5 py-2.5 rounded-lg hover:bg-[#64FFDA]/20 transition-all duration-200 hover:scale-105"
        >
          Edit Profile
        </button>
      </div>

      {/* Personalization Insights */}
      <div className="mb-10">
        <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
          <span>📊</span>
          Reading Analytics
        </h3>
        <PersonalizationInsights 
          insights={insights} 
          isLoading={isLoading}
        />
      </div>

      {/* Statistics Section */}
      <div className="mb-10">
        <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
          <span>📈</span>
          Your Activity
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-slate-900/50 border border-slate-800 rounded-lg p-6 hover:border-blue-500/50 transition-all">
            <ReadIcon />
            <p className="text-slate-400 text-sm mt-2">Articles Read</p>
            <p className="text-3xl font-bold text-white mt-1">{totalArticlesRead}</p>
            {profile && (
              <p className="text-xs text-slate-500 mt-1">
                Last active: {new Date(profile.behavior.lastActive).toLocaleDateString()}
              </p>
            )}
          </div>
          <div className="bg-slate-900/50 border border-slate-800 rounded-lg p-6 hover:border-purple-500/50 transition-all">
            <ViewedIcon />
            <p className="text-slate-400 text-sm mt-2">Total Reading Time</p>
            <p className="text-3xl font-bold text-white mt-1">{formatTime(totalTimeSpent)}</p>
            {insights && (
              <p className="text-xs text-slate-500 mt-1">
                Avg: {Math.floor(insights.averageReadTime / 60)}m {insights.averageReadTime % 60}s per article
              </p>
            )}
          </div>
          <div className="bg-slate-900/50 border border-slate-800 rounded-lg p-6 hover:border-green-500/50 transition-all">
            <FollowedIcon />
            <p className="text-slate-400 text-sm mt-2">Engagement Level</p>
            <div className="flex items-center gap-2 mt-1">
              <p className="text-3xl font-bold text-white">
                {Math.round(engagementRate * 100)}%
              </p>
              <span className="text-2xl">{getEngagementEmoji(engagementRate)}</span>
            </div>
            {insights && (
              <p className="text-xs text-slate-500 mt-1 capitalize">
                {insights.engagementLevel} engagement
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Preferences Section - Followed Topics */}
      <div className="mb-10">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-bold flex items-center gap-2">
            <span>🎯</span>
            Your Favorite Topics
          </h3>
          <div className="flex items-center gap-4">
            <button
              onClick={handleFavoriteReset}
              className="text-slate-400 text-xs font-semibold hover:text-white transition-transform hover:scale-105"
            >
              Reset Favorites
            </button>
            <button
              onClick={openTopicsModal}
              className="text-[#64FFDA] text-sm font-semibold hover:underline hover:scale-105 transition-transform"
            >
              Manage Topics
            </button>
          </div>
        </div>
        <div className="bg-slate-900/50 border border-slate-800 rounded-lg p-6">
          {resetNotice === 'success' && (
            <p className="mb-4 rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-4 py-2 text-sm text-emerald-200">
              Vos préférences ont été réinitialisées.
            </p>
          )}
          {resetNotice === 'error' && (
            <p className="mb-4 rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-2 text-sm text-red-200">
              Réinitialisation impossible pour le moment. Réessayez.
            </p>
          )}
          {followedTopics.length > 0 ? (
            <div className="flex flex-wrap gap-3">
              {followedTopics.map((topic, index) => {
                const topicData = insights?.topTopics.find(t => t.topic === topic);
                const isManualPinned = manualTopics.includes(topic) || Boolean(topicData?.manual);
                return (
                  <div 
                    key={topic}
                    className="group relative"
                  >
                    <span
                      className={`inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-full border transition-all cursor-pointer ${
                        isManualPinned
                          ? 'bg-gradient-to-r from-emerald-500/20 to-teal-500/20 text-emerald-200 border-emerald-400/40 hover:border-emerald-300/70'
                          : 'bg-gradient-to-r from-blue-500/20 to-purple-500/20 text-blue-300 border-blue-400/30 hover:border-blue-400/60'
                      }`}
                    >
                      {topic}
                      {isManualPinned && (
                        <span className="text-[10px] uppercase tracking-wide font-semibold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300">
                          Pinned
                        </span>
                      )}
                      {topicData && (
                        <span className="text-xs bg-white/10 px-2 py-0.5 rounded-full">
                          {Math.round(topicData.weight * 100)}%
                        </span>
                      )}
                    </span>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-slate-400 text-center py-4">
              Start reading articles to discover your interests!
            </p>
          )}
        </div>
      </div>

  {/* Liked Articles */}
      <div className="mb-10">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-bold flex items-center gap-2">
            <span>❤️</span>
            Liked Articles
          </h3>
          {likedArticles.length > 0 && (
            <span className="text-xs text-slate-400">
              {likedArticles.length} saved
            </span>
          )}
        </div>
        <div className="bg-slate-900/50 border border-slate-800 rounded-lg p-6">
          {likedArticles.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {displayedLikedArticles.map(({ article, likedAt }) => {
                const targetUrl = article.readMoreUrl || `#/article/${article.id}`;
                const isExternal = Boolean(article.readMoreUrl);

                return (
                  <a
                    key={`${article.id}-${likedAt}`}
                    href={targetUrl}
                    target={isExternal ? '_blank' : undefined}
                    rel={isExternal ? 'noopener noreferrer' : undefined}
                    className="flex flex-col h-full rounded-lg border border-slate-800 bg-gradient-to-br from-slate-900/60 to-slate-800/60 p-5 hover:border-[#64FFDA]/50 hover:bg-slate-900/80 transition-all duration-300"
                  >
                    <div className="flex items-center justify-between text-xs text-slate-400">
                      <span className="font-semibold text-slate-300">{article.source}</span>
                      <span>{formatRelativeTime(likedAt)}</span>
                    </div>
                    <h4 className="text-lg font-semibold text-white mt-3 leading-tight">
                      {article.headline}
                    </h4>
                    <p className="text-slate-400 text-sm mt-3">
                      {article.summaryBullets?.[0] || article.summary}
                    </p>
                    <div className="mt-auto pt-4 flex items-center justify-between text-xs text-slate-500">
                      <span className="px-2 py-1 rounded-full bg-slate-800/60 text-slate-300">
                        {article.topic}
                      </span>
                      <span>
                        Trust {article.trustScore}
                      </span>
                    </div>
                  </a>
                );
              })}
            </div>
          ) : (
            <p className="text-slate-400 text-center py-6">
              Tap the heart icon on any article to build your favorites list.
            </p>
          )}
        </div>
      </div>

      {/* Trusted Sources */}
      {insights && insights.topSources.length > 0 && (
        <div className="mb-10">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-xl font-bold flex items-center gap-2">
              <span>📰</span>
              Your Trusted Sources
            </h3>
          </div>
          <div className="bg-slate-900/50 border border-slate-800 rounded-lg p-6">
            <div className="space-y-4">
              {insights.topSources.map(({ source, weight }) => (
                <div key={source} className="flex items-center justify-between group hover:bg-slate-800/50 p-3 rounded-lg transition-all">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-slate-700 rounded-full flex items-center justify-center group-hover:bg-slate-600 transition-colors">
                      <span className="text-lg">📰</span>
                    </div>
                    <div>
                      <p className="font-semibold text-white">{source}</p>
                      <p className="text-xs text-slate-400">
                        {Math.round(weight * 100)}% preference
                      </p>
                    </div>
                  </div>
                  <div className="w-32 h-2 bg-slate-700 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-green-500 to-emerald-500 rounded-full transition-all duration-500"
                      style={{ width: `${weight * 100}%` }}
                    ></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Account Info */}
      <div>
        <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
          <span>⚙️</span>
          Account Information
        </h3>
        <div className="bg-slate-900/50 border border-slate-800 rounded-lg p-6 space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-slate-400 text-sm">Member Since</p>
              <p className="text-white font-semibold">
                {profile 
                  ? new Date(profile.createdAt).toLocaleDateString('en-US', { 
                      year: 'numeric', 
                      month: 'long', 
                      day: 'numeric' 
                    })
                  : 'October 2023'
                }
              </p>
            </div>
            <div>
              <p className="text-slate-400 text-sm">Profile Updated</p>
              <p className="text-white font-semibold">
                {profile 
                  ? new Date(profile.updatedAt).toLocaleDateString('en-US', { 
                      year: 'numeric', 
                      month: 'long', 
                      day: 'numeric' 
                    })
                  : 'Recently'
                }
              </p>
            </div>
          </div>
          {insights && (
            <div className="pt-4 border-t border-slate-700">
              <p className="text-slate-400 text-sm mb-2">Diversity Score</p>
              <div className="flex items-center gap-4">
                <div className="flex-1 h-3 bg-slate-700 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 rounded-full transition-all duration-500"
                    style={{ width: `${insights.diversityScore * 100}%` }}
                  ></div>
                </div>
                <span className="text-white font-bold text-lg">
                  {Math.round(insights.diversityScore * 100)}%
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-2">
                {insights.diversityScore >= 0.7 
                  ? "🌟 Great! You explore diverse topics"
                  : insights.diversityScore >= 0.4
                  ? "👍 Good variety in your reading"
                  : "💡 Try exploring more topics!"
                }
              </p>
            </div>
          )}
        </div>
      </div>

      {isEditOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur">
          <div className="w-full max-w-2xl bg-slate-900 border border-slate-700 rounded-2xl p-8 shadow-2xl">
            <div className="flex items-start justify-between mb-6">
              <div>
                <h2 className="text-2xl font-semibold text-white">Edit Profile</h2>
                <p className="text-slate-400 text-sm mt-1">
                  Update how your account appears across NewsBot AI.
                </p>
              </div>
              <button
                onClick={closeEditModal}
                className="text-slate-400 hover:text-white transition-colors"
                aria-label="Close edit profile"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="flex flex-col md:flex-row md:items-center gap-5 border border-slate-800 rounded-xl p-5 bg-slate-900/60">
                <div className="w-20 h-20 rounded-full overflow-hidden bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                  {avatarPreview ? (
                    <img
                      src={avatarPreview}
                      alt="Avatar preview"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="text-2xl font-bold text-white">{avatarInitial}</span>
                  )}
                </div>
                <div className="flex-1 flex flex-col gap-2">
                  <div className="flex flex-wrap items-center gap-3">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="px-4 py-2 text-sm font-semibold rounded-lg bg-slate-800 border border-slate-700 text-slate-200 hover:border-[#64FFDA]/60 hover:text-white transition-all"
                    >
                      Upload Photo
                    </button>
                    {avatarPreview && (
                      <button
                        type="button"
                        onClick={handleAvatarRemove}
                        className="px-4 py-2 text-sm font-medium text-slate-400 hover:text-white transition-colors"
                      >
                        Remove
                      </button>
                    )}
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleAvatarUpload}
                    />
                  </div>
                  <p className="text-xs text-slate-500">
                    Formats acceptés : PNG, JPG, GIF. Taille maximale 1.5&nbsp;MB.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <label className="flex flex-col gap-2 text-sm text-slate-300">
                  Full Name
                  <input
                    type="text"
                    name="fullName"
                    value={formState.fullName}
                    onChange={handleInputChange}
                    className="w-full rounded-lg bg-slate-800 border border-slate-700 focus:border-[#64FFDA] focus:ring-2 focus:ring-[#64FFDA]/40 px-4 py-2.5 text-white transition-all"
                    placeholder="Enter your full name"
                    required
                  />
                </label>
                <label className="flex flex-col gap-2 text-sm text-slate-300">
                  Email
                  <input
                    type="email"
                    name="email"
                    value={formState.email}
                    onChange={handleInputChange}
                    className="w-full rounded-lg bg-slate-800 border border-slate-700 focus:border-[#64FFDA] focus:ring-2 focus:ring-[#64FFDA]/40 px-4 py-2.5 text-white transition-all"
                    placeholder="you@example.com"
                    required
                  />
                </label>
                <label className="flex flex-col gap-2 text-sm text-slate-300">
                  Title
                  <input
                    type="text"
                    name="title"
                    value={formState.title}
                    onChange={handleInputChange}
                    className="w-full rounded-lg bg-slate-800 border border-slate-700 focus:border-[#64FFDA] focus:ring-2 focus:ring-[#64FFDA]/40 px-4 py-2.5 text-white transition-all"
                    placeholder="e.g., Senior Analyst"
                  />
                </label>
                <label className="flex flex-col gap-2 text-sm text-slate-300">
                  Organization
                  <input
                    type="text"
                    name="organization"
                    value={formState.organization}
                    onChange={handleInputChange}
                    className="w-full rounded-lg bg-slate-800 border border-slate-700 focus:border-[#64FFDA] focus:ring-2 focus:ring-[#64FFDA]/40 px-4 py-2.5 text-white transition-all"
                    placeholder="Company or team"
                  />
                </label>
              </div>

              <label className="flex flex-col gap-2 text-sm text-slate-300">
                Bio
                <textarea
                  name="bio"
                  value={formState.bio}
                  onChange={handleInputChange}
                  rows={4}
                  className="w-full rounded-lg bg-slate-800 border border-slate-700 focus:border-[#64FFDA] focus:ring-2 focus:ring-[#64FFDA]/40 px-4 py-2.5 text-white transition-all"
                  placeholder="Tell others what you track or care about."
                />
              </label>

              {errorMessage && (
                <div className="px-4 py-3 rounded-lg border border-red-500/40 bg-red-500/10 text-sm text-red-200">
                  {errorMessage}
                </div>
              )}

              {editStatus === 'saved' && !errorMessage && (
                <div className="px-4 py-3 rounded-lg border border-emerald-500/40 bg-emerald-500/10 text-sm text-emerald-200">
                  Profile updated successfully.
                </div>
              )}

              <div className="flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={closeEditModal}
                  className="px-4 py-2 text-sm font-medium text-slate-300 hover:text-white transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={editStatus === 'saving'}
                  className={`px-5 py-2.5 rounded-lg text-sm font-semibold transition-colors border ${
                    editStatus === 'saving'
                      ? 'bg-slate-800/60 border-slate-700 text-slate-400 cursor-not-allowed'
                      : 'bg-[#64FFDA]/10 border-[#64FFDA]/40 text-[#64FFDA] hover:bg-[#64FFDA]/20'
                  }`}
                >
                  {editStatus === 'saving' ? 'Saving…' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isTopicsOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur">
          <div className="w-full max-w-3xl bg-slate-900 border border-slate-700 rounded-2xl p-8 shadow-2xl">
            <div className="flex items-start justify-between mb-6">
              <div>
                <h2 className="text-2xl font-semibold text-white">Manage Topics</h2>
                <p className="text-slate-400 text-sm mt-1">
                  Sélectionnez les thématiques que vous souhaitez suivre en priorité (max 8).
                </p>
              </div>
              <button
                onClick={closeTopicsModal}
                className="text-slate-400 hover:text-white transition-colors"
                aria-label="Close manage topics"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[340px] overflow-y-auto pr-1">
              {supportedTopics.map(topic => {
                const isSelected = selectedTopics.includes(topic);
                return (
                  <button
                    key={topic}
                    type="button"
                    onClick={() => toggleTopicSelection(topic)}
                    className={`flex items-center justify-between px-4 py-3 rounded-lg border transition-all ${
                      isSelected
                        ? 'border-[#64FFDA]/60 bg-[#64FFDA]/10 text-white shadow-lg'
                        : 'border-slate-800 bg-slate-800/60 text-slate-300 hover:border-slate-600'
                    }`}
                  >
                    <span className="text-sm font-semibold">{topic}</span>
                    <span className={`text-xs font-medium px-2 py-1 rounded-full ${
                      isSelected ? 'bg-[#64FFDA]/30 text-[#64FFDA]' : 'bg-slate-900 text-slate-400'
                    }`}>
                      {isSelected ? 'Following' : 'Add'}
                    </span>
                  </button>
                );
              })}
            </div>

            {topicsError && (
              <div className="mt-5 px-4 py-3 rounded-lg border border-red-500/40 bg-red-500/10 text-sm text-red-200">
                {topicsError}
              </div>
            )}

            <div className="mt-6 flex items-center justify-between">
              <button
                onClick={handleTopicsReset}
                className="text-sm text-slate-400 hover:text-white transition-colors"
              >
                Clear selection
              </button>
              <div className="flex items-center gap-3">
                <button
                  onClick={closeTopicsModal}
                  className="px-4 py-2 text-sm font-medium text-slate-300 hover:text-white transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleTopicsSave}
                  className="px-5 py-2.5 rounded-lg text-sm font-semibold bg-[#64FFDA]/10 border border-[#64FFDA]/40 text-[#64FFDA] hover:bg-[#64FFDA]/20 transition-colors"
                >
                  Save Topics
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Profile;