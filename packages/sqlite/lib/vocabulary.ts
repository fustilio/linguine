import { getDatabaseManager } from './database-manager.js';
import { ManualSqliteClient } from './manual.js';
import type { VocabularyItem, NewVocabularyItem } from './types.js';

const dummyData: Array<Pick<NewVocabularyItem, 'text' | 'language'>> = [
  { text: 'Hello', language: 'en-US' },
  { text: 'Goodbye', language: 'en-US' },
  { text: 'こんにちは', language: 'ja-JP' },
  { text: 'さようなら', language: 'ja-JP' },
  { text: 'Hola', language: 'es-ES' },
  { text: 'Adiós', language: 'es-ES' },
  { text: 'Bonjour', language: 'fr-FR' },
  { text: 'Au revoir', language: 'fr-FR' },
  { text: 'Guten Tag', language: 'de-DE' },
  { text: 'Auf Wiedersehen', language: 'de-DE' },
  { text: '안녕하세요', language: 'ko-KR' },
  { text: '안녕히 가세요', language: 'ko-KR' },
  { text: 'Apple', language: 'en-US' },
  { text: 'Banana', language: 'en-US' },
  { text: 'Cherry', language: 'en-US' },
];

const getDb = () => {
  const client = ManualSqliteClient.getInstance();
  return client.getDb();
};

const initializeVocabularyDatabase = async () => {
  const db = getDb();
  if (!db) return;

  const tableExists = await db.introspection
    .getTables()
    .then((tables: { name: string }[]) => tables.some((table: { name: string }) => table.name === 'vocabulary'));

  if (!tableExists) {
    await db.schema
      .createTable('vocabulary')
      .ifNotExists()
      .addColumn('id', 'integer', col => col.primaryKey().autoIncrement())
      .addColumn('text', 'text', col => col.notNull().unique())
      .addColumn('language', 'text', col => col.notNull())
      .addColumn('knowledge_level', 'integer', col => col.notNull().defaultTo(1))
      .addColumn('last_reviewed_at', 'text', col => col.notNull())
      .addColumn('created_at', 'text', col => col.notNull())
      .execute();
  }
};

const ensureDatabaseInitialized = async () => {
  const dbManager = getDatabaseManager();
  await dbManager.ensureInitialized();
};

const getVocabulary = async (page: number, limit: number, language?: string | null): Promise<VocabularyItem[]> => {
  await ensureDatabaseInitialized();
  const db = getDb();
  if (!db) return [];
  let query = db.selectFrom('vocabulary').selectAll().orderBy('created_at', 'desc');

  if (language) {
    query = query.where('language', '=', language);
  }

  return await query
    .offset((page - 1) * limit)
    .limit(limit)
    .execute();
};

const getVocabularyCount = async (language?: string | null): Promise<number> => {
  await ensureDatabaseInitialized();
  const db = getDb();
  if (!db) return 0;
  let query = db.selectFrom('vocabulary').select(db.fn.count('id').as('count'));

  if (language) {
    query = query.where('language', '=', language);
  }

  const result = await query.executeTakeFirst();
  return (result?.count as number) || 0;
};

const addVocabularyItem = async (item: Pick<NewVocabularyItem, 'text' | 'language'>): Promise<VocabularyItem> => {
  await ensureDatabaseInitialized();
  const db = getDb();
  if (!db) {
    throw new Error('Database not available');
  }

  // Set last_reviewed_at equal to created_at so new words are immediately available for review
  // (words where last_reviewed_at = created_at are considered never reviewed and immediately available)
  const now = new Date().toISOString();
  const insertValues = { ...item, last_reviewed_at: now, created_at: now, knowledge_level: 1 };

  // Use returningAll() to get the inserted row back directly
  const result = await db.insertInto('vocabulary').values(insertValues).returningAll().executeTakeFirstOrThrow();

  return result as VocabularyItem;
};

const updateVocabularyItemKnowledgeLevel = async (id: number, level: number) => {
  await ensureDatabaseInitialized();
  const db = getDb();
  if (!db) return;
  const now = new Date().toISOString();
  await db
    .updateTable('vocabulary')
    .set({ knowledge_level: level, last_reviewed_at: now })
    .where('id', '=', id)
    .execute();
};

const deleteVocabularyItem = async (id: number) => {
  await ensureDatabaseInitialized();
  const db = getDb();
  if (!db) return;
  await db.deleteFrom('vocabulary').where('id', '=', id).execute();
};

const deleteVocabularyItems = async (ids: number[]) => {
  await ensureDatabaseInitialized();
  const db = getDb();
  if (!db) return;
  await db.deleteFrom('vocabulary').where('id', 'in', ids).execute();
};

const updateVocabularyItemKnowledgeLevels = async (ids: number[], levelChange: 1 | -1) => {
  await ensureDatabaseInitialized();
  const db = getDb();
  if (!db) return;
  const now = new Date().toISOString();
  await db
    .updateTable('vocabulary')
    .set(eb => ({
      knowledge_level: eb('knowledge_level', '+', levelChange),
      last_reviewed_at: now,
    }))
    .where('id', 'in', ids)
    .where('knowledge_level', levelChange > 0 ? '<' : '>', 1)
    .execute();
};

const resetVocabularyDatabase = async () => {
  await ensureDatabaseInitialized();
  const db = getDb();
  if (!db) return;

  // Drop the table if it exists
  await db.schema.dropTable('vocabulary').ifExists().execute();

  // Recreate the table with current schema
  await initializeVocabularyDatabase();
};

const populateDummyVocabulary = async () => {
  await ensureDatabaseInitialized();
  const db = getDb();
  if (!db) return;

  // Set last_reviewed_at equal to created_at so dummy words are immediately available for review
  const now = new Date().toISOString();
  const itemsToInsert = dummyData.map(item => ({
    ...item,
    knowledge_level: Math.ceil(Math.random() * 5),
    last_reviewed_at: now, // Equal to created_at = immediately available
    created_at: now,
  }));

  await db
    .insertInto('vocabulary')
    .values(itemsToInsert)
    .onConflict(oc => oc.doNothing())
    .execute();
};

// New query functions for AI analytics

const getAllVocabularyForSummary = async (): Promise<VocabularyItem[]> => {
  await ensureDatabaseInitialized();
  const db = getDb();
  if (!db) return [];
  return await db
    .selectFrom('vocabulary')
    .selectAll()
    .orderBy('language', 'asc')
    .orderBy('knowledge_level', 'desc')
    .execute();
};

const getVocabularyByLanguage = async (language: string): Promise<VocabularyItem[]> => {
  await ensureDatabaseInitialized();
  const db = getDb();
  if (!db) return [];
  return await db
    .selectFrom('vocabulary')
    .selectAll()
    .where('language', '=', language)
    .orderBy('knowledge_level', 'desc')
    .execute();
};

const getVocabularyByKnowledgeLevel = async (minLevel: number, maxLevel: number): Promise<VocabularyItem[]> => {
  await ensureDatabaseInitialized();
  const db = getDb();
  if (!db) return [];
  return await db
    .selectFrom('vocabulary')
    .selectAll()
    .where('knowledge_level', '>=', minLevel)
    .where('knowledge_level', '<=', maxLevel)
    .orderBy('knowledge_level', 'desc')
    .execute();
};

const getRecentVocabulary = async (days: number): Promise<VocabularyItem[]> => {
  await ensureDatabaseInitialized();
  const db = getDb();
  if (!db) return [];
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - days);
  const cutoffISO = cutoffDate.toISOString();

  // Get recently added or recently reviewed words
  const recentlyAdded = await db.selectFrom('vocabulary').selectAll().where('created_at', '>=', cutoffISO).execute();

  const recentlyReviewed = await db
    .selectFrom('vocabulary')
    .selectAll()
    .where('last_reviewed_at', '>=', cutoffISO)
    .execute();

  // Combine and deduplicate by ID
  const combined = [...recentlyAdded, ...recentlyReviewed];
  const uniqueItems = Array.from(new Map(combined.map(item => [item.id, item])).values());

  // Sort by created_at descending
  return uniqueItems.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
};

const getStrugglingWords = async (): Promise<VocabularyItem[]> => {
  await ensureDatabaseInitialized();
  const db = getDb();
  if (!db) return [];
  return await db
    .selectFrom('vocabulary')
    .selectAll()
    .where('knowledge_level', '<=', 2)
    .orderBy('knowledge_level', 'asc')
    .execute();
};

const getMasteredWords = async (): Promise<VocabularyItem[]> => {
  await ensureDatabaseInitialized();
  const db = getDb();
  if (!db) return [];
  return await db
    .selectFrom('vocabulary')
    .selectAll()
    .where('knowledge_level', '=', 5)
    .orderBy('last_reviewed_at', 'desc')
    .execute();
};

const filterVocabulary = async (filters: {
  language?: string;
  knowledgeLevel?: { min?: number; max?: number; levels?: number[] };
}): Promise<VocabularyItem[]> => {
  await ensureDatabaseInitialized();
  const db = getDb();
  if (!db) return [];

  let query = db.selectFrom('vocabulary').selectAll();

  // Filter by language
  if (filters.language) {
    query = query.where('language', '=', filters.language);
  }

  // Filter by knowledge level
  if (filters.knowledgeLevel?.levels && filters.knowledgeLevel.levels.length > 0) {
    query = query.where('knowledge_level', 'in', filters.knowledgeLevel.levels);
  } else if (filters.knowledgeLevel?.min !== undefined || filters.knowledgeLevel?.max !== undefined) {
    if (filters.knowledgeLevel.min !== undefined) {
      query = query.where('knowledge_level', '>=', filters.knowledgeLevel.min);
    }
    if (filters.knowledgeLevel.max !== undefined) {
      query = query.where('knowledge_level', '<=', filters.knowledgeLevel.max);
    }
  }

  return await query.orderBy('knowledge_level', 'desc').orderBy('language', 'asc').execute();
};

const getReviewQueue = async (limit?: number, language?: string | null): Promise<VocabularyItem[]> => {
  try {
    await ensureDatabaseInitialized();
    const db = getDb();
    if (!db) {
      console.warn('[ReviewQueue] Database not initialized');
      return [];
    }

    const now = new Date();
    // Changed from 7 days to 1 hour - recently added words should be available within minutes
    const oneHourAgo = new Date(now);
    oneHourAgo.setHours(oneHourAgo.getHours() - 1);
    const cutoffISO = oneHourAgo.toISOString();

    console.log('[ReviewQueue] Fetching review queue:', { cutoffISO, limit, language });

    // Get words that need review:
    // 1. Words where last_reviewed_at is the same as created_at (never actually reviewed, just created)
    // 2. Words reviewed more than 1 hour ago (changed from 7 days - new words available within minutes)
    // Sort by oldest last_reviewed_at first, then by lowest knowledge_level (most challenging first)
    let query = db
      .selectFrom('vocabulary')
      .selectAll()
      .where(eb =>
        eb.or([
          // Words that have never been reviewed (last_reviewed_at equals created_at means it was never actually reviewed)
          eb('last_reviewed_at', '=', eb.ref('created_at')),
          // Words reviewed more than 1 hour ago (changed from 7 days)
          eb('last_reviewed_at', '<', cutoffISO),
        ]),
      );

    // Filter by language if provided
    if (language) {
      query = query.where('language', '=', language);
    }

    query = query.orderBy('last_reviewed_at', 'asc').orderBy('knowledge_level', 'asc');

    if (limit) {
      query = query.limit(limit);
    }

    const results = await query.execute();
    // Ensure results is always an array
    const items = Array.isArray(results) ? results : [];
    console.log('[ReviewQueue] Found items:', items.length);
    if (items.length > 0) {
      console.log(
        '[ReviewQueue] Sample items:',
        items.slice(0, 5).map(r => ({
          id: r.id,
          text: r.text,
          last_reviewed_at: r.last_reviewed_at,
          created_at: r.created_at,
          knowledge_level: r.knowledge_level,
        })),
      );
    }
    // Ensure we return a valid array (not undefined)
    return items || [];
  } catch (error) {
    console.error('[ReviewQueue] Error fetching review queue:', error);
    return [];
  }
};

const markAsReviewed = async (id: number): Promise<void> => {
  await ensureDatabaseInitialized();
  const db = getDb();
  if (!db) return;
  const now = new Date().toISOString();
  await db.updateTable('vocabulary').set({ last_reviewed_at: now }).where('id', '=', id).execute();
};

const getNextReviewDate = async (language?: string | null): Promise<string | null> => {
  try {
    await ensureDatabaseInitialized();
    const db = getDb();
    if (!db) return null;

    const now = new Date();
    // Changed from 7 days to 1 hour - recently added words should be available within minutes
    const oneHourAgo = new Date(now);
    oneHourAgo.setHours(oneHourAgo.getHours() - 1);
    const cutoffISO = oneHourAgo.toISOString();

    // Find all words that have been reviewed recently (within last 1 hour)
    // We want the one that will be due soonest
    let query = db.selectFrom('vocabulary').selectAll().where('last_reviewed_at', '>=', cutoffISO);

    // Filter by language if provided
    if (language) {
      query = query.where('language', '=', language);
    }

    const recentlyReviewedItems = await query.execute();

    // Ensure results is always an array
    const items = Array.isArray(recentlyReviewedItems) ? recentlyReviewedItems : [];

    if (items.length === 0) {
      // If no words have been reviewed recently, return null (all words are available now or don't exist)
      return null;
    }

    // Find the word that will be due soonest (earliest next review date)
    // Calculate when each word will be due (1 hour after last_reviewed_at)
    const nextReviewDates = items.map(item => {
      const lastReviewed = new Date(item.last_reviewed_at);
      const nextReviewDate = new Date(lastReviewed);
      nextReviewDate.setHours(nextReviewDate.getHours() + 1);
      return nextReviewDate;
    });

    // Return the earliest date
    const earliestDate = new Date(Math.min(...nextReviewDates.map(d => d.getTime())));
    return earliestDate.toISOString();
  } catch (error) {
    console.error('[ReviewQueue] Error getting next review date:', error);
    return null;
  }
};

// Export all functions
export {
  initializeVocabularyDatabase,
  ensureDatabaseInitialized,
  getVocabulary,
  getVocabularyCount,
  addVocabularyItem,
  updateVocabularyItemKnowledgeLevel,
  deleteVocabularyItem,
  deleteVocabularyItems,
  updateVocabularyItemKnowledgeLevels,
  resetVocabularyDatabase,
  populateDummyVocabulary,
  getAllVocabularyForSummary,
  getVocabularyByLanguage,
  getVocabularyByKnowledgeLevel,
  getRecentVocabulary,
  getStrugglingWords,
  getMasteredWords,
  filterVocabulary,
  getReviewQueue,
  markAsReviewed,
  getNextReviewDate,
};
