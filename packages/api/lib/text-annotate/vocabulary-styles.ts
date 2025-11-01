/**
 * Vocabulary-based styling utilities
 * Provides helper functions for vocabulary status and styling
 */

/**
 * Get vocabulary status from knowledge level
 */
export const getVocabularyStatus = (
  vocabularyMatch: { knowledgeLevel: number | null; isRegistered: boolean } | null | undefined,
): 'mastered' | 'easy' | 'challenging' | 'unregistered' => {
  if (!vocabularyMatch || !vocabularyMatch.isRegistered) {
    return 'unregistered';
  }

  const level = vocabularyMatch.knowledgeLevel;
  if (level === null) {
    return 'unregistered';
  }

  if (level === 5) {
    return 'mastered';
  }
  if (level >= 3) {
    return 'easy';
  }
  // level 1-2
  return 'challenging';
};
