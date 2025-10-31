/**
 * Translation utilities using Chrome Translator and LanguageModel APIs
 */

/// <reference types="dom-chromium-ai" />

import { translateText, rewriteText } from '../chrome-ai/convenience-functions.js';
import { ChromeAIManager } from '../chrome-ai/language-model-manager.js';
import { buildRewriterOptions } from '../rewriter-options.js';
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

const getAndResetTranslatorMetrics = () => {
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
    const differs = litCanon !== ctxCanon;
    if (!differs) {
      contextual = literal;
    }

    // Concise translation log
    try {
      console.log(
        `[TextAnnotate] Translation: "${chunkText}" (${sourceLanguage} -> ${targetLanguage}) | literal="${literal}" | contextual="${contextual}"`,
      );
    } catch {
      // Ignore logging errors
    }

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
 * Canonicalize a translation for merging comparisons (strip punctuation, collapse spaces, map simple synonyms)
 */
const canonicalForMerge = (text: string): string => {
  const lower = text.toLowerCase().trim();
  // Prefer a single option if slash-delimited
  const primary = lower.includes('/') ? lower.split('/')[0].trim() : lower;
  // Remove punctuation
  const noPunct = primary
    .replace(/[!?.",'()[\] ]+/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  // Simple synonym normalization
  const synonymMap: Record<string, string> = {
    hi: 'hello',
    'yes sir': 'yes',
    sir: 'yes',
  };
  const mapped = synonymMap[noPunct] ?? noPunct;
  return mapped;
};

/**
 * Simplifies a chunk using Chrome Rewriter API (for English-to-simple-English)
 * Returns simplified text in both literal and contextual fields
 */
const rewriteChunk = async (
  chunkText: string,
  fullContext?: string,
  chunkStart?: number,
  chunkEnd?: number,
): Promise<ChunkTranslation> => {
  try {
    const rewriteStart = performance.now();

    // Build rewriter options for English simplification
    const rewriterOptions = buildRewriterOptions(
      {
        tone: 'as-is',
        format: 'as-is',
        length: 'shorter', // Prefer shorter/simpler text
      },
      'en', // detected language (English)
      'en', // native language (English)
    );

    // Create context prompt for simplification (similar to rewriteSelectedText)
    let contextPrompt = 'Make this text easier to understand for language learners. Use simpler vocabulary.';
    if (fullContext && typeof chunkStart === 'number' && typeof chunkEnd === 'number') {
      // Extract before and after context from full context
      const beforeContext = fullContext.substring(0, chunkStart).trim();
      const afterContext = fullContext.substring(chunkEnd).trim();

      if (beforeContext || afterContext) {
        contextPrompt = `CONTEXT: "${beforeContext} [TARGET] ${afterContext}"

INSTRUCTIONS:
- You will simplify ONLY the word(s) marked as [TARGET] in the context
- The [TARGET] text is: "${chunkText}"
- Make it easier to understand for language learners
- Use simpler vocabulary
- Your response should contain ONLY the simplified text, nothing else
- Do NOT include the surrounding context in your response
- Do NOT repeat the original text
- Do NOT provide explanations

EXAMPLE:
If context is "The cat [TARGET] quickly" and target is "ran", respond with just: "moved fast"`;
      }
    } else if (fullContext && fullContext !== chunkText) {
      // Fallback: use full context as before/after
      const targetIndex = fullContext.indexOf(chunkText);
      if (targetIndex !== -1) {
        const beforeContext = fullContext.substring(0, targetIndex).trim();
        const afterContext = fullContext.substring(targetIndex + chunkText.length).trim();

        if (beforeContext || afterContext) {
          contextPrompt = `CONTEXT: "${beforeContext} [TARGET] ${afterContext}"

INSTRUCTIONS:
- You will simplify ONLY the word(s) marked as [TARGET] in the context
- The [TARGET] text is: "${chunkText}"
- Make it easier to understand for language learners
- Use simpler vocabulary
- Your response should contain ONLY the simplified text, nothing else
- Do NOT include the surrounding context in your response
- Do NOT repeat the original text
- Do NOT provide explanations`;
        }
      }
    }

    const simplified = await rewriteText(chunkText, {
      ...rewriterOptions,
      context: contextPrompt,
    });

    const rewriteEnd = performance.now();
    translatorMetrics.literalCount += 1; // Reuse metrics tracking
    translatorMetrics.literalTimeMs += rewriteEnd - rewriteStart;
    translatorMetrics.contextualCount += 1;
    translatorMetrics.contextualTimeMs += rewriteEnd - rewriteStart;

    // Log simplification
    try {
      console.log(`[TextAnnotate] Simplification: "${chunkText}" -> "${simplified}"`);
    } catch {
      // Ignore logging errors
    }

    // For simplification, both literal and contextual are the same (simplified text)
    return {
      literal: simplified,
      contextual: simplified,
      differs: false, // No difference since it's simplification, not translation
    };
  } catch (error) {
    console.error('Failed to simplify chunk:', error);

    // Return original text as fallback
    return {
      literal: chunkText,
      contextual: chunkText,
      differs: false,
    };
  }
};

export { translateChunk, rewriteChunk, getAndResetTranslatorMetrics };
