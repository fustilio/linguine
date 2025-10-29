# Packages SQLite Documentation

## Purpose

The `packages/sqlite` package provides direct SQLite database operations via OPFS (Origin Private File System). It serves as the data persistence layer for the extension, handling all database operations including vocabulary management, text rewrites, and cross-system analytics.

## Responsibilities

- **Database Operations**: Direct SQLite CRUD operations for vocabulary and text rewrites
- **Schema Management**: Database table creation, migration, and maintenance
- **Readability Scoring**: Multi-language readability calculation algorithms
- **Data Validation**: Input validation and normalization
- **Performance Optimization**: Indexed queries and connection management
- **Cross-System Integration**: Word-text associations and analytics

## Why OPFS and Offscreen Document?

### OPFS (Origin Private File System)

OPFS is used because it provides:

1. **Persistence**: Data survives browser restarts and extension updates
2. **Performance**: Direct file system access for SQLite operations
3. **Security**: Origin-isolated storage prevents cross-origin access
4. **Capacity**: No storage quota limitations like chrome.storage
5. **SQLite Support**: Full SQLite functionality with proper indexing

### Offscreen Document Requirement

OPFS is only available in:
- **Web Workers**: Background processing contexts
- **Offscreen Documents**: Hidden document contexts

Service workers (background scripts) cannot access OPFS directly, requiring the offscreen document pattern.

## Package Structure

```
packages/sqlite/
├── lib/
│   ├── database-manager.ts     # Database initialization and lifecycle
│   ├── vocabulary.ts           # Vocabulary CRUD operations
│   ├── text-rewrites.ts   # Text rewrite operations
│   ├── database-reset.ts      # Database reset utilities
│   ├── manual.ts              # SQLite client wrapper
│   ├── types.ts               # TypeScript types using Kysely
│   └── index.ts               # Main exports
├── index.mts                  # Package entry point
└── package.json
```

## Core Modules

### Database Manager (`database-manager.ts`)

**Purpose**: Singleton pattern for centralized database initialization and lifecycle management.

**Key Features**:

```typescript
export class DatabaseManager {
  private static instance: DatabaseManager | null = null;
  private initializationPromise: Promise<void> | null = null;
  private isInitialized: boolean = false;

  public static getInstance(): DatabaseManager {
    if (!DatabaseManager.instance) {
      DatabaseManager.instance = new DatabaseManager();
    }
    return DatabaseManager.instance;
  }

  public async ensureInitialized(): Promise<void> {
    if (this.isInitialized) return;
    
    if (!this.initializationPromise) {
      this.initializationPromise = this.initialize();
    }
    
    await this.initializationPromise;
    this.isInitialized = true;
  }

  private async initialize(): Promise<void> {
    // Initialize both database tables in parallel
    await Promise.all([
      initializeVocabularyDatabase(),
      initializeTextRewritesDatabase()
    ]);
  }
}
```

**Responsibilities**:
- **Singleton Pattern**: Ensures single database instance
- **Idempotent Initialization**: Multiple calls return same promise
- **Parallel Initialization**: Both tables initialized simultaneously
- **State Management**: Tracks initialization status
- **Error Handling**: Proper error propagation

### Vocabulary Operations (`vocabulary.ts`)

**Purpose**: Complete CRUD operations for vocabulary management with analytics support.

**Database Schema**:

```typescript
// Vocabulary table structure
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
```

**Core Operations**:

```typescript
// Basic CRUD operations
export const addVocabularyItem = async (item: Pick<NewVocabularyItem, 'text' | 'language'>) => {
  await ensureDatabaseInitialized();
  const db = getDb();
  const now = new Date().toISOString();
  await db
    .insertInto('vocabulary')
    .values({ ...item, last_reviewed_at: now, created_at: now, knowledge_level: 1 })
    .execute();
};

export const getVocabulary = async (page: number, limit: number, language?: string | null): Promise<VocabularyItem[]> => {
  await ensureDatabaseInitialized();
  const db = getDb();
  let query = db.selectFrom('vocabulary').selectAll().orderBy('created_at', 'desc');

  if (language) {
    query = query.where('language', '=', language);
  }

  return await query
    .offset((page - 1) * limit)
    .limit(limit)
    .execute();
};

export const updateVocabularyItemKnowledgeLevel = async (id: number, level: number) => {
  await ensureDatabaseInitialized();
  const db = getDb();
  const now = new Date().toISOString();
  await db
    .updateTable('vocabulary')
    .set({ knowledge_level: level, last_reviewed_at: now })
    .where('id', '=', id)
    .execute();
};
```

**Analytics Operations**:

```typescript
// AI analytics support
export const getAllVocabularyForSummary = async (): Promise<VocabularyItem[]> => {
  return await db
    .selectFrom('vocabulary')
    .selectAll()
    .orderBy('language', 'asc')
    .orderBy('knowledge_level', 'desc')
    .execute();
};

export const getVocabularyByLanguage = async (language: string): Promise<VocabularyItem[]> => {
  return await db
    .selectFrom('vocabulary')
    .selectAll()
    .where('language', '=', language)
    .orderBy('knowledge_level', 'desc')
    .execute();
};

export const getStrugglingWords = async (): Promise<VocabularyItem[]> => {
  return await db
    .selectFrom('vocabulary')
    .selectAll()
    .where('knowledge_level', '<=', 2)
    .orderBy('knowledge_level', 'asc')
    .execute();
};

export const getMasteredWords = async (): Promise<VocabularyItem[]> => {
  return await db
    .selectFrom('vocabulary')
    .selectAll()
    .where('knowledge_level', '=', 5)
    .orderBy('last_reviewed_at', 'desc')
    .execute();
};
```

### Text Rewrites Operations (`text-rewrites.ts`)

**Purpose**: Text rewrite operations with automatic readability scoring and cross-system integration.

**Database Schema**:

```typescript
// Text rewrites table structure
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

// Performance indexes
await db.schema.createIndex('idx_text_rewrites_language').on('text_rewrites').column('language').execute();
await db.schema.createIndex('idx_text_rewrites_created_at').on('text_rewrites').column('created_at').execute();
await db.schema.createIndex('idx_text_rewrites_original_readability_score').on('text_rewrites').column('original_readability_score').execute();
await db.schema.createIndex('idx_text_rewrites_rewritten_readability_score').on('text_rewrites').column('rewritten_readability_score').execute();
await db.schema.createIndex('idx_text_rewrites_source_url').on('text_rewrites').column('source_url').execute();
```

**Core Operations**:

```typescript
export const addTextRewrite = async (rewrite: Omit<NewTextRewrite, 'id' | 'original_readability_score' | 'rewritten_readability_score' | 'created_at'>) => {
  await ensureTextRewritesDatabaseInitialized();
  const db = getDb();
  
  const now = new Date().toISOString();
  const originalReadabilityScore = calculateReadabilityScore(rewrite.original_text, rewrite.language);
  const rewrittenReadabilityScore = calculateReadabilityScore(rewrite.rewritten_text, rewrite.language);

  await db
    .insertInto('text_rewrites')
    .values({
      ...rewrite,
      original_readability_score: originalReadabilityScore,
      rewritten_readability_score: rewrittenReadabilityScore,
      created_at: now,
    })
    .execute();
};

export const getTextRewrites = async (
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
};
```

## Multi-Language Readability Scoring

### Supported Languages

The system supports readability scoring for multiple languages:

- **English (en-US)**: Flesch Reading Ease
- **Spanish (es-ES)**: Flesch-Szigriszt formula
- **French (fr-FR)**: Flesch-Kandel formula
- **German (de-DE)**: Simplified Flesch variant
- **Japanese (ja-JP)**: Kanji density approach
- **Korean (ko-KR)**: Syllable complexity approach

### Readability Calculation

```typescript
export const calculateReadabilityScore = (text: string, language: string): number => {
  const normalizedLang = normalizeLanguageCode(language);
  const words = text.trim().split(/\s+/).filter(word => word.length > 0);
  const totalWords = words.length;
  const totalSentences = countSentences(text, normalizedLang);

  if (totalWords === 0) return 0;

  switch (normalizedLang) {
    case 'ja-JP': {
      // Japanese: Kanji density approach
      const totalChars = text.length;
      const kanjiCount = countKanji(text);
      const kanjiRatio = totalChars > 0 ? kanjiCount / totalChars : 0;
      return Math.max(0, Math.min(100, 100 - kanjiRatio * 100));
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
```

### Language-Specific Algorithms

**English (Flesch Reading Ease)**:
- Formula: `206.835 - 1.015(words/sentences) - 84.6(syllables/words)`
- Range: 0-100 (higher = easier to read)

**Spanish (Flesch-Szigriszt)**:
- Formula: `206.835 - 1.02(words/sentences) - 60(syllables/words)`
- Adapted coefficients for Spanish phonetics

**Japanese (Kanji Density)**:
- Formula: `100 - (kanji_ratio * 100)`
- Based on kanji character density (more kanji = harder)

**Korean (Syllable Complexity)**:
- Formula: `100 - (complex_syllables / total_syllables) * 50`
- Based on syllable complexity and character composition

## Cross-System Integration

### Word-Text Associations

The system provides dynamic association between vocabulary words and text rewrites:

```typescript
export const getVocabularyWordsInText = async (textId: number): Promise<VocabularyItem[]> => {
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

export const getTextRewritesContainingWord = async (vocabularyId: number): Promise<TextRewrite[]> => {
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
```

### Language Code Migration

The system includes migration functionality to normalize inconsistent language codes:

```typescript
export const migrateLanguageCodes = async (): Promise<{ updated: number; errors: number }> => {
  await ensureTextRewritesDatabaseInitialized();
  const db = getDb();
  
  let updated = 0;
  let errors = 0;

  // Get all text rewrites
  const rewrites = await db
    .selectFrom('text_rewrites')
    .selectAll()
    .execute();

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
      }
    } catch (error) {
      console.error(`Error updating rewrite ${rewrite.id}:`, error);
      errors++;
    }
  }

  return { updated, errors };
};
```

## TypeScript Types

### Core Types

```typescript
// Vocabulary types
export interface VocabularyTable {
  id: Generated<number>;
  text: string;
  language: string;
  knowledge_level: number;
  last_reviewed_at: string;
  created_at: string;
}

export type VocabularyItem = Selectable<VocabularyTable>;
export type NewVocabularyItem = Insertable<VocabularyTable>;
export type VocabularyItemUpdate = Updateable<VocabularyTable>;

// Text rewrite types
export interface TextRewritesTable {
  id: Generated<number>;
  original_text: string;
  rewritten_text: string;
  language: string;
  rewriter_settings: string;
  source_url: string;
  url_fragment: string;
  original_readability_score: number;
  rewritten_readability_score: number;
  created_at: string;
}

export type TextRewrite = Selectable<TextRewritesTable>;
export type NewTextRewrite = Insertable<TextRewritesTable>;
export type TextRewriteUpdate = Updateable<TextRewritesTable>;
```

## Performance Optimizations

### Database Indexes

The system creates strategic indexes for optimal query performance:

```typescript
// Vocabulary indexes
// - Primary key on 'id' (automatic)
// - Unique index on 'text' (automatic)

// Text rewrites indexes
await db.schema.createIndex('idx_text_rewrites_language').on('text_rewrites').column('language').execute();
await db.schema.createIndex('idx_text_rewrites_created_at').on('text_rewrites').column('created_at').execute();
await db.schema.createIndex('idx_text_rewrites_original_readability_score').on('text_rewrites').column('original_readability_score').execute();
await db.schema.createIndex('idx_text_rewrites_rewritten_readability_score').on('text_rewrites').column('rewritten_readability_score').execute();
await db.schema.createIndex('idx_text_rewrites_source_url').on('text_rewrites').column('source_url').execute();
```

### Query Optimization

- **Pagination**: All list queries use offset/limit pagination
- **Filtering**: Efficient WHERE clauses with indexed columns
- **Ordering**: Consistent ordering by creation date
- **Bulk Operations**: Batch operations for multiple items

### Connection Management

- **Singleton Pattern**: Single database manager instance
- **Lazy Initialization**: Database initialized only when needed
- **Connection Pooling**: Managed by SQLite client
- **Error Handling**: Graceful error recovery

## Error Handling

### Database Errors

```typescript
try {
  await db.insertInto('vocabulary').values(item).execute();
} catch (error) {
  console.error('Error adding vocabulary item:', error);
  throw error;
}
```

### Initialization Errors

```typescript
const ensureDatabaseInitialized = async () => {
  const dbManager = getDatabaseManager();
  await dbManager.ensureInitialized();
};
```

### Validation Errors

- **Input Validation**: All inputs validated before database operations
- **Language Normalization**: Language codes normalized using shared utilities
- **Constraint Handling**: Unique constraints and foreign key relationships

## Usage Examples

### Basic Vocabulary Operations

```typescript
import { addVocabularyItem, getVocabulary, updateVocabularyItemKnowledgeLevel } from '@extension/sqlite';

// Add vocabulary item
await addVocabularyItem({ text: 'hello', language: 'en-US' });

// Get vocabulary with pagination
const items = await getVocabulary(1, 10, 'en-US');

// Update knowledge level
await updateVocabularyItemKnowledgeLevel(1, 5);
```

### Text Rewrites Operations

```typescript
import { addTextRewrite, getTextRewrites } from '@extension/sqlite';

// Add text rewrite (readability calculated automatically)
await addTextRewrite({
  original_text: 'This is complex text',
  rewritten_text: 'This is simple text',
  language: 'en-US',
  rewriter_settings: '{"tone": "casual"}',
  source_url: 'https://example.com',
  url_fragment: '#:~:text=This%20is%20complex%20text',
});

// Get rewrites with filters
const rewrites = await getTextRewrites(1, 10, {
  language: 'en-US',
  minReadability: 60,
  recentDays: 7,
});
```

### Cross-System Analytics

```typescript
import { getVocabularyWordsInSentence, getSentencesContainingWord } from '@extension/sqlite';

// Find vocabulary words in a sentence
const vocabWords = await getVocabularyWordsInSentence(1);

// Find sentences containing a vocabulary word
const sentences = await getSentencesContainingWord(1);
```

### Database Management

```typescript
import { getDatabaseManager, resetVocabularyDatabase, migrateLanguageCodes } from '@extension/sqlite';

// Ensure database is initialized
const dbManager = getDatabaseManager();
await dbManager.ensureInitialized();

// Reset vocabulary database
await resetVocabularyDatabase();

// Migrate language codes
const result = await migrateLanguageCodes();
console.log(`Migration completed: ${result.updated} updated, ${result.errors} errors`);
```

## Integration Points

### With Packages API

- **Message Passing**: All operations called via message passing from API layer
- **Type Safety**: Shared TypeScript types between packages
- **Error Handling**: Consistent error response format

### With Packages Shared

- **Language Configuration**: Uses `normalizeLanguageCode` for consistency
- **Constants**: Imports language constants and utilities
- **Type Definitions**: Shared types for consistency

### With Offscreen Document

- **Direct Import**: Offscreen document imports SQLite functions directly
- **OPFS Access**: Only offscreen document can access OPFS
- **Message Handling**: Receives messages from background script

## Related Documentation

- [Architecture Overview](architecture-overview.md) - High-level system architecture
- [Message Passing System](message-passing-system.md) - Message passing details
- [Packages API](packages-api.md) - API layer documentation
- [Packages Shared](packages-shared.md) - Shared utilities documentation
- [Vocabulary Analytics](vocabulary-analytics.md) - AI-powered analytics
- [Text Rewrites](text-rewrites.md) - Text simplification feature
