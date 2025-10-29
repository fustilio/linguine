import { createStorage, StorageEnum } from '../base/index.js';
import type { ThemeStateType, ThemeStorageType } from '../base/index.js';

const STORAGE_KEY = 'theme-storage-key';

const storage = createStorage<ThemeStateType>(
  STORAGE_KEY,
  {
    theme: null, // null means respect system preference
  },
  {
    storageEnum: StorageEnum.Local,
    liveUpdate: true,
  },
);

/**
 * Checks if we're running in an extension page context (popup, side-panel, options, etc.)
 * vs a content page context (injected into websites)
 */
const isExtensionPageContext = (): boolean => {
  if (typeof window === 'undefined') return false;
  
  try {
    const protocol = window.location.protocol;
    const href = window.location.href;
    
    // Extension pages use chrome-extension:// or moz-extension:// protocol
    return protocol === 'chrome-extension:' || 
           protocol === 'moz-extension:' ||
           href.startsWith('chrome-extension://') ||
           href.startsWith('moz-extension://');
  } catch (error) {
    // If we can't access location (e.g., in some restricted contexts), assume it's not an extension page
    return false;
  }
};

// Note: Theme changes are handled by next-themes in the UI layer
// The storage subscription is managed in ThemeProvider

/**
 * Initializes theme on page load from chrome.storage
 * This should be called before React renders to prevent FOUC
 * Only applies to extension pages, not content pages
 * Note: Theme UI is managed by next-themes in ThemeProvider, but this provides FOUC prevention
 */
const initTheme = (): void => {
  if (typeof document === 'undefined' || typeof window === 'undefined') {
    return;
  }

  // Only initialize theme for extension pages
  if (!isExtensionPageContext()) {
    return;
  }

  // Read from chrome.storage (source of truth)
  // Use a synchronous snapshot if available, otherwise fallback to system preference
  const snapshot = storage.getSnapshot();
  if (snapshot?.theme !== undefined) {
    const shouldBeDark = snapshot.theme === 'dark' || 
      (!snapshot.theme && typeof window.matchMedia !== 'undefined' && 
       window.matchMedia('(prefers-color-scheme: dark)').matches);
    document.documentElement.classList.toggle('dark', shouldBeDark);
  } else {
    // Fallback to system preference while chrome.storage loads
    const shouldBeDark = typeof window.matchMedia !== 'undefined' && 
      window.matchMedia('(prefers-color-scheme: dark)').matches;
    document.documentElement.classList.toggle('dark', shouldBeDark);
  }

  // Update from chrome.storage asynchronously (source of truth)
  storage.get().then(stored => {
    if (stored) {
      const storedTheme = stored.theme;
      const shouldBeDark = storedTheme === 'dark' || 
        (!storedTheme && typeof window !== 'undefined' && window.matchMedia && 
         window.matchMedia('(prefers-color-scheme: dark)').matches);
      
      document.documentElement.classList.toggle('dark', shouldBeDark);
    }
  }).catch(() => {
    // If Chrome storage fails, keep system preference
  });
};

/**
 * Applies theme to document element
 * Only applies to extension pages, not content pages
 */
const applyThemeToDocument = (preference: 'light' | 'dark' | null) => {
  if (typeof document === 'undefined' || typeof window === 'undefined') return;
  if (!isExtensionPageContext()) return;
  
  const shouldBeDark = preference === 'dark' || 
    (!preference && typeof window.matchMedia !== 'undefined' && 
     window.matchMedia('(prefers-color-scheme: dark)').matches);
  
  document.documentElement.classList.toggle('dark', shouldBeDark);
};

export const exampleThemeStorage: ThemeStorageType = {
  ...storage,
  toggle: async () => {
    try {
      const currentState = await storage.get();
      const currentTheme = currentState?.theme;
      const currentEffective = currentTheme === 'dark' ? 'dark' : 
                              currentTheme === 'light' ? 'light' : 
                              (typeof window !== 'undefined' && window.matchMedia && 
                               window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
      
      const newPreference: 'light' | 'dark' = currentEffective === 'light' ? 'dark' : 'light';
      await storage.set({ theme: newPreference });
      applyThemeToDocument(newPreference);
    } catch (error) {
      // Fallback: try to toggle based on DOM state
      if (typeof document !== 'undefined' && isExtensionPageContext()) {
        const isDark = document.documentElement.classList.contains('dark');
        const newPreference: 'light' | 'dark' = isDark ? 'light' : 'dark';
        await storage.set({ theme: newPreference });
        applyThemeToDocument(newPreference);
      }
    }
  },
  setTheme: async (theme: 'light' | 'dark' | 'system') => {
    const preference: 'light' | 'dark' | null = theme === 'system' ? null : theme;
    await storage.set({ theme: preference });
    applyThemeToDocument(preference);
  },
  initTheme,
};
