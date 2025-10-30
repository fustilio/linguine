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
const translateChunk = async (
  chunkText: string,
  sourceLanguage: SupportedLanguage,
  targetLanguage: SupportedLanguage,
  context?: string,
): Promise<ChunkTranslation> => {
  console.log(`[TextAnnotate] translateChunk: "${chunkText}" (${sourceLanguage} -> ${targetLanguage})`);
  try {
    // Get literal translation using Translator API
    console.log('[TextAnnotate] Getting literal translation...');
    const literal = await translateText(chunkText, sourceLanguage, targetLanguage);
    console.log('[TextAnnotate] Literal translation:', literal);

    // Get contextual translation using LanguageModel API
    let contextual = literal;
    if (context && context !== chunkText) {
      console.log('[TextAnnotate] Getting contextual translation...');
      contextual = await translateContextually(chunkText, sourceLanguage, targetLanguage, context);
      console.log('[TextAnnotate] Contextual translation:', contextual);
    }

    // Check if translations differ
    const differs = normalizeForComparison(literal) !== normalizeForComparison(contextual);

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
): Promise<string> => {
  try {
    const aiManager = ChromeAIManager.getInstance();
    const session = await aiManager.getMainSession();
    const model = session.model;

    const prompt = `Translate the following ${sourceLanguage} text to ${targetLanguage}. Consider the surrounding context for natural translation.

Context: "${context}"
Text to translate: "${text}"

Provide only the translation, nothing else.`;

    const response = await model.prompt(prompt, {});
    return response.trim();
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

export { translateChunk };
