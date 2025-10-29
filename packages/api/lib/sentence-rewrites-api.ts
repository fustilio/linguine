// Sentence Rewrites API
// Provides a clean interface for sentence rewrite operations via offscreen document

import {
  sendDatabaseMessageForArray,
  sendDatabaseMessageForItem,
  sendDatabaseMessageForBoolean,
  sendDatabaseMessageForNumber,
} from './database-api-utils.js';
import type { VocabularyItem } from './vocabulary-api.js';
import { LanguageCodeSchema } from '@extension/shared';
import { z } from 'zod';

export interface SentenceRewriteData {
  original_text: string;
  rewritten_text: string;
  language: string;
  rewriter_settings: string;
  source_url: string;
  url_fragment?: string | null;
}

export interface SentenceRewriteFilters {
  language?: string;
  minReadability?: number;
  maxReadability?: number;
  recentDays?: number;
  sourceUrl?: string;
}

// Zod schemas for validation
export const SentenceRewriteDataSchema = z.object({
  original_text: z.string().min(1),
  rewritten_text: z.string().min(1),
  language: LanguageCodeSchema,
  rewriter_settings: z.string(),
  source_url: z.string().url(),
  url_fragment: z.string().nullable().optional(),
});

export const SentenceRewriteFiltersSchema = z.object({
  language: LanguageCodeSchema.optional(),
  minReadability: z.number().min(0).max(100).optional(),
  maxReadability: z.number().min(0).max(100).optional(),
  recentDays: z.number().positive().optional(),
  sourceUrl: z.string().url().optional(),
});

export interface SentenceRewriteResponse {
  success: boolean;
  data?: {
    items: SentenceRewrite[];
    totalItems: number;
  };
  error?: string;
}

export interface SentenceRewrite {
  id: number;
  original_text: string;
  rewritten_text: string;
  language: string;
  rewriter_settings: string;
  source_url: string;
  url_fragment: string;
  original_readability_score: number;
  rewritten_readability_score: number;
  created_at: string;
}

/**
 * Add a sentence rewrite via offscreen document
 */
export const addSentenceRewrite = async (rewriteData: SentenceRewriteData): Promise<SentenceRewrite | null> => {
  // Validate input data
  const validatedData = SentenceRewriteDataSchema.parse(rewriteData);
  
  const result = await sendDatabaseMessageForItem<SentenceRewrite>('addSentenceRewrite', validatedData);
  if (result) {
    console.log('✅ Sentence rewrite saved successfully');
  }
  return result;
};

/**
 * Get sentence rewrites via offscreen document
 */
export const getSentenceRewrites = async (
  page: number = 1,
  limit: number = 10,
  filters: SentenceRewriteFilters = {}
): Promise<SentenceRewrite[]> => {
  // Validate filters
  const validatedFilters = SentenceRewriteFiltersSchema.parse(filters);
  
  return sendDatabaseMessageForArray<SentenceRewrite>('getSentenceRewrites', { page, limit, filters: validatedFilters });
};

/**
 * Get sentence rewrite count via offscreen document
 */
export const getSentenceRewriteCount = async (filters: SentenceRewriteFilters = {}): Promise<number> => {
  // Validate filters
  const validatedFilters = SentenceRewriteFiltersSchema.parse(filters);
  
  return sendDatabaseMessageForNumber('getSentenceRewriteCount', { filters: validatedFilters });
};

/**
 * Delete a single sentence rewrite via offscreen document
 */
export const deleteSentenceRewrite = async (id: number): Promise<boolean> => {
  const result = await sendDatabaseMessageForBoolean('deleteSentenceRewrite', { id });
  if (result) {
    console.log('✅ Sentence rewrite deleted successfully');
  }
  return result;
};

/**
 * Delete multiple sentence rewrites via offscreen document
 */
export const deleteSentenceRewrites = async (ids: number[]): Promise<boolean> => {
  const result = await sendDatabaseMessageForBoolean('deleteSentenceRewrites', { ids });
  if (result) {
    console.log('✅ Sentence rewrites deleted successfully');
  }
  return result;
};

/**
 * Clear all sentence rewrites via offscreen document
 */
export const clearAllSentenceRewrites = async (): Promise<boolean> => {
  const result = await sendDatabaseMessageForBoolean('clearAllSentenceRewrites');
  if (result) {
    console.log('✅ All sentence rewrites cleared successfully');
  }
  return result;
};

/**
 * Get sentence rewrite by ID via offscreen document
 */
export const getSentenceRewriteById = async (id: number): Promise<SentenceRewrite | null> => {
  return sendDatabaseMessageForItem<SentenceRewrite>('getSentenceRewriteById', { id });
};

/**
 * Get sentence rewrites by language via offscreen document
 */
export const getSentenceRewritesByLanguage = async (language: string): Promise<SentenceRewrite[]> => {
  return sendDatabaseMessageForArray<SentenceRewrite>('getSentenceRewritesByLanguage', { language });
};

/**
 * Get recent sentence rewrites via offscreen document
 */
export const getRecentSentenceRewrites = async (days: number = 7, language?: string): Promise<SentenceRewrite[]> => {
  return sendDatabaseMessageForArray<SentenceRewrite>('getRecentSentenceRewrites', { days, language });
};

/**
 * Get sentence rewrites by URL via offscreen document
 */
export const getSentenceRewritesByUrl = async (url: string): Promise<SentenceRewrite[]> => {
  return sendDatabaseMessageForArray<SentenceRewrite>('getSentenceRewritesByUrl', { url });
};

/**
 * Get sentence rewrites by readability score via offscreen document
 */
export const getSentenceRewritesByReadability = async (
  minScore: number,
  maxScore: number,
  language?: string
): Promise<SentenceRewrite[]> => {
  return sendDatabaseMessageForArray<SentenceRewrite>('getSentenceRewritesByReadability', { minScore, maxScore, language });
};

/**
 * Get vocabulary words in a sentence via offscreen document
 */
export const getVocabularyWordsInSentence = async (sentenceId: number): Promise<VocabularyItem[]> => {
  return sendDatabaseMessageForArray<VocabularyItem>('getVocabularyWordsInSentence', { sentenceId });
};

/**
 * Get sentences containing a vocabulary word via offscreen document
 */
export const getSentencesContainingWord = async (vocabularyId: number): Promise<SentenceRewrite[]> => {
  return sendDatabaseMessageForArray<SentenceRewrite>('getSentencesContainingWord', { vocabularyId });
};

/**
 * Reset sentence rewrites database via offscreen document
 */
export const resetSentenceRewritesDatabase = async (): Promise<boolean> => {
  const result = await sendDatabaseMessageForBoolean('resetSentenceRewritesDatabase');
  if (result) {
    console.log('✅ Sentence rewrites database reset successfully');
  }
  return result;
};

/**
 * Ensure database is initialized via offscreen document
 */
export const ensureDatabaseInitialized = async (): Promise<boolean> => {
  return sendDatabaseMessageForBoolean('ensureDatabaseInitialized');
};

/**
 * Migrate language codes to normalize inconsistent language labels via offscreen document
 */
export const migrateLanguageCodes = async (): Promise<{ updated: number; errors: number }> => {
  const result = await sendDatabaseMessageForItem<{ updated: number; errors: number }>('migrateLanguageCodes');
  if (result) {
    console.log(`✅ Language code migration completed: ${result.updated} updated, ${result.errors} errors`);
  }
  return result || { updated: 0, errors: 0 };
};
