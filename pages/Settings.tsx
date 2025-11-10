import React, { useEffect, useRef, useState } from 'react';
import { ProfileIcon, ChatIcon } from '../components/icons/IconDefs';
import { NotificationIcon, AppearanceIcon, ContentIcon, AccessibilityIcon, PrivacyIcon, InfoIcon } from '../components/icons/MoreIcons';
import { useUser } from '../contexts/UserContext';
import { personalizationEngine } from '../services/personalizationEngine';

type NotificationSettings = {
    breakingNews: boolean;
    dailySummary: boolean;
    weeklyNewsletter: boolean;
};

type AppearanceSettings = {
    theme: 'Dark' | 'Light';
    contentDensity: 'Compact' | 'Standard' | 'Comfortable';
    fontSize: 'Small' | 'Medium' | 'Large';
};

type ContentSettings = {
    region: 'Global' | 'United States' | 'Europe' | 'Asia' | 'Africa';
};

type AccessibilitySettings = {
    reduceMotion: boolean;
};

type PrivacySettings = {
    shareAnalytics: boolean;
};

type StoredSettings = {
    notifications: NotificationSettings;
    appearance: AppearanceSettings;
    content: ContentSettings;
    accessibility: AccessibilitySettings;
    privacy: PrivacySettings;
    activeTab: string;
};

const SETTINGS_STORAGE_KEY = 'newsbot_settings_preferences';
const ACTIVE_TAB_STORAGE_KEY = 'newsbot_settings_active_tab';

const DEFAULT_SETTINGS: StoredSettings = {
    activeTab: 'profile',
    notifications: {
        breakingNews: true,
        dailySummary: true,
        weeklyNewsletter: false,
    },
    appearance: {
        theme: 'Dark',
        contentDensity: 'Standard',
        fontSize: 'Medium',
    },
    content: {
        region: 'Global',
    },
    accessibility: {
        reduceMotion: false,
    },
    privacy: {
        shareAnalytics: true,
    },
};

const loadStoredSettings = (): StoredSettings => {
    if (typeof window === 'undefined') {
        return DEFAULT_SETTINGS;
    }

    try {
        const raw = localStorage.getItem(SETTINGS_STORAGE_KEY);
        if (!raw) {
            return DEFAULT_SETTINGS;
        }

        const parsed = JSON.parse(raw);
        return {
            activeTab: typeof parsed.activeTab === 'string' ? parsed.activeTab : DEFAULT_SETTINGS.activeTab,
            notifications: {
                ...DEFAULT_SETTINGS.notifications,
                ...(parsed.notifications ?? {}),
            },
            appearance: {
                ...DEFAULT_SETTINGS.appearance,
                ...(parsed.appearance ?? {}),
            },
            content: {
                ...DEFAULT_SETTINGS.content,
                ...(parsed.content ?? {}),
            },
            accessibility: {
                ...DEFAULT_SETTINGS.accessibility,
                ...(parsed.accessibility ?? {}),
            },
            privacy: {
                ...DEFAULT_SETTINGS.privacy,
                ...(parsed.privacy ?? {}),
            },
        };
    } catch (error) {
        console.error('Failed to load settings from storage:', error);
        return DEFAULT_SETTINGS;
    }
};

const loadStoredActiveTab = (): string => {
    if (typeof window === 'undefined') {
        return DEFAULT_SETTINGS.activeTab;
    }

    const stored = localStorage.getItem(ACTIVE_TAB_STORAGE_KEY);
    return stored || DEFAULT_SETTINGS.activeTab;
};

const ToggleSwitch: React.FC<{ label: string; enabled: boolean; onToggle: () => void, description?: string }> = ({ label, enabled, onToggle, description }) => (
  <div className="flex items-center justify-between py-4">
    <div>
        <span className="text-slate-300 font-medium">{label}</span>
        {description && <p className="text-sm text-slate-500">{description}</p>}
    </div>
    <button
      onClick={onToggle}
      className={`relative inline-flex items-center h-6 rounded-full w-11 transition-colors flex-shrink-0 ${enabled ? 'bg-[#64FFDA]' : 'bg-slate-600'}`}
    >
      <span
        className={`inline-block w-4 h-4 transform bg-white rounded-full transition-transform ${enabled ? 'translate-x-6' : 'translate-x-1'}`}
      />
    </button>
  </div>
);

const SettingsRadio: React.FC<{ options: string[], selected: string, onSelect: (value: string) => void }> = ({ options, selected, onSelect }) => (
    <div className="flex space-x-2">
        {options.map(option => (
             <button 
                key={option}
                onClick={() => onSelect(option)}
                className={`px-4 py-2 rounded-md font-semibold transition-colors text-sm ${selected === option ? 'bg-[#64FFDA] text-[#0A192F]' : 'bg-slate-700 hover:bg-slate-600'}`}>
                {option}
            </button>
        ))}
    </div>
);

const SettingsSelect: React.FC<{ label: string, options: string[], selected: string, onSelect: (value: string) => void }> = ({ label, options, selected, onSelect }) => (
    <div className="py-4">
        <label className="block text-slate-300 font-medium mb-2">{label}</label>
        <select 
            value={selected}
            onChange={(e) => onSelect(e.target.value)}
            className="w-full bg-slate-800 text-white p-2 rounded border border-slate-700 focus:outline-none focus:ring-2 focus:ring-[#64FFDA] form-select"
        >
            {options.map(option => <option key={option} value={option}>{option}</option>)}
        </select>
    </div>
);

const Settings: React.FC = () => {
    const { userId, refreshProfile } = useUser();

    const [initialSettings] = useState<StoredSettings>(() => loadStoredSettings());
    const [activeTab, setActiveTab] = useState<string>(() => {
        const storedTab = loadStoredActiveTab();
        return initialSettings.activeTab || storedTab;
    });

    const [notifications, setNotifications] = useState<NotificationSettings>(initialSettings.notifications);
    const [appearance, setAppearance] = useState<AppearanceSettings>(initialSettings.appearance);
    const [content, setContent] = useState<ContentSettings>(initialSettings.content);
    const [accessibility, setAccessibility] = useState<AccessibilitySettings>(initialSettings.accessibility);
    const [privacy, setPrivacy] = useState<PrivacySettings>(initialSettings.privacy);
    const [apiKey, setApiKey] = useState<string>(() => localStorage.getItem('gemini_api_key') || '');
    const [apiKeySaved, setApiKeySaved] = useState(false);
    const [settingsSaved, setSettingsSaved] = useState(false);
    const [settingsError, setSettingsError] = useState<string | null>(null);
    const saveFeedbackTimeout = useRef<number | null>(null);

    const clearSaveFeedback = () => {
        if (saveFeedbackTimeout.current) {
            window.clearTimeout(saveFeedbackTimeout.current);
            saveFeedbackTimeout.current = null;
        }
    };

    useEffect(() => {
        return () => clearSaveFeedback();
    }, []);

    const markDirty = () => {
        clearSaveFeedback();
        setSettingsSaved(false);
        setSettingsError(null);
    };

    const buildSettingsPayload = (): StoredSettings => ({
        notifications,
        appearance,
        content,
        accessibility,
        privacy,
        activeTab,
    });

    const handleTabChange = (tabId: string) => {
        setActiveTab(tabId);
        try {
            localStorage.setItem(ACTIVE_TAB_STORAGE_KEY, tabId);
        } catch (error) {
            console.error('Failed to persist active settings tab:', error);
        }
    };

    const handleSaveChanges = () => {
        try {
            const payload = buildSettingsPayload();
            localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(payload));
            localStorage.setItem(ACTIVE_TAB_STORAGE_KEY, activeTab);
            setSettingsSaved(true);
            setSettingsError(null);
            clearSaveFeedback();
            saveFeedbackTimeout.current = window.setTimeout(() => {
                setSettingsSaved(false);
                saveFeedbackTimeout.current = null;
            }, 3000);
        } catch (error) {
            console.error('Failed to save settings:', error);
            setSettingsError('Unable to save settings. Please check browser storage permissions.');
        }
    };

    const handleNotificationToggle = (key: keyof NotificationSettings) => {
        setNotifications(prev => ({
            ...prev,
            [key]: !prev[key],
        }));
        markDirty();
    };

    const setAppearanceValue = <K extends keyof AppearanceSettings>(key: K, value: AppearanceSettings[K]) => {
        setAppearance(prev => ({
            ...prev,
            [key]: value,
        }));
        markDirty();
    };

    const setContentValue = <K extends keyof ContentSettings>(key: K, value: ContentSettings[K]) => {
        setContent(prev => ({
            ...prev,
            [key]: value,
        }));
        markDirty();
    };

    const setAccessibilityValue = <K extends keyof AccessibilitySettings>(key: K, value: AccessibilitySettings[K]) => {
        setAccessibility(prev => ({
            ...prev,
            [key]: value,
        }));
        markDirty();
    };

    const setPrivacyValue = <K extends keyof PrivacySettings>(key: K, value: PrivacySettings[K]) => {
        setPrivacy(prev => ({
            ...prev,
            [key]: value,
        }));
        markDirty();
    };

    const handleClearChatHistory = () => {
        if (window.confirm("Are you sure you want to permanently delete all chat history? This action cannot be undone.")) {
            localStorage.setItem('newsbot_clear_chat_trigger', Date.now().toString());
            alert('✅ All assistant chat history has been cleared.');
        }
    }

    const handleSaveApiKey = () => {
        if (apiKey.trim()) {
            localStorage.setItem('gemini_api_key', apiKey.trim());
            setApiKeySaved(true);
            setTimeout(() => setApiKeySaved(false), 3000);
        }
    }

    const handleTestApiKey = async () => {
        if (!apiKey.trim()) {
            alert('Please enter an API key first');
            return;
        }
        
        try {
            const response = await fetch(`https://generativelanguage.googleapis.com/v1/models?key=${apiKey.trim()}`);
            if (response.ok) {
                alert('✅ API Key is valid!');
            } else {
                alert('❌ API Key is invalid. Please check and try again.');
            }
        } catch (error) {
            alert('❌ Error testing API key. Please check your connection.');
        }
    }

    const handleResetFeed = () => {
        if (!userId) {
            return;
        }

        if (!window.confirm('Reset personalized recommendations? This will clear your preference model but keep followed topics.')) {
            return;
        }

        try {
            personalizationEngine.resetUserProfile(userId);
            refreshProfile();
            alert('✅ Your personalized feed has been reset.');
        } catch (error) {
            console.error('Failed to reset personalization data:', error);
            alert('❌ Unable to reset personalization data. Please try again.');
        }
    };

    const navigationItems = [
        { id: 'profile', label: 'Profile & Account', icon: <ProfileIcon /> },
        { id: 'appearance', label: 'Appearance', icon: <AppearanceIcon /> },
        { id: 'notifications', label: 'Notifications', icon: <NotificationIcon /> },
        { id: 'content', label: 'Content & Personalization', icon: <ContentIcon /> },
        { id: 'assistant', label: 'Assistant', icon: <ChatIcon /> },
        { id: 'accessibility', label: 'Accessibility', icon: <AccessibilityIcon /> },
        { id: 'privacy', label: 'Privacy & Data', icon: <PrivacyIcon /> },
        { id: 'about', label: 'About', icon: <InfoIcon /> },
    ];

    const renderContent = () => {
        switch(activeTab) {
            case 'profile':
                return (
                    <div className="bg-slate-900/50 border border-slate-800 rounded-lg p-6">
                        <h2 className="text-xl font-bold border-b border-slate-700 pb-2 mb-4">Account Information</h2>
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <div><p className="font-semibold">Email Address</p><p className="text-slate-400">rayen@example.com</p></div>
                                <button className="bg-slate-700 hover:bg-slate-600 text-white font-semibold px-4 py-2 rounded-md text-sm transition-colors">Change</button>
                            </div>
                            <div className="flex items-center justify-between">
                                <div><p className="font-semibold">Password</p><p className="text-slate-400">••••••••</p></div>
                                <button className="bg-slate-700 hover:bg-slate-600 text-white font-semibold px-4 py-2 rounded-md text-sm transition-colors">Change Password</button>
                            </div>
                            <div className="border-t border-slate-700 pt-4 mt-4">
                                <button className="text-red-400 hover:text-red-500 hover:underline">Delete Account</button>
                            </div>
                        </div>
                    </div>
                );
            case 'appearance':
                return (
                    <>
                        <div className="bg-slate-900/50 border border-slate-800 rounded-lg p-6 mb-6">
                            <h2 className="text-xl font-bold border-b border-slate-700 pb-2 mb-4">Interface</h2>
                            <div className="py-4"><p className="font-medium text-slate-300 mb-2">Theme</p><SettingsRadio options={['Dark', 'Light']} selected={appearance.theme} onSelect={(val) => setAppearanceValue('theme', val as AppearanceSettings['theme'])} /></div>
                            <div className="py-4"><p className="font-medium text-slate-300 mb-2">Content Density</p><SettingsRadio options={['Compact', 'Standard', 'Comfortable']} selected={appearance.contentDensity} onSelect={(val) => setAppearanceValue('contentDensity', val as AppearanceSettings['contentDensity'])} /></div>
                        </div>
                        <div className="bg-slate-900/50 border border-slate-800 rounded-lg p-6">
                            <h2 className="text-xl font-bold border-b border-slate-700 pb-2 mb-4">Text</h2>
                            <div className="py-4"><p className="font-medium text-slate-300 mb-2">Font Size</p><SettingsRadio options={['Small', 'Medium', 'Large']} selected={appearance.fontSize} onSelect={(val) => setAppearanceValue('fontSize', val as AppearanceSettings['fontSize'])} /></div>
                        </div>
                    </>
                );
            case 'notifications':
                return (
                    <div className="bg-slate-900/50 border border-slate-800 rounded-lg p-6">
                        <h2 className="text-xl font-bold border-b border-slate-700 pb-2 mb-4">Email Notifications</h2>
                        <div className="divide-y divide-slate-800">
                            <ToggleSwitch label="Breaking News Alerts" enabled={notifications.breakingNews} onToggle={() => handleNotificationToggle('breakingNews')} description="Get notified instantly about major global events." />
                            <ToggleSwitch label="Daily Summary Email" enabled={notifications.dailySummary} onToggle={() => handleNotificationToggle('dailySummary')} description="A roundup of the day's top stories, delivered to your inbox."/>
                            <ToggleSwitch label="Weekly Insights Newsletter" enabled={notifications.weeklyNewsletter} onToggle={() => handleNotificationToggle('weeklyNewsletter')} description="A curated newsletter with deep dives and analysis."/>
                        </div>
                    </div>
                );
            case 'content':
                return (
                    <div className="bg-slate-900/50 border border-slate-800 rounded-lg p-6">
                         <h2 className="text-xl font-bold border-b border-slate-700 pb-2 mb-4">Feed Customization</h2>
                         <SettingsSelect label="News Region" options={['Global', 'United States', 'Europe', 'Asia', 'Africa']} selected={content.region} onSelect={(val) => setContentValue('region', val as ContentSettings['region'])} />
                         <div className="flex items-center justify-between py-4 border-t border-slate-800">
                            <div><p className="font-semibold">Followed Topics</p><p className="text-slate-400">Manage the topics that power your 'For You' feed.</p></div>
                            <button className="bg-slate-700 hover:bg-slate-600 text-white font-semibold px-4 py-2 rounded-md text-sm transition-colors">Manage Topics</button>
                        </div>
                         <div className="border-t border-slate-800 pt-4 mt-4">
                            <h3 className="font-semibold text-amber-400 mb-2">Reset Personalization</h3>
                            <p className="text-sm text-slate-400 mb-3">This will reset your 'For You' feed algorithm. Your followed topics will not be affected.</p>
                            <button onClick={handleResetFeed} className="bg-amber-500/20 text-amber-400 font-semibold px-4 py-2 rounded-md hover:bg-amber-500/30 transition-colors duration-200 text-sm">Reset Feed</button>
                        </div>
                    </div>
                );
            case 'assistant':
                return (
                    <>
                        <div className="bg-slate-900/50 border border-slate-800 rounded-lg p-6 mb-6">
                            <h2 className="text-xl font-bold border-b border-slate-700 pb-2 mb-4">🔑 Assistant API Configuration</h2>
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-slate-300 font-medium mb-2">Google Gemini API Key</label>
                                    <input 
                                        type="password"
                                        value={apiKey}
                                        onChange={(e) => {
                                            setApiKey(e.target.value);
                                            setApiKeySaved(false);
                                        }}
                                        placeholder="Enter your Gemini API key"
                                        className="w-full bg-slate-800 text-white p-3 rounded border border-slate-700 focus:outline-none focus:ring-2 focus:ring-[#64FFDA] font-mono text-sm"
                                    />
                                    <p className="text-xs text-slate-400 mt-2">
                                        Your API key is stored locally in your browser and never sent to our servers.
                                    </p>
                                </div>
                                <div className="flex gap-3">
                                    <button 
                                        onClick={handleSaveApiKey}
                                        className="bg-[#64FFDA] text-[#0A192F] font-semibold px-4 py-2 rounded-md hover:opacity-90 transition-opacity text-sm"
                                    >
                                        {apiKeySaved ? '✓ Saved!' : 'Save API Key'}
                                    </button>
                                    <button 
                                        onClick={handleTestApiKey}
                                        className="bg-slate-700 hover:bg-slate-600 text-white font-semibold px-4 py-2 rounded-md text-sm transition-colors"
                                    >
                                        Test Connection
                                    </button>
                                </div>
                                <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
                                    <h4 className="font-semibold text-blue-400 mb-2 flex items-center gap-2">
                                        <span>ℹ️</span>
                                        How to get an API key
                                    </h4>
                                    <ol className="text-sm text-slate-300 space-y-1 ml-6 list-decimal">
                                        <li>Visit <a href="https://aistudio.google.com/apikey" target="_blank" rel="noopener noreferrer" className="text-[#64FFDA] hover:underline">Google AI Studio</a></li>
                                        <li>Sign in with your Google account</li>
                                        <li>Click "Create API Key"</li>
                                        <li>Copy the key and paste it above</li>
                                    </ol>
                                    <p className="text-xs text-slate-400 mt-3">
                                        <strong>Note:</strong> Gemini API offers a generous free tier. No credit card required to start!
                                    </p>
                                </div>
                            </div>
                        </div>
                        <div className="bg-slate-900/50 border border-slate-800 rounded-lg p-6">
                            <h2 className="text-xl font-bold border-b border-slate-700 pb-2 mb-4">Chat History</h2>
                            <div className="border-t border-red-500/30 bg-red-500/10 p-4 rounded-lg">
                                <h3 className="font-semibold text-red-400 mb-2">Clear History</h3>
                                <p className="text-sm text-slate-400 mb-3">This will permanently delete all your conversations with the NewsBot Assistant.</p>
                                <button onClick={handleClearChatHistory} className="bg-red-500/20 text-red-400 font-semibold px-4 py-2 rounded-md hover:bg-red-500/30 transition-colors duration-200 text-sm w-full text-center">Clear All Chats</button>
                            </div>
                        </div>
                    </>
                );
            case 'accessibility':
                 return (
                    <div className="bg-slate-900/50 border border-slate-800 rounded-lg p-6">
                        <h2 className="text-xl font-bold border-b border-slate-700 pb-2 mb-4">Visuals</h2>
                        <div className="divide-y divide-slate-800">
                           <ToggleSwitch label="Reduce Motion" enabled={accessibility.reduceMotion} onToggle={() => setAccessibilityValue('reduceMotion', !accessibility.reduceMotion)} description="Disables decorative animations and transitions." />
                        </div>
                    </div>
                );
            case 'privacy':
                return (
                    <div className="bg-slate-900/50 border border-slate-800 rounded-lg p-6">
                        <h2 className="text-xl font-bold border-b border-slate-700 pb-2 mb-4">Data Management</h2>
                        <div className="divide-y divide-slate-800">
                           <ToggleSwitch label="Share Anonymized Analytics" enabled={privacy.shareAnalytics} onToggle={() => setPrivacyValue('shareAnalytics', !privacy.shareAnalytics)} description="Help us improve NewsBot AI by sharing anonymous usage data." />
                        </div>
                         <div className="flex items-center justify-between py-4 border-t border-slate-800">
                            <div><p className="font-semibold">Reading History</p><p className="text-slate-400">View or clear your reading history.</p></div>
                            <button className="bg-slate-700 hover:bg-slate-600 text-white font-semibold px-4 py-2 rounded-md text-sm transition-colors">Manage History</button>
                        </div>
                         <div className="flex items-center justify-between py-4 border-t border-slate-800">
                            <div><p className="font-semibold">Export Your Data</p><p className="text-slate-400">Download an archive of your data.</p></div>
                            <button className="bg-slate-700 hover:bg-slate-600 text-white font-semibold px-4 py-2 rounded-md text-sm transition-colors">Request Export</button>
                        </div>
                    </div>
                );
            case 'about':
                return (
                    <div className="bg-slate-900/50 border border-slate-800 rounded-lg p-6">
                        <h2 className="text-xl font-bold border-b border-slate-700 pb-2 mb-4">About NewsBot AI</h2>
                        <p className="text-slate-300">Version: 1.0.0</p>
                        <p className="text-slate-400 mt-2">A sophisticated news intelligence platform.</p>
                        <div className="mt-6 border-t border-slate-800 pt-4 space-x-4">
                            <a href="#" className="text-[#64FFDA] hover:underline">Terms of Service</a>
                            <a href="#" className="text-[#64FFDA] hover:underline">Privacy Policy</a>
                        </div>
                    </div>
                );
            default: return null;
        }
    }

    return (
        <div className="p-8 text-white h-screen overflow-hidden flex flex-col">
            <h1 className="text-3xl font-bold mb-8 flex-shrink-0">Settings</h1>
            <div className="flex-1 flex gap-12 overflow-hidden">
                {/* Left Navigation */}
                <aside className="w-1/4 flex-shrink-0">
                    <nav className="flex flex-col space-y-2">
                    {navigationItems.map(item => {
                        const isActive = activeTab === item.id;
                        return (
                        <button
                            key={item.id}
                            onClick={() => handleTabChange(item.id)}
                            className={`flex items-center space-x-3 p-3 rounded-lg text-left transition-colors duration-200 ${isActive ? 'bg-slate-700 text-[#64FFDA]' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}
                        >
                            {React.cloneElement(item.icon, { className: `w-5 h-5 flex-shrink-0 ${isActive ? 'text-[#64FFDA]' : 'text-slate-400'}` })}
                            <span className="font-semibold">{item.label}</span>
                        </button>
                        );
                    })}
                    </nav>
                </aside>
                {/* Right Content */}
                <main className="flex-1 overflow-y-auto pb-24">
                   {renderContent()}
                </main>
            </div>
             {/* Save Button */}
            <div className="flex-shrink-0 sticky-footer">
                <div className="flex items-center justify-between mt-4 border-t border-slate-700 pt-4 bg-gradient-to-br from-[#0A192F] to-[#122340] px-2">
                    <div className="min-h-[24px]">
                        {settingsSaved && <span className="text-[#64FFDA] font-semibold">✓ Settings saved</span>}
                        {!settingsSaved && settingsError && <span className="text-red-400 text-sm">{settingsError}</span>}
                    </div>
                    <button onClick={handleSaveChanges} className="bg-[#64FFDA] text-[#0A192F] font-bold px-6 py-3 rounded-md hover:opacity-90 transition-opacity duration-200">
                        Save Changes
                    </button>
                </div>
            </div>
        </div>
    );
};

export default Settings;