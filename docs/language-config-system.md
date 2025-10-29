# Language Configuration System

## Overview

This document describes the new single source of truth language configuration system implemented in `packages/shared/lib/language-config.ts`.

## Key Features

### 🎯 **Single Source of Truth**
- All language-related constants, mappings, and utilities are centralized in one file
- No more scattered language definitions across the codebase
- Consistent language handling throughout the application

### 🔒 **Zod Schema Validation**
- `LanguageCodeSchema` - Validates supported language codes
- `LanguageStringSchema` - Validates any language string
- `TextRewriteDataSchema` - Validates text rewrite data
- `TextRewriteFiltersSchema` - Validates filter parameters

### 🌍 **Comprehensive Language Support**
- **12 Primary Languages**: English, Spanish, French, German, Japanese, Korean, Chinese, Italian, Portuguese, Russian, Arabic, Hindi
- **100+ Language Variants**: Supports regional variants (en-GB, es-MX, fr-CA, etc.)
- **Display Name Fallbacks**: Handles both BCP 47 codes and display names

## API Reference

### Constants

```typescript
// Supported language codes (BCP 47 format)
SUPPORTED_LANGUAGE_CODES: readonly string[]

// Language display names mapping
LANGUAGE_DISPLAY_NAMES: Record<string, string>

// Language configuration for UI components
LANGUAGES: Array<{ value: string; label: string }>
```

### Schemas

```typescript
// Zod schemas for validation
LanguageCodeSchema: z.ZodEnum<typeof SUPPORTED_LANGUAGE_CODES>
LanguageStringSchema: z.ZodString
```

### Functions

```typescript
// Normalize any language input to standard BCP 47 format
normalizeLanguageCode(lang: string): SupportedLanguageCode

// Get display name for language code
getLanguageDisplayName(lang: string): LanguageDisplayName

// Check if language is supported
isSupportedLanguage(lang: string): boolean

// Get all supported language codes
getSupportedLanguageCodes(): readonly SupportedLanguageCode[]

// Get language configuration for UI
getLanguageConfig(): Array<{ value: string; label: string }>
```

### Types

```typescript
type SupportedLanguageCode = typeof SUPPORTED_LANGUAGE_CODES[number]
type LanguageCode = string
type LanguageDisplayName = string
```

## Usage Examples

### Basic Usage

```typescript
import { 
  normalizeLanguageCode, 
  getLanguageDisplayName, 
  LanguageCodeSchema 
} from '@extension/shared';

// Normalize language codes
const normalized = normalizeLanguageCode('en-GB'); // 'en-US'
const displayName = getLanguageDisplayName('es-MX'); // 'Spanish'

// Validate language codes
const isValid = LanguageCodeSchema.safeParse('en-US').success; // true
```

### API Validation

```typescript
import { TextRewriteDataSchema } from '@extension/api';

// Validate text rewrite data
const validatedData = TextRewriteDataSchema.parse({
  original_text: "Hello world",
  rewritten_text: "Hi there",
  language: "en-US", // Automatically validated
  rewriter_settings: "{}",
  source_url: "https://example.com"
});
```

### UI Components

```typescript
import { LANGUAGES } from '@extension/shared';

// Use in dropdowns
<select>
  {LANGUAGES.map(lang => (
    <option key={lang.value} value={lang.value}>
      {lang.label}
    </option>
  ))}
</select>
```

## Migration Benefits

### Before (Scattered)
- Language codes defined in multiple files
- Inconsistent normalization logic
- No validation of language inputs
- Hard to maintain and extend

### After (Centralized)
- Single source of truth for all language data
- Consistent normalization across the app
- Zod schema validation for type safety
- Easy to add new languages
- Better developer experience

## Adding New Languages

To add a new language:

1. Add the BCP 47 code to `SUPPORTED_LANGUAGE_CODES`
2. Add display name mapping to `LANGUAGE_DISPLAY_NAMES`
3. Add family mapping to `LANGUAGE_FAMILY_MAPPING` if needed
4. Update any language-specific logic (readability, etc.)

Example:
```typescript
// Add Dutch support
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
```

## Files Updated

- ✅ `packages/shared/lib/language-config.ts` - New centralized config
- ✅ `packages/shared/const.ts` - Now re-exports from config
- ✅ `packages/shared/lib/utils/language-utils.ts` - Re-exports from config
- ✅ `packages/api/lib/linguini-ai.ts` - Uses new schema
- ✅ `packages/api/lib/text-rewrites-api.ts` - Added validation
- ✅ `packages/shared/package.json` - Added zod dependency

## Package Architecture Integration

The language configuration system is deeply integrated with the extension's package architecture:

### Integration with Packages API

The API layer uses language configuration for validation and normalization:

```typescript
// packages/api/lib/text-rewrites-api.ts
import { LanguageCodeSchema } from '@extension/shared';

export const TextRewriteDataSchema = z.object({
  original_text: z.string().min(1),
  rewritten_text: z.string().min(1),
  language: LanguageCodeSchema, // Validates against supported languages
  rewriter_settings: z.string(),
  source_url: z.string().url(),
});
```

### Integration with Packages SQLite

The database layer uses language normalization for consistency:

```typescript
// packages/sqlite/lib/text-rewrites.ts
import { normalizeLanguageCode } from '@extension/shared';

const calculateReadabilityScore = (text: string, language: string): number => {
  const normalizedLang = normalizeLanguageCode(language);
  // Language-specific readability algorithms
};
```

### Integration with UI Components

UI components use language configuration for dropdowns and display:

```typescript
// UI components
import { LANGUAGES, getLanguageDisplayName } from '@extension/shared';

const LanguageSelector = () => (
  <select>
    {LANGUAGES.map(lang => (
      <option key={lang.value} value={lang.value}>
        {lang.label}
      </option>
    ))}
  </select>
);
```

## Related Architecture Documentation

- [Architecture Overview](architecture-overview.md) - High-level system architecture
- [Packages Shared](packages-shared.md) - Shared utilities and constants
- [Packages API](packages-api.md) - API layer documentation
- [Packages SQLite](packages-sqlite.md) - Database layer documentation
- [Message Passing System](message-passing-system.md) - Message passing architecture

This system provides a robust, type-safe, and maintainable foundation for all language-related functionality in the application.
