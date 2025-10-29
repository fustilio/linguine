# Message Passing System

## Purpose

This document details the message passing architecture that enables communication between UI components and the SQLite database through the background script and offscreen document pattern.

## Why Offscreen Document Pattern?

Chrome extensions require the offscreen document pattern for database operations because:

1. **OPFS Access**: Origin Private File System (OPFS) is only available in Web Workers or offscreen documents
2. **Service Worker Limitations**: Background scripts (service workers) cannot access OPFS directly
3. **Persistent Storage**: OPFS provides persistent, high-performance storage for SQLite databases
4. **Security**: Offscreen documents run in an isolated context with controlled permissions

## Message Flow Architecture

```
┌─────────────────┐    chrome.runtime.sendMessage    ┌─────────────────┐
│   UI Component  │ ──────────────────────────────► │ Background      │
│ (Options/Popup) │                                 │ Script          │
└─────────────────┘                                 └─────────────────┘
                                                              │
                                                              │ validates action
                                                              │ ensures offscreen exists
                                                              ▼
                                                    ┌─────────────────┐
                                                    │ Offscreen       │
                                                    │ Document        │
                                                    └─────────────────┘
                                                              │
                                                              │ calls SQLite function
                                                              ▼
                                                    ┌─────────────────┐
                                                    │ packages/sqlite │
                                                    │ (OPFS Database) │
                                                    └─────────────────┘
```

## Background Script Responsibilities

**Location**: `chrome-extension/src/background/index.ts`

### Message Routing

The background script acts as a message router, determining where to forward messages:

```typescript
// Database actions that require offscreen document
const databaseActions = [
  'getAllVocabularyForSummary',
  'addVocabularyItem',
  'deleteVocabularyItem',
  'getTextRewrites',
  'addTextRewrite',
  // ... more database actions
];

if (databaseActions.includes(message.action)) {
  // Forward to offscreen document
  const response = await chrome.runtime.sendMessage(message);
  sendResponse(response);
} else {
  // Handle non-database messages locally
  switch (message.action) {
    case 'wordSelected':
      // Handle word selection
      break;
    case 'exportSettings':
      // Handle settings export
      break;
  }
}
```

### Offscreen Document Management

The background script manages the offscreen document lifecycle:

```typescript
async function setupOffscreenDocument(path: string): Promise<void> {
  // Check if offscreen document already exists
  const existingContexts = await chrome.runtime.getContexts({
    contextTypes: ['OFFSCREEN_DOCUMENT'],
    documentUrls: [chrome.runtime.getURL(path)]
  });

  if (existingContexts.length > 0) {
    return; // Already exists
  }

  // Create offscreen document
  await chrome.offscreen.createDocument({
    url: path,
    reasons: ["WORKERS", "LOCAL_STORAGE"],
    justification: 'Access OPFS for SQLite database operations',
  });
}
```

### Non-Database Message Handling

The background script handles non-database messages directly:

- **Word Selection**: Track vocabulary word replacements
- **Settings Export/Import**: Handle extension settings
- **Tab Management**: Inject content scripts when needed
- **Health Checks**: Respond to ping messages

## Offscreen Document Responsibilities

**Location**: `chrome-extension/src/offscreen.ts`

### Message Processing

The offscreen document receives messages and executes database operations:

```typescript
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  const handleMessage = async () => {
    switch (message.action) {
      case 'addVocabularyItem':
        const newVocabItem = await addVocabularyItem(message.data);
        sendResponse({ success: true, data: newVocabItem });
        break;
      
      case 'getTextRewrites':
        const rewrites = await getTextRewrites(
          message.data.page, 
          message.data.limit, 
          message.data.filters
        );
        sendResponse({ success: true, data: rewrites });
        break;
      
      // ... more database operations
    }
  };
  
  handleMessage().catch(error => {
    sendResponse({ success: false, error: error.message });
  });
  
  return true; // Keep message channel open for async operations
});
```

### Database Initialization

The offscreen document initializes the database on startup:

```typescript
async function initializeDatabase() {
  try {
    const dbManager = getDatabaseManager();
    await dbManager.ensureInitialized();
    console.log('✅ Database initialized in offscreen document');
  } catch (error) {
    console.error('❌ Failed to initialize database:', error);
  }
}

// Initialize on startup
initializeDatabase();
```

## Message Format Specifications

### Legacy Action-Based Format

Most database operations use the legacy action-based format:

```typescript
// Request format
{
  action: 'addVocabularyItem',
  data: {
    text: 'hello',
    language: 'en-US'
  }
}

// Response format
{
  success: true,
  data: {
    id: 1,
    text: 'hello',
    language: 'en-US',
    knowledge_level: 1,
    created_at: '2024-01-01T00:00:00Z'
  }
}
```

### New Type/Target Format

Some operations use a newer structured format:

```typescript
// Request format
{
  type: 'ping',
  target: 'offscreen',
  data: 'Extension icon clicked'
}

// Response format
{
  success: true,
  pong: true,
  message: 'Offscreen document is ready'
}
```

## Available Database Actions

### Vocabulary Operations

| Action | Purpose | Data Format | Response |
|--------|---------|-------------|----------|
| `getAllVocabularyForSummary` | Get all vocabulary for AI analysis | `{}` | `VocabularyItem[]` |
| `addVocabularyItem` | Add new vocabulary item | `{text, language}` | `VocabularyItem` |
| `deleteVocabularyItem` | Delete single vocabulary item | `{id}` | `boolean` |
| `deleteVocabularyItems` | Delete multiple vocabulary items | `{ids}` | `boolean` |
| `updateVocabularyItemKnowledgeLevel` | Update single item's knowledge level | `{id, level}` | `boolean` |
| `updateVocabularyItemKnowledgeLevels` | Update multiple items' knowledge levels | `{ids, levelChange}` | `boolean` |
| `getVocabulary` | Get paginated vocabulary items | `{page, limit, languageFilter}` | `VocabularyItem[]` |
| `getVocabularyCount` | Get vocabulary count | `{languageFilter}` | `number` |
| `resetVocabularyDatabase` | Clear all vocabulary data | `{}` | `boolean` |
| `populateDummyVocabulary` | Add sample data for testing | `{}` | `boolean` |

### Text Rewrites Operations

| Action | Purpose | Data Format | Response |
|--------|---------|-------------|----------|
| `addTextRewrite` | Add new text rewrite | `TextRewriteData` | `TextRewrite` |
| `getTextRewrites` | Get paginated text rewrites | `{page, limit, filters}` | `TextRewrite[]` |
| `getTextRewriteCount` | Get text rewrite count | `{filters}` | `number` |
| `deleteTextRewrite` | Delete single text rewrite | `{id}` | `boolean` |
| `deleteTextRewrites` | Delete multiple text rewrites | `{ids}` | `boolean` |
| `clearAllTextRewrites` | Clear all text rewrites | `{}` | `boolean` |
| `getTextRewriteById` | Get single text rewrite | `{id}` | `TextRewrite` |
| `getTextRewritesByLanguage` | Get rewrites by language | `{language}` | `TextRewrite[]` |
| `getRecentTextRewrites` | Get recent rewrites | `{days, language}` | `TextRewrite[]` |
| `getTextRewritesByUrl` | Get rewrites by source URL | `{url}` | `TextRewrite[]` |
| `getTextRewritesByReadability` | Get rewrites by readability range | `{minScore, maxScore, language}` | `TextRewrite[]` |

### Cross-System Operations

| Action | Purpose | Data Format | Response |
|--------|---------|-------------|----------|
| `getVocabularyWordsInText` | Find vocabulary words in text | `{textId}` | `VocabularyItem[]` |
| `getTextRewritesContainingWord` | Find text rewrites containing vocabulary word | `{vocabularyId}` | `TextRewrite[]` |

### Utility Operations

| Action | Purpose | Data Format | Response |
|--------|---------|-------------|----------|
| `ensureDatabaseInitialized` | Ensure database is ready | `{}` | `boolean` |
| `migrateLanguageCodes` | Normalize language codes | `{}` | `{updated, errors}` |
| `resetTextRewritesDatabase` | Clear text rewrites database | `{}` | `boolean` |

## Error Handling Patterns

### Structured Error Responses

All database operations return structured error responses:

```typescript
// Success response
{
  success: true,
  data: result
}

// Error response
{
  success: false,
  error: 'Error message'
}
```

### Error Propagation

Errors are propagated through the message chain:

```
SQLite Operation Error
  ↓
Offscreen Document (catches error)
  ↓ { success: false, error: "message" }
Background Script (forwards error)
  ↓ { success: false, error: "message" }
UI Component (handles error)
  ↓ Display error to user
```

### Common Error Scenarios

1. **Database Not Initialized**: Offscreen document not ready
2. **Invalid Data**: Zod validation failures
3. **SQLite Errors**: Database constraint violations
4. **Network Errors**: Chrome API failures
5. **Permission Errors**: Missing extension permissions

## Performance Considerations

### Message Channel Management

- **Async Operations**: All database operations are async
- **Channel Persistence**: `return true` keeps message channel open
- **Error Boundaries**: Try-catch blocks prevent crashes
- **Timeout Handling**: Long operations have reasonable timeouts

### Offscreen Document Lifecycle

- **Lazy Creation**: Offscreen document created only when needed
- **Persistence**: Document persists across extension operations
- **Cleanup**: Proper cleanup on extension uninstall

### Database Connection Management

- **Connection Pooling**: Database manager handles connections
- **Transaction Management**: Proper transaction boundaries
- **Index Usage**: Optimized queries with proper indexes

## Usage Examples

### Adding Vocabulary Item

```typescript
// UI Component
const addVocabulary = async (text: string, language: string) => {
  const response = await chrome.runtime.sendMessage({
    action: 'addVocabularyItem',
    data: { text, language }
  });
  
  if (response.success) {
    console.log('Vocabulary added:', response.data);
  } else {
    console.error('Failed to add vocabulary:', response.error);
  }
};
```

### Getting Text Rewrites

```typescript
// UI Component
const getRewrites = async (page: number, filters: TextRewriteFilters) => {
  const response = await chrome.runtime.sendMessage({
    action: 'getTextRewrites',
    data: { page, limit: 10, filters }
  });
  
  if (response.success) {
    return response.data;
  } else {
    throw new Error(response.error);
  }
};
```

### Using API Layer

The `packages/api` layer provides cleaner interfaces:

```typescript
import { addVocabularyItem, getTextRewrites } from '@extension/api';

// Clean API usage
const vocab = await addVocabularyItem({ text: 'hello', language: 'en-US' });
const rewrites = await getTextRewrites(1, 10, { language: 'en-US' });
```

## Debugging Message Passing

### Console Logging

Both background script and offscreen document include detailed logging:

```typescript
// Background script
console.log('✅ Offscreen document created');
console.error('❌ Failed to initialize offscreen document:', error);

// Offscreen document
console.log('Offscreen received message:', message);
console.log('✅ Database initialized in offscreen document');
```

### Message Tracing

To trace message flow:

1. **Background Script**: Check message routing logic
2. **Offscreen Document**: Verify message reception
3. **Database Layer**: Check SQLite operation results
4. **Response Chain**: Verify response propagation

### Common Issues

1. **Offscreen Document Not Created**: Check manifest permissions
2. **Message Not Received**: Verify action name spelling
3. **Database Errors**: Check OPFS availability
4. **Response Format**: Ensure consistent response structure

## Related Documentation

- [Architecture Overview](architecture-overview.md) - High-level system architecture
- [Packages API](packages-api.md) - API layer documentation
- [Packages SQLite](packages-sqlite.md) - Database layer documentation
- [Vocabulary Analytics](vocabulary-analytics.md) - AI-powered analytics
- [Text Rewrites](text-rewrites.md) - Text simplification feature
