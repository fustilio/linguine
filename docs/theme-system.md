# Theme System Documentation

## Overview

The theme system provides dark mode support for Chrome Extension pages (popup, side-panel, options, etc.) using `next-themes` and `chrome.storage` as the source of truth. The system ensures theme persistence across all extension pages and respects system preferences.

## Architecture

### Storage Strategy

- **Source of Truth**: `chrome.storage.local` (via `exampleThemeStorage`)
- **Cache Layer**: `localStorage` (used by `next-themes` for compatibility)
- **Sync Direction**: Bidirectional sync between chrome.storage and localStorage

### Components

1. **ThemeProvider** (`packages/ui/lib/components/theme-provider.tsx`)
   - Wraps `next-themes`'s `ThemeProvider`
   - Initializes theme from chrome.storage before React hydration (prevents FOUC)
   - Only works on extension pages (popup, side-panel, options, etc.), not content pages
   - Syncs chrome.storage changes to localStorage for next-themes

2. **ToggleButton** (`packages/ui/lib/components/ToggleButton.tsx`)
   - Theme toggle button component
   - Writes to chrome.storage first (source of truth)
   - Updates next-themes after chrome.storage is updated

3. **exampleThemeStorage** (`packages/storage/lib/impl/example-theme-storage.ts`)
   - Storage abstraction for theme preferences
   - Stores theme as `'light' | 'dark' | null` (null = system preference)
   - Uses chrome.storage.local for persistence

## Usage

### Setup Theme Provider

Wrap your extension page root component with `ThemeProvider`:

```tsx
import { ThemeProvider } from '@extension/ui';
import { createRoot } from 'react-dom/client';

const init = () => {
  const appContainer = document.querySelector('#app-container');
  if (!appContainer) {
    throw new Error('Can not find #app-container');
  }
  const root = createRoot(appContainer);

  root.render(
    <ThemeProvider>
      <YourApp />
    </ThemeProvider>
  );
};

init();
```

### Using Theme Toggle Button

Use the `ToggleButton` component to allow users to toggle themes:

```tsx
import { ToggleButton } from '@extension/ui';

const MyComponent = () => {
  return (
    <div>
      <h1>My Extension</h1>
      <ToggleButton>Toggle Theme</ToggleButton>
    </div>
  );
};
```

### Using Theme Hook (next-themes)

For custom theme logic, use the `useTheme` hook from `next-themes`:

```tsx
import { useTheme } from 'next-themes';
import { exampleThemeStorage } from '@extension/storage';

const MyComponent = () => {
  const { theme, setTheme } = useTheme();

  const handleCustomAction = async () => {
    // Set theme via next-themes (will sync to chrome.storage)
    setTheme('dark');
    
    // Or set directly in chrome.storage (source of truth)
    await exampleThemeStorage.setTheme('dark');
  };

  return <div>Current theme: {theme}</div>;
};
```

## Theme Values

- `'light'` - Light theme
- `'dark'` - Dark theme
- `'system'` - Respects system preference (`prefers-color-scheme`)

## Implementation Details

### Initialization Flow

1. **FOUC Prevention**: Theme is initialized from chrome.storage before React hydration
2. **Extension Page Detection**: Theme only applies to extension pages (not content pages)
3. **System Preference**: Falls back to system preference if no stored preference exists

### Storage Format

The theme is stored in chrome.storage as:

```typescript
{
  theme: 'light' | 'dark' | null  // null = system preference
}
```

The storage key is: `'theme-storage-key'`

### Sync Mechanism

1. **Chrome Storage → localStorage**: When chrome.storage changes (e.g., from another tab), it syncs to localStorage
2. **localStorage → Chrome Storage**: When next-themes updates localStorage, it syncs back to chrome.storage

This ensures:
- chrome.storage is always the authoritative source
- next-themes can work seamlessly with localStorage
- Cross-tab synchronization works correctly

## Configuration

### Tailwind CSS Configuration

The theme system requires Tailwind CSS dark mode to be set to `'selector'`:

```typescript
// packages/tailwindcss-config/tailwind.config.ts
export default {
  darkMode: 'selector',
  // ...
};
```

This enables dark mode via the `dark` class on the `html` element.

### Extension Page Context Detection

The theme system automatically detects if it's running in an extension page context:

- ✅ **Extension Pages**: popup, side-panel, options, new-tab, devtools-panel
- ❌ **Content Pages**: Injected content scripts (ignored)

This prevents the theme from affecting host websites.

## Troubleshooting

### Theme not applying

1. Ensure `ThemeProvider` wraps your root component
2. Check that Tailwind `darkMode: 'selector'` is configured
3. Verify you're testing on an extension page (not a content page)

### Theme not persisting

1. Check chrome.storage permissions in manifest.json
2. Verify chrome.storage.local is accessible
3. Check browser console for storage errors

### FOUC (Flash of Unstyled Content)

The system prevents FOUC by:
- Initializing theme before React renders
- Using synchronous snapshot when available
- Applying dark class immediately on page load

## API Reference

### exampleThemeStorage

```typescript
interface ThemeStorageType {
  // Read theme
  get(): Promise<{ theme: 'light' | 'dark' | null }>;
  
  // Set theme
  setTheme(theme: 'light' | 'dark' | 'system'): Promise<void>;
  
  // Toggle between light/dark
  toggle(): Promise<void>;
  
  // Initialize theme (call before React render)
  initTheme(): void;
  
  // Subscribe to changes
  subscribe(listener: () => void): () => void;
}
```

### ThemeProvider Props

Supports all props from `next-themes`'s `ThemeProvider`:
- `storageKey` - localStorage key (default: `"theme"`)
- `attribute` - HTML attribute to modify (default: `"class"`)
- `defaultTheme` - Default theme (default: `"system"`)
- `enableSystem` - Enable system preference (default: `true`)
- `disableTransitionOnChange` - Disable transitions (default: `true`)

## Best Practices

1. **Always wrap with ThemeProvider**: All extension pages should be wrapped with `ThemeProvider`
2. **Use ToggleButton for UI**: Use the provided `ToggleButton` component for consistent UX
3. **Prefer chrome.storage**: Use `exampleThemeStorage` for programmatic theme changes
4. **Test on extension pages**: Theme only works on extension pages, not content pages

## Migration from Old System

If migrating from the old theme storage system:

1. Remove direct `exampleThemeStorage.initTheme()` calls (now handled by ThemeProvider)
2. Wrap root components with `ThemeProvider`
3. Replace custom toggle buttons with `<ToggleButton>`
4. Remove localStorage-only theme logic


