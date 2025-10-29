import type { Generated, Selectable, Insertable, Updateable, ColumnType } from 'kysely';

interface VocabularyTable {
  id: Generated<number>;
  text: string;
  language: string;
  knowledge_level: ColumnType<number, number | undefined, number>;
  last_reviewed_at: string;
  created_at: string;
}

type VocabularyItem = Selectable<VocabularyTable>;
type NewVocabularyItem = Insertable<VocabularyTable>;
type VocabularyItemUpdate = Updateable<VocabularyTable>;

interface TextRewritesTable {
  id: Generated<number>;
  original_text: string; // Original text before rewriting
  rewritten_text: string; // AI-rewritten text
  language: string; // BCP 47 language code (e.g., "en-US")
  rewriter_settings: string; // JSON string of RewriterOptions
  source_url: string; // Full URL where text was found
  url_fragment: string | null; // URL fragment for text anchor (e.g., "#:~:text=...")
  original_readability_score: number; // Calculated readability score of original text (0-100)
  rewritten_readability_score: number; // Calculated readability score of rewritten text (0-100)
  created_at: string; // ISO timestamp
}

type TextRewrite = Selectable<TextRewritesTable>;
type NewTextRewrite = Insertable<TextRewritesTable>;
type TextRewriteUpdate = Updateable<TextRewritesTable>;

/**
 * Main database schema - extend this for your application
 */
interface DatabaseSchema {
  vocabulary: VocabularyTable;
  text_rewrites: TextRewritesTable;
}

// Export all types at the end
export type { 
  Generated,
  VocabularyItem,
  NewVocabularyItem,
  VocabularyItemUpdate,
  TextRewrite,
  NewTextRewrite,
  TextRewriteUpdate,
  DatabaseSchema
};
