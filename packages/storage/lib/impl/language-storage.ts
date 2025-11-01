import { createStorage, StorageEnum } from '../base/index.js';
import type { LanguageStateType, LanguageStorageType } from '../base/index.js';

/**
 * Simple language code normalization to BCP 47 format
 * Accepts language codes like 'en', 'en-US', 'en-GB' and normalizes to standard format
 * Falls back to 'en-US' for invalid/unknown codes
 */
const normalizeLanguageCode = (lang: string): string => {
  if (!lang || typeof lang !== 'string') return 'en-US';

  const normalized = lang.trim().toLowerCase();

  // Handle common language code patterns
  const languageMap: Record<string, string> = {
    en: 'en-US',
    'en-us': 'en-US',
    'en-gb': 'en-US',
    'en-ca': 'en-US',
    es: 'es-ES',
    'es-es': 'es-ES',
    'es-mx': 'es-ES',
    fr: 'fr-FR',
    'fr-fr': 'fr-FR',
    de: 'de-DE',
    'de-de': 'de-DE',
    ja: 'ja-JP',
    'ja-jp': 'ja-JP',
    ko: 'ko-KR',
    'ko-kr': 'ko-KR',
    zh: 'zh-CN',
    'zh-cn': 'zh-CN',
    it: 'it-IT',
    'it-it': 'it-IT',
    pt: 'pt-BR',
    'pt-br': 'pt-BR',
    ru: 'ru-RU',
    'ru-ru': 'ru-RU',
    ar: 'ar-SA',
    'ar-sa': 'ar-SA',
    hi: 'hi-IN',
    'hi-in': 'hi-IN',
  };

  // Direct match
  if (languageMap[normalized]) {
    return languageMap[normalized];
  }

  // If already in format like 'en-US', try to extract base and map
  const parts = normalized.split('-');
  if (parts.length > 0 && languageMap[parts[0]]) {
    return languageMap[parts[0]];
  }

  // If already a valid BCP 47 format (contains hyphen), return as-is
  if (normalized.includes('-') && normalized.length >= 5) {
    // Return with proper capitalization (e.g., 'en-US')
    return parts.map((part, idx) => (idx === 0 ? part.toLowerCase() : part.toUpperCase())).join('-');
  }

  // Default fallback
  return 'en-US';
};

const storage = createStorage<LanguageStateType>(
  'language-storage-key',
  {
    nativeLanguage: 'en-US',
    targetLearningLanguage: 'en-US',
  },
  {
    storageEnum: StorageEnum.Local,
    liveUpdate: true,
  },
);

export const languageStorage: LanguageStorageType = {
  ...storage,
  setNativeLanguage: async (language: string) => {
    await storage.set(currentState => ({
      ...currentState,
      nativeLanguage: normalizeLanguageCode(language),
    }));
  },
  setTargetLearningLanguage: async (language: string) => {
    await storage.set(currentState => ({
      ...currentState,
      targetLearningLanguage: normalizeLanguageCode(language),
    }));
  },
};
