// Text Rewrites API
// Provides a clean interface for text rewrite operations via offscreen document

import {
  sendDatabaseMessageForArray,
  sendDatabaseMessageForItem,
  sendDatabaseMessageForBoolean,
  sendDatabaseMessageForNumber,
} from './database-api-utils.js';
import type { VocabularyItem } from './vocabulary-api.js';
import { LanguageCodeSchema } from '@extension/shared';
import { z } from 'zod';

export interface TextRewriteData {
  original_text: string;
  rewritten_text: string;
  language: string;
  rewriter_settings: string;
  source_url: string;
  url_fragment?: string | null;
}

export interface TextRewriteFilters {
  language?: string;
  minReadability?: number;
  maxReadability?: number;
  recentDays?: number;
  sourceUrl?: string;
}

// Zod schemas for validation
export const TextRewriteDataSchema = z.object({
  original_text: z.string().min(1),
  rewritten_text: z.string().min(1),
  language: LanguageCodeSchema,
  rewriter_settings: z.string(),
  source_url: z.string().url(),
  url_fragment: z.string().nullable().optional(),
});

export const TextRewriteFiltersSchema = z.object({
  language: LanguageCodeSchema.optional(),
  minReadability: z.number().min(0).max(100).optional(),
  maxReadability: z.number().min(0).max(100).optional(),
  recentDays: z.number().positive().optional(),
  sourceUrl: z.string().url().optional(),
});

export interface TextRewriteResponse {
  success: boolean;
  data?: {
    items: TextRewrite[];
    totalItems: number;
  };
  error?: string;
}

export interface TextRewrite {
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
 * Add a text rewrite via offscreen document
 */
export const addTextRewrite = async (rewriteData: TextRewriteData): Promise<TextRewrite | null> => {
  // Validate input data
  const validatedData = TextRewriteDataSchema.parse(rewriteData);
  
  const result = await sendDatabaseMessageForItem<TextRewrite>('addTextRewrite', validatedData);
  if (result) {
    console.log('✅ Text rewrite saved successfully');
  }
  return result;
};

/**
 * Get text rewrites via offscreen document
 */
export const getTextRewrites = async (
  page: number = 1,
  limit: number = 10,
  filters: TextRewriteFilters = {}
): Promise<TextRewrite[]> => {
  // Validate filters
  const validatedFilters = TextRewriteFiltersSchema.parse(filters);
  
  return sendDatabaseMessageForArray<TextRewrite>('getTextRewrites', { page, limit, filters: validatedFilters });
};

/**
 * Get text rewrite count via offscreen document
 */
export const getTextRewriteCount = async (filters: TextRewriteFilters = {}): Promise<number> => {
  // Validate filters
  const validatedFilters = TextRewriteFiltersSchema.parse(filters);
  
  return sendDatabaseMessageForNumber('getTextRewriteCount', { filters: validatedFilters });
};

/**
 * Delete a single text rewrite via offscreen document
 */
export const deleteTextRewrite = async (id: number): Promise<boolean> => {
  const result = await sendDatabaseMessageForBoolean('deleteTextRewrite', { id });
  if (result) {
    console.log('✅ Text rewrite deleted successfully');
  }
  return result;
};

/**
 * Delete multiple text rewrites via offscreen document
 */
export const deleteTextRewrites = async (ids: number[]): Promise<boolean> => {
  const result = await sendDatabaseMessageForBoolean('deleteTextRewrites', { ids });
  if (result) {
    console.log('✅ Text rewrites deleted successfully');
  }
  return result;
};

/**
 * Clear all text rewrites via offscreen document
 */
export const clearAllTextRewrites = async (): Promise<boolean> => {
  const result = await sendDatabaseMessageForBoolean('clearAllTextRewrites');
  if (result) {
    console.log('✅ All text rewrites cleared successfully');
  }
  return result;
};

/**
 * Get text rewrite by ID via offscreen document
 */
export const getTextRewriteById = async (id: number): Promise<TextRewrite | null> => {
  return sendDatabaseMessageForItem<TextRewrite>('getTextRewriteById', { id });
};

/**
 * Get text rewrites by language via offscreen document
 */
export const getTextRewritesByLanguage = async (language: string): Promise<TextRewrite[]> => {
  return sendDatabaseMessageForArray<TextRewrite>('getTextRewritesByLanguage', { language });
};

/**
 * Get recent text rewrites via offscreen document
 */
export const getRecentTextRewrites = async (days: number = 7, language?: string): Promise<TextRewrite[]> => {
  return sendDatabaseMessageForArray<TextRewrite>('getRecentTextRewrites', { days, language });
};

/**
 * Get text rewrites by URL via offscreen document
 */
export const getTextRewritesByUrl = async (url: string): Promise<TextRewrite[]> => {
  return sendDatabaseMessageForArray<TextRewrite>('getTextRewritesByUrl', { url });
};

/**
 * Get text rewrites by readability score via offscreen document
 */
export const getTextRewritesByReadability = async (
  minScore: number,
  maxScore: number,
  language?: string
): Promise<TextRewrite[]> => {
  return sendDatabaseMessageForArray<TextRewrite>('getTextRewritesByReadability', { minScore, maxScore, language });
};

/**
 * Get vocabulary words in a text via offscreen document
 */
export const getVocabularyWordsInText = async (textId: number): Promise<VocabularyItem[]> => {
  return sendDatabaseMessageForArray<VocabularyItem>('getVocabularyWordsInText', { textId });
};

/**
 * Get text rewrites containing a vocabulary word via offscreen document
 */
export const getTextRewritesContainingWord = async (vocabularyId: number): Promise<TextRewrite[]> => {
  return sendDatabaseMessageForArray<TextRewrite>('getTextRewritesContainingWord', { vocabularyId });
};

/**
 * Reset text rewrites database via offscreen document
 */
export const resetTextRewritesDatabase = async (): Promise<boolean> => {
  const result = await sendDatabaseMessageForBoolean('resetTextRewritesDatabase');
  if (result) {
    console.log('✅ Text rewrites database reset successfully');
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
