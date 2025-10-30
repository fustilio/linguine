/// <reference types="dom-chromium-ai" />

/**
 * Convenience functions for Chrome AI APIs
 * Provides simple, high-level interfaces for common operations
 */

import { LanguageDetectionManager } from './language-detection-manager.js';
import { ChromeAIManager } from './language-model-manager.js';
import { RewriterManager } from './rewriter-manager.js';
import { SummarizerManager } from './summarizer-manager.js';
import { TranslatorManager } from './translator-manager.js';

/**
 * Translate text using Chrome Translator API
 */
export const translateText = async (text: string, sourceLanguage: string, targetLanguage: string) => {
  const translatorManager = TranslatorManager.getInstance();
  const translator = await translatorManager.getTranslator(sourceLanguage, targetLanguage);
  return await translator.translate(text);
};

/**
 * Summarize text using Chrome Summarizer API
 */
export const summarizeText = async (text: string, context?: string) => {
  const summarizerManager = SummarizerManager.getInstance();
  const summarizer = await summarizerManager.getSummarizer();
  return await summarizer.summarize(text, context ? { context } : undefined);
};

/**
 * Stream summarize text using Chrome Summarizer API
 */
export const streamSummarizeText = async (text: string, context?: string) => {
  const summarizerManager = SummarizerManager.getInstance();
  const summarizer = await summarizerManager.getSummarizer();
  return summarizer.summarizeStreaming(text, context ? { context } : undefined);
};

/**
 * Rewrite text using Chrome Rewriter API
 */
export const rewriteText = async (text: string, options?: RewriterRewriteOptions) => {
  const rewriterManager = RewriterManager.getInstance();
  const rewriter = await rewriterManager.getRewriter(options);
  return await rewriter.rewrite(text, { context: options?.context });
};

/**
 * Detect language using Chrome Language Detector API
 */
export const detectLanguage = async (text: string) => {
  const languageDetectionManager = LanguageDetectionManager.getInstance();
  const languageDetector = await languageDetectionManager.getLanguageDetector();
  return await languageDetector.detect(text);
};

// Export manager instances for direct access
export const chromeAIManager = ChromeAIManager.getInstance();
export const translatorManager = TranslatorManager.getInstance();
export const summarizerManager = SummarizerManager.getInstance();
export const rewriterManager = RewriterManager.getInstance();
export const languageDetectionManager = LanguageDetectionManager.getInstance();

/**
 * Write once with the Writer API and destroy the writer immediately.
 * Uses expected languages to help the browser pick the right model.
 */
export const writeWithWriter = async (
  prompt: string,
  options?: {
    context?: string;
    expectedInputLanguages?: string[];
    expectedContextLanguages?: string[];
    outputLanguage?: string;
    tone?: 'formal' | 'neutral' | 'casual';
    format?: 'markdown' | 'plain-text';
    length?: 'short' | 'medium' | 'long';
  },
): Promise<string> => {
  const availability = await Writer.availability();
  if (availability === 'unavailable') {
    throw new Error('Writer API unavailable');
  }

  const writerOptions: any = {
    tone: options?.tone ?? 'neutral',
    format: options?.format ?? 'plain-text',
    length: options?.length ?? 'short',
  };
  if (options?.expectedInputLanguages) writerOptions.expectedInputLanguages = options.expectedInputLanguages;
  if (options?.expectedContextLanguages) writerOptions.expectedContextLanguages = options.expectedContextLanguages;
  if (options?.outputLanguage) writerOptions.outputLanguage = options.outputLanguage;

  const writer = await Writer.create(writerOptions);
  try {
    const result = await writer.write(prompt, options?.context ? { context: options.context } : undefined);
    return typeof result === 'string' ? result : String(result ?? '');
  } finally {
    try {
      writer.destroy();
    } catch {}
  }
};
