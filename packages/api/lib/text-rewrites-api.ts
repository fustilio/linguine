// Text Rewrites API
// Provides a clean interface for text rewrite operations via offscreen document

import {
  sendDatabaseMessageForArray,
  sendDatabaseMessageForItem,
  sendDatabaseMessageForBoolean,
  sendDatabaseMessageForNumber,
  TextRewriteSchema,
  TextRewriteDataSchema,
  TextRewriteFiltersSchema,
} from './database-api-utils.js';
import type { VocabularyItem } from './vocabulary-api.js';

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

// Note: TextRewriteDataSchema and TextRewriteFiltersSchema are exported from database-api-utils.js
// to avoid duplicate exports. They are imported above for use in this file.

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
  url_fragment: string | null;
  original_readability_score: number;
  rewritten_readability_score: number;
  created_at: string;
}

/**
 * Add a text rewrite via offscreen document
 */
export const addTextRewrite = async (rewriteData: TextRewriteData): Promise<TextRewrite | null> => {
  const validatedData = TextRewriteDataSchema.parse(rewriteData);
  return await sendDatabaseMessageForItem<TextRewrite>('addTextRewrite', validatedData, TextRewriteSchema);
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
  
  // Normalize sourceUrl to domain + path only
  if (validatedFilters.sourceUrl) {
    try {
      const url = new URL(validatedFilters.sourceUrl);
      validatedFilters.sourceUrl = `${url.origin}${url.pathname}`;
    } catch {
      // Keep original if URL parsing fails
    }
  }
  
  const response = await sendDatabaseMessageForArray<TextRewrite>('getTextRewrites', { page, limit, filters: validatedFilters });
  // Validate each item in the array
  return response.map(item => TextRewriteSchema.parse(item));
};

/**
 * Get text rewrite count via offscreen document
 */
export const getTextRewriteCount = async (filters: TextRewriteFilters = {}): Promise<number> => {
  // Validate filters
  const validatedFilters = TextRewriteFiltersSchema.parse(filters);
  
  // Normalize sourceUrl to domain + path only
  if (validatedFilters.sourceUrl) {
    try {
      const url = new URL(validatedFilters.sourceUrl);
      validatedFilters.sourceUrl = `${url.origin}${url.pathname}`;
    } catch {
      // Keep original if URL parsing fails
    }
  }
  
  return sendDatabaseMessageForNumber('getTextRewriteCount', { filters: validatedFilters });
};

/**
 * Delete a single text rewrite via offscreen document
 */
export const deleteTextRewrite = async (id: number): Promise<boolean> => {
  return await sendDatabaseMessageForBoolean('deleteTextRewrite', { id });
};

/**
 * Delete multiple text rewrites via offscreen document
 */
export const deleteTextRewrites = async (ids: number[]): Promise<boolean> => {
  return await sendDatabaseMessageForBoolean('deleteTextRewrites', { ids });
};

/**
 * Clear all text rewrites via offscreen document
 */
export const clearAllTextRewrites = async (): Promise<boolean> => {
  return await sendDatabaseMessageForBoolean('clearAllTextRewrites');
};

/**
 * Get text rewrite by ID via offscreen document
 */
export const getTextRewriteById = async (id: number): Promise<TextRewrite | null> => {
  return sendDatabaseMessageForItem<TextRewrite>('getTextRewriteById', { id }, TextRewriteSchema);
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
  return await sendDatabaseMessageForBoolean('resetTextRewritesDatabase');
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
  return result || { updated: 0, errors: 0 };
};

/**
 * Open a text rewrite in the browser by combining source URL and fragment
 */
export const openTextRewriteInBrowser = async (rewrite: TextRewrite): Promise<void> => {
  const fullUrl = rewrite.source_url + (rewrite.url_fragment || '');
  await chrome.tabs.create({ url: fullUrl, active: true });
};
