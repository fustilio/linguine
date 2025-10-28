// Vocabulary API
// Provides a clean interface for vocabulary operations via offscreen document

import {
  sendDatabaseMessageForArray,
  sendDatabaseMessageForItem,
  sendDatabaseMessageForBoolean,
  sendDatabaseMessageForNumber,
} from './database-api-utils.js';

export interface VocabularyItem {
  id: number;
  text: string;
  language: string;
  knowledge_level: number;
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
  return sendDatabaseMessageForArray<VocabularyItem>('getAllVocabularyForSummary');
};

/**
 * Add a vocabulary item via offscreen document
 */
export const addVocabularyItem = async (item: NewVocabularyItem): Promise<VocabularyItem | null> => {
  const result = await sendDatabaseMessageForItem<VocabularyItem>('addVocabularyItem', item);
  if (result) {
    console.log('✅ Vocabulary item saved successfully');
  }
  return result;
};

/**
 * Delete a vocabulary item via offscreen document
 */
export const deleteVocabularyItem = async (id: number): Promise<boolean> => {
  const result = await sendDatabaseMessageForBoolean('deleteVocabularyItem', { id });
  if (result) {
    console.log('✅ Vocabulary item deleted successfully');
  }
  return result;
};

/**
 * Delete multiple vocabulary items via offscreen document
 */
export const deleteVocabularyItems = async (ids: number[]): Promise<boolean> => {
  const result = await sendDatabaseMessageForBoolean('deleteVocabularyItems', { ids });
  if (result) {
    console.log('✅ Vocabulary items deleted successfully');
  }
  return result;
};

/**
 * Update vocabulary item knowledge level via offscreen document
 */
export const updateVocabularyItemKnowledgeLevel = async (id: number, level: number): Promise<boolean> => {
  const result = await sendDatabaseMessageForBoolean('updateVocabularyItemKnowledgeLevel', { id, level });
  if (result) {
    console.log('✅ Vocabulary item knowledge level updated successfully');
  }
  return result;
};

/**
 * Update multiple vocabulary items knowledge levels via offscreen document
 */
export const updateVocabularyItemKnowledgeLevels = async (ids: number[], levelChange: 1 | -1): Promise<boolean> => {
  const result = await sendDatabaseMessageForBoolean('updateVocabularyItemKnowledgeLevels', { ids, levelChange });
  if (result) {
    console.log('✅ Vocabulary items knowledge levels updated successfully');
  }
  return result;
};

/**
 * Get vocabulary items with pagination via offscreen document
 */
export const getVocabulary = async (
  page: number = 1,
  limit: number = 10,
  languageFilter?: string | null
): Promise<VocabularyItem[]> => {
  return sendDatabaseMessageForArray<VocabularyItem>('getVocabulary', { page, limit, languageFilter });
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
  const result = await sendDatabaseMessageForBoolean('resetVocabularyDatabase');
  if (result) {
    console.log('✅ Vocabulary database reset successfully');
  }
  return result;
};

/**
 * Populate dummy vocabulary via offscreen document
 */
export const populateDummyVocabulary = async (): Promise<boolean> => {
  const result = await sendDatabaseMessageForBoolean('populateDummyVocabulary');
  if (result) {
    console.log('✅ Dummy vocabulary populated successfully');
  }
  return result;
};

/**
 * Ensure vocabulary database is initialized via offscreen document
 */
export const ensureVocabularyDatabaseInitialized = async (): Promise<boolean> => {
  return sendDatabaseMessageForBoolean('ensureDatabaseInitialized');
};
