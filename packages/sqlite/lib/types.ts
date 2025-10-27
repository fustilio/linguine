import type { Generated, Selectable, Insertable, Updateable, ColumnType } from 'kysely';

interface VocabularyTable {
  id: Generated<number>;
  text: string;
  language: string;
  knowledge_level: ColumnType<number, number | undefined, number>;
  last_reviewed_at: string;
  created_at: string;
}

export type VocabularyItem = Selectable<VocabularyTable>;
export type NewVocabularyItem = Insertable<VocabularyTable>;
export type VocabularyItemUpdate = Updateable<VocabularyTable>;

/**
 * Main database schema - extend this for your application
 */
export interface DatabaseSchema {
  vocabulary: VocabularyTable;
}

export type { Generated };
