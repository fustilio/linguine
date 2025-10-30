/// <reference types="dom-chromium-ai" />

/**
 * Convenience functions for Chrome AI APIs
 * Provides simple, high-level interfaces for common operations
 */

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

// Export manager instances for direct access
export const chromeAIManager = ChromeAIManager.getInstance();
export const translatorManager = TranslatorManager.getInstance();
export const summarizerManager = SummarizerManager.getInstance();
export const rewriterManager = RewriterManager.getInstance();
