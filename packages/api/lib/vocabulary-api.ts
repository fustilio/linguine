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
export const deleteVocabularyItem = async (id: number): Promise<boolean> => {
  return await sendDatabaseMessageForBoolean('deleteVocabularyItem', { id });
};

/**
 * Delete multiple vocabulary items via offscreen document
 */
export const deleteVocabularyItems = async (ids: number[]): Promise<boolean> => {
  return await sendDatabaseMessageForBoolean('deleteVocabularyItems', { ids });
};

/**
 * Update vocabulary item knowledge level via offscreen document
 */
export const updateVocabularyItemKnowledgeLevel = async (id: number, level: number): Promise<boolean> => {
  return await sendDatabaseMessageForBoolean('updateVocabularyItemKnowledgeLevel', { id, level });
};

/**
 * Update multiple vocabulary items knowledge levels via offscreen document
 */
export const updateVocabularyItemKnowledgeLevels = async (ids: number[], levelChange: 1 | -1): Promise<boolean> => {
  return await sendDatabaseMessageForBoolean('updateVocabularyItemKnowledgeLevels', { ids, levelChange });
};

/**
 * Get vocabulary items with pagination via offscreen document
 */
export const getVocabulary = async (
  page: number = 1,
  limit: number = 10,
  languageFilter?: string | null
): Promise<VocabularyItem[]> => {
  const response = await sendDatabaseMessageForArray<VocabularyItem>('getVocabulary', { page, limit, languageFilter });
  // Validate each item in the array
  return response.map(item => VocabularyItemSchema.parse(item));
};

/**
 * Get vocabulary count via offscreen document
 */
export const getVocabularyCount = async (languageFilter?: string | null): Promise<number> => {
  return sendDatabaseMessageForNumber('getVocabularyCount', { languageFilter });
};

/**
 * Reset vocabulary database via offscreen document
 */
export const resetVocabularyDatabase = async (): Promise<boolean> => {
  return await sendDatabaseMessageForBoolean('resetVocabularyDatabase');
};

/**
 * Populate dummy vocabulary via offscreen document
 */
export const populateDummyVocabulary = async (): Promise<boolean> => {
  return await sendDatabaseMessageForBoolean('populateDummyVocabulary');
};

/**
 * Ensure vocabulary database is initialized via offscreen document
 */
export const ensureVocabularyDatabaseInitialized = async (): Promise<boolean> => {
  return sendDatabaseMessageForBoolean('ensureDatabaseInitialized');
};
