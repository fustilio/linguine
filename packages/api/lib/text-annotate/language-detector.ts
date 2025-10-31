/**
 * Language detection utilities for text annotation using Chrome's built-in AI
 */

/// <reference types="dom-chromium-ai" />

import type { SupportedLanguage } from './types.js';

let languageDetector: LanguageDetector | null = null;
let isInitializing = false;

/**
 * Initialize the Chrome Language Detector API
 */
const initializeLanguageDetector = async (): Promise<LanguageDetector> => {
  if (languageDetector) {
    return languageDetector;
  }

  if (isInitializing) {
    // Wait for initialization to complete
    while (isInitializing) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    if (languageDetector) {
      return languageDetector;
    }
  }

  isInitializing = true;

  try {
    // Check if Language Detector API is available
    if (!('LanguageDetector' in globalThis)) {
      throw new Error('Language Detector API not available. Enable the required Chrome flag');
    }

    // Check availability
    const availability = await LanguageDetector.availability();
    if (availability === 'unavailable') {
      throw new Error('Language Detector is not supported on this device');
    }

    // Create detector with download progress monitoring
    languageDetector = await LanguageDetector.create({
      monitor(monitor) {
        monitor.addEventListener('downloadprogress', event => {
          console.log(`[LanguageDetector] Downloaded ${Math.round(event.loaded * 100)}%`);
        });
      },
    });

    console.log('[LanguageDetector] Chrome Language Detector initialized');
    return languageDetector;
  } catch (error) {
    console.error('[LanguageDetector] Failed to initialize:', error);
    throw error;
  } finally {
    isInitializing = false;
  }
};

/**
 * Detects language from text using Chrome's built-in Language Detector API
 */
const detectLanguageFromText = async (text: string): Promise<SupportedLanguage | undefined> => {
  if (!text || text.length === 0) {
    return undefined;
  }

  // Very short text should be avoided for accuracy
  if (text.length < 10) {
    console.warn('[LanguageDetector] Text too short for accurate detection, using fallback');
    return detectLanguageFromTextFallback(text);
  }

  try {
    const detector = await initializeLanguageDetector();
    const results = await detector.detect(text);

    if (results.length === 0) {
      console.warn('[LanguageDetector] No detection results, using fallback');
      return detectLanguageFromTextFallback(text);
    }

    // Get the most confident result
    const topResult = results[0];
    console.log(
      `[LanguageDetector] Detected: ${topResult.detectedLanguage} (confidence: ${topResult.confidence?.toFixed(3)})`,
    );

    // Only trust results with high confidence
    if (!topResult.confidence || topResult.confidence < 0.5) {
      console.warn('[LanguageDetector] Low confidence result, using fallback');
      return detectLanguageFromTextFallback(text);
    }

    return normalizeLanguageCode(topResult.detectedLanguage);
  } catch (error) {
    console.error('[LanguageDetector] Detection failed, using fallback:', error);
    return detectLanguageFromTextFallback(text);
  }
};

/**
 * Fallback language detection using character code ranges
 * Used when Chrome Language Detector API is not available or fails
 */
export const detectLanguageFromTextFallback = (text: string): SupportedLanguage | undefined => {
  if (!text || text.length === 0) {
    return undefined;
  }

  // Count characters in each language range
  let chineseCount = 0;
  let thaiCount = 0;
  let otherCount = 0;

  for (let i = 0; i < text.length; i++) {
    const charCode = text.charCodeAt(i);

    // Chinese: CJK Unified Ideographs (0x4e00-0x9fff)
    if (charCode >= 0x4e00 && charCode <= 0x9fff) {
      chineseCount++;
    }
    // Thai: Thai script (0x0e00-0x0e7f)
    else if (charCode >= 0x0e00 && charCode <= 0x0e7f) {
      thaiCount++;
    }
    // Other characters (including ASCII, Latin, etc.)
    else if (charCode >= 0x0020 && charCode <= 0x007e) {
      otherCount++;
    }
  }

  const totalRelevant = chineseCount + thaiCount + otherCount;

  if (totalRelevant === 0) {
    return undefined;
  }

  // Determine language based on character distribution
  const chineseRatio = chineseCount / totalRelevant;
  const thaiRatio = thaiCount / totalRelevant;

  if (chineseRatio > 0.3) {
    return 'zh-CN';
  }

  if (thaiRatio > 0.3) {
    return 'th-TH';
  }

  // Default to English for other cases
  return 'en-US';
};

/**
 * Checks if a character code belongs to Chinese
 */
export const isChineseCharacter = (charCode: number): boolean => charCode >= 0x4e00 && charCode <= 0x9fff;

/**
 * Checks if a character code belongs to Thai
 */
export const isThaiCharacter = (charCode: number): boolean => charCode >= 0x0e00 && charCode <= 0x0e7f;

/**
 * Normalizes language code to SupportedLanguage
 */
export const normalizeLanguageCode = (lang: string | undefined): SupportedLanguage => {
  if (!lang) return 'en-US';

  const normalized = lang.toLowerCase().trim();

  // Map common language codes
  const languageMap: Record<string, SupportedLanguage> = {
    zh: 'zh-CN',
    'zh-cn': 'zh-CN',
    'zh-hans': 'zh-CN',
    th: 'th-TH',
    'th-th': 'th-TH',
    en: 'en-US',
    'en-us': 'en-US',
    es: 'es-ES',
    'es-es': 'es-ES',
    fr: 'fr-FR',
    'fr-fr': 'fr-FR',
    de: 'de-DE',
    'de-de': 'de-DE',
    ja: 'ja-JP',
    'ja-jp': 'ja-JP',
    ko: 'ko-KR',
    'ko-kr': 'ko-KR',
  };

  return languageMap[normalized] || 'en-US';
};

/**
 * Clean up the language detector instance
 */
export const cleanupLanguageDetector = (): void => {
  if (languageDetector) {
    // Chrome Language Detector doesn't have a destroy method
    // Just clear the reference
    languageDetector = null;
    console.log('[LanguageDetector] Cleaned up language detector');
  }
};

export { detectLanguageFromText };
