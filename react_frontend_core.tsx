// src/state/brandStore.ts

import create from 'zustand';
import { persist } from 'zustand/middleware';

export interface VoiceProfile {
  tone: string;
  personality: string[];
  forbiddenPhrases: string[];
  examples: string[];
}

export interface AudienceProfile {
  demographics: string;
  psychographics: string;
  painPoints: string[];
  values: string[];
  consumptionPlatforms: string[];
}

export interface BrandProfile {
  id: string;
  name: string;
  niche: string;
  description: string;
  voice: VoiceProfile;
  audience: AudienceProfile;
  products: string[];
  values: string[];
  visualIdentity: {
    colors: string[];
    fonts: string[];
    style: string;
  };
  createdAt: Date;
  updatedAt: Date;
}

interface BrandStore {
  brands: BrandProfile[];
  currentBrand: BrandProfile | null;
  setBrand: (brand: BrandProfile) => void;
  createBrand: (brand: Omit<BrandProfile, 'id' | 'createdAt' | 'updatedAt'>) => void;
  updateBrand: (id: string, updates: Partial<BrandProfile>) => void;
  deleteBrand: (id: string) => void;
  syncToBackend: () => Promise<void>;
}

export const useBrandStore = create<BrandStore>()(
  persist(
    (set, get) => ({
      brands: [],
      currentBrand: null,

      setBrand: (brand) => {
        set({ currentBrand: brand });
      },

      createBrand: (brandData) => {
        const newBrand: BrandProfile = {
          ...brandData,
          id: crypto.randomUUID(),
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        set((state) => ({
          brands: [...state.brands, newBrand],
          currentBrand: newBrand,
        }));
      },

      updateBrand: (id, updates) => {
        set((state) => ({
          brands: state.brands.map((b) =>
            b.id === id
              ? { ...b, ...updates, updatedAt: new Date() }
              : b
          ),
          currentBrand:
            state.currentBrand?.id === id
              ? { ...state.currentBrand, ...updates, updatedAt: new Date() }
              : state.currentBrand,
        }));
      },

      deleteBrand: (id) => {
        set((state) => ({
          brands: state.brands.filter((b) => b.id !== id),
          currentBrand: state.currentBrand?.id === id ? null : state.currentBrand,
        }));
      },

      syncToBackend: async () => {
        const { brands } = get();
        try {
          // Sync to Tauri backend
          for (const brand of brands) {
            await window.__TAURI__.invoke('create_brand', { brand });
          }
        } catch (error) {
          console.error('Sync failed:', error);
        }
      },
    }),
    {
      name: 'brand-store',
      version: 1,
    }
  )
);

// src/state/chatStore.ts

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  agentName?: string;
  thinking?: string;
  timestamp: Date;
  agentOutputs?: AgentOutput[];
}

interface AgentOutput {
  agentName: string;
  output: string;
  confidence: number;
  executionTimeMs: number;
}

interface ChatStore {
  messages: Message[];
  isLoading: boolean;
  streamingContent: string;
  addMessage: (message: Omit<Message, 'id' | 'timestamp'>) => void;
  setLoading: (loading: boolean) => void;
  appendStreamingContent: (content: string) => void;
  clearHistory: () => void;
}

export const useChatStore = create<ChatStore>((set) => ({
  messages: [],
  isLoading: false,
  streamingContent: '',

  addMessage: (messageData) => {
    set((state) => ({
      messages: [
        ...state.messages,
        {
          ...messageData,
          id: crypto.randomUUID(),
          timestamp: new Date(),
        },
      ],
    }));
  },

  setLoading: (loading) => set({ isLoading: loading }),

  appendStreamingContent: (content) => {
    set((state) => ({
      streamingContent: state.streamingContent + content,
    }));
  },

  clearHistory: () => set({ messages: [], streamingContent: '' }),
}));

// src/state/contentStore.ts

export interface GeneratedContent {
  id: string;
  brandId: string;
  contentType: string; // 'caption' | 'script' | 'hook' | 'carousel' | 'cta'
  platform: string;
  content: string;
  metadata: {
    wordCount: number;
    estimatedEngagement: number;
    hooks: string[];
    cta: string;
  };
  createdAt: Date;
  isSaved: boolean;
}

interface ContentStore {
  generatedContent: GeneratedContent[];
  selectedContent: GeneratedContent | null;
  addContent: (content: GeneratedContent) => void;
  updateContent: (id: string, updates: Partial<GeneratedContent>) => void;
  deleteContent: (id: string) => void;
  selectContent: (id: string) => void;
  exportContent: (id: string, format: 'csv' | 'json' | 'pdf') => Promise<void>;
}

export const useContentStore = create<ContentStore>((set, get) => ({
  generatedContent: [],
  selectedContent: null,

  addContent: (content) => {
    set((state) => ({
      generatedContent: [content, ...state.generatedContent],
    }));
  },

  updateContent: (id, updates) => {
    set((state) => ({
      generatedContent: state.generatedContent.map((c) =>
        c.id === id ? { ...c, ...updates } : c
      ),
    }));
  },

  deleteContent: (id) => {
    set((state) => ({
      generatedContent: state.generatedContent.filter((c) => c.id !== id),
      selectedContent: state.selectedContent?.id === id ? null : state.selectedContent,
    }));
  },

  selectContent: (id) => {
    const { generatedContent } = get();
    const content = generatedContent.find((c) => c.id === id);
    set({ selectedContent: content || null });
  },

  exportContent: async (id, format) => {
    const { generatedContent } = get();
    const content = generatedContent.find((c) => c.id === id);
    if (!content) return;

    const data = format === 'json'
      ? JSON.stringify(content, null, 2)
      : format === 'csv'
      ? `"${content.contentType}","${content.platform}","${content.content}"`
      : content.content;

    const blob = new Blob([data], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `content-${id}.${format}`;
    a.click();
  },
}));

// src/components/layout/Sidebar.tsx

import React from 'react';
import { motion } from 'framer-motion';
import { Home, Zap, TrendingUp, BookOpen, Settings, LogOut } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import clsx from 'clsx';

const menuItems = [
  { icon: Home, label: 'Dashboard', path: '/' },
  { icon: Zap, label: 'Generate', path: '/generate' },
  { icon: TrendingUp, label: 'Trends', path: '/trends' },
  { icon: BookOpen, label: 'Campaigns', path: '/campaigns' },
  { icon: Settings, label: 'Settings', path: '/settings' },
];

export const Sidebar: React.FC = () => {
  const location = useLocation();

  return (
    <motion.div
      className="fixed left-0 top-0 h-screen w-64 bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 border-r border-slate-700 flex flex-col"
      initial={{ x: -256 }}
      animate={{ x: 0 }}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
    >
      {/* Logo */}
      <div className="p-6 border-b border-slate-700">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-blue-400 to-purple-600 rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-lg">BF</span>
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">BrandForge</h1>
            <p className="text-xs text-slate-400">AI Agency</p>
          </div>
        </div>
      </div>

      {/* Menu */}
      <nav className="flex-1 px-4 py-6 space-y-2">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path;

          return (
            <Link key={item.path} to={item.path}>
              <motion.div
                className={clsx(
                  'flex items-center gap-3 px-4 py-3 rounded-lg transition-all cursor-pointer',
                  isActive
                    ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-lg'
                    : 'text-slate-300 hover:bg-slate-700'
                )}
                whileHover={{ x: 4 }}
                whileTap={{ scale: 0.98 }}
              >
                <Icon className="w-5 h-5" />
                <span className="font-medium">{item.label}</span>
              </motion.div>
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-slate-700 space-y-2">
        <button className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-slate-300 hover:bg-slate-700 transition-all">
          <LogOut className="w-5 h-5" />
          <span className="text-sm">Sign Out</span>
        </button>
      </div>
    </motion.div>
  );
};

// src/components/chat/ChatInterface.tsx

import React, { useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useChatStore, useBrandStore } from '../../state';
import { MessageList } from './MessageList';
import { InputArea } from './InputArea';
import { AgentThinking } from './AgentThinking';

export const ChatInterface: React.FC = () => {
  const { messages, isLoading, streamingContent } = useChatStore();
  const { currentBrand } = useBrandStore();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, streamingContent]);

  if (!currentBrand) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <p className="text-slate-400 text-lg mb-4">No brand selected</p>
          <p className="text-slate-500">Create or select a brand to get started</p>
        </div>
      </div>
    );
  }

  return (
    <motion.div
      className="flex flex-col h-full bg-gradient-to-b from-slate-950 to-slate-900"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        <MessageList messages={messages} />

        {/* Streaming content */}
        <AnimatePresence>
          {streamingContent && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="bg-slate-800 rounded-lg p-4 border border-slate-700"
            >
              <p className="text-slate-200 text-sm whitespace-pre-wrap">
                {streamingContent}
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        {isLoading && <AgentThinking />}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <InputArea />
    </motion.div>
  );
};

// src/components/content-generator/ContentGrid.tsx

import React from 'react';
import { motion } from 'framer-motion';
import { useContentStore } from '../../state';
import { Trash2, Download, Copy } from 'lucide-react';

export const ContentGrid: React.FC = () => {
  const { generatedContent, deleteContent, selectContent } = useContentStore();

  const contentTypeColors = {
    caption: 'from-blue-500 to-blue-600',
    script: 'from-purple-500 to-purple-600',
    hook: 'from-pink-500 to-pink-600',
    carousel: 'from-green-500 to-green-600',
    cta: 'from-orange-500 to-orange-600',
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-6">
      {generatedContent.map((content, index) => (
        <motion.div
          key={content.id}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.05 }}
          className="bg-slate-800 border border-slate-700 rounded-lg overflow-hidden hover:border-slate-600 transition-all cursor-pointer group"
          onClick={() => selectContent(content.id)}
        >
          {/* Header */}
          <div
            className={`h-12 bg-gradient-to-r ${
              contentTypeColors[content.contentType as keyof typeof contentTypeColors] ||
              'from-slate-700 to-slate-600'
            } flex items-center px-4`}
          >
            <span className="text-white font-semibold text-sm capitalize">
              {content.contentType}
            </span>
            <span className="ml-auto text-white text-xs opacity-75">
              {content.platform}
            </span>
          </div>

          {/* Content preview */}
          <div className="p-4">
            <p className="text-slate-300 text-sm line-clamp-3 leading-relaxed">
              {content.content}
            </p>

            {/* Metadata */}
            <div className="mt-4 space-y-2 text-xs text-slate-400">
              <div className="flex justify-between">
                <span>{content.metadata.wordCount} words</span>
                <span className="text-green-400">
                  {content.metadata.estimatedEngagement}% engagement
                </span>
              </div>

              {/* Tags */}
              <div className="flex gap-2 flex-wrap pt-2">
                {content.metadata.hooks.map((hook, i) => (
                  <span
                    key={i}
                    className="bg-slate-700 px-2 py-1 rounded text-slate-200"
                  >
                    {hook}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="px-4 pb-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <button className="flex-1 flex items-center justify-center gap-2 bg-slate-700 hover:bg-slate-600 text-white py-2 rounded text-sm transition-colors">
              <Copy className="w-4 h-4" />
              Copy
            </button>
            <button className="flex-1 flex items-center justify-center gap-2 bg-slate-700 hover:bg-slate-600 text-white py-2 rounded text-sm transition-colors">
              <Download className="w-4 h-4" />
              Export
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                deleteContent(content.id);
              }}
              className="px-3 flex items-center justify-center bg-red-900 hover:bg-red-800 text-red-200 py-2 rounded text-sm transition-colors"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </motion.div>
      ))}
    </div>
  );
};

// src/hooks/useAgent.ts

import { useCallback } from 'react';
import { useChatStore, useBrandStore } from '../state';
import { invoke } from '@tauri-apps/api/tauri';

export const useAgent = () => {
  const { addMessage, setLoading, appendStreamingContent } = useChatStore();
  const { currentBrand } = useBrandStore();

  const executeAgent = useCallback(
    async (agentType: string, prompt: string) => {
      if (!currentBrand) {
        throw new Error('No brand selected');
      }

      setLoading(true);

      try {
        // Add user message
        addMessage({
          role: 'user',
          content: prompt,
        });

        // Listen for streaming responses
        const unlisten = await window.__TAURI__.event.listen(
          'agent-response',
          (event: any) => {
            appendStreamingContent(event.payload);
          }
        );

        // Execute workflow
        const result = await invoke('execute_agent_workflow', {
          agentType,
          prompt,
          brandId: currentBrand.id,
        });

        // Add assistant message
        addMessage({
          role: 'assistant',
          content: result as string,
          agentName: agentType,
        });

        unlisten();
      } finally {
        setLoading(false);
      }
    },
    [currentBrand, addMessage, setLoading, appendStreamingContent]
  );

  return { executeAgent };
};

// src/components/content-generator/CaptionGenerator.tsx

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Wand2, Loader } from 'lucide-react';
import { invoke } from '@tauri-apps/api/tauri';
import { useBrandStore, useContentStore } from '../../state';

interface GenerateRequest {
  contentType: 'caption';
  platform: string;
  tone: string;
  length: 'short' | 'medium' | 'long';
  topic: string;
}

export const CaptionGenerator: React.FC = () => {
  const { currentBrand } = useBrandStore();
  const { addContent } = useContentStore();
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState<GenerateRequest>({
    contentType: 'caption',
    platform: 'instagram',
    tone: 'engaging',
    length: 'medium',
    topic: '',
  });

  const handleGenerate = async () => {
    if (!currentBrand || !formData.topic) return;

    setIsLoading(true);

    try {
      const result = await invoke('generate_content', {
        contentType: formData.contentType,
        context: `
          Platform: ${formData.platform}
          Tone: ${formData.tone}
          Topic: ${formData.topic}
          Brand: ${currentBrand.name}
        `,
        brandId: currentBrand.id,
      });

      const generated = result as any;

      addContent({
        id: crypto.randomUUID(),
        brandId: currentBrand.id,
        contentType: formData.contentType,
        platform: formData.platform,
        content: generated.content,
        metadata: {
          wordCount: generated.content.split(' ').length,
          estimatedEngagement: Math.floor(Math.random() * 40) + 60,
          hooks: generated.hooks || [],
          cta: generated.cta || '',
        },
        createdAt: new Date(),
        isSaved: false,
      });
    } catch (error) {
      console.error('Generation failed:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <motion.div
      className="bg-slate-800 border border-slate-700 rounded-lg p-6"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <h2 className="text-xl font-bold text-white mb-6">Caption Generator</h2>

      <div className="space-y-4">
        {/* Platform selector */}
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">
            Platform
          </label>
          <select
            value={formData.platform}
            onChange={(e) =>
              setFormData({ ...formData, platform: e.target.value })
            }
            className="w-full bg-slate-700 border border-slate-600 rounded px-3 py-2 text-white text-sm"
          >
            <option>instagram</option>
            <option>tiktok</option>
            <option>twitter</option>
            <option>linkedin</option>
          </select>
        </div>

        {/* Tone selector */}
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">
            Tone
          </label>
          <select
            value={formData.tone}
            onChange={(e) => setFormData({ ...formData, tone: e.target.value })}
            className="w-full bg-slate-700 border border-slate-600 rounded px-3 py-2 text-white text-sm"
          >
            <option>engaging</option>
            <option>professional</option>
            <option>funny</option>
            <option>inspirational</option>
            <option>educational</option>
          </select>
        </div>

        {/* Topic input */}
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">
            Topic
          </label>
          <textarea
            value={formData.topic}
            onChange={(e) => setFormData({ ...formData, topic: e.target.value })}
            placeholder="What do you want to write about?"
            className="w-full bg-slate-700 border border-slate-600 rounded px-3 py-2 text-white text-sm resize-none focus:border-blue-500 focus:outline-none"
            rows={4}
          />
        </div>

        {/* Generate button */}
        <motion.button
          onClick={handleGenerate}
          disabled={isLoading || !formData.topic}
          className="w-full bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-lg flex items-center justify-center gap-2 transition-all"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          {isLoading ? (
            <>
              <Loader className="w-5 h-5 animate-spin" />
              Generating...
            </>
          ) : (
            <>
              <Wand2 className="w-5 h-5" />
              Generate Caption
            </>
          )}
        </motion.button>
      </div>
    </motion.div>
  );
};
