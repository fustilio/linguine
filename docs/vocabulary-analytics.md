# Vocabulary Analytics Feature

## Overview

The Vocabulary Analytics feature provides AI-powered insights into your vocabulary learning progress. It consists of two main interfaces:

1. **Vocabulary Admin** - Direct table manipulation for CRUD operations on vocabulary items
2. **Vocabulary Analytics** - AI-powered queries and insights

## Architecture

### Packages

#### `packages/api` (NEW)
AI service wrapper for Chrome's built-in AI API.

**Location:** `packages/api/lib/linguini-ai.ts`

**Key Functions:**
- `summarizeVocabulary(prompt, vocabularyData)` - Uses languageModel API for natural language queries
- `analyzeText(text, knownWords)` - Evaluates text against known vocabulary
- `estimateCEFRLevel(vocabularyData)` - Estimates CEFR proficiency level
- `formatVocabularyForAI(vocabulary)` - Converts vocabulary data into AI-friendly format
- `parseVocabularyQuery(query)` - Parses natural language queries into filter specifications using Function Calling API
- `translateVocabularyDefinition(text, sourceLang, targetLang)` - Translates vocabulary definitions

**Function Calling Integration:**
Uses `packages/api/lib/function-calling/function-calling-api.ts` for structured query parsing:
- `FunctionCallingPromptAPI` class for managing AI function calls
- `apply_vocabulary_filter` function for parsing natural language into database filters
- Supports complex queries like "Show me struggling Spanish words" or "Words I learned this week"

**Dependencies:** `@extension/sqlite`, `@extension/shared`

#### `packages/sqlite`
Database layer with new analytics query functions.

**Core Functions in `packages/sqlite/lib/vocabulary.ts`:**

**Query Functions:**
- `getVocabulary(page, limit, language?)` - Paginated vocabulary retrieval
- `getVocabularyCount(language?)` - Count vocabulary items
- `getAllVocabularyForSummary()` - Returns all vocabulary items for AI analysis
- `getVocabularyByLanguage(language)` - Filter by specific language
- `getVocabularyByKnowledgeLevel(minLevel, maxLevel)` - Get words in a level range
- `getRecentVocabulary(days)` - Get recently added/reviewed words
- `getStrugglingWords()` - Words with knowledge_level 1-2
- `getMasteredWords()` - Words with knowledge_level 5
- `filterVocabulary(filters)` - Advanced filtering with language and knowledge level options

**Mutation Functions:**
- `addVocabularyItem(item)` - Add new vocabulary item
- `updateVocabularyItemKnowledgeLevel(id, level)` - Update single item's knowledge level
- `updateVocabularyItemKnowledgeLevels(ids, levelChange)` - Bulk update knowledge levels
- `deleteVocabularyItem(id)` - Delete single vocabulary item
- `deleteVocabularyItems(ids)` - Bulk delete vocabulary items
- `clearAllVocabulary()` - Clear all vocabulary data
- `populateDummyVocabulary()` - Populate with sample data for testing

#### `packages/ui`
UI components for the analytics interface.

**New Components:**
- `VocabularyAnalytics.tsx` - Main analytics view
- `QueryInterface.tsx` - Natural language query UI
- `TextEvaluator.tsx` - Text analysis interface

**Location:** `packages/ui/lib/components/`

## User Interfaces

### Vocabulary Admin View
Located in `pages/options/src/VocabularyAdmin.tsx` - provides direct manipulation of the vocabulary table.

### Vocabulary Analytics View
Located in `pages/options/src/` - accessible via the Options page sidebar.

**Features:**
1. **Natural Language Queries** - Ask questions like:
   - "Summarize my English vocabulary progress"
   - "What words am I struggling with?"
   - "Show me my recently learned words"
   - "What's my Spanish proficiency level?"

2. **Text Evaluator** - Analyze comprehension of any text:
   - Paste or type text in any supported language
   - Automatically matches words against your vocabulary
   - Color-codes results:
     - 🔴 Red: Unknown words
     - 🟡 Yellow: Struggling words (level 1-2)
     - 🔵 Blue: Learning words (level 3)
     - 🟢 Green: Mastered words (level 4-5)
   - Shows percentage breakdown

## Data Flow

### Query Flow
1. User enters natural language query
2. Fetch all vocabulary data with `getAllVocabularyForSummary()`
3. Format data with `formatVocabularyForAI()`
4. Construct prompt: `${userQuery}\n\nVocabulary data:\n${formattedData}`
5. Send to Chrome AI `languageModel` API
6. Display formatted response

### Text Analysis Flow
1. User pastes text + selects language
2. Get all vocabulary for that language with `getVocabularyByLanguage(language)`
3. Tokenize input text by words
4. Match against vocabulary database
5. Return array of analysis results with knowledge levels
6. Render with color coding

### CEFR Estimation
Uses heuristic based on:
- Total vocabulary size
- Distribution across knowledge levels (1-5)
- CEFR benchmarks:
  - A1: ~500 words
  - A2: ~1000 words
  - B1: ~2000 words
  - B2: ~4000 words
  - C1: ~8000 words
  - C2: 8000+ words

## Technical Details

### Chrome AI API Integration
The feature uses Chrome's experimental AI APIs through the wrapper in `packages/api/lib/chrome-ai-wrapper.ts`.

**Available APIs:**
- `LanguageModel` - For natural language processing and text generation
- `Translator` - For text translation between languages  
- `Summarizer` - For text summarization

**Key Wrapper Functions:**
- `createLanguageModel(systemPrompt?)` - Initialize language model with optional system prompt
- `createTranslator(sourceLang, targetLang)` - Initialize translator for language pair
- `createSummarizer()` - Initialize summarizer
- `translateText(text, sourceLang, targetLang)` - Translate text using Chrome API
- `summarizeText(text, context?)` - Summarize text with optional context
- `streamSummarizeText(text, context?)` - Stream summarization results

**Availability Status:**
- `'available'` - API is ready to use
- `'unavailable'` - Not supported on this device
- `'restricted'` - Available but access restricted

**Error Handling:**
- Checks availability before making requests
- Graceful fallback with user-friendly error messages
- Returns structured error responses with explanations

### Database Schema
Vocabulary table structure:
```typescript
interface VocabularyTable {
  id: Generated<number>;           // Auto-increment primary key
  text: string;                   // The vocabulary word/phrase (unique)
  language: string;               // BCP 47 language code (e.g., "en-US")
  knowledge_level: number;         // 1-5 scale (1=struggling, 5=mastered, default: 1)
  last_reviewed_at: string;       // ISO timestamp (auto-updated on level changes)
  created_at: string;            // ISO timestamp (set on creation)
}

// TypeScript types exported from packages/sqlite/lib/types.ts
export type VocabularyItem = Selectable<VocabularyTable>;
export type NewVocabularyItem = Insertable<VocabularyTable>;
export type VocabularyItemUpdate = Updateable<VocabularyTable>;
```

### UI Components

#### QueryInterface
- Input field for natural language queries
- Example query buttons
- Recent queries history
- Loading states

#### TextEvaluator
- Language selector dropdown
- Large text area for input
- Results display with:
  - Statistical breakdown
  - Color-coded word analysis
  - Percentage metrics

#### VocabularyAnalytics
- Combines QueryInterface and TextEvaluator
- Manages state for both query and text analysis
- Displays AI responses with markdown support
- Error handling with user feedback

## Usage

### Accessing the Feature
1. Open the extension's Options page
2. Click "Vocabulary Analytics" in the sidebar
3. Either:
   - Enter a natural language query about your vocabulary
   - Or use the Text Evaluator to analyze comprehension

### Example Queries
- "Give me a summary of my English vocabulary"
- "How many Spanish words do I know?"
- "What are my weakest vocabulary areas?"
- "Show me recently added words"
- "Estimate my CEFR level"

### Supported Languages
Currently: English, Spanish, French, German, Japanese, Korean

Languages are added via the vocabulary Admin interface.

## Message Passing Flow for Vocabulary Operations

The vocabulary analytics system uses the extension's message passing architecture to communicate with the database:

### Message Flow Architecture

```
UI Component (Vocabulary Analytics - Options Page)
  ↓ chrome.runtime.sendMessage({ action: 'ensureOffscreenDocument', target: 'background' })
Background Script (Service Worker)
  ↓ Ensures offscreen document exists
  ↓ Returns { success: true }
UI Component
  ↓ chrome.runtime.sendMessage({ action: 'getAllVocabularyForSummary', target: 'offscreen' })
  ↓ (message bypasses background script, goes directly to offscreen)
Offscreen Document
  ↓ Validates message structure with Zod
  ↓ Calls getAllVocabularyForSummary() from packages/sqlite
  ↓ Validates response with VocabularyItemSchema.array()
  ↓ Returns { success: true, data: vocabularyData }
UI Component
  ↓ Receives validated vocabulary data
  ↓ Formats data for AI analysis
  ↓ Sends to Chrome AI APIs
```

**Note**: This same direct-to-offscreen messaging pattern applies to all extension pages: options, popup, side panel, and content scripts. All can bypass the background script for database operations.

### Database Operations Used

The vocabulary analytics system uses these database operations:

- **`getAllVocabularyForSummary`**: Retrieves all vocabulary for AI analysis
- **`getVocabularyByLanguage`**: Filters vocabulary by specific language
- **`getVocabularyByKnowledgeLevel`**: Filters by knowledge level ranges
- **`getRecentVocabulary`**: Gets recently added/reviewed words
- **`getStrugglingWords`**: Gets words with knowledge level 1-2
- **`getMasteredWords`**: Gets words with knowledge level 5
- **`filterVocabulary`**: Advanced filtering with multiple criteria

### API Integration

The analytics system integrates with the API layer:

```typescript
// packages/api/lib/linguini-ai.ts
import { getAllVocabularyForSummary } from '@extension/api';

const summarizeVocabulary = async (prompt: string, vocabularyData: string): Promise<AIResponse> => {
  // Get all vocabulary data via message passing (goes directly to offscreen)
  // Response is validated with Zod schemas
  const allVocabulary = await getAllVocabularyForSummary();
  
  // Format for AI consumption
  const formattedData = formatVocabularyForAI(allVocabulary);
  
  // Send to Chrome AI APIs
  const model = await createLanguageModel();
  const response = await model.prompt(fullPrompt, {});
  
  return { text: response };
};
```

## Related Features

### Text Rewrites

The vocabulary analytics system integrates with the [Text Rewrites feature](text-rewrites.md) to provide comprehensive learning insights:

- **Cross-Reference Analysis**: Find vocabulary words used in simplified text
- **Context Learning**: See vocabulary words in easier-to-understand contexts
- **Progress Tracking**: Combine vocabulary growth with text comprehension improvements
- **Learning Reinforcement**: Connect vocabulary learning with text simplification

**Key Integration Points:**
- `getVocabularyWordsInText(textId)` - Find vocabulary words in specific text
- `getTextRewritesContainingWord(vocabularyId)` - Find text rewrites containing specific vocabulary
- Shared language filtering across both systems
- Combined analytics for comprehensive learning insights

## Related Architecture Documentation

- [Architecture Overview](architecture-overview.md) - High-level system architecture
- [Message Passing System](message-passing-system.md) - Detailed message passing documentation
- [Packages API](packages-api.md) - API layer documentation
- [Packages SQLite](packages-sqlite.md) - Database layer documentation
- [Packages Shared](packages-shared.md) - Shared utilities and constants

## Future Enhancements

- [ ] CEFR level tracking over time
- [ ] Personalized learning recommendations
- [ ] Spaced repetition algorithm integration
- [ ] Export analytics as reports
- [ ] Multi-language text analysis
- [ ] Progress charts and visualizations
- [ ] Text rewrite analytics integration
- [ ] Cross-system learning progress tracking


