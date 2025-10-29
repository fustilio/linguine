# Text Rewrites Feature

## Overview

The Text Rewrites feature tracks AI-rewritten text with their original content, rewriter settings, source URLs, readability scores, and links to vocabulary words. This enables users to build a personal library of simplified text examples and track their learning progress.

## Purpose

- **Learning Archive**: Store simplified versions of complex text for future reference
- **Progress Tracking**: Monitor readability improvements over time
- **Vocabulary Integration**: Link rewritten text to known vocabulary words
- **Context Preservation**: Maintain source URLs and text fragments for easy navigation back to original content

## Database Schema

### `text_rewrites` Table

```typescript
interface TextRewritesTable {
  id: Generated<number>;           // Auto-increment primary key
  original_text: string;           // Original text before rewriting
  rewritten_text: string;          // AI-rewritten text
  language: string;                // BCP 47 language code (e.g., "en-US")
  rewriter_settings: string;       // JSON string of RewriterOptions
  source_url: string;              // Full URL where text was found
  url_fragment: string | null;     // URL fragment for text anchor (e.g., "#:~:text=...")
  original_readability_score: number; // Calculated readability score of original text (0-100)
  rewritten_readability_score: number; // Calculated readability score of rewritten text (0-100)
  created_at: string;              // ISO timestamp
}
```

### Field Descriptions

- **`id`**: Unique identifier for each rewrite record
- **`original_text`**: The complete original text as it appeared on the webpage
- **`rewritten_text`**: The AI-simplified version of the text
- **`language`**: BCP 47 language code (en-US, es-ES, fr-FR, de-DE, ja-JP, ko-KR)
- **`rewriter_settings`**: JSON-serialized RewriterOptions used for the rewrite
- **`source_url`**: Complete URL where the original text was found
- **`url_fragment`**: Chrome Text Fragment API anchor for direct linking to the text
- **`original_readability_score`**: Language-specific readability score of original text (0-100, higher = easier)
- **`rewritten_readability_score`**: Language-specific readability score of rewritten text (0-100, higher = easier)
- **`created_at`**: ISO timestamp when the rewrite was saved

### Indexes

For optimal query performance, the following indexes are created:

- **`idx_text_rewrites_language`**: On `language` column for language filtering
- **`idx_text_rewrites_created_at`**: On `created_at` column for date-based queries
- **`idx_text_rewrites_original_readability_score`**: On `original_readability_score` column for readability filtering
- **`idx_text_rewrites_rewritten_readability_score`**: On `rewritten_readability_score` column for readability filtering
- **`idx_text_rewrites_source_url`**: On `source_url` column for URL-based queries

## Query Functions

### Basic Retrieval

- **`getTextRewrites(page, limit, filters?)`**: Paginated retrieval with optional filters
- **`getTextRewriteCount(filters?)`**: Count rewrites with optional filters
- **`getTextRewriteById(id)`**: Get single rewrite by ID

### Filtering Options

- **Language**: Filter by specific language code
- **Readability Range**: Filter by minimum and maximum readability scores
- **Date Range**: Filter by recent days (e.g., last 7 days)
- **Source URL**: Filter by specific webpage URL

### Specialized Queries

- **`getTextRewritesByLanguage(language)`**: Get all rewrites for a specific language
- **`getRecentTextRewrites(days, language?)`**: Get recent rewrites with optional language filter
- **`getTextRewritesByUrl(url)`**: Get all rewrites from a specific webpage
- **`getTextRewritesByReadability(minScore, maxScore, language?)`**: Filter by readability range

## Mutation Functions

### Adding Rewrites

- **`addTextRewrite(rewrite)`**: Insert new rewrite record with automatic readability calculation

### Deleting Rewrites

- **`deleteTextRewrite(id)`**: Delete single rewrite by ID
- **`deleteTextRewrites(ids)`**: Bulk delete multiple rewrites
- **`clearAllTextRewrites()`**: Clear all rewrite records

## Readability Scoring

### Multi-Language Support

The readability scoring system supports all languages used in the vocabulary system:

#### English (en-US) - Flesch Reading Ease
- **Formula**: `206.835 - 1.015(words/sentences) - 84.6(syllables/words)`
- **Range**: 0-100 (higher = easier to read)
- **Interpretation**:
  - 90-100: Very easy (5th grade level)
  - 60-70: Standard (8-9th grade level)
  - 0-30: Very difficult (college graduate level)

#### Spanish (es-ES) - Flesch-Szigriszt
- **Formula**: `206.835 - 1.02(words/sentences) - 60(syllables/words)`
- **Adapted**: Coefficients adjusted for Spanish word structure and phonetics

#### French (fr-FR) - Flesch-Kandel
- **Formula**: `207 - 1.015(words/sentences) - 73.6(syllables/words)`
- **Adapted**: Modified for French phonetics and sentence structure

#### German (de-DE) - Simplified Flesch Variant
- **Formula**: `180 - (words/sentences) - 58.5(syllables/words)`
- **Adapted**: Accounts for German compound words and complex sentence structures

#### Japanese (ja-JP) - Kanji Density
- **Formula**: `100 - (kanji_ratio * 100)`
- **Method**: Based on kanji character density (more kanji = harder to read)
- **Range**: 0-100 (higher = easier, fewer kanji)

#### Korean (ko-KR) - Syllable Complexity
- **Formula**: `100 - (complex_syllables / total_syllables) * 50`
- **Method**: Based on syllable complexity and character composition

### Score Interpretation

All languages use a 0-100 scale where:
- **90-100**: Very easy to read
- **60-89**: Moderate difficulty
- **30-59**: Difficult
- **0-29**: Very difficult

## Message Passing Flow for Text Rewrite Operations

The text rewrites system uses the extension's message passing architecture to communicate with the database:

### Message Flow Architecture

```
Content Script (or any extension context)
  ↓ 1. chrome.runtime.sendMessage({ action: 'ensureOffscreenDocument', target: 'background' })
Background Script
  ↓ Ensures offscreen document exists
  ↓ Returns { success: true }
Content Script
  ↓ 2. chrome.runtime.sendMessage({ action: 'addTextRewrite', target: 'offscreen', data: rewriteData })
  ↓    (message bypasses background script, goes directly to offscreen)
Offscreen Document
  ↓ Validates message structure with Zod
  ↓ Calls addTextRewrite() from packages/sqlite
  ↓ Calculates readability scores automatically
  ↓ Validates response with TextRewriteSchema
  ↓ Returns { success: true, data: newRewrite }
Content Script
  ↓ Receives validated response
  ↓ Updates UI state
  ↓ Notifies side panel (if open) via rewriteAccepted message
```

**Note**: While this example shows a content script, the same flow applies to any extension context (options page, popup, side panel). All can send database messages directly to offscreen, bypassing the background script.

### Database Operations Used

The text rewrites system uses these database operations:

- **`addTextRewrite`**: Adds new text rewrite with automatic readability scoring
- **`getTextRewrites`**: Retrieves paginated text rewrites with filtering
- **`getTextRewriteCount`**: Gets count for pagination
- **`deleteTextRewrite`**: Deletes single text rewrite
- **`deleteTextRewrites`**: Bulk delete multiple rewrites
- **`clearAllTextRewrites`**: Clears all text rewrites
- **`getTextRewriteById`**: Gets single rewrite by ID
- **`getTextRewritesByLanguage`**: Filters by specific language
- **`getRecentTextRewrites`**: Gets recent rewrites by days
- **`getTextRewritesByUrl`**: Filters by source URL
- **`getTextRewritesByReadability`**: Filters by readability score range

### API Integration

The text rewrites system integrates with the API layer:

```typescript
// packages/api/lib/text-rewrites-api.ts
import { LanguageCodeSchema } from '@extension/shared';

export const addTextRewrite = async (rewriteData: TextRewriteData): Promise<TextRewrite | null> => {
  // Validate input data with Zod schemas
  const validatedData = TextRewriteDataSchema.parse(rewriteData);
  
  // Send to database via message passing
  // - Ensures offscreen document exists
  // - Sends with target: 'offscreen'
  // - Validates response with TextRewriteSchema
  return await sendDatabaseMessageForItem<TextRewrite>(
    'addTextRewrite', 
    validatedData, 
    TextRewriteSchema
  );
};

// Zod validation schema
export const TextRewriteDataSchema = z.object({
  original_text: z.string().min(1),
  rewritten_text: z.string().min(1),
  language: LanguageCodeSchema, // Validates against supported languages
  rewriter_settings: z.string(),
  source_url: z.string().url(),
  url_fragment: z.string().nullable().optional(),
});
```

### React Hook Integration

The system provides React hooks for state management:

```typescript
// packages/api/lib/hooks/useTextRewrites.ts
export const useTextRewrites = (filters?: {
  language?: string;
  minReadability?: number;
  maxReadability?: number;
  recentDays?: number;
  sourceUrl?: string;
}) => {
  const queryClient = useQueryClient();
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedItems, setSelectedItems] = useState<Set<number>>(new Set());

  // TanStack Query for automatic caching and synchronization
  const { data: textRewritesData } = useQuery({
    queryKey: ['textRewrites', currentPage, filters],
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

## Integration with Vocabulary System

### Cross-Referencing

Instead of creating a separate junction table, the system uses dynamic querying:

1. **Retrieve Text**: Get the text rewrite record
2. **Tokenize Text**: Parse both `original_text` and `rewritten_text` into words
3. **Match Vocabulary**: Find vocabulary words that match the tokenized text
4. **Return Results**: Provide matched vocabulary items with the text

### Query Functions

- **`getVocabularyWordsInText(textId)`**: Get all vocabulary words found in a text
- **`getTextRewritesContainingWord(vocabularyId)`**: Get text rewrites containing a specific vocabulary word

### Matching Strategy

- **Case Insensitive**: All matching is done in lowercase
- **Punctuation Removal**: Punctuation is stripped before matching
- **Language Specific**: Only matches vocabulary words in the same language
- **Exact Matching**: Uses exact word boundaries for precise matching

## Related Architecture Documentation

- [Architecture Overview](architecture-overview.md) - High-level system architecture
- [Message Passing System](message-passing-system.md) - Detailed message passing documentation
- [Packages API](packages-api.md) - API layer documentation
- [Packages SQLite](packages-sqlite.md) - Database layer documentation
- [Packages Shared](packages-shared.md) - Shared utilities and constants

## React Hook Usage

### `useTextRewrites` Hook

```typescript
import { useTextRewrites } from '@extension/api';

const MyComponent = () => {
  const {
    items,           // Array of text rewrites
    totalItems,      // Total count for pagination
    currentPage,     // Current page number
    pageSize,        // Items per page (default: 10)
    goToPage,        // Function to change page
    selectedItems,   // Set of selected item IDs
    toggleItemSelected, // Function to toggle selection
    toggleSelectAll,    // Function to select/deselect all
    addTextRewrite, // Mutation to add new rewrite
    deleteTextRewrite, // Mutation to delete single rewrite
    bulkDelete,      // Mutation to delete selected items
    clearAllTextRewrites, // Mutation to clear all
  } = useTextRewrites({
    language: 'en-US',        // Optional language filter
    minReadability: 60,       // Optional minimum readability
    maxReadability: 90,       // Optional maximum readability
    recentDays: 7,           // Optional recent days filter
    sourceUrl: 'https://...', // Optional URL filter
  });

  return (
    <div>
      {items.map(rewrite => (
        <div key={rewrite.id}>
          <h3>Original: {rewrite.original_text}</h3>
          <p>Rewritten: {rewrite.rewritten_text}</p>
          <p>Readability: {rewrite.readability_score}/100</p>
          <p>Source: <a href={rewrite.source_url + rewrite.url_fragment}>View Original</a></p>
        </div>
      ))}
    </div>
  );
};
```

### Filter Configurations

```typescript
// Filter by language only
const englishRewrites = useTextRewrites({ language: 'en-US' });

// Filter by readability range
const easyRewrites = useTextRewrites({ 
  minReadability: 80, 
  maxReadability: 100 
});

// Filter by recent activity
const recentRewrites = useTextRewrites({ recentDays: 30 });

// Combined filters
const filteredRewrites = useTextRewrites({
  language: 'es-ES',
  minReadability: 50,
  recentDays: 14,
});
```

## Content Script Integration

### Automatic Saving

When users rewrite text using the WordReplacer:

1. **Text Selection**: User selects text on a webpage
2. **AI Rewriting**: Chrome's Rewriter API simplifies the text
3. **Interactive UI**: Rewritten text is displayed with action buttons
4. **Save Action**: User clicks save button to store the rewrite
5. **Database Storage**: Rewrite is automatically saved with all metadata

### URL Fragment Generation

The system generates Chrome Text Fragment API anchors for direct linking using Google's battle-tested polyfill:

```typescript
// Enhanced implementation using Google's text-fragments-polyfill
import { generateFragment } from 'text-fragments-polyfill/dist/fragment-generation-utils.js';

generateTextFragment(range: Range): string {
  try {
    // Use Google's battle-tested algorithm
    const fragment = generateFragment(range);
    
    if (fragment.status === 0) { // Success
      return this.buildFragmentString(fragment.fragment);
    }
    
    // Fallback to simple implementation if polyfill fails
    return this.fallbackFragmentGeneration(range);
  } catch (error) {
    console.warn('Fragment generation failed, using fallback:', error);
    return this.fallbackFragmentGeneration(range);
  }
}
```

**Text Fragment API Features:**
- **textStart** (required): Beginning of target text
- **textEnd** (optional): Ending of target text for longer selections  
- **prefix-** (optional): Text before the target for disambiguation
- **-suffix** (optional): Text after the target for disambiguation

**Example URL fragments:**
- Short text: `#:~:text=hello%20world`
- Long text: `#:~:text=This%20is%20a%20long,end%20of%20selection`
- With context: `#:~:text=previous%20text-,target%20text,-following%20text`

**Benefits of Google's Implementation:**
- Handles ambiguous matches automatically
- Proper word boundary detection (Unicode-aware)
- Handles complex DOM structures (tables, lists, etc.)
- Handles invisible elements correctly
- Supports Japanese and other languages
- Battle-tested with extensive test suite
- Minimizes fragment length while ensuring uniqueness

This enables users to click links and jump directly to the original text on the webpage with proper highlighting.

### Settings Serialization

Rewriter settings are automatically serialized to JSON:

```typescript
const settings = {
  sharedContext: "Use simpler vocabulary so I can understand this text.",
  tone: "more-casual",
  format: "plain-text",
  length: "shorter"
};
const serialized = JSON.stringify(settings);
```

## Use Cases

### Text Analysis

- **Comprehension Practice**: Save simplified versions of difficult texts
- **Progress Tracking**: Monitor readability improvements over time
- **Vocabulary Building**: Link simplified texts to known vocabulary words

### Content Analysis

- **Readability Assessment**: Analyze text complexity across different sources
- **Source Tracking**: Maintain links back to original content
- **Pattern Recognition**: Identify common simplification patterns

### Personal Library

- **Reference Collection**: Build a personal library of simplified texts
- **Quick Access**: Use URL fragments to quickly return to original content
- **Cross-Reference**: Find related vocabulary words and text

## Integration with Vocabulary System

### Cross-Referencing

- **Word Discovery**: Find texts containing specific vocabulary words
- **Context Examples**: See vocabulary words used in simplified contexts
- **Learning Reinforcement**: Connect vocabulary learning with text comprehension

### Analytics Integration

- **Learning Insights**: Combine text rewrites with vocabulary analytics
- **Progress Metrics**: Track both vocabulary growth and text comprehension
- **Personalized Recommendations**: Suggest content based on readability and vocabulary

## Future Enhancements

### Planned Features

- **Batch Operations**: Import/export rewrite collections
- **Advanced Filtering**: Filter by content type, domain, or complexity
- **Collaborative Features**: Share rewrite collections with other users
- **AI Insights**: Get AI-powered analysis of rewriting patterns
- **Integration APIs**: Connect with external learning platforms

### Side Panel Batch Reapplication (Roadmap)

**Planned features for the side panel:**

- **Batch Reapply**: Reapply multiple rewrites on current page
- **URL Filtering**: Filter rewrites by current URL
- **One-Click Reapply**: Reapply all rewrites for this page with single click
- **Visual Indicators**: Show which rewrites are available on current page
- **Smart Detection**: Automatically detect when user visits a page with saved rewrites
- **Progress Tracking**: Track which rewrites have been reapplied

**User Workflow:**
1. User visits a webpage with saved text rewrites
2. Side panel automatically detects matching rewrites
3. User can preview which text will be rewritten
4. One-click to reapply all rewrites on the page
5. Visual indicators show which text has been rewritten

### Technical Improvements

- **Performance Optimization**: Implement caching for large rewrite collections
- **Search Functionality**: Full-text search across original and rewritten text
- **Export Formats**: Export rewrites in various formats (PDF, EPUB, etc.)
- **Mobile Support**: Optimize for mobile content consumption
