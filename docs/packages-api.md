# Packages API Documentation

## Purpose

The `packages/api` package serves as the high-level API layer for UI components, providing clean interfaces for database operations, AI functionality, and Chrome API integration. It abstracts the complexity of message passing and provides type-safe, validated interfaces.

## Responsibilities

- **Message Passing Abstraction**: Provides clean APIs that hide the complexity of background/offscreen message passing
- **Data Validation**: Uses Zod schemas to validate all inputs before sending to database
- **AI Integration**: Wraps Chrome's built-in AI APIs for vocabulary analysis and insights
- **State Management**: Provides React hooks with TanStack Query integration
- **Error Handling**: Standardizes error responses and provides user-friendly error messages
- **Type Safety**: Exports TypeScript types for all data structures

## Package Structure

```
packages/api/
├── lib/
│   ├── chrome-ai-wrapper.ts      # Chrome AI APIs wrapper
│   ├── linguini-ai.ts           # Vocabulary-specific AI functionality
│   ├── vocabulary-api.ts        # Vocabulary CRUD operations
│   ├── text-rewrites-api.ts # Text rewrite operations
│   ├── database-api-utils.ts    # Message passing utilities
│   ├── word-replacer.ts         # Text replacement functionality (utility class, no message handling)
│   ├── types.ts                 # TypeScript type definitions
│   ├── hooks/                   # React hooks
│   │   ├── useVocabulary.ts      # Vocabulary management hook
│   │   └── useTextRewrites.ts # Text rewrites management hook
│   └── function-calling/       # AI function calling
│       ├── function-calling-api.ts
│       ├── types.ts
│       └── README.md
├── index.mts                    # Main exports
└── package.json
```

## Core Modules

### Chrome AI Wrapper (`chrome-ai-wrapper.ts`)

**Purpose**: Low-level wrapper around Chrome's built-in AI capabilities.

**Key Functions**:

```typescript
// Language Model API
export const createLanguageModel = async (systemPrompt?: string) => {
  const availability = await LanguageModel.availability();
  if (availability === 'unavailable') {
    throw new Error('Language Model API not available');
  }
  return await LanguageModel.create(options);
};

// Translator API
export const createTranslator = async (sourceLanguage: string, targetLanguage: string) => {
  const availability = await Translator.availability({ sourceLanguage, targetLanguage });
  if (availability === 'unavailable') {
    throw new Error('Translation unavailable for this language pair');
  }
  return await Translator.create({ sourceLanguage, targetLanguage });
};

// Summarizer API
export const createSummarizer = async () => {
  return await Summarizer.create({});
};
```

**Available APIs**:
- `LanguageModel` - For natural language processing and text generation
- `Translator` - For text translation between languages
- `Summarizer` - For text summarization

**Error Handling**:
- Checks API availability before initialization
- Graceful fallback with user-friendly error messages
- Proper cleanup of resources

### Linguini AI (`linguini-ai.ts`)

**Purpose**: Vocabulary-specific AI functionality using Chrome AI APIs.

**Key Functions**:

```typescript
// Analyze text against known vocabulary
export const analyzeText = (text: string, knownWords: VocabularyItem[]): TextEvaluationResult => {
  // Tokenizes text and matches against vocabulary
  // Returns breakdown with knowledge levels and percentages
};

// Summarize vocabulary data using AI
export const summarizeVocabulary = async (prompt: string, vocabularyData: string): Promise<AIResponse> => {
  const model = await createLanguageModel();
  const response = await model.prompt(fullPrompt, {});
  return { text: response };
};

// Estimate CEFR proficiency level
export const estimateCEFRLevel = async (vocabularyData: string): Promise<CEFRLevel> => {
  // Uses AI to analyze vocabulary distribution and estimate proficiency
};

// Parse natural language queries into filter specifications
export const parseVocabularyQuery = async (prompt: string): Promise<VocabularyFilterSpec> => {
  // Uses function calling to parse user queries into structured filters
};
```

**AI Integration Features**:
- **Natural Language Queries**: Parse user questions into database filters
- **Text Analysis**: Evaluate text comprehension against known vocabulary
- **CEFR Estimation**: Estimate language proficiency levels
- **Vocabulary Summarization**: Generate insights from vocabulary data
- **Function Calling**: Structured query parsing using AI function calling

### Vocabulary API (`vocabulary-api.ts`)

**Purpose**: Clean interface for vocabulary CRUD operations.

**Key Functions**:

```typescript
// Add vocabulary item
export const addVocabularyItem = async (item: NewVocabularyItem): Promise<VocabularyItem | null> => {
  const result = await sendDatabaseMessageForItem<VocabularyItem>('addVocabularyItem', item);
  return result;
};

// Get vocabulary with pagination
export const getVocabulary = async (
  page: number = 1,
  limit: number = 10,
  languageFilter?: string | null
): Promise<VocabularyItem[]> => {
  return sendDatabaseMessageForArray<VocabularyItem>('getVocabulary', { page, limit, languageFilter });
};

// Update knowledge level
export const updateVocabularyItemKnowledgeLevel = async (id: number, level: number): Promise<boolean> => {
  const result = await sendDatabaseMessageForBoolean('updateVocabularyItemKnowledgeLevel', { id, level });
  return result;
};

// Get review queue (words due for review)
// Optionally filters by language
export const getReviewQueue = async (limit?: number, language?: string | null): Promise<VocabularyItem[]> => {
  return sendDatabaseMessageForArray<VocabularyItem>('getReviewQueue', { limit, language });
};

// Mark vocabulary item as reviewed
export const markAsReviewed = async (id: number): Promise<boolean> => {
  return await sendDatabaseMessageForBoolean('markAsReviewed', { id });
};

// Get next review date (when reviews will next be available)
// Optionally filters by language
export const getNextReviewDate = async (language?: string | null): Promise<string | null> => {
  return await sendDatabaseMessageForItem<string | null>(
    'getNextReviewDate',
    { language },
    z.string().nullable(),
  );
};
```

**Data Types**:

```typescript
export interface VocabularyItem {
  id: number;
  text: string;
  language: string;
  knowledge_level: number;
  last_reviewed_at: string;
  created_at: string;
}

export interface NewVocabularyItem {
  text: string;
  language: string;
}
```

### Text Rewrites API (`text-rewrites-api.ts`)

**Purpose**: Text rewrite operations with Zod validation.

**Key Functions**:

```typescript
// Add text rewrite with validation
export const addTextRewrite = async (rewriteData: TextRewriteData): Promise<TextRewrite | null> => {
  const validatedData = TextRewriteDataSchema.parse(rewriteData);
  const result = await sendDatabaseMessageForItem<TextRewrite>('addTextRewrite', validatedData);
  return result;
};

// Get text rewrites with filters
export const getTextRewrites = async (
  page: number = 1,
  limit: number = 10,
  filters: TextRewriteFilters = {}
): Promise<TextRewrite[]> => {
  const validatedFilters = TextRewriteFiltersSchema.parse(filters);
  return sendDatabaseMessageForArray<TextRewrite>('getTextRewrites', { page, limit, filters: validatedFilters });
};
```

**Zod Schemas**:

```typescript
export const TextRewriteDataSchema = z.object({
  original_text: z.string().min(1),
  rewritten_text: z.string().min(1),
  language: LanguageCodeSchema,
  rewriter_settings: z.string(),
  source_url: z.string().url(),
  url_fragment: z.string().nullable().optional(),
});

export const TextRewriteFiltersSchema = z.object({
  language: LanguageCodeSchema.optional(),
  minReadability: z.number().min(0).max(100).optional(),
  maxReadability: z.number().min(0).max(100).optional(),
  recentDays: z.number().positive().optional(),
  sourceUrl: z.string().url().optional(),
});
```

### Word Replacer (`word-replacer.ts`)

**Purpose**: Utility class for text replacement functionality using Chrome's Rewriter API. This is a pure utility class without message handling logic.

**Key Features**:
- Singleton pattern for single instance per page
- Text selection and rewriting via Chrome Rewriter API
- Replacement tracking and undo functionality
- State management (active/inactive, widget size, rewriter options)
- DOM manipulation for text replacement with visual feedback

**Important**: This class does NOT handle Chrome messages. All message handling is done in the `content-runtime` script (`pages/content/src/matches/all/index.ts`). The class exposes public methods that are called by the message handlers in the content script.

**Key Methods**:
```typescript
// State management
updateState(state: { isActive?: boolean; widgetSize?: 'small' | 'medium' | 'large'; rewriterOptions?: RewriterRewriteOptions }): Promise<void>
getState(): { isActive: boolean; widgetSize: 'small' | 'medium' | 'large'; rewriterOptions: RewriterCreateOptions }

// Text rewriting
rewriteSelectedText(): Promise<{ originalText: string; rewrittenText: string; textSelected: true }>

// Replacement management
addReplacement(original: string, replacement: string): void
removeReplacement(original: string): void

// Rewriter options
updateRewriterOptions(options: Partial<RewriterCreateOptions>): Promise<void>
getRewriterOptions(): RewriterCreateOptions
checkRewriterAvailability(): Promise<{ available: boolean; error?: string }>

// Undo functionality
undoAllRewrites(): void
```

**Floating Widget**: The floating widget UI is implemented as a React component in `pages/content-ui/src/matches/all/FloatingWidget.tsx`. It communicates with the WordReplacer instance via messages handled by the `content-runtime` script.

**Reading Mode UI**: The reading mode overlay is implemented as a React component in `pages/content-ui/src/matches/all/ReadingMode.tsx`. It communicates with the TextAnnotateManager instance via callbacks that send messages through the content-runtime script.

**Usage Flow**:
```
React Widget (content-ui)
  ↓ chrome.runtime.sendMessage({ action: 'rewriteSelectedText', target: 'content' })
Background Script (forwards to content script)
  ↓ chrome.tabs.sendMessage(tabId, message)
Content Runtime Script
  ↓ wordReplacer.rewriteSelectedText()
WordReplacer Instance
  ↓ Returns result
Content Runtime Script
  ↓ sendResponse({ success: true, ...result })
Background Script (forwards response)
React Widget (receives response and updates UI)
```

### Database API Utils (`database-api-utils.ts`)

**Purpose**: Shared utilities for message passing directly to offscreen document from any extension context (options, popup, side panel, content scripts).

**Key Functions**:

```typescript
// Generic message sending with automatic offscreen document setup
export const sendDatabaseMessage = async <T = unknown>(
  action: string,
  data?: unknown
): Promise<DatabaseResponse<T>> => {
  // First ensure offscreen document exists
  await ensureOffscreenDocument();
  
  // Send directly to offscreen with explicit target
  const response = await chrome.runtime.sendMessage({ 
    action, 
    target: 'offscreen',
    data 
  });
  
  return response;
};

// Type-specific message sending
export const sendDatabaseMessageForArray = async <T = unknown>(
  action: string,
  data?: unknown
): Promise<T[]> => {
  const response = await sendDatabaseMessage<T[]>(action, data);
  return response.success ? response.data || [] : [];
};

export const sendDatabaseMessageForItem = async <T = unknown>(
  action: string,
  data?: unknown
): Promise<T | null> => {
  const response = await sendDatabaseMessage<T>(action, data);
  return response.success ? response.data || null : null;
};
```

**Response Types**:

```typescript
export interface DatabaseResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}
```

## React Hooks

### Use Vocabulary Hook (`hooks/useVocabulary.ts`)

**Purpose**: Vocabulary management with pagination, selection, and mutations.

**Key Features**:

```typescript
interface UseVocabularyOptions {
  /**
   * If true, use manual language filter instead of auto-filtering by target learning language.
   * Useful for admin interfaces where you want full control.
   */
  manualLanguageFilter?: boolean;
}

export const useVocabulary = (options?: UseVocabularyOptions) => {
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedItems, setSelectedItems] = useState<Set<number>>(new Set());
  const { targetLearningLanguage } = useStorage(languageStorage);
  const [manualLanguageFilter, setManualLanguageFilter] = useState<string | null>(null);
  
  // Auto-apply target learning language filter unless manual mode is enabled
  const languageFilter = options?.manualLanguageFilter 
    ? manualLanguageFilter 
    : (targetLearningLanguage || null);

  // TanStack Query integration
  const { data: vocabularyData } = useQuery({
    queryKey: ['vocabulary', currentPage, languageFilter],
    queryFn: async () => {
      const [items, totalItems] = await Promise.all([
        apiGetVocabulary(currentPage, PAGE_SIZE, languageFilter),
        apiGetVocabularyCount(languageFilter),
      ]);
      return { items, totalItems };
    },
  });

  // Mutations with automatic cache invalidation
  const addVocabularyItem = useMutation({
    mutationFn: (item: Pick<NewVocabularyItem, 'text' | 'language'>) => apiAddVocabularyItem(item),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vocabulary'] });
    },
  });

  return {
    items,
    totalItems,
    currentPage,
    pageSize: PAGE_SIZE,
    goToPage,
    selectedItems,
    toggleItemSelected,
    toggleSelectAll,
    languageFilter,
    setLanguageFilter: options?.manualLanguageFilter ? setManualLanguageFilter : undefined,
    addVocabularyItem,
    updateVocabularyItemKnowledgeLevel,
    deleteVocabularyItem,
    bulkDelete,
    clearAllVocabulary,
  };
};
```

**Returned Values**:
- **Data**: `items`, `totalItems`, `currentPage`, `pageSize`
- **Navigation**: `goToPage`
- **Selection**: `selectedItems`, `toggleItemSelected`, `toggleSelectAll`
- **Filtering**: `languageFilter` (auto-filtered by target learning language by default, or manual in admin mode), `setLanguageFilter` (only available when `manualLanguageFilter: true`)
- **Auto-filtering**: By default, vocabulary is automatically filtered by `targetLearningLanguage` from `languageStorage`. Use `{ manualLanguageFilter: true }` option for admin interfaces that need full control.
- **Cache Invalidation**: Queries automatically invalidate when target learning language changes (unless in manual mode)
- **Mutations**: `addVocabularyItem`, `updateVocabularyItemKnowledgeLevel`, `deleteVocabularyItem`, `bulkDelete`, `clearAllVocabulary`

**Target Learning Language Management**:
- **Auto-filtering**: Vocabulary list automatically filters by user's `targetLearningLanguage`
- **Manual Override**: Side panel provides dropdown to manually change target language at any time
- **Visual Indicator**: Current target language is displayed in side panel header with language selector
- **Language Mismatch Detection**: When adding vocabulary in different language, users are prompted to:
  - Change target language to match the new vocabulary
  - Or add vocabulary anyway without changing target language
- **No Silent Changes**: Target language is never changed automatically - all changes require user confirmation

**Note**: In the Vocabulary tab of the side panel, users **cannot manually modify knowledge levels**. Levels can only be changed through the review system. However, users can:
- Delete vocabulary items (via the "more options" menu)
- Reset mastered items to level 1 using "Learn Again" option (for items with level 5)
- Toggle metadata display to see "due for review" times for each vocabulary item
- Change target learning language via dropdown in the header

### Use Vocabulary Review Hook (`hooks/useVocabularyReview.ts`)

**Purpose**: Vocabulary review functionality with ANKI-style flashcard interface and spaced repetition support.

**Key Features**:

```typescript
export const useVocabularyReview = (limit?: number) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);

  // TanStack Query integration
  const { data: reviewQueue = [], isLoading, refetch } = useQuery({
    queryKey: ['reviewQueue', limit, targetLearningLanguage],
    queryFn: async () => apiGetReviewQueue(limit, targetLearningLanguage || null),
  });

  const { data: nextReviewDate } = useQuery({
    queryKey: ['nextReviewDate', targetLearningLanguage],
    queryFn: () => apiGetNextReviewDate(targetLearningLanguage || null),
  });

  const currentItem = useMemo(() => reviewQueue[currentIndex] || null, [reviewQueue, currentIndex]);

  // Reset flip state when item changes
  useEffect(() => {
    setIsFlipped(false);
  }, [currentItem?.id]);

  const progress = useMemo(
    () => ({
      current: currentIndex + 1,
      total: reviewQueue.length,
    }),
    [currentIndex, reviewQueue.length],
  );

  // ANKI-style review actions
  const handleAgain = useCallback(() => {
    // User doesn't know the word - decrease level
    const newLevel = Math.max(1, currentItem.knowledge_level - 1);
    markReviewed(currentItem.id, newLevel);
  }, [currentItem, markReviewed]);

  const handleHard = useCallback(() => {
    // Word is challenging - maintain current level
    markReviewed(currentItem.id, currentItem.knowledge_level);
  }, [currentItem, markReviewed]);

  const handleGood = useCallback(() => {
    // User knows the word - increase level
    const newLevel = Math.min(5, currentItem.knowledge_level + 1);
    markReviewed(currentItem.id, newLevel);
  }, [currentItem, markReviewed]);

  const handleEasy = useCallback(() => {
    // Word is mastered - set to level 5
    markReviewed(currentItem.id, 5);
  }, [currentItem, markReviewed]);

  const flipCard = useCallback(() => {
    setIsFlipped(prev => !prev);
  }, []);

  return {
    reviewQueue,
    currentItem,
    currentIndex,
    progress,
    isLoading,
    isFlipped,
    nextItem,
    skip,
    markReviewed,
    handleAgain,  // ANKI-style: user doesn't know
    handleHard,  // ANKI-style: challenging
    handleGood,  // ANKI-style: user knows
    handleEasy,  // ANKI-style: mastered
    flipCard,
    refetch,
    resetIndex,
    nextReviewDate,
    // Legacy handlers (still available for backwards compatibility)
    handleKnow: handleGood,
    handleDontKnow: handleAgain,
    handleMastered: handleEasy,
  };
};
```

**Returned Values**:
- **Data**: `reviewQueue`, `currentItem`, `currentIndex`, `progress`, `isLoading`, `isFlipped`, `nextReviewDate`
- **Navigation**: `nextItem`, `skip`, `resetIndex`, `flipCard`
- **ANKI-style Review Actions**: `handleAgain`, `handleHard`, `handleGood`, `handleEasy`
- **Legacy Actions** (for backwards compatibility): `handleKnow`, `handleDontKnow`, `handleMastered`, `markReviewed`
- **Refresh**: `refetch`

**Review Logic**:
- **Review Interval**: Words become due for review **1 hour** after their last review (changed from 7 days)
- **New Words**: Newly added words are immediately available for review (`last_reviewed_at` equals `created_at`)
- **Queue Order**: Words are sorted by oldest `last_reviewed_at` first, then by lowest `knowledge_level` (most challenging first)
- **Next Review Date**: `nextReviewDate` indicates when the next batch of reviews will become available (1 hour after the most recently reviewed word, formatted as "In X mins/hours")
- **Review Actions**: Reviewing a word updates both its `knowledge_level` and `last_reviewed_at` timestamp
- **Language Filtering**: Review queue and next review date are automatically filtered by user's `targetLearningLanguage` from `languageStorage`
- **Cache Invalidation**: Query keys include target language, so cache invalidates when target language changes

**ANKI-style Rating System**:
- **Again**: Decreases knowledge level by 1 (minimum 1) - equivalent to "I don't know"
- **Hard**: Maintains current knowledge level, marks as reviewed - equivalent to "Skip"
- **Good**: Increases knowledge level by 1 (maximum 5) - equivalent to "I know this"
- **Easy**: Sets knowledge level to 5 (Mastered) - equivalent to "Mastered"

### Use Vocabulary Card Back Hook (`hooks/useVocabularyCardBack.ts`)

**Purpose**: Generates translation and example usage for vocabulary review cards in real-time.

**Key Features**:

```typescript
export const useVocabularyCardBack = (item: VocabularyItem | null) => {
  const { targetLearningLanguage } = useStorage(languageStorage);

  const {
    data: cardBackData,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['vocabularyCardBack', item?.id, targetLearningLanguage],
    queryFn: () => fetchCardBackData(item, targetLearningLanguage || null),
    enabled: !!item && !!targetLearningLanguage,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes
  });

  return {
    translation: cardBackData?.translation || '',
    exampleUsage: cardBackData?.exampleUsage || '',
    isLoading,
    error,
  };
};
```

**Returned Values**:
- **`translation`**: Translated text (source language → target learning language)
- **`exampleUsage`**: Example sentence using the word in context
- **`isLoading`**: Loading state while generating data
- **`error`**: Error state if generation fails

**Data Generation**:
- **Translation**: Uses Chrome Translator API (`translateText`)
  - If source and target languages are the same, returns original text
  - Falls back to original text on error
- **Example Usage**: Uses Chrome AI Language Model API
  - Prompt: "Provide a simple, natural example sentence using the word '{word}' in {language}. Keep it short and practical."
  - Returns fallback message on error

**Caching**:
- React Query caches data for 5 minutes (staleTime)
- Cache persists for 30 minutes (gcTime)
- Data is regenerated when vocabulary item or target language changes
- See `docs/vocabulary-review.md` for future database caching enhancement

### Use Text Rewrites Hook (`hooks/useTextRewrites.ts`)

**Purpose**: Text rewrites management with filtering and pagination.

**Key Features**:

```typescript
export const useTextRewrites = (filters?: {
  language?: string;
  minReadability?: number;
  maxReadability?: number;
  recentDays?: number;
  sourceUrl?: string;
}) => {
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedItems, setSelectedItems] = useState<Set<number>>(new Set());

  const queryKey = ['textRewrites', currentPage, filters];

  const { data: textRewritesData } = useQuery({
    queryKey,
    queryFn: async () => {
      const [items, totalItems] = await Promise.all([
        apiGetTextRewrites(currentPage, PAGE_SIZE, filters),
        apiGetTextRewriteCount(filters),
      ]);
      return { items, totalItems };
    },
  });

  return {
    items,
    totalItems,
    currentPage,
    pageSize: PAGE_SIZE,
    goToPage,
    selectedItems,
    toggleItemSelected,
    toggleSelectAll,
    addTextRewrite,
    deleteTextRewrite,
    bulkDelete,
    clearAllTextRewrites,
  };
};
```

## Function Calling Integration

### Function Calling API (`function-calling/function-calling-api.ts`)

**Purpose**: Structured AI function calling for parsing natural language queries.

**Key Features**:

```typescript
export class FunctionCallingPromptAPI {
  constructor(config: FunctionCallingConfig) {
    this.config = config;
  }

  // Register a function for AI to call
  registerFunction(definition: FunctionDefinition) {
    this.functions.set(definition.name, definition);
  }

  // Generate AI response with function calling
  async generate(prompt: string): Promise<Message> {
    const response = await this.model.prompt(prompt, {
      functions: Array.from(this.functions.values()),
    });
    
    return this.parseResponse(response);
  }
}
```

**Usage Example**:

```typescript
// Register vocabulary filter function
parser.registerFunction({
  name: 'apply_vocabulary_filter',
  description: 'Apply filters to vocabulary data based on language and knowledge level',
  parameters: VocabularyFilterSchema,
  execute: (params) => {
    return { query: 'filtered vocabulary', ...params };
  },
});

// Parse user query
const result = await parser.generate('Show me struggling Spanish words');
// Result: { query: 'filtered vocabulary', language: 'es-ES', knowledgeLevel: { levels: [1, 2] } }
```

## Data Flow

### API Request Flow

```
Any Extension Context
  (Options/Popup/Side Panel/Content Script)
  ↓ calls API function
packages/api (validates input with Zod)
  ↓ ensures offscreen document exists (via background)
  ↓ sends chrome.runtime.sendMessage({ action, target: 'offscreen', data })
  ↓ (message bypasses background script entirely)
Offscreen Document (validates message with Zod)
  ↓ executes SQLite operation
  ↓ validates response with Zod schemas
  ↓ returns { success, data?, error? }
packages/api (validates response with Zod)
  ↓ returns typed data to extension context
Extension Context (updates state)
```

**Note**: Database messages bypass the background script entirely and go directly to the offscreen document. This applies to all extension contexts: options page, popup, side panel, and content scripts.

### React Hook Flow

```
UI Component
  ↓ uses hook
React Hook (TanStack Query)
  ↓ calls API function
packages/api (message passing)
  ↓ database operation
Response (cached by TanStack Query)
  ↓ updates UI Component
UI Component (re-renders with new data)
```

## Error Handling

### API Level Errors

```typescript
// Structured error responses
export interface DatabaseResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

// Error handling in API functions
export const addVocabularyItem = async (item: NewVocabularyItem): Promise<VocabularyItem | null> => {
  // Validate input
  const NewVocabularyItemSchema = z.object({
    text: z.string().min(1),
    language: z.string(),
  });
  const validatedItem = NewVocabularyItemSchema.parse(item);
  
  // Send to database with response validation
  return await sendDatabaseMessageForItem<VocabularyItem>(
    'addVocabularyItem', 
    validatedItem, 
    VocabularyItemSchema
  );
};
```

### React Hook Error Handling

```typescript
// TanStack Query error handling
const { data, error, isLoading } = useQuery({
  queryKey: ['vocabulary'],
  queryFn: apiGetVocabulary,
});

// Mutation error handling
const addVocabularyItem = useMutation({
  mutationFn: apiAddVocabularyItem,
  onError: (error) => {
    console.error('Failed to add vocabulary:', error);
  },
});
```

## Usage Examples

### Basic Vocabulary Operations

```typescript
import { addVocabularyItem, getVocabulary, updateVocabularyItemKnowledgeLevel } from '@extension/api';

// Add vocabulary item
const vocab = await addVocabularyItem({ text: 'hello', language: 'en-US' });

// Get vocabulary with pagination
const items = await getVocabulary(1, 10, 'en-US');

// Update knowledge level
const success = await updateVocabularyItemKnowledgeLevel(1, 5);
```

### Text Rewrites Operations

```typescript
import { addTextRewrite, getTextRewrites } from '@extension/api';

// Add text rewrite
const rewrite = await addTextRewrite({
  original_text: 'This is complex text',
  rewritten_text: 'This is simple text',
  language: 'en-US',
  rewriter_settings: '{"tone": "casual"}',
  source_url: 'https://example.com',
});

// Get rewrites with filters
const rewrites = await getTextRewrites(1, 10, {
  language: 'en-US',
  minReadability: 60,
  recentDays: 7,
});
```

### AI-Powered Analytics

```typescript
import { summarizeVocabulary, analyzeText, estimateCEFRLevel } from '@extension/api';

// Summarize vocabulary
const summary = await summarizeVocabulary('Give me a summary of my English vocabulary', vocabularyData);

// Analyze text comprehension
const analysis = analyzeText('Hello world', knownWords);

// Estimate proficiency level
const level = await estimateCEFRLevel(vocabularyData);
```

### React Hook Usage

```typescript
import { useVocabulary, useVocabularyReview, useTextRewrites } from '@extension/api';

const VocabularyComponent = () => {
  const {
    items,
    totalItems,
    currentPage,
    goToPage,
    addVocabularyItem,
    deleteVocabularyItem,
    selectedItems,
    toggleItemSelected,
  } = useVocabulary();

  return (
    <div>
      {items.map(item => (
        <div key={item.id}>
          {item.text} - Level {item.knowledge_level}
          <button onClick={() => toggleItemSelected(item.id)}>
            {selectedItems.has(item.id) ? 'Deselect' : 'Select'}
          </button>
        </div>
      ))}
    </div>
  );
};

const VocabularyReviewComponent = () => {
  const {
    reviewQueue,
    currentItem,
    progress,
    isLoading,
    isFlipped,
    handleAgain,
    handleHard,
    handleGood,
    handleEasy,
    flipCard,
    nextReviewDate,
  } = useVocabularyReview(50);
  
  const { translation, exampleUsage, isLoading: cardBackLoading } = useVocabularyCardBack(currentItem);

  if (isLoading) return <div>Loading...</div>;
  if (reviewQueue.length === 0) {
    return (
      <div>
        <h2>All caught up!</h2>
        {nextReviewDate && (
          <p>Next review available: {new Date(nextReviewDate).toLocaleDateString()}</p>
        )}
      </div>
    );
  }

  return (
    <div>
      <div>Progress: {progress.current} of {progress.total}</div>
      {currentItem && (
        <div>
          {/* ANKI-style Flashcard */}
          <div onClick={() => !isFlipped && flipCard()}>
            {!isFlipped ? (
              // Front: Show word only
              <div>
                <h2>{currentItem.text}</h2>
                <p>Click to reveal answer</p>
              </div>
            ) : (
              // Back: Show translation and example
              <div>
                {cardBackLoading ? (
                  <div>Generating translation...</div>
                ) : (
                  <>
                    <h3>Translation: {translation}</h3>
                    <p>Example: {exampleUsage}</p>
                  </>
                )}
              </div>
            )}
          </div>
          
          {/* Rating buttons only show when flipped */}
          {isFlipped && !cardBackLoading && (
            <div>
              <button onClick={handleAgain}>Again</button>
              <button onClick={handleHard}>Hard</button>
              <button onClick={handleGood}>Good</button>
              <button onClick={handleEasy}>Easy</button>
            </div>
          )}
        </div>
      )}
      {nextReviewDate && (
        <p>Next review available: {new Date(nextReviewDate).toLocaleDateString()}</p>
      )}
    </div>
  );
};
```

## Integration Points

### With Packages SQLite

- **Direct Message Passing**: Database messages go directly to offscreen document (bypass background)
- **Message Validation**: Zod schemas validate all incoming messages in offscreen
- **Response Validation**: Zod schemas validate all outgoing responses in offscreen
- **Type Safety**: Shared TypeScript types between packages
- **Error Handling**: Consistent error response format `{ success: boolean, data?: T, error?: string }`

### With Packages Shared

- **Language Configuration**: Uses `LanguageCodeSchema` for validation
- **Constants**: Imports language constants and utilities
- **Type Definitions**: Shared types for consistency

### With UI Components

- **React Hooks**: Provides state management hooks
- **TanStack Query**: Automatic caching and synchronization
- **Type Safety**: Full TypeScript support

## Performance Considerations

### Caching Strategy

- **TanStack Query**: Automatic caching of API responses
- **Query Invalidation**: Smart cache invalidation on mutations
- **Background Refetching**: Automatic background updates

### Message Passing Optimization

- **Batch Operations**: Multiple operations in single message when possible
- **Async Operations**: Non-blocking message passing
- **Error Boundaries**: Graceful error handling

### AI API Optimization

- **Connection Reuse**: Reuse AI model connections when possible
- **Function Caching**: Cache parsed function definitions
- **Response Streaming**: Support for streaming AI responses

## Related Documentation

- [Architecture Overview](architecture-overview.md) - High-level system architecture
- [Message Passing System](message-passing-system.md) - Message passing details
- [Packages SQLite](packages-sqlite.md) - Database layer documentation
- [Packages Storage](packages-storage.md) - Storage layer documentation
- [Packages Shared](packages-shared.md) - Shared utilities documentation
- [Vocabulary Analytics](vocabulary-analytics.md) - AI-powered analytics
- [Text Rewrites](text-rewrites.md) - Text simplification feature
- [Text Annotate](text-annotate.md) - Reading mode annotation feature
