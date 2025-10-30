'use client';

import { exampleThemeStorage } from '@extension/storage';
import { ThemeProvider as NextThemesProvider } from 'next-themes';
import { useEffect } from 'react';
import type { ThemeProviderProps } from 'next-themes';

/**
 * Checks if we're in an extension page context
 */
const isExtensionPageContext = (): boolean => {
  if (typeof window === 'undefined') return false;
  try {
    const protocol = window.location.protocol;
    const href = window.location.href;
    return (
      protocol === 'chrome-extension:' ||
      protocol === 'moz-extension:' ||
      href.startsWith('chrome-extension://') ||
      href.startsWith('moz-extension://')
    );
  } catch {
    return false;
  }
};

/**
 * Maps next-themes theme ('light' | 'dark' | 'system') to storage theme ('light' | 'dark' | null)
 */
const mapNextThemeToStorage = (theme: string | undefined): 'light' | 'dark' | null => {
  if (theme === 'dark') return 'dark';
  if (theme === 'light') return 'light';
  return null; // 'system' maps to null
};

/**
 * Maps storage theme ('light' | 'dark' | null) to next-themes theme ('light' | 'dark' | 'system')
 */
const mapStorageToNextTheme = (theme: 'light' | 'dark' | null | undefined): 'light' | 'dark' | 'system' => {
  if (theme === 'dark') return 'dark';
  if (theme === 'light') return 'light';
  return 'system';
};

/**
 * Chrome Extension-compatible Theme Provider
 * Only works on extension pages (popup, side-panel, options, etc.), not content pages
 * Uses chrome.storage (via exampleThemeStorage) as the source of truth
 * localStorage is only used as a cache for next-themes compatibility
 */
export const ThemeProvider = ({ children, ...props }: ThemeProviderProps) => {
  useEffect(() => {
    // Only setup theme for extension pages
    if (!isExtensionPageContext()) {
      return;
    }

    // Initialize theme from chrome.storage before React hydration to prevent FOUC
    const initTheme = async () => {
      try {
        // Read from chrome.storage (source of truth)
        const stored = await exampleThemeStorage.get();
        const storedTheme = stored?.theme;
        const shouldBeDark =
          storedTheme === 'dark' ||
          (!storedTheme &&
            typeof window !== 'undefined' &&
            window.matchMedia &&
            window.matchMedia('(prefers-color-scheme: dark)').matches);

        if (typeof document !== 'undefined') {
          document.documentElement.classList.toggle('dark', shouldBeDark);
        }

        // Sync to localStorage as cache for next-themes
        if (typeof localStorage !== 'undefined') {
          const nextTheme = mapStorageToNextTheme(storedTheme);
          localStorage.setItem('theme', nextTheme);
        }
      } catch {
        // Fallback to system preference
        if (typeof document !== 'undefined' && typeof window !== 'undefined' && window.matchMedia) {
          const shouldBeDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
          document.documentElement.classList.toggle('dark', shouldBeDark);
        }
      }
    };

    void initTheme();

    // Subscribe to chrome.storage changes (source of truth)
    const unsubscribe = exampleThemeStorage.subscribe(() => {
      exampleThemeStorage
        .get()
        .then(stored => {
          if (stored && typeof localStorage !== 'undefined') {
            const nextTheme = mapStorageToNextTheme(stored.theme);
            const currentLocal = localStorage.getItem('theme');

            if (currentLocal !== nextTheme) {
              // Update localStorage cache
              localStorage.setItem('theme', nextTheme);
              // Trigger storage event for next-themes to react
              window.dispatchEvent(
                new StorageEvent('storage', {
                  key: 'theme',
                  newValue: nextTheme,
                  storageArea: localStorage,
                }),
              );
            }
          }
        })
        .catch(() => {
          // Ignore errors
        });
    });

    // Sync localStorage changes (from next-themes) back to chrome.storage
    // This ensures chrome.storage is always the authoritative source
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'theme' && e.newValue) {
        const storageTheme = mapNextThemeToStorage(e.newValue);
        // Write to chrome.storage (source of truth)
        exampleThemeStorage
          .setTheme(storageTheme === 'dark' ? 'dark' : storageTheme === 'light' ? 'light' : 'system')
          .catch(() => {
            // Ignore errors
          });
      }
    };

    window.addEventListener('storage', handleStorageChange);

    return () => {
      unsubscribe();
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  // Only provide theme context for extension pages
  if (!isExtensionPageContext()) {
    return <>{children}</>;
  }

  return (
    <NextThemesProvider
      {...props}
      storageKey="theme"
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange>
      {children}
    </NextThemesProvider>
  );
};
