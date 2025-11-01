// Vocabulary API
// Provides a clean interface for vocabulary operations via offscreen document

import {
  sendDatabaseMessageForArray,
  sendDatabaseMessageForItem,
  sendDatabaseMessageForBoolean,
  sendDatabaseMessageForNumber,
  VocabularyItemSchema,
} from './database-api-utils.js';
import { z } from 'zod';

export interface VocabularyItem {
  id: number;
  text: string;
  language: string;
  knowledge_level: number;
  last_reviewed_at: string;
  created_at: string;
}

export interface NewVocabularyItem {
  text: string;
  language: string;
}

export interface VocabularyResponse {
  success: boolean;
  data?: VocabularyItem;
  error?: string;
}

/**
 * Get all vocabulary items for summary
 */
export const getAllVocabularyForSummary = async (): Promise<VocabularyItem[]> => {
  const response = await sendDatabaseMessageForArray<VocabularyItem>('getAllVocabularyForSummary');
  // Validate each item in the array
  return response.map(item => VocabularyItemSchema.parse(item));
};

/**
 * Add a vocabulary item via offscreen document
 */
export const addVocabularyItem = async (item: NewVocabularyItem): Promise<VocabularyItem | null> => {
  const NewVocabularyItemSchema = z.object({
    text: z.string().min(1),
    language: z.string(),
  });
  const validatedItem = NewVocabularyItemSchema.parse(item);
  return await sendDatabaseMessageForItem<VocabularyItem>('addVocabularyItem', validatedItem, VocabularyItemSchema);
};

/**
 * Delete a vocabulary item via offscreen document
 */
export const deleteVocabularyItem = async (id: number): Promise<boolean> =>
  await sendDatabaseMessageForBoolean('deleteVocabularyItem', { id });

/**
 * Delete multiple vocabulary items via offscreen document
 */
export const deleteVocabularyItems = async (ids: number[]): Promise<boolean> =>
  await sendDatabaseMessageForBoolean('deleteVocabularyItems', { ids });

/**
 * Update vocabulary item knowledge level via offscreen document
 */
export const updateVocabularyItemKnowledgeLevel = async (id: number, level: number): Promise<boolean> =>
  await sendDatabaseMessageForBoolean('updateVocabularyItemKnowledgeLevel', { id, level });

/**
 * Update multiple vocabulary items knowledge levels via offscreen document
 */
export const updateVocabularyItemKnowledgeLevels = async (ids: number[], levelChange: 1 | -1): Promise<boolean> =>
  await sendDatabaseMessageForBoolean('updateVocabularyItemKnowledgeLevels', { ids, levelChange });

/**
 * Get vocabulary items with pagination via offscreen document
 */
export const getVocabulary = async (
  page: number = 1,
  limit: number = 10,
  languageFilter?: string | null,
): Promise<VocabularyItem[]> => {
  const response = await sendDatabaseMessageForArray<VocabularyItem>('getVocabulary', { page, limit, languageFilter });
  // Validate each item in the array
  return response.map(item => VocabularyItemSchema.parse(item));
};

/**
 * Get vocabulary count via offscreen document
 */
export const getVocabularyCount = async (languageFilter?: string | null): Promise<number> =>
  sendDatabaseMessageForNumber('getVocabularyCount', { languageFilter });

/**
 * Reset vocabulary database via offscreen document
 */
export const resetVocabularyDatabase = async (): Promise<boolean> =>
  await sendDatabaseMessageForBoolean('resetVocabularyDatabase');

/**
 * Populate dummy vocabulary via offscreen document
 */
export const populateDummyVocabulary = async (): Promise<boolean> =>
  await sendDatabaseMessageForBoolean('populateDummyVocabulary');

/**
 * Ensure vocabulary database is initialized via offscreen document
 */
export const ensureVocabularyDatabaseInitialized = async (): Promise<boolean> =>
  sendDatabaseMessageForBoolean('ensureDatabaseInitialized');

/**
 * Get vocabulary items by language and return as Map for O(1) lookup
 * Map is keyed by lowercase word text
 * Uses getVocabulary with large limit to fetch all items for the language
 */
export const getVocabularyByLanguageMap = async (language: string): Promise<Map<string, VocabularyItem>> => {
  // Fetch all vocabulary for the language using a large limit
  // In practice, this should be fine for typical vocabulary sizes
  const response = await sendDatabaseMessageForArray<VocabularyItem>('getVocabulary', {
    page: 1,
    limit: 10000,
    languageFilter: language,
  });
  
  // Validate each item and create Map
  const validatedItems = response.map(item => VocabularyItemSchema.parse(item));
  const vocabularyMap = new Map<string, VocabularyItem>();
  
  for (const item of validatedItems) {
    // Use lowercase text as key for case-insensitive matching
    const key = item.text.toLowerCase().trim();
    // If multiple items have same lowercase text, keep the one with lower knowledge_level (more challenging)
    const existing = vocabularyMap.get(key);
    if (!existing || item.knowledge_level < existing.knowledge_level) {
      vocabularyMap.set(key, item);
    }
  }
  
  return vocabularyMap;
};

/**
 * Get review queue - words that need to be reviewed
 * Returns words reviewed more than 7 days ago or never reviewed
 */
export const getReviewQueue = async (limit?: number): Promise<VocabularyItem[]> => {
  const response = await sendDatabaseMessageForArray<VocabularyItem>('getReviewQueue', { limit });
  return response.map(item => VocabularyItemSchema.parse(item));
};

/**
 * Mark a vocabulary item as reviewed (updates last_reviewed_at)
 */
export const markAsReviewed = async (id: number): Promise<boolean> =>
  await sendDatabaseMessageForBoolean('markAsReviewed', { id });

/**
 * Get the next review date (when reviews will next be available)
 * Returns ISO string of the date when the next word will be due for review, or null if no words exist
 */
export const getNextReviewDate = async (): Promise<string | null> => {
  const response = await sendDatabaseMessageForItem<string | null>(
    'getNextReviewDate',
    {},
    z.string().nullable(),
  );
  return response ?? null;
};
