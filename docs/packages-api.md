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
│   ├── word-replacer.ts         # Text replacement functionality
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

### Database API Utils (`database-api-utils.ts`)

**Purpose**: Shared utilities for message passing to offscreen document.

**Key Functions**:

```typescript
// Generic message sending
export const sendDatabaseMessage = async <T = unknown>(
  action: string,
  data?: unknown
): Promise<DatabaseResponse<T>> => {
  const response = await chrome.runtime.sendMessage({ action, data });
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
export const useVocabulary = () => {
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedItems, setSelectedItems] = useState<Set<number>>(new Set());
  const [languageFilter, setLanguageFilter] = useState<string | null>(null);

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
    setLanguageFilter,
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
- **Filtering**: `languageFilter`, `setLanguageFilter`
- **Mutations**: `addVocabularyItem`, `updateVocabularyItemKnowledgeLevel`, `deleteVocabularyItem`, `bulkDelete`, `clearAllVocabulary`

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
UI Component
  ↓ calls API function
packages/api (validates input with Zod)
  ↓ sends chrome.runtime.sendMessage
Background Script (routes to offscreen)
  ↓ forwards message
Offscreen Document (executes SQLite operation)
  ↓ returns response
Background Script (forwards response)
  ↓ returns to API
packages/api (handles response)
  ↓ returns to UI Component
UI Component (updates state)
```

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
  const result = await sendDatabaseMessageForItem<VocabularyItem>('addVocabularyItem', item);
  if (result) {
    console.log('✅ Vocabulary item saved successfully');
  }
  return result;
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
import { useVocabulary, useTextRewrites } from '@extension/api';

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
```

## Integration Points

### With Packages SQLite

- **Message Passing**: All database operations go through message passing
- **Type Safety**: Shared TypeScript types between packages
- **Error Handling**: Consistent error response format

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
- [Packages Shared](packages-shared.md) - Shared utilities documentation
- [Vocabulary Analytics](vocabulary-analytics.md) - AI-powered analytics
- [Text Rewrites](text-rewrites.md) - Text simplification feature
