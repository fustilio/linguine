import { ManualSqliteClient } from './manual.js';
import type { VocabularyItem, NewVocabularyItem } from './types.js';
import { ensureSentenceRewritesDatabaseInitialized } from './sentence-rewrites.js';

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

let initializePromise: Promise<void> | null = null;

const getDb = () => {
  const client = new ManualSqliteClient();
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

const ensureDatabaseInitialized = () => {
  if (!initializePromise) {
    initializePromise = Promise.all([initializeVocabularyDatabase(), ensureSentenceRewritesDatabaseInitialized()]).then(
      () => {},
    );
  }
  return initializePromise;
};

const getVocabulary = async (page: number, limit: number, language?: string | null): Promise<VocabularyItem[]> => {
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
  const db = getDb();
  if (!db) return 0;
  let query = db.selectFrom('vocabulary').select(db.fn.count('id').as('count'));

  if (language) {
    query = query.where('language', '=', language);
  }

  const result = await query.executeTakeFirst();
  return (result?.count as number) || 0;
};

const addVocabularyItem = async (item: Pick<NewVocabularyItem, 'text' | 'language'>) => {
  const db = getDb();
  if (!db) return;
  const now = new Date().toISOString();
  await db
    .insertInto('vocabulary')
    .values({ ...item, last_reviewed_at: now, created_at: now, knowledge_level: 1 })
    .execute();
};

const updateVocabularyItemKnowledgeLevel = async (id: number, level: number) => {
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
  const db = getDb();
  if (!db) return;
  await db.deleteFrom('vocabulary').where('id', '=', id).execute();
};

const deleteVocabularyItems = async (ids: number[]) => {
  const db = getDb();
  if (!db) return;
  await db.deleteFrom('vocabulary').where('id', 'in', ids).execute();
};

const updateVocabularyItemKnowledgeLevels = async (ids: number[], levelChange: 1 | -1) => {
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
  const db = getDb();
  if (!db) return;

  // Drop the table if it exists
  await db.schema.dropTable('vocabulary').ifExists().execute();

  // Recreate the table with current schema
  await initializeVocabularyDatabase();
};

const populateDummyVocabulary = async () => {
  const db = getDb();
  if (!db) return;

  const now = new Date().toISOString();
  const itemsToInsert = dummyData.map(item => ({
    ...item,
    knowledge_level: Math.ceil(Math.random() * 5),
    last_reviewed_at: now,
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

// Export all functions
export {
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
};
