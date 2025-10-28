# Sentence Rewrites Feature

## Overview

The Sentence Rewrites feature tracks AI-rewritten sentences with their original text, rewriter settings, source URLs, readability scores, and links to vocabulary words. This enables users to build a personal library of simplified text examples and track their learning progress.

## Purpose

- **Learning Archive**: Store simplified versions of complex text for future reference
- **Progress Tracking**: Monitor readability improvements over time
- **Vocabulary Integration**: Link rewritten sentences to known vocabulary words
- **Context Preservation**: Maintain source URLs and text fragments for easy navigation back to original content

## Database Schema

### `sentence_rewrites` Table

```typescript
interface SentenceRewritesTable {
  id: Generated<number>;           // Auto-increment primary key
  original_text: string;           // Original sentence before rewriting
  rewritten_text: string;          // AI-rewritten sentence
  language: string;                // BCP 47 language code (e.g., "en-US")
  rewriter_settings: string;       // JSON string of RewriterOptions
  source_url: string;              // Full URL where sentence was found
  url_fragment: string | null;     // URL fragment for text anchor (e.g., "#:~:text=...")
  original_readability_score: number; // Calculated readability score of original text (0-100)
  rewritten_readability_score: number; // Calculated readability score of rewritten text (0-100)
  created_at: string;              // ISO timestamp
}
```

### Field Descriptions

- **`id`**: Unique identifier for each rewrite record
- **`original_text`**: The complete original sentence as it appeared on the webpage
- **`rewritten_text`**: The AI-simplified version of the sentence
- **`language`**: BCP 47 language code (en-US, es-ES, fr-FR, de-DE, ja-JP, ko-KR)
- **`rewriter_settings`**: JSON-serialized RewriterOptions used for the rewrite
- **`source_url`**: Complete URL where the original text was found
- **`url_fragment`**: Chrome Text Fragment API anchor for direct linking to the text
- **`original_readability_score`**: Language-specific readability score of original text (0-100, higher = easier)
- **`rewritten_readability_score`**: Language-specific readability score of rewritten text (0-100, higher = easier)
- **`created_at`**: ISO timestamp when the rewrite was saved

### Indexes

For optimal query performance, the following indexes are created:

- **`idx_sentence_rewrites_language`**: On `language` column for language filtering
- **`idx_sentence_rewrites_created_at`**: On `created_at` column for date-based queries
- **`idx_sentence_rewrites_original_readability_score`**: On `original_readability_score` column for readability filtering
- **`idx_sentence_rewrites_rewritten_readability_score`**: On `rewritten_readability_score` column for readability filtering
- **`idx_sentence_rewrites_source_url`**: On `source_url` column for URL-based queries

## Query Functions

### Basic Retrieval

- **`getSentenceRewrites(page, limit, filters?)`**: Paginated retrieval with optional filters
- **`getSentenceRewriteCount(filters?)`**: Count rewrites with optional filters
- **`getSentenceRewriteById(id)`**: Get single rewrite by ID

### Filtering Options

- **Language**: Filter by specific language code
- **Readability Range**: Filter by minimum and maximum readability scores
- **Date Range**: Filter by recent days (e.g., last 7 days)
- **Source URL**: Filter by specific webpage URL

### Specialized Queries

- **`getSentenceRewritesByLanguage(language)`**: Get all rewrites for a specific language
- **`getRecentSentenceRewrites(days, language?)`**: Get recent rewrites with optional language filter
- **`getSentenceRewritesByUrl(url)`**: Get all rewrites from a specific webpage
- **`getSentenceRewritesByReadability(minScore, maxScore, language?)`**: Filter by readability range

## Mutation Functions

### Adding Rewrites

- **`addSentenceRewrite(rewrite)`**: Insert new rewrite record with automatic readability calculation

### Deleting Rewrites

- **`deleteSentenceRewrite(id)`**: Delete single rewrite by ID
- **`deleteSentenceRewrites(ids)`**: Bulk delete multiple rewrites
- **`clearAllSentenceRewrites()`**: Clear all rewrite records

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

## Word-Sentence Associations

### Association Strategy

Instead of creating a separate junction table, the system uses dynamic querying:

1. **Retrieve Sentence**: Get the sentence rewrite record
2. **Tokenize Text**: Parse both `original_text` and `rewritten_text` into words
3. **Match Vocabulary**: Find vocabulary words that match the tokenized text
4. **Return Results**: Provide matched vocabulary items with the sentence

### Query Functions

- **`getVocabularyWordsInSentence(sentenceId)`**: Get all vocabulary words found in a sentence
- **`getSentencesContainingWord(vocabularyId)`**: Get sentences containing a specific vocabulary word

### Matching Strategy

- **Case Insensitive**: All matching is done in lowercase
- **Punctuation Removal**: Punctuation is stripped before matching
- **Language Specific**: Only matches vocabulary words in the same language
- **Exact Matching**: Uses exact word boundaries for precise matching

## React Hook Usage

### `useSentenceRewrites` Hook

```typescript
import { useSentenceRewrites } from '@extension/api';

const MyComponent = () => {
  const {
    items,           // Array of sentence rewrites
    totalItems,      // Total count for pagination
    currentPage,     // Current page number
    pageSize,        // Items per page (default: 10)
    goToPage,        // Function to change page
    selectedItems,   // Set of selected item IDs
    toggleItemSelected, // Function to toggle selection
    toggleSelectAll,    // Function to select/deselect all
    addSentenceRewrite, // Mutation to add new rewrite
    deleteSentenceRewrite, // Mutation to delete single rewrite
    bulkDelete,      // Mutation to delete selected items
    clearAllSentenceRewrites, // Mutation to clear all
  } = useSentenceRewrites({
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
const englishRewrites = useSentenceRewrites({ language: 'en-US' });

// Filter by readability range
const easyRewrites = useSentenceRewrites({ 
  minReadability: 80, 
  maxReadability: 100 
});

// Filter by recent activity
const recentRewrites = useSentenceRewrites({ recentDays: 30 });

// Combined filters
const filteredRewrites = useSentenceRewrites({
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

The system generates Chrome Text Fragment API anchors for direct linking:

```typescript
// Example URL fragment
const fragment = "#:~:text=This%20is%20a%20complex%20sentence";
const fullUrl = "https://example.com/article" + fragment;
```

This enables users to click links and jump directly to the original text on the webpage.

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

### Language Learning

- **Comprehension Practice**: Save simplified versions of difficult texts
- **Progress Tracking**: Monitor readability improvements over time
- **Vocabulary Building**: Link simplified sentences to known vocabulary words

### Content Analysis

- **Readability Assessment**: Analyze text complexity across different sources
- **Source Tracking**: Maintain links back to original content
- **Pattern Recognition**: Identify common simplification patterns

### Personal Library

- **Reference Collection**: Build a personal library of simplified texts
- **Quick Access**: Use URL fragments to quickly return to original content
- **Cross-Reference**: Find related vocabulary words and sentences

## Integration with Vocabulary System

### Cross-Referencing

- **Word Discovery**: Find sentences containing specific vocabulary words
- **Context Examples**: See vocabulary words used in simplified contexts
- **Learning Reinforcement**: Connect vocabulary learning with sentence comprehension

### Analytics Integration

- **Learning Insights**: Combine sentence rewrites with vocabulary analytics
- **Progress Metrics**: Track both vocabulary growth and text comprehension
- **Personalized Recommendations**: Suggest content based on readability and vocabulary

## Future Enhancements

### Planned Features

- **Batch Operations**: Import/export rewrite collections
- **Advanced Filtering**: Filter by content type, domain, or complexity
- **Collaborative Features**: Share rewrite collections with other users
- **AI Insights**: Get AI-powered analysis of rewriting patterns
- **Integration APIs**: Connect with external learning platforms

### Technical Improvements

- **Performance Optimization**: Implement caching for large rewrite collections
- **Search Functionality**: Full-text search across original and rewritten text
- **Export Formats**: Export rewrites in various formats (PDF, EPUB, etc.)
- **Mobile Support**: Optimize for mobile content consumption
