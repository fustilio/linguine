import { z } from 'zod';

/**
 * Single source of truth for all language-related configuration
 */

// Supported language codes (BCP 47 format)
export const SUPPORTED_LANGUAGE_CODES = [
  'en-US',
  'es-ES', 
  'fr-FR',
  'de-DE',
  'ja-JP',
  'ko-KR',
  'zh-CN',
  'it-IT',
  'pt-BR',
  'ru-RU',
  'ar-SA',
  'hi-IN',
] as const;

// Language display names mapping
export const LANGUAGE_DISPLAY_NAMES: Record<string, string> = {
  // English variants
  'en-US': 'English',
  'en-GB': 'English',
  'en-CA': 'English',
  'en-AU': 'English',
  'en-NZ': 'English',
  'en': 'English',
  
  // Spanish variants
  'es-ES': 'Spanish',
  'es-MX': 'Spanish',
  'es-AR': 'Spanish',
  'es-CO': 'Spanish',
  'es-PE': 'Spanish',
  'es-VE': 'Spanish',
  'es-CL': 'Spanish',
  'es-UY': 'Spanish',
  'es-PY': 'Spanish',
  'es-BO': 'Spanish',
  'es-EC': 'Spanish',
  'es-CR': 'Spanish',
  'es-PA': 'Spanish',
  'es-HN': 'Spanish',
  'es-GT': 'Spanish',
  'es-SV': 'Spanish',
  'es-NI': 'Spanish',
  'es-CU': 'Spanish',
  'es-DO': 'Spanish',
  'es-PR': 'Spanish',
  'es': 'Spanish',
  
  // French variants
  'fr-FR': 'French',
  'fr-CA': 'French',
  'fr-BE': 'French',
  'fr-CH': 'French',
  'fr-LU': 'French',
  'fr-MC': 'French',
  'fr': 'French',
  
  // German variants
  'de-DE': 'German',
  'de-AT': 'German',
  'de-CH': 'German',
  'de-LI': 'German',
  'de-LU': 'German',
  'de': 'German',
  
  // Japanese
  'ja-JP': 'Japanese',
  'ja': 'Japanese',
  
  // Korean
  'ko-KR': 'Korean',
  'ko': 'Korean',
  
  // Chinese variants
  'zh-CN': 'Chinese',
  'zh-TW': 'Chinese',
  'zh-HK': 'Chinese',
  'zh-SG': 'Chinese',
  'zh-MO': 'Chinese',
  'zh': 'Chinese',
  
  // Italian variants
  'it-IT': 'Italian',
  'it-CH': 'Italian',
  'it-SM': 'Italian',
  'it-VA': 'Italian',
  'it': 'Italian',
  
  // Portuguese variants
  'pt-BR': 'Portuguese',
  'pt-PT': 'Portuguese',
  'pt-AO': 'Portuguese',
  'pt-MZ': 'Portuguese',
  'pt-CV': 'Portuguese',
  'pt-GW': 'Portuguese',
  'pt-ST': 'Portuguese',
  'pt-TL': 'Portuguese',
  'pt': 'Portuguese',
  
  // Russian variants
  'ru-RU': 'Russian',
  'ru-BY': 'Russian',
  'ru-KZ': 'Russian',
  'ru-KG': 'Russian',
  'ru-MD': 'Russian',
  'ru-UA': 'Russian',
  'ru': 'Russian',
  
  // Arabic variants
  'ar-SA': 'Arabic',
  'ar-AE': 'Arabic',
  'ar-BH': 'Arabic',
  'ar-DZ': 'Arabic',
  'ar-EG': 'Arabic',
  'ar-IQ': 'Arabic',
  'ar-JO': 'Arabic',
  'ar-KW': 'Arabic',
  'ar-LB': 'Arabic',
  'ar-LY': 'Arabic',
  'ar-MA': 'Arabic',
  'ar-OM': 'Arabic',
  'ar-PS': 'Arabic',
  'ar-QA': 'Arabic',
  'ar-SY': 'Arabic',
  'ar-TN': 'Arabic',
  'ar-YE': 'Arabic',
  'ar': 'Arabic',
  
  // Hindi variants
  'hi-IN': 'Hindi',
  'hi': 'Hindi',
  
  // Fallback for display names that might already be in the database
  'English': 'English',
  'Spanish': 'Spanish',
  'French': 'French',
  'German': 'German',
  'Japanese': 'Japanese',
  'Korean': 'Korean',
  'Chinese': 'Chinese',
  'Italian': 'Italian',
  'Portuguese': 'Portuguese',
  'Russian': 'Russian',
  'Arabic': 'Arabic',
  'Hindi': 'Hindi',
};

// Language normalization mapping (display name to BCP 47 code)
export const DISPLAY_NAME_TO_CODE: Record<string, string> = {
  'English': 'en-US',
  'Spanish': 'es-ES',
  'French': 'fr-FR',
  'German': 'de-DE',
  'Japanese': 'ja-JP',
  'Korean': 'ko-KR',
  'Chinese': 'zh-CN',
  'Italian': 'it-IT',
  'Portuguese': 'pt-BR',
  'Russian': 'ru-RU',
  'Arabic': 'ar-SA',
  'Hindi': 'hi-IN',
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

// Zod schemas for validation
export const LanguageCodeSchema = z.enum(SUPPORTED_LANGUAGE_CODES);
export const LanguageStringSchema = z.string().min(1);

// Type definitions
export type SupportedLanguageCode = typeof SUPPORTED_LANGUAGE_CODES[number];
export type LanguageCode = string;
export type LanguageDisplayName = string;

// Language configuration for UI components
export const LANGUAGES = SUPPORTED_LANGUAGE_CODES.map(code => ({
  value: code,
  label: LANGUAGE_DISPLAY_NAMES[code] || code,
}));

/**
 * Normalize language code to a standard BCP 47 format
 * This ensures consistent language codes are stored in the database
 */
export const normalizeLanguageCode = (lang: string): SupportedLanguageCode => {
  if (!lang) return 'en-US';
  
  // If it's already a display name, convert to BCP 47 code
  if (DISPLAY_NAME_TO_CODE[lang]) {
    return DISPLAY_NAME_TO_CODE[lang] as SupportedLanguageCode;
  }
  
  // Normalize BCP 47 codes
  const normalizedLang = lang.toLowerCase();
  
  // Handle common language code patterns
  for (const [family, standardCode] of Object.entries(LANGUAGE_FAMILY_MAPPING)) {
    if (normalizedLang.startsWith(family)) {
      return standardCode as SupportedLanguageCode;
    }
  }
  
  // Default fallback
  return 'en-US';
};

/**
 * Get display name for language code
 */
export const getLanguageDisplayName = (lang: string): LanguageDisplayName => {
  return LANGUAGE_DISPLAY_NAMES[lang] || lang;
};

/**
 * Validate if a language code is supported
 */
export const isSupportedLanguage = (lang: string): lang is SupportedLanguageCode => {
  return SUPPORTED_LANGUAGE_CODES.includes(lang as SupportedLanguageCode);
};

/**
 * Get all supported language codes
 */
export const getSupportedLanguageCodes = (): readonly SupportedLanguageCode[] => {
  return SUPPORTED_LANGUAGE_CODES;
};

/**
 * Get language configuration for UI components
 */
export const getLanguageConfig = () => {
  return LANGUAGES;
};
