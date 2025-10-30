# Architecture Overview

## Purpose

This document provides a comprehensive overview of the linguine Chrome extension architecture, explaining how all components work together to provide vocabulary learning and text simplification features.

## High-Level System Architecture

The linguine extension follows a layered architecture pattern with clear separation of concerns:

```
┌─────────────────────────────────────────────────────────────┐
│                    UI Layer                                 │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐          │
│  │   Options   │ │   Popup     │ │ Content UI  │          │
│  │   Page      │ │             │ │             │          │
│  └─────────────┘ └─────────────┘ └─────────────┘          │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                 API Layer (packages/api)                    │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐          │
│  │ Vocabulary  │ │ Sentence    │ │ Chrome AI   │          │
│  │             │ │ API         │ │             │          │
│  └─────────────┘ └─────────────┘ └─────────────┘          │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼ chrome.runtime.sendMessage
┌─────────────────────────────────────────────────────────────┐
│              Background Script (Service Worker)             │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │ Offscreen Document Manager & Non-DB Message Routing    │ │
│  └─────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
                              │
                              │ (database messages bypass background)
                              │ chrome.runtime.sendMessage({ target: 'offscreen' })
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                Offscreen Document                            │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │ Message Handler & Database Operations                   │ │
│  └─────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼ imports
┌─────────────────────────────────────────────────────────────┐
│              Database Layer (packages/sqlite)                │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐          │
│  │ Vocabulary  │ │ Sentence    │ │ Database    │          │
│  │ Operations  │ │ Rewrites    │ │ Manager     │          │
│  │             │ │ Operations  │ │             │          │
│  └─────────────┘ └─────────────┘ └─────────────┘          │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼ uses OPFS
┌─────────────────────────────────────────────────────────────┐
│              SQLite Database (OPFS)                         │
│  ┌─────────────┐ ┌─────────────┐                          │
│  │ vocabulary  │ │sentence_    │                          │
│  │ table       │ │rewrites     │                          │
│  │             │ │table        │                          │
│  └─────────────┘ └─────────────┘                          │
└─────────────────────────────────────────────────────────────┘
```

## Chrome Extension Structure

### Background Script (Service Worker)

**Location**: `chrome-extension/src/background/index.ts`

**Responsibilities**:
- Extension lifecycle management
- Offscreen document lifecycle management
- Non-database message handling (word selection, settings, content script coordination)
- Content script injection
- Tab management

**Key Features**:
- Ensures offscreen document exists when requested (via `ensureOffscreenDocument` action)
- Handles non-database messages locally (word selection, settings export/import)
- Routes content script messages (text availability checks, scrolling)
- Manages content script injection on page navigation
- Ignores database messages (they go directly to offscreen with `target: 'offscreen'`)

### Offscreen Document

**Location**: `chrome-extension/src/offscreen.ts`

**Purpose**: Required for OPFS (Origin Private File System) access, which is only available in Web Workers or offscreen documents.

**Responsibilities**:
- Receives database operation messages directly from UI/content scripts (with `target: 'offscreen'`)
- Executes SQLite operations via `packages/sqlite`
- Returns structured, validated responses using Zod schemas
- Database initialization and lifecycle management
- Validates incoming messages and outgoing responses

### Content Scripts

**Locations**: `pages/content/`, `pages/content-ui/`, `pages/content-runtime/`

**Responsibilities**:
- Inject vocabulary replacement functionality into web pages
- Provide UI for text rewriting and vocabulary saving
- Text Annotate reading mode overlay (DOM-based): extraction, progressive annotations, TTS
- Communicate with background script for database operations
- Handle text selection and Chrome Rewriter API integration

### UI Pages

**Locations**: `pages/options/`, `pages/popup/`, `pages/side-panel/`, `pages/devtools/`

**Responsibilities**:
- Vocabulary management interface
- Analytics and insights dashboard
- Settings configuration
- Extension popup interface (Text Annotate buttons for full-content and demo)

## Database Access Patterns

### OPFS (Origin Private File System)

The extension uses OPFS for persistent SQLite database storage because:

1. **Persistence**: Data survives browser restarts and extension updates
2. **Performance**: Direct file system access for SQLite operations
3. **Security**: Origin-isolated storage prevents cross-origin access
4. **Capacity**: No storage quota limitations like chrome.storage

### Database Architecture

**Tables**:
- `vocabulary`: Stores vocabulary words with knowledge levels
- `text_rewrites`: Stores AI-rewritten text with metadata

**Key Features**:
- Automatic readability scoring for multiple languages
- Language-specific validation using Zod schemas
- Indexed queries for performance
- Migration support for schema updates

## Package Ecosystem

### `packages/api`

**Purpose**: High-level API layer providing clean interfaces for UI components.

**Key Modules**:
- `vocabulary-api.ts`: Vocabulary CRUD operations
- `text-rewrites-api.ts`: Text rewrite operations with validation
- `chrome-ai-wrapper.ts`: Chrome built-in AI APIs wrapper
- `linguini-ai.ts`: Vocabulary-specific AI functionality
- `database-api-utils.ts`: Message passing utilities
- React hooks for state management with TanStack Query

### `packages/sqlite`

**Purpose**: Direct SQLite database operations via OPFS.

**Key Modules**:
- `database-manager.ts`: Database initialization and lifecycle
- `vocabulary.ts`: Vocabulary CRUD operations
- `text-rewrites.ts`: Text rewrite operations
- `types.ts`: TypeScript types using Kysely ORM

### `packages/shared`

**Purpose**: Shared utilities, constants, and type definitions.

**Key Features**:
- Language configuration system (single source of truth)
- Helper utilities and color logging
- Type definitions
- Constants (PROJECT_URL_OBJECT, LANGUAGES)

### `packages/ui`

**Purpose**: Reusable UI components.

**Key Features**:
- Vocabulary analytics components
- Query interface for natural language queries
- Text evaluator for comprehension analysis
- Shared UI patterns and styling

## Data Flow Patterns

### Message Passing Flow

**Database Operations** (bypass background, go directly to offscreen):
```
Any Extension Context
  (Options/Popup/Side Panel/Content Script)
  ↓ chrome.runtime.sendMessage({ action, target: 'offscreen', data })
  ↓ (ensures offscreen exists first via ensureOffscreenDocument)
Offscreen Document
  ↓ Validates message structure with Zod
  ↓ Calls appropriate SQLite function
  ↓ Validates response with Zod schemas
  ↓ Returns { success, data?, error? }
Extension Context
  ↓ Receives validated response
  ↓ Updates state/UI
```

**Note**: All extension contexts (options page, popup, side panel, content scripts) can send database messages directly to offscreen, bypassing the background script entirely.

**Non-Database Operations** (handled by background):
```
Extension Context
  ↓ chrome.runtime.sendMessage({ action, data, target?: 'background' })
Background Script
  ↓ Handles locally or forwards to content script
  ↓ Returns response
Extension Context
  ↓ Receives response
  ↓ Updates state/UI
```

### Data Validation Flow

```
UI Input
  ↓
packages/api (Zod validation)
  ↓ validated data
Message Passing
  ↓
packages/sqlite (Database operations)
  ↓ validated data
SQLite Database
```

### AI Integration Flow

```
User Query
  ↓
packages/api/linguini-ai.ts
  ↓ Chrome AI APIs (LanguageModel, Translator)
  ↓ AI Response
packages/api (Format response)
  ↓
UI Component (Display results)
```

## Integration Points

### Vocabulary System Integration

- **UI**: Options page vocabulary admin interface
- **API**: `packages/api/vocabulary-api.ts` for CRUD operations
- **Database**: `packages/sqlite/vocabulary.ts` for direct operations
- **AI**: `packages/api/linguini-ai.ts` for analytics and insights

### Text Rewrites Integration

- **Content Script**: Text selection and rewriting UI
- **API**: `packages/api/text-rewrites-api.ts` for operations
- **Database**: `packages/sqlite/text-rewrites.ts` for storage
- **AI**: Chrome Rewriter API for text simplification

### Language Configuration Integration

- **Shared**: `packages/shared/lib/language-config.ts` (single source of truth)
- **API**: Zod schemas for validation
- **Database**: Language code normalization
- **UI**: Language selection dropdowns

## Technical Implementation Details

### Chrome Extension Manifest

**Key Permissions**:
- `offscreen`: Required for offscreen document
- `storage`: For settings and preferences
- `activeTab`: For content script injection
- `scripting`: For dynamic content script injection

### Build System

- **Vite**: Build tool for all packages and pages
- **TypeScript**: Type safety across all packages
- **pnpm**: Package management with workspaces
- **Turbo**: Build orchestration and caching

### State Management

- **TanStack Query**: Server state management for API calls
- **React Hooks**: Local component state
- **Chrome Storage**: Settings and preferences persistence

## Security Considerations

### Data Isolation

- OPFS provides origin-isolated storage
- No cross-origin data access
- Extension-scoped permissions

### Input Validation

- Zod schemas for all API inputs
- Language code validation
- URL validation for text rewrites

### Error Handling

- Structured error responses with `{ success: boolean, data?: T, error?: string }`
- Zod validation for all incoming messages and outgoing responses
- Graceful fallbacks for AI API failures
- User-friendly error messages
- Proper message channel management (return `true` for async, `false` for sync)

## Performance Optimizations

### Database Performance

- Indexed queries for common operations
- Pagination for large datasets
- Connection pooling via database manager

### Message Passing Efficiency

- Batched operations where possible
- Async/await for non-blocking operations
- Error boundaries for graceful failures

### UI Performance

- React Query caching for API responses
- Pagination for large lists
- Lazy loading for heavy components

## Related Documentation

- [Message Passing System](message-passing-system.md) - Detailed message flow documentation
- [Packages API](packages-api.md) - API package responsibilities
- [Packages SQLite](packages-sqlite.md) - Database package documentation
- [Packages Shared](packages-shared.md) - Shared utilities documentation
- [Language Configuration System](language-config-system.md) - Language handling
- [Vocabulary Analytics](vocabulary-analytics.md) - AI-powered analytics
- [Text Rewrites](text-rewrites.md) - Text simplification feature
 - [Text Annotate](text-annotate.md) - Reading mode, segmentation, POS, translations
