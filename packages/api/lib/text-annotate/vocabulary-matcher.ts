/**
 * Vocabulary matching utility for text annotation
 * Matches chunks against vocabulary database to determine mastery level
 */

import type { VocabularyItem } from '../vocabulary-api.js';

/**
 * Tokenize text by splitting on whitespace and removing punctuation
 */
const tokenizeText = (text: string): string[] =>
  text
    .toLowerCase()
    .split(/\s+/)
    .map(word => word.replace(/[^\w]/g, ''))
    .filter(word => word.length > 0);

/**
 * Result of matching a chunk against vocabulary
 */
export interface VocabularyMatch {
  vocabularyItem: VocabularyItem | null;
  knowledgeLevel: number | null;
  isRegistered: boolean;
}

/**
 * Match a chunk against vocabulary database
 * Returns the vocabulary match with the lowest knowledge level (most challenging word)
 *
 * @param chunkText - The chunk text to match
 * @param language - The language of the chunk
 * @param vocabularyMap - Map of vocabulary words (key: lowercase word, value: VocabularyItem)
 * @returns VocabularyMatch with the most challenging word's level, or null if no match
 */
export const matchChunkToVocabulary = (
  chunkText: string,
  language: string,
  vocabularyMap: Map<string, VocabularyItem>,
): VocabularyMatch | null => {
  if (!vocabularyMap || vocabularyMap.size === 0) {
    return null;
  }

  // Try exact match first (for single words or phrases)
  const exactKey = chunkText.toLowerCase().trim();
  const exactMatch = vocabularyMap.get(exactKey);
  if (exactMatch && exactMatch.language === language) {
    return {
      vocabularyItem: exactMatch,
      knowledgeLevel: exactMatch.knowledge_level,
      isRegistered: true,
    };
  }

  // Tokenize and match individual words
  const tokens = tokenizeText(chunkText);
  if (tokens.length === 0) {
    return null;
  }

  // Find all matching vocabulary items from tokens
  const matches: VocabularyItem[] = [];
  for (const token of tokens) {
    const vocabItem = vocabularyMap.get(token);
    if (vocabItem && vocabItem.language === language) {
      matches.push(vocabItem);
    }
  }

  if (matches.length === 0) {
    return null;
  }

  // Return the match with the lowest knowledge level (most challenging)
  // This determines the color - if any word is challenging, the whole chunk should reflect that
  const mostChallenging = matches.reduce((prev, current) =>
    current.knowledge_level < prev.knowledge_level ? current : prev,
  );

  return {
    vocabularyItem: mostChallenging,
    knowledgeLevel: mostChallenging.knowledge_level,
    isRegistered: true,
  };
};
