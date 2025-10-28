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

export const ensureDatabaseInitialized = () => {
  if (!initializePromise) {
    initializePromise = initializeVocabularyDatabase();
  }
  return initializePromise;
};

export const getVocabulary = async (
  page: number,
  limit: number,
  language?: string | null,
): Promise<VocabularyItem[]> => {
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

export const getVocabularyCount = async (language?: string | null): Promise<number> => {
  const db = getDb();
  if (!db) return 0;
  let query = db.selectFrom('vocabulary').select(db.fn.count('id').as('count'));

  if (language) {
    query = query.where('language', '=', language);
  }

  const result = await query.executeTakeFirst();
  return (result?.count as number) || 0;
};

export const addVocabularyItem = async (item: Pick<NewVocabularyItem, 'text' | 'language'>) => {
  const db = getDb();
  if (!db) return;
  const now = new Date().toISOString();
  await db
    .insertInto('vocabulary')
    .values({ ...item, last_reviewed_at: now, created_at: now, knowledge_level: 1 })
    .execute();
};

export const updateVocabularyItemKnowledgeLevel = async (id: number, level: number) => {
  const db = getDb();
  if (!db) return;
  const now = new Date().toISOString();
  await db
    .updateTable('vocabulary')
    .set({ knowledge_level: level, last_reviewed_at: now })
    .where('id', '=', id)
    .execute();
};

export const deleteVocabularyItem = async (id: number) => {
  const db = getDb();
  if (!db) return;
  await db.deleteFrom('vocabulary').where('id', '=', id).execute();
};

export const deleteVocabularyItems = async (ids: number[]) => {
  const db = getDb();
  if (!db) return;
  await db.deleteFrom('vocabulary').where('id', 'in', ids).execute();
};

export const updateVocabularyItemKnowledgeLevels = async (ids: number[], levelChange: 1 | -1) => {
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

export const clearAllVocabulary = async () => {
  const db = getDb();
  if (!db) return;
  await db.deleteFrom('vocabulary').execute();
};

export const populateDummyVocabulary = async () => {
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

export const getAllVocabularyForSummary = async (): Promise<VocabularyItem[]> => {
  const db = getDb();
  if (!db) return [];
  return await db
    .selectFrom('vocabulary')
    .selectAll()
    .orderBy('language', 'asc')
    .orderBy('knowledge_level', 'desc')
    .execute();
};

export const getVocabularyByLanguage = async (language: string): Promise<VocabularyItem[]> => {
  const db = getDb();
  if (!db) return [];
  return await db
    .selectFrom('vocabulary')
    .selectAll()
    .where('language', '=', language)
    .orderBy('knowledge_level', 'desc')
    .execute();
};

export const getVocabularyByKnowledgeLevel = async (minLevel: number, maxLevel: number): Promise<VocabularyItem[]> => {
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

export const getRecentVocabulary = async (days: number): Promise<VocabularyItem[]> => {
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

export const getStrugglingWords = async (): Promise<VocabularyItem[]> => {
  const db = getDb();
  if (!db) return [];
  return await db
    .selectFrom('vocabulary')
    .selectAll()
    .where('knowledge_level', '<=', 2)
    .orderBy('knowledge_level', 'asc')
    .execute();
};

export const getMasteredWords = async (): Promise<VocabularyItem[]> => {
  const db = getDb();
  if (!db) return [];
  return await db
    .selectFrom('vocabulary')
    .selectAll()
    .where('knowledge_level', '=', 5)
    .orderBy('last_reviewed_at', 'desc')
    .execute();
};
