# Packages Storage Documentation

## Purpose

The `packages/storage` package provides a unified storage abstraction layer for Chrome extension settings and preferences. It uses Chrome's `chrome.storage.local` API with a reactive storage system that supports live updates across all extension contexts.

## Responsibilities

- **Settings Persistence**: Store user preferences and settings
- **Cross-Tab Synchronization**: Live updates across all extension contexts via `liveUpdate: true`
- **Type Safety**: TypeScript types for all storage state
- **Normalization**: Language code normalization for consistent storage

## Package Structure

```
packages/storage/
├── lib/
│   ├── base/
│   │   ├── index.ts          # Base storage types and factory
│   │   └── types.ts          # TypeScript type definitions
│   └── impl/
│       ├── language-storage.ts      # Language preferences storage
│       ├── word-replacer-storage.ts # Word replacer settings
│       ├── reading-mode-settings-storage.ts # Reading mode preferences
│       └── theme-storage.ts         # Theme preferences
├── index.mts                 # Package entry point
└── package.json
```

## Storage Types

### Language Storage (`language-storage.ts`)

**Purpose**: Stores language preferences for the extension.

**State Type**:
```typescript
interface LanguageStateType {
  nativeLanguage: string;           // User's native language (default: 'en-US')
  targetLearningLanguage: string;  // Language currently being studied (default: 'en-US')
}
```

**Methods**:
```typescript
interface LanguageStorageType extends BaseStorageType<LanguageStateType> {
  setNativeLanguage(language: string): Promise<void>;
  setTargetLearningLanguage(language: string): Promise<void>;
}
```

**Features**:
- Language codes are normalized to BCP 47 format before storage
- Local normalization function (avoids cyclic dependency with `@extension/shared`)
- Supports common language variants (e.g., 'en', 'en-GB' → 'en-US')
- Default values: both languages initialized to 'en-US'
- `liveUpdate: true` enables cross-tab synchronization

**Target Learning Language Management**:
- **Automatic Detection**: System can detect target language from:
  - Vocabulary analysis (most common language in vocabulary database)
  - Reading mode content (detected page language)
  - Language mismatch prompts (when adding vocabulary in different language)
- **User Control**: Users can always manually set target language via:
  - Side panel dropdown (Vocabulary Tracker and Review tabs)
  - Options page language settings
  - Language mismatch prompt responses
- **No Automatic Changes**: System never changes target language without user consent - all detection prompts users for confirmation
- **Visual Indicators**: Current target language is displayed in side panel headers with language selector dropdown

**Usage**:
```typescript
import { languageStorage } from '@extension/storage';
import { useStorage } from '@extension/shared';

// In a React component
const MyComponent = () => {
  const { nativeLanguage, targetLearningLanguage } = useStorage(languageStorage);
  
  // Update target learning language
  await languageStorage.setTargetLearningLanguage('es-ES');
  
  // Changes are automatically reflected in all tabs/contexts
};
```

**Normalization**:
The storage package includes a local `normalizeLanguageCode` function that:
- Handles common language codes ('en', 'es', 'fr', etc.)
- Normalizes variants ('en-GB', 'en-CA' → 'en-US')
- Validates BCP 47 format codes
- Falls back to 'en-US' for unknown codes

This avoids a cyclic dependency with `@extension/shared` while ensuring consistent language storage.

### Theme Storage (`theme-storage.ts`)

**Purpose**: Manages theme preferences (light, dark, system).

**State Type**:
```typescript
interface ThemeStateType {
  theme: 'light' | 'dark' | null;  // null = respect system preference
}
```

### Word Replacer Storage (`word-replacer-storage.ts`)

**Purpose**: Stores word replacer/AI rewriter settings and state.

### Reading Mode Settings Storage (`reading-mode-settings-storage.ts`)

**Purpose**: Stores reading mode UI preferences (font size, line height, max width, theme).

## Base Storage System

### Storage Factory

The base storage system provides a factory function that creates typed storage instances:

```typescript
export function createStorage<D>(
  key: string,
  defaultValue: D,
  config?: StorageConfigType<D>
): BaseStorageType<D>
```

**Configuration Options**:
- `storageEnum`: Use `StorageEnum.Local` (default) or `StorageEnum.Session`
- `liveUpdate`: Enable cross-tab synchronization (default: `false`)
- `sessionAccessForContentScripts`: Grant content scripts access to session storage

### Storage Type

All storage instances implement:

```typescript
type BaseStorageType<D> = {
  get(): Promise<D>;                    // Get current state
  set(value: ValueOrUpdateType<D>): Promise<void>;  // Update state
  getSnapshot(): D | null;               // Get cached snapshot (synchronous)
  subscribe(listener: () => void): () => void;  // Subscribe to changes
}
```

### Live Updates

When `liveUpdate: true` is enabled, storage changes in one context automatically sync to all other contexts:

```typescript
// In Options page
await languageStorage.setTargetLearningLanguage('es-ES');

// In Side Panel (automatically updates)
const { targetLearningLanguage } = useStorage(languageStorage);
// targetLearningLanguage is now 'es-ES' without manual refresh
```

This is implemented using Chrome's `storage.onChanged` event listener.

## Usage Patterns

### React Component Integration

```typescript
import { useStorage } from '@extension/shared';
import { languageStorage } from '@extension/storage';

const MyComponent = () => {
  // Reactive storage access (updates when storage changes)
  const { targetLearningLanguage } = useStorage(languageStorage);
  
  // Update storage
  const handleLanguageChange = async (lang: string) => {
    await languageStorage.setTargetLearningLanguage(lang);
  };
  
  return (
    <select value={targetLearningLanguage} onChange={e => handleLanguageChange(e.target.value)}>
      {/* options */}
    </select>
  );
};
```

### Non-React Usage

```typescript
import { languageStorage } from '@extension/storage';

// Get current state
const state = await languageStorage.get();
console.log(state.targetLearningLanguage);

// Update state
await languageStorage.setTargetLearningLanguage('fr-FR');

// Subscribe to changes
const unsubscribe = languageStorage.subscribe(() => {
  console.log('Language settings changed!');
});
```

## Integration Points

### With Packages Shared

- Uses `useStorage` hook from `@extension/shared` for React integration
- Storage package does NOT depend on `@extension/shared` to avoid cyclic dependencies
- Language normalization implemented locally in storage package

### With Packages API

- API hooks (`useVocabulary`, `useVocabularyReview`) read from `languageStorage`
- Target learning language auto-filters vocabulary and review queues
- Cache invalidation when target language changes

### With UI Components

- Options page: Settings UI for configuring languages
- Side Panel: Displays vocabulary filtered by target language
- Reading Mode: Uses target language for language mismatch detection
- Vocabulary Form: Defaults to target learning language

## Best Practices

1. **Always use normalized language codes**: Storage automatically normalizes, but be consistent in your code
2. **Subscribe to changes**: Use `useStorage` hook in React or `.subscribe()` for non-React code
3. **Default values**: Always provide sensible defaults when initializing storage
4. **Live updates**: Enable `liveUpdate: true` for settings that need cross-tab synchronization
5. **Type safety**: Use TypeScript types for all storage state

## Related Documentation

- [Architecture Overview](architecture-overview.md) - System architecture
- [Language Configuration System](language-config-system.md) - Language constants and utilities
- [Packages API](packages-api.md) - API layer documentation
- [Packages Shared](packages-shared.md) - Shared utilities

