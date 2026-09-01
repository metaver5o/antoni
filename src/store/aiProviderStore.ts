import { create } from 'zustand';

export type AIProviderId = 'claude' | 'gemini' | 'grok' | 'openai' | 'custom';

export interface AIProviderMeta {
  id: AIProviderId;
  name: string;
  tagline: string;
  brandColor: string;
  logoEmoji: string;
  defaultModel: string;
  availableModels: string[];
  keyPlaceholder: string;
  helpUrl: string;
}

export const AI_PROVIDERS: Record<AIProviderId, AIProviderMeta> = {
  claude: {
    id: 'claude',
    name: 'Claude',
    tagline: 'Anthropic Claude 3.5 & Haiku',
    brandColor: '#7C3AED',
    logoEmoji: '🟣',
    defaultModel: 'claude-haiku-4-5-20251001',
    availableModels: ['claude-haiku-4-5-20251001', 'claude-3-5-haiku-20241022', 'claude-3-5-sonnet-20241022'],
    keyPlaceholder: 'sk-ant-api03-...',
    helpUrl: 'https://console.anthropic.com/settings/keys',
  },
  gemini: {
    id: 'gemini',
    name: 'Gemini',
    tagline: 'Google AI Studio & Gemini 2.0',
    brandColor: '#2563EB',
    logoEmoji: '🔵',
    defaultModel: 'gemini-2.0-flash',
    availableModels: ['gemini-2.0-flash', 'gemini-1.5-flash', 'gemini-1.5-pro'],
    keyPlaceholder: 'AIzaSy...',
    helpUrl: 'https://aistudio.google.com/app/apikey',
  },
  grok: {
    id: 'grok',
    name: 'xAI Grok',
    tagline: 'xAI Grok-2 & Grok-Beta',
    brandColor: '#18181B',
    logoEmoji: '⚪',
    defaultModel: 'grok-2-latest',
    availableModels: ['grok-2-latest', 'grok-beta'],
    keyPlaceholder: 'xai-...',
    helpUrl: 'https://console.x.ai/',
  },
  openai: {
    id: 'openai',
    name: 'OpenAI',
    tagline: 'ChatGPT & GPT-4o',
    brandColor: '#059669',
    logoEmoji: '🟢',
    defaultModel: 'gpt-4o-mini',
    availableModels: ['gpt-4o-mini', 'gpt-4o'],
    keyPlaceholder: 'sk-proj-...',
    helpUrl: 'https://platform.openai.com/api-keys',
  },
  custom: {
    id: 'custom',
    name: 'Devin / Custom',
    tagline: 'OpenRouter, Devin ou compatível OpenAI',
    brandColor: '#EA580C',
    logoEmoji: '🟠',
    defaultModel: 'anthropic/claude-3.5-haiku',
    availableModels: ['anthropic/claude-3.5-haiku', 'deepseek/deepseek-chat', 'meta-llama/llama-3.3-70b-instruct'],
    keyPlaceholder: 'sk-or-v1-... ou sua chave',
    helpUrl: 'https://openrouter.ai/keys',
  },
};

interface AIStoreState {
  activeProvider: AIProviderId;
  keys: Record<AIProviderId, string>;
  models: Record<AIProviderId, string>;
  customBaseUrl: string;
  isModalOpen: boolean;

  setModalOpen: (open: boolean) => void;
  setActiveProvider: (provider: AIProviderId) => void;
  setKey: (provider: AIProviderId, key: string) => void;
  setModel: (provider: AIProviderId, model: string) => void;
  setCustomBaseUrl: (url: string) => void;
  getActiveConfig: () => {
    provider: AIProviderId;
    apiKey: string;
    model: string;
    baseUrl?: string;
  };
}

const STORAGE_KEY = 'antoni_ai_settings_v2';

function loadStoredSettings(): {
  activeProvider: AIProviderId;
  keys: Record<AIProviderId, string>;
  models: Record<AIProviderId, string>;
  customBaseUrl: string;
} {
  const defaults = {
    activeProvider: 'claude' as AIProviderId,
    keys: {
      claude: '',
      gemini: '',
      grok: '',
      openai: '',
      custom: '',
    },
    models: {
      claude: 'claude-haiku-4-5-20251001',
      gemini: 'gemini-2.0-flash',
      grok: 'grok-2-latest',
      openai: 'gpt-4o-mini',
      custom: 'anthropic/claude-3.5-haiku',
    },
    customBaseUrl: 'https://openrouter.ai/api/v1',
  };

  if (typeof window === 'undefined' || !window.localStorage) return defaults;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        ...defaults,
        ...parsed,
        keys: { ...defaults.keys, ...(parsed.keys || {}) },
        models: { ...defaults.models, ...(parsed.models || {}) },
      };
    }
  } catch (err) {
    console.warn('Failed to load AI settings from localStorage:', err);
  }
  return defaults;
}

function persistSettings(state: {
  activeProvider: AIProviderId;
  keys: Record<AIProviderId, string>;
  models: Record<AIProviderId, string>;
  customBaseUrl: string;
}) {
  if (typeof window === 'undefined' || !window.localStorage) return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (err) {
    console.warn('Failed to persist AI settings:', err);
  }
}

const initial = loadStoredSettings();

export const useAIProviderStore = create<AIStoreState>((set, get) => ({
  activeProvider: initial.activeProvider,
  keys: initial.keys,
  models: initial.models,
  customBaseUrl: initial.customBaseUrl,
  isModalOpen: false,

  setModalOpen: (isModalOpen) => set({ isModalOpen }),

  setActiveProvider: (activeProvider) => {
    set({ activeProvider });
    persistSettings({
      activeProvider,
      keys: get().keys,
      models: get().models,
      customBaseUrl: get().customBaseUrl,
    });
  },

  setKey: (provider, key) => {
    const updatedKeys = { ...get().keys, [provider]: key.trim() };
    set({ keys: updatedKeys });
    persistSettings({
      activeProvider: get().activeProvider,
      keys: updatedKeys,
      models: get().models,
      customBaseUrl: get().customBaseUrl,
    });
  },

  setModel: (provider, model) => {
    const updatedModels = { ...get().models, [provider]: model };
    set({ models: updatedModels });
    persistSettings({
      activeProvider: get().activeProvider,
      keys: get().keys,
      models: updatedModels,
      customBaseUrl: get().customBaseUrl,
    });
  },

  setCustomBaseUrl: (customBaseUrl) => {
    set({ customBaseUrl });
    persistSettings({
      activeProvider: get().activeProvider,
      keys: get().keys,
      models: get().models,
      customBaseUrl,
    });
  },

  getActiveConfig: () => {
    const state = get();
    const provider = state.activeProvider;
    const apiKey = state.keys[provider] || '';
    const model = state.models[provider] || AI_PROVIDERS[provider].defaultModel;
    const baseUrl = provider === 'custom' ? state.customBaseUrl : undefined;
    return { provider, apiKey, model, baseUrl };
  },
}));
