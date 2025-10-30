import { getDatabaseManager } from './database-manager.js';
import { ManualSqliteClient } from './manual.js';
import { normalizeLanguageCode } from '@extension/shared';
import type { TextRewrite, NewTextRewrite, VocabularyItem } from './types.js';

const getDb = () => {
  const client = ManualSqliteClient.getInstance();
  return client.getDb();
};

const initializeTextRewritesDatabase = async () => {
  const db = getDb();
  if (!db) return;

  const tableExists = await db.introspection
    .getTables()
    .then((tables: { name: string }[]) => tables.some((table: { name: string }) => table.name === 'text_rewrites'));

  if (!tableExists) {
    await db.schema
      .createTable('text_rewrites')
      .ifNotExists()
      .addColumn('id', 'integer', col => col.primaryKey().autoIncrement())
      .addColumn('original_text', 'text', col => col.notNull())
      .addColumn('rewritten_text', 'text', col => col.notNull())
      .addColumn('language', 'text', col => col.notNull())
      .addColumn('rewriter_settings', 'text', col => col.notNull())
      .addColumn('source_url', 'text', col => col.notNull())
      .addColumn('url_fragment', 'text', col => col.notNull())
      .addColumn('original_readability_score', 'real', col => col.notNull())
      .addColumn('rewritten_readability_score', 'real', col => col.notNull())
      .addColumn('created_at', 'text', col => col.notNull())
      .execute();

    // Create indexes for common queries
    await db.schema.createIndex('idx_text_rewrites_language').on('text_rewrites').column('language').execute();

    await db.schema.createIndex('idx_text_rewrites_created_at').on('text_rewrites').column('created_at').execute();

    await db.schema
      .createIndex('idx_text_rewrites_original_readability_score')
      .on('text_rewrites')
      .column('original_readability_score')
      .execute();

    await db.schema
      .createIndex('idx_text_rewrites_rewritten_readability_score')
      .on('text_rewrites')
      .column('rewritten_readability_score')
      .execute();

    await db.schema.createIndex('idx_text_rewrites_source_url').on('text_rewrites').column('source_url').execute();
  }
};

const ensureTextRewritesDatabaseInitialized = async () => {
  const dbManager = getDatabaseManager();
  await dbManager.ensureInitialized();
};

// Readability calculation functions

/**
 * Count syllables in a word (English approximation)
 */
const countSyllablesEnglish = (word: string): number => {
  const vowels = 'aeiouyAEIOUY';
  let count = 0;
  let previousWasVowel = false;

  for (let i = 0; i < word.length; i++) {
    const isVowel = vowels.includes(word[i]);
    if (isVowel && !previousWasVowel) {
      count++;
    }
    previousWasVowel = isVowel;
  }

  // Handle silent 'e' at the end
  if (word.endsWith('e') && count > 1) {
    count--;
  }

  return Math.max(1, count);
};

/**
 * Count syllables in Spanish text
 */
const countSyllablesSpanish = (word: string): number => {
  // Spanish syllable counting is more complex, using approximation
  const vowels = 'aeiouáéíóúüAEIOUÁÉÍÓÚÜ';
  let count = 0;
  let previousWasVowel = false;

  for (let i = 0; i < word.length; i++) {
    const isVowel = vowels.includes(word[i]);
    if (isVowel && !previousWasVowel) {
      count++;
    }
    previousWasVowel = isVowel;
  }

  return Math.max(1, count);
};

/**
 * Count syllables in French text
 */
const countSyllablesFrench = (word: string): number => {
  // French syllable counting approximation
  const vowels = 'aeiouyàâäéèêëïîôöùûüÿAEIOUYÀÂÄÉÈÊËÏÎÔÖÙÛÜŸ';
  let count = 0;
  let previousWasVowel = false;

  for (let i = 0; i < word.length; i++) {
    const isVowel = vowels.includes(word[i]);
    if (isVowel && !previousWasVowel) {
      count++;
    }
    previousWasVowel = isVowel;
  }

  return Math.max(1, count);
};

/**
 * Count syllables in German text
 */
const countSyllablesGerman = (word: string): number => {
  // German syllable counting approximation
  const vowels = 'aeiouäöüAEIOUÄÖÜ';
  let count = 0;
  let previousWasVowel = false;

  for (let i = 0; i < word.length; i++) {
    const isVowel = vowels.includes(word[i]);
    if (isVowel && !previousWasVowel) {
      count++;
    }
    previousWasVowel = isVowel;
  }

  return Math.max(1, count);
};

/**
 * Count syllables in Korean text
 */
const countSyllablesKorean = (text: string): number => {
  // Korean syllable counting - each character is typically one syllable
  const koreanChars = text.match(/[\uAC00-\uD7AF]/g);
  return koreanChars ? koreanChars.length : 0;
};

/**
 * Count syllables based on language
 */
const countSyllables = (word: string, language: string): number => {
  // Normalize the language code to ensure consistency
  const normalizedLang = normalizeLanguageCode(language);

  switch (normalizedLang) {
    case 'es-ES':
      return countSyllablesSpanish(word);
    case 'fr-FR':
      return countSyllablesFrench(word);
    case 'de-DE':
      return countSyllablesGerman(word);
    case 'ko-KR':
      return countSyllablesKorean(word);
    case 'ja-JP':
      // Japanese syllable counting is complex, using character count approximation
      return Math.max(1, word.length);
    case 'en-US':
    default:
      return countSyllablesEnglish(word);
  }
};

/**
 * Count sentences in text based on language
 */
const countSentences = (text: string, language: string): number => {
  // Normalize the language code to ensure consistency
  const normalizedLang = normalizeLanguageCode(language);
  let sentenceEndings: RegExp;

  switch (normalizedLang) {
    case 'ja-JP':
      // Japanese sentence endings
      sentenceEndings = /[。！？]/g;
      break;
    case 'ko-KR':
      // Korean sentence endings
      sentenceEndings = /[.!?。！？]/g;
      break;
    default:
      // Western languages
      sentenceEndings = /[.!?]/g;
      break;
  }

  const matches = text.match(sentenceEndings);
  return Math.max(1, matches ? matches.length : 1);
};

/**
 * Count Kanji characters in Japanese text
 */
const countKanji = (text: string): number => {
  const kanjiRegex = /[\u4e00-\u9faf]/g;
  const matches = text.match(kanjiRegex);
  return matches ? matches.length : 0;
};

/**
 * Calculate readability score based on language
 */
const calculateReadabilityScore = (text: string, language: string): number => {
  // Normalize the language code to ensure consistency
  const normalizedLang = normalizeLanguageCode(language);

  const words = text
    .trim()
    .split(/\s+/)
    .filter(word => word.length > 0);
  const totalWords = words.length;
  const totalSentences = countSentences(text, normalizedLang);

  if (totalWords === 0) return 0;

  switch (normalizedLang) {
    case 'ja-JP': {
      // Japanese: Kanji density approach
      const totalChars = text.length;
      const kanjiCount = countKanji(text);
      const kanjiRatio = totalChars > 0 ? kanjiCount / totalChars : 0;
      // Lower score = more kanji = harder to read
      return Math.max(0, Math.min(100, 100 - kanjiRatio * 100));
    }

    case 'ko-KR': {
      // Korean: Syllable complexity approach
      const totalSyllables = words.reduce((sum, word) => sum + countSyllables(word, normalizedLang), 0);
      const avgSyllablesPerWord = totalSyllables / totalWords;
      // Higher syllables per word = harder to read
      return Math.max(0, Math.min(100, 100 - avgSyllablesPerWord * 20));
    }

    case 'es-ES': {
      // Spanish: Flesch-Szigriszt formula
      const totalSyllables = words.reduce((sum, word) => sum + countSyllables(word, normalizedLang), 0);
      const avgWordsPerSentence = totalWords / totalSentences;
      const avgSyllablesPerWord = totalSyllables / totalWords;
      return Math.max(0, Math.min(100, 206.835 - 1.02 * avgWordsPerSentence - 60 * avgSyllablesPerWord));
    }

    case 'fr-FR': {
      // French: Flesch-Kandel formula
      const totalSyllables = words.reduce((sum, word) => sum + countSyllables(word, normalizedLang), 0);
      const avgWordsPerSentence = totalWords / totalSentences;
      const avgSyllablesPerWord = totalSyllables / totalWords;
      return Math.max(0, Math.min(100, 207 - 1.015 * avgWordsPerSentence - 73.6 * avgSyllablesPerWord));
    }

    case 'de-DE': {
      // German: Simplified Flesch variant
      const totalSyllables = words.reduce((sum, word) => sum + countSyllables(word, normalizedLang), 0);
      const avgWordsPerSentence = totalWords / totalSentences;
      const avgSyllablesPerWord = totalSyllables / totalWords;
      return Math.max(0, Math.min(100, 180 - avgWordsPerSentence - 58.5 * avgSyllablesPerWord));
    }

    case 'en-US':
    default: {
      // English: Flesch Reading Ease
      const totalSyllables = words.reduce((sum, word) => sum + countSyllables(word, normalizedLang), 0);
      const avgWordsPerSentence = totalWords / totalSentences;
      const avgSyllablesPerWord = totalSyllables / totalWords;
      return Math.max(0, Math.min(100, 206.835 - 1.015 * avgWordsPerSentence - 84.6 * avgSyllablesPerWord));
    }
  }
};

// Database operations

const getTextRewrites = async (
  page: number,
  limit: number,
  filters?: {
    language?: string;
    minReadability?: number;
    maxReadability?: number;
    recentDays?: number;
    sourceUrl?: string;
  },
): Promise<TextRewrite[]> => {
  await ensureTextRewritesDatabaseInitialized();

  const db = getDb();
  if (!db) return [];

  try {
    let query = db.selectFrom('text_rewrites').selectAll().orderBy('created_at', 'desc');

    if (filters?.language) {
      query = query.where('language', '=', filters.language);
    }

    if (filters?.minReadability !== undefined) {
      query = query.where('rewritten_readability_score', '>=', filters.minReadability);
    }

    if (filters?.maxReadability !== undefined) {
      query = query.where('rewritten_readability_score', '<=', filters.maxReadability);
    }

    if (filters?.sourceUrl) {
      query = query.where('source_url', '=', filters.sourceUrl);
    }

    if (filters?.recentDays) {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - filters.recentDays);
      const cutoffISO = cutoffDate.toISOString();
      query = query.where('created_at', '>=', cutoffISO);
    }

    return await query
      .offset((page - 1) * limit)
      .limit(limit)
      .execute();
  } catch (error) {
    console.error('Error getting text rewrites:', error);
    throw error;
  }
};

const getTextRewriteCount = async (filters?: {
  language?: string;
  minReadability?: number;
  maxReadability?: number;
  recentDays?: number;
  sourceUrl?: string;
}): Promise<number> => {
  await ensureTextRewritesDatabaseInitialized();
  const db = getDb();
  if (!db) return 0;

  let query = db.selectFrom('text_rewrites').select(db.fn.count('id').as('count'));

  if (filters?.language) {
    query = query.where('language', '=', filters.language);
  }

  if (filters?.minReadability !== undefined) {
    query = query.where('rewritten_readability_score', '>=', filters.minReadability);
  }

  if (filters?.maxReadability !== undefined) {
    query = query.where('rewritten_readability_score', '<=', filters.maxReadability);
  }

  if (filters?.sourceUrl) {
    query = query.where('source_url', '=', filters.sourceUrl);
  }

  if (filters?.recentDays) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - filters.recentDays);
    const cutoffISO = cutoffDate.toISOString();
    query = query.where('created_at', '>=', cutoffISO);
  }

  const result = await query.executeTakeFirst();
  return (result?.count as number) || 0;
};

const getTextRewriteById = async (id: number): Promise<TextRewrite | null> => {
  await ensureTextRewritesDatabaseInitialized();
  const db = getDb();
  if (!db) return null;

  return (await db.selectFrom('text_rewrites').selectAll().where('id', '=', id).executeTakeFirst()) || null;
};

const getTextRewritesByLanguage = async (language: string): Promise<TextRewrite[]> => {
  await ensureTextRewritesDatabaseInitialized();
  const db = getDb();
  if (!db) return [];

  return await db
    .selectFrom('text_rewrites')
    .selectAll()
    .where('language', '=', language)
    .orderBy('created_at', 'desc')
    .execute();
};

const getRecentTextRewrites = async (days: number, language?: string): Promise<TextRewrite[]> => {
  await ensureTextRewritesDatabaseInitialized();
  const db = getDb();
  if (!db) return [];

  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - days);
  const cutoffISO = cutoffDate.toISOString();

  let query = db
    .selectFrom('text_rewrites')
    .selectAll()
    .where('created_at', '>=', cutoffISO)
    .orderBy('created_at', 'desc');

  if (language) {
    query = query.where('language', '=', language);
  }

  return await query.execute();
};

const getTextRewritesByUrl = async (url: string): Promise<TextRewrite[]> => {
  await ensureTextRewritesDatabaseInitialized();
  const db = getDb();
  if (!db) return [];

  return await db
    .selectFrom('text_rewrites')
    .selectAll()
    .where('source_url', '=', url)
    .orderBy('created_at', 'desc')
    .execute();
};

const getTextRewritesByReadability = async (
  minScore: number,
  maxScore: number,
  language?: string,
): Promise<TextRewrite[]> => {
  await ensureTextRewritesDatabaseInitialized();
  const db = getDb();
  if (!db) return [];

  let query = db
    .selectFrom('text_rewrites')
    .selectAll()
    .where('rewritten_readability_score', '>=', minScore)
    .where('rewritten_readability_score', '<=', maxScore)
    .orderBy('rewritten_readability_score', 'desc');

  if (language) {
    query = query.where('language', '=', language);
  }

  return await query.execute();
};

const addTextRewrite = async (
  rewrite: Omit<NewTextRewrite, 'id' | 'original_readability_score' | 'rewritten_readability_score' | 'created_at'>,
): Promise<TextRewrite> => {
  await ensureTextRewritesDatabaseInitialized();

  const db = getDb();
  if (!db) {
    throw new Error('Database not available');
  }

  try {
    const now = new Date().toISOString();
    const originalReadabilityScore = calculateReadabilityScore(rewrite.original_text, rewrite.language);
    const rewrittenReadabilityScore = calculateReadabilityScore(rewrite.rewritten_text, rewrite.language);

    const insertValues = {
      ...rewrite,
      original_readability_score: originalReadabilityScore,
      rewritten_readability_score: rewrittenReadabilityScore,
      created_at: now,
    };

    const result = await db.insertInto('text_rewrites').values(insertValues).returningAll().executeTakeFirstOrThrow();

    return result;
  } catch (error) {
    console.error('Error adding text rewrite:', error);
    throw error;
  }
};

const deleteTextRewrite = async (id: number) => {
  await ensureTextRewritesDatabaseInitialized();

  const db = getDb();
  if (!db) {
    throw new Error('Database not available');
  }

  try {
    await db.deleteFrom('text_rewrites').where('id', '=', id).execute();
  } catch (error) {
    console.error('Error deleting text rewrite:', error);
    throw error;
  }
};

const deleteTextRewrites = async (ids: number[]) => {
  await ensureTextRewritesDatabaseInitialized();

  const db = getDb();
  if (!db) {
    throw new Error('Database not available');
  }

  try {
    await db.deleteFrom('text_rewrites').where('id', 'in', ids).execute();
  } catch (error) {
    console.error('Error deleting text rewrites:', error);
    throw error;
  }
};

const clearAllTextRewrites = async () => {
  await ensureTextRewritesDatabaseInitialized();

  const db = getDb();
  if (!db) {
    throw new Error('Database not available');
  }

  try {
    await db.deleteFrom('text_rewrites').execute();
  } catch (error) {
    console.error('Error clearing all text rewrites:', error);
    throw error;
  }
};

const resetTextRewritesDatabase = async () => {
  await ensureTextRewritesDatabaseInitialized();
  const db = getDb();
  if (!db) return;

  // Drop the table if it exists
  await db.schema.dropTable('text_rewrites').ifExists().execute();

  // Recreate the table with current schema
  await initializeTextRewritesDatabase();
};

// Word association functions

const getVocabularyWordsInText = async (textId: number): Promise<VocabularyItem[]> => {
  await ensureTextRewritesDatabaseInitialized();
  const db = getDb();
  if (!db) return [];

  // Get the text
  const text = await getTextRewriteById(textId);
  if (!text) return [];

  // Tokenize both original and rewritten text
  const originalWords = text.original_text
    .toLowerCase()
    .split(/\s+/)
    .map(word => word.replace(/[^\w]/g, ''))
    .filter(word => word.length > 0);
  const rewrittenWords = text.rewritten_text
    .toLowerCase()
    .split(/\s+/)
    .map(word => word.replace(/[^\w]/g, ''))
    .filter(word => word.length > 0);
  const allWords = [...new Set([...originalWords, ...rewrittenWords])];

  // Find matching vocabulary words
  const vocabularyWords = await db
    .selectFrom('vocabulary')
    .selectAll()
    .where('language', '=', text.language)
    .where('text', 'in', allWords)
    .execute();

  return vocabularyWords;
};

const getTextRewritesContainingWord = async (vocabularyId: number): Promise<TextRewrite[]> => {
  await ensureTextRewritesDatabaseInitialized();
  const db = getDb();
  if (!db) return [];

  // Get the vocabulary word
  const vocabularyWord = await db
    .selectFrom('vocabulary')
    .selectAll()
    .where('id', '=', vocabularyId)
    .executeTakeFirst();

  if (!vocabularyWord) return [];

  const searchTerm = vocabularyWord.text.toLowerCase();

  // Find text rewrites containing this word
  return await db
    .selectFrom('text_rewrites')
    .selectAll()
    .where('language', '=', vocabularyWord.language)
    .where(eb =>
      eb.or([eb('original_text', 'like', `%${searchTerm}%`), eb('rewritten_text', 'like', `%${searchTerm}%`)]),
    )
    .orderBy('created_at', 'desc')
    .execute();
};

/**
 * Migration function to normalize language codes in existing text rewrites
 * This fixes inconsistent language labels in the database
 */
const migrateLanguageCodes = async (): Promise<{ updated: number; errors: number }> => {
  await ensureTextRewritesDatabaseInitialized();
  const db = getDb();
  if (!db) {
    throw new Error('Database not available');
  }

  let updated = 0;
  let errors = 0;

  try {
    // Get all text rewrites
    const rewrites = await db.selectFrom('text_rewrites').selectAll().execute();

    console.log(`Found ${rewrites.length} text rewrites to check for language normalization`);

    for (const rewrite of rewrites) {
      try {
        const normalizedLanguage = normalizeLanguageCode(rewrite.language);

        // Only update if the language code has changed
        if (normalizedLanguage !== rewrite.language) {
          await db
            .updateTable('text_rewrites')
            .set({ language: normalizedLanguage })
            .where('id', '=', rewrite.id)
            .execute();

          updated++;
          console.log(`Updated rewrite ${rewrite.id}: "${rewrite.language}" → "${normalizedLanguage}"`);
        }
      } catch (error) {
        console.error(`Error updating rewrite ${rewrite.id}:`, error);
        errors++;
      }
    }

    console.log(`Migration completed: ${updated} updated, ${errors} errors`);
  } catch (error) {
    console.error('Error during language code migration:', error);
    throw error;
  }

  return { updated, errors };
};

// Export all functions
export {
  initializeTextRewritesDatabase,
  calculateReadabilityScore,
  ensureTextRewritesDatabaseInitialized,
  getTextRewrites,
  getTextRewriteCount,
  getTextRewriteById,
  getTextRewritesByLanguage,
  getRecentTextRewrites,
  getTextRewritesByUrl,
  getTextRewritesByReadability,
  addTextRewrite,
  deleteTextRewrite,
  deleteTextRewrites,
  clearAllTextRewrites,
  resetTextRewritesDatabase,
  getVocabularyWordsInText,
  getTextRewritesContainingWord,
  migrateLanguageCodes,
};
