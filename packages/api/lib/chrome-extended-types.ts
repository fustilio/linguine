// Type definitions for Chrome's AI APIs

// Availability status for Chrome AI APIs
type AIAvailability = 'unavailable' | 'downloadable' | 'downloading' | 'available';

type DownloadProgressEvent = {
  loaded: number;
  total: number;
};

type Monitor = {
  addEventListener(event: 'downloadprogress', callback: (e: DownloadProgressEvent) => void): void;
  removeEventListener(event: 'downloadprogress', callback: (e: DownloadProgressEvent) => void): void;
};

type AITranslator = {
  translate(text: string): Promise<string>;
  destroy(): void;
  ready: Promise<void>;
};

type TranslatorAPI = {
  availability(options: { sourceLanguage: string; targetLanguage: string }): Promise<AIAvailability>;
  create(options: {
    sourceLanguage: string;
    targetLanguage: string;
    monitor?: (monitor: Monitor) => void;
  }): Promise<AITranslator>;
};

type DetectionResult = {
  detectedLanguage: string;
  confidence: number;
};

type AILanguageDetector = {
  detect(text: string): Promise<DetectionResult[]>;
  destroy(): void;
  ready: Promise<void>;
};

type LanguageDetectorAPI = {
  availability(): Promise<AIAvailability>;
  create(options?: { monitor?: (monitor: Monitor) => void }): Promise<AILanguageDetector>;
};

type AISummarizer = {
  summarize(text: string, options?: { context?: string }): Promise<string>;
  summarizeStreaming(text: string, options?: { context?: string }): AsyncIterable<string>;
  destroy(): void;
  ready: Promise<void>;
};

type SummarizerOptions = {
  type?: 'tldr' | 'teaser' | 'key-points' | 'headline';
  format?: 'markdown' | 'plain-text';
  length?: 'short' | 'medium' | 'long';
  sharedContext?: string;
  expectedInputLanguages?: string[];
  outputLanguage?: string;
  expectedContextLanguages?: string[];
  monitor?: (monitor: Monitor) => void;
};

type SummarizerAPI = {
  availability(): Promise<AIAvailability>;
  create(options?: SummarizerOptions): Promise<AISummarizer>;
};

type AIRewriter = {
  rewrite(text: string, options?: { context?: string }): Promise<string>;
  rewriteStreaming(
    text: string,
    options?: {
      context?: string;
      tone?: string;
      format?: string;
      length?: string;
    },
  ): AsyncIterable<string>;
  destroy(): void;
  ready: Promise<void>;
};

type RewriterOptions = {
  sharedContext?: string;
  expectedInputLanguages?: string[];
  expectedContextLanguages?: string[];
  tone?: 'as-is' | 'more-formal' | 'more-casual';
  format?: 'as-is' | 'plain-text' | 'markdown';
  length?: 'as-is' | 'shorter' | 'longer';
  monitor?: (monitor: Monitor) => void;
};

type RewriterAPI = {
  availability(): Promise<AIAvailability>;
  create(options?: RewriterOptions): Promise<AIRewriter>;
};

type AILanguageModel = {
  prompt(input: string, options?: { systemPrompt?: string }): Promise<string>;
  destroy(): void;
  ready: Promise<void>;
};

type LanguageModelAPI = {
  availability(options?: { systemPrompt?: string }): Promise<AIAvailability>;
  create(options?: { systemPrompt?: string; monitor?: (monitor: Monitor) => void }): Promise<AILanguageModel>;
};

type AI = {
  translator: TranslatorAPI;
  languageModel?: {
    capabilities(): Promise<{ available: string }>;
    create(options?: { systemPrompt?: string }): Promise<AILanguageModel>;
  };
};

declare global {
  interface Window {
    ai?: AI;
    translation?: {
      canTranslate(options: { sourceLanguage: string; targetLanguage: string }): Promise<string>;
      createTranslator(options: { sourceLanguage: string; targetLanguage: string }): Promise<AITranslator>;
    };
    Rewriter?: RewriterAPI;
  }

  // Chrome AI APIs namespace (chrome.ai.*)
  namespace chrome {
    interface AI {
      languageModel?: LanguageModelAPI;
    }
    const ai: AI;
  }

  // Global APIs
  const Translator: TranslatorAPI;
  const LanguageDetector: LanguageDetectorAPI;
  const Summarizer: SummarizerAPI;
}

export type {
  AIAvailability,
  DownloadProgressEvent,
  Monitor,
  AITranslator,
  TranslatorAPI,
  DetectionResult,
  AILanguageDetector,
  LanguageDetectorAPI,
  AISummarizer,
  SummarizerOptions,
  SummarizerAPI,
  AIRewriter,
  RewriterOptions,
  RewriterAPI,
  AILanguageModel,
  LanguageModelAPI,
  AI,
};
