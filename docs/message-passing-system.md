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
┌─────────────────────────────────────────────────────────┐
│         Any Extension Context                          │
│  (Options/Popup/Side Panel/Content Script)             │
└─────────────────────────────────────────────────────────┘
         │                                                 
         │ 1. chrome.runtime.sendMessage({ action: 'ensureOffscreenDocument', target: 'background' })
         ▼                                                 
┌─────────────────┐                                        
│ Background      │ Ensures offscreen document exists
│ Script          │                                        
└─────────────────┘                                        
         │                                                 
         │ 2. chrome.runtime.sendMessage({ action, target: 'offscreen', data })
         │    (bypasses background script entirely)
         ▼                                                 
┌─────────────────┐                                        
│ Offscreen       │ Validates message with Zod
│ Document        │ Executes SQLite operation
└─────────────────┘                                        
         │                                                 
         │ calls SQLite function
         ▼                                                 
┌─────────────────┐                                        
│ packages/sqlite │ Returns data
│ (OPFS Database) │                                        
└─────────────────┘                                        
         │                                                 
         │ Validates response with Zod
         │ Returns { success, data?, error? }
         ▼                                                 
┌─────────────────────────────────────────────────────────┐
│         Extension Context                               │
│  (Options/Popup/Side Panel/Content Script)              │
└─────────────────────────────────────────────────────────┘
```

**Key Point**: All extension contexts can send messages directly to offscreen. The background script is only involved in ensuring the offscreen document exists (via `ensureOffscreenDocument`), but does not forward database messages.

## Background Script Responsibilities

**Location**: `chrome-extension/src/background/index.ts`

### Message Routing

The background script **no longer forwards database operations**. Database messages with `target: 'offscreen'` go directly to the offscreen document and are ignored by the background script.

The background script only handles:
1. **Offscreen Document Management**: `ensureOffscreenDocument` action
2. **Non-Database Messages**: Word selection, settings export/import, content script coordination

```typescript
// Background script ignores database messages
if (message.target === 'offscreen' && message.action !== 'ensureOffscreenDocument') {
  return false; // Don't handle, let offscreen handle it directly
}

// Only handles ensureOffscreenDocument and non-database messages
switch (message.action) {
  case 'ensureOffscreenDocument':
    await setupOffscreenDocument('offscreen.html');
    sendResponse({ success: true });
    break;
  
  case 'wordSelected':
    // Handle word selection locally
    break;
  
  case 'exportSettings':
    // Handle settings export locally
    break;
  
  // Content script coordination
  case 'scanAllRewritesAvailability':
    // Forward to content script
    break;
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

### Content Script Message Routing

The background script forwards messages with `target: 'content'` to the active tab's content script:

```typescript
// Forward messages intended for content script
if (message.target === 'content') {
  if (sender.tab && sender.tab.id) {
    chrome.tabs.sendMessage(sender.tab.id, message, response => {
      if (chrome.runtime.lastError) {
        sendResponse({ success: false, error: chrome.runtime.lastError.message });
      } else {
        sendResponse(response || { success: false, error: 'No response from content script' });
      }
    });
    return true; // Keep channel open for async response
  }
}
```

**Message Flow**:
```
React Widget (content-ui)
  ↓ chrome.runtime.sendMessage({ action: 'rewriteSelectedText', target: 'content' })
Background Script (forwards message)
  ↓ chrome.tabs.sendMessage(tabId, message, callback)
Content Runtime Script (handles message)
  ↓ wordReplacer.rewriteSelectedText()
WordReplacer Instance (returns result)
  ↓ sendResponse({ success: true, ...result })
Background Script (forwards response)
React Widget (receives response and updates UI)
```

### Non-Database Message Handling

The background script handles non-database messages directly:

- **Offscreen Document Setup**: Ensures offscreen document exists when requested
- **Word Selection**: Track vocabulary word replacements  
- **Settings Export/Import**: Handle extension settings
- **Tab Management**: Inject content scripts when needed
- **Content Script Coordination**: Routes messages between side panel and content scripts
- **Health Checks**: Respond to ping messages
- **Content Script Forwarding**: Forwards messages with `target: 'content'` to active tab

**Key Point**: Database operations bypass the background script entirely. All extension contexts (options page, popup, side panel, content scripts) can send messages directly to the offscreen document with `target: 'offscreen'`. The background script only handles `ensureOffscreenDocument` requests to create the offscreen document if it doesn't exist.

## Offscreen Document Responsibilities

**Location**: `chrome-extension/src/offscreen.ts`

### Message Processing

The offscreen document receives messages directly from any extension context (options page, popup, side panel, content scripts) and executes database operations:

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

### Standard Message Format

All messages use a consistent format with explicit `target` field:

```typescript
// Request format (database operations)
{
  action: 'addVocabularyItem',
  target: 'offscreen',  // Explicitly targets offscreen document
  data: {
    text: 'hello',
    language: 'en-US'
  }
}

// Response format (validated with Zod schemas)
{
  success: true,
  data: {
    id: 1,
    text: 'hello',
    language: 'en-US',
    knowledge_level: 1,
    last_reviewed_at: '2024-01-01T00:00:00Z',
    created_at: '2024-01-01T00:00:00Z'
  }
}
```

### Message Targeting

Messages include a `target` field to route them to the correct handler:

- **`target: 'offscreen'`**: Database operations go directly to offscreen document
- **`target: 'background'`**: Non-database operations handled by background (or no target for backward compatibility)
- **`target: 'sidepanel'`**: Messages for side panel (like `rewriteAccepted` notifications)
- **`target: 'content'`**: Messages for content scripts

If a message has a `target` that doesn't match the listener, it immediately returns `false` without calling `sendResponse`.

## Message Targeting System

### Explicit Targeting

All messages now use an explicit `target` field to route them correctly:

```typescript
// Database operations must include target: 'offscreen'
{
  action: 'addTextRewrite',
  target: 'offscreen',  // Required for database operations
  data: { /* ... */ }
}

// Non-database operations use target: 'background' or no target
{
  action: 'wordSelected',
  target: 'background',  // Optional, defaults to background
  data: { /* ... */ }
}

// Side panel notifications
{
  action: 'rewriteAccepted',
  target: 'sidepanel',  // Only side panel will process this
  data: { /* ... */ }
}
```

### Content Script Message Handling

**Location**: `pages/content/src/matches/all/index.ts`

The content runtime script handles all message passing for content script operations:

```typescript
const wordReplacer = WordReplacer.getInstance();

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  // Only process messages with target: 'content' or no target (backward compatibility)
  if (message.target && message.target !== 'content') {
    return false;
  }

  if (message.action === 'rewriteSelectedText') {
    (async () => {
      try {
        const result = await wordReplacer.rewriteSelectedText();
        sendResponse({ success: true, ...result });
      } catch (error) {
        sendResponse({ success: false, error: error.message });
      }
    })();
    return true; // Keep channel open for async
  }

  if (message.action === 'updateState') {
    // Handle state updates
    await wordReplacer.updateState(message.state);
    sendResponse({ success: true });
    return true;
  }

  // ... other actions
});
```

**Key Points**:
- Content runtime script handles ALL content script messages (not WordReplacer class)
- WordReplacer is a pure utility class with public methods
- Messages use `target: 'content'` to route to content scripts
- All async handlers return `true` to keep message channel open

### Target-Based Routing

Each listener checks the `target` field first:
- **Background**: Forwards messages with `target: 'content'` or `target: 'content-ui'` to active tab; ignores `target: 'offscreen'` or `target: 'sidepanel'`
- **Offscreen**: Only processes messages with `target: 'offscreen'` (or no target for backward compatibility)
- **Content Runtime Scripts**: Process messages with `target: 'content'` or no target (for backward compatibility); ignore `target: 'offscreen'` or `target: 'content-ui'`
- **Content UI Scripts**: Process messages with `target: 'content-ui'` or no target (for backward compatibility); ignore `target: 'offscreen'` or `target: 'content'`
- **Side Panel**: Only processes messages with `target: 'sidepanel'` (or no target for backward compatibility)

This prevents duplicate processing and ensures messages reach the correct handler.

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
// UI Component (can be in options page, popup, side panel, or content script)
const addVocabulary = async (text: string, language: string) => {
  // Ensure offscreen document exists first
  await chrome.runtime.sendMessage({ 
    action: 'ensureOffscreenDocument', 
    target: 'background' 
  });
  
  // Send directly to offscreen, bypassing background
  const response = await chrome.runtime.sendMessage({
    action: 'addVocabularyItem',
    target: 'offscreen',  // Explicitly targets offscreen
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
// UI Component (can be in options page, popup, side panel, or content script)
const getRewrites = async (page: number, filters: TextRewriteFilters) => {
  // Ensure offscreen document exists first
  await chrome.runtime.sendMessage({ 
    action: 'ensureOffscreenDocument', 
    target: 'background' 
  });
  
  // Send directly to offscreen, bypassing background
  const response = await chrome.runtime.sendMessage({
    action: 'getTextRewrites',
    target: 'offscreen',  // Explicitly targets offscreen
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

The `packages/api` layer provides cleaner interfaces that handle message passing automatically:

```typescript
import { addVocabularyItem, getTextRewrites } from '@extension/api';

// API layer handles:
// 1. Ensuring offscreen document exists
// 2. Sending message with target: 'offscreen'
// 3. Validating input data with Zod
// 4. Validating response data with Zod
// 5. Returning typed response

const vocab = await addVocabularyItem({ text: 'hello', language: 'en-US' });
const rewrites = await getTextRewrites(1, 10, { language: 'en-US' });
```

## Debugging Message Passing

### Console Logging

Essential error logging is maintained for debugging:

```typescript
// Background script - only errors logged
console.error('Error ensuring offscreen document:', error);

// Offscreen document - validation errors and critical failures
console.error('Invalid database message structure:', validationError);
console.error('Error in message handler:', error);
```

### Message Tracing

To trace message flow:

1. **Background Script**: Check message routing logic
2. **Offscreen Document**: Verify message reception
3. **Database Layer**: Check SQLite operation results
4. **Response Chain**: Verify response propagation

### Common Issues

1. **Offscreen Document Not Created**: Check manifest permissions and `ensureOffscreenDocument` call
2. **Message Not Received**: Verify `target: 'offscreen'` is set for database operations
3. **Database Errors**: Check OPFS availability and offscreen document state
4. **Response Format**: All responses validated with Zod schemas for consistency
5. **Channel Closed Errors**: Ensure message listeners return `true` for async operations
6. **Duplicate Processing**: Messages with `target: 'offscreen'` are ignored by background and content scripts

## Related Documentation

- [Architecture Overview](architecture-overview.md) - High-level system architecture
- [Packages API](packages-api.md) - API layer documentation
- [Packages SQLite](packages-sqlite.md) - Database layer documentation
- [Vocabulary Analytics](vocabulary-analytics.md) - AI-powered analytics
- [Text Rewrites](text-rewrites.md) - Text simplification feature
 - [Text Annotate](text-annotate.md) - Reading mode overlay and streaming annotations
