import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import type { ChatMessage, NewsArticle, WebGroundingSource, ChatSession } from '../types';
import { MOCK_NEWS_ARTICLES } from '../constants';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { SendIcon, ChatIcon, CloseIcon, PlusIcon, BotIcon, SparklesIcon, LinkIcon, ExpandIcon, MessageIcon, SettingsIcon } from './icons/IconDefs';
import { GoogleGenAI, Chat, ApiError } from '@google/genai';

const LoadingIndicator: React.FC = () => (
  <div className="flex items-center space-x-1">
    <span className="text-slate-400">NewsBot is thinking</span>
    <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-pulse [animation-delay:-0.3s]"></div>
    <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-pulse [animation-delay:-0.15s]"></div>
    <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-pulse"></div>
  </div>
);

const PromptSuggestions: React.FC<{ onSelect: (prompt: string) => void }> = ({ onSelect }) => {
  const suggestions = [
    "Summarize today's geopolitics news",
    "What are the latest breakthroughs in fusion energy?",
    "What is quantum computing?",
    "Explain the impact of the new AI regulation on the tech industry.",
  ];
  return (
    <div className="p-6 pt-0">
      <p className="text-sm text-slate-400 mb-3 text-center">Or try one of these prompts</p>
      <div className="grid grid-cols-2 gap-2">
        {suggestions.map((s, i) => (
          <button 
            key={i} 
            onClick={() => onSelect(s)}
            className="text-left text-sm p-3 bg-slate-800/50 hover:bg-slate-700/80 rounded-lg transition-colors text-slate-300"
          >
            {s}
          </button>
        ))}
      </div>
    </div>
  );
};

const ExpandedPromptSuggestions: React.FC<{ onSelect: (prompt: string) => void }> = ({ onSelect }) => {
  const categories = {
    "Deep Dive & Analysis": [
      "Analyze the long-term economic impact of the new trade agreement.",
      "Compare media bias in the coverage of the recent election.",
      "What are the key drivers behind the global chip shortage?",
      "Provide a SWOT analysis of the leading company in the EV market.",
    ],
    "Creative & Forecasting": [
      "Write a news headline from the year 2040.",
      "Forecast three potential scenarios for the future of space tourism.",
      "Draft a press release for a breakthrough in carbon capture technology.",
      "What is a contrarian view on the future of remote work?",
    ]
  };
  return (
    <div className="p-6 text-white flex-1 flex flex-col justify-center">
        <h3 className="text-2xl font-bold text-center mb-6">Prompt Library</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {Object.entries(categories).map(([category, prompts]) => (
                <div key={category} className="bg-slate-900/50 p-4 rounded-lg">
                    <h4 className="font-semibold text-slate-300 mb-3">{category}</h4>
                    <div className="space-y-2">
                        {prompts.map((prompt, i) => (
                             <button 
                                key={i} 
                                onClick={() => onSelect(prompt)}
                                className="w-full text-left text-sm p-3 bg-slate-800/50 hover:bg-slate-700/80 rounded-lg transition-colors text-slate-300"
                            >
                                {prompt}
                            </button>
                        ))}
                    </div>
                </div>
            ))}
        </div>
    </div>
  );
};


const SourceList: React.FC<{ sources: WebGroundingSource[] }> = ({ sources }) => (
  <div className="mt-3 border-t border-slate-700/50 pt-3">
    <h4 className="text-xs font-semibold text-slate-400 mb-2">Sources:</h4>
    <div className="flex flex-wrap gap-2">
      {sources.map((source, i) => (
        <a 
          key={i} 
          href={source.uri} 
          target="_blank" 
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 text-xs bg-slate-700/50 text-slate-300 hover:bg-slate-700 px-2 py-1 rounded-md transition-colors"
        >
          <LinkIcon />
          <span className="truncate max-w-[200px]">{source.title || new URL(source.uri).hostname}</span>
        </a>
      ))}
    </div>
  </div>
);

const ChatHistorySidebar: React.FC<{
  chats: Record<string, ChatSession>;
  activeChatId: string | null;
  onSelectChat: (id: string) => void;
  onNewChat: () => void;
}> = ({ chats, activeChatId, onSelectChat, onNewChat }) => {
    return (
        <div className="w-64 bg-slate-900/50 border-r border-slate-800 flex flex-col h-full p-2">
            <button onClick={onNewChat} className="flex items-center justify-center space-x-2 w-full p-2 mb-2 bg-slate-800/70 hover:bg-slate-700/90 rounded-lg text-white font-semibold transition-colors">
                <PlusIcon />
                <span>New Chat</span>
            </button>
            <div className="flex-1 overflow-y-auto space-y-1">
                {/* Fix: Explicitly type 'chat' as ChatSession to resolve property access errors. */}
                {Object.values(chats).reverse().map((chat: ChatSession) => (
                    <button 
                        key={chat.id}
                        onClick={() => onSelectChat(chat.id)}
                        className={`w-full text-left flex items-center space-x-2 p-2 rounded-md truncate text-sm transition-colors ${activeChatId === chat.id ? 'bg-slate-700 text-white' : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-200'}`}
                    >
                        <MessageIcon/>
                        <span className="flex-1 truncate">{chat.title}</span>
                    </button>
                ))}
            </div>
        </div>
    );
};

const GlobalAssistant: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  
  const [chats, setChats] = useState<Record<string, ChatSession>>({});
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [chatInstances, setChatInstances] = useState<Record<string, Chat | null>>({});
  
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const location = useLocation();
  const navigate = useNavigate();
  const [currentArticle, setCurrentArticle] = useState<NewsArticle | null>(null);

  useEffect(() => {
    const pathParts = location.pathname.split('/');
    if (pathParts[1] === 'article' && pathParts[2]) {
      const article = MOCK_NEWS_ARTICLES.find(a => a.id === pathParts[2]);
      setCurrentArticle(article || null);
    } else {
      setCurrentArticle(null);
    }
  }, [location]);

  const handleNewChat = useCallback((activate = true) => {
    setIsLoading(false);
    setInputValue('');

  try {
    // Get API key from localStorage
    const apiKey = localStorage.getItem('gemini_api_key');
        
        if (!apiKey) {
            const newChatId = Date.now().toString();
            const errorSession: ChatSession = {
                id: newChatId,
                title: "API Key Required",
                messages: [{ 
                    sender: 'bot', 
                    text: "⚠️ **API Key Required**\n\nTo use NewsBot Assistant, you need to configure your Google Gemini API key.\n\n**Steps:**\n1. Click the ⚙️ Settings icon\n2. Navigate to 'Assistant API Configuration'\n3. Enter your Google Gemini API key\n4. Save settings\n\n**Don't have an API key?**\nGet one free at: https://aistudio.google.com/apikey"
                }]
            };
            setChats(prev => ({ ...prev, [newChatId]: errorSession }));
            if (activate) setActiveChatId(newChatId);
            return;
        }

        const ai = new GoogleGenAI({ apiKey });
        const newChatInstance = ai.chats.create({
            model: 'gemini-2.0-flash',
            config: {
              systemInstruction: `You are NewsBot Assistant, a world-class AI research assistant embedded within a sophisticated news intelligence application. Your primary function is to provide users with accurate, timely, and deeply contextualized information about current events.
    
    **Core Capabilities:**
    1.  **Real-time Information:** You have access to Google Search to answer questions about recent events, breaking news, and up-to-the-minute topics. ALWAYS cite your sources from the search results provided to you.
    2.  **Deep Analysis:** Analyze news articles for bias, sentiment, and key entities.
    3.  **Summarization:** Provide concise, objective summaries of complex topics or articles.
    4.  **Forecasting:** Based on available data, you can discuss potential impacts and future scenarios related to news events.
    
    **Interaction Guidelines:**
    - Be objective and neutral in your tone.
    - Present information clearly and concisely.
    - Format all responses using Markdown for enhanced readability (e.g., use lists, bold text, etc.).`,
            },
        });
        
        const newChatId = Date.now().toString();
    const newChatSession: ChatSession = {
      id: newChatId,
      title: "New Chat",
      messages: [{ sender: 'bot', text: "Hi Rayen, what topic are you interested in exploring today? I can analyze articles, check for bias, or even forecast potential impacts." }]
    };

        setChatInstances(prev => ({ ...prev, [newChatId]: newChatInstance }));
        setChats(prev => ({ ...prev, [newChatId]: newChatSession }));
        if (activate) {
            setActiveChatId(newChatId);
            setTimeout(() => inputRef.current?.focus(), 100);
        }
    } catch(error) {
      console.error("Failed to initialize the AI assistant:", error);
      const newChatId = Date.now().toString();
       const errorSession: ChatSession = {
            id: newChatId,
            title: "Initialization Error",
            messages: [{ sender: 'bot', text: "Sorry, I'm unable to connect to my services at the moment. Please try again later."}]
        };
        setChats(prev => ({ ...prev, [newChatId]: errorSession }));
        if(activate) setActiveChatId(newChatId);
    }
  }, []);
  
  const handleClearHistory = useCallback(() => {
    setChats({});
    setChatInstances({});
    setActiveChatId(null);
    handleNewChat(true);
  }, [handleNewChat]);

  useEffect(() => {
    const handleStorageChange = (event: StorageEvent) => {
        if (event.key === 'newsbot_clear_chat_trigger') {
            handleClearHistory();
        }
    };
    window.addEventListener('storage', handleStorageChange);
    return () => {
        window.removeEventListener('storage', handleStorageChange);
    };
  }, [handleClearHistory]);


  useEffect(() => {
    if (isOpen && !activeChatId) {
      handleNewChat();
    }
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 500);
    }
  }, [isOpen, activeChatId, handleNewChat]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(scrollToBottom, [chats, activeChatId, isLoading]);
  
  const handleSendMessage = async (messageText: string) => {
    if (!messageText.trim() || isLoading || !activeChatId) return;
    
    const chatInstance = chatInstances[activeChatId];
    if (!chatInstance) {
        console.error("No active chat instance found.");
        return;
    }

    const userMessage: ChatMessage = { sender: 'user', text: messageText };
    
    setChats(prev => {
        const updatedChats = { ...prev };
        const currentChat = updatedChats[activeChatId];
        const newMessages = [...currentChat.messages, userMessage];

        const isFirstUserMessage = currentChat.messages.filter(m => m.sender === 'user').length === 0;
        const newTitle = isFirstUserMessage 
            ? messageText.substring(0, 40) + (messageText.length > 40 ? '...' : '') 
            : currentChat.title;

        updatedChats[activeChatId] = { ...currentChat, messages: newMessages, title: newTitle };
        return updatedChats;
    });

    setIsLoading(true);
    setInputValue('');

    try {
      const response = await chatInstance.sendMessage({ message: userMessage.text });
      const candidate = response?.candidates?.[0];
      const parts = (candidate?.content?.parts ?? []) as Array<{ text?: string }>;
      const botResponse = parts.map(part => part?.text ?? '').join('').trim();

      const sources: WebGroundingSource[] = [];
      const groundingChunks = (candidate as any)?.groundingMetadata?.groundingChunks;
      if (Array.isArray(groundingChunks)) {
        for (const chunk of groundingChunks) {
          const uri = chunk?.web?.uri;
          if (uri) {
            sources.push({ uri, title: chunk?.web?.title || '' });
          }
        }
      }

      setChats(prev => {
        const updatedChats = { ...prev };
        const currentChat = updatedChats[activeChatId];
        if (!currentChat) {
          return prev;
        }

        const botMessage: ChatMessage = {
          sender: 'bot',
          text: botResponse || "I'm not sure how to respond to that just yet, but I'm learning!",
          sources: sources.length ? [...sources] : undefined,
        };

        const newMessages: ChatMessage[] = [...currentChat.messages, botMessage];

        updatedChats[activeChatId] = { ...currentChat, messages: newMessages };
        return updatedChats;
      });
    } catch (error) {
      console.error("Error sending message:", error);
      let errorMessage = "Sorry, I'm having trouble connecting right now. Please try again later.";

      if (error instanceof ApiError) {
        if (error.status === 401 || error.status === 403) {
          errorMessage = `Authentication error (${error.status}). Please double-check your Gemini API key in Settings.`;
        } else if (error.status === 429) {
          errorMessage = 'The assistant is receiving too many requests right now. Please wait a few seconds and try again.';
        } else if (error.message) {
          errorMessage = `Gemini API error: ${error.message}`;
        }
      } else if (error instanceof Error && error.message) {
        errorMessage = error.message;
      }

      setChats(prev => {
          const updatedChats = { ...prev };
          const currentChat = updatedChats[activeChatId];
          if(currentChat) {
              updatedChats[activeChatId] = {...currentChat, messages: [...currentChat.messages, { sender: 'bot', text: errorMessage }]};
          }
          return updatedChats;
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleSendMessage(inputValue);
  };
  
  const handleSuggestionClick = (prompt: string) => {
    handleSendMessage(prompt);
  };

  const handleContextClick = () => {
    if (currentArticle) {
      const prompt = `Tell me more about the article "${currentArticle.headline}". Analyze its bias, summarize the key points, and identify the main entities involved.`;
      setInputValue(prompt);
      inputRef.current?.focus();
    }
  };
  
  const handleSettingsClick = () => {
    setIsOpen(false);
    navigate('/settings');
  };
  
  const activeChatMessages = activeChatId ? chats[activeChatId]?.messages : [];
  
  const assistantContainerClasses = `fixed z-50 transition-all duration-500 ease-in-out ${
      isExpanded
        ? 'bottom-1/2 right-1/2 translate-x-1/2 translate-y-1/2 w-[95vw] h-[90vh] max-w-none rounded-2xl'
        : `bottom-24 right-8 w-full max-w-lg h-[70vh] rounded-xl ${isOpen ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0 pointer-events-none'}`
  }`;

  const mainPanelClasses = `w-full h-full bg-[#122340]/80 backdrop-blur-xl border border-slate-700 shadow-2xl flex flex-col transition-all duration-500 ease-in-out ${
      isExpanded ? 'rounded-2xl' : 'rounded-xl'
  }`;

  const renderChatView = () => (
    <>
        <header className="p-4 border-b border-slate-800 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center space-x-2">
             <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center flex-shrink-0">
                <BotIcon />
             </div>
            <h2 className="text-lg font-bold text-white">NewsBot Assistant</h2>
          </div>
          <div className="flex items-center space-x-2">
             <button onClick={() => handleNewChat(true)} className="p-2 text-slate-400 hover:text-[#64FFDA] rounded-full hover:bg-slate-700/50 transition-colors" title="New Chat" aria-label="Start New Chat">
                <PlusIcon />
            </button>
             <button onClick={() => setIsExpanded(!isExpanded)} className="p-2 text-slate-400 hover:text-[#64FFDA] rounded-full hover:bg-slate-700/50 transition-colors" title={isExpanded ? "Collapse" : "Focus Mode"} aria-label={isExpanded ? "Collapse" : "Expand to Focus Mode"}>
                <ExpandIcon isExpanded={isExpanded} />
            </button>
             <button onClick={handleSettingsClick} className="p-2 text-slate-400 hover:text-[#64FFDA] rounded-full hover:bg-slate-700/50 transition-colors" title="Settings" aria-label="Open Assistant Settings">
                <SettingsIcon className="w-5 h-5"/>
            </button>
            <button onClick={() => setIsOpen(false)} className="p-2 text-slate-400 hover:text-white rounded-full hover:bg-slate-700/50 transition-colors" title="Close" aria-label="Close Assistant">
              <CloseIcon className="w-5 h-5" />
            </button>
          </div>
        </header>

        <div className="flex-1 p-6 overflow-y-auto space-y-6">
          {activeChatMessages?.map((msg, index) => (
            <div key={index} className={`flex items-start gap-3 ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
               {msg.sender === 'bot' && (
                  <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center flex-shrink-0 mt-1">
                    <BotIcon />
                  </div>
              )}
              <div className={`p-3 rounded-lg max-w-2xl prose prose-invert prose-p:my-0 prose-p:text-slate-200 ${msg.sender === 'user' ? 'bg-blue-500/30 text-white' : 'bg-slate-800/70'}`}>
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.text}</ReactMarkdown>
                {msg.sources && msg.sources.length > 0 && <SourceList sources={msg.sources} />}
              </div>
            </div>
          ))}
          {isLoading && (
             <div className="flex items-start gap-3 justify-start">
               <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center flex-shrink-0 mt-1">
                    <BotIcon />
                </div>
              <div className="bg-slate-800/70 p-3 rounded-lg">
                <LoadingIndicator />
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
        
        {activeChatMessages?.length <= 1 && !isLoading && (
            isExpanded ? 
            <ExpandedPromptSuggestions onSelect={handleSuggestionClick} /> : 
            <PromptSuggestions onSelect={handleSuggestionClick} />
        )}

        <div className={`p-4 border-t border-slate-800/50 bg-[#0A192F]/50 flex-shrink-0`}>
          <form onSubmit={handleFormSubmit}>
            <div className="relative">
              <input
                ref={inputRef}
                type="text"
                placeholder="Ask me anything..."
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                disabled={isLoading}
                className="w-full bg-slate-800 text-white placeholder-slate-500 border border-slate-700 rounded-lg py-3 pl-4 pr-24 focus:outline-none focus:ring-2 focus:ring-[#64FFDA] disabled:opacity-50"
              />
              <div className="absolute inset-y-0 right-0 flex items-center">
                {currentArticle && (
                    <button type="button" onClick={handleContextClick} className="p-2 text-slate-400 hover:text-[#64FFDA]" title="Analyze current article">
                        <SparklesIcon />
                    </button>
                )}
                <button type="submit" disabled={isLoading || !inputValue.trim()} className="p-2 mr-1 text-slate-400 hover:text-[#64FFDA] disabled:hover:text-slate-400 disabled:cursor-not-allowed">
                  <SendIcon />
                </button>
              </div>
            </div>
          </form>
        </div>
    </>
  );

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-8 right-8 bg-[#64FFDA] text-[#0A192F] w-16 h-16 rounded-full flex items-center justify-center shadow-lg shadow-teal-500/30 hover:bg-white transition-all duration-300 transform hover:scale-110 z-40"
        aria-label="Open NewsBot Assistant"
      >
        <ChatIcon />
      </button>

      <div
        onClick={() => setIsOpen(false)}
        className={`fixed inset-0 bg-black/60 z-40 transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
      />

      <div className={assistantContainerClasses}>
        <div className="flex w-full h-full">
            {isExpanded && (
                <ChatHistorySidebar 
                    chats={chats} 
                    activeChatId={activeChatId} 
                    onSelectChat={setActiveChatId}
                    onNewChat={() => handleNewChat(true)}
                />
            )}
            <div className={mainPanelClasses}>
                {renderChatView()}
            </div>
        </div>
      </div>
    </>
  );
};

export default GlobalAssistant;
