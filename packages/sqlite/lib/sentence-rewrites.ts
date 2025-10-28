import { ManualSqliteClient } from './manual.js';
import type { SentenceRewrite, NewSentenceRewrite, VocabularyItem } from './types.js';
import { getDatabaseManager } from './database-manager.js';

const getDb = () => {
  const client = ManualSqliteClient.getInstance();
  return client.getDb();
};

const initializeSentenceRewritesDatabase = async () => {
  const db = getDb();
  if (!db) return;

  const tableExists = await db.introspection
    .getTables()
    .then((tables: { name: string }[]) => tables.some((table: { name: string }) => table.name === 'sentence_rewrites'));

  if (!tableExists) {
    await db.schema
      .createTable('sentence_rewrites')
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
    await db.schema.createIndex('idx_sentence_rewrites_language').on('sentence_rewrites').column('language').execute();

    await db.schema
      .createIndex('idx_sentence_rewrites_created_at')
      .on('sentence_rewrites')
      .column('created_at')
      .execute();

    await db.schema
      .createIndex('idx_sentence_rewrites_original_readability_score')
      .on('sentence_rewrites')
      .column('original_readability_score')
      .execute();

    await db.schema
      .createIndex('idx_sentence_rewrites_rewritten_readability_score')
      .on('sentence_rewrites')
      .column('rewritten_readability_score')
      .execute();

    await db.schema
      .createIndex('idx_sentence_rewrites_source_url')
      .on('sentence_rewrites')
      .column('source_url')
      .execute();
  }
};

const ensureSentenceRewritesDatabaseInitialized = async () => {
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
  switch (language) {
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
  let sentenceEndings: RegExp;

  switch (language) {
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
  const words = text
    .trim()
    .split(/\s+/)
    .filter(word => word.length > 0);
  const totalWords = words.length;
  const totalSentences = countSentences(text, language);

  if (totalWords === 0) return 0;

  switch (language) {
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
      const totalSyllables = words.reduce((sum, word) => sum + countSyllables(word, language), 0);
      const avgSyllablesPerWord = totalSyllables / totalWords;
      // Higher syllables per word = harder to read
      return Math.max(0, Math.min(100, 100 - avgSyllablesPerWord * 20));
    }

    case 'es-ES': {
      // Spanish: Flesch-Szigriszt formula
      const totalSyllables = words.reduce((sum, word) => sum + countSyllables(word, language), 0);
      const avgWordsPerSentence = totalWords / totalSentences;
      const avgSyllablesPerWord = totalSyllables / totalWords;
      return Math.max(0, Math.min(100, 206.835 - 1.02 * avgWordsPerSentence - 60 * avgSyllablesPerWord));
    }

    case 'fr-FR': {
      // French: Flesch-Kandel formula
      const totalSyllables = words.reduce((sum, word) => sum + countSyllables(word, language), 0);
      const avgWordsPerSentence = totalWords / totalSentences;
      const avgSyllablesPerWord = totalSyllables / totalWords;
      return Math.max(0, Math.min(100, 207 - 1.015 * avgWordsPerSentence - 73.6 * avgSyllablesPerWord));
    }

    case 'de-DE': {
      // German: Simplified Flesch variant
      const totalSyllables = words.reduce((sum, word) => sum + countSyllables(word, language), 0);
      const avgWordsPerSentence = totalWords / totalSentences;
      const avgSyllablesPerWord = totalSyllables / totalWords;
      return Math.max(0, Math.min(100, 180 - avgWordsPerSentence - 58.5 * avgSyllablesPerWord));
    }

    case 'en-US':
    default: {
      // English: Flesch Reading Ease
      const totalSyllables = words.reduce((sum, word) => sum + countSyllables(word, language), 0);
      const avgWordsPerSentence = totalWords / totalSentences;
      const avgSyllablesPerWord = totalSyllables / totalWords;
      return Math.max(0, Math.min(100, 206.835 - 1.015 * avgWordsPerSentence - 84.6 * avgSyllablesPerWord));
    }
  }
};

// Database operations

const getSentenceRewrites = async (
  page: number,
  limit: number,
  filters?: {
    language?: string;
    minReadability?: number;
    maxReadability?: number;
    recentDays?: number;
    sourceUrl?: string;
  },
): Promise<SentenceRewrite[]> => {
  await ensureSentenceRewritesDatabaseInitialized();
  
  const db = getDb();
  if (!db) return [];

  try {
    let query = db.selectFrom('sentence_rewrites').selectAll().orderBy('created_at', 'desc')

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
    console.error('Error getting sentence rewrites:', error);
    throw error;
  }
};

const getSentenceRewriteCount = async (filters?: {
  language?: string;
  minReadability?: number;
  maxReadability?: number;
  recentDays?: number;
  sourceUrl?: string;
}): Promise<number> => {
  await ensureSentenceRewritesDatabaseInitialized();
  const db = getDb();
  if (!db) return 0;

  let query = db.selectFrom('sentence_rewrites').select(db.fn.count('id').as('count'));

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

const getSentenceRewriteById = async (id: number): Promise<SentenceRewrite | null> => {
  await ensureSentenceRewritesDatabaseInitialized();
  const db = getDb();
  if (!db) return null;

  return (await db.selectFrom('sentence_rewrites').selectAll().where('id', '=', id).executeTakeFirst()) || null;
};

const getSentenceRewritesByLanguage = async (language: string): Promise<SentenceRewrite[]> => {
  await ensureSentenceRewritesDatabaseInitialized();
  const db = getDb();
  if (!db) return [];

  return await db
    .selectFrom('sentence_rewrites')
    .selectAll()
    .where('language', '=', language)
    .orderBy('created_at', 'desc')
    .execute();
};

const getRecentSentenceRewrites = async (days: number, language?: string): Promise<SentenceRewrite[]> => {
  await ensureSentenceRewritesDatabaseInitialized();
  const db = getDb();
  if (!db) return [];

  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - days);
  const cutoffISO = cutoffDate.toISOString();

  let query = db
    .selectFrom('sentence_rewrites')
    .selectAll()
    .where('created_at', '>=', cutoffISO)
    .orderBy('created_at', 'desc');

  if (language) {
    query = query.where('language', '=', language);
  }

  return await query.execute();
};

const getSentenceRewritesByUrl = async (url: string): Promise<SentenceRewrite[]> => {
  await ensureSentenceRewritesDatabaseInitialized();
  const db = getDb();
  if (!db) return [];

  return await db
    .selectFrom('sentence_rewrites')
    .selectAll()
    .where('source_url', '=', url)
    .orderBy('created_at', 'desc')
    .execute();
};

const getSentenceRewritesByReadability = async (
  minScore: number,
  maxScore: number,
  language?: string,
): Promise<SentenceRewrite[]> => {
  await ensureSentenceRewritesDatabaseInitialized();
  const db = getDb();
  if (!db) return [];

  let query = db
    .selectFrom('sentence_rewrites')
    .selectAll()
    .where('rewritten_readability_score', '>=', minScore)
    .where('rewritten_readability_score', '<=', maxScore)
    .orderBy('rewritten_readability_score', 'desc');

  if (language) {
    query = query.where('language', '=', language);
  }

  return await query.execute();
};

const addSentenceRewrite = async (
  rewrite: Omit<NewSentenceRewrite, 'id' | 'original_readability_score' | 'rewritten_readability_score' | 'created_at'>,
) => {
    console.log("add sentence rewrite")
  // Ensure database is initialized before attempting to insert
  await ensureSentenceRewritesDatabaseInitialized();

  console.log("db is initilized")
  
  const db = getDb();
  if (!db) {
    throw new Error('Database not available');
  }

  try {
    const now = new Date().toISOString();
    const originalReadabilityScore = calculateReadabilityScore(rewrite.original_text, rewrite.language);
    const rewrittenReadabilityScore = calculateReadabilityScore(rewrite.rewritten_text, rewrite.language);

    await db
      .insertInto('sentence_rewrites')
      .values({
        ...rewrite,
        original_readability_score: originalReadabilityScore,
        rewritten_readability_score: rewrittenReadabilityScore,
        created_at: now,
      })
      .execute();
  } catch (error) {
    console.error('Error adding sentence rewrite:', error);
    throw error;
  }
};

const deleteSentenceRewrite = async (id: number) => {
  await ensureSentenceRewritesDatabaseInitialized();
  
  const db = getDb();
  if (!db) {
    throw new Error('Database not available');
  }

  try {
    await db.deleteFrom('sentence_rewrites').where('id', '=', id).execute();
  } catch (error) {
    console.error('Error deleting sentence rewrite:', error);
    throw error;
  }
};

const deleteSentenceRewrites = async (ids: number[]) => {
  await ensureSentenceRewritesDatabaseInitialized();
  
  const db = getDb();
  if (!db) {
    throw new Error('Database not available');
  }

  try {
    await db.deleteFrom('sentence_rewrites').where('id', 'in', ids).execute();
  } catch (error) {
    console.error('Error deleting sentence rewrites:', error);
    throw error;
  }
};

const clearAllSentenceRewrites = async () => {
  await ensureSentenceRewritesDatabaseInitialized();
  
  const db = getDb();
  if (!db) {
    throw new Error('Database not available');
  }

  try {
    await db.deleteFrom('sentence_rewrites').execute();
  } catch (error) {
    console.error('Error clearing all sentence rewrites:', error);
    throw error;
  }
};

const resetSentenceRewritesDatabase = async () => {
  await ensureSentenceRewritesDatabaseInitialized();
  const db = getDb();
  if (!db) return;

  // Drop the table if it exists
  await db.schema.dropTable('sentence_rewrites').ifExists().execute();
  
  // Recreate the table with current schema
  await initializeSentenceRewritesDatabase();
};

// Word association functions

const getVocabularyWordsInSentence = async (sentenceId: number): Promise<VocabularyItem[]> => {
  await ensureSentenceRewritesDatabaseInitialized();
  const db = getDb();
  if (!db) return [];

  // Get the sentence
  const sentence = await getSentenceRewriteById(sentenceId);
  if (!sentence) return [];

  // Tokenize both original and rewritten text
  const originalWords = sentence.original_text
    .toLowerCase()
    .split(/\s+/)
    .map(word => word.replace(/[^\w]/g, ''))
    .filter(word => word.length > 0);
  const rewrittenWords = sentence.rewritten_text
    .toLowerCase()
    .split(/\s+/)
    .map(word => word.replace(/[^\w]/g, ''))
    .filter(word => word.length > 0);
  const allWords = [...new Set([...originalWords, ...rewrittenWords])];

  // Find matching vocabulary words
  const vocabularyWords = await db
    .selectFrom('vocabulary')
    .selectAll()
    .where('language', '=', sentence.language)
    .where('text', 'in', allWords)
    .execute();

  return vocabularyWords;
};

const getSentencesContainingWord = async (vocabularyId: number): Promise<SentenceRewrite[]> => {
  await ensureSentenceRewritesDatabaseInitialized();
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

  // Find sentences containing this word
  return await db
    .selectFrom('sentence_rewrites')
    .selectAll()
    .where('language', '=', vocabularyWord.language)
    .where(eb =>
      eb.or([eb('original_text', 'like', `%${searchTerm}%`), eb('rewritten_text', 'like', `%${searchTerm}%`)]),
    )
    .orderBy('created_at', 'desc')
    .execute();
};

// Export all functions
export { 
  initializeSentenceRewritesDatabase,
  calculateReadabilityScore,
  ensureSentenceRewritesDatabaseInitialized,
  getSentenceRewrites,
  getSentenceRewriteCount,
  getSentenceRewriteById,
  getSentenceRewritesByLanguage,
  getRecentSentenceRewrites,
  getSentenceRewritesByUrl,
  getSentenceRewritesByReadability,
  addSentenceRewrite,
  deleteSentenceRewrite,
  deleteSentenceRewrites,
  clearAllSentenceRewrites,
  resetSentenceRewritesDatabase,
  getVocabularyWordsInSentence,
  getSentencesContainingWord
};
