# Packages Shared Documentation

## Purpose

The `packages/shared` package serves as the foundation for shared utilities, constants, and type definitions across the entire extension. It provides a single source of truth for language configuration, common helper functions, and consistent type definitions used throughout the application.

## Responsibilities

- **Language Configuration**: Single source of truth for all language-related constants and mappings
- **Shared Utilities**: Common helper functions used across packages
- **Type Definitions**: Shared TypeScript types and interfaces
- **Constants**: Application-wide constants and configuration
- **Validation Schemas**: Zod schemas for consistent validation
- **Logging Utilities**: Colorful console logging for better debugging

## Package Structure

```
packages/shared/
├── lib/
│   ├── language-config.ts       # Language configuration system
│   ├── utils/
│   │   ├── index.ts            # Utility exports
│   │   ├── helpers.ts          # Common helper functions
│   │   ├── colorful-logger.ts  # Colorful console logging
│   │   └── init-app-with-shadow.ts # Shadow DOM initialization
│   ├── types.ts                # Shared type definitions
│   └── const.ts                # Constants and configuration
├── const.ts                    # Main constants export
├── index.mts                   # Package entry point
└── package.json
```

## Core Modules

### Language Configuration System (`language-config.ts`)

**Purpose**: Single source of truth for all language-related configuration, constants, and utilities.

**Key Features**:

```typescript
// Supported language codes (BCP 47 format)
export const SUPPORTED_LANGUAGE_CODES = [
  'en-US', 'es-ES', 'fr-FR', 'de-DE', 'ja-JP', 'ko-KR',
  'zh-CN', 'it-IT', 'pt-BR', 'ru-RU', 'ar-SA', 'hi-IN',
] as const;

// Language display names mapping
export const LANGUAGE_DISPLAY_NAMES: Record<string, string> = {
  // English variants
  'en-US': 'English',
  'en-GB': 'English',
  'en-CA': 'English',
  'en': 'English',
  
  // Spanish variants
  'es-ES': 'Spanish',
  'es-MX': 'Spanish',
  'es-AR': 'Spanish',
  'es': 'Spanish',
  
  // ... more language mappings
};

// Language family mapping for normalization
export const LANGUAGE_FAMILY_MAPPING: Record<string, string> = {
  'en': 'en-US',
  'es': 'es-ES',
  'fr': 'fr-FR',
  'de': 'de-DE',
  'ja': 'ja-JP',
  'ko': 'ko-KR',
  'zh': 'zh-CN',
  'it': 'it-IT',
  'pt': 'pt-BR',
  'ru': 'ru-RU',
  'ar': 'ar-SA',
  'hi': 'hi-IN',
};

// UI configuration for language selection
export const LANGUAGES: Array<{ value: string; label: string }> = [
  { value: 'en-US', label: 'English' },
  { value: 'es-ES', label: 'Spanish' },
  { value: 'fr-FR', label: 'French' },
  { value: 'de-DE', label: 'German' },
  { value: 'ja-JP', label: 'Japanese' },
  { value: 'ko-KR', label: 'Korean' },
  { value: 'zh-CN', label: 'Chinese' },
  { value: 'it-IT', label: 'Italian' },
  { value: 'pt-BR', label: 'Portuguese' },
  { value: 'ru-RU', label: 'Russian' },
  { value: 'ar-SA', label: 'Arabic' },
  { value: 'hi-IN', label: 'Hindi' },
];
```

**Zod Validation Schemas**:

```typescript
import { z } from 'zod';

// Zod schema for supported language codes
export const LanguageCodeSchema = z.enum(SUPPORTED_LANGUAGE_CODES);

// Zod schema for any language string
export const LanguageStringSchema = z.string();

// Type definitions
export type SupportedLanguageCode = typeof SUPPORTED_LANGUAGE_CODES[number];
export type LanguageCode = string;
export type LanguageDisplayName = string;
```

**Utility Functions**:

```typescript
// Normalize any language input to standard BCP 47 format
export const normalizeLanguageCode = (lang: string): SupportedLanguageCode => {
  // Handle null/undefined
  if (!lang) return 'en-US';
  
  // Convert to lowercase for case-insensitive matching
  const normalized = lang.toLowerCase().trim();
  
  // Direct match
  if (SUPPORTED_LANGUAGE_CODES.includes(normalized as SupportedLanguageCode)) {
    return normalized as SupportedLanguageCode;
  }
  
  // Check display names
  for (const [code, displayName] of Object.entries(LANGUAGE_DISPLAY_NAMES)) {
    if (displayName.toLowerCase() === normalized) {
      return code as SupportedLanguageCode;
    }
  }
  
  // Check family mapping
  if (LANGUAGE_FAMILY_MAPPING[normalized]) {
    return LANGUAGE_FAMILY_MAPPING[normalized] as SupportedLanguageCode;
  }
  
  // Default fallback
  return 'en-US';
};

// Get display name for language code
export const getLanguageDisplayName = (lang: string): LanguageDisplayName => {
  const normalized = normalizeLanguageCode(lang);
  return LANGUAGE_DISPLAY_NAMES[normalized] || 'Unknown';
};

// Check if language is supported
export const isSupportedLanguage = (lang: string): boolean => {
  try {
    LanguageCodeSchema.parse(normalizeLanguageCode(lang));
    return true;
  } catch {
    return false;
  }
};

// Get all supported language codes
export const getSupportedLanguageCodes = (): readonly SupportedLanguageCode[] => {
  return SUPPORTED_LANGUAGE_CODES;
};

// Get language configuration for UI
export const getLanguageConfig = (): Array<{ value: string; label: string }> => {
  return LANGUAGES;
};
```

### Shared Utilities (`utils/`)

**Purpose**: Common helper functions used across packages.

#### Helper Functions (`helpers.ts`)

```typescript
import type { ExcludeValuesFromBaseArrayType } from './types.js';

// Type-safe array filtering utility
export const excludeValuesFromBaseArray = <B extends string[], E extends (string | number)[]>(
  baseArray: B,
  excludeArray: E,
) => baseArray.filter(value => !excludeArray.includes(value)) as ExcludeValuesFromBaseArrayType<B, E>;

// Async sleep utility
export const sleep = async (time: number) => new Promise(r => setTimeout(r, time));
```

#### Colorful Logger (`colorful-logger.ts`)

```typescript
import { COLORS } from './const.js';
import type { ColorType, ValueOf } from './types.js';

export const colorfulLog = (message: string, type: ColorType) => {
  let color: ValueOf<typeof COLORS>;

  switch (type) {
    case 'success':
      color = COLORS.FgGreen;
      break;
    case 'info':
      color = COLORS.FgBlue;
      break;
    case 'error':
      color = COLORS.FgRed;
      break;
    case 'warning':
      color = COLORS.FgYellow;
      break;
    default:
      color = COLORS[type];
      break;
  }

  console.info(color, message);
  console.info(COLORS['Reset']);
};
```

#### Shadow DOM Initialization (`init-app-with-shadow.ts`)

```typescript
// Utility for initializing React apps with Shadow DOM
export const initAppWithShadow = (container: HTMLElement, app: React.ReactElement) => {
  // Creates shadow DOM and mounts React app
  // Used for content script UI injection
};
```

### Constants (`const.ts`)

**Purpose**: Application-wide constants and configuration.

```typescript
export const PROJECT_URL_OBJECT = {
  url: 'https://github.com/fustilio/linguine',
} as const;

// Re-export language configuration from the single source of truth
export { LANGUAGES } from './lib/language-config.js';
```

### Type Definitions (`types.ts`)

**Purpose**: Shared TypeScript types and interfaces.

```typescript
// Color types for logging
export type ColorType = 'success' | 'info' | 'error' | 'warning' | 'FgGreen' | 'FgBlue' | 'FgRed' | 'FgYellow' | 'Reset';

// Color values
export type ValueOf<T> = T[keyof T];

// Array utility types
export type ExcludeValuesFromBaseArrayType<B extends string[], E extends (string | number)[]> = 
  Exclude<B[number], E[number]>[];

// Language types
export type SupportedLanguageCode = typeof SUPPORTED_LANGUAGE_CODES[number];
export type LanguageCode = string;
export type LanguageDisplayName = string;
```

## Language Configuration System

### Single Source of Truth

The language configuration system provides a centralized approach to language handling:

1. **Consistent Language Codes**: All packages use the same BCP 47 language codes
2. **Display Name Mapping**: Handles both language codes and display names
3. **Family Mapping**: Normalizes language families to specific variants
4. **Validation**: Zod schemas ensure type safety
5. **Fallback Handling**: Graceful fallbacks for unknown languages

### Supported Languages

The system supports 12 primary languages with 100+ regional variants:

- **English (en-US)**: Primary language with multiple regional variants
- **Spanish (es-ES)**: Spanish with Latin American variants
- **French (fr-FR)**: French with Canadian and African variants
- **German (de-DE)**: German with Austrian and Swiss variants
- **Japanese (ja-JP)**: Japanese with regional variants
- **Korean (ko-KR)**: Korean with regional variants
- **Chinese (zh-CN)**: Simplified Chinese
- **Italian (it-IT)**: Italian with regional variants
- **Portuguese (pt-BR)**: Brazilian Portuguese
- **Russian (ru-RU)**: Russian with regional variants
- **Arabic (ar-SA)**: Arabic with regional variants
- **Hindi (hi-IN)**: Hindi with regional variants

### Language Normalization

The system handles various language input formats:

```typescript
// Examples of language normalization
normalizeLanguageCode('en')           // → 'en-US'
normalizeLanguageCode('English')      // → 'en-US'
normalizeLanguageCode('es-MX')        // → 'es-ES'
normalizeLanguageCode('Spanish')      // → 'es-ES'
normalizeLanguageCode('fr-CA')        // → 'fr-FR'
normalizeLanguageCode('French')       // → 'fr-FR'
normalizeLanguageCode('unknown')       // → 'en-US' (fallback)
```

## Integration Points

### With Packages API

- **Validation**: Uses `LanguageCodeSchema` for input validation
- **Normalization**: Uses `normalizeLanguageCode` for consistent language handling
- **Constants**: Imports language constants for UI components

### With Packages SQLite

- **Language Normalization**: Uses `normalizeLanguageCode` for database consistency
- **Migration**: Uses language utilities for data migration
- **Readability Scoring**: Uses language codes for multi-language algorithms

### With UI Components

- **Language Selection**: Uses `LANGUAGES` array for dropdown options
- **Display Names**: Uses `getLanguageDisplayName` for user-friendly labels
- **Validation**: Uses Zod schemas for form validation

## Usage Examples

### Language Configuration

```typescript
import { 
  normalizeLanguageCode, 
  getLanguageDisplayName, 
  LanguageCodeSchema,
  LANGUAGES 
} from '@extension/shared';

// Normalize language codes
const normalized = normalizeLanguageCode('en-GB'); // 'en-US'
const displayName = getLanguageDisplayName('es-MX'); // 'Spanish'

// Validate language codes
const isValid = LanguageCodeSchema.safeParse('en-US').success; // true

// Use in UI components
const languageOptions = LANGUAGES.map(lang => (
  <option key={lang.value} value={lang.value}>
    {lang.label}
  </option>
));
```

### Shared Utilities

```typescript
import { excludeValuesFromBaseArray, sleep, colorfulLog } from '@extension/shared';

// Type-safe array filtering
const filtered = excludeValuesFromBaseArray(['a', 'b', 'c'], ['b']); // ['a', 'c']

// Async sleep
await sleep(1000); // Wait 1 second

// Colorful logging
colorfulLog('Operation successful', 'success');
colorfulLog('Warning message', 'warning');
colorfulLog('Error occurred', 'error');
```

### Constants Usage

```typescript
import { PROJECT_URL_OBJECT, LANGUAGES } from '@extension/shared';

// Project information
console.log('Project URL:', PROJECT_URL_OBJECT.url);

// Language options
const languageCount = LANGUAGES.length; // 12
```

## Validation and Type Safety

### Zod Schemas

The package provides Zod schemas for runtime validation:

```typescript
import { LanguageCodeSchema } from '@extension/shared';
import { z } from 'zod';

// Validate language codes
const result = LanguageCodeSchema.safeParse('en-US');
if (result.success) {
  console.log('Valid language code:', result.data);
} else {
  console.error('Invalid language code:', result.error);
}

// Use in API validation
const TextRewriteDataSchema = z.object({
  original_text: z.string().min(1),
  rewritten_text: z.string().min(1),
  language: LanguageCodeSchema, // Uses shared schema
  rewriter_settings: z.string(),
  source_url: z.string().url(),
});
```

### TypeScript Types

Strong typing ensures consistency across packages:

```typescript
import type { SupportedLanguageCode, LanguageDisplayName } from '@extension/shared';

// Type-safe language handling
const processLanguage = (lang: SupportedLanguageCode): LanguageDisplayName => {
  return getLanguageDisplayName(lang);
};
```

## Performance Considerations

### Caching Strategy

- **Language Mapping**: Static objects for O(1) lookups
- **Normalization**: Efficient string operations
- **Validation**: Zod schemas cached for performance

### Memory Usage

- **Constants**: Immutable objects prevent accidental mutations
- **Tree Shaking**: Only used exports are included in bundles
- **Type-Only Imports**: Type definitions don't affect runtime

## Error Handling

### Graceful Fallbacks

```typescript
// Language normalization with fallbacks
export const normalizeLanguageCode = (lang: string): SupportedLanguageCode => {
  if (!lang) return 'en-US'; // Null/undefined fallback
  
  // ... normalization logic ...
  
  return 'en-US'; // Default fallback
};
```

### Validation Errors

```typescript
// Zod validation with error handling
try {
  const validated = LanguageCodeSchema.parse(input);
  return validated;
} catch (error) {
  console.error('Language validation failed:', error);
  return 'en-US'; // Fallback
}
```

## Migration and Updates

### Adding New Languages

To add a new language:

1. **Add Language Code**: Add to `SUPPORTED_LANGUAGE_CODES`
2. **Add Display Name**: Add to `LANGUAGE_DISPLAY_NAMES`
3. **Add Family Mapping**: Add to `LANGUAGE_FAMILY_MAPPING` if needed
4. **Add UI Option**: Add to `LANGUAGES` array
5. **Update Validation**: Zod schema automatically includes new codes

```typescript
// Example: Adding Dutch support
SUPPORTED_LANGUAGE_CODES = [...existing, 'nl-NL']
LANGUAGE_DISPLAY_NAMES = {
  ...existing,
  'nl-NL': 'Dutch',
  'nl-BE': 'Dutch',
  'nl': 'Dutch',
}
LANGUAGE_FAMILY_MAPPING = {
  ...existing,
  'nl': 'nl-NL',
}
LANGUAGES = [...existing, { value: 'nl-NL', label: 'Dutch' }]
```

### Breaking Changes

The package follows semantic versioning:
- **Major**: Breaking changes to APIs or types
- **Minor**: New features, backward compatible
- **Patch**: Bug fixes, backward compatible

## Related Documentation

- [Architecture Overview](architecture-overview.md) - High-level system architecture
- [Language Configuration System](language-config-system.md) - Detailed language system documentation
- [Packages API](packages-api.md) - API layer documentation
- [Packages SQLite](packages-sqlite.md) - Database layer documentation
- [Packages Storage](packages-storage.md) - Storage layer documentation
- [Vocabulary Analytics](vocabulary-analytics.md) - AI-powered analytics
- [Text Rewrites](text-rewrites.md) - Text simplification feature
