# Vocabulary Review System

## Overview

The Vocabulary Review system provides an ANKI-style flashcard interface for reviewing vocabulary words. Users see the vocabulary word on the front of the card, and upon clicking, the back reveals the translation and an example sentence using the word.

## Current Implementation

### Card Front
- Displays only the vocabulary word in large, prominent text
- Shows knowledge level badge (Challenging, Moderate, Easy, Mastered)
- Clickable to reveal the back

### Card Back
- **Translation**: Generated in real-time using Chrome Translator API
  - Source language: Vocabulary item's `language` field
  - Target language: User's `targetLearningLanguage` from storage
- **Example Usage**: Generated in real-time using Chrome AI Language Model
  - Prompt: "Provide a simple, natural example sentence using the word '{word}' in {language}. Keep it short and practical."
  - Returns a natural example sentence in the source language

### Rating System (ANKI-style)
After flipping the card, users can rate their knowledge:

1. **Again** - User doesn't know the word
   - Decreases knowledge level by 1 (minimum 1)
   - Equivalent to previous "I don't know" action

2. **Hard** - Word is challenging but somewhat familiar
   - Maintains current knowledge level
   - Marks as reviewed
   - Equivalent to previous "Skip" action

3. **Good** - User knows the word
   - Increases knowledge level by 1 (maximum 5)
   - Equivalent to previous "I know this" action

4. **Easy** - Word is mastered
   - Sets knowledge level to 5 (Mastered)
   - Equivalent to previous "Mastered" action

### Data Flow

1. User initiates review session
2. Review queue is fetched from database (words due for review)
3. When card is flipped:
   - Translation and example usage are generated in parallel
   - Both use React Query for caching and loading states
   - Data is cached for 5 minutes (staleTime)
   - Cache persists for 30 minutes (gcTime)
4. User rates the card → knowledge level updated → move to next card

## Future Enhancement: Caching Card Back Data

### Current Limitation
Translation and example usage are generated in real-time for each review session. While React Query provides client-side caching during a session, data is not persisted across sessions.

### Proposed Enhancement

#### Database Schema Changes

Add two new columns to the `vocabulary` table:

```sql
ALTER TABLE vocabulary ADD COLUMN translation TEXT;
ALTER TABLE vocabulary ADD COLUMN example_usage TEXT;
```

#### Implementation Details

1. **First Review Flow**:
   - Generate translation and example usage (current behavior)
   - Store generated data in database columns
   - Display cached data immediately

2. **Subsequent Reviews**:
   - Check if `translation` and `example_usage` columns have data
   - If cached data exists:
     - Display immediately (fast, no API calls)
     - Optionally show a refresh button to regenerate
   - If no cached data exists:
     - Generate new data (fallback to current behavior)
     - Store for future reviews

3. **Manual Refresh**:
   - Allow users to manually refresh translation/example
   - Button appears on card back when cached data is shown
   - Regenerates and updates cached data

#### Benefits

- **Performance**: Instant card back display on subsequent reviews
- **Offline Capability**: Can review words offline with cached data
- **Reduced API Calls**: Fewer calls to Chrome AI APIs
- **Consistency**: Same translation/example across review sessions
- **User Control**: Option to regenerate if user wants different examples

#### Migration Strategy

1. Add columns as nullable fields (backwards compatible)
2. Existing vocabulary items will have `NULL` values initially
3. Data will be populated on first review (lazy population)
4. Optionally, run a batch migration to populate existing items

#### API Changes

Update `VocabularyItem` type:

```typescript
interface VocabularyItem {
  id: number;
  text: string;
  language: string;
  knowledge_level: number;
  last_reviewed_at: string;
  created_at: string;
  translation?: string | null;        // NEW
  example_usage?: string | null;      // NEW
}
```

Update `useVocabularyCardBack` hook:

```typescript
const fetchCardBackData = async (item, targetLanguage) => {
  // Check for cached data first
  if (item.translation && item.exampleUsage) {
    return {
      translation: item.translation,
      exampleUsage: item.exampleUsage,
    };
  }
  
  // Generate new data (current behavior)
  const [translation, exampleUsage] = await Promise.all([
    generateTranslation(...),
    generateExampleUsage(...),
  ]);
  
  // Store in database for future reviews
  await updateVocabularyItemCardBack(item.id, translation, exampleUsage);
  
  return { translation, exampleUsage };
};
```

Add new database function:

```typescript
const updateVocabularyItemCardBack = async (
  id: number,
  translation: string,
  exampleUsage: string
): Promise<void> => {
  await db
    .updateTable('vocabulary')
    .set({ translation, example_usage: exampleUsage })
    .where('id', '=', id)
    .execute();
};
```

## Technical Notes

- **Translation API**: `translateText(text, sourceLanguage, targetLanguage)` from `packages/api/lib/chrome-ai/convenience-functions.ts`
- **Example Generation**: Chrome AI Language Model API via `ChromeAIManager.getInstance().getMainSession().model.prompt()`
- **Caching**: React Query handles client-side session caching (5 min stale, 30 min GC)
- **Database**: SQLite via `packages/sqlite/lib/vocabulary.ts`
- **Storage**: Language preferences from `packages/storage/lib/impl/language-storage.ts`
  - Uses `targetLearningLanguage` to filter review queue
  - Cache invalidates when target language changes
  - Translation target: `targetLearningLanguage` (what the user is learning)
  - Source language: Vocabulary item's `language` field (the language of the word being reviewed)

**Target Learning Language Management**:
- **Manual Control**: Review tab header includes dropdown to manually change target language
- **Visual Indicator**: Current target language displayed in header ("Learning: [Language Name]")
- **Language Mismatch**: When adding vocabulary in different language (from reading mode, content scripts, etc.), users are prompted to:
  - Change target language to match detected language
  - Or add vocabulary without changing target language
- **Automatic Detection**: System can detect target language from vocabulary analysis, but never changes it automatically - always requires user confirmation

## Related Documentation

- [Packages Storage](packages-storage.md) - Storage system and language preferences
- [Packages API](packages-api.md) - API hooks and vocabulary operations
- [Packages SQLite](packages-sqlite.md) - Database operations and review queue

