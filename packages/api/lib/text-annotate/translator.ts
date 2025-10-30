/**
 * Translation utilities using Chrome Translator and LanguageModel APIs
 */

/// <reference types="dom-chromium-ai" />

import { translateText } from '../chrome-ai/convenience-functions.js';
import { ChromeAIManager } from '../chrome-ai/language-model-manager.js';
import type { ChunkTranslation, SupportedLanguage } from './types.js';

/**
 * Translates a chunk both literally and contextually
 */
// Simple module-level metrics for timing
const translatorMetrics = {
  literalCount: 0,
  contextualCount: 0,
  literalTimeMs: 0,
  contextualTimeMs: 0,
};

export const getAndResetTranslatorMetrics = () => {
  const snapshot = { ...translatorMetrics };
  translatorMetrics.literalCount = 0;
  translatorMetrics.contextualCount = 0;
  translatorMetrics.literalTimeMs = 0;
  translatorMetrics.contextualTimeMs = 0;
  return snapshot;
};

const translateChunk = async (
  chunkText: string,
  sourceLanguage: SupportedLanguage,
  targetLanguage: SupportedLanguage,
  context?: string,
): Promise<ChunkTranslation> => {
  // Minimal log scope handled below
  try {
    // Get literal translation using Translator API
    const literalStart = performance.now();
    const literal = await translateText(chunkText, sourceLanguage, targetLanguage);
    const literalEnd = performance.now();
    translatorMetrics.literalCount += 1;
    translatorMetrics.literalTimeMs += literalEnd - literalStart;

    // Get contextual translation using LanguageModel API
    let contextual = literal;
    if (context && context !== chunkText) {
      const contextualStart = performance.now();
      contextual = await translateContextually(chunkText, sourceLanguage, targetLanguage, context, literal);
      const contextualEnd = performance.now();
      translatorMetrics.contextualCount += 1;
      translatorMetrics.contextualTimeMs += contextualEnd - contextualStart;
    }

    // Favor literal if contextual is effectively the same (punctuation/case/synonyms like hi/hello, yes/yes!)
    const litCanon = canonicalForMerge(literal);
    const ctxCanon = canonicalForMerge(contextual);
    let differs = litCanon !== ctxCanon;
    if (!differs) {
      contextual = literal;
    }

    // Concise translation log
    try {
      console.log(
        `[TextAnnotate] Translation: "${chunkText}" (${sourceLanguage} -> ${targetLanguage}) | literal="${literal}" | contextual="${contextual}"`,
      );
    } catch {}

    return {
      literal,
      contextual,
      differs,
    };
  } catch (error) {
    console.error('Failed to translate chunk:', error);

    // Check if it's a user gesture error
    if (error instanceof Error && error.message.includes('user gesture')) {
      console.warn('Chrome AI requires user gesture, returning fallback translation');
      return {
        literal: `[${sourceLanguage}] ${chunkText}`,
        contextual: `Translation of "${chunkText}"`,
        differs: true,
      };
    }

    // Return fallback for other errors
    return {
      literal: chunkText,
      contextual: chunkText,
      differs: false,
    };
  }
};

/**
 * Gets contextual translation using LanguageModel API
 */
const translateContextually = async (
  text: string,
  sourceLanguage: SupportedLanguage,
  targetLanguage: SupportedLanguage,
  context: string,
  literalCandidate?: string,
): Promise<string> => {
  try {
    const aiManager = ChromeAIManager.getInstance();
    const session = await aiManager.getMainSession();
    const model = session.model;

    const prompt = `Translate the following ${sourceLanguage} text to ${targetLanguage}. Consider the surrounding context for natural translation. If the provided literal translation is already natural and correct in this context, return it EXACTLY as-is; otherwise, provide a better contextual translation.

Context: "${context}"
Text to translate: "${text}"
Literal translation candidate: "${literalCandidate ?? ''}"

Provide only the translation, nothing else.`;

    const response = await model.prompt(prompt, {});
    const out = response.trim();
    if (literalCandidate && canonicalForMerge(out) === canonicalForMerge(literalCandidate)) {
      return literalCandidate;
    }
    return out;
  } catch (error) {
    console.error('Failed to get contextual translation, falling back to literal:', error);

    // Check if it's a user gesture error
    if (error instanceof Error && error.message.includes('user gesture')) {
      console.warn('Chrome AI requires user gesture for contextual translation');
      return `[Contextual] ${text}`;
    }

    // Fallback to literal translation
    try {
      return await translateText(text, sourceLanguage, targetLanguage);
    } catch (literalError) {
      console.error('Literal translation also failed:', literalError);
      return text; // Ultimate fallback
    }
  }
};

/**
 * Normalizes text for comparison (removes whitespace, case)
 */
const normalizeForComparison = (text: string): string => text.trim().toLowerCase().replace(/\s+/g, ' ');

/**
 * Canonicalize a translation for merging comparisons (strip punctuation, collapse spaces, map simple synonyms)
 */
const canonicalForMerge = (text: string): string => {
  const lower = text.toLowerCase().trim();
  // Prefer a single option if slash-delimited
  const primary = lower.includes('/') ? lower.split('/')[0].trim() : lower;
  // Remove punctuation
  const noPunct = primary.replace(/[!?.",'()\[\]]+/g, '').replace(/\s+/g, ' ').trim();
  // Simple synonym normalization
  const synonymMap: Record<string, string> = {
    hi: 'hello',
    'yes sir': 'yes',
    sir: 'yes',
  };
  const mapped = synonymMap[noPunct] ?? noPunct;
  return mapped;
};

export { translateChunk };
