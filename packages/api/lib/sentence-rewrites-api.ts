// Sentence Rewrites API
// Provides a clean interface for sentence rewrite operations via offscreen document

import {
  sendDatabaseMessageForArray,
  sendDatabaseMessageForItem,
  sendDatabaseMessageForBoolean,
  sendDatabaseMessageForNumber,
} from './database-api-utils.js';
import type { VocabularyItem } from './vocabulary-api.js';

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
  const result = await sendDatabaseMessageForItem<SentenceRewrite>('addSentenceRewrite', rewriteData);
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
  return sendDatabaseMessageForArray<SentenceRewrite>('getSentenceRewrites', { page, limit, filters });
};

/**
 * Get sentence rewrite count via offscreen document
 */
export const getSentenceRewriteCount = async (filters: SentenceRewriteFilters = {}): Promise<number> => {
  return sendDatabaseMessageForNumber('getSentenceRewriteCount', { filters });
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
